"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { PlusCircle, Trash2, Edit2, PackageOpen, RefreshCcw, CheckCircle, Clock, Search, FileText, X, AlertTriangle, User, CalendarDays } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function PurchasesPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const supabase = createClient()

  // 🚀 YENİ: Seçili Sipariş ve Düzenleme Modu State'leri
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ total_amount: "", description: "", termin_tarihi: "", status: "" })

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
        
        // Eğer seçili bir sipariş varsa, güncel verisini bulup sağ paneli tazele
        if (selectedOrder && data) {
            const updatedSelected = data.find(o => o.id === selectedOrder.id)
            setSelectedOrder(updatedSelected || null)
        }
    } finally {
        setLoading(false)
    }
  }

  const formatOrderNumber = (id: number) => `SAS${String(id).padStart(5, '0')}`;

  const getAvatarColor = (name: string) => {
      const colors = ["bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-violet-100 text-violet-700", "bg-amber-100 text-amber-700", "bg-pink-100 text-pink-700"];
      const index = name.charCodeAt(0) % colors.length;
      return colors[index];
  }

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
      setIsEditing(false) // Başka satıra geçince edit modunu kapat
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

  const filteredOrders = orders.filter(o => 
      formatOrderNumber(o.id).toLowerCase().includes(searchTerm.toLowerCase()) || 
      (o.suppliers?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 font-sans h-[calc(100vh-100px)]">
      
      {/* 🚀 ÜST BAŞLIK ALANI */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Satın Alma Kokpiti</h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">Tedarikçi siparişlerini ve terminleri akıllı ekrandan yönetin.</p>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="SAS No veya Firma Ara..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-12 bg-white/60 backdrop-blur-md border-white/50 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm rounded-2xl transition-all"
                />
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

      {/* 🚀 SPLIT SCREEN (BÖLÜNMÜŞ EKRAN MİMARİSİ) */}
      <div className="flex flex-col xl:flex-row gap-6 flex-1 min-h-0">
          
          {/* SOL PANEL: SİPARİŞ LİSTESİ (7 SÜTUN) */}
          <div className="xl:w-7/12 flex flex-col bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] overflow-hidden">
              <div className="overflow-y-auto flex-1 p-2 no-scrollbar">
                  <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10">
                          <tr>
                              <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sipariş & Firma</th>
                              <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Durum</th>
                              <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tutar (TL)</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/50">
                          {filteredOrders.map((order) => {
                              const deadline = getDeadlineStatus(order.termin_tarihi, order.status);
                              const isSelected = selectedOrder?.id === order.id;

                              return (
                              <tr 
                                key={order.id} 
                                onClick={() => handleRowClick(order)}
                                className={`cursor-pointer transition-all duration-300 group ${isSelected ? 'bg-blue-50/80 shadow-inner' : 'hover:bg-white/50'}`}
                              >
                                  {/* SİPARİŞ NO VE FİRMA */}
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

                                  {/* DURUM ROZETİ */}
                                  <td className="px-5 py-4">
                                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-sm ${deadline.classes}`}>
                                          {deadline.icon} {deadline.text}
                                      </div>
                                  </td>

                                  {/* TUTAR */}
                                  <td className="px-5 py-4 text-right">
                                      <div className={`text-base font-black tabular-nums ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
                                          {order.total_amount?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                      </div>
                                  </td>
                              </tr>
                          )})}
                          {filteredOrders.length === 0 && !loading && (
                              <tr>
                                  <td colSpan={3} className="px-6 py-20 text-center text-slate-500">
                                      <div className="flex flex-col items-center gap-3">
                                          <div className="bg-white p-4 rounded-2xl shadow-sm"><FileText className="h-8 w-8 text-slate-300" /></div>
                                          <p className="font-bold text-slate-600">Sipariş bulunamadı.</p>
                                      </div>
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>

          {/* SAĞ PANEL: DETAY VE TIMELINE (5 SÜTUN) */}
          <div className="xl:w-5/12 flex flex-col bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] overflow-hidden relative">
              
              {/* Neon Glow Arkaplan */}
              <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 rounded-full bg-blue-400/10 blur-3xl pointer-events-none"></div>

              {!selectedOrder ? (
                  // SEÇİM YAPILMADIYSA GÖRÜNEN EKRAN
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-60">
                      <div className="bg-white/80 p-6 rounded-full shadow-sm mb-4">
                          <PackageOpen className="h-12 w-12 text-blue-400" />
                      </div>
                      <h3 className="text-xl font-black text-slate-800">Sipariş Detayları</h3>
                      <p className="text-sm font-medium text-slate-500 mt-2 max-w-[250px]">Tüm detayları, zaman çizelgesini ve aksiyonları görmek için soldaki listeden bir sipariş seçin.</p>
                  </div>
              ) : (
                  // SİPARİŞ SEÇİLDİYSE GÖRÜNEN EKRAN
                  <div className="flex flex-col h-full overflow-y-auto no-scrollbar p-8">
                      
                      {/* DETAY BAŞLIĞI */}
                      <div className="flex items-start justify-between mb-8">
                          <div className="flex flex-col gap-1">
                              <span className="text-blue-600 font-mono font-bold text-sm bg-blue-50 w-max px-2 py-0.5 rounded">
                                  {formatOrderNumber(selectedOrder.id)}
                              </span>
                              <h2 className="text-2xl font-black text-slate-900 leading-tight mt-1">
                                  {selectedOrder.suppliers?.name || "Genel Tedarikçi"}
                              </h2>
                          </div>
                          <div className="text-right">
                              <div className="text-3xl font-black text-slate-800 tracking-tight tabular-nums">
                                  {selectedOrder.total_amount?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                              </div>
                          </div>
                      </div>

                      {/* İÇERİK VEYA DÜZENLEME FORMU */}
                      {isEditing ? (
                          // INLINE EDIT (İÇERİDEN DÜZENLEME) MODU
                          <div className="flex flex-col gap-5 bg-white/80 p-6 rounded-3xl shadow-inner border border-slate-100 mb-8 animate-in fade-in slide-in-from-bottom-4">
                              <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-bold text-slate-800">Siparişi Düzenle</h3>
                                  <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5"/></button>
                              </div>
                              <div className="space-y-2">
                                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Açıklama / Ürünler</Label>
                                  <Textarea value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} className="h-20 resize-none bg-white border-slate-200 rounded-2xl focus:ring-blue-500 shadow-sm text-sm font-medium"/>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tutar (TL)</Label>
                                      <Input type="number" value={editForm.total_amount} onChange={(e) => setEditForm({...editForm, total_amount: e.target.value})} className="bg-white border-slate-200 font-black text-slate-800 rounded-2xl h-12" />
                                  </div>
                                  <div className="space-y-2">
                                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Termin Tarihi</Label>
                                      <Input type="date" value={editForm.termin_tarihi} onChange={(e) => setEditForm({...editForm, termin_tarihi: e.target.value})} className="bg-white border-slate-200 text-blue-600 font-bold rounded-2xl h-12" />
                                  </div>
                              </div>
                              <div className="space-y-2">
                                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Durum</Label>
                                  <select value={editForm.status} onChange={(e) => setEditForm({...editForm, status: e.target.value})} className="w-full h-12 px-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
                                      <option value="BEKLIYOR">⏳ Tedarikçi Bekleniyor</option>
                                      <option value="TAMAMLANDI">✅ Teslim Alındı</option>
                                      <option value="IPTAL">❌ İptal Edildi</option>
                                  </select>
                              </div>
                              <Button onClick={saveOrderUpdate} className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/30 mt-2">Kaydet</Button>
                          </div>
                      ) : (
                          // SİPARİŞ DETAYLARI VE TİMELİNE
                          <div className="flex flex-col gap-8 flex-1 animate-in fade-in">
                              
                              {/* Açıklama Kutusu */}
                              <div className="bg-white/80 p-5 rounded-3xl border border-white shadow-sm">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Açıklama / İçerik</span>
                                  <p className="text-sm font-medium text-slate-700 leading-relaxed">
                                      {selectedOrder.description || "Bu sipariş için detaylı bir açıklama girilmemiş."}
                                  </p>
                              </div>

                              {/* TIMELINE (ZAMAN ÇİZELGESİ) */}
                              <div className="flex flex-col gap-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent pl-8 md:pl-0">
                                  
                                  {/* Log 1: Oluşturulma */}
                                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-100 text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                          <User className="h-4 w-4" />
                                      </div>
                                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white/80 p-4 rounded-2xl border border-slate-100 shadow-sm">
                                          <div className="flex items-center justify-between mb-1">
                                              <span className="font-bold text-slate-800 text-sm">Talep Oluşturuldu</span>
                                              <span className="text-xs font-medium text-slate-400">{new Date(selectedOrder.created_at).toLocaleDateString('tr-TR')}</span>
                                          </div>
                                          <p className="text-xs text-slate-500 font-medium">
                                              İşlemi Yapan: <span className="font-bold text-slate-700">{selectedOrder.profiles ? `${selectedOrder.profiles.first_name} ${selectedOrder.profiles.last_name}` : "Sistem"}</span>
                                          </p>
                                      </div>
                                  </div>

                                  {/* Log 2: Güncel Durum */}
                                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${selectedOrder.status === 'TAMAMLANDI' ? 'bg-emerald-100 text-emerald-600' : selectedOrder.status === 'IPTAL' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                          {selectedOrder.status === 'TAMAMLANDI' ? <CheckCircle className="h-4 w-4"/> : selectedOrder.status === 'IPTAL' ? <X className="h-4 w-4"/> : <Clock className="h-4 w-4"/>}
                                      </div>
                                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white/80 p-4 rounded-2xl border border-slate-100 shadow-sm">
                                          <div className="flex items-center justify-between mb-1">
                                              <span className="font-bold text-slate-800 text-sm">Güncel Durum</span>
                                          </div>
                                          <p className={`text-xs font-bold ${selectedOrder.status === 'TAMAMLANDI' ? 'text-emerald-600' : selectedOrder.status === 'IPTAL' ? 'text-red-600' : 'text-amber-600'}`}>
                                              {selectedOrder.status === 'BEKLIYOR' ? 'Tedarikçi Bekleniyor' : selectedOrder.status === 'TAMAMLANDI' ? 'Teslim Alındı & Tamamlandı' : 'İptal Edildi'}
                                          </p>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}

                      {/* ALT AKSİYON BUTONLARI (Edit modunda değilse göster) */}
                      {!isEditing && (
                          <div className="flex items-center gap-3 mt-auto pt-8">
                              {selectedOrder.status !== 'TAMAMLANDI' && (
                                  <Button onClick={() => markAsCompleted(selectedOrder.id)} className="flex-1 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/30 transition-all">
                                      <CheckCircle className="mr-2 h-5 w-5" /> Teslim Alındı
                                  </Button>
                              )}
                              <Button onClick={openEditMode} variant="outline" className="flex-1 h-14 rounded-2xl border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all font-bold bg-white/80">
                                  <Edit2 className="mr-2 h-4 w-4" /> Düzenle
                              </Button>
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