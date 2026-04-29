"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  ClipboardList, PlusCircle, Loader2, Search, 
  User, AlertCircle, Clock, CheckCircle2, Trash2, Calendar
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function ShiftLogsPage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    operator_name: "",
    planned_work: "",
    actual_work: "",
    problems: "",
    overtime: ""
  })

  useEffect(() => { fetchLogs() }, [])

  const fetchLogs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sc_shift_logs')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setLogs(data)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await supabase.from('sc_shift_logs').insert([formData])
    
    if (!error) {
      setFormData({ operator_name: "", planned_work: "", actual_work: "", problems: "", overtime: "" })
      setIsModalOpen(false)
      fetchLogs()
    } else {
      alert("Hata: " + error.message)
    }
    setSubmitting(false)
  }

  const deleteLog = async (id: number) => {
    if(!confirm("Bu kaydı silmek istediğinize emin misiniz?")) return
    await supabase.from('sc_shift_logs').delete().eq('id', id)
    fetchLogs()
  }

  const filteredLogs = logs.filter(l => 
    l.operator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.actual_work?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 md:gap-8 font-sans max-w-[1600px] mx-auto w-full pb-10">
      
      {/* ÜST BAŞLIK */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 md:gap-6 bg-card/60 backdrop-blur-2xl border border-border/50 p-5 md:p-6 lg:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm transition-colors">
        <div className="flex items-center gap-4 md:gap-5 w-full xl:w-auto">
            <div className="bg-primary p-3 md:p-4 rounded-2xl shadow-lg shadow-primary/30 shrink-0">
                <ClipboardList className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground" />
            </div>
            <div>
                <h1 className="text-xl md:text-3xl font-black tracking-tight text-foreground">Vardiya Seyir Defteri</h1>
                <p className="text-muted-foreground font-medium text-xs md:text-sm mt-1">Excel defterini dijitale taşıdık. Günlük plan ve raporlama merkezi.</p>
            </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Operatör veya İş Ara..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11 h-12 bg-background/80 border-border text-foreground rounded-xl"
                />
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20">
                <PlusCircle className="mr-2 h-5 w-5" /> Yeni Kayıt Ekle
            </Button>
        </div>
      </div>

      {/* LİSTELEME TABLOSU */}
      <div className="bg-card/60 backdrop-blur-2xl border border-border/50 shadow-sm rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden w-full transition-colors">
        <div className="overflow-x-auto p-2 custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="bg-muted/40">
                    <tr>
                        <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tarih</th>
                        <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Operatör</th>
                        <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Planlanan İş</th>
                        <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Yapılan İş</th>
                        <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Problemler</th>
                        <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Mesai</th>
                        <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">İşlem</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                    {loading ? (
                        <tr><td colSpan={7} className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></td></tr>
                    ) : filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-primary/5 transition-colors group bg-background/40">
                            <td className="px-6 py-4 text-xs font-bold text-muted-foreground whitespace-nowrap">
                                <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" />{new Date(log.created_at).toLocaleDateString('tr-TR')}</div>
                            </td>
                            <td className="px-6 py-4 font-black text-sm text-foreground">{log.operator_name}</td>
                            <td className="px-6 py-4 text-xs text-muted-foreground italic">{log.planned_work || "-"}</td>
                            <td className="px-6 py-4 font-bold text-xs text-foreground/90">{log.actual_work || "-"}</td>
                            <td className="px-6 py-4">
                                {log.problems ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded-md">
                                        <AlertCircle className="h-3 w-3" /> {log.problems}
                                    </span>
                                ) : <span className="text-emerald-500 text-[10px] font-bold">Sorun Yok</span>}
                            </td>
                            <td className="px-6 py-4">
                                <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded-md uppercase">{log.overtime || "Yok"}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button onClick={() => deleteLog(log.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* YENİ KAYIT MODALI */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="bg-card text-foreground border-none shadow-2xl rounded-[2rem] max-w-2xl">
              <DialogHeader>
                  <DialogTitle className="text-2xl font-black flex items-center gap-2">
                      <ClipboardList className="text-primary" /> Deftere Kayıt İşle
                  </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Operatör Adı</Label>
                          <Input required placeholder="Örn: Zekeriyya Abdullah" value={formData.operator_name} onChange={e=>setFormData({...formData, operator_name: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-primary" />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Fazla Mesai Durumu</Label>
                          <Input placeholder="Örn: 2 Saat" value={formData.overtime} onChange={e=>setFormData({...formData, overtime: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-primary" />
                      </div>
                  </div>

                  <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Planlanan İş (Sabah Konuşulan)</Label>
                      <Input placeholder="Örn: 16015 Kasa Toplama" value={formData.planned_work} onChange={e=>setFormData({...formData, planned_work: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-primary" />
                  </div>

                  <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Yapılan İş (Gerçekleşen)</Label>
                      <Textarea required placeholder="Bugün neler tamamlandı?" value={formData.actual_work} onChange={e=>setFormData({...formData, actual_work: e.target.value})} className="min-h-[100px] bg-background rounded-xl border-border focus:ring-2 focus:ring-primary" />
                  </div>

                  <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-rose-500">Karşılaşılan Problemler (Varsa)</Label>
                      <Input placeholder="Örn: Kaynak makinesi arızalandı." value={formData.problems} onChange={e=>setFormData({...formData, problems: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-rose-500" />
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg rounded-xl shadow-xl shadow-primary/20">
                      {submitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
                      {submitting ? "KAYDEDİLİYOR..." : "VARDİYAYI KAYDET"}
                  </Button>
              </form>
          </DialogContent>
      </Dialog>
    </div>
  )
}