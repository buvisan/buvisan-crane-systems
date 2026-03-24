"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { 
  UploadCloud, FileCog, Loader2, CheckCircle2, AlertTriangle, 
  Clock, Factory, FileText, Send, Layers, Hammer, Search, X, PlusCircle 
} from "lucide-react"

export default function ProjectPanelPage() {
  const [activeTab, setActiveTab] = useState("is_emri")
  const [loading, setLoading] = useState(false)
  const [dataList, setDataList] = useState<any[]>([]) 
  const supabase = createClient()

  // --- FORM STATELERİ ---
  const [customers, setCustomers] = useState<any[]>([])
  const [formData, setFormData] = useState({ customer_id: "", project_code: "", capacity: "" })
  const [files, setFiles] = useState<{ [key: string]: File | null }>({ kopru: null, yuruyus: null, kedi: null, direk: null })
  const [uploading, setUploading] = useState(false)

  // 🚀 AKILLI ARAMA STATELERİ
  const [customerSearch, setCustomerSearch] = useState("")
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false)
  const [addingCustomer, setAddingCustomer] = useState(false)

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    if (activeTab === "revize_talepleri") fetchRevisions()
    if (activeTab === "onay_listesi") fetchProjectsByStatus('ONAY_BEKLIYOR')
    if (activeTab === "gonderilenler") fetchProjectsByStatus('URETIMDE')
  }, [activeTab])

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, name').order('name', { ascending: true })
    if (data) setCustomers(data)
  }

  // 🚀 YENİ FİRMA EKLEME FONKSİYONU
  const handleAddNewCustomer = async () => {
      if(!customerSearch.trim()) return;
      setAddingCustomer(true);
      
      try {
          // Müşteriler (customers) tablosuna yeni firmayı ekle
          const { data, error } = await supabase
              .from('customers')
              .insert([{ name: customerSearch.trim() }])
              .select()
              .single()

          if (error) throw error;

          // Listeyi güncelle ve yeni eklenen firmayı formda seçili hale getir
          await fetchCustomers();
          setFormData(prev => ({...prev, customer_id: data.id.toString()}));
          setIsCustomerDropdownOpen(false);
          setCustomerSearch(""); // Arama kutusunu temizle
      } catch (error: any) {
          alert("Firma eklenirken hata oluştu: " + error.message);
      } finally {
          setAddingCustomer(false);
      }
  }

  // --- VERİ ÇEKME FONKSİYONLARI ---
  const fetchRevisions = async () => {
    setLoading(true)
    const { data } = await supabase.from('project_revisions')
        .select('*, projects(project_code, customers(name))')
        .order('created_at', { ascending: false })
    if (data) setDataList(data)
    setLoading(false)
  }

  const fetchProjectsByStatus = async (status: string) => {
    setLoading(true)
    const { data } = await supabase.from('projects')
        .select('*, customers(name)')
        .eq('status', status)
        .order('created_at', { ascending: false })
    if (data) setDataList(data)
    setLoading(false)
  }

  // --- REVIZE TAMAMLAMA ---
  const completeRevision = async (id: number) => {
    if(!confirm("Bu revizenin yapıldığını onaylıyor musunuz?")) return;
    
    const { error } = await supabase
        .from('project_revisions')
        .update({ status: 'YAPILDI' })
        .eq('id', id)

    if (!error) {
        fetchRevisions() 
    } else {
        alert("Hata: " + error.message)
    }
  }

  // --- DOSYA YÜKLEME ---
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
            customer_id: Number(formData.customer_id),
            project_code: formData.project_code,
            capacity: formData.capacity,
            status: 'ONAY_BEKLIYOR'
        }]).select().single()

        if (error) throw error

        const fileInserts = []
        for (const type of ['kopru', 'yuruyus', 'kedi', 'direk']) {
            const file = files[type]
            if (file) {
                const publicUrl = await uploadFileToSupabase(file, formData.project_code)
                fileInserts.push({ project_id: projectData.id, file_type: type.toUpperCase(), file_url: publicUrl })
            }
        }
        if (fileInserts.length > 0) await supabase.from('project_files').insert(fileInserts)

        alert("✅ İş Emri başarıyla oluşturuldu!")
        setFormData({ customer_id: "", project_code: "", capacity: "" })
        setFiles({ kopru: null, yuruyus: null, kedi: null, direk: null })
    } catch (error: any) {
        alert("Hata: " + error.message)
    } finally {
        setUploading(false)
    }
  }

  // Menü Konfigürasyonu
  const tabs = [
    { id: "is_emri", label: "İş Emri Oluştur", icon: <FileCog className="h-4 w-4" /> },
    { id: "revize_talepleri", label: "Revize Talepleri", icon: <AlertTriangle className="h-4 w-4" /> },
    { id: "onay_listesi", label: "Onay Listesi", icon: <Clock className="h-4 w-4" /> },
    { id: "gonderilenler", label: "Üretime İnenler", icon: <Factory className="h-4 w-4" /> },
  ]

  // Seçili müşterinin adını bul
  const selectedCustomerName = customers.find(c => c.id.toString() === formData.customer_id.toString())?.name || ""

  return (
    <div className="flex flex-col gap-8 font-sans max-w-[1200px] mx-auto w-full">
      
      {/* 🚀 ÜST BAŞLIK */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-5">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-2xl shadow-lg shadow-indigo-500/30">
                <Layers className="h-8 w-8 text-white" />
            </div>
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Mühendislik Paneli</h1>
                <p className="text-slate-500 font-medium text-sm mt-1">İş emirleri, teknik çizimler ve revize yönetim merkezi.</p>
            </div>
        </div>
      </div>

      {/* 🚀 YATAY AKIŞKAN MENÜ */}
      <div className="flex gap-2 p-2 bg-white/60 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                    activeTab === tab.id 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                    : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50'
                }`}
            >
                {tab.icon} {tab.label}
            </button>
        ))}
      </div>

      {/* 🚀 ANA İÇERİK ALANI */}
      <div className="relative">
          {loading && activeTab !== "is_emri" ? (
              <div className="flex h-64 items-center justify-center bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/50 shadow-sm">
                  <Loader2 className="animate-spin h-12 w-12 text-indigo-500" />
              </div>
          ) : (
              <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden">
                  
                  <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none"></div>

                  {/* 1. İŞ EMRİ OLUŞTURMA EKRANI */}
                  {activeTab === "is_emri" && (
                      <div className="flex flex-col gap-8 relative z-10 animate-in fade-in">
                          <div className="flex items-center gap-3 mb-2">
                              <Hammer className="h-6 w-6 text-indigo-600" />
                              <h2 className="text-2xl font-black text-slate-800">Yeni İş Emri Başlat</h2>
                          </div>

                          {/* Form Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-3">
                                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">İş Emri (Proje) No</Label>
                                  <Input placeholder="Örn: PRJ-2026-001" value={formData.project_code} onChange={(e) => setFormData({...formData, project_code: e.target.value})} className="h-14 rounded-2xl bg-white/80 border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 px-5 shadow-sm" />
                              </div>
                              <div className="space-y-3">
                                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kapasite</Label>
                                  <Input placeholder="Örn: 10 TON" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: e.target.value})} className="h-14 rounded-2xl bg-white/80 border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 px-5 shadow-sm" />
                              </div>
                              
                              {/* 🚀 SİHRİN GERÇEKLEŞTİĞİ YER: AKILLI MÜŞTERİ SEÇİCİ */}
                              <div className="space-y-3 md:col-span-2 relative">
                                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Müşteri / Firma</Label>
                                  
                                  {formData.customer_id ? (
                                      // 1. DURUM: BİR FİRMA SEÇİLDİYSE
                                      <div className="flex items-center justify-between h-14 rounded-2xl bg-indigo-50 border border-indigo-200 px-5 shadow-sm animate-in fade-in">
                                          <div className="flex items-center gap-3">
                                              <CheckCircle2 className="h-5 w-5 text-indigo-500" />
                                              <span className="font-black text-indigo-900">{selectedCustomerName}</span>
                                          </div>
                                          <button type="button" onClick={() => { setFormData({...formData, customer_id: ""}); setCustomerSearch(""); }} className="p-2 hover:bg-indigo-200 rounded-full text-indigo-500 transition-colors" title="Firmayı Değiştir">
                                              <X className="h-4 w-4" />
                                          </button>
                                      </div>
                                  ) : (
                                      // 2. DURUM: ARAMA EKRANI
                                      <div className="relative z-50">
                                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                          <Input 
                                              placeholder="Listeden ara veya yeni firma adını yazın..." 
                                              value={customerSearch}
                                              onChange={(e) => {
                                                  setCustomerSearch(e.target.value);
                                                  setIsCustomerDropdownOpen(true);
                                              }}
                                              onFocus={() => setIsCustomerDropdownOpen(true)}
                                              onBlur={() => setTimeout(() => setIsCustomerDropdownOpen(false), 200)} // Tıklanmayı algılamak için ufak gecikme
                                              className="pl-12 h-14 rounded-2xl bg-white/80 border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 pr-5 shadow-sm" 
                                          />
                                          
                                          {isCustomerDropdownOpen && (
                                              <div className="absolute w-full mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl max-h-60 overflow-y-auto p-2 animate-in fade-in slide-in-from-top-2">
                                                  
                                                  {/* Listede Filtreleme */}
                                                  {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
                                                      <button 
                                                          key={c.id}
                                                          type="button"
                                                          onClick={() => {
                                                              setFormData({...formData, customer_id: c.id.toString()});
                                                              setIsCustomerDropdownOpen(false);
                                                          }}
                                                          className="w-full text-left px-4 py-3 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                                                      >
                                                          {c.name}
                                                      </button>
                                                  ))}
                                                  
                                                  {/* EĞER FİRMA LİSTEDE YOKSA: YENİ EKLE BUTONU ÇIKAR */}
                                                  {customerSearch.trim() !== "" && !customers.some(c => c.name.toLowerCase() === customerSearch.trim().toLowerCase()) && (
                                                      <button
                                                          type="button"
                                                          onClick={handleAddNewCustomer}
                                                          disabled={addingCustomer}
                                                          className="w-full mt-1 flex items-center justify-between px-4 py-3 rounded-xl text-sm font-black text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors"
                                                      >
                                                          <span className="flex items-center gap-2">
                                                              {addingCustomer ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                                                              "{customerSearch}" yeni firma olarak kaydet
                                                          </span>
                                                          <span className="text-[10px] uppercase bg-emerald-200 px-2 py-1 rounded-md text-emerald-800">Tek Tıkla Ekle</span>
                                                      </button>
                                                  )}

                                                  {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && customerSearch === "" && (
                                                      <div className="px-4 py-3 text-sm font-medium text-slate-400 text-center">
                                                          Mevcut firmaları arayın veya eklemek için adını yazın.
                                                      </div>
                                                  )}
                                              </div>
                                          )}
                                      </div>
                                  )}
                              </div>
                          </div>

                          {/* Dosya Yükleme Alanı */}
                          <div className="mt-4">
                              <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 block">Teknik Çizimler / Proje Dosyaları (PDF)</Label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                  {['KOPRU', 'YURUYUS', 'KEDI', 'DIREK'].map((type) => {
                                      const fileKey = type.toLowerCase();
                                      const file = files[fileKey];
                                      return (
                                      <div key={type} className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-[2rem] transition-all group ${file ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-300 bg-white/50 hover:border-indigo-400 hover:bg-indigo-50/30'}`}>
                                          <input type="file" accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => setFiles({...files, [fileKey]: e.target.files?.[0] || null})} />
                                          
                                          <div className={`p-3 rounded-full mb-3 transition-colors ${file ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                                              {file ? <FileText className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
                                          </div>
                                          <span className={`font-black text-sm mb-1 ${file ? 'text-emerald-700' : 'text-slate-600 group-hover:text-indigo-700'}`}>{type}</span>
                                          
                                          <span className="text-[10px] font-bold text-slate-400 text-center px-2 truncate w-full">
                                              {file ? file.name : "Tıkla veya Sürükle"}
                                          </span>
                                      </div>
                                  )})}
                              </div>
                          </div>

                          <Button onClick={handleSubmit} disabled={uploading} className="w-full h-16 mt-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-lg shadow-xl shadow-slate-900/20 transition-all flex items-center justify-center gap-3">
                              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6 text-indigo-400" />}
                              {uploading ? "SİSTEME YÜKLENİYOR..." : "İŞ EMRİNİ ONAYA SUN"}
                          </Button>
                      </div>
                  )}

                  {/* 2. REVİZE TALEPLERİ */}
                  {activeTab === "revize_talepleri" && (
                      <div className="flex flex-col gap-6 relative z-10 animate-in fade-in">
                          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 mb-2"><AlertTriangle className="text-rose-500"/> Sahadan Gelen Revizeler</h2>
                          <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                  <thead>
                                      <tr className="border-b border-slate-200">
                                          <th className="pb-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Proje No</th>
                                          <th className="pb-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Revize Detayı</th>
                                          <th className="pb-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Durum</th>
                                          <th className="pb-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Aksiyon</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                      {dataList.map((item) => (
                                          <tr key={item.id} className="hover:bg-white/50 transition-colors group">
                                              <td className="py-5 px-4 font-mono font-bold text-indigo-600">{item.projects?.project_code}</td>
                                              <td className="py-5 px-4">
                                                  <p className="text-sm font-medium text-slate-700 max-w-md">{item.note}</p>
                                                  <span className="text-[10px] font-bold text-slate-400 mt-1 block">Bildiren: {item.reported_by}</span>
                                              </td>
                                              <td className="py-5 px-4">
                                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${item.status === 'BEKLIYOR' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                      {item.status === 'BEKLIYOR' && <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>}
                                                      {item.status === 'YAPILDI' && <CheckCircle2 className="h-3.5 w-3.5" />}
                                                      {item.status}
                                                  </span>
                                              </td>
                                              <td className="py-5 px-4 text-right">
                                                  {item.status === 'BEKLIYOR' && (
                                                      <Button size="sm" onClick={() => completeRevision(item.id)} className="h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-md shadow-emerald-500/20">
                                                          <CheckCircle2 className="mr-2 h-4 w-4" /> Yapıldı
                                                      </Button>
                                                  )}
                                              </td>
                                          </tr>
                                      ))}
                                      {dataList.length === 0 && <tr><td colSpan={4} className="py-10 text-center font-bold text-slate-400">Bekleyen revize yok.</td></tr>}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  )}

                  {/* 3. ONAY LİSTESİ */}
                  {activeTab === "onay_listesi" && (
                      <div className="flex flex-col gap-6 relative z-10 animate-in fade-in">
                          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 mb-2"><Clock className="text-amber-500"/> Üretim Onayı Bekleyenler</h2>
                          <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                  <thead>
                                      <tr className="border-b border-slate-200">
                                          <th className="pb-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">İş Emri</th>
                                          <th className="pb-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Müşteri / Firma</th>
                                          <th className="pb-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Durum</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                      {dataList.map((item) => (
                                          <tr key={item.id} className="hover:bg-white/50 transition-colors">
                                              <td className="py-5 px-4 font-mono font-bold text-slate-800">{item.project_code}</td>
                                              <td className="py-5 px-4 font-bold text-slate-600">{item.customers?.name}</td>
                                              <td className="py-5 px-4 text-right">
                                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-700">
                                                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span> Onay Bekliyor
                                                  </span>
                                              </td>
                                          </tr>
                                      ))}
                                      {dataList.length === 0 && <tr><td colSpan={3} className="py-10 text-center font-bold text-slate-400">Onay bekleyen proje yok.</td></tr>}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  )}

                  {/* 4. GÖNDERİLENLER (ÜRETİMDE) */}
                  {activeTab === "gonderilenler" && (
                      <div className="flex flex-col gap-6 relative z-10 animate-in fade-in">
                          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 mb-2"><Factory className="text-emerald-500"/> Sahaya İnen İşler (Üretimde)</h2>
                          <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                  <thead>
                                      <tr className="border-b border-slate-200">
                                          <th className="pb-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">İş Emri</th>
                                          <th className="pb-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Müşteri / Firma</th>
                                          <th className="pb-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Durum</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                      {dataList.map((item) => (
                                          <tr key={item.id} className="hover:bg-white/50 transition-colors">
                                              <td className="py-5 px-4 font-mono font-bold text-slate-800">{item.project_code}</td>
                                              <td className="py-5 px-4 font-bold text-slate-600">{item.customers?.name}</td>
                                              <td className="py-5 px-4 text-right">
                                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-700">
                                                      <Factory className="h-3.5 w-3.5" /> Üretimde
                                                  </span>
                                              </td>
                                          </tr>
                                      ))}
                                      {dataList.length === 0 && <tr><td colSpan={3} className="py-10 text-center font-bold text-slate-400">Üretimde olan iş yok.</td></tr>}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  )}

              </div>
          )}
      </div>
    </div>
  )
}