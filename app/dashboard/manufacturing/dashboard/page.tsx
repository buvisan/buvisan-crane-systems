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
    <div className="flex flex-col gap-6">
      
      {/* ÜST BİLGİ KARTI */}
      <Card className="border-l-4 border-l-yellow-500 shadow-sm bg-yellow-50/50">
        <CardContent className="pt-6 flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-yellow-800 flex items-center gap-2">
                    <Factory className="h-6 w-6" />
                    İmalat Yönetim Paneli
                </h1>
                <p className="text-yellow-700 text-sm mt-1">
                    Mühendislikten gelen projeleri inceleyin ve üretime sevk edin.
                </p>
            </div>
            <div className="text-right">
                <span className="text-3xl font-bold text-yellow-600">{projects.length}</span>
                <p className="text-xs text-yellow-600 font-semibold uppercase">Bekleyen Onay</p>
            </div>
        </CardContent>
      </Card>

      {/* LİSTE */}
      <div className="rounded-md border bg-white shadow-sm">
        <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <span className="font-semibold text-gray-700">Onay Bekleyen İş Emirleri</span>
        </div>

        <Table>
          <TableHeader className="bg-blue-600">
            <TableRow className="hover:bg-blue-600">
              <TableHead className="text-white font-bold">İş Emri No</TableHead>
              <TableHead className="text-white font-bold">Firma</TableHead>
              <TableHead className="text-white font-bold">Kapasite</TableHead>
              <TableHead className="text-white font-bold text-center">Dosyalar (PDF)</TableHead>
              <TableHead className="text-white font-bold text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project: any) => {
                // Dosyaları bul (Nesne olarak alıyoruz ki linkine erişelim)
                const getFile = (type: string) => project.project_files.find((f: any) => f.file_type === type);
                
                const fileList = [
                    { label: 'Köprü', data: getFile('KOPRU') },
                    { label: 'Yürüyüş', data: getFile('YURUYUS') },
                    { label: 'Kedi', data: getFile('KEDI') },
                    { label: 'Direk', data: getFile('DIREK') },
                ];

                return (
                  <TableRow key={project.id} className="hover:bg-blue-50/50">
                    <TableCell className="font-mono font-bold text-blue-900">{project.project_code}</TableCell>
                    <TableCell className="font-medium">{project.customers?.name}</TableCell>
                    <TableCell>
                        <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
                            {project.capacity}
                        </Badge>
                    </TableCell>
                    
                    {/* TIKLANABİLİR DOSYALAR */}
                    <TableCell className="text-center">
                        <div className="flex flex-wrap justify-center gap-2">
                            {fileList.map((f, i) => (
                                f.data ? (
                                    <a 
                                        key={i} 
                                        href={f.data.file_url} // Dosya linki
                                        target="_blank" // Yeni sekmede aç
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 hover:text-blue-800 transition-colors shadow-sm"
                                        title={`${f.label} Dosyasını Aç`}
                                    >
                                        <FileText className="h-3 w-3" /> 
                                        {f.label}
                                        <ExternalLink className="h-2 w-2 ml-1 opacity-50" />
                                    </a>
                                ) : null
                            ))}
                            {/* Hiç dosya yoksa tire koy */}
                            {!fileList.some(f => f.data) && <span className="text-gray-300">-</span>}
                        </div>
                    </TableCell>

                    <TableCell className="text-right">
                        <Button 
                            onClick={() => approveProject(project.id)}
                            className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                            size="sm"
                        >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            ONAY VER
                        </Button>
                    </TableCell>
                  </TableRow>
                )
            })}
            
            {!loading && projects.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-gray-500">
                        Şu an onay bekleyen proje yok.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}