"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, FileText, Factory, AlertCircle, ExternalLink } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function ManufacturingDashboard() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    const { data } = await supabase
        .from('projects')
        .select('*, customers(name), project_files(*)')
        .eq('status', 'ONAY_BEKLIYOR')
        .order('created_at', { ascending: false })
    
    if (data) setProjects(data)
    setLoading(false)
  }

  const approveProject = async (id: number) => {
    if(!confirm("Bu projeyi üretime göndermek istediğinize emin misiniz?")) return;

    const { error } = await supabase
        .from('projects')
        .update({ status: 'URETIMDE' })
        .eq('id', id)

    if (error) {
        alert("Hata: " + error.message)
    } else {
        alert("Proje onaylandı ve üretim ekranına düştü! 🚀")
        fetchProjects()
    }
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 font-sans max-w-[1600px] mx-auto w-full pb-10">
      
      {/* 🚀 ÜST BİLGİ KARTI (Mobil Uyumlu) */}
      <Card className="border-l-4 md:border-l-8 border-l-yellow-500 shadow-sm bg-yellow-50/50 rounded-xl md:rounded-[2rem] overflow-hidden">
        <CardContent className="p-5 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1 md:gap-2">
                <h1 className="text-xl md:text-3xl font-black tracking-tight text-yellow-800 flex items-center gap-2 md:gap-3">
                    <Factory className="h-6 w-6 md:h-8 md:w-8" />
                    İmalat Yönetim Paneli
                </h1>
                <p className="text-yellow-700/80 font-medium text-xs md:text-sm">
                    Mühendislikten gelen projeleri inceleyin ve üretime sevk edin.
                </p>
            </div>
            <div className="flex flex-col items-start sm:items-end bg-yellow-100/50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-yellow-200/50 w-full sm:w-auto">
                <span className="text-3xl md:text-4xl font-black text-yellow-600 leading-none">{projects.length}</span>
                <p className="text-[10px] md:text-xs text-yellow-600/80 font-bold uppercase tracking-widest mt-1">Bekleyen Onay</p>
            </div>
        </CardContent>
      </Card>

      {/* 🚀 AKIŞKAN TABLO LİSTESİ */}
      <div className="bg-card/60 backdrop-blur-2xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden w-full">
        <div className="p-4 md:p-6 border-b bg-muted/50 flex items-center gap-2 md:gap-3">
            <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-orange-500" />
            <span className="font-black text-sm md:text-base text-foreground uppercase tracking-widest">Onay Bekleyen İş Emirleri</span>
        </div>

        <div className="overflow-x-auto p-2 custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[700px]">
                <thead className="bg-primary/90 backdrop-blur-md">
                    <tr>
                        <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-[11px] font-black text-blue-100 uppercase tracking-widest rounded-tl-xl md:rounded-tl-2xl">İş Emri No</th>
                        <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-[11px] font-black text-blue-100 uppercase tracking-widest">Firma</th>
                        <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-[11px] font-black text-blue-100 uppercase tracking-widest">Kapasite</th>
                        <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-[11px] font-black text-blue-100 uppercase tracking-widest text-center">Dosyalar (PDF)</th>
                        <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-[11px] font-black text-blue-100 uppercase tracking-widest text-right rounded-tr-xl md:rounded-tr-2xl">İşlem</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50 bg-card/40">
                    {projects.map((project: any) => {
                        const getFile = (type: string) => project.project_files.find((f: any) => f.file_type === type);
                        
                        const fileList = [
                            { label: 'Köprü', data: getFile('KOPRU') },
                            { label: 'Yürüyüş', data: getFile('YURUYUS') },
                            { label: 'Kedi', data: getFile('KEDI') },
                            { label: 'Direk', data: getFile('DIREK') },
                        ];

                        return (
                          <tr key={project.id} className="hover:bg-primary/10/40 transition-colors group">
                            <td className="px-4 md:px-6 py-4 md:py-5 font-mono text-xs md:text-sm font-bold text-blue-900">{project.project_code}</td>
                            <td className="px-4 md:px-6 py-4 md:py-5 text-xs md:text-sm font-black text-foreground truncate max-w-[150px] md:max-w-[200px]">{project.customers?.name}</td>
                            <td className="px-4 md:px-6 py-4 md:py-5">
                                <Badge variant="outline" className="bg-muted text-slate-700 border-border shadow-sm font-bold text-[10px] md:text-xs py-1">
                                    {project.capacity}
                                </Badge>
                            </td>
                            
                            <td className="px-4 md:px-6 py-4 md:py-5 text-center">
                                <div className="flex flex-wrap justify-center gap-1.5 md:gap-2">
                                    {fileList.map((f, i) => (
                                        f.data ? (
                                            <a 
                                                key={i} 
                                                href={f.data.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-[9px] md:text-[10px] font-black uppercase tracking-wider px-2 md:px-3 py-1.5 rounded-lg bg-card text-primary border border-primary/30 hover:bg-primary/10 hover:text-blue-800 hover:border-blue-300 transition-all shadow-sm"
                                                title={`${f.label} Dosyasını Aç`}
                                            >
                                                <FileText className="h-3 w-3" /> 
                                                {f.label}
                                                <ExternalLink className="h-2.5 w-2.5 ml-0.5 opacity-50" />
                                            </a>
                                        ) : null
                                    ))}
                                    {!fileList.some(f => f.data) && <span className="text-muted-foreground/50 text-xs font-bold">-</span>}
                                </div>
                            </td>

                            <td className="px-4 md:px-6 py-4 md:py-5 text-right">
                                <Button 
                                    onClick={() => approveProject(project.id)}
                                    className="h-10 md:h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-primary-foreground shadow-lg shadow-emerald-500/20 font-bold text-xs md:text-sm px-4 md:px-6 transition-all"
                                >
                                    <CheckCircle className="mr-1.5 md:mr-2 h-4 w-4 md:h-5 md:w-5" />
                                    ONAY VER
                                </Button>
                            </td>
                          </tr>
                        )
                    })}
                    
                    {!loading && projects.length === 0 && (
                        <tr>
                            <td colSpan={5} className="py-16 md:py-20 text-center">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="bg-card p-4 md:p-5 rounded-full shadow-sm"><Factory className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground/50" /></div>
                                    <p className="text-base md:text-lg font-bold text-muted-foreground">Şu an onay bekleyen proje yok.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  )
}