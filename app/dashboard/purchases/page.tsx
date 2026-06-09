"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { 
  PlusCircle, Trash2, Edit2, PackageOpen, RefreshCcw, CheckCircle, Clock, 
  Search, FileText, X, AlertTriangle, User, CalendarDays, Loader2, Copy, Inbox, Flame, Printer, Save, Send, Volume2, VolumeX, Filter, CheckCircle2, ChevronDown, ChevronRight, ShoppingCart, History, FileBadge
} from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function PurchasesPage() {
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const supabase = createClient()

  // ANA SEKMELER: KOKPIT | GECMIS | FORMLAR
  const [activeMainTab, setActiveMainTab] = useState<'KOKPIT' | 'GECMIS' | 'FORMLAR'>('KOKPIT')

  const [requests, setRequests] = useState<any[]>([])
  const [showRequests, setShowRequests] = useState(true)
  
  // SAĞ PANEL SEKMELERİ
  const [rightPanelTab, setRightPanelTab] = useState<'VERENLER' | 'ALANLAR'>('VERENLER')
  const [personFilter, setPersonFilter] = useState("")
  const [dateFilter, setDateFilter] = useState("")

  const [isFormViewerOpen, setIsFormViewerOpen] = useState(false)
  const [viewingOrderGroup, setViewingOrderGroup] = useState<any>(null)
  const [isOrderFormMode, setIsOrderFormMode] = useState(false) // Malzeme İstek -> Sipariş Formu geçişi

  const [isFormEditModalOpen, setIsFormEditModalOpen] = useState(false)
  const [editFormGroup, setEditFormGroup] = useState<any>(null)
  const [editFormItems, setEditFormItems] = useState<any[]>([])
  const [newItemForm, setNewItemForm] = useState({ material_name: "", current_stock: "0", quantity: "1", unit: "ADET" })
  const [isSavingForm, setIsSavingForm] = useState(false)

  // SATIN ALMA GİRİŞ MODALI
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [purchaseGroup, setPurchaseGroup] = useState<any>(null)
  const [purchaseData, setPurchaseData] = useState<any>({}) // item.id -> { supplier, price, currency, leadTime }

  const [soundEnabled, setSoundEnabled] = useState(true)
  const [filterAlarm, setFilterAlarm] = useState(false)

  // Geçmiş Satın Alınanlar Filtreleri
  const [historySearch, setHistorySearch] = useState("")
  const [historySupplierFilter, setHistorySupplierFilter] = useState("")
  const [historyDateFilter, setHistoryDateFilter] = useState("")
  
  // EKLENEN: Sipariş Formları Arama State'i
  const [orderFormSearch, setOrderFormSearch] = useState("")

  useEffect(() => { 
      fetchRequests(); 

      const channel = supabase.channel('realtime-alarm-channel')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'material_requests' }, (payload) => {
          if (payload.new.status === 'GELMEDI_ALARM') {
              if(soundEnabled) {
                  const audio = new Audio('/alarm.mp3');
                  audio.play().catch(e => console.log("Otomatik ses engellendi."));
              }
              alert(`🚨 DİKKAT! ${payload.new.request_no} numaralı formdaki malzemeler GELMEDİ! Saha Personeli Alarm Tetikledi!`);
              fetchRequests();
          } else if (payload.new.status === 'GELDI') {
              fetchRequests();
          }
        }).subscribe()

      return () => { supabase.removeChannel(channel) }
  }, [soundEnabled])

  const fetchRequests = async () => {
      setLoading(true)
      try {
          const { data, error } = await supabase.from('material_requests').select(`*, profiles ( first_name, last_name, department )`).order('created_at', { ascending: false })
          if (error) throw error;
          if (data) {
              const grouped = data.reduce((acc: any, req: any) => {
                  if (!acc[req.request_no]) {
                      acc[req.request_no] = { 
                        request_no: req.request_no, project_code: req.project_code, material_type: req.description, 
                        status: req.status, created_at: req.created_at, requested_by: req.requested_by, profiles: req.profiles, 
                        priority: req.priority, expected_date: req.expected_date, 
                        supplier_name: req.supplier_name, is_order_form_created: req.is_order_form_created,
                        items: [req] 
                      }
                  } else {
                      acc[req.request_no].items.push(req)
                      if (req.priority === 'ACIL') acc[req.request_no].priority = 'ACIL' 
                      if (req.status === 'GELMEDI_ALARM') acc[req.request_no].status = 'GELMEDI_ALARM'
                      if (req.status === 'BEKLIYOR') acc[req.request_no].status = 'BEKLIYOR'
                      if (req.is_order_form_created) acc[req.request_no].is_order_form_created = true // EKLENDİ: Grup form durumunu korusun
                  }
                  return acc
              }, {})

              const sortedGroups = Object.values(grouped).sort((a: any, b: any) => {
                  if (a.status === 'GELDI' && b.status !== 'GELDI') return 1;
                  if (a.status !== 'GELDI' && b.status === 'GELDI') return -1;
                  if (a.status === 'GELMEDI_ALARM' && b.status !== 'GELMEDI_ALARM') return -1;
                  if (a.status !== 'GELMEDI_ALARM' && b.status === 'GELMEDI_ALARM') return 1;
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              });
              setRequests(sortedGroups)
          }
      } catch (error: any) { console.error("İstek Çekme Hatası:", error); }
      finally { setLoading(false) }
  }

  const openPurchaseModal = (reqGroup: any) => {
      setPurchaseGroup(reqGroup);
      const initialData: any = {};
      reqGroup.items.forEach((item: any) => {
          initialData[item.id] = {
              supplier: item.supplier_name || "",
              price: item.price || "",
              currency: item.currency || "TL",
              leadTime: item.expected_date || ""
          }
      });
      setPurchaseData(initialData);
      setIsPurchaseModalOpen(true);
  }

  const handlePurchaseItemChange = (itemId: string, field: string, value: string) => {
      setPurchaseData((prev: any) => ({
          ...prev,
          [itemId]: { ...prev[itemId], [field]: value }
      }));
  }

  const submitPurchaseData = async () => {
      setIsSavingForm(true);
      try {
          for (const item of purchaseGroup.items) {
              const data = purchaseData[item.id];
              if(!data.supplier || !data.price || !data.leadTime) {
                  alert(`Lütfen "${item.material_name}" için tüm satın alma alanlarını doldurun!`);
                  setIsSavingForm(false);
                  return;
              }
              
              const expectedDate = new Date(data.leadTime);
              const today = new Date();
              today.setHours(0,0,0,0); expectedDate.setHours(0,0,0,0);
              const diffDays = Math.ceil((expectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

              await supabase.from('material_requests').update({ 
                  supplier_name: data.supplier,
                  price: parseFloat(data.price),
                  currency: data.currency,
                  expected_date: data.leadTime,
                  lead_time_days: diffDays,
                  status: purchaseGroup.status === 'GELMEDI_ALARM' ? 'SIPARIS_VERILDI' : 'TERMIN_GIRILDI',
                  is_order_form_created: true // DÜZELTME: Artık siparişi kaydederken formu oluşturulmuş sayıyor.
              }).eq('id', item.id);
          }
          alert("Satın alma verileri başarıyla işlendi ve onaya sunuldu!");
          setIsPurchaseModalOpen(false);
          fetchRequests();
      } catch (error: any) { alert("Hata: " + error.message); }
      finally { setIsSavingForm(false); }
  }

  const rejectRequest = async (requestNo: string) => {
      if(!confirm("Bu sipariş formunu tamamen reddetmek istediğinize emin misiniz?")) return;
      await supabase.from('material_requests').update({ status: 'REDDEDILDI' }).eq('request_no', requestNo)
      fetchRequests()
  }

  const openFormViewer = (reqGroup: any, forceOrderMode = false) => { 
      setViewingOrderGroup(reqGroup); 
      setIsOrderFormMode(forceOrderMode);
      setIsFormViewerOpen(true); 
  }

  const openFormEditor = (reqGroup: any) => {
      setEditFormGroup({ ...reqGroup })
      setEditFormItems(JSON.parse(JSON.stringify(reqGroup.items))) 
      setIsFormEditModalOpen(true)
  }

  const handleAddNewItemToForm = () => {
      if (!newItemForm.material_name.trim()) return alert("Lütfen malzeme adı giriniz!");
      if (Number(newItemForm.quantity) < 1) return alert("Miktar en az 1 olmalıdır!");
      const newItem = { isNew: true, request_no: editFormGroup.request_no, project_code: editFormGroup.project_code, description: editFormGroup.material_type, material_name: newItemForm.material_name, current_stock: Number(newItemForm.current_stock), quantity: Number(newItemForm.quantity), unit: newItemForm.unit, priority: editFormGroup.priority, status: editFormGroup.status, requested_by: editFormGroup.requested_by };
      setEditFormItems([...editFormItems, newItem]); setNewItemForm({ material_name: "", current_stock: "0", quantity: "1", unit: "ADET" });
  }

  const handleRemoveItemFromForm = (index: number) => {
      const items = [...editFormItems]; const itemToDelete = items[index];
      if (itemToDelete.id) itemToDelete.isDeleted = true; else items.splice(index, 1);
      setEditFormItems([...items]);
  }

  const handleSaveFormChanges = async () => {
      setIsSavingForm(true);
      try {
          await supabase.from('material_requests').update({ project_code: editFormGroup.project_code, description: editFormGroup.material_type, priority: editFormGroup.priority }).eq('request_no', editFormGroup.request_no);
          for (const item of editFormItems) {
              if (item.isDeleted && item.id) await supabase.from('material_requests').delete().eq('id', item.id);
              else if (item.isNew) { delete item.isNew; await supabase.from('material_requests').insert([item]); } 
              else if (item.id) { await supabase.from('material_requests').update({ material_name: item.material_name, current_stock: Number(item.current_stock), quantity: Number(item.quantity), unit: item.unit }).eq('id', item.id); }
          }
          alert("✅ Form başarıyla revize edildi!"); setIsFormEditModalOpen(false); fetchRequests(); 
      } catch (error: any) { alert("Hata: " + error.message); } finally { setIsSavingForm(false); }
  }

  const handlePrint = async () => {
      const originalTitle = document.title;
      
      if (isOrderFormMode) {
          let currentCount = parseInt(localStorage.getItem('siparisFormCount') || '0');
          currentCount += 1;
          localStorage.setItem('siparisFormCount', currentCount.toString());
          
          const formattedCount = String(currentCount).padStart(3, '0');
          document.title = `siparis-formu-${formattedCount}`;

          if(viewingOrderGroup && !viewingOrderGroup.is_order_form_created) {
              await supabase.from('material_requests').update({ is_order_form_created: true }).eq('request_no', viewingOrderGroup.request_no);
              fetchRequests();
          }
      }

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
      printWrapper.id = 'print-wrapper'; printWrapper.style.width = '100%'; printWrapper.style.backgroundColor = 'white';
      printWrapper.innerHTML = printContent.outerHTML;
      const style = document.createElement('style'); style.id = 'print-style';
      style.innerHTML = `@media print { @page { size: A4 portrait; margin: 10mm; } body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } #print-wrapper { display: block !important; zoom: 1.20 !important; } }`;
      document.head.appendChild(style); document.body.appendChild(printWrapper);
      
      window.print();
      
      document.body.removeChild(printWrapper); document.head.removeChild(style);
      originalVisibility.forEach(({ el, display }) => { (el as HTMLElement).style.display = display; });
      document.title = originalTitle; 
  };

  const filteredRequests = filterAlarm ? requests.filter(r => r.status === 'GELMEDI_ALARM') : requests;
  
  const uniquePersons = Array.from(new Set(requests.map(r => `${r.profiles?.first_name} ${r.profiles?.last_name}`)));
  
  const rightPanelData = requests.filter(r => {
      const statusMatch = rightPanelTab === 'VERENLER' ? r.status !== 'GELDI' : r.status === 'GELDI';
      const personMatch = personFilter ? `${r.profiles?.first_name} ${r.profiles?.last_name}` === personFilter : true;
      const dateMatch = dateFilter ? r.created_at?.startsWith(dateFilter) : true;
      return statusMatch && personMatch && dateMatch;
  });

  const historyData = requests.filter(r => 
      ['TERMIN_GIRILDI', 'SIPARIS_VERILDI', 'GELDI'].includes(r.status)
  ).flatMap(r => r.items).filter(item => {
      const searchMatch = historySearch === "" || item.material_name.toLowerCase().includes(historySearch.toLowerCase());
      const supplierMatch = historySupplierFilter === "" || (item.supplier_name && item.supplier_name.toLowerCase().includes(historySupplierFilter.toLowerCase()));
      const dateMatch = historyDateFilter === "" || (item.expected_date && item.expected_date.startsWith(historyDateFilter));
      return searchMatch && supplierMatch && dateMatch;
  });

  // DÜZELTME: Arama state'i eklendi, mantık güncellendi
  const orderFormsArchive = requests.filter(r => 
      (r.is_order_form_created || r.status !== 'BEKLIYOR') && 
      (orderFormSearch === "" || r.request_no.toLowerCase().includes(orderFormSearch.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-6 font-sans xl:h-[calc(100vh-100px)] w-full pb-10 xl:pb-0 overflow-hidden transition-colors">
      
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 shrink-0">
        <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Satın Alma Kokpiti</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 font-medium">Tüm satın alma operasyonlarını tek ekrandan yönetin.</p>
        </div>
        
        <div className="flex bg-muted/50 p-1.5 rounded-2xl w-full xl:w-auto overflow-x-auto custom-scrollbar">
            <button onClick={() => setActiveMainTab('KOKPIT')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeMainTab === 'KOKPIT' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                <ShoppingCart className="h-4 w-4" /> İşlem Kokpiti
            </button>
            <button onClick={() => setActiveMainTab('GECMIS')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeMainTab === 'GECMIS' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                <History className="h-4 w-4" /> Geçmiş Satın Almalar
            </button>
            <button onClick={() => setActiveMainTab('FORMLAR')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeMainTab === 'FORMLAR' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                <FileBadge className="h-4 w-4" /> Sipariş Formları
            </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={() => setSoundEnabled(!soundEnabled)} className="h-12 md:h-14 px-4 bg-card/60 text-foreground border-border rounded-xl md:rounded-2xl shadow-sm hover:text-primary transition-all">
                {soundEnabled ? <Volume2 className="h-5 w-5 text-emerald-500" /> : <VolumeX className="h-5 w-5 text-rose-500" />}
            </Button>
            <Button onClick={fetchRequests} variant="outline" className="h-12 w-12 md:h-14 md:w-14 p-0 bg-card/60 text-foreground border-border rounded-xl md:rounded-2xl shadow-sm hover:text-primary transition-all">
                <RefreshCcw className={`h-4 w-4 md:h-5 md:w-5 ${loading ? 'animate-spin text-primary' : ''}`} />
            </Button>
        </div>
      </div>

      {activeMainTab === 'KOKPIT' && (
      <div className="flex flex-col xl:flex-row gap-6 flex-1 min-h-0 w-full">
          <div className="w-full xl:w-6/12 flex flex-col bg-card/60 backdrop-blur-2xl border border-primary/20 shadow-lg shadow-primary/5 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shrink-0 transition-all max-h-[800px] xl:max-h-full">
              <div className="flex flex-col border-b border-primary/20 bg-primary/5">
                  <button onClick={() => setShowRequests(!showRequests)} className="flex items-center justify-between p-4 md:p-5 hover:bg-primary/10 cursor-pointer">
                      <div className="flex items-center gap-3"><Inbox className="h-5 w-5 text-primary" /><h3 className="font-black text-foreground text-sm md:text-base">Saha İstek Formları & Onaylar</h3>{requests.filter(r => (r.status || 'BEKLIYOR') === 'BEKLIYOR').length > 0 && (<span className="bg-destructive text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">{requests.filter(r => (r.status || 'BEKLIYOR') === 'BEKLIYOR').length} YENİ</span>)}</div>
                      <span className="text-xs font-bold text-primary">{showRequests ? 'Gizle' : 'Göster'}</span>
                  </button>
                  
                  {showRequests && requests.some(r => r.status === 'GELMEDI_ALARM') && (
                      <div className="px-4 pb-4">
                          <Button onClick={() => setFilterAlarm(!filterAlarm)} className={`w-full font-bold text-xs h-9 ${filterAlarm ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-600 hover:bg-rose-200'}`}>
                              <Filter className="h-3.5 w-3.5 mr-2" /> {filterAlarm ? "TÜM FORMLARI GÖSTER" : "SADECE ALARMLI (GELMEYEN) FORMLARI GÖSTER"}
                          </Button>
                      </div>
                  )}
              </div>
              
              {showRequests && (
                  <div className="overflow-y-auto flex-1 custom-scrollbar p-3 bg-card/40">
                      {filteredRequests.length === 0 ? (
                          <p className="text-center py-6 text-sm font-bold text-muted-foreground">Şu an gösterilecek form yok.</p>
                      ) : (
                          <div className="flex flex-col gap-4">
                              {filteredRequests.map(reqGroup => {
                                  const isUrgent = reqGroup.priority === 'ACIL';
                                  const safeStatus = reqGroup.status || 'BEKLIYOR';
                                  const isAlarm = safeStatus === 'GELMEDI_ALARM';
                                  const isGeldi = safeStatus === 'GELDI';

                                  return (
                                  <div key={reqGroup.request_no} className={`flex flex-col p-4 rounded-2xl shadow-sm border-2 transition-all ${isAlarm ? 'bg-rose-500/10 border-rose-500 shadow-rose-500/20' : isGeldi ? 'bg-emerald-500/10 border-emerald-500/30' : isUrgent ? 'bg-destructive/5 border-destructive/30' : 'bg-card border-border hover:border-primary/40'}`}>
                                      <div className="flex items-center justify-between border-b border-border/50 pb-3">
                                          <div className="flex items-center gap-2">
                                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted px-2 py-1 rounded-md">{reqGroup.request_no}</span>
                                              {isUrgent && !isAlarm && !isGeldi && <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-md bg-destructive text-destructive-foreground animate-pulse shadow-sm"><Flame className="h-3 w-3" /> ACİL</span>}
                                              {isAlarm && <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-md bg-rose-500 text-white shadow-sm"><AlertTriangle className="h-3 w-3" /> GELMEDİ ALARMI</span>}
                                          </div>
                                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-muted/50 px-2 py-1 rounded-md"><User className="h-3 w-3" /> {reqGroup.profiles?.first_name} {reqGroup.profiles?.last_name}</div>
                                      </div>
                                      
                                      <div className="flex flex-col gap-2 pt-3">
                                          <div className="flex items-center justify-between">
                                              <span className="text-base font-black text-foreground">{reqGroup.material_type || "Genel Malzeme"} <span className="text-xs font-medium text-muted-foreground">({reqGroup.items.length} Kalem)</span></span>
                                              {safeStatus === 'BEKLIYOR' && (
                                                  <Button onClick={() => openFormEditor(reqGroup)} variant="ghost" size="sm" className="h-8 text-[10px] font-bold text-primary hover:bg-primary/10"><Edit2 className="h-3.5 w-3.5 mr-1" /> Düzenle</Button>
                                              )}
                                          </div>
                                          <Button onClick={() => openFormViewer(reqGroup, false)} variant="outline" className="w-full h-10 rounded-xl font-bold text-xs bg-background border-border hover:bg-muted hover:text-foreground">
                                              <FileText className="h-4 w-4 mr-2 text-muted-foreground" /> Malzeme İstek Formunu Gör
                                          </Button>
                                      </div>

                                      <div className="mt-4 pt-3 border-t border-border/50 flex flex-col gap-2">
                                          {(safeStatus === 'BEKLIYOR' || safeStatus === 'GELMEDI_ALARM') ? (
                                              <Button onClick={() => openPurchaseModal(reqGroup)} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm rounded-xl shadow-md">
                                                  <ShoppingCart className="h-4 w-4 mr-2" /> {isAlarm ? 'Satın Almayı Güncelle (Alarmı Kapat)' : 'Satın Almayı Gir & Onayla'}
                                              </Button>
                                          ) : safeStatus === 'TERMIN_GIRILDI' ? (
                                              <div className="bg-amber-100 text-amber-700 p-3 rounded-xl text-center text-xs font-black border border-amber-200">SAHA ONAYI BEKLENİYOR</div>
                                          ) : safeStatus === 'SIPARIS_VERILDI' ? (
                                              <div className="bg-indigo-100 text-indigo-700 p-3 rounded-xl text-center text-xs font-black border border-indigo-200">SİPARİŞ VERİLDİ (Saha Teslimatı Bekleniyor)</div>
                                          ) : safeStatus === 'GELDI' ? (
                                              <div className="bg-emerald-500 text-white p-3 rounded-xl text-center text-xs font-black flex justify-center items-center gap-2"><CheckCircle2 className="h-4 w-4" /> TESLİM ALINDI</div>
                                          ) : safeStatus === 'REDDEDILDI' ? (
                                              <div className="bg-muted text-muted-foreground p-3 rounded-xl text-center text-xs font-black line-through">REDDEDİLDİ</div>
                                          ) : null}

                                          {safeStatus === 'BEKLIYOR' && (
                                              <Button variant="ghost" onClick={() => rejectRequest(reqGroup.request_no)} className="w-full h-8 text-[10px] text-destructive hover:bg-destructive/10 mt-1">Komple Reddet</Button>
                                          )}
                                      </div>
                                  </div>
                                  )})}
                          </div>
                      )}
                  </div>
              )}
          </div>

          <div className="w-full xl:w-6/12 flex flex-col bg-card/60 backdrop-blur-2xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden">
              <div className="flex border-b border-border bg-muted/30">
                  <button onClick={() => setRightPanelTab('VERENLER')} className={`flex-1 py-4 text-sm font-black transition-all border-b-2 ${rightPanelTab === 'VERENLER' ? 'border-primary text-primary bg-background' : 'border-transparent text-muted-foreground hover:bg-muted'}`}>Siparişi Verenler</button>
                  <button onClick={() => setRightPanelTab('ALANLAR')} className={`flex-1 py-4 text-sm font-black transition-all border-b-2 ${rightPanelTab === 'ALANLAR' ? 'border-primary text-primary bg-background' : 'border-transparent text-muted-foreground hover:bg-muted'}`}>Teslim Alanlar</button>
              </div>

              <div className="p-4 bg-background border-b border-border flex flex-col sm:flex-row gap-3 shrink-0">
                  <select value={personFilter} onChange={e => setPersonFilter(e.target.value)} className="h-11 px-3 rounded-xl bg-muted/50 border border-border text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-primary flex-1">
                      <option value="">Tüm Kişiler</option>
                      {uniquePersons.map((p, i) => <option key={i} value={p}>{p}</option>)}
                  </select>
                  <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="h-11 rounded-xl bg-muted/50 border-border text-xs font-bold w-full sm:w-40" />
              </div>

              <div className="overflow-y-auto flex-1 p-4 custom-scrollbar bg-card/30">
                  {rightPanelData.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50"><Inbox className="h-12 w-12 mb-3" /><p className="text-sm font-bold">Kayıt bulunamadı.</p></div>
                  ) : (
                      <div className="flex flex-col gap-3">
                          {rightPanelData.map((req, idx) => (
                              <div key={idx} className="bg-background border border-border rounded-xl p-4 shadow-sm hover:border-primary/30 transition-all group">
                                  <div className="flex justify-between items-start mb-2">
                                      <div>
                                          <h4 className="text-sm font-black text-foreground">{req.profiles?.first_name} {req.profiles?.last_name}</h4>
                                          <p className="text-[10px] font-bold text-muted-foreground mt-0.5">{req.profiles?.department} • {new Date(req.created_at).toLocaleDateString('tr-TR')}</p>
                                      </div>
                                      <span className={`text-[10px] font-black px-2 py-1 rounded-md ${req.status === 'GELDI' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                          {req.status === 'GELDI' ? 'Teslim Aldı' : 'Sipariş Etti'}
                                      </span>
                                  </div>
                                  <div className="bg-muted/50 rounded-lg p-2 mt-2">
                                      <p className="text-xs font-bold text-foreground">{req.material_type} <span className="text-muted-foreground font-medium">({req.items.length} Kalem)</span></p>
                                      <p className="text-[10px] text-muted-foreground mt-1 truncate">Form No: {req.request_no}</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      </div>
      )}

      {activeMainTab === 'GECMIS' && (
      <div className="flex flex-col flex-1 bg-card/60 backdrop-blur-2xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden w-full">
          <div className="p-5 border-b border-border bg-background flex flex-col md:flex-row gap-4 justify-between items-center shrink-0">
              <h2 className="text-lg font-black text-foreground flex items-center gap-2"><History className="h-5 w-5 text-primary"/> Tüm Satın Alma Geçmişi</h2>
              <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full md:w-auto">
                  <div className="relative flex-1 sm:w-48"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Ürün Ara..." value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} className="pl-9 h-11 bg-muted/50 border-border text-xs rounded-xl" /></div>
                  <Input placeholder="Tedarikçi Firma..." value={historySupplierFilter} onChange={(e) => setHistorySupplierFilter(e.target.value)} className="h-11 bg-muted/50 border-border text-xs rounded-xl flex-1 sm:w-48" />
                  <Input type="date" value={historyDateFilter} onChange={(e) => setHistoryDateFilter(e.target.value)} className="h-11 bg-muted/50 border-border text-xs rounded-xl w-full sm:w-36" />
              </div>
          </div>
          <div className="overflow-y-auto flex-1 custom-scrollbar p-0">
              <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="sticky top-0 bg-muted/90 backdrop-blur-md z-10">
                      <tr>
                          <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tarih</th>
                          <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ürün Tanımı</th>
                          <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Miktar</th>
                          <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tedarikçi Firma</th>
                          <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Birim Fiyat</th>
                          <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sipariş No</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                      {historyData.length === 0 ? (
                          <tr><td colSpan={6} className="px-6 py-16 text-center text-muted-foreground font-bold">Kriterlere uygun geçmiş kayıt bulunamadı.</td></tr>
                      ) : (
                          historyData.map((item, idx) => (
                              <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-5 py-3 text-xs font-bold text-muted-foreground">{item.expected_date ? new Date(item.expected_date).toLocaleDateString('tr-TR') : '-'}</td>
                                  <td className="px-5 py-3 text-sm font-black text-foreground">{item.material_name}</td>
                                  <td className="px-5 py-3 text-xs font-bold text-primary bg-primary/5 rounded-md text-center w-24">{item.quantity} {item.unit}</td>
                                  <td className="px-5 py-3 text-xs font-bold text-foreground">{item.supplier_name || '-'}</td>
                                  <td className="px-5 py-3 text-xs font-black text-emerald-600">{item.price ? `${item.price} ${item.currency}` : '-'}</td>
                                  <td className="px-5 py-3 text-[10px] font-mono text-muted-foreground">{item.request_no}</td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      </div>
      )}

      {activeMainTab === 'FORMLAR' && (
      <div className="flex flex-col flex-1 bg-card/60 backdrop-blur-2xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden w-full p-6">
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-foreground flex items-center gap-2"><FileBadge className="h-6 w-6 text-primary"/> Oluşturulan Sipariş Formları</h2>
              {/* DÜZELTME: Arama inputuna value ve onChange eklendi */}
              <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Form No Ara..." value={orderFormSearch} onChange={(e) => setOrderFormSearch(e.target.value)} className="pl-9 h-11 bg-background border-border text-xs rounded-xl" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto custom-scrollbar pb-6">
              {orderFormsArchive.map((formGroup, i) => (
                  <div key={i} className="bg-background border border-border p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between">
                      <div>
                          <div className="flex justify-between items-start mb-3">
                              <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded">{formGroup.request_no}</span>
                              <span className="text-[10px] font-bold text-muted-foreground">{new Date(formGroup.created_at).toLocaleDateString('tr-TR')}</span>
                          </div>
                          <h4 className="text-sm font-black text-foreground mb-1">{formGroup.material_type || "Genel Malzeme"}</h4>
                          <p className="text-xs text-muted-foreground font-medium">{formGroup.profiles?.first_name} {formGroup.profiles?.last_name}</p>
                      </div>
                      <Button onClick={() => openFormViewer(formGroup, true)} variant="outline" className="w-full mt-4 h-10 rounded-xl font-bold text-xs bg-muted/50 border-border hover:bg-primary hover:text-white">
                          <Printer className="h-3.5 w-3.5 mr-2" /> Sipariş Formunu Aç
                      </Button>
                  </div>
              ))}
          </div>
      </div>
      )}

      {/* --- MODALLAR --- */}

      {/* 1. SATIN ALMA GİRİŞ MODALI */}
      <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
          <DialogContent className="rounded-[2rem] p-6 max-w-4xl w-[95vw] border-none bg-card shadow-2xl flex flex-col max-h-[90vh]">
              <DialogHeader className="shrink-0 mb-4">
                  <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2"><ShoppingCart className="h-6 w-6 text-primary"/> Satın Alma Detaylarını Gir</DialogTitle>
                  <p className="text-xs font-bold text-muted-foreground mt-1">Lütfen formdaki ürünlerin nereden, ne kadara alınacağını ve termin süresini belirleyin.</p>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4">
                  {purchaseGroup?.items.map((item: any, idx: number) => (
                      <div key={item.id} className="bg-muted/40 border border-border p-4 rounded-2xl flex flex-col gap-3">
                          <div className="flex items-center justify-between border-b border-border/50 pb-2">
                              <h4 className="text-sm font-black text-foreground"><span className="text-primary mr-2">{idx+1}.</span>{item.material_name}</h4>
                              <span className="text-xs font-bold bg-background px-3 py-1 rounded-md border border-border shadow-sm">İstenen: {item.quantity} {item.unit}</span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                              <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Tedarikçi Firma</Label>
                                  <Input value={purchaseData[item.id]?.supplier || ""} onChange={e => handlePurchaseItemChange(item.id, 'supplier', e.target.value)} placeholder="Firma Adı" className="h-10 bg-background text-xs font-bold" />
                              </div>
                              <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Birim Fiyat</Label>
                                  <div className="flex gap-1">
                                      <Input type="number" step="0.01" value={purchaseData[item.id]?.price || ""} onChange={e => handlePurchaseItemChange(item.id, 'price', e.target.value)} placeholder="0.00" className="h-10 bg-background text-xs font-black text-primary w-full" />
                                      <select value={purchaseData[item.id]?.currency || "TL"} onChange={e => handlePurchaseItemChange(item.id, 'currency', e.target.value)} className="w-16 h-10 rounded-md border border-border bg-background text-xs font-bold px-1 outline-none shrink-0">
                                          <option value="TL">₺</option><option value="USD">$</option><option value="EUR">€</option>
                                      </select>
                                  </div>
                              </div>
                              <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Termin Süresi / Tarih</Label>
                                  <Input type="date" value={purchaseData[item.id]?.leadTime || ""} onChange={e => handlePurchaseItemChange(item.id, 'leadTime', e.target.value)} className="h-10 bg-background text-xs font-bold" />
                              </div>
                          </div>
                      </div>
                  ))}
              </div>

              <div className="shrink-0 pt-4 mt-4 border-t border-border flex gap-3">
                  <Button variant="outline" onClick={() => setIsPurchaseModalOpen(false)} className="h-12 px-6 rounded-xl font-bold border-border">Vazgeç</Button>
                  <Button onClick={submitPurchaseData} disabled={isSavingForm} className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-xl shadow-lg">
                      {isSavingForm ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Save className="h-5 w-5 mr-2" />} VERİLERİ KAYDET & SİPARİŞİ ONAYLA
                  </Button>
              </div>
          </DialogContent>
      </Dialog>

      {/* 2. FORM REVİZE MODALI */}
      <Dialog open={isFormEditModalOpen} onOpenChange={setIsFormEditModalOpen}>
          <DialogContent className="rounded-[2rem] p-6 max-w-[95vw] w-[95vw] h-[90vh] border-none bg-card shadow-2xl flex flex-col max-h-[95vh] print:hidden">
              <DialogHeader className="shrink-0 mb-4">
                  <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2"><Edit2 className="h-5 w-5 text-primary"/> İstek Formunu Revize Et</DialogTitle>
              </DialogHeader>

              {editFormGroup && (
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-6">
                      <div className="bg-primary/5 border border-primary/20 rounded-[1.5rem] p-4 grid grid-cols-3 gap-4">
                          <div className="space-y-2"><Label className="text-[10px] font-bold text-primary uppercase">Proje No</Label><Input value={editFormGroup.project_code} onChange={e=>setEditFormGroup({...editFormGroup, project_code: e.target.value})} className="font-bold border-primary/30 h-11 bg-background" /></div>
                          <div className="space-y-2"><Label className="text-[10px] font-bold text-primary uppercase">Malzeme Cinsi</Label><Input value={editFormGroup.material_type} onChange={e=>setEditFormGroup({...editFormGroup, material_type: e.target.value})} className="font-bold border-primary/30 h-11 bg-background" /></div>
                          <div className="space-y-2"><Label className="text-[10px] font-bold text-primary uppercase">Öncelik</Label>
                              <select value={editFormGroup.priority} onChange={e => setEditFormGroup({...editFormGroup, priority: e.target.value})} className="w-full h-11 px-3 rounded-xl bg-background border border-primary/30 text-sm font-bold text-foreground">
                                  <option value="NORMAL">Normal</option><option value="ACIL">ACİL</option>
                              </select>
                          </div>
                      </div>

                      <div className="bg-muted border border-border rounded-[1.5rem] p-4 flex flex-col gap-4">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase mb-[-5px]">Forma Yeni Kalem Ekle</Label>
                          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                              <div className="space-y-1 col-span-2 md:col-span-3"><Input placeholder="Ürün Tanımı" value={newItemForm.material_name} onChange={e=>setNewItemForm({...newItemForm, material_name: e.target.value})} className="font-bold border-border h-11 bg-background" /></div>
                              <div className="space-y-1 col-span-1"><Input type="number" placeholder="Stok" value={newItemForm.current_stock} onChange={e=>setNewItemForm({...newItemForm, current_stock: e.target.value})} className="font-bold border-border h-11 bg-background" /></div>
                              <div className="space-y-1 col-span-1 md:col-span-2 flex gap-1">
                                  <Input type="number" placeholder="Miktar" min="1" value={newItemForm.quantity} onChange={e=>setNewItemForm({...newItemForm, quantity: e.target.value})} className="font-black text-primary border-border h-11 w-20" />
                                  <select value={newItemForm.unit} onChange={e=>setNewItemForm({...newItemForm, unit: e.target.value})} className="h-11 flex-1 rounded-md border border-border bg-background text-[10px] font-bold px-1">
                                      <option value="ADET">Adet</option><option value="METRE">Metre</option><option value="KG">Kg</option><option value="LİTRE">Litre</option><option value="PAKET">Paket</option><option value="KUTU">Kutu</option>
                                  </select>
                              </div>
                          </div>
                          <Button type="button" onClick={handleAddNewItemToForm} className="w-full h-10 bg-foreground text-background font-bold text-xs rounded-xl"><PlusCircle className="h-4 w-4 mr-2" /> Ekle</Button>
                      </div>

                      <div className="border border-border rounded-2xl overflow-hidden">
                          <table className="w-full text-left text-xs md:text-sm">
                              <thead className="bg-muted/80 border-b border-border text-muted-foreground font-bold"><tr><th className="px-3 py-3">Ürün Tanımı</th><th className="px-3 py-3 w-40 text-center">Miktar & Birim</th><th className="px-3 py-3 text-right w-16">Sil</th></tr></thead>
                              <tbody className="divide-y divide-border">
                                  {editFormItems.map((item, index) => {
                                      if (item.isDeleted) return null; 
                                      return (
                                      <tr key={index} className="bg-background">
                                          <td className="px-3 py-2"><Input value={item.material_name} onChange={e => { const items = [...editFormItems]; items[index].material_name = e.target.value; setEditFormItems(items); }} className="h-9 font-bold bg-transparent border-transparent hover:border-border" /></td>
                                          <td className="px-1 py-2 flex gap-1"><Input type="number" value={item.quantity} onChange={e => { const items = [...editFormItems]; items[index].quantity = e.target.value; setEditFormItems(items); }} className="h-9 w-16 text-center font-black text-primary bg-transparent border-transparent hover:border-border" /><select value={item.unit || 'ADET'} onChange={e => { const items = [...editFormItems]; items[index].unit = e.target.value; setEditFormItems(items); }} className="h-9 flex-1 bg-transparent text-[10px] font-bold outline-none"><option value="ADET">Adet</option><option value="METRE">Metre</option><option value="KG">Kg</option></select></td>
                                          <td className="px-3 py-2 text-right"><button onClick={() => handleRemoveItemFromForm(index)} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></td>
                                      </tr>
                                  )})}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}
              <div className="shrink-0 pt-4 mt-2 border-t border-border flex gap-3">
                  <Button variant="outline" onClick={() => setIsFormEditModalOpen(false)} className="h-14 px-6 rounded-xl font-bold">Vazgeç</Button>
                  <Button onClick={handleSaveFormChanges} disabled={isSavingForm} className="flex-1 h-14 bg-primary text-primary-foreground font-black text-base rounded-xl shadow-xl shadow-primary/20"><Save className="h-5 w-5 mr-2" /> KAYDET</Button>
              </div>
          </DialogContent>
      </Dialog>

      {/* 3. DİJİTAL FORM GÖRÜNTÜLEYİCİ */}
      <Dialog open={isFormViewerOpen} onOpenChange={setIsFormViewerOpen}>
          <DialogContent className="!max-w-[95vw] !w-[95vw] !h-[95vh] p-0 border-none bg-muted shadow-2xl flex flex-col z-[200] overflow-hidden print:!w-full print:!max-w-none print:!h-auto print:!shadow-none print:block print:p-0 print:m-0 print:bg-white">
              
              <div className="bg-card border-b border-border p-4 shrink-0 flex justify-between items-center print:hidden shadow-sm z-10">
                  <div className="flex gap-2">
                      <Button onClick={() => setIsOrderFormMode(false)} variant={!isOrderFormMode ? 'default' : 'outline'} className={`h-10 text-xs font-bold rounded-xl ${!isOrderFormMode ? 'shadow-md' : ''}`}>İstek Formu Olarak Gör</Button>
                      <Button onClick={() => setIsOrderFormMode(true)} variant={isOrderFormMode ? 'default' : 'outline'} className={`h-10 text-xs font-bold rounded-xl ${isOrderFormMode ? 'shadow-md bg-indigo-600 hover:bg-indigo-700' : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}>Sipariş Formu Olarak Görüntüle</Button>
                  </div>
                  <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setIsFormViewerOpen(false)} className="h-10 font-bold border-border rounded-xl">Kapat</Button>
                      <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90 text-primary-foreground font-black h-10 rounded-xl shadow-md"><Printer className="h-4 w-4 mr-2"/> {isOrderFormMode ? 'Sipariş Formunu İndir / Yazdır' : 'Yazdır / İndir'}</Button>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 print:bg-white print:p-0 w-full flex justify-center">
                  <div className="bg-white text-black border-[3px] border-black w-full max-w-[1000px] shadow-sm print:shadow-none print:min-w-0" id="printable-form">
                      
                      <table className="w-full border-collapse border border-black mb-4">
                          <tbody>
                              <tr>
                                  <td className="border border-black w-1/4 p-2 text-center align-middle">
                                      <Image src="/buvisan.png" alt="Buvisan Logo" width={150} height={50} className="mx-auto object-contain" />
                                  </td>
                                  <td className="border border-black w-2/4 text-center align-middle bg-[#f8fafc]">
                                      <h2 className="text-2xl font-black tracking-widest text-[#1e293b] uppercase">
                                          {isOrderFormMode ? 'SİPARİŞ FORMU' : 'MALZEME İSTEK FORMU'}
                                      </h2>
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
                                          </tbody>
                                      </table>
                                  </td>
                              </tr>
                          </tbody>
                      </table>

                      <table className="w-full border-collapse border border-black mb-4 text-[11px]">
                          <tbody>
                              <tr>
                                  <td className="border border-black p-2 font-bold w-1/4 bg-[#f8fafc] text-[#334155]">İstek / Sipariş No</td>
                                  <td className="border border-black p-2 w-1/4 font-black uppercase text-black">{viewingOrderGroup?.request_no}</td>
                                  <td className="border border-black p-2 font-bold w-1/4 bg-[#f8fafc] text-[#334155]">{isOrderFormMode ? 'Satın Almacı' : 'İstek Yapan Personel'}</td>
                                  <td className="border border-black p-2 font-black w-1/4 uppercase text-black">
                                      {isOrderFormMode ? 'SATIN ALMA BİRİMİ' : `${viewingOrderGroup?.profiles?.first_name} ${viewingOrderGroup?.profiles?.last_name}`}
                                  </td>
                              </tr>
                              <tr>
                                  <td className="border border-black p-2 font-bold bg-[#f8fafc] text-[#334155]">Proje No</td>
                                  <td className="border border-black p-2 font-black text-black">{viewingOrderGroup?.project_code}</td>
                                  <td className="border border-black p-2 font-bold bg-[#f8fafc] text-[#334155]">{isOrderFormMode ? 'Tedarikçi (Genel)' : 'İstek Yapan Bölüm'}</td>
                                  <td className="border border-black p-2 font-black uppercase text-black">
                                      {isOrderFormMode ? (viewingOrderGroup?.items[0]?.supplier_name || "-") : (viewingOrderGroup?.profiles?.department || "-")}
                                  </td>
                              </tr>
                              <tr>
                                  <td className="border border-black p-2 font-bold bg-[#f8fafc] text-[#334155]">Tarih</td>
                                  <td className="border border-black p-2 font-black text-black">{viewingOrderGroup?.created_at ? new Date(viewingOrderGroup.created_at).toLocaleDateString('tr-TR') : ''}</td>
                                  <td className="border border-black p-2 font-bold bg-[#f8fafc] text-[#334155]">Malzeme Cinsi</td>
                                  <td className="border border-black p-2 font-black text-black">{viewingOrderGroup?.material_type || viewingOrderGroup?.description || "-"}</td>
                              </tr>
                          </tbody>
                      </table>

                      <table className="w-full text-[11px] border-collapse border border-black">
                          <thead>
                              <tr className="bg-[#f8fafc] text-[#1e293b]">
                                  <th className="border border-black p-2 text-center w-8 font-bold">No</th>
                                  <th className="border border-black p-2 text-left pl-2 font-bold">Ürün Tanımı</th>
                                  {isOrderFormMode && <th className="border border-black p-2 text-left pl-2 font-bold w-40">Tedarikçi</th>}
                                  {!isOrderFormMode && <th className="border border-black p-2 text-center w-16 font-bold">Stok</th>}
                                  <th className="border border-black p-2 text-center w-24 font-bold">Miktar</th>
                                  {isOrderFormMode && <th className="border border-black p-2 text-center w-20 font-bold">Fiyat</th>}
                                  <th className="border border-black p-2 text-center w-24 font-bold">Termin</th>
                              </tr>
                          </thead>
                          <tbody>
                              {viewingOrderGroup?.items?.map((item: any, idx: number) => (
                                  <tr key={idx} className="h-8">
                                      <td className="border border-black p-1 text-center font-bold text-[#1e293b]">{idx + 1}</td>
                                      <td className="border border-black p-1 pl-2 font-black text-black">{item.material_name}</td>
                                      {isOrderFormMode && <td className="border border-black p-1 pl-2 font-bold text-[#1e293b]">{item.supplier_name || '-'}</td>}
                                      {!isOrderFormMode && <td className="border border-black p-1 text-center font-bold text-[#1e293b]">{item.current_stock || 0}</td>}
                                      <td className="border border-black p-1 text-center font-black text-black">{item.quantity} {item.unit || 'ADET'}</td>
                                      {isOrderFormMode && <td className="border border-black p-1 text-center font-bold text-[#1e293b]">{item.price ? `${item.price} ${item.currency}` : '-'}</td>}
                                      <td className="border border-black p-1 text-center font-bold text-[#1e293b]">{(item.expected_date) ? `${new Date(item.expected_date).toLocaleDateString('tr-TR')}` : '-'}</td>
                                  </tr>
                              ))}
                              {[...Array(Math.max(0, 15 - (viewingOrderGroup?.items?.length || 0)))].map((_, i) => (
                                  <tr key={`empty-${i}`} className="h-8">
                                      <td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td>{isOrderFormMode && <td className="border border-black"></td>}
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                      
                      <div className="mt-4 pb-2 text-right text-[10px] text-[#64748b] font-bold">Sayfa 1 / 1</div>
                  </div>
              </div>
          </DialogContent>
      </Dialog>
    </div>
  )
}