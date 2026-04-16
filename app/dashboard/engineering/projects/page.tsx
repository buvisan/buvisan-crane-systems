"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { 
  UploadCloud, FileCog, Loader2, CheckCircle2, AlertTriangle, 
  Clock, Factory, FileText, Send, Layers, Hammer, Search, X, PlusCircle, Download, TrendingUp, ArrowRight, Edit2, Trash2, ChevronDown, Package
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function ProjectPanelPage() {
  const [activeTab, setActiveTab] = useState("bekleyen_satislar") 
  const [loading, setLoading] = useState(false)
  const [dataList, setDataList] = useState<any[]>([]) 
  const supabase = createClient()

  const [customers, setCustomers] = useState<any[]>([])
  const [pendingSales, setPendingSales] = useState<any[]>([]) 
  const [formData, setFormData] = useState({ customer_id: "", project_code: "", capacity: "" })
  
  const [files, setFiles] = useState<{ [key: string]: File | null }>({ is_emri: null, fatura: null, kopru: null, yuruyus: null, kedi: null, celik_konstruksiyon: null, genel_montaj: null })
  const [uploading, setUploading] = useState(false)

  const [customerSearch, setCustomerSearch] = useState("")
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false)
  const [addingCustomer, setAddingCustomer] = useState(false)
  
  const [activeSaleIds, setActiveSaleIds] = useState<number[] | null>(null)
  
  // 🚀 YENİ: AÇILIR KAPANIR LİSTE İÇİN HAFIZA
  const [expandedSales, setExpandedSales] = useState<string[]>([])

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editProjectData, setEditProjectData] = useState<any>(null)
  const [editFiles, setEditFiles] = useState<{ [key: string]: File | null }>({})
  const [editUploading, setEditUploading] = useState(false)

  useEffect(() => { 
      fetchCustomers();
      fetchPendingSales();
  }, [])

  useEffect(() => {
    if (activeTab === "bekleyen_satislar") fetchPendingSales()
    if (activeTab === "revize_talepleri") fetchRevisions()
    if (activeTab === "onay_listesi") fetchProjectsByStatus('ONAY_BEKLIYOR')
    if (activeTab === "gonderilenler") fetchProjectsByStatus('URETIMDE')
  }, [activeTab])

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, name').order('name', { ascending: true })
    if (data) setCustomers(data)
  }

  // 🚀 AÇ/KAPAT TETİKLEYİCİSİ
  const toggleExpand = (key: string) => {
      setExpandedSales(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  // 🚀 AKILLI GRUPLAMA VE TEMİZ METİN OLUŞTURMA
  const fetchPendingSales = async () => {
      setLoading(true)
      const { data } = await supabase.from('tracking_sales').select('*, tracking_products(brand, model)').order('created_at', { ascending: false })
      
      if (data) {
          const grouped = data.reduce((acc: any, curr: any) => {
              const key = `${curr.customer_name}_${curr.sale_date}_${curr.personnel_id}`
              if (!acc[key]) {
                  acc[key] = {
                      ...curr,
                      group_key: key,
                      all_ids: [curr.id],
                      items: [curr] // Tüm ürünleri diziye atıyoruz
                  }
              } else {
                  acc[key].all_ids.push(curr.id)
                  acc[key].items.push(curr)
              }
              return acc
          }, {})

          // İş emrine atılacak yazıyı "2x 10 Ton + 1x 5 Ton" şeklinde formatla
          Object.values(grouped).forEach((group: any) => {
              group.combined_machines = group.items.map((i: any) => 
                  `${i.quantity}x ${i.tracking_products?.brand} ${i.tracking_products?.model !== '-' ? i.tracking_products?.model : ''}`.trim()
              ).join(' + ')
          })

          setPendingSales(Object.values(grouped))
      }
      setLoading(false)
  }

  const startWorkOrderFromSale = (saleGroup: any) => {
      setActiveTab("is_emri") 
      setCustomerSearch(saleGroup.customer_name) 
      setFormData(prev => ({...prev, capacity: saleGroup.combined_machines})) 
      setActiveSaleIds(saleGroup.all_ids) 
  }

  const handleAddNewCustomer = async () => {
      if(!customerSearch.trim()) return;
      setAddingCustomer(true);
      try {
          const { data, error } = await supabase.from('customers').insert([{ name: customerSearch.trim() }]).select().single()
          if (error) throw error;
          await fetchCustomers();
          setFormData(prev => ({...prev, customer_id: data.id.toString()}));
          setIsCustomerDropdownOpen(false);
          setCustomerSearch(""); 
      } catch (error: any) { alert("Firma eklenirken hata oluştu: " + error.message); } 
      finally { setAddingCustomer(false); }
  }

  const fetchRevisions = async () => {
    setLoading(true)
    const { data } = await supabase.from('project_revisions').select('*, projects(project_code, customers(name))').order('created_at', { ascending: false })
    if (data) setDataList(data)
    setLoading(false)
  }

  const fetchProjectsByStatus = async (status: string) => {
    setLoading(true)
    try {
        const { data, error } = await supabase
            .from('projects')
            .select('*, customers(name), project_files(file_type, file_url)')
            .eq('status', status)
            .order('created_at', { ascending: false })
            
        if (error) throw error
        if (data) setDataList(data)
    } catch (error: any) {
        console.error("Proje çekme hatası:", error)
    } finally {
        setLoading(false)
    }
  }

  const deleteProject = async (id: number) => {
      if(!confirm("Bu projeyi tamamen SİLMEK istediğinize emin misiniz? Tüm dosyalarıyla birlikte yok olacak!")) return;
      
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) alert("Silinirken hata oluştu: " + error.message)
      else {
          alert("Proje başarıyla kaldırıldı.")
          fetchProjectsByStatus('ONAY_BEKLIYOR') 
      }
  }

  const completeRevision = async (id: number) => {
    if(!confirm("Bu revizenin yapıldığını onaylıyor musunuz?")) return;
    const { error } = await supabase.from('project_revisions').update({ status: 'YAPILDI' }).eq('id', id)
    if (!error) fetchRevisions() 
  }

  const sanitizeFileName = (name: string) => {
    const map: { [key: string]: string } = { 'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U' };
    let cleanName = name.replace(/[çÇğĞıİöÖşŞüÜ]/g, function(match) { return map[match]; });
    return cleanName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '').toLowerCase();
  }

  const uploadFileToSupabase = async (file: File, folderName: string) => {
    const cleanFileName = `${Date.now()}-${sanitizeFileName(file.name)}`
    const cleanFolder = sanitizeFileName(folderName)
    const filePath = `${cleanFolder}/${cleanFileName}`
    const { error } = await supabase.storage.from('project-files').upload(filePath, file)
    if (error) throw error
    const { data } = supabase.storage.from('project-files').getPublicUrl(filePath)
    return data.publicUrl
  }

  const handleSubmit = async () => {
    if (!formData.customer_id || !formData.project_code) { alert("Lütfen firma ve iş emri numarasını giriniz."); return; }
    setUploading(true)

    try {
        const { data: projectData, error } = await supabase.from('projects').insert([{
            customer_id: Number(formData.customer_id), project_code: formData.project_code, capacity: formData.capacity, status: 'ONAY_BEKLIYOR'
        }]).select().single()

        if (error) throw error

        const fileInserts = []
        const fileTypes = ['is_emri', 'fatura', 'kopru', 'yuruyus', 'kedi', 'celik_konstruksiyon', 'genel_montaj']
        
        for (const type of fileTypes) {
            const file = files[type]
            if (file) {
                const publicUrl = await uploadFileToSupabase(file, formData.project_code)
                fileInserts.push({ project_id: projectData.id, file_type: type.toUpperCase(), file_url: publicUrl })
            }
        }
        if (fileInserts.length > 0) await supabase.from('project_files').insert(fileInserts)

        if (activeSaleIds && activeSaleIds.length > 0) {
            await supabase.from('tracking_sales').update({ status: 'ONAYLANDI' }).in('id', activeSaleIds)
        }

        alert("✅ İş Emri başarıyla oluşturuldu!")
        setFormData({ customer_id: "", project_code: "", capacity: "" })
        setFiles({ is_emri: null, fatura: null, kopru: null, yuruyus: null, kedi: null, celik_konstruksiyon: null, genel_montaj: null })
        setActiveSaleIds(null)
        setActiveTab("onay_listesi")
    } catch (error: any) { alert("Hata: " + error.message) } 
    finally { setUploading(false) }
  }

  const openEditModal = (project: any) => {
      setEditProjectData({
          id: project.id,
          project_code: project.project_code,
          capacity: project.capacity,
          existingFiles: project.project_files || []
      })
      setEditFiles({}) 
      setIsEditModalOpen(true)
  }

  const handleEditSubmit = async () => {
      if (!editProjectData.project_code) return alert("Proje No zorunludur.")
      setEditUploading(true)

      try {
          const { error: projError } = await supabase.from('projects').update({
              project_code: editProjectData.project_code,
              capacity: editProjectData.capacity
          }).eq('id', editProjectData.id)
          
          if (projError) throw projError

          const fileTypes = ['is_emri', 'fatura', 'kopru', 'yuruyus', 'kedi', 'celik_konstruksiyon', 'genel_montaj']
          
          for (const type of fileTypes) {
              const file = editFiles[type]
              if (file) {
                  const publicUrl = await uploadFileToSupabase(file, editProjectData.project_code)
                  const existingFile = editProjectData.existingFiles.find((f:any) => f.file_type === type.toUpperCase())
                  
                  if (existingFile) {
                      await supabase.from('project_files').update({ file_url: publicUrl }).eq('id', existingFile.id)
                  } else {
                      await supabase.from('project_files').insert([{ project_id: editProjectData.id, file_type: type.toUpperCase(), file_url: publicUrl }])
                  }
              }
          }

          alert("✅ İş Emri başarıyla güncellendi!")
          setIsEditModalOpen(false)
          if (activeTab === "onay_listesi") fetchProjectsByStatus('ONAY_BEKLIYOR')
          if (activeTab === "gonderilenler") fetchProjectsByStatus('URETIMDE')

      } catch (error: any) { alert("Hata: " + error.message) }
      finally { setEditUploading(false) }
  }

  const tabs = [
    { id: "bekleyen_satislar", label: "Satıştan Gelenler", icon: <TrendingUp className="h-4 w-4" /> },
    { id: "is_emri", label: "İş Emri Oluştur", icon: <FileCog className="h-4 w-4" /> },
    { id: "revize_talepleri", label: "Revize Talepleri", icon: <AlertTriangle className="h-4 w-4" /> },
    { id: "onay_listesi", label: "Onay Listesi", icon: <Clock className="h-4 w-4" /> },
    { id: "gonderilenler", label: "Üretime İnenler", icon: <Factory className="h-4 w-4" /> },
  ]

  const selectedCustomerName = customers.find(c => c.id.toString() === formData.customer_id.toString())?.name || ""

  return (
    <div className="flex flex-col gap-6 md:gap-8 font-sans max-w-[1400px] mx-auto w-full pb-10 xl:pb-20">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 md:gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-5 md:p-6 rounded-[2rem] shadow-sm flex-1">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 md:p-4 rounded-2xl shadow-lg shadow-indigo-500/30 shrink-0">
                <Layers className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </div>
            <div>
                <h1 className="text-xl md:text-3xl font-black tracking-tight text-slate-900">Mühendislik Paneli</h1>
                <p className="text-slate-500 font-medium text-xs md:text-sm mt-1">İş emirleri, teknik çizimler ve revize yönetim merkezi.</p>
            </div>
        </div>
      </div>

      <div className="flex gap-2 p-1.5 md:p-2 bg-white/60 backdrop-blur-2xl border border-white/50 rounded-[1.5rem] md:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-x-auto custom-scrollbar w-full">
        {tabs.map((tab) => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 md:px-6 py-3 md:py-3.5 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold transition-all duration-300 whitespace-nowrap shrink-0 ${
                    activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50'
                }`}
            >
                {tab.icon} {tab.label}
            </button>
        ))}
      </div>

      <div className="relative w-full">
          {loading && activeTab !== "is_emri" ? (
              <div className="flex h-64 items-center justify-center bg-white/40 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2.5rem] border border-white/50 shadow-sm">
                  <Loader2 className="animate-spin h-10 w-10 md:h-12 md:w-12 text-indigo-500" />
              </div>
          ) : (
              <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] md:rounded-[2.5rem] p-4 sm:p-6 md:p-10 relative overflow-hidden w-full">
                  
                  <div className="absolute top-0 right-0 -mr-20 -mt-20 w-48 h-48 md:w-64 md:h-64 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none"></div>

                  {activeTab === "bekleyen_satislar" && (
                      <div className="flex flex-col gap-4 md:gap-6 relative z-10 animate-in fade-in w-full">
                          <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2 md:gap-3 mb-2"><TrendingUp className="text-indigo-500 h-5 w-5 md:h-6 md:w-6"/> Satıştan Gelen İşler</h2>
                          <div className="overflow-x-auto custom-scrollbar w-full border border-slate-100/50 rounded-2xl bg-white/40">
                              <table className="w-full text-left border-collapse min-w-[800px]">
                                  <thead>
                                      <tr className="border-b border-slate-200">
                                          <th className="py-3 md:py-4 px-4 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">Tarih</th>
                                          <th className="py-3 md:py-4 px-4 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">Müşteri</th>
                                          <th className="py-3 md:py-4 px-4 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">Satılan Makineler (Sepet)</th>
                                          <th className="py-3 md:py-4 px-4 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest text-center">Durum</th>
                                          <th className="py-3 md:py-4 px-4 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest text-right">Aksiyon</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                      {pendingSales.map((sale) => {
                                          let statusBadge = <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-bold border border-slate-200">GÖNDERİLMEDİ</span>;
                                          if (sale.status === 'ONAYLANDI') statusBadge = <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-[10px] font-bold border border-emerald-200 flex items-center justify-center gap-1 w-max mx-auto"><CheckCircle2 className="h-3 w-3"/> GÖNDERİLDİ</span>;
                                          else if (sale.status === 'IPTAL') statusBadge = <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-lg text-[10px] font-bold border border-rose-200 flex items-center justify-center gap-1 w-max mx-auto"><AlertTriangle className="h-3 w-3"/> ONAYLANMADI</span>;

                                          const isExpanded = expandedSales.includes(sale.group_key);

                                          return (
                                          <tr key={sale.group_key} className={`transition-colors group hover:bg-white/60 ${isExpanded ? 'bg-indigo-50/20' : ''}`}>
                                              <td className="py-4 md:py-5 px-4 text-xs md:text-sm font-bold text-slate-500 align-top pt-5">{new Date(sale.sale_date).toLocaleDateString('tr-TR')}</td>
                                              <td className="py-4 md:py-5 px-4 text-xs md:text-sm font-black text-slate-800 align-top pt-5">{sale.customer_name}</td>
                                              
                                              {/* 🚀 İŞTE YENİ AÇILIR KAPANIR (ACCORDION) BÖLÜM */}
                                              <td className="py-4 md:py-5 px-4 align-top">
                                                  <div className="flex flex-col gap-2">
                                                      <div 
                                                          onClick={() => toggleExpand(sale.group_key)} 
                                                          className="flex items-center gap-2 cursor-pointer hover:bg-indigo-50/80 p-1.5 -ml-1.5 rounded-lg transition-colors w-max"
                                                      >
                                                          <span className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-md text-[10px] md:text-xs font-black flex items-center gap-1.5 shadow-sm border border-indigo-200/50">
                                                              <Package className="h-3 w-3 md:h-3.5 md:w-3.5" /> {sale.items.length} Kalem
                                                          </span>
                                                          <span className="text-xs md:text-sm font-bold text-slate-700 truncate max-w-[150px] md:max-w-[200px]">
                                                              {sale.items[0].tracking_products?.brand} {sale.items.length > 1 && '...'}
                                                          </span>
                                                          <ChevronDown className={`h-4 w-4 md:h-5 md:w-5 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                                      </div>

                                                      {/* LİSTE DETAYI (Tıklanınca Açılır) */}
                                                      {isExpanded && (
                                                          <div className="flex flex-col gap-1.5 mt-2 pl-2 md:pl-3 border-l-2 border-indigo-200 animate-in slide-in-from-top-2 fade-in duration-200 pb-2">
                                                              {sale.items.map((item: any, idx: number) => (
                                                                  <div key={item.id} className="text-[10px] md:text-xs font-medium text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-sm flex items-center justify-between gap-4 w-max min-w-[250px] md:min-w-[300px]">
                                                                      <span className="flex items-center gap-1.5">
                                                                          <span className="font-black text-indigo-600 w-4">{idx + 1}.</span> 
                                                                          <span className="font-bold text-slate-800">{item.tracking_products?.brand}</span>
                                                                          <span className="opacity-60 hidden sm:inline">({item.tracking_products?.model})</span>
                                                                      </span>
                                                                      <span className="font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 shrink-0">{item.quantity} Adet</span>
                                                                  </div>
                                                              ))}
                                                          </div>
                                                      )}
                                                  </div>
                                              </td>
                                              
                                              <td className="py-4 md:py-5 px-4 text-center align-top pt-5">{statusBadge}</td>
                                              <td className="py-4 md:py-5 px-4 text-right align-top pt-4">
                                                  {sale.status === 'BEKLIYOR' ? (
                                                      <Button onClick={() => startWorkOrderFromSale(sale)} className="h-9 md:h-10 text-xs md:text-sm rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20 group/btn">
                                                          İş Emrine Çevir <ArrowRight className="ml-1.5 md:ml-2 h-3 w-3 md:h-4 md:w-4 group-hover/btn:translate-x-1 transition-transform" />
                                                      </Button>
                                                  ) : (
                                                      <span className="text-[10px] font-bold text-slate-400">İşlem Tamamlandı</span>
                                                  )}
                                              </td>
                                          </tr>
                                      )})}
                                      {pendingSales.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-sm font-bold text-slate-400">Satıştan gelen iş bulunmuyor.</td></tr>}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  )}

                  {activeTab === "is_emri" && (
                      <div className="flex flex-col gap-6 md:gap-8 relative z-10 animate-in fade-in">
                          <div className="flex items-center gap-2 md:gap-3 mb-2">
                              <Hammer className="h-5 w-5 md:h-6 md:w-6 text-indigo-600" />
                              <h2 className="text-xl md:text-2xl font-black text-slate-800">Yeni İş Emri Başlat</h2>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                              <div className="space-y-2 md:space-y-3">
                                  <Label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">İş Emri (Proje) No</Label>
                                  <Input placeholder="Örn: PRJ-2026-001" value={formData.project_code} onChange={(e) => setFormData({...formData, project_code: e.target.value})} className="h-12 md:h-14 rounded-xl md:rounded-2xl bg-white/80 border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 px-4 md:px-5 shadow-sm text-sm" />
                              </div>
                              <div className="space-y-2 md:space-y-3">
                                  <Label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Kapasite / Makine Özeti</Label>
                                  <Input placeholder="Örn: 2x 10 TON Çift Kiriş" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: e.target.value})} className="h-12 md:h-14 rounded-xl md:rounded-2xl bg-white/80 border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 px-4 md:px-5 shadow-sm text-sm" />
                              </div>
                              
                              <div className="space-y-2 md:space-y-3 md:col-span-2 relative">
                                  <Label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Müşteri / Firma</Label>
                                  {formData.customer_id ? (
                                      <div className="flex items-center justify-between h-12 md:h-14 rounded-xl md:rounded-2xl bg-indigo-50 border border-indigo-200 px-4 md:px-5 shadow-sm animate-in fade-in">
                                          <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                                              <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-indigo-500 shrink-0" />
                                              <span className="font-black text-xs md:text-sm text-indigo-900 truncate">{selectedCustomerName}</span>
                                          </div>
                                          <button type="button" onClick={() => { setFormData({...formData, customer_id: ""}); setCustomerSearch(""); }} className="p-1.5 md:p-2 hover:bg-indigo-200 rounded-lg md:rounded-full text-indigo-500 transition-colors shrink-0"><X className="h-4 w-4" /></button>
                                      </div>
                                  ) : (
                                      <div className="relative z-50">
                                          <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-slate-400" />
                                          <Input 
                                              placeholder="Listeden ara veya yeni firma adını yazın..." value={customerSearch}
                                              onChange={(e) => { setCustomerSearch(e.target.value); setIsCustomerDropdownOpen(true); }} onFocus={() => setIsCustomerDropdownOpen(true)} onBlur={() => setTimeout(() => setIsCustomerDropdownOpen(false), 200)}
                                              className="pl-10 md:pl-12 h-12 md:h-14 rounded-xl md:rounded-2xl bg-white/80 border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 pr-4 md:pr-5 shadow-sm text-sm" 
                                          />
                                          {isCustomerDropdownOpen && (
                                              <div className="absolute w-full mt-2 bg-white rounded-xl md:rounded-2xl border border-slate-100 shadow-xl max-h-48 md:max-h-60 overflow-y-auto p-1.5 md:p-2 animate-in fade-in slide-in-from-top-2">
                                                  {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
                                                      <button key={c.id} type="button" onClick={() => { setFormData({...formData, customer_id: c.id.toString()}); setIsCustomerDropdownOpen(false); }} className="w-full text-left px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl text-xs md:text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors">{c.name}</button>
                                                  ))}
                                                  {customerSearch.trim() !== "" && !customers.some(c => c.name.toLowerCase() === customerSearch.trim().toLowerCase()) && (
                                                      <button type="button" onClick={handleAddNewCustomer} disabled={addingCustomer} className="w-full mt-1 flex items-center justify-between px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl text-xs md:text-sm font-black text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors">
                                                          <span className="flex items-center gap-2">{addingCustomer ? <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" /> : <PlusCircle className="h-3 w-3 md:h-4 md:w-4" />} <span className="truncate max-w-[200px]">"{customerSearch}" ekle</span></span>
                                                      </button>
                                                  )}
                                              </div>
                                          )}
                                      </div>
                                  )}
                              </div>
                          </div>

                          <div className="mt-2 md:mt-4">
                              <Label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 md:mb-4 block">Resmi Evraklar ve Teknik Çizimler (PDF)</Label>
                              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
                                  {['IS_EMRI', 'FATURA', 'KOPRU', 'YURUYUS', 'KEDI', 'CELIK_KONSTRUKSIYON', 'GENEL_MONTAJ'].map((type) => {
                                      const fileKey = type.toLowerCase();
                                      const file = files[fileKey];
                                      const isEmriColor = type === 'IS_EMRI' ? 'blue' : type === 'FATURA' ? 'amber' : 'emerald';
                                      
                                      return (
                                      <div key={type} className={`relative flex flex-col items-center justify-center p-3 md:p-4 border-2 border-dashed rounded-xl md:rounded-2xl transition-all group ${file ? `border-${isEmriColor}-400 bg-${isEmriColor}-50/50` : 'border-slate-300 bg-white/50 hover:border-indigo-400'}`}>
                                          <input type="file" accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => setFiles({...files, [fileKey]: e.target.files?.[0] || null})} />
                                          <div className={`p-1.5 md:p-2 rounded-full mb-1.5 md:mb-2 transition-colors ${file ? `bg-${isEmriColor}-100 text-${isEmriColor}-600` : 'bg-slate-100 text-slate-400'}`}>
                                              {file ? <FileText className="h-4 w-4 md:h-5 md:w-5" /> : <UploadCloud className="h-4 w-4 md:h-5 md:w-5" />}
                                          </div>
                                          <span className={`font-black text-[9px] md:text-[10px] mb-0.5 md:mb-1 text-center ${file ? `text-${isEmriColor}-700` : 'text-slate-600'}`}>{type.replace('_', ' ')}</span>
                                          <span className="text-[8px] md:text-[9px] font-bold text-slate-400 text-center px-1 truncate w-full">{file ? file.name : "Tıkla Yükle"}</span>
                                      </div>
                                  )})}
                              </div>
                          </div>

                          <Button onClick={handleSubmit} disabled={uploading} className="w-full h-14 md:h-16 mt-2 md:mt-4 rounded-xl md:rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm md:text-lg shadow-xl shadow-slate-900/20 transition-all flex items-center justify-center gap-2 md:gap-3">
                              {uploading ? <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin" /> : <Send className="h-5 w-5 md:h-6 md:w-6 text-indigo-400" />}
                              {uploading ? "SİSTEME YÜKLENİYOR..." : "İŞ EMRİNİ ONAYA SUN"}
                          </Button>
                      </div>
                  )}

                  {activeTab === "revize_talepleri" && (
                      <div className="flex flex-col gap-4 md:gap-6 relative z-10 animate-in fade-in">
                          <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2 md:gap-3 mb-2"><AlertTriangle className="text-rose-500 h-5 w-5 md:h-6 md:w-6"/> Sahadan Gelen Revizeler</h2>
                          <div className="overflow-x-auto custom-scrollbar border border-slate-100/50 rounded-2xl">
                              <table className="w-full text-left border-collapse min-w-[600px]">
                                  <thead>
                                      <tr className="border-b border-slate-200 bg-white/40">
                                          <th className="py-3 md:py-4 px-4 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">Proje No</th>
                                          <th className="py-3 md:py-4 px-4 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">Revize Detayı</th>
                                          <th className="py-3 md:py-4 px-4 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">Durum</th>
                                          <th className="py-3 md:py-4 px-4 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest text-right">Aksiyon</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 bg-white/20">
                                      {dataList.map((item) => (
                                          <tr key={item.id} className="hover:bg-white/50 transition-colors group">
                                              <td className="py-4 md:py-5 px-4 font-mono text-xs md:text-sm font-bold text-indigo-600">{item.projects?.project_code}</td>
                                              <td className="py-4 md:py-5 px-4"><p className="text-xs md:text-sm font-medium text-slate-700 max-w-[200px] md:max-w-md truncate md:whitespace-normal" title={item.note}>{item.note}</p><span className="text-[9px] md:text-[10px] font-bold text-slate-400 mt-1 block">Bildiren: {item.reported_by}</span></td>
                                              <td className="py-4 md:py-5 px-4"><span className={`inline-flex items-center gap-1.5 px-2 md:px-3 py-1 rounded-md md:rounded-lg text-[10px] md:text-xs font-bold ${item.status === 'BEKLIYOR' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{item.status === 'BEKLIYOR' && <span className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-rose-500 animate-pulse"></span>}{item.status === 'YAPILDI' && <CheckCircle2 className="h-3 w-3 md:h-3.5 md:w-3.5" />}{item.status}</span></td>
                                              <td className="py-4 md:py-5 px-4 text-right">{item.status === 'BEKLIYOR' && (<Button size="sm" onClick={() => completeRevision(item.id)} className="h-8 md:h-10 text-xs md:text-sm rounded-lg md:rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-md shadow-emerald-500/20"><CheckCircle2 className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> Yapıldı</Button>)}</td>
                                          </tr>
                                      ))}
                                      {dataList.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-sm font-bold text-slate-400">Revize talebi bulunmuyor.</td></tr>}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  )}

                  {(activeTab === "onay_listesi" || activeTab === "gonderilenler") && (
                      <div className="flex flex-col gap-4 md:gap-6 relative z-10 animate-in fade-in">
                          <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2 md:gap-3 mb-2">
                              {activeTab === "onay_listesi" ? <Clock className="text-amber-500 h-5 w-5 md:h-6 md:w-6"/> : <Factory className="text-emerald-500 h-5 w-5 md:h-6 md:w-6"/>} 
                              {activeTab === "onay_listesi" ? "Üretim Onayı Bekleyenler" : "Sahaya İnen İşler (Üretimde)"}
                          </h2>
                          <div className="overflow-x-auto custom-scrollbar border border-slate-100/50 rounded-2xl">
                              <table className="w-full text-left border-collapse min-w-[800px]">
                                  <thead>
                                      <tr className="border-b border-slate-200 bg-white/40">
                                          <th className="py-3 md:py-4 px-4 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">İş Emri</th>
                                          <th className="py-3 md:py-4 px-4 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">Müşteri / Firma</th>
                                          <th className="py-3 md:py-4 px-4 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">Dosyalar & Evraklar</th>
                                          <th className="py-3 md:py-4 px-4 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest text-center">Durum</th>
                                          <th className="py-3 md:py-4 px-4 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest text-right">İşlem</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 bg-white/20">
                                      {dataList.map((item) => (
                                          <tr key={item.id} className="hover:bg-white/50 transition-colors group">
                                              <td className="py-4 md:py-5 px-4 font-mono text-xs md:text-sm font-bold text-slate-800">{item.project_code}</td>
                                              <td className="py-4 md:py-5 px-4 text-xs md:text-sm font-bold text-slate-600 truncate max-w-[150px]">{item.customers?.name}</td>
                                              <td className="py-4 md:py-5 px-4">
                                                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                                                      {item.project_files && item.project_files.length > 0 ? (
                                                          item.project_files.map((file: any, idx: number) => {
                                                              const isEmriColor = file.file_type === 'IS_EMRI' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : file.file_type === 'FATURA' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100';
                                                              return (
                                                                  <a key={idx} href={file.file_url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 text-[9px] md:text-[10px] font-black uppercase px-2 md:px-2.5 py-1 rounded-md border hover:shadow-sm transition-all ${isEmriColor}`}>
                                                                      <Download className="h-3 w-3" /> {file.file_type.replace('_', ' ')}
                                                                  </a>
                                                              )
                                                          })
                                                      ) : (
                                                          <span className="text-[9px] md:text-[10px] text-slate-400 font-bold">Dosya Yok</span>
                                                      )}
                                                  </div>
                                              </td>
                                              <td className="py-4 md:py-5 px-4 text-center">
                                                  <span className={`inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 rounded-md md:rounded-lg text-[10px] md:text-xs font-bold w-max ${activeTab === 'onay_listesi' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                      {activeTab === "onay_listesi" ? <><span className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-amber-500 animate-pulse"></span> Onay Bekliyor</> : <><Factory className="h-3 w-3 md:h-3.5 md:w-3.5" /> Üretimde</>}
                                                  </span>
                                              </td>
                                              <td className="py-4 md:py-5 px-4 text-right flex justify-end gap-2 items-center">
                                                  <Button variant="outline" size="sm" onClick={() => openEditModal(item)} className="h-8 md:h-9 text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                                                      <Edit2 className="h-3.5 w-3.5 md:mr-1.5" /> <span className="hidden md:inline">Düzenle</span>
                                                  </Button>
                                                  {activeTab === "onay_listesi" && (
                                                      <Button variant="outline" size="icon" onClick={() => deleteProject(item.id)} className="h-8 w-8 md:h-9 md:w-9 border-rose-200 text-rose-500 hover:bg-rose-50 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                          <Trash2 className="h-4 w-4" />
                                                      </Button>
                                                  )}
                                              </td>
                                          </tr>
                                      ))}
                                      {dataList.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-sm font-bold text-slate-400">Kayıt bulunamadı.</td></tr>}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  )}
              </div>
          )}
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 max-w-[90vw] md:max-w-[700px] border-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <DialogHeader className="shrink-0"><DialogTitle className="text-xl md:text-3xl font-black text-slate-800 flex items-center gap-2 md:gap-3"><Edit2 className="h-5 w-5 md:h-6 md:w-6 text-indigo-500" /> İş Emrini Düzenle</DialogTitle></DialogHeader>
              
              <div className="flex flex-col gap-4 md:gap-6 py-2 overflow-y-auto custom-scrollbar pr-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">İş Emri (Proje) No</Label>
                          <Input value={editProjectData?.project_code || ""} onChange={(e) => setEditProjectData({...editProjectData, project_code: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold text-slate-800" />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Kapasite / Açıklama</Label>
                          <Input value={editProjectData?.capacity || ""} onChange={(e) => setEditProjectData({...editProjectData, capacity: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold text-slate-800" />
                      </div>
                  </div>

                  <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl">
                      <Label className="text-[10px] md:text-xs font-black text-blue-800 uppercase tracking-widest mb-3 block">Dosyaları Güncelle veya Yeni Ekle</Label>
                      <p className="text-[10px] md:text-xs font-medium text-slate-500 mb-4">Buradan yüklediğiniz yeni dosyalar eskinin üzerine yazılır. Boş bıraktıklarınız eskisi gibi kalır.</p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {['IS_EMRI', 'FATURA', 'KOPRU', 'YURUYUS', 'KEDI', 'CELIK_KONSTRUKSIYON', 'GENEL_MONTAJ'].map((type) => {
                              const fileKey = type.toLowerCase();
                              const newFile = editFiles[fileKey];
                              const existingFile = editProjectData?.existingFiles?.find((f:any) => f.file_type === type);
                              const hasFile = newFile || existingFile;
                              
                              return (
                              <div key={type} className={`relative flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-xl transition-all ${hasFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-white hover:border-indigo-400'}`}>
                                  <input type="file" accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => setEditFiles({...editFiles, [fileKey]: e.target.files?.[0] || null})} />
                                  <div className={`p-1.5 rounded-full mb-1 transition-colors ${hasFile ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                      {hasFile ? <CheckCircle2 className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
                                  </div>
                                  <span className={`font-black text-[9px] mb-0.5 text-center ${hasFile ? 'text-emerald-700' : 'text-slate-600'}`}>{type.replace('_', ' ')}</span>
                                  <span className="text-[8px] font-bold text-slate-400 text-center px-1 truncate w-full">{newFile ? newFile.name : existingFile ? "Mevcut Yüklü" : "Tıkla Yükle"}</span>
                              </div>
                          )})}
                      </div>
                  </div>
              </div>
              
              <div className="mt-4 md:mt-6 pt-4 border-t border-slate-100 shrink-0">
                  <Button onClick={handleEditSubmit} disabled={editUploading} className="w-full h-12 md:h-14 rounded-xl md:rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm md:text-base shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2">
                      {editUploading ? <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" /> : <Send className="h-4 w-4 md:h-5 md:w-5" />}
                      {editUploading ? "GÜNCELLENİYOR..." : "DEĞİŞİKLİKLERİ KAYDET"}
                  </Button>
              </div>
          </DialogContent>
      </Dialog>
    </div>
  )
}