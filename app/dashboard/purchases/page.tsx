"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { 
  PlusCircle, Trash2, Edit2, PackageOpen, RefreshCcw, CheckCircle, Clock, 
  Search, FileText, X, AlertTriangle, User, CalendarDays, UploadCloud, FileCheck, Loader2, Copy, Inbox, Flame, Printer
} from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent } from "@/components/ui/dialog"

export default function PurchasesPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const supabase = createClient()

  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [requests, setRequests] = useState<any[]>([])
  const [showRequests, setShowRequests] = useState(true)
  
  const [isFormViewerOpen, setIsFormViewerOpen] = useState(false)
  const [viewingOrderGroup, setViewingOrderGroup] = useState<any>(null)

  useEffect(() => {
    fetchOrders()
    fetchRequests() 
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
        const { data } = await supabase.from('purchase_orders').select(`*, suppliers ( name ), profiles ( first_name, last_name, department )`).order('created_at', { ascending: false })
        if (data) setOrders(data)
        
        if (selectedOrder && data) {
            const updatedSelected = data.find(o => o.id === selectedOrder.id)
            setSelectedOrder(updatedSelected || null)
        }
    } finally { setLoading(false) }
  }

  const fetchRequests = async () => {
      try {
          const { data, error } = await supabase.from('material_requests')
              .select(`*, profiles ( first_name, last_name, department )`)
              .neq('status', 'GELDI') 
              .order('created_at', { ascending: false })
          
          if (error) throw error;
          if (data) {
              const grouped = data.reduce((acc: any, req: any) => {
                  if (!acc[req.request_no]) {
                      acc[req.request_no] = { 
                          request_no: req.request_no, project_code: req.project_code, material_type: req.description,
                          status: req.status, created_at: req.created_at, requested_by: req.requested_by, profiles: req.profiles, priority: req.priority,
                          items: [req] 
                      }
                  } else {
                      acc[req.request_no].items.push(req)
                      if (req.priority === 'ACIL') acc[req.request_no].priority = 'ACIL' 
                  }
                  return acc
              }, {})
              setRequests(Object.values(grouped))
          }
      } catch (error: any) { console.error("İstek Çekme Hatası:", error); }
  }

  const rejectRequest = async (requestNo: string) => {
      if(!confirm("Bu sipariş formunu tamamen reddetmek istediğinize emin misiniz?")) return;
      await supabase.from('material_requests').update({ status: 'REDDEDILDI' }).eq('request_no', requestNo)
      fetchRequests()
  }
  
  const approveRequest = async (requestNo: string) => {
      if(!confirm("Bu sipariş formunu onaylayıp 'Siparişi Verildi' durumuna çekmek istiyor musunuz?")) return;
      await supabase.from('material_requests').update({ status: 'SIPARIS_VERILDI' }).eq('request_no', requestNo)
      fetchRequests()
  }

  const openFormViewer = (reqGroup: any) => {
      setViewingOrderGroup(reqGroup)
      setIsFormViewerOpen(true)
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
    if(!confirm("Bu SAS Fişini silerseniz, bağlı talepler 'Bekliyor' durumuna düşer. Emin misiniz?")) return;
    await supabase.from('material_requests').update({ status: 'BEKLIYOR', purchase_order_id: null }).eq('purchase_order_id', id)
    await supabase.from('purchase_orders').delete().eq('id', id)
    setSelectedOrder(null); fetchOrders(); fetchRequests();
  }

  const handleRowClick = (order: any) => {
      setSelectedOrder(order); setIsEditing(false);
      if (window.innerWidth < 1280) setTimeout(() => document.getElementById('order-detail-section')?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const markAsCompleted = async (id: number) => {
      if(!confirm("Bu SAS Fişini 'Teslim Alındı' yapıyorsunuz. Bu işlem talepleri otomatik arşive ('GELDİ') çekecektir. Onaylıyor musunuz?")) return;
      await supabase.from('purchase_orders').update({ status: 'TAMAMLANDI' }).eq('id', id)
      await supabase.from('material_requests').update({ status: 'GELDI' }).eq('purchase_order_id', id)
      fetchOrders(); fetchRequests();
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if (!file) return; setUploading(true);
      const fileExt = file.name.split('.').pop(); const fileName = `${formatOrderNumber(selectedOrder.id)}_${Date.now()}.${fileExt}`;
      try {
          const { data: uploadData, error: uploadError } = await supabase.storage.from('purchase_documents').upload(fileName, file)
          if (uploadError) throw uploadError
          const { data: { publicUrl } } = supabase.storage.from('purchase_documents').getPublicUrl(fileName)
          const newAttachment = { name: file.name, url: publicUrl, path: uploadData.path, date: new Date().toISOString() }
          const updatedAttachments = [...(selectedOrder.attachments || []), newAttachment]
          const { error: updateError } = await supabase.from('purchase_orders').update({ attachments: updatedAttachments }).eq('id', selectedOrder.id)
          if (updateError) throw updateError
          fetchOrders()
      } catch (error: any) { alert("Hata: " + error.message) } 
      finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = "" }
  }

  const handleFileDelete = async (fileToDelete: any) => {
      if(!confirm(`"${fileToDelete.name}" silinsin mi?`)) return;
      try {
          await supabase.storage.from('purchase_documents').remove([fileToDelete.path])
          const updatedAttachments = selectedOrder.attachments.filter((f: any) => f.path !== fileToDelete.path)
          await supabase.from('purchase_orders').update({ attachments: updatedAttachments }).eq('id', selectedOrder.id)
          fetchOrders()
      } catch (error: any) { alert("Hata: " + error.message) }
  }

  const copyToClipboard = (url: string) => { navigator.clipboard.writeText(url); alert("✅ Dosya linki kopyalandı!") }
  const filteredOrders = orders.filter(o => formatOrderNumber(o.id).toLowerCase().includes(searchTerm.toLowerCase()) || (o.suppliers?.name || "").toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col gap-6 font-sans xl:h-[calc(100vh-100px)] w-full pb-10 xl:pb-0 overflow-hidden">
      
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0">
        <div><h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Satın Alma Kokpiti</h1><p className="text-xs md:text-sm text-slate-500 mt-1 font-medium">Tedarikçi siparişlerini ve formları akıllı ekrandan yönetin.</p></div>
        <div className="flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-3 w-full xl:w-auto">
            <div className="relative w-full md:w-64 flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="SAS No veya Firma..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-12 md:h-14 bg-white/60 backdrop-blur-md border-white/50 text-xs md:text-sm focus:ring-2 focus:ring-blue-500 shadow-sm rounded-xl md:rounded-2xl transition-all" /></div>
            <Button onClick={() => { fetchOrders(); fetchRequests(); }} variant="outline" className="h-12 w-12 md:h-14 md:w-14 p-0 bg-white/60 text-slate-600 rounded-xl shadow-sm hover:text-blue-600 transition-all shrink-0"><RefreshCcw className={`h-4 w-4 md:h-5 md:w-5 ${loading ? 'animate-spin text-blue-600' : ''}`} /></Button>
            <Link href="/dashboard/purchases/new" className="w-full sm:w-auto mt-2 sm:mt-0"><Button className="h-12 md:h-14 px-6 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center"><PlusCircle className="mr-2 h-4 w-4" /> Yeni SAS Fişi Aç</Button></Link>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 flex-1 min-h-0 w-full">
          <div className="w-full xl:w-6/12 flex flex-col gap-6 max-h-[800px] xl:max-h-full">
              
              <div className="flex flex-col bg-white/60 backdrop-blur-2xl border border-blue-200/50 shadow-lg shadow-blue-500/5 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shrink-0 transition-all">
                  <button onClick={() => setShowRequests(!showRequests)} className="flex items-center justify-between p-4 md:p-5 bg-blue-50/50 hover:bg-blue-50 cursor-pointer border-b border-blue-100">
                      <div className="flex items-center gap-3"><Inbox className="h-5 w-5 text-blue-600" /><h3 className="font-black text-slate-800 text-sm md:text-base">Mühendislik & Saha İstek Formları</h3>{requests.filter(r => r.status === 'BEKLIYOR').length > 0 && (<span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">{requests.filter(r => r.status === 'BEKLIYOR').length} YENİ FORM</span>)}</div>
                      <span className="text-xs font-bold text-blue-600">{showRequests ? 'Gizle' : 'Göster'}</span>
                  </button>
                  
                  {showRequests && (
                      <div className="overflow-y-auto max-h-[350px] custom-scrollbar p-2 bg-white/40">
                          {requests.length === 0 ? (
                              <p className="text-center py-6 text-sm font-bold text-slate-400">Şu an bekleyen istek formu yok.</p>
                          ) : (
                              <div className="flex flex-col gap-3">
                                  {requests.map(reqGroup => {
                                      const isUrgent = reqGroup.priority === 'ACIL';

                                      return (
                                      <div key={reqGroup.request_no} className={`flex flex-col p-4 rounded-xl shadow-sm gap-3 border-2 transition-all ${isUrgent ? 'bg-rose-50/30 border-rose-300 shadow-rose-100' : 'bg-white border-slate-100 hover:border-blue-200'}`}>
                                          <div className="flex items-center justify-between border-b border-slate-100/50 pb-3">
                                              <div className="flex items-center gap-2">
                                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">{reqGroup.request_no}</span>
                                                  {isUrgent && <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded bg-rose-500 text-white animate-pulse shadow-sm"><Flame className="h-3 w-3" /> ACİL İSTEK</span>}
                                              </div>
                                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500"><User className="h-3 w-3" /> {reqGroup.profiles?.first_name} {reqGroup.profiles?.last_name}</div>
                                          </div>
                                          
                                          <div className="flex flex-col gap-2">
                                              <span className="text-sm font-black text-slate-800">{reqGroup.material_type || "Belirtilmedi"} <span className="text-xs font-medium text-slate-500">({reqGroup.items.length} Kalem)</span></span>
                                              <Button onClick={() => openFormViewer(reqGroup)} className="w-full bg-blue-100 hover:bg-blue-600 text-blue-700 hover:text-white transition-colors h-11 rounded-lg font-black text-xs shadow-sm mt-1">
                                                  <FileText className="h-4 w-4 mr-2" /> DİJİTAL SİPARİŞ FORMUNU GÖRÜNTÜLE
                                              </Button>
                                          </div>

                                          <div className="flex justify-between items-end mt-1">
                                              <div className="text-[10px] font-bold text-slate-400">Proje: {reqGroup.project_code || "Belirtilmedi"}</div>
                                              <div className="flex flex-col items-end gap-2">
                                                  {reqGroup.status === 'BEKLIYOR' && (
                                                      <div className="flex items-center gap-2">
                                                          <Button variant="ghost" size="sm" onClick={() => rejectRequest(reqGroup.request_no)} className="h-8 text-[10px] text-rose-500 hover:bg-rose-50 hover:text-rose-700">Reddet</Button>
                                                          <Button size="sm" onClick={() => approveRequest(reqGroup.request_no)} className="h-8 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3">Siparişi Ver</Button>
                                                      </div>
                                                  )}
                                                  {reqGroup.status === 'SIPARIS_VERILDI' && <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-1 rounded uppercase tracking-widest">Siparişi Verildi (Onaylandı)</span>}
                                                  {reqGroup.status === 'REDDEDILDI' && <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase tracking-widest line-through">Reddedildi</span>}
                                              </div>
                                          </div>
                                      </div>
                                  )})}
                              </div>
                          )}
                      </div>
                  )}
              </div>

              <div className="flex flex-col bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden flex-1 min-h-0">
                  <div className="p-4 bg-slate-50/50 border-b border-slate-100"><h3 className="font-black text-slate-800 text-sm">Resmi Satın Alma Fişleri (SAS)</h3></div>
                  <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
                      <table className="w-full text-left border-collapse min-w-[300px]">
                          <thead className="sticky top-0 bg-white/90 backdrop-blur-md z-10"><tr><th className="px-4 md:px-5 py-3 md:py-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Sipariş & Firma</th><th className="px-4 md:px-5 py-3 md:py-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Durum</th></tr></thead>
                          <tbody className="divide-y divide-slate-100/50">
                              {filteredOrders.map((order) => {
                                  const deadline = getDeadlineStatus(order.termin_tarihi, order.status);
                                  const isSelected = selectedOrder?.id === order.id;
                                  return (
                                  <tr key={order.id} onClick={() => handleRowClick(order)} className={`cursor-pointer transition-all duration-300 group ${isSelected ? 'bg-blue-50/80 shadow-inner' : 'hover:bg-white/50'}`}>
                                      <td className="px-4 md:px-5 py-3 md:py-4 relative">
                                          {isSelected && <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"></div>}
                                          <div className="flex flex-col gap-0.5 md:gap-1 pl-1 md:pl-2"><span className={`font-mono text-[10px] md:text-xs font-bold ${isSelected ? 'text-blue-700' : 'text-slate-500'}`}>{formatOrderNumber(order.id)}</span><span className={`text-xs md:text-sm font-black truncate max-w-[150px] md:max-w-[200px] ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>{order.suppliers?.name || "Genel Tedarikçi"}</span></div>
                                      </td>
                                      <td className="px-4 md:px-5 py-3 md:py-4"><div className={`inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[11px] font-bold shadow-sm ${deadline.classes}`}>{deadline.icon} <span className="truncate">{deadline.text}</span></div></td>
                                  </tr>
                              )})}
                              {filteredOrders.length === 0 && !loading && (<tr><td colSpan={2} className="px-6 py-16 text-center text-slate-500"><p className="text-xs font-bold">SAS Fişi bulunamadı.</p></td></tr>)}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>

          <div id="order-detail-section" className="w-full xl:w-6/12 flex flex-col bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden relative">
              {!selectedOrder ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 md:p-10 opacity-60"><div className="bg-white/80 p-4 md:p-6 rounded-full shadow-sm mb-4"><PackageOpen className="h-10 w-10 text-blue-400" /></div><h3 className="text-lg md:text-xl font-black text-slate-800">SAS Detayları</h3><p className="text-xs md:text-sm font-medium text-slate-500 mt-2 max-w-[200px]">Tüm detayları görmek için listeden bir SAS seçin.</p></div>
              ) : (
                  <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-5 md:p-6 lg:p-8">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 md:mb-8 border-b border-slate-100 pb-5 md:pb-6 gap-4">
                          <div className="flex flex-col gap-1"><span className="text-blue-600 font-mono font-bold text-xs md:text-sm bg-blue-50 w-max px-2 py-0.5 rounded">{formatOrderNumber(selectedOrder.id)}</span><h2 className="text-xl md:text-2xl font-black text-slate-900 leading-tight mt-1">{selectedOrder.suppliers?.name || "Genel Tedarikçi"}</h2></div>
                      </div>
                      <div className="bg-slate-50/50 p-4 md:p-5 rounded-[1.5rem] md:rounded-3xl border border-slate-100 shadow-sm mb-6 md:mb-8">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                              <h3 className="font-black text-sm md:text-base text-slate-800 flex items-center gap-2"><FileCheck className="h-4 w-4 md:h-5 md:w-5 text-blue-600" /> Ekli Belgeler</h3>
                              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"/>
                              <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="h-10 md:h-9 px-4 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold shadow-sm transition-all text-xs">{uploading ? "Yükleniyor..." : "Dosya Yükle"}</Button>
                          </div>
                          <div className="flex flex-col gap-3">
                              {(!selectedOrder.attachments || selectedOrder.attachments.length === 0) ? (
                                  <div className="text-center p-5 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50"><p className="text-[10px] font-bold text-slate-400">Bu fişe belge eklenmemiş.</p></div>
                              ) : (
                                  selectedOrder.attachments.map((file: any, index: number) => (
                                      <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                                          <div className="flex items-center gap-3 overflow-hidden"><div className="bg-emerald-50 p-2 rounded-lg text-emerald-600 shrink-0"><FileText className="h-4 w-4" /></div><div className="flex flex-col truncate w-full"><a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-800 hover:text-blue-600 truncate">{file.name}</a><span className="text-[9px] text-slate-400 font-medium">{new Date(file.date).toLocaleDateString('tr-TR')}</span></div></div>
                                          <div className="flex items-center justify-end gap-2 shrink-0"><button onClick={() => copyToClipboard(file.url)} className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-lg"><Copy className="h-3 w-3" /></button><button onClick={() => handleFileDelete(file)} className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg"><Trash2 className="h-3 w-3" /></button></div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                      <div className="bg-white/80 p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm mb-6"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Açıklama / Notlar</span><p className="text-xs font-medium text-slate-700 leading-relaxed">{selectedOrder.description || "Bu sipariş için detaylı bir açıklama girilmemiş."}</p></div>
                      {!isEditing && (
                          <div className="flex flex-col sm:flex-row items-center gap-3 mt-auto pt-6 md:pt-8 w-full border-t border-slate-100">
                              {selectedOrder.status !== 'TAMAMLANDI' && (<Button onClick={() => markAsCompleted(selectedOrder.id)} className="w-full sm:flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-md"><CheckCircle className="mr-2 h-4 w-4" /> Teslim Alındı (Stoğa Gir)</Button>)}
                              <Button onClick={() => deleteOrder(selectedOrder.id)} variant="outline" className="w-full sm:w-14 h-12 rounded-xl border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-200"><Trash2 className="h-4 w-4 sm:mr-0" /> <span className="sm:hidden font-bold">SAS Fişini Sil</span></Button>
                          </div>
                      )}
                  </div>
              )}
          </div>
      </div>

      {/* 🚀 KUSURSUZ ZM METAL İSTEK FORMU GÖRÜNÜMÜ */}
      <Dialog open={isFormViewerOpen} onOpenChange={setIsFormViewerOpen}>
          <DialogContent className="w-[95vw] max-w-4xl p-0 border-none bg-white shadow-2xl flex flex-col h-[90vh] max-h-[90vh] z-[200] overflow-hidden print:w-full print:max-w-none print:h-auto print:max-h-none print:shadow-none print:block print:p-0 print:m-0">
              
              <style>{`
                  @media print {
                      @page { size: A4 portrait; margin: 10mm; }
                      body * { visibility: hidden !important; }
                      #printable-form, #printable-form * { visibility: visible !important; border-color: black !important; color: black !important; }
                      #printable-form { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; padding: 0 !important; zoom: 1.20 !important; }
                      .print\\:hidden, .print\\:hidden * { display: none !important; visibility: hidden !important; }
                  }
              `}</style>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 bg-slate-50 print:bg-white print:p-0 w-full">
                  <div className="bg-white text-black border-[3px] border-black w-full min-w-[700px] mx-auto shadow-sm print:shadow-none print:min-w-0" id="printable-form">
                      <table className="w-full border-collapse border border-black mb-4">
                          <tbody>
                              <tr>
                                  <td className="border border-black w-1/4 p-2 text-center align-middle"><Image src="/buvisan.png" alt="Buvisan Logo" width={150} height={50} className="mx-auto object-contain" /></td>
                                  <td className="border border-black w-2/4 text-center align-middle"><h2 className="text-xl font-bold tracking-widest text-slate-800 uppercase">MALZEME İSTEK FORMU</h2></td>
                                  <td className="border border-black w-1/4 p-0 align-top text-[11px]">
                                      <table className="w-full h-full border-collapse">
                                          <tbody>
                                              <tr><td className="border-b border-r border-black p-1.5 text-slate-700 font-bold bg-slate-50 print:bg-transparent">Doküman No</td><td className="border-b border-black p-1.5 font-bold text-blue-700 uppercase">DOC-{viewingOrderGroup?.request_no?.split('-')[1] || '001'}</td></tr>
                                              <tr><td className="border-b border-r border-black p-1.5 text-slate-700 font-bold bg-slate-50 print:bg-transparent">Yayın Tarihi</td><td className="border-b border-black p-1.5 font-bold text-slate-900">{viewingOrderGroup?.created_at ? new Date(viewingOrderGroup.created_at).toLocaleDateString('tr-TR') : ''}</td></tr>
                                              <tr><td className="border-b border-r border-black p-1.5 text-slate-700 font-bold bg-slate-50 print:bg-transparent">Revizyon No</td><td className="border-b border-black p-1.5 font-bold">00</td></tr>
                                              <tr><td className="border-r border-black p-1.5 text-slate-700 font-bold bg-slate-50 print:bg-transparent">Revizyon Tarihi</td><td className="p-1.5 font-bold">--</td></tr>
                                          </tbody>
                                      </table>
                                  </td>
                              </tr>
                          </tbody>
                      </table>

                      <table className="w-full border-collapse border border-black mb-4 text-[11px]">
                          <tbody>
                              <tr><td className="border border-black p-2 font-bold w-1/4 bg-slate-50 print:bg-transparent text-slate-700">Malzeme İstek Formu No</td><td className="border border-black p-2 w-1/4 font-black uppercase text-slate-900">{viewingOrderGroup?.request_no}</td><td className="border border-black p-2 font-bold w-1/4 bg-slate-50 print:bg-transparent text-slate-700">İstek Yapan Personel</td><td className="border border-black p-2 font-black w-1/4 uppercase text-slate-900">{viewingOrderGroup?.profiles?.first_name} {viewingOrderGroup?.profiles?.last_name}</td></tr>
                              <tr><td className="border border-black p-2 font-bold bg-slate-50 print:bg-transparent text-slate-700">Proje No</td><td className="border border-black p-2 font-black text-slate-900">{viewingOrderGroup?.project_code}</td><td className="border border-black p-2 font-bold bg-slate-50 print:bg-transparent text-slate-700">İstek Yapan Bölüm</td><td className="border border-black p-2 font-black uppercase text-slate-900">{viewingOrderGroup?.profiles?.department || "-"}</td></tr>
                              <tr><td className="border border-black p-2 font-bold bg-slate-50 print:bg-transparent text-slate-700">Tarih</td><td className="border border-black p-2 font-black text-slate-900">{viewingOrderGroup?.created_at ? new Date(viewingOrderGroup.created_at).toLocaleDateString('tr-TR') : ''}</td><td className="border border-black p-2 font-bold bg-slate-50 print:bg-transparent text-slate-700">Malzeme Cinsi</td><td className="border border-black p-2 font-black text-slate-900">{viewingOrderGroup?.material_type || viewingOrderGroup?.description || "-"}</td></tr>
                          </tbody>
                      </table>

                      <table className="w-full text-xs border-collapse border border-black">
                          <thead>
                              <tr className="bg-slate-50 print:bg-transparent text-slate-800"><th className="border border-black p-2 text-center w-12 font-bold">No</th><th className="border border-black p-2 text-left pl-3 font-bold">Ürün Tanımı</th><th className="border border-black p-2 text-center w-20 font-bold">Stok</th><th className="border border-black p-2 text-center w-28 font-bold">Miktar</th><th className="border border-black p-2 text-center w-32 font-bold">Termin</th></tr>
                          </thead>
                          <tbody>
                              {viewingOrderGroup?.items?.map((item: any, idx: number) => (
                                  <tr key={idx} className="h-8"><td className="border border-black p-2 text-center font-bold text-slate-800">{idx + 1}</td><td className="border border-black p-2 pl-3 font-black text-slate-900">{item.material_name}</td><td className="border border-black p-2 text-center font-bold text-slate-800">{item.current_stock || 0}</td><td className="border border-black p-2 text-center font-black text-sm text-slate-900">{item.quantity} ADET</td><td className="border border-black p-2 text-center"></td></tr>
                              ))}
                              {[...Array(Math.max(0, 10 - (viewingOrderGroup?.items?.length || 0)))].map((_, i) => (
                                  <tr key={`empty-${i}`} className="h-8"><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td></tr>
                              ))}
                          </tbody>
                      </table>
                      <div className="mt-4 pb-2 text-right text-[10px] text-slate-500 font-bold">Sayfa 1 / 1</div>
                  </div>
              </div>

              <div className="shrink-0 flex justify-end gap-3 p-4 border-t border-slate-200 bg-white print:hidden w-full">
                  <Button variant="outline" onClick={() => setIsFormViewerOpen(false)} className="font-bold border-slate-300 text-slate-600 hover:bg-slate-100 h-12 px-6">Kapat</Button>
                  <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg h-12 px-6"><Printer className="h-4 w-4 mr-2"/> Yazdır / PDF Olarak Kaydet</Button>
              </div>
          </DialogContent>
      </Dialog>

    </div>
  )
}