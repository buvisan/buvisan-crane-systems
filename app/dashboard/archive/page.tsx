"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
    ArchiveRestore, Search, Loader2, CheckCircle2, 
    AlertTriangle, PackageMinus, Clock, Hammer, CalendarDays, ArrowRight
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function ArchivePage() {
    const [projects, setProjects] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    const [selectedProject, setSelectedProject] = useState<any>(null)
    const [timelineEvents, setTimelineEvents] = useState<any[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)

    const supabase = createClient()

    useEffect(() => {
        fetchCompletedProjects()
    }, [])

    const fetchCompletedProjects = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*, customers(name)')
                .eq('status', 'TAMAMLANDI') 
                .order('created_at', { ascending: false }) // 🚀 HATA BURADAYDI! updated_at yerine created_at yapıldı.
            
            if (error) throw error
            if (data) setProjects(data)
        } catch (error: any) {
            console.error("Arşiv Çekme Hatası:", error)
            alert("Sistem Hatası: Arşiv verileri çekilemedi! \n\n" + error.message)
        } finally {
            setLoading(false)
        }
    }

    const openProjectHistory = async (project: any) => {
        setSelectedProject(project)
        setHistoryLoading(true)
        setTimelineEvents([]) 

        const events: any[] = []

        events.push({
            id: 'start',
            type: 'START',
            date: project.created_at,
            title: 'Proje Başlatıldı',
            description: 'İş emri oluşturuldu ve onaya sunuldu.',
            icon: <Hammer className="h-5 w-5 text-blue-500" />,
            color: 'bg-blue-100 border-blue-200'
        })

        const { data: revisions } = await supabase.from('project_revisions').select('*').eq('project_id', project.id)
        if (revisions) {
            revisions.forEach(rev => {
                events.push({
                    id: `rev-${rev.id}`,
                    type: 'REVISION',
                    date: rev.created_at,
                    title: 'Revize Talebi',
                    description: rev.note,
                    user: rev.reported_by,
                    icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
                    color: 'bg-amber-100 border-amber-200'
                })
            })
        }

        const { data: missing } = await supabase.from('missing_materials').select('*').eq('project_id', project.id)
        if (missing) {
            missing.forEach(miss => {
                events.push({
                    id: `miss-${miss.id}`,
                    type: 'MISSING',
                    date: miss.created_at,
                    title: 'Eksik Malzeme Talebi',
                    description: `${miss.quantity} Adet ${miss.product_name} talep edildi.`,
                    user: 'Saha Personeli',
                    icon: <PackageMinus className="h-5 w-5 text-rose-500" />,
                    color: 'bg-rose-100 border-rose-200'
                })
            })
        }

        // Bitiş tarihi olarak şimdilik created_at + 1 dakika koyalım ki sıralama bozulmasın (çünkü updated_at yok)
        const endDate = new Date(project.created_at)
        endDate.setMinutes(endDate.getMinutes() + 1)

        events.push({
            id: 'end',
            type: 'END',
            date: endDate.toISOString(),
            title: 'Üretim Tamamlandı',
            description: 'Proje başarıyla bitirildi ve arşive kaldırıldı.',
            icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
            color: 'bg-emerald-100 border-emerald-200'
        })

        events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        setTimelineEvents(events)
        setHistoryLoading(false)
    }

    const filteredProjects = projects.filter(p => 
        p.project_code?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="flex flex-col gap-6 md:gap-8 max-w-[1400px] mx-auto w-full font-sans pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 md:gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-5 md:p-6 rounded-[2rem] shadow-sm flex-1">
                    <div className="bg-gradient-to-br from-slate-700 to-slate-900 p-3 md:p-4 rounded-2xl shadow-lg shadow-slate-900/30 shrink-0">
                        <ArchiveRestore className="h-6 w-6 md:h-8 md:w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-3xl font-black tracking-tight text-slate-900">Üretim Arşivi (Biten İşler)</h1>
                        <p className="text-slate-500 font-medium text-xs md:text-sm mt-1">Tamamlanan projelerin geçmiş şeceresi ve olay günlüğü.</p>
                    </div>
                </div>
                
                <div className="relative w-full md:w-80 shrink-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input placeholder="Proje No veya Firma Ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-11 h-14 md:h-16 bg-white/80 border-white/50 text-sm font-bold text-slate-700 shadow-sm rounded-[1.5rem] md:rounded-[2rem] focus:ring-2 focus:ring-slate-500 w-full" />
                </div>
            </div>

            <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden w-full">
                <div className="overflow-x-auto custom-scrollbar p-2">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead className="bg-slate-900 text-white">
                            <tr>
                                <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-[11px] font-black uppercase tracking-widest rounded-tl-2xl">Bitiş Tarihi</th>
                                <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-[11px] font-black uppercase tracking-widest">İş Emri No</th>
                                <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-[11px] font-black uppercase tracking-widest">Firma / Müşteri</th>
                                <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-[11px] font-black uppercase tracking-widest">Kapasite</th>
                                <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-right rounded-tr-2xl">Arşivi İncele</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredProjects.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors bg-white group cursor-pointer" onClick={() => openProjectHistory(p)}>
                                    <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold text-slate-500">{new Date(p.created_at).toLocaleDateString('tr-TR')}</td>
                                    <td className="px-4 md:px-6 py-3 md:py-4 font-mono font-black text-slate-700">{p.project_code}</td>
                                    <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-black text-slate-900 truncate max-w-[200px]">{p.customers?.name}</td>
                                    <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold text-slate-600">{p.capacity}</td>
                                    <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                                        <Button variant="outline" size="sm" className="h-9 md:h-10 text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                            Şecereyi Gör <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {filteredProjects.length === 0 && !loading && (
                                <tr><td colSpan={5} className="py-16 md:py-20 text-center"><div className="flex flex-col items-center gap-3"><div className="bg-slate-50 p-4 md:p-5 rounded-full shadow-sm"><ArchiveRestore className="h-8 w-8 md:h-10 md:w-10 text-slate-300" /></div><p className="text-base md:text-lg font-bold text-slate-500">Arşivde henüz bitmiş proje bulunmuyor.</p></div></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={selectedProject !== null} onOpenChange={(isOpen) => !isOpen && setSelectedProject(null)}>
                <DialogContent className="rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 max-w-[90vw] md:max-w-[700px] border-none shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                    <DialogHeader className="shrink-0 mb-4">
                        <DialogTitle className="text-xl md:text-3xl font-black text-slate-800 flex items-center gap-2 md:gap-3">
                            <ArchiveRestore className="h-6 w-6 md:h-8 md:w-8 text-slate-500" /> Proje Şeceresi
                        </DialogTitle>
                        <p className="text-xs md:text-sm font-bold text-slate-500 mt-2">
                            <span className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{selectedProject?.project_code}</span> nolu projenin üretim geçmişi
                        </p>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 md:pr-4">
                        {historyLoading ? (
                            <div className="flex justify-center py-10"><Loader2 className="animate-spin h-10 w-10 text-slate-400" /></div>
                        ) : (
                            <div className="relative border-l-2 border-slate-200 ml-4 md:ml-6 space-y-8 py-4">
                                {timelineEvents.map((event, index) => (
                                    <div key={event.id} className="relative pl-8 md:pl-10">
                                        <div className={`absolute -left-[17px] md:-left-[21px] top-0 h-8 w-8 md:h-10 md:w-10 rounded-full border-4 border-white flex items-center justify-center shadow-sm z-10 ${event.color}`}>
                                            {event.icon}
                                        </div>
                                        
                                        <div className="bg-white border border-slate-100 shadow-sm p-4 md:p-5 rounded-2xl flex flex-col gap-2 relative group hover:shadow-md hover:border-slate-200 transition-all">
                                            <div className="flex items-start justify-between gap-4">
                                                <h3 className="font-black text-slate-800 text-sm md:text-base">{event.title}</h3>
                                                <div className="flex flex-col items-end text-right shrink-0">
                                                    <span className="text-[10px] md:text-xs font-bold text-slate-400 flex items-center gap-1"><CalendarDays className="h-3 w-3"/>{new Date(event.date).toLocaleDateString('tr-TR')}</span>
                                                    <span className="text-[9px] md:text-[10px] font-black text-slate-300 flex items-center gap-1"><Clock className="h-3 w-3"/>{new Date(event.date).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'})}</span>
                                                </div>
                                            </div>
                                            <p className="text-xs md:text-sm font-medium text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                {event.description}
                                            </p>
                                            {event.user && (
                                                <p className="text-[10px] md:text-xs font-bold text-slate-400 mt-1">Bildiren: {event.user}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    )
}