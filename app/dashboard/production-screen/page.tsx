"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
    HardHat, FileText, AlertTriangle, MessageSquare, 
    CheckCircle2, ExternalLink, Loader2, Activity, PlayCircle, MonitorStop
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog"

export default function ProductionScreenPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const [missingItem, setMissingItem] = useState({ name: "", qty: "" })
  const [revisionNote, setRevisionNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [activeDialog, setActiveDialog] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
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
    if(!confirm("⚠️ DİKKAT!\n\nBu işin üretimi bitti mi? Proje Satışlar ekranına aktarılacak.")) return;
    
    setSubmitting(true)
    await supabase.from('projects').update({ status: 'TAMAMLANDI' }).eq('id', project.id)

    await supabase.from('sales_orders').insert([{
        customer_id: project.customer_id,
        sale_date: new Date().toISOString(),
        status: 'BEKLIYOR', 
        total_amount: 0 
    }])

    alert("✅ Proje tamamlandı ve Satışlar ekranına düştü! 🚀")
    setSubmitting(false)
    fetchProjects()
  }

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="animate-spin h-10 w-10 md:h-14 md:w-14 text-blue-600" /></div>

  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-10 md:pb-20 font-sans max-w-[1600px] mx-auto w-full">
      
      {/* 🚀 DOKUNMATİK EKRAN ÜST BAŞLIĞI */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl shadow-blue-900/20 text-white relative overflow-hidden text-center md:text-left gap-6 md:gap-0">
        <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-4 md:gap-6">
            <div className="bg-blue-600/30 p-3 md:p-4 rounded-2xl md:rounded-3xl border border-blue-500/50 backdrop-blur-md shrink-0">
                <HardHat className="h-8 w-8 md:h-12 md:w-12 text-blue-400" />
            </div>
            <div className="flex flex-col items-center md:items-start">
                <div className="flex items-center gap-2 md:gap-3 mb-1">
                    <div className="h-2 w-2 md:h-3 md:w-3 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] animate-pulse"></div>
                    <span className="text-emerald-400 font-bold tracking-widest text-xs md:text-sm uppercase">Saha Paneli Aktif</span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">ÜRETİM EKRANI</h1>
            </div>
        </div>
        <div className="relative z-10 text-center md:text-right bg-white/10 p-4 md:p-5 rounded-2xl md:rounded-3xl border border-white/20 backdrop-blur-md w-full md:w-auto">
            <span className="block text-4xl md:text-5xl font-black text-white">{projects.length}</span>
            <span className="block text-xs md:text-sm font-bold text-blue-200 uppercase tracking-widest mt-1">Aktif İş Emri</span>
        </div>
      </div>

      {/* 🚀 KART LİSTESİ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
        {projects.map((project) => (
            <div key={project.id} className="relative bg-white/70 backdrop-blur-2xl border border-white/60 shadow-xl shadow-slate-200/50 rounded-[2rem] md:rounded-[3rem] p-5 sm:p-6 md:p-10 flex flex-col group transition-all duration-300 hover:shadow-2xl hover:border-blue-200">
                
                {/* PROJE BİLGİSİ */}
                <div className="flex flex-col gap-3 mb-6 md:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4">
                        <span className="px-3 md:px-4 py-1 md:py-1.5 rounded-lg md:rounded-xl bg-blue-100 text-blue-700 font-mono font-black text-lg md:text-xl border border-blue-200 shadow-inner w-max">
                            {project.project_code}
                        </span>
                        <div className="flex items-center gap-2 text-slate-400 font-bold text-xs md:text-sm">
                            <MonitorStop className="h-4 w-4 md:h-5 md:w-5" /> KIOSK-1
                        </div>
                    </div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 leading-tight">
                        {project.customers?.name}
                    </h2>
                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 md:gap-4 text-slate-600 mt-2">
                        <span className="flex items-center gap-2 bg-slate-100 px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl text-sm md:text-lg font-bold w-max">
                            Kapasite: <span className="text-slate-900">{project.capacity}</span>
                        </span>
                        <span className="flex items-center gap-2 bg-slate-100 px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl text-sm md:text-lg font-bold w-max">
                            Giriş: <span className="text-slate-900">{new Date(project.created_at).toLocaleDateString('tr-TR')}</span>
                        </span>
                    </div>
                </div>

                {/* DOKUNMATİK AKSİYON BUTONLARI (2x2 GRID) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mt-auto">
                    
                    {/* DOSYALAR */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="h-16 md:h-20 text-base md:text-xl font-bold rounded-xl md:rounded-2xl border-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                <FileText className="mr-2 md:mr-3 h-6 w-6 md:h-8 md:w-8" /> Proje Dosyaları
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 max-w-[90vw] md:max-w-[600px] border-none shadow-2xl">
                            <DialogHeader><DialogTitle className="text-xl md:text-3xl font-black text-slate-800 mb-2 md:mb-4">Proje Dosyaları</DialogTitle></DialogHeader>
                            <div className="grid gap-3 md:gap-4 py-2 md:py-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
                                {project.project_files?.map((file: any) => (
                                    <a key={file.id} href={file.file_url} target="_blank" className="flex items-center justify-between p-4 md:p-6 bg-slate-50 rounded-xl md:rounded-2xl border-2 border-slate-100 hover:border-blue-400 hover:bg-blue-50 transition-all group">
                                        <span className="font-bold text-sm md:text-xl text-slate-700 group-hover:text-blue-700">{file.file_type} İŞ EMRİ</span>
                                        <ExternalLink className="h-6 w-6 md:h-8 md:w-8 text-slate-400 group-hover:text-blue-600" />
                                    </a>
                                ))}
                                {(!project.project_files || project.project_files.length === 0) && (
                                    <div className="text-center py-6 md:py-10 bg-slate-50 rounded-[1.5rem] md:rounded-3xl border-2 border-dashed border-slate-200">
                                        <FileText className="h-10 w-10 md:h-16 md:w-16 text-slate-300 mx-auto mb-2 md:mb-3" />
                                        <p className="text-base md:text-xl font-bold text-slate-500">Dosya bulunamadı.</p>
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* EKSİK BİLDİR */}
                    <Dialog open={activeDialog === `missing-${project.id}`} onOpenChange={(isOpen) => setActiveDialog(isOpen ? `missing-${project.id}` : null)}>
                        <DialogTrigger asChild>
                            <Button className="h-16 md:h-20 text-base md:text-xl font-bold rounded-xl md:rounded-2xl border-2 border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-500 hover:text-white transition-all shadow-sm">
                                <AlertTriangle className="mr-2 md:mr-3 h-6 w-6 md:h-8 md:w-8" /> Eksik Bildir
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 max-w-[90vw] md:max-w-[500px] border-none shadow-2xl">
                            <DialogHeader><DialogTitle className="text-xl md:text-3xl font-black text-slate-800 mb-2">Eksik Malzeme Bildirimi</DialogTitle></DialogHeader>
                            <div className="flex flex-col gap-4 md:gap-6 py-2 md:py-4">
                                <div className="space-y-2 md:space-y-3">
                                    <span className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-widest">Malzeme Adı</span>
                                    <Input placeholder="Örn: M16 Civata" className="h-14 md:h-16 text-base md:text-xl rounded-xl md:rounded-2xl bg-slate-50 border-2 font-bold px-4 md:px-5" value={missingItem.name} onChange={(e) => setMissingItem({...missingItem, name: e.target.value})} />
                                </div>
                                <div className="space-y-2 md:space-y-3">
                                    <span className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-widest">Adet</span>
                                    <Input type="number" placeholder="10" className="h-14 md:h-16 text-base md:text-xl rounded-xl md:rounded-2xl bg-slate-50 border-2 font-bold px-4 md:px-5" value={missingItem.qty} onChange={(e) => setMissingItem({...missingItem, qty: e.target.value})} />
                                </div>
                                <Button onClick={() => reportMissing(project.id)} disabled={submitting} className="w-full h-14 md:h-16 text-base md:text-xl rounded-xl md:rounded-2xl bg-orange-500 hover:bg-orange-600 text-white shadow-xl shadow-orange-500/30 mt-2 md:mt-4 font-black">
                                    {submitting ? "GÖNDERİLİYOR..." : "TALEBİ İLET"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* REVİZE İSTE */}
                    <Dialog open={activeDialog === `revision-${project.id}`} onOpenChange={(isOpen) => setActiveDialog(isOpen ? `revision-${project.id}` : null)}>
                        <DialogTrigger asChild>
                            <Button className="h-16 md:h-20 text-base md:text-xl font-bold rounded-xl md:rounded-2xl border-2 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                                <MessageSquare className="mr-2 md:mr-3 h-6 w-6 md:h-8 md:w-8" /> Revize İste
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 max-w-[90vw] md:max-w-[600px] border-none shadow-2xl">
                            <DialogHeader><DialogTitle className="text-xl md:text-3xl font-black text-slate-800 mb-2">Revize Talebi</DialogTitle></DialogHeader>
                            <div className="flex flex-col gap-4 md:gap-6 py-2 md:py-4">
                                <div className="space-y-2 md:space-y-3">
                                    <span className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-widest">Sorun / Talep Nedir?</span>
                                    <Textarea placeholder="Sorunu buraya detaylıca yazın..." className="h-32 md:h-40 text-base md:text-xl p-4 md:p-5 rounded-2xl md:rounded-3xl bg-slate-50 border-2 font-medium resize-none" value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} />
                                </div>
                                <Button onClick={() => requestRevision(project.id)} disabled={submitting} className="w-full h-14 md:h-16 text-base md:text-xl rounded-xl md:rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/30 mt-2 font-black">
                                    {submitting ? "İLETİLİYOR..." : "REVİZE TALEBİNİ GÖNDER"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* İŞİ BİTİR (Ana Aksiyon) */}
                    <Button onClick={() => completeProject(project)} className="h-16 md:h-20 text-xl md:text-2xl font-black rounded-xl md:rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/30 transition-all border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 sm:col-span-2">
                        <CheckCircle2 className="mr-2 md:mr-3 h-6 w-6 md:h-8 md:w-8" /> İŞİ BİTİR
                    </Button>

                </div>
            </div>
        ))}
        
        {projects.length === 0 && !loading && (
            <div className="col-span-full text-center p-12 md:p-20 bg-white/50 backdrop-blur-md rounded-[2rem] md:rounded-[3rem] border-2 border-dashed border-slate-300">
                <PlayCircle className="h-16 w-16 md:h-24 md:w-24 text-slate-300 mx-auto mb-4 md:mb-6" />
                <h2 className="text-2xl md:text-4xl font-black text-slate-600">Üretimde İş Yok</h2>
                <p className="text-base md:text-xl text-slate-500 mt-2">Şu an aktif bir iş emri bulunmuyor. Çay molası! ☕</p>
            </div>
        )}
      </div>
    </div>
  )
}