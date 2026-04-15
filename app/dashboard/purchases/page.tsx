"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { 
  PlusCircle, Trash2, Edit2, PackageOpen, RefreshCcw, CheckCircle, Clock, 
  Search, FileText, X, AlertTriangle, User, CalendarDays, UploadCloud, Link as LinkIcon, FileCheck, Loader2, Copy, Inbox, Flame
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

  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [requests, setRequests] = useState<any[]>([])
  const [showRequests, setShowRequests] = useState(true)

  useEffect(() => {
    fetchOrders()
    fetchRequests() 
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

  const fetchRequests = async () => {
      const { data } = await supabase
          .from('material_requests')
          .select(`*, profiles ( first_name, last_name, department )`)
          .order('created_at', { ascending: false })
      if (data) setRequests(data)
  }

  const updateRequestStatus = async (id: number, newStatus: string) => {
      await supabase.from('material_requests').update({ status: newStatus }).eq('id', id)
      fetchRequests()
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
      if (window.innerWidth < 1280) {
          setTimeout(() => {
              document.getElementById('order-detail-section')?.scrollIntoView({ behavior: 'smooth' })
          }, 100)
      }
  }

  const markAsCompleted = async (id: number) => {
      if(!confirm("Siparişi teslim alındı olarak işaretliyorsunuz. Onaylıyor musunuz?")) return;
      await supabase.from('purchase_orders').update({ status: 'TAMAMLANDI' }).eq('id', id)
      fetchOrders()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setUploading(true)
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${formatOrderNumber(selectedOrder.id)}_${Date.now()}.${fileExt}`

      try {
          const { data: uploadData, error: uploadError } = await supabase.storage
              .from('purchase_documents')
              .upload(fileName, file)

          if (uploadError) throw uploadError

          const { data: { publicUrl } } = supabase.storage
              .from('purchase_documents')
              .getPublicUrl(fileName)

          const newAttachment = {
              name: file.name,
              url: publicUrl,
              path: uploadData.path,
              date: new Date().toISOString()
          }

          const currentAttachments = selectedOrder.attachments || []
          const updatedAttachments = [...currentAttachments, newAttachment]

          const { error: updateError } = await supabase
              .from('purchase_orders')
              .update({ attachments: updatedAttachments })
              .eq('id', selectedOrder.id)

          if (updateError) throw updateError

          fetchOrders()
      } catch (error: any) {
          alert("Dosya yüklenirken hata oluştu: " + error.message)
      } finally {
          setUploading(false)
          if (fileInputRef.current) fileInputRef.current.value = "" 
      }
  }

  const handleFileDelete = async (fileToDelete: any) => {
      if(!confirm(`"${fileToDelete.name}" dosyasını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;

      try {
          await supabase.storage.from('purchase_documents').remove([fileToDelete.path])

          const updatedAttachments = selectedOrder.attachments.filter((f: any) => f.path !== fileToDelete.path)
          
          await supabase.from('purchase_orders')
              .update({ attachments: updatedAttachments })
              .eq('id', selectedOrder.id)

          fetchOrders()
      } catch (error: any) {
          alert("Silme hatası: " + error.message)
      }
  }

  const copyToClipboard = (url: string) => {
      navigator.clipboard.writeText(url)
      alert("✅ Dosya linki kopyalandı! İstediğiniz kişiye gönderebilirsiniz. Sadece dosyayı göreceklerdir.")
  }

  const filteredOrders = orders.filter(o => 
      formatOrderNumber(o.id).toLowerCase().includes(searchTerm.toLowerCase()) || 
      (o.suppliers?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 font-sans xl:h-[calc(100vh-100px)] w-full pb-10 xl:pb-0 overflow-hidden">
      
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0">
        <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Satın Alma Kokpiti</h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1 font-medium">Tedarikçi siparişlerini ve terminleri akıllı ekrandan yönetin.</p>
        </div>
        
        <div className="flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-3 w-full xl:w-auto">
            <div className="relative w-full md:w-64 flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="SAS No veya Firma..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-12 md:h-14 bg-white/60 backdrop-blur-md border-white/50 text-xs md:text-sm focus:ring-2 focus:ring-blue-500 shadow-sm rounded-xl md:rounded-2xl transition-all" />
            </div>
            <Button onClick={() => { fetchOrders(); fetchRequests(); }} variant="outline" className="h-12 w-12 md:h-14 md:w-14 p-0 bg-white/60 backdrop-blur-md border-white/50 text-slate-600 rounded-xl md:rounded-2xl shadow-sm hover:text-blue-600 hover:bg-white transition-all shrink-0">
                <RefreshCcw className={`h-4 w-4 md:h-5 md:w-5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </Button>
            <Link href="/dashboard/purchases/new" className="w-full sm:w-auto mt-2 sm:mt-0">
                <Button className="h-12 md:h-14 px-6 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-bold rounded-xl md:rounded-2xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center">
                    <PlusCircle className="mr-2 h-4 w-4 md:h-5 md:w-5" /> Yeni Fiş Oluştur
                </Button>
            </Link>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 flex-1 min-h-0 w-full">
          
          <div className="w-full xl:w-6/12 flex flex-col gap-6 max-h-[800px] xl:max-h-full">
              
              <div className="flex flex-col bg-white/60 backdrop-blur-2xl border border-blue-200/50 shadow-lg shadow-blue-500/5 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shrink-0 transition-all">
                  <button onClick={() => setShowRequests(!showRequests)} className="flex items-center justify-between p-4 md:p-5 bg-blue-50/50 hover:bg-blue-50 cursor-pointer border-b border-blue-100">
                      <div className="flex items-center gap-3">
                          <Inbox className="h-5 w-5 text-blue-600" />
                          <h3 className="font-black text-slate-800 text-sm md:text-base">Mühendislik & Saha İstekleri</h3>
                          {requests.filter(r => r.status === 'BEKLIYOR').length > 0 && (
                              <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                                  {requests.filter(r => r.status === 'BEKLIYOR').length} YENİ
                              </span>
                          )}
                      </div>
                      <span className="text-xs font-bold text-blue-600">{showRequests ? 'Gizle' : 'Göster'}</span>
                  </button>
                  
                  {showRequests && (
                      <div className="overflow-y-auto max-h-[300px] custom-scrollbar p-2 bg-white/40">
                          {requests.length === 0 ? (
                              <p className="text-center py-6 text-sm font-bold text-slate-400">Şu an bekleyen talep yok.</p>
                          ) : (
                              <div className="flex flex-col gap-2">
                                  {requests.map(req => {
                                      // 🚀 ACİL İSTEK KONTROLÜ
                                      const isUrgent = req.priority === 'ACIL';

                                      return (
                                      <div key={req.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl shadow-sm gap-4 border-2 transition-all ${isUrgent ? 'bg-rose-50/30 border-rose-300 shadow-rose-100' : 'bg-white border-slate-100'}`}>
                                          <div className="flex flex-col gap-1">
                                              <div className="flex items-center gap-2">
                                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{req.request_no}</span>
                                                  
                                                  {/* Durum Rozeti */}
                                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                                                      req.status === 'BEKLIYOR' ? 'bg-amber-100 text-amber-700' :
                                                      req.status === 'SIPARIS_VERILDI' ? 'bg-blue-100 text-blue-700' :
                                                      req.status === 'GELDI' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                                  }`}>{req.status.replace('_', ' ')}</span>

                                                  {/* 🚀 ACİL ROZETİ */}
                                                  {isUrgent && (
                                                      <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded bg-rose-500 text-white animate-pulse shadow-sm">
                                                          <Flame className="h-3 w-3" /> ACİL
                                                      </span>
                                                  )}
                                              </div>
                                              
                                              <p className={`text-sm font-black mt-1 ${isUrgent ? 'text-rose-800' : 'text-slate-800'}`}>
                                                  {req.material_name} <span className="text-xs font-bold ml-1 opacity-70">({req.material_code})</span>
                                              </p>

                                              {/* 🚀 AÇIKLAMA KISMI */}
                                              {req.description && (
                                                  <div className={`text-xs font-medium p-2 rounded-lg mt-1 border ${isUrgent ? 'bg-rose-100/50 border-rose-200 text-rose-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                                      {req.description}
                                                  </div>
                                              )}

                                              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 mt-2">
                                                  <span className="flex items-center gap-1"><User className="h-3 w-3" /> {req.profiles?.first_name} {req.profiles?.last_name}</span>
                                                  <span>Proje: {req.project_code || "-"}</span>
                                              </div>
                                          </div>
                                          <div className="flex flex-col sm:items-end gap-2 shrink-0">
                                              <span className={`text-xl font-black px-3 py-1 rounded-lg text-center ${isUrgent ? 'text-rose-700 bg-rose-100' : 'text-blue-600 bg-blue-50'}`}>
                                                  {req.quantity} Adet
                                              </span>
                                              <select 
                                                  className="text-[10px] font-bold bg-white border border-slate-300 rounded p-1.5 outline-none shadow-sm cursor-pointer hover:border-blue-400 focus:ring-2 focus:ring-blue-500"
                                                  value={req.status}
                                                  onChange={(e) => updateRequestStatus(req.id, e.target.value)}
                                              >
                                                  <option value="BEKLIYOR">Bekliyor (İşlem Yapılmadı)</option>
                                                  <option value="SIPARIS_VERILDI">Siparişi Verildi (Yolda)</option>
                                                  <option value="GELDI">Geldi / Teslim Edildi</option>
                                                  <option value="REDDEDILDI">Reddedildi / İptal</option>
                                              </select>
                                          </div>
                                      </div>
                                  )})}
                              </div>
                          )}
                      </div>
                  )}
              </div>

              <div className="flex flex-col bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden flex-1 min-h-0">
                  <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                      <h3 className="font-black text-slate-800 text-sm">Resmi Satın Alma Fişleri (SAS)</h3>
                  </div>
                  <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
                      <table className="w-full text-left border-collapse min-w-[300px]">
                          <thead className="sticky top-0 bg-white/90 backdrop-blur-md z-10">
                              <tr>
                                  <th className="px-4 md:px-5 py-3 md:py-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Sipariş & Firma</th>
                                  <th className="px-4 md:px-5 py-3 md:py-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Durum</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100/50">
                              {filteredOrders.map((order) => {
                                  const deadline = getDeadlineStatus(order.termin_tarihi, order.status);
                                  const isSelected = selectedOrder?.id === order.id;

                                  return (
                                  <tr key={order.id} onClick={() => handleRowClick(order)} className={`cursor-pointer transition-all duration-300 group ${isSelected ? 'bg-blue-50/80 shadow-inner' : 'hover:bg-white/50'}`}>
                                      <td className="px-4 md:px-5 py-3 md:py-4 relative">
                                          {isSelected && <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"></div>}
                                          <div className="flex flex-col gap-0.5 md:gap-1 pl-1 md:pl-2">
                                              <span className={`font-mono text-[10px] md:text-xs font-bold ${isSelected ? 'text-blue-700' : 'text-slate-500'}`}>
                                                  {formatOrderNumber(order.id)}
                                              </span>
                                              <span className={`text-xs md:text-sm font-black truncate max-w-[150px] md:max-w-[200px] ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                                                  {order.suppliers?.name || "Genel Tedarikçi"}
                                              </span>
                                          </div>
                                      </td>
                                      <td className="px-4 md:px-5 py-3 md:py-4">
                                          <div className={`inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[11px] font-bold shadow-sm ${deadline.classes}`}>
                                              {deadline.icon} <span className="truncate">{deadline.text}</span>
                                          </div>
                                      </td>
                                  </tr>
                              )})}
                              {filteredOrders.length === 0 && !loading && (
                                  <tr><td colSpan={2} className="px-6 py-16 text-center text-slate-500"><div className="flex flex-col items-center gap-3"><div className="bg-white p-3 rounded-xl shadow-sm"><FileText className="h-6 w-6 text-slate-300" /></div><p className="text-xs font-bold text-slate-600">Sipariş bulunamadı.</p></div></td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>

          <div id="order-detail-section" className="w-full xl:w-6/12 flex flex-col bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden relative">
              
              {!selectedOrder ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 md:p-10 opacity-60 py-20 xl:py-10">
                      <div className="bg-white/80 p-4 md:p-6 rounded-full shadow-sm mb-4"><PackageOpen className="h-10 w-10 md:h-12 md:w-12 text-blue-400" /></div>
                      <h3 className="text-lg md:text-xl font-black text-slate-800">Sipariş Detayları</h3>
                      <p className="text-xs md:text-sm font-medium text-slate-500 mt-2 max-w-[200px] md:max-w-[250px]">Tüm detayları, ekli dosyaları ve zaman çizelgesini görmek için listeden bir SAS seçin.</p>
                  </div>
              ) : (
                  <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-5 md:p-6 lg:p-8">
                      
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 md:mb-8 border-b border-slate-100 pb-5 md:pb-6 gap-4">
                          <div className="flex flex-col gap-1">
                              <span className="text-blue-600 font-mono font-bold text-xs md:text-sm bg-blue-50 w-max px-2 py-0.5 rounded">
                                  {formatOrderNumber(selectedOrder.id)}
                              </span>
                              <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-tight mt-1">
                                  {selectedOrder.suppliers?.name || "Genel Tedarikçi"}
                              </h2>
                          </div>
                      </div>

                      <div className="bg-slate-50/50 p-4 md:p-5 rounded-[1.5rem] md:rounded-3xl border border-slate-100 shadow-sm mb-6 md:mb-8">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                              <h3 className="font-black text-sm md:text-base text-slate-800 flex items-center gap-2">
                                  <FileCheck className="h-4 w-4 md:h-5 md:w-5 text-blue-600" /> Ekli Dokümanlar (Teklif, Dekont vb.)
                              </h3>
                              
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
                                  className="h-10 md:h-9 px-4 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold shadow-sm transition-all text-xs w-full sm:w-auto"
                              >
                                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UploadCloud className="h-4 w-4 mr-2" />}
                                  {uploading ? "Yükleniyor..." : "Dosya Yükle"}
                              </Button>
                          </div>

                          <div className="flex flex-col gap-3">
                              {(!selectedOrder.attachments || selectedOrder.attachments.length === 0) ? (
                                  <div className="text-center p-5 md:p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                                      <p className="text-[10px] md:text-xs font-bold text-slate-400">Bu siparişe henüz dosya eklenmemiş.</p>
                                  </div>
                              ) : (
                                  selectedOrder.attachments.map((file: any, index: number) => (
                                      <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-xl md:rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group gap-3 sm:gap-0">
                                          <div className="flex items-center gap-3 overflow-hidden w-full sm:w-auto">
                                              <div className="bg-emerald-50 p-2 rounded-lg md:rounded-xl text-emerald-600 shrink-0"><FileText className="h-4 w-4 md:h-5 md:w-5" /></div>
                                              <div className="flex flex-col truncate w-full">
                                                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs md:text-sm font-bold text-slate-800 hover:text-blue-600 truncate transition-colors w-full">
                                                      {file.name}
                                                  </a>
                                                  <span className="text-[9px] md:text-[10px] text-slate-400 font-medium">{new Date(file.date).toLocaleDateString('tr-TR')}</span>
                                              </div>
                                          </div>
                                          <div className="flex items-center justify-end gap-2 shrink-0 opacity-100 sm:opacity-80 sm:group-hover:opacity-100 transition-opacity">
                                              <button onClick={() => copyToClipboard(file.url)} className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-lg transition-colors" title="Kopyala">
                                                  <Copy className="h-3 w-3 md:h-4 md:w-4" />
                                              </button>
                                              <button onClick={() => handleFileDelete(file)} className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-colors" title="Sil">
                                                  <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                                              </button>
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>

                      <div className="bg-white/80 p-4 md:p-5 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm mb-6 md:mb-8">
                          <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Sipariş İçeriği / Notlar</span>
                          <p className="text-xs md:text-sm font-medium text-slate-700 leading-relaxed">
                              {selectedOrder.description || "Bu sipariş için detaylı bir açıklama girilmemiş."}
                          </p>
                      </div>

                      <div className="flex flex-col gap-4 md:gap-6 relative before:absolute before:inset-0 before:ml-4 md:before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent pl-6 md:pl-0">
                          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                              <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full border-4 border-white bg-blue-100 text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                  <User className="h-3 w-3 md:h-4 md:w-4" />
                              </div>
                              <div className="w-[calc(100%-1rem)] md:w-[calc(50%-2.5rem)] bg-white/80 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1.5 md:gap-2">
                                  <span className="font-bold text-slate-800 text-xs md:text-sm">SAS Oluşturuldu</span>
                                  <div className="scale-90 md:scale-95 origin-left">
                                      <ActionUserBadge profile={selectedOrder.profiles} actionText="İşlemi Başlatan" date={selectedOrder.created_at} />
                                  </div>
                              </div>
                          </div>
                      </div>

                      {!isEditing && (
                          <div className="flex flex-col sm:flex-row items-center gap-3 mt-auto pt-6 md:pt-8 w-full">
                              {selectedOrder.status !== 'TAMAMLANDI' && (
                                  <Button onClick={() => markAsCompleted(selectedOrder.id)} className="w-full sm:flex-1 h-12 md:h-14 rounded-xl md:rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/30 transition-all text-xs md:text-sm">
                                      <CheckCircle className="mr-2 h-4 w-4 md:h-5 md:w-5" /> Teslim Alındı (Stoğa Gir)
                                  </Button>
                              )}
                              <Button onClick={() => deleteOrder(selectedOrder.id)} variant="outline" className="w-full sm:w-14 h-12 md:h-14 rounded-xl md:rounded-2xl border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-200 transition-all bg-white/80 shrink-0">
                                  <Trash2 className="h-4 w-4 md:h-5 md:w-5 mr-2 sm:mr-0" /> <span className="sm:hidden font-bold">Siparişi Sil</span>
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