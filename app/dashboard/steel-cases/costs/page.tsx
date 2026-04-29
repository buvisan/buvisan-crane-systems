"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Calculator, PlusCircle, Loader2, Search, 
  Trash2, TrendingUp, DollarSign, Wallet, ArrowDownToLine
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function CostsPage() {
  const supabase = createClient()
  const [costs, setCosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    operator_name: "",
    task_name: "",
    work_order_no: "",
    hours: "",
    quantity: "",
    hourly_rate: "650", 
    unit_price: "6500" 
  })

  useEffect(() => { fetchCosts() }, [])

  const fetchCosts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sc_costs')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (data) setCosts(data)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    const payload = {
        operator_name: formData.operator_name,
        task_name: formData.task_name,
        work_order_no: formData.work_order_no,
        hours: Number(formData.hours),
        quantity: Number(formData.quantity),
        hourly_rate: Number(formData.hourly_rate),
        unit_price: Number(formData.unit_price),
    }

    const { error } = await supabase.from('sc_costs').insert([payload])
    
    if (!error) {
      setFormData({ ...formData, operator_name: "", task_name: "", work_order_no: "", hours: "", quantity: "" })
      setIsModalOpen(false)
      fetchCosts()
    } else {
      alert("Hata: " + error.message)
    }
    setSubmitting(false)
  }

  const deleteCost = async (id: number) => {
    if(!confirm("Maliyet kaydını silmek istediğinize emin misiniz?")) return
    await supabase.from('sc_costs').delete().eq('id', id)
    fetchCosts()
  }

  // 🚀 OTOMATİK FİNANS MOTORU HESAPLAMALARI (KAĞITTAKİ MANTIĞIN BİREBİR AYNISI)
  
  // 1. TOPLAM İŞÇİLİK: Bütün satırlardaki (Saat x Saatlik Ücret) toplamı
  const totalLaborCost = costs.reduce((acc, curr) => acc + (Number(curr.hours) * Number(curr.hourly_rate)), 0)
  
  // 2. AKILLI HAK EDİŞ: Proje bazlı gruplama yaparak çift saymayı önler
  const projectRevenues: Record<string, { maxQty: number, price: number }> = {};
  
  costs.forEach(cost => {
      // İş emri kodunun başındaki proje adını al (Örn: "KP 717 - 01" -> "KP 717" olur)
      const baseProject = cost.work_order_no?.split('-')[0]?.trim() || cost.work_order_no || "BİLİNMEYEN";
      const qty = Number(cost.quantity) || 0;
      const price = Number(cost.unit_price) || 0;

      if (!projectRevenues[baseProject]) {
          projectRevenues[baseProject] = { maxQty: qty, price: price };
      } else {
          // O proje için en yüksek adedi bul (Bazı işler 7-7-3 bölünmüş olsa da projenin ana hakediş adedi değişmez)
          if (qty > projectRevenues[baseProject].maxQty) {
              projectRevenues[baseProject].maxQty = qty;
          }
          if (price > projectRevenues[baseProject].price) {
              projectRevenues[baseProject].price = price;
          }
      }
  });

  let totalRevenue = 0;
  Object.values(projectRevenues).forEach((proj) => {
      totalRevenue += (proj.maxQty * proj.price);
  });

  // 3. NET KAR: Hak Ediş - Toplam İşçilik
  const netProfit = totalRevenue - totalLaborCost 

  const filteredCosts = costs.filter(c => 
    c.operator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.work_order_no?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val)

  return (
    <div className="flex flex-col gap-6 md:gap-8 font-sans max-w-[1600px] mx-auto w-full pb-10 transition-colors duration-300">
      
      {/* ÜST BAŞLIK */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 md:gap-6 bg-card/60 backdrop-blur-2xl border border-border/50 p-5 md:p-6 lg:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm">
        <div className="flex items-center gap-4 md:gap-5 w-full xl:w-auto">
            <div className="bg-primary p-3 md:p-4 rounded-2xl shadow-lg shadow-primary/30 shrink-0">
                <Calculator className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground" />
            </div>
            <div>
                <h1 className="text-xl md:text-3xl font-black tracking-tight text-foreground">Maliyet & Hak Ediş</h1>
                <p className="text-muted-foreground font-medium text-xs md:text-sm mt-1">İşçilik maliyeti, üretim cirosu ve net kar hesaplama tablosu.</p>
            </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20">
            <PlusCircle className="mr-2 h-5 w-5" /> Maliyet / Kazanç İşle
        </Button>
      </div>

      {/* 🚀 FİNANSAL METRİKLER (KAĞIDIN EN ALTINDAKİ HESAP) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-card/60 backdrop-blur-md border border-rose-500/20 p-6 rounded-3xl shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all"><ArrowDownToLine className="h-16 w-16 text-rose-500" /></div>
              <h3 className="text-xs font-black text-rose-500 uppercase tracking-widest mb-1">İşçilik & Kazanç Maliyeti</h3>
              <p className="text-3xl md:text-4xl font-black text-foreground mt-2">{formatCurrency(totalLaborCost)}</p>
          </div>
          <div className="bg-card/60 backdrop-blur-md border border-blue-500/20 p-6 rounded-3xl shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all"><Wallet className="h-16 w-16 text-blue-500" /></div>
              <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">Yapılan İşin Hak Edişi</h3>
              <p className="text-3xl md:text-4xl font-black text-foreground mt-2">{formatCurrency(totalRevenue)}</p>
              <span className="absolute bottom-4 right-5 text-[9px] font-black text-blue-500/50 uppercase tracking-widest hidden md:block">Proje Başına Hesaplanır</span>
          </div>
          <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/30 p-6 rounded-3xl shadow-lg shadow-emerald-500/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all"><TrendingUp className="h-16 w-16 text-emerald-600" /></div>
              <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Elde Edilen Net Kar</h3>
              <p className="text-3xl md:text-4xl font-black text-emerald-700 mt-2">{formatCurrency(netProfit)}</p>
          </div>
      </div>

      {/* LİSTELEME TABLOSU */}
      <div className="bg-card/60 backdrop-blur-2xl border border-border/50 shadow-sm rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden w-full">
        <div className="flex justify-between items-center p-4 border-b border-border bg-muted/20">
            <h2 className="font-black text-foreground pl-2 text-sm uppercase tracking-widest">Detaylı Bilanço Tablosu</h2>
            <div className="relative w-48 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-10 bg-background/80 border-border text-xs rounded-lg" />
            </div>
        </div>
        <div className="overflow-x-auto p-2 custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="bg-muted/40">
                    <tr>
                        <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest rounded-tl-2xl">Operatör</th>
                        <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Yapılan İş</th>
                        <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">İş Emri No</th>
                        <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Saat</th>
                        <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Adet</th>
                        <th className="px-5 py-4 text-[10px] font-black text-rose-500 uppercase tracking-widest text-right">İşçilik Maliyeti</th>
                        <th className="px-5 py-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-right rounded-tr-2xl">Birim Satış / İşlem</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                    {loading ? (
                        <tr><td colSpan={7} className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></td></tr>
                    ) : filteredCosts.map((cost) => {
                        const laborCost = Number(cost.hours) * Number(cost.hourly_rate)

                        return (
                        <tr key={cost.id} className="hover:bg-primary/5 transition-colors group bg-background/40">
                            <td className="px-5 py-4 font-black text-sm text-foreground uppercase">{cost.operator_name}</td>
                            <td className="px-5 py-4 font-bold text-xs text-foreground/80">{cost.task_name}</td>
                            <td className="px-5 py-4 font-mono font-bold text-xs text-primary">{cost.work_order_no}</td>
                            <td className="px-5 py-4 text-center font-black text-slate-600 dark:text-slate-300">{cost.hours}</td>
                            <td className="px-5 py-4 text-center font-black text-slate-600 dark:text-slate-300">{cost.quantity}</td>
                            <td className="px-5 py-4 text-right">
                                <div className="flex flex-col items-end">
                                    <span className="font-black text-sm text-rose-600 dark:text-rose-400">{formatCurrency(laborCost)}</span>
                                    <span className="text-[9px] font-bold text-muted-foreground">({formatCurrency(Number(cost.hourly_rate))} / saat)</span>
                                </div>
                            </td>
                            <td className="px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-3">
                                    <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">{formatCurrency(Number(cost.unit_price))}</span>
                                    <button onClick={() => deleteCost(cost.id)} className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )})}
                    {filteredCosts.length === 0 && !loading && <tr><td colSpan={7} className="py-12 text-center text-muted-foreground font-bold">Kayıt bulunamadı.</td></tr>}
                </tbody>
            </table>
        </div>
      </div>

      {/* YENİ KAYIT MODALI */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="bg-card text-foreground border-none shadow-2xl rounded-[2rem] max-w-2xl">
              <DialogHeader>
                  <DialogTitle className="text-2xl font-black flex items-center gap-2">
                      <DollarSign className="text-primary" /> Maliyet ve Kazanç İşle
                  </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-5 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Operatör</Label>
                          <Input required placeholder="Örn: Oktay Esmer" value={formData.operator_name} onChange={e=>setFormData({...formData, operator_name: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-primary font-bold uppercase" />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Yapılan İş Günlük</Label>
                          <Input required placeholder="Örn: Kalıp Hazırlama" value={formData.task_name} onChange={e=>setFormData({...formData, task_name: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-primary" />
                      </div>
                  </div>

                  <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">İş Emri Kodu</Label>
                      <Input required placeholder="Örn: KP 717 - 01" value={formData.work_order_no} onChange={e=>setFormData({...formData, work_order_no: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-primary font-mono font-bold" />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-2xl border border-border">
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">İş Günü (Saat)</Label>
                          <Input type="number" step="0.5" required value={formData.hours} onChange={e=>setFormData({...formData, hours: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-primary font-black text-center" />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Adet</Label>
                          <Input type="number" required value={formData.quantity} onChange={e=>setFormData({...formData, quantity: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-primary font-black text-center" />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-rose-500">Saatlik Ücret (₺)</Label>
                          <Input type="number" required value={formData.hourly_rate} onChange={e=>setFormData({...formData, hourly_rate: e.target.value})} className="h-12 bg-rose-50 border-rose-200 text-rose-700 rounded-xl focus:ring-2 focus:ring-rose-500 font-black text-center" />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Birim Satış (₺)</Label>
                          <Input type="number" required value={formData.unit_price} onChange={e=>setFormData({...formData, unit_price: e.target.value})} className="h-12 bg-emerald-50 border-emerald-200 text-emerald-700 rounded-xl focus:ring-2 focus:ring-emerald-500 font-black text-center" />
                      </div>
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-base rounded-xl shadow-xl shadow-primary/20 mt-2">
                      {submitting ? <Loader2 className="animate-spin mr-2" /> : <Calculator className="mr-2" />}
                      {submitting ? "KAYDEDİLİYOR..." : "HESAPLA VE SİSTEME İŞLE"}
                  </Button>
              </form>
          </DialogContent>
      </Dialog>
    </div>
  )
}