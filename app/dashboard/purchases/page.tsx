"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { 
  PlusCircle, Trash2, Edit2, PackageOpen, RefreshCcw, CheckCircle, Clock, 
  Search, FileText, X, AlertTriangle, User, CalendarDays, UploadCloud, FileCheck, Loader2, Copy, Inbox, Flame, Printer, Save
} from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

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

  const [isFormEditModalOpen, setIsFormEditModalOpen] = useState(false)
  const [editFormGroup, setEditFormGroup] = useState<any>(null)
  const [editFormItems, setEditFormItems] = useState<any[]>([])
  const [newItemForm, setNewItemForm] = useState({ material_name: "", current_stock: "0", quantity: "1" })
  const [isSavingForm, setIsSavingForm] = useState(false)

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

  const openFormEditor = (reqGroup: any) => {
      setEditFormGroup({ ...reqGroup })
      setEditFormItems(JSON.parse(JSON.stringify(reqGroup.items))) 
      setIsFormEditModalOpen(true)
  }

  const handleAddNewItemToForm = () => {
      if (!newItemForm.material_name.trim()) return alert("Lütfen malzeme adı giriniz!");
      if (Number(newItemForm.quantity) < 1) return alert("Miktar en az 1 olmalıdır!");
      
      const newItem = {
          isNew: true, 
          request_no: editFormGroup.request_no,
          project_code: editFormGroup.project_code,
          description: editFormGroup.material_type,
          material_name: newItemForm.material_name,
          current_stock: Number(newItemForm.current_stock),
          quantity: Number(newItemForm.quantity),
          priority: editFormGroup.priority,
          status: editFormGroup.status,
          requested_by: editFormGroup.requested_by
      };

      setEditFormItems([...editFormItems, newItem]);
      setNewItemForm({ material_name: "", current_stock: "0", quantity: "1" });
  }

  const handleRemoveItemFromForm = (index: number) => {
      const items = [...editFormItems];
      const itemToDelete = items[index];
      
      if (itemToDelete.id) {
          itemToDelete.isDeleted = true;
      } else {
          items.splice(index, 1);
      }
      setEditFormItems([...items]);
  }

  const handleSaveFormChanges = async () => {
      setIsSavingForm(true);
      try {
          await supabase.from('material_requests').update({
              project_code: editFormGroup.project_code,
              description: editFormGroup.material_type,
              priority: editFormGroup.priority
          }).eq('request_no', editFormGroup.request_no);

          for (const item of editFormItems) {
              if (item.isDeleted && item.id) {
                  await supabase.from('material_requests').delete().eq('id', item.id);
              } else if (item.isNew) {
                  delete item.isNew;
                  await supabase.from('material_requests').insert([item]);
              } else if (item.id) {
                  await supabase.from('material_requests').update({
                      material_name: item.material_name,
                      current_stock: Number(item.current_stock),
                      quantity: Number(item.quantity)
                  }).eq('id', item.id);
              }
          }

          alert("✅ Form başarıyla revize edildi!");
          setIsFormEditModalOpen(false);
          fetchRequests(); 
      } catch (error: any) {
          alert("Hata: " + error.message);
      } finally {
          setIsSavingForm(false);
      }
  }

  const handlePrint = () => {
      const printContent = document.getElementById('printable-form');
      if (!printContent) return;

      const originalVisibility: {el: Element, display: string}[] = [];
      Array.from(document.body.children).forEach((el) => {
          if (el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
              originalVisibility.push({ el, display: (el as HTMLElement).style.display });
              (el as HTMLElement).style.display = 'none';
          }
      });

      const printWrapper = document.createElement('div');
      printWrapper.id = 'print-wrapper';
      printWrapper.style.width = '100%';
      printWrapper.style.backgroundColor = 'white';
      printWrapper.innerHTML = printContent.outerHTML;

      const style = document.createElement('style');
      style.id = 'print-style';
      style.innerHTML = `
          @media print {
              @page { size: A4 portrait; margin: 10mm; }
              body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              #print-wrapper { display: block !important; zoom: 1.20 !important; }
          }
      `;

      document.head.appendChild(style);
      document.body.appendChild(printWrapper);

      window.print();

      document.body.removeChild(printWrapper);
      document.head.removeChild(style);
      originalVisibility.forEach(({ el, display }) => {
          (el as HTMLElement).style.display = display;
      });
  };

  const formatOrderNumber = (id: number) => `SAS${String(id).padStart(5, '0')}`;

  const getDeadlineStatus = (termin: string, status: string) => {
      if (status === 'TAMAMLANDI') return { text: "Teslim Alındı", classes: "bg-emerald-500 text-white shadow-emerald-500/30", icon: <CheckCircle className="h-3.5 w-3.5"/> }
      if (status === 'IPTAL') return { text: "İptal Edildi", classes: "bg-muted text-muted-foreground line-through", icon: <X className="h-3.5 w-3.5"/> }
      if (!termin) return { text: "Termin Bekleniyor", classes: "bg-muted text-foreground", icon: <Clock className="h-3.5 w-3.5"/> }
      const today = new Date(); today.setHours(0,0,0,0);
      const terminDate = new Date(termin); terminDate.setHours(0,0,0,0);
      const diffDays = Math.round((terminDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      if (diffDays < 0) return { text: `${Math.abs(diffDays)} GÜN GECİKTİ`, classes: "bg-destructive text-destructive-foreground shadow-destructive/40 animate-pulse", icon: <AlertTriangle className="h-3.5 w-3.5"/> }
      if (diffDays === 0) return { text: "BUGÜN TESLİM", classes: "bg-orange-500 text-white shadow-orange-500/40", icon: <AlertTriangle className="h-3.5 w-3.5"/> }
      if (diffDays <= 3) return { text: `${diffDays} Gün Kaldı`, classes: "bg-orange-400 text-white shadow-orange-400/30", icon: <Clock className="h-3.5 w-3.5"/> }
      return { text: `${diffDays} Gün Kaldı`, classes: "bg-primary text-primary-foreground shadow-primary/30", icon: <CalendarDays className="h-3.5 w-3.5"/> }
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
        <div><h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Satın Alma Kokpiti</h1><p className="text-xs md:text-sm text-muted-foreground mt-1 font-medium">Tedarikçi siparişlerini ve formları akıllı ekrandan yönetin.</p></div>
        <div className="flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-3 w-full xl:w-auto">
            <div className="relative w-full md:w-64 flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="SAS No veya Firma..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-12 md:h-14 bg-card/60 backdrop-blur-md border-border text-foreground text-xs md:text-sm focus:ring-2 focus:ring-primary shadow-sm rounded-xl md:rounded-2xl transition-all" /></div>
            <Button onClick={() => { fetchOrders(); fetchRequests(); }} variant="outline" className="h-12 w-12 md:h-14 md:w-14 p-0 bg-card/60 text-foreground border-border rounded-xl md:rounded-2xl shadow-sm hover:text-primary hover:bg-card transition-all shrink-0"><RefreshCcw className={`h-4 w-4 md:h-5 md:w-5 ${loading ? 'animate-spin text-primary' : ''}`} /></Button>
            <Link href="/dashboard/purchases/new" className="w-full sm:w-auto mt-2 sm:mt-0"><Button className="h-12 md:h-14 px-6 w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs md:text-sm font-bold rounded-xl md:rounded-2xl shadow-lg shadow-primary/30 transition-all flex items-center justify-center"><PlusCircle className="mr-2 h-4 w-4 md:h-5 md:w-5" /> Yeni SAS Fişi Aç</Button></Link>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 flex-1 min-h-0 w-full">
          <div className="w-full xl:w-6/12 flex flex-col gap-6 max-h-[800px] xl:max-h-full">
              
              <div className="flex flex-col bg-card/60 backdrop-blur-2xl border border-primary/20 shadow-lg shadow-primary/5 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shrink-0 transition-all">
                  <button onClick={() => setShowRequests(!showRequests)} className="flex items-center justify-between p-4 md:p-5 bg-primary/5 hover:bg-primary/10 cursor-pointer border-b border-primary/20">
                      <div className="flex items-center gap-3"><Inbox className="h-5 w-5 text-primary" /><h3 className="font-black text-foreground text-sm md:text-base">Mühendislik & Saha İstek Formları</h3>{requests.filter(r => r.status === 'BEKLIYOR').length > 0 && (<span className="bg-destructive text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">{requests.filter(r => r.status === 'BEKLIYOR').length} YENİ FORM</span>)}</div>
                      <span className="text-xs font-bold text-primary">{showRequests ? 'Gizle' : 'Göster'}</span>
                  </button>
                  
                  {showRequests && (
                      <div className="overflow-y-auto max-h-[350px] custom-scrollbar p-2 bg-card/40">
                          {requests.length === 0 ? (
                              <p className="text-center py-6 text-sm font-bold text-muted-foreground">Şu an bekleyen istek formu yok.</p>
                          ) : (
                              <div className="flex flex-col gap-3">
                                  {requests.map(reqGroup => {
                                      const isUrgent = reqGroup.priority === 'ACIL';

                                      return (
                                      <div key={reqGroup.request_no} className={`flex flex-col p-4 rounded-xl shadow-sm gap-3 border-2 transition-all ${isUrgent ? 'bg-destructive/5 border-destructive/30 shadow-destructive/10' : 'bg-card border-border hover:border-primary/50'}`}>
                                          <div className="flex items-center justify-between border-b border-border/50 pb-3">
                                              <div className="flex items-center gap-2">
                                                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded">{reqGroup.request_no}</span>
                                                  {isUrgent && <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded bg-destructive text-destructive-foreground animate-pulse shadow-sm"><Flame className="h-3 w-3" /> ACİL İSTEK</span>}
                                              </div>
                                              <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground"><User className="h-3 w-3" /> {reqGroup.profiles?.first_name} {reqGroup.profiles?.last_name}</div>
                                          </div>
                                          
                                          <div className="flex flex-col gap-2">
                                              <div className="flex items-center justify-between">
                                                  <span className="text-sm font-black text-foreground">{reqGroup.material_type || "Belirtilmedi"} <span className="text-xs font-medium text-muted-foreground">({reqGroup.items.length} Kalem)</span></span>
                                                  {reqGroup.status === 'BEKLIYOR' && (
                                                      <Button onClick={() => openFormEditor(reqGroup)} variant="outline" size="sm" className="h-8 text-[10px] font-bold text-primary border-primary/30 hover:bg-primary/10"><Edit2 className="h-3.5 w-3.5 mr-1" /> Formu Düzenle</Button>
                                                  )}
                                              </div>
                                              <Button onClick={() => openFormViewer(reqGroup)} className="w-full bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground transition-colors h-11 rounded-lg font-black text-xs shadow-sm mt-1 border border-primary/20">
                                                  <FileText className="h-4 w-4 mr-2" /> DİJİTAL SİPARİŞ FORMUNU GÖRÜNTÜLE
                                              </Button>
                                          </div>

                                          <div className="flex justify-between items-end mt-1">
                                              <div className="text-[10px] font-bold text-muted-foreground">Proje: {reqGroup.project_code || "Belirtilmedi"}</div>
                                              <div className="flex flex-col items-end gap-2">
                                                  {reqGroup.status === 'BEKLIYOR' && (
                                                      <div className="flex items-center gap-2">
                                                          <Button variant="ghost" size="sm" onClick={() => rejectRequest(reqGroup.request_no)} className="h-8 text-[10px] text-destructive hover:bg-destructive/10">Reddet</Button>
                                                          <Button size="sm" onClick={() => approveRequest(reqGroup.request_no)} className="h-8 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3">Siparişi Ver</Button>
                                                      </div>
                                                  )}
                                                  {reqGroup.status === 'SIPARIS_VERILDI' && <span className="text-[10px] font-black bg-primary/20 text-primary px-2 py-1 rounded uppercase tracking-widest">Siparişi Verildi (Onaylandı)</span>}
                                                  {reqGroup.status === 'REDDEDILDI' && <span className="text-[10px] font-black bg-muted text-muted-foreground px-2 py-1 rounded uppercase tracking-widest line-through">Reddedildi</span>}
                                              </div>
                                          </div>
                                      </div>
                                  )})}
                              </div>
                          )}
                      </div>
                  )}
              </div>

              <div className="flex flex-col bg-card/60 backdrop-blur-2xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden flex-1 min-h-0">
                  <div className="p-4 bg-muted/50 border-b border-border"><h3 className="font-black text-foreground text-sm">Resmi Satın Alma Fişleri (SAS)</h3></div>
                  <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
                      <table className="w-full text-left border-collapse min-w-[300px]">
                          <thead className="sticky top-0 bg-card/90 backdrop-blur-md z-10"><tr><th className="px-4 md:px-5 py-3 md:py-4 text-[9px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sipariş & Firma</th><th className="px-4 md:px-5 py-3 md:py-4 text-[9px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest">Durum</th></tr></thead>
                          <tbody className="divide-y divide-border/50">
                              {filteredOrders.map((order) => {
                                  const deadline = getDeadlineStatus(order.termin_tarihi, order.status);
                                  const isSelected = selectedOrder?.id === order.id;
                                  return (
                                  <tr key={order.id} onClick={() => handleRowClick(order)} className={`cursor-pointer transition-all duration-300 group ${isSelected ? 'bg-primary/10 shadow-inner' : 'hover:bg-muted/50'}`}>
                                      <td className="px-4 md:px-5 py-3 md:py-4 relative">
                                          {isSelected && <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-primary rounded-r-full shadow-sm"></div>}
                                          <div className="flex flex-col gap-0.5 md:gap-1 pl-1 md:pl-2"><span className={`font-mono text-[10px] md:text-xs font-bold ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>{formatOrderNumber(order.id)}</span><span className={`text-xs md:text-sm font-black truncate max-w-[150px] md:max-w-[200px] ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}>{order.suppliers?.name || "Genel Tedarikçi"}</span></div>
                                      </td>
                                      <td className="px-4 md:px-5 py-3 md:py-4"><div className={`inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[11px] font-bold shadow-sm ${deadline.classes}`}>{deadline.icon} <span className="truncate">{deadline.text}</span></div></td>
                                  </tr>
                              )})}
                              {filteredOrders.length === 0 && !loading && (<tr><td colSpan={2} className="px-6 py-16 text-center text-muted-foreground"><p className="text-xs font-bold">SAS Fişi bulunamadı.</p></td></tr>)}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>

          <div id="order-detail-section" className="w-full xl:w-6/12 flex flex-col bg-card/60 backdrop-blur-2xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden relative">
              {!selectedOrder ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 md:p-10 opacity-60"><div className="bg-card p-4 md:p-6 rounded-full shadow-sm mb-4"><PackageOpen className="h-10 w-10 text-primary" /></div><h3 className="text-lg md:text-xl font-black text-foreground">SAS Detayları</h3><p className="text-xs md:text-sm font-medium text-muted-foreground mt-2 max-w-[200px]">Tüm detayları görmek için listeden bir SAS seçin.</p></div>
              ) : (
                  <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-5 md:p-6 lg:p-8">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 md:mb-8 border-b border-border pb-5 md:pb-6 gap-4">
                          <div className="flex flex-col gap-1"><span className="text-primary font-mono font-bold text-xs md:text-sm bg-primary/10 w-max px-2 py-0.5 rounded">{formatOrderNumber(selectedOrder.id)}</span><h2 className="text-xl md:text-2xl font-black text-foreground leading-tight mt-1">{selectedOrder.suppliers?.name || "Genel Tedarikçi"}</h2></div>
                      </div>
                      <div className="bg-muted/50 p-4 md:p-5 rounded-[1.5rem] md:rounded-3xl border border-border shadow-sm mb-6 md:mb-8">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                              <h3 className="font-black text-sm md:text-base text-foreground flex items-center gap-2"><FileCheck className="h-4 w-4 md:h-5 md:w-5 text-primary" /> Ekli Belgeler</h3>
                              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"/>
                              <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="h-10 md:h-9 px-4 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold shadow-sm transition-all text-xs border border-primary/20">{uploading ? "Yükleniyor..." : "Dosya Yükle"}</Button>
                          </div>
                          <div className="flex flex-col gap-3">
                              {(!selectedOrder.attachments || selectedOrder.attachments.length === 0) ? (
                                  <div className="text-center p-5 border-2 border-dashed border-border rounded-2xl bg-card/50"><p className="text-[10px] font-bold text-muted-foreground">Bu fişe belge eklenmemiş.</p></div>
                              ) : (
                                  selectedOrder.attachments.map((file: any, index: number) => (
                                      <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-all">
                                          <div className="flex items-center gap-3 overflow-hidden"><div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500 shrink-0"><FileText className="h-4 w-4" /></div><div className="flex flex-col truncate w-full"><a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-foreground hover:text-primary truncate">{file.name}</a><span className="text-[9px] text-muted-foreground font-medium">{new Date(file.date).toLocaleDateString('tr-TR')}</span></div></div>
                                          <div className="flex items-center justify-end gap-2 shrink-0"><button onClick={() => copyToClipboard(file.url)} className="p-2 bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-lg"><Copy className="h-3 w-3" /></button><button onClick={() => handleFileDelete(file)} className="p-2 bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg"><Trash2 className="h-3 w-3" /></button></div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                      <div className="bg-card p-4 md:p-5 rounded-2xl border border-border shadow-sm mb-6"><span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Açıklama / Notlar</span><p className="text-xs font-medium text-foreground/80 leading-relaxed">{selectedOrder.description || "Bu sipariş için detaylı bir açıklama girilmemiş."}</p></div>
                      {!isEditing && (
                          <div className="flex flex-col sm:flex-row items-center gap-3 mt-auto pt-6 md:pt-8 w-full border-t border-border">
                              {selectedOrder.status !== 'TAMAMLANDI' && (<Button onClick={() => markAsCompleted(selectedOrder.id)} className="w-full sm:flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-md"><CheckCircle className="mr-2 h-4 w-4" /> Teslim Alındı (Stoğa Gir)</Button>)}
                              <Button onClick={() => deleteOrder(selectedOrder.id)} variant="outline" className="w-full sm:w-14 h-12 rounded-xl border-border text-destructive hover:bg-destructive/10 hover:border-destructive/30"><Trash2 className="h-4 w-4 sm:mr-0" /> <span className="sm:hidden font-bold">SAS Fişini Sil</span></Button>
                          </div>
                      )}
                  </div>
              )}
          </div>
      </div>

      {/* 🚀 YENİ: FORM DÜZENLEME (REVİZE) MODALI */}
      <Dialog open={isFormEditModalOpen} onOpenChange={setIsFormEditModalOpen}>
          <DialogContent className="rounded-[2rem] p-6 max-w-4xl border-none bg-card shadow-2xl flex flex-col max-h-[90vh] print:hidden">
              <DialogHeader className="shrink-0 mb-4">
                  <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2"><Edit2 className="h-5 w-5 text-primary"/> Formu Revize Et (Düzenle)</DialogTitle>
                  <p className="text-xs font-bold text-muted-foreground mt-1">Burada yaptığınız değişiklikler siparişin orijinalini günceller ve her yerde görünür.</p>
              </DialogHeader>

              {editFormGroup && (
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-6">
                      <div className="bg-primary/5 border border-primary/20 rounded-[1.5rem] p-4 flex flex-col gap-4">
                          <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-2"><Label className="text-[10px] font-bold text-primary uppercase tracking-widest">Proje No</Label><Input value={editFormGroup.project_code} onChange={e=>setEditFormGroup({...editFormGroup, project_code: e.target.value})} className="font-bold border-primary/30 focus:ring-primary h-11 bg-background text-foreground" /></div>
                              <div className="space-y-2"><Label className="text-[10px] font-bold text-primary uppercase tracking-widest">Malzeme Cinsi</Label><Input value={editFormGroup.material_type} onChange={e=>setEditFormGroup({...editFormGroup, material_type: e.target.value})} className="font-bold border-primary/30 focus:ring-primary h-11 bg-background text-foreground" /></div>
                              <div className="space-y-2"><Label className="text-[10px] font-bold text-primary uppercase tracking-widest">Öncelik</Label>
                                  <select value={editFormGroup.priority} onChange={e => setEditFormGroup({...editFormGroup, priority: e.target.value})} className="w-full h-11 px-3 rounded-xl bg-background border border-primary/30 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary">
                                      <option value="NORMAL">Normal</option>
                                      <option value="ACIL">ACİL</option>
                                  </select>
                              </div>
                          </div>
                      </div>

                      <div className="bg-muted border border-border rounded-[1.5rem] p-4 flex flex-col gap-4">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-[-5px]">Forma Yeni Kalem Ekle</Label>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                              <div className="space-y-1 col-span-2 md:col-span-3"><Input placeholder="Ürün Tanımı" value={newItemForm.material_name} onChange={e=>setNewItemForm({...newItemForm, material_name: e.target.value})} className="font-bold border-border h-11 bg-background text-foreground" /></div>
                              <div className="space-y-1 col-span-1"><Input type="number" placeholder="Stok" value={newItemForm.current_stock} onChange={e=>setNewItemForm({...newItemForm, current_stock: e.target.value})} className="font-bold border-border h-11 bg-background text-foreground" /></div>
                              <div className="space-y-1 col-span-1"><Input type="number" placeholder="Miktar" min="1" value={newItemForm.quantity} onChange={e=>setNewItemForm({...newItemForm, quantity: e.target.value})} className="font-black text-primary border-border h-11 bg-background" /></div>
                          </div>
                          <Button type="button" onClick={handleAddNewItemToForm} className="w-full h-10 bg-foreground hover:bg-foreground/90 text-background font-bold text-xs rounded-xl"><PlusCircle className="h-4 w-4 mr-2" /> BU SATIRI FORMA EKLE</Button>
                      </div>

                      <div className="border border-border rounded-2xl overflow-hidden">
                          <table className="w-full text-left text-xs md:text-sm">
                              <thead className="bg-muted/80 border-b border-border text-muted-foreground font-bold"><tr><th className="px-3 py-3">Ürün Tanımı</th><th className="px-3 py-3 text-center w-20">Stok</th><th className="px-3 py-3 text-center w-24">Miktar</th><th className="px-3 py-3 text-right w-16">İşlem</th></tr></thead>
                              <tbody className="divide-y divide-border">
                                  {editFormItems.map((item, index) => {
                                      if (item.isDeleted) return null; 
                                      return (
                                      <tr key={index} className={`bg-background hover:bg-muted/50 ${item.isNew ? 'bg-emerald-500/10' : ''}`}>
                                          <td className="px-3 py-2">
                                              <Input value={item.material_name} onChange={e => { const items = [...editFormItems]; items[index].material_name = e.target.value; setEditFormItems(items); }} className="h-9 font-bold text-foreground border-transparent hover:border-border focus:border-primary bg-transparent" />
                                          </td>
                                          <td className="px-1 py-2">
                                              <Input type="number" value={item.current_stock} onChange={e => { const items = [...editFormItems]; items[index].current_stock = e.target.value; setEditFormItems(items); }} className="h-9 text-center font-medium text-muted-foreground border-transparent hover:border-border focus:border-primary bg-transparent px-1" />
                                          </td>
                                          <td className="px-1 py-2">
                                              <Input type="number" min="1" value={item.quantity} onChange={e => { const items = [...editFormItems]; items[index].quantity = e.target.value; setEditFormItems(items); }} className="h-9 text-center font-black text-primary border-transparent hover:border-border focus:border-primary bg-transparent px-1" />
                                          </td>
                                          <td className="px-3 py-2 text-right">
                                              <button onClick={() => handleRemoveItemFromForm(index)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                                          </td>
                                      </tr>
                                  )})}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}
              <div className="shrink-0 pt-4 mt-2 border-t border-border flex gap-3">
                  <Button variant="outline" onClick={() => setIsFormEditModalOpen(false)} className="h-14 px-6 rounded-xl font-bold border-border text-foreground hover:bg-muted">Vazgeç</Button>
                  <Button onClick={handleSaveFormChanges} disabled={isSavingForm} className="flex-1 h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-base rounded-xl shadow-xl shadow-primary/20">
                      {isSavingForm ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Save className="h-5 w-5 mr-2" />} DEĞİŞİKLİKLERİ KAYDET
                  </Button>
              </div>
          </DialogContent>
      </Dialog>

      {/* KUSURSUZ ZM METAL FORMU (SABİT BEYAZ KAĞIT TASARIMI - TEMADAN ETKİLENMEZ) */}
      <Dialog open={isFormViewerOpen} onOpenChange={setIsFormViewerOpen}>
          <DialogContent className="w-[95vw] max-w-4xl p-0 border-none bg-muted shadow-2xl flex flex-col h-[90vh] max-h-[90vh] z-[200] overflow-hidden print:w-full print:max-w-none print:h-auto print:max-h-none print:shadow-none print:block print:p-0 print:m-0 print:bg-white">
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 print:bg-white print:p-0 w-full">
                  {/* DİKKAT: BURASI GERÇEK BİR KAĞIT OLDUĞU İÇİN TEMADAN ETKİLENMEMESİ GEREKİR. BEYAZ VE SİYAH KODLAR KORUNDU */}
                  <div className="bg-white text-black border-[3px] border-black w-full min-w-[700px] mx-auto shadow-sm print:shadow-none print:min-w-0" id="printable-form">
                      <table className="w-full border-collapse border border-black mb-4">
                          <tbody>
                              <tr>
                                  <td className="border border-black w-1/4 p-2 text-center align-middle">
                                      <Image src="/buvisan.png" alt="Buvisan Logo" width={150} height={50} className="mx-auto object-contain brightness-0" />
                                  </td>
                                  <td className="border border-black w-2/4 text-center align-middle">
                                      <h2 className="text-xl font-bold tracking-widest text-[#1e293b] uppercase">MALZEME İSTEK FORMU</h2>
                                  </td>
                                  <td className="border border-black w-1/4 p-0 align-top text-[11px]">
                                      <table className="w-full h-full border-collapse">
                                          <tbody>
                                              <tr>
                                                  <td className="border-b border-r border-black p-1.5 text-[#334155] font-bold bg-[#f8fafc]">Doküman No</td>
                                                  <td className="border-b border-black p-1.5 font-bold text-black uppercase">DOC-{viewingOrderGroup?.request_no?.replace(/\D/g, '') || '001'}</td>
                                              </tr>
                                              <tr>
                                                  <td className="border-b border-r border-black p-1.5 text-[#334155] font-bold bg-[#f8fafc]">Yayın Tarihi</td>
                                                  <td className="border-b border-black p-1.5 font-bold text-black">{viewingOrderGroup?.created_at ? new Date(viewingOrderGroup.created_at).toLocaleDateString('tr-TR') : '13.12.2017'}</td>
                                              </tr>
                                              <tr>
                                                  <td className="border-b border-r border-black p-1.5 text-[#334155] font-bold bg-[#f8fafc]">Revizyon No</td>
                                                  <td className="border-b border-black p-1.5 font-bold text-black">00</td>
                                              </tr>
                                              <tr>
                                                  <td className="border-r border-black p-1.5 text-[#334155] font-bold bg-[#f8fafc]">Revizyon Tarihi</td>
                                                  <td className="p-1.5 font-bold text-black">--</td>
                                              </tr>
                                          </tbody>
                                      </table>
                                  </td>
                              </tr>
                          </tbody>
                      </table>

                      <table className="w-full border-collapse border border-black mb-4 text-[11px]">
                          <tbody>
                              <tr>
                                  <td className="border border-black p-2 font-bold w-1/4 bg-[#f8fafc] text-[#334155]">Malzeme İstek Formu No</td>
                                  <td className="border border-black p-2 w-1/4 font-black uppercase text-black">{viewingOrderGroup?.request_no}</td>
                                  <td className="border border-black p-2 font-bold w-1/4 bg-[#f8fafc] text-[#334155]">İstek Yapan Personel</td>
                                  <td className="border border-black p-2 font-black w-1/4 uppercase text-black">{viewingOrderGroup?.profiles?.first_name} {viewingOrderGroup?.profiles?.last_name}</td>
                              </tr>
                              <tr>
                                  <td className="border border-black p-2 font-bold bg-[#f8fafc] text-[#334155]">Proje No</td>
                                  <td className="border border-black p-2 font-black text-black">{viewingOrderGroup?.project_code}</td>
                                  <td className="border border-black p-2 font-bold bg-[#f8fafc] text-[#334155]">İstek Yapan Bölüm</td>
                                  <td className="border border-black p-2 font-black uppercase text-black">{viewingOrderGroup?.profiles?.department || "-"}</td>
                              </tr>
                              <tr>
                                  <td className="border border-black p-2 font-bold bg-[#f8fafc] text-[#334155]">Tarih</td>
                                  <td className="border border-black p-2 font-black text-black">{viewingOrderGroup?.created_at ? new Date(viewingOrderGroup.created_at).toLocaleDateString('tr-TR') : ''}</td>
                                  <td className="border border-black p-2 font-bold bg-[#f8fafc] text-[#334155]">Malzeme Cinsi</td>
                                  <td className="border border-black p-2 font-black text-black">{viewingOrderGroup?.material_type || viewingOrderGroup?.description || "-"}</td>
                              </tr>
                          </tbody>
                      </table>

                      <table className="w-full text-xs border-collapse border border-black">
                          <thead>
                              <tr className="bg-[#f8fafc] text-[#1e293b]">
                                  <th className="border border-black p-2 text-center w-12 font-bold">No</th>
                                  <th className="border border-black p-2 text-left pl-3 font-bold">Ürün Tanımı</th>
                                  <th className="border border-black p-2 text-center w-20 font-bold">Stok</th>
                                  <th className="border border-black p-2 text-center w-28 font-bold">Miktar</th>
                                  <th className="border border-black p-2 text-center w-32 font-bold">Termin</th>
                              </tr>
                          </thead>
                          <tbody>
                              {viewingOrderGroup?.items?.map((item: any, idx: number) => (
                                  <tr key={idx} className="h-8">
                                      <td className="border border-black p-2 text-center font-bold text-[#1e293b]">{idx + 1}</td>
                                      <td className="border border-black p-2 pl-3 font-black text-black">{item.material_name}</td>
                                      <td className="border border-black p-2 text-center font-bold text-[#1e293b]">{item.current_stock || 0}</td>
                                      <td className="border border-black p-2 text-center font-black text-sm text-black">{item.quantity} ADET</td>
                                      <td className="border border-black p-2 text-center"></td>
                                  </tr>
                              ))}
                              {/* Boş Satırlar */}
                              {[...Array(Math.max(0, 10 - (viewingOrderGroup?.items?.length || 0)))].map((_, i) => (
                                  <tr key={`empty-${i}`} className="h-8">
                                      <td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                      
                      <div className="mt-4 pb-2 text-right text-[10px] text-[#64748b] font-bold">Sayfa 1 / 1</div>
                  </div>
              </div>

              {/* SABİT BUTON ALANI */}
              <div className="shrink-0 flex justify-end gap-3 p-4 border-t border-border bg-card w-full print:hidden">
                  <Button variant="outline" onClick={() => setIsFormViewerOpen(false)} className="font-bold border-border text-foreground hover:bg-muted h-12 px-6">Kapat</Button>
                  <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-lg h-12 px-6"><Printer className="h-4 w-4 mr-2"/> Yazdır / PDF Olarak İndir</Button>
              </div>
          </DialogContent>
      </Dialog>

    </div>
  )
}