"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  HardHat, PlusCircle, Loader2, Search, 
  Clock, Calendar, Trash2, CheckCircle2, AlertTriangle, Layers
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function WorkOrdersPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // Bugünün tarihi varsayılan
    operator_name: "",
    part_no: "",
    task_name: "",
    start_time: "",
    end_time: "",
    quantity: "1"
  })

  useEffect(() => { fetchOrders() }, [])

  const fetchOrders = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sc_work_orders')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    
    if (data) setOrders(data)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    const payload = {
        ...formData,
        quantity: Number(formData.quantity)
    }

    const { error } = await supabase.from('sc_work_orders').insert([payload])
    
    if (!error) {
      setFormData({ date: new Date().toISOString().split('T')[0], operator_name: "", part_no: "", task_name: "", start_time: "", end_time: "", quantity: "1" })
      setIsModalOpen(false)
      fetchOrders()
    } else {
      alert("Hata: " + error.message)
    }
    setSubmitting(false)
  }

  const deleteOrder = async (id: number) => {
    if(!confirm("Bu iş emri kaydını silmek istediğinize emin misiniz? Maliyet hesaplamalarını etkileyebilir!")) return
    await supabase.from('sc_work_orders').delete().eq('id', id)
    fetchOrders()
  }

  const approveOrder = async (id: number) => {
    if(!confirm("Kalite Kontrol (Ölçü) onayını veriyor musunuz?")) return
    await supabase.from('sc_work_orders').update({ status: 'TAMAMLANDI' }).eq('id', id)
    fetchOrders()
  }

  // Saat hesaplama fonksiyonu (09:00 ile 16:30 arası kaç saat?)
  const calculateDuration = (start: string, end: string) => {
      if (!start || !end) return "-";
      const startTime = new Date(`1970-01-01T${start}:00`);
      const endTime = new Date(`1970-01-01T${end}:00`);
      const diffMs = endTime.getTime() - startTime.getTime();
      if (diffMs < 0) return "Hatalı Saat";
      const diffHrs = Math.floor(diffMs / 3600000);
      const diffMins = Math.round((diffMs % 3600000) / 60000);
      return `${diffHrs}s ${diffMins}dk`;
  }

  const filteredOrders = orders.filter(o => 
    o.operator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.part_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.task_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 md:gap-8 font-sans max-w-[1600px] mx-auto w-full pb-10 transition-colors duration-300">
      
      {/* ÜST BAŞLIK */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 md:gap-6 bg-card/60 backdrop-blur-2xl border border-border/50 p-5 md:p-6 lg:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm">
        <div className="flex items-center gap-4 md:gap-5 w-full xl:w-auto">
            <div className="bg-primary p-3 md:p-4 rounded-2xl shadow-lg shadow-primary/30 shrink-0">
                <HardHat className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground" />
            </div>
            <div>
                <h1 className="text-xl md:text-3xl font-black tracking-tight text-foreground">Günlük İş Emirleri (Puantaj)</h1>
                <p className="text-muted-foreground font-medium text-xs md:text-sm mt-1">Saha personeli üretim kayıtları ve kalite kontrol onay merkezi.</p>
            </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Parça No, Operatör..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11 h-12 bg-background/80 border-border text-foreground rounded-xl"
                />
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20">
                <PlusCircle className="mr-2 h-5 w-5" /> İş Kaydı Gir
            </Button>
        </div>
      </div>

      {/* LİSTELEME TABLOSU */}
      <div className="bg-card/60 backdrop-blur-2xl border border-border/50 shadow-sm rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden w-full">
        <div className="overflow-x-auto p-2 custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="bg-muted/40">
                    <tr>
                        <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest rounded-tl-2xl">Tarih</th>
                        <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Operatör</th>
                        <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Parça No & İşlem</th>
                        <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Çalışma Süresi</th>
                        <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Üretim Adedi</th>
                        <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Kontrol (Durum)</th>
                        <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right rounded-tr-2xl">Aksiyon</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                    {loading ? (
                        <tr><td colSpan={7} className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></td></tr>
                    ) : filteredOrders.map((order) => {
                        const duration = calculateDuration(order.start_time, order.end_time);
                        const isApproved = order.status === 'TAMAMLANDI';

                        return (
                        <tr key={order.id} className="hover:bg-primary/5 transition-colors group bg-background/40">
                            <td className="px-5 py-4 text-xs font-bold text-muted-foreground whitespace-nowrap">
                                <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" />{new Date(order.date).toLocaleDateString('tr-TR')}</div>
                            </td>
                            <td className="px-5 py-4 font-black text-sm text-foreground">{order.operator_name}</td>
                            <td className="px-5 py-4">
                                <div className="flex flex-col">
                                    <span className="font-mono font-bold text-xs text-primary">{order.part_no}</span>
                                    <span className="font-medium text-xs text-foreground/80 mt-0.5">{order.task_name}</span>
                                </div>
                            </td>
                            <td className="px-5 py-4 text-center">
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">{order.start_time} - {order.end_time}</span>
                                    <span className="text-xs font-black text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-1"><Clock className="h-3 w-3" /> {duration}</span>
                                </div>
                            </td>
                            <td className="px-5 py-4 text-center">
                                <span className="inline-flex items-center justify-center h-8 min-w-[32px] px-3 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 font-black rounded-lg border border-blue-200 dark:border-blue-800">
                                    {order.quantity}
                                </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                                {isApproved ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 uppercase tracking-widest"><CheckCircle2 className="h-3.5 w-3.5" /> Ölçü O.K.</span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800 uppercase tracking-widest"><AlertTriangle className="h-3.5 w-3.5" /> Bekliyor</span>
                                )}
                            </td>
                            <td className="px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                    {!isApproved && (
                                        <Button onClick={() => approveOrder(order.id)} size="sm" className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3">
                                            Onayla
                                        </Button>
                                    )}
                                    <button onClick={() => deleteOrder(order.id)} className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )})}
                    {filteredOrders.length === 0 && !loading && <tr><td colSpan={7} className="py-12 text-center text-muted-foreground font-bold">Kayıt bulunamadı.</td></tr>}
                </tbody>
            </table>
        </div>
      </div>

      {/* YENİ İŞ EMRİ MODALI */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="bg-card text-foreground border-none shadow-2xl rounded-[2rem] max-w-2xl">
              <DialogHeader>
                  <DialogTitle className="text-2xl font-black flex items-center gap-2">
                      <Layers className="text-primary" /> Yeni İş / Puantaj Kaydı
                  </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-5 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tarih</Label>
                          <Input type="date" required value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-primary font-medium" />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Operatör Adı</Label>
                          <Input required placeholder="Örn: Oktay Esmer" value={formData.operator_name} onChange={e=>setFormData({...formData, operator_name: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-primary font-bold" />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Parça No / Sipariş Kodu</Label>
                          <Input required placeholder="Örn: KP 717 - 01" value={formData.part_no} onChange={e=>setFormData({...formData, part_no: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-primary font-mono font-bold" />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Yapılan İşlem</Label>
                          <Input required placeholder="Örn: Kalıp Hazırlama, Kasa Toplama" value={formData.task_name} onChange={e=>setFormData({...formData, task_name: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-primary font-medium" />
                      </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 bg-muted/30 p-4 rounded-2xl border border-border">
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Başlama (Saat)</Label>
                          <Input type="time" required value={formData.start_time} onChange={e=>setFormData({...formData, start_time: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-primary font-black text-center" />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bitiş (Saat)</Label>
                          <Input type="time" required value={formData.end_time} onChange={e=>setFormData({...formData, end_time: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-primary font-black text-center" />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Üretilen Adet</Label>
                          <Input type="number" min="1" required value={formData.quantity} onChange={e=>setFormData({...formData, quantity: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-primary font-black text-primary text-center" />
                      </div>
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-base rounded-xl shadow-xl shadow-primary/20 mt-2">
                      {submitting ? <Loader2 className="animate-spin mr-2" /> : <Layers className="mr-2" />}
                      {submitting ? "KAYDEDİLİYOR..." : "PUANTAJ KAYDINI EKLE"}
                  </Button>
              </form>
          </DialogContent>
      </Dialog>
    </div>
  )
}