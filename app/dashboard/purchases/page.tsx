"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { 
  PlusCircle, Trash2, Edit2, PackageOpen, RefreshCcw, CheckCircle, Clock, 
  Search, FileText, X, AlertTriangle, User, CalendarDays, UploadCloud, Link as LinkIcon, FileCheck, Loader2, Copy
} from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ActionUserBadge } from "@/components/ActionUserBadge"

export default function PurchasesPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const supabase = createClient()

  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ total_amount: "", description: "", termin_tarihi: "", status: "" })

  // 🚀 Dosya Yükleme State'leri
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
        const { data } = await supabase
          .from('purchase_orders')
          .select(`*, suppliers ( name ), profiles ( first_name, last_name, department )`)
          .order('created_at', { ascending: false })
        if (data) setOrders(data)
        
        if (selectedOrder && data) {
            const updatedSelected = data.find(o => o.id === selectedOrder.id)
            setSelectedOrder(updatedSelected || null)
        }
    } finally {
        setLoading(false)
    }
  }

  const formatOrderNumber = (id: number) => `SAS${String(id).padStart(5, '0')}`;

  const getDeadlineStatus = (termin: string, status: string) => {
      if (status === 'TAMAMLANDI') return { text: "Teslim Alındı", classes: "bg-emerald-500 text-white shadow-emerald-500/30", icon: <CheckCircle className="h-3.5 w-3.5"/> }
      if (status === 'IPTAL') return { text: "İptal Edildi", classes: "bg-slate-300 text-slate-600 line-through", icon: <X className="h-3.5 w-3.5"/> }
      if (!termin) return { text: "Termin Bekleniyor", classes: "bg-slate-200 text-slate-700", icon: <Clock className="h-3.5 w-3.5"/> }

      const today = new Date(); today.setHours(0,0,0,0);
      const terminDate = new Date(termin); terminDate.setHours(0,0,0,0);
      const diffDays = Math.round((terminDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

      if (diffDays < 0) return { text: `${Math.abs(diffDays)} GÜN GECİKTİ`, classes: "bg-red-500 text-white shadow-red-500/40 animate-pulse", icon: <AlertTriangle className="h-3.5 w-3.5"/> }
      if (diffDays === 0) return { text: "BUGÜN TESLİM", classes: "bg-orange-500 text-white shadow-orange-500/40", icon: <AlertTriangle className="h-3.5 w-3.5"/> }
      if (diffDays <= 3) return { text: `${diffDays} Gün Kaldı`, classes: "bg-orange-400 text-white shadow-orange-400/30", icon: <Clock className="h-3.5 w-3.5"/> }
      return { text: `${diffDays} Gün Kaldı`, classes: "bg-blue-500 text-white shadow-blue-500/30", icon: <CalendarDays className="h-3.5 w-3.5"/> }
  }

  const deleteOrder = async (id: number) => {
    if(!confirm("Bu siparişi tamamen silmek istediğinize emin misiniz?")) return;
    await supabase.from('purchase_orders').delete().eq('id', id)
    setSelectedOrder(null)
    fetchOrders()
  }

  const handleRowClick = (order: any) => {
      setSelectedOrder(order)
      setIsEditing(false)
  }

  const openEditMode = () => {
      setEditForm({
          total_amount: selectedOrder.total_amount || "0",
          description: selectedOrder.description || "",
          termin_tarihi: selectedOrder.termin_tarihi || "",
          status: selectedOrder.status || "BEKLIYOR"
      })
      setIsEditing(true)
  }

  const saveOrderUpdate = async () => {
      await supabase.from('purchase_orders')
        .update({
            total_amount: Number(editForm.total_amount),
            description: editForm.description,
            termin_tarihi: editForm.termin_tarihi || null,
            status: editForm.status
        }).eq('id', selectedOrder.id)
      setIsEditing(false)
      fetchOrders()
  }

  const markAsCompleted = async (id: number) => {
      if(!confirm("Siparişi teslim alındı olarak işaretliyorsunuz. Onaylıyor musunuz?")) return;
      await supabase.from('purchase_orders').update({ status: 'TAMAMLANDI' }).eq('id', id)
      fetchOrders()
  }

  // 🚀 DOSYA YÜKLEME FONKSİYONU
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setUploading(true)
      
      // Benzersiz bir dosya adı oluştur (Örn: SAS00012_168482394.pdf)
      const fileExt = file.name.split('.').pop()
      const fileName = `${formatOrderNumber(selectedOrder.id)}_${Date.now()}.${fileExt}`

      try {
          // 1. Dosyayı Supabase Storage'a yükle
          const { data: uploadData, error: uploadError } = await supabase.storage
              .from('purchase_documents')
              .upload(fileName, file)

          if (uploadError) throw uploadError

          // 2. Yüklenen dosyanın HERKESE AÇIK linkini al
          const { data: { publicUrl } } = supabase.storage
              .from('purchase_documents')
              .getPublicUrl(fileName)

          // 3. Dosya bilgisini veritabanına JSON olarak ekle
          const newAttachment = {
              name: file.name,
              url: publicUrl,
              path: uploadData.path,
              date: new Date().toISOString()
          }

          // Mevcut dosyaları al, yenisini üstüne ekle
          const currentAttachments = selectedOrder.attachments || []
          const updatedAttachments = [...currentAttachments, newAttachment]

          const { error: updateError } = await supabase
              .from('purchase_orders')
              .update({ attachments: updatedAttachments })
              .eq('id', selectedOrder.id)

          if (updateError) throw updateError

          // 4. Ekranda göstermek için verileri yenile
          fetchOrders()
      } catch (error: any) {
          alert("Dosya yüklenirken hata oluştu: " + error.message)
      } finally {
          setUploading(false)
          if (fileInputRef.current) fileInputRef.current.value = "" // İnputu temizle
      }
  }

  // 🚀 DOSYA SİLME FONKSİYONU
  const handleFileDelete = async (fileToDelete: any) => {
      if(!confirm(`"${fileToDelete.name}" dosyasını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;

      try {
          // 1. Storage'dan sil
          await supabase.storage.from('purchase_documents').remove([fileToDelete.path])

          // 2. Veritabanındaki listeden çıkar
          const updatedAttachments = selectedOrder.attachments.filter((f: any) => f.path !== fileToDelete.path)
          
          await supabase.from('purchase_orders')
              .update({ attachments: updatedAttachments })
              .eq('id', selectedOrder.id)

          fetchOrders()
      } catch (error: any) {
          alert("Silme hatası: " + error.message)
      }
  }

  // 🚀 LİNK KOPYALAMA FONKSİYONU
  const copyToClipboard = (url: string) => {
      navigator.clipboard.writeText(url)
      alert("✅ Dosya linki kopyalandı! İstediğiniz kişiye gönderebilirsiniz. Sadece dosyayı göreceklerdir.")
  }

  const filteredOrders = orders.filter(o => 
      formatOrderNumber(o.id).toLowerCase().includes(searchTerm.toLowerCase()) || 
      (o.suppliers?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 font-sans h-[calc(100vh-100px)]">
      
      {/* ... Üst Başlık ve Arama Kısmı (Aynı) ... */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Satın Alma Kokpiti</h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">Tedarikçi siparişlerini ve terminleri akıllı ekrandan yönetin.</p>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="SAS No veya Firma Ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-12 bg-white/60 backdrop-blur-md border-white/50 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm rounded-2xl transition-all" />
            </div>
            <Button onClick={fetchOrders} variant="outline" className="h-12 w-12 p-0 bg-white/60 backdrop-blur-md border-white/50 text-slate-600 rounded-2xl shadow-sm hover:text-blue-600 hover:bg-white transition-all">
                <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </Button>
            <Link href="/dashboard/purchases/new">
                <Button className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-500/30 transition-all">
                    <PlusCircle className="mr-2 h-5 w-5" /> Yeni Sipariş
                </Button>
            </Link>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 flex-1 min-h-0">
          
          {/* SOL: SİPARİŞ LİSTESİ */}
          <div className="xl:w-6/12 flex flex-col bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] overflow-hidden">
              <div className="overflow-y-auto flex-1 p-2 no-scrollbar">
                  <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10">
                          <tr>
                              <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sipariş & Firma</th>
                              <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Durum</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/50">
                          {filteredOrders.map((order) => {
                              const deadline = getDeadlineStatus(order.termin_tarihi, order.status);
                              const isSelected = selectedOrder?.id === order.id;

                              return (
                              <tr key={order.id} onClick={() => handleRowClick(order)} className={`cursor-pointer transition-all duration-300 group ${isSelected ? 'bg-blue-50/80 shadow-inner' : 'hover:bg-white/50'}`}>
                                  <td className="px-5 py-4 relative">
                                      {isSelected && <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"></div>}
                                      <div className="flex flex-col gap-1 pl-2">
                                          <span className={`font-mono text-xs font-bold ${isSelected ? 'text-blue-700' : 'text-slate-500'}`}>
                                              {formatOrderNumber(order.id)}
                                          </span>
                                          <span className={`text-sm font-black truncate max-w-[200px] ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                                              {order.suppliers?.name || "Genel Tedarikçi"}
                                          </span>
                                      </div>
                                  </td>
                                  <td className="px-5 py-4">
                                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-sm ${deadline.classes}`}>
                                          {deadline.icon} {deadline.text}
                                      </div>
                                  </td>
                              </tr>
                          )})}
                          {filteredOrders.length === 0 && !loading && (
                              <tr><td colSpan={2} className="px-6 py-20 text-center text-slate-500"><div className="flex flex-col items-center gap-3"><div className="bg-white p-4 rounded-2xl shadow-sm"><FileText className="h-8 w-8 text-slate-300" /></div><p className="font-bold text-slate-600">Sipariş bulunamadı.</p></div></td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>

          {/* SAĞ: DETAY VE DOSYA KOKPİTİ */}
          <div className="xl:w-6/12 flex flex-col bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] overflow-hidden relative">
              
              {!selectedOrder ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-60">
                      <div className="bg-white/80 p-6 rounded-full shadow-sm mb-4"><PackageOpen className="h-12 w-12 text-blue-400" /></div>
                      <h3 className="text-xl font-black text-slate-800">Sipariş Detayları</h3>
                      <p className="text-sm font-medium text-slate-500 mt-2 max-w-[250px]">Tüm detayları, ekli dosyaları ve zaman çizelgesini görmek için soldan bir sipariş seçin.</p>
                  </div>
              ) : (
                  <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-6 lg:p-8">
                      
                      {/* Üst Başlık Bilgileri */}
                      <div className="flex items-start justify-between mb-8 border-b border-slate-100 pb-6">
                          <div className="flex flex-col gap-1">
                              <span className="text-blue-600 font-mono font-bold text-sm bg-blue-50 w-max px-2 py-0.5 rounded">
                                  {formatOrderNumber(selectedOrder.id)}
                              </span>
                              <h2 className="text-2xl font-black text-slate-900 leading-tight mt-1">
                                  {selectedOrder.suppliers?.name || "Genel Tedarikçi"}
                              </h2>
                          </div>
                      </div>

                      {/* 🚀 YENİ DOSYA EKLEME VE YÖNETİM MODÜLÜ */}
                      <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100 shadow-sm mb-8">
                          <div className="flex items-center justify-between mb-4">
                              <h3 className="font-black text-slate-800 flex items-center gap-2">
                                  <FileCheck className="h-5 w-5 text-blue-600" /> Ekli Dosyalar & Dokümanlar
                              </h3>
                              
                              {/* Gizli Input ve Yükleme Butonu */}
                              <input 
                                  type="file" 
                                  ref={fileInputRef} 
                                  onChange={handleFileUpload} 
                                  className="hidden" 
                                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                              />
                              <Button 
                                  onClick={() => fileInputRef.current?.click()} 
                                  disabled={uploading}
                                  className="h-9 px-4 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold shadow-sm transition-all text-xs"
                              >
                                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UploadCloud className="h-4 w-4 mr-2" />}
                                  {uploading ? "Yükleniyor..." : "Dosya Yükle"}
                              </Button>
                          </div>

                          {/* Dosya Listesi */}
                          <div className="flex flex-col gap-3">
                              {(!selectedOrder.attachments || selectedOrder.attachments.length === 0) ? (
                                  <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                                      <p className="text-xs font-bold text-slate-400">Bu siparişe henüz hiç dosya veya fatura eklenmemiş.</p>
                                  </div>
                              ) : (
                                  selectedOrder.attachments.map((file: any, index: number) => (
                                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                          <div className="flex items-center gap-3 overflow-hidden">
                                              <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600 shrink-0"><FileText className="h-5 w-5" /></div>
                                              <div className="flex flex-col truncate">
                                                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-slate-800 hover:text-blue-600 truncate transition-colors">
                                                      {file.name}
                                                  </a>
                                                  <span className="text-[10px] text-slate-400 font-medium">{new Date(file.date).toLocaleDateString('tr-TR')}</span>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                                              <button onClick={() => copyToClipboard(file.url)} className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-lg transition-colors tooltip-trigger" title="Paylaşım Linkini Kopyala">
                                                  <Copy className="h-4 w-4" />
                                              </button>
                                              <button onClick={() => handleFileDelete(file)} className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-colors" title="Dosyayı Sil">
                                                  <Trash2 className="h-4 w-4" />
                                              </button>
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>

                      {/* Açıklama ve Timeline Alanı */}
                      <div className="bg-white/80 p-5 rounded-3xl border border-slate-100 shadow-sm mb-8">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Açıklama / İçerik</span>
                          <p className="text-sm font-medium text-slate-700 leading-relaxed">
                              {selectedOrder.description || "Bu sipariş için detaylı bir açıklama girilmemiş."}
                          </p>
                      </div>

                      <div className="flex flex-col gap-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent pl-8 md:pl-0">
                          {/* Log: Oluşturan */}
                          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-100 text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                  <User className="h-4 w-4" />
                              </div>
                              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white/80 p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2">
                                  <span className="font-bold text-slate-800 text-sm">Satın Alma Oluşturuldu</span>
                                  <div className="scale-95 origin-left">
                                      <ActionUserBadge profile={selectedOrder.profiles} actionText="İşlemi Başlatan" date={selectedOrder.created_at} />
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Aksiyon Butonları */}
                      {!isEditing && (
                          <div className="flex items-center gap-3 mt-auto pt-8">
                              {selectedOrder.status !== 'TAMAMLANDI' && (
                                  <Button onClick={() => markAsCompleted(selectedOrder.id)} className="flex-1 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/30 transition-all">
                                      <CheckCircle className="mr-2 h-5 w-5" /> Teslim Alındı
                                  </Button>
                              )}
                              <Button onClick={() => deleteOrder(selectedOrder.id)} variant="outline" className="h-14 w-14 rounded-2xl border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-200 transition-all p-0 flex-shrink-0 bg-white/80">
                                  <Trash2 className="h-5 w-5" />
                              </Button>
                          </div>
                      )}

                  </div>
              )}
          </div>
      </div>
    </div>
  )
}