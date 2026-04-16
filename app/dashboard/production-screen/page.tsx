"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
    HardHat, FileText, AlertTriangle, MessageSquare, 
    CheckCircle2, ExternalLink, Loader2, PlayCircle, MonitorStop, Search, Factory, Link as LinkIcon, ChevronDown, Building2
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog"

export default function ProductionScreenPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("") 
  const supabase = createClient()

  const [missingItem, setMissingItem] = useState({ name: "", qty: "" })
  const [revisionNote, setRevisionNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [activeDialog, setActiveDialog] = useState<string | null>(null)

  // 🚀 AÇILIR KAPANIR (ACCORDION) HAFIZASI
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    const { data } = await supabase
        .from('projects')
        .select('*, customers(name), project_files(*)')
        .eq('status', 'URETIMDE')
        .order('created_at', { ascending: false })
    
    if (data) setProjects(data)
    setLoading(false)
  }

  const reportMissing = async (projectId: number) => {
    if (!missingItem.name) { alert("Lütfen malzeme adı giriniz."); return; }
    
    setSubmitting(true)
    try {
        const { data: { user } } = await supabase.auth.getUser()
        
        const { error } = await supabase.from('missing_materials').insert([{
            project_id: projectId,
            product_name: missingItem.name,
            quantity: Number(missingItem.qty) || 1,
            status: 'TALEP_ACILDI',
            reported_by: user ? user.id : null 
        }])
        
        if (error) throw error

        alert("✅ Eksik malzeme Satın Alma birimine iletildi!")
        setMissingItem({ name: "", qty: "" }) 
        setActiveDialog(null) 
    } catch (error: any) {
        alert("Hata: " + error.message)
    } finally {
        setSubmitting(false)
    }
  }

  const requestRevision = async (projectId: number) => {
    if (!revisionNote) { alert("Lütfen revize detayı yazınız."); return; }

    setSubmitting(true)
    const { error } = await supabase.from('project_revisions').insert([{
        project_id: projectId,
        note: revisionNote,
        status: 'BEKLIYOR',
        reported_by: 'Üretim Sahası'
    }])
    setSubmitting(false)

    if (!error) {
        alert("✅ Revize talebi Proje Ekibine iletildi!")
        setRevisionNote("") 
        setActiveDialog(null) 
    } else {
        alert("Hata: " + error.message)
    }
  }

  const completeProject = async (project: any) => {
    if(!confirm("⚠️ DİKKAT!\n\nBu işin üretimi bitti mi? Proje Üretim Arşivi ekranına aktarılacak.")) return;
    
    setSubmitting(true)
    try {
        const { error } = await supabase.from('projects').update({ status: 'TAMAMLANDI' }).eq('id', project.id)
        if (error) throw error

        alert("✅ Proje başarıyla tamamlandı ve 'Üretim Arşivi' ekranına düştü! 🚀")
        fetchProjects()
    } catch (e: any) {
        alert("Proje tamamlanırken hata oluştu: " + e.message)
    } finally {
        setSubmitting(false)
    }
  }

  const toggleGroup = (customerName: string) => {
      setExpandedGroups(prev => prev.includes(customerName) ? prev.filter(g => g !== customerName) : [...prev, customerName])
  }

  // 🚀 FİRMAYA GÖRE AKILLI GRUPLAMA MOTORU
  const getGroupedProjects = () => {
      const filtered = projects.filter(p => 
          p.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          p.project_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.capacity?.toLowerCase().includes(searchTerm.toLowerCase())
      )

      const grouped: Record<string, any[]> = {}
      
      filtered.forEach(p => {
          const customerName = p.customers?.name || "Bilinmeyen Müşteri"
          if (!grouped[customerName]) grouped[customerName] = []
          grouped[customerName].push(p)
      })

      return grouped
  }

  const groupedProjects = getGroupedProjects()

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-blue-600" /></div>

  return (
    <div className="flex flex-col gap-6 font-sans max-w-[1600px] mx-auto w-full pb-10">
      
      {/* 🚀 ÜST BAŞLIK & ARAMA ALANI */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-white/80 backdrop-blur-xl border border-slate-200 p-5 rounded-3xl shadow-sm gap-4">
          <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/30">
                  <Factory className="h-6 w-6 text-white" />
              </div>
              <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-0.5">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Üretim Kontrol Merkezi</span>
                  </div>
                  <h1 className="text-xl md:text-2xl font-black text-slate-800">Saha Görev Paneli</h1>
              </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                      placeholder="Firma Adı veya Proje No Ara..." 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      className="pl-10 h-12 bg-slate-50 border-slate-200 rounded-xl text-sm font-bold text-slate-700 shadow-inner focus:ring-blue-500" 
                  />
              </div>
              <div className="hidden md:flex flex-col items-center justify-center bg-blue-50 border border-blue-100 px-4 h-12 rounded-xl shrink-0">
                  <span className="text-xl font-black text-blue-700 leading-none">{projects.length}</span>
                  <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Aktif İş</span>
              </div>
          </div>
      </div>

      {/* 🚀 GRUPLANMIŞ LİSTE (ACCORDION) */}
      <div className="flex flex-col gap-4">
          {Object.entries(groupedProjects).map(([customerName, groupItems]) => {
              const isExpanded = expandedGroups.includes(customerName) || searchTerm !== ""; // Arama yapılıyorsa otomatik açılır

              return (
              <div key={customerName} className="flex flex-col bg-white border border-slate-200 rounded-[1.5rem] shadow-sm overflow-hidden transition-all duration-300">
                  
                  {/* GRUP BAŞLIĞI */}
                  <div 
                      onClick={() => toggleGroup(customerName)}
                      className="flex items-center justify-between p-4 md:p-5 cursor-pointer bg-slate-50/50 hover:bg-blue-50/50 transition-colors select-none group"
                  >
                      <div className="flex items-center gap-3 md:gap-4">
                          <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600 shadow-inner"><Building2 className="h-5 w-5 md:h-6 md:w-6" /></div>
                          <div className="flex flex-col">
                              <h2 className="font-black text-base md:text-xl text-slate-800 group-hover:text-blue-700 transition-colors">{customerName}</h2>
                              <div className="flex items-center gap-2 mt-1">
                                  <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">{groupItems.length} İş Emri</span>
                                  <span className="text-[10px] font-bold text-slate-400 hidden sm:inline">Üretime Devam Ediyor</span>
                              </div>
                          </div>
                      </div>
                      <div className={`p-2 rounded-full transition-all duration-300 ${isExpanded ? 'bg-blue-100 text-blue-600 rotate-180' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-50'}`}>
                          <ChevronDown className="h-5 w-5" />
                      </div>
                  </div>

                  {/* İÇERİK (AÇILIR KAPANIR İNCE SATIRLAR) */}
                  <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                      <div className="overflow-hidden">
                          <div className="flex flex-col divide-y divide-slate-100 border-t border-slate-100">
                              {groupItems.map((project) => (
                                  <div key={project.id} className="flex flex-col xl:flex-row xl:items-center justify-between p-4 md:p-5 gap-4 hover:bg-slate-50/80 transition-colors">
                                      
                                      {/* SOL TARAF: PROJE BİLGİSİ */}
                                      <div className="flex flex-col gap-1.5 flex-1">
                                          <div className="flex items-center gap-2">
                                              <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded text-[10px] font-black font-mono flex items-center gap-1 w-max shadow-sm">
                                                  <LinkIcon className="h-3 w-3" /> {project.project_code}
                                              </span>
                                              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><MonitorStop className="h-3 w-3" /> KIOSK-1</span>
                                          </div>
                                          <span className="text-sm md:text-base font-bold text-slate-800 leading-snug">{project.capacity}</span>
                                          <span className="text-[10px] font-bold text-slate-400">İşe Başlama: {new Date(project.created_at).toLocaleDateString('tr-TR')}</span>
                                      </div>

                                      {/* SAĞ TARAF: AKSİYON BUTONLARI (YAN YANA) */}
                                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                                          
                                          {/* DOSYALAR */}
                                          <Dialog>
                                              <DialogTrigger asChild>
                                                  <Button variant="outline" className="h-10 text-[11px] font-bold rounded-xl border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                                                      <FileText className="h-3.5 w-3.5 mr-1.5" /> Dosyalar
                                                  </Button>
                                              </DialogTrigger>
                                              <DialogContent className="rounded-[2rem] p-6 max-w-[600px] border-none shadow-2xl">
                                                  <DialogHeader><DialogTitle className="text-xl font-black text-slate-800 mb-2">Proje Dosyaları ({project.project_code})</DialogTitle></DialogHeader>
                                                  <div className="grid gap-3 py-2 overflow-y-auto max-h-[50vh] custom-scrollbar">
                                                      {project.project_files?.map((file: any) => (
                                                          <a key={file.id} href={file.file_url} target="_blank" className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all group">
                                                              <span className="font-bold text-sm text-slate-700 group-hover:text-blue-700 uppercase">{file.file_type.replace('_', ' ')}</span>
                                                              <ExternalLink className="h-5 w-5 text-slate-400 group-hover:text-blue-600" />
                                                          </a>
                                                      ))}
                                                      {(!project.project_files || project.project_files.length === 0) && (
                                                          <div className="text-center py-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                                              <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                                                              <p className="text-sm font-bold text-slate-500">Mühendislik departmanı dosya yüklememiş.</p>
                                                          </div>
                                                      )}
                                                  </div>
                                              </DialogContent>
                                          </Dialog>

                                          {/* EKSİK BİLDİR */}
                                          <Dialog open={activeDialog === `missing-${project.id}`} onOpenChange={(isOpen) => setActiveDialog(isOpen ? `missing-${project.id}` : null)}>
                                              <DialogTrigger asChild>
                                                  <Button variant="outline" className="h-10 text-[11px] font-bold rounded-xl border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors">
                                                      <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Eksik Yaz
                                                  </Button>
                                              </DialogTrigger>
                                              <DialogContent className="rounded-[2rem] p-6 border-none shadow-2xl">
                                                  <DialogHeader><DialogTitle className="text-xl font-black text-slate-800 mb-2">Eksik Malzeme Talebi</DialogTitle></DialogHeader>
                                                  <div className="flex flex-col gap-4 py-2">
                                                      <div className="space-y-1.5">
                                                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Malzeme Adı</span>
                                                          <Input placeholder="Örn: M16 Civata" className="h-12 rounded-xl bg-slate-50 border border-slate-200 font-bold" value={missingItem.name} onChange={(e) => setMissingItem({...missingItem, name: e.target.value})} />
                                                      </div>
                                                      <div className="space-y-1.5">
                                                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Adet</span>
                                                          <Input type="number" placeholder="10" className="h-12 rounded-xl bg-slate-50 border border-slate-200 font-bold" value={missingItem.qty} onChange={(e) => setMissingItem({...missingItem, qty: e.target.value})} />
                                                      </div>
                                                      <Button onClick={() => reportMissing(project.id)} disabled={submitting} className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-md mt-2 font-black">
                                                          {submitting ? "İLETİLİYOR..." : "SATIN ALMAYA BİLDİR"}
                                                      </Button>
                                                  </div>
                                              </DialogContent>
                                          </Dialog>

                                          {/* REVİZE İSTE */}
                                          <Dialog open={activeDialog === `revision-${project.id}`} onOpenChange={(isOpen) => setActiveDialog(isOpen ? `revision-${project.id}` : null)}>
                                              <DialogTrigger asChild>
                                                  <Button variant="outline" className="h-10 text-[11px] font-bold rounded-xl border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors">
                                                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Revize İste
                                                  </Button>
                                              </DialogTrigger>
                                              <DialogContent className="rounded-[2rem] p-6 border-none shadow-2xl">
                                                  <DialogHeader><DialogTitle className="text-xl font-black text-slate-800 mb-2">Proje Revize Talebi</DialogTitle></DialogHeader>
                                                  <div className="flex flex-col gap-4 py-2">
                                                      <div className="space-y-1.5">
                                                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sorun / Talep Nedir?</span>
                                                          <Textarea placeholder="Sorunu veya eksik çizimi buraya yazın..." className="h-32 p-4 rounded-xl bg-slate-50 border border-slate-200 font-medium resize-none text-sm" value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} />
                                                      </div>
                                                      <Button onClick={() => requestRevision(project.id)} disabled={submitting} className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md font-black">
                                                          {submitting ? "İLETİLİYOR..." : "MÜHENDİSE GÖNDER"}
                                                      </Button>
                                                  </div>
                                              </DialogContent>
                                          </Dialog>

                                          {/* İŞİ BİTİR (Ana Aksiyon - En Sağda Belirgin) */}
                                          <Button onClick={() => completeProject(project)} disabled={submitting} className="h-10 px-4 text-xs font-black rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 transition-transform active:scale-95 ml-auto xl:ml-2 w-full sm:w-auto mt-2 sm:mt-0">
                                              {submitting ? <Loader2 className="animate-spin mr-1.5 h-4 w-4" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />} 
                                              {submitting ? "BİTİRİLİYOR..." : "ÜRETİMİ TAMAMLA"}
                                          </Button>

                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          )})}
      </div>
      
      {Object.keys(groupedProjects).length === 0 && !loading && (
          <div className="col-span-full text-center p-12 bg-white border border-slate-200 rounded-[2rem] shadow-sm">
              <div className="bg-slate-50 p-4 rounded-full w-max mx-auto mb-3"><PlayCircle className="h-10 w-10 text-slate-400" /></div>
              <h2 className="text-lg md:text-xl font-black text-slate-700">Üretimde İş Yok</h2>
              <p className="text-sm text-slate-500 mt-1">Ekrana düşen aktif bir iş emri bulunmuyor veya arama sonucu boş.</p>
          </div>
      )}
    </div>
  )
}