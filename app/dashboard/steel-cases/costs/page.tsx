"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Calculator, PlusCircle, Loader2, Search, 
  Trash2, Edit2, TrendingUp, Wallet, ArrowDownToLine, ChevronDown, FolderKanban, HardHat, Save
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function CostsPage() {
  const supabase = createClient()
  const [costs, setCosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // DÜZENLEME (EDIT) MODALI İÇİN YENİ STATELER
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editFormData, setEditFormData] = useState<any>(null)

  const [expandedProjects, setExpandedProjects] = useState<string[]>([])

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

  // YENİ KAYIT EKLEME
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

  // MEVCUT KAYDI DÜZENLEME VE GÜNCELLEME
  const openEditModal = (cost: any) => {
    setEditFormData({ ...cost })
    setIsEditModalOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditSubmitting(true)
    
    const payload = {
        operator_name: editFormData.operator_name,
        task_name: editFormData.task_name,
        work_order_no: editFormData.work_order_no,
        hours: Number(editFormData.hours),
        quantity: Number(editFormData.quantity),
        hourly_rate: Number(editFormData.hourly_rate),
        unit_price: Number(editFormData.unit_price),
    }

    const { error } = await supabase.from('sc_costs').update(payload).eq('id', editFormData.id)
    
    if (!error) {
      setIsEditModalOpen(false)
      fetchCosts()
    } else {
      alert("Hata: " + error.message)
    }
    setEditSubmitting(false)
  }

  const deleteCost = async (id: number) => {
    if(!confirm("Maliyet kaydını silmek istediğinize emin misiniz?")) return
    await supabase.from('sc_costs').delete().eq('id', id)
    fetchCosts()
  }

  const toggleProjectExpand = (projectName: string) => {
      setExpandedProjects(prev => prev.includes(projectName) ? prev.filter(p => p !== projectName) : [...prev, projectName])
  }

  // AKILLI GRUPLAMA MOTORU (BOŞLUK VE KÜÇÜK/BÜYÜK HARF DUYARSIZ)
  const groupedProjects: Record<string, { displayName: string, tasks: any[] }> = {}
  
  costs.forEach(cost => {
      const rawBase = cost.work_order_no?.includes('-') ? cost.work_order_no.split('-')[0] : (cost.work_order_no || "Diğer İşler")
      const normalizedKey = rawBase.replace(/\s+/g, '').toUpperCase()
      
      if (!groupedProjects[normalizedKey]) {
          groupedProjects[normalizedKey] = {
              displayName: rawBase.trim().toUpperCase(),
              tasks: []
          }
      }
      groupedProjects[normalizedKey].tasks.push(cost)
  })

  // Projelerin kendi içindeki matematiği
  const projectSummaries = Object.values(groupedProjects).map(({ displayName, tasks }) => {
      const laborCost = tasks.reduce((sum, t) => sum + (Number(t.hours) * Number(t.hourly_rate)), 0)
      const maxQty = Math.max(...tasks.map(t => Number(t.quantity) || 0))
      const unitPrice = Math.max(...tasks.map(t => Number(t.unit_price) || 0))
      const revenue = maxQty * unitPrice
      const profit = revenue - laborCost

      return { projName: displayName, tasks, laborCost, maxQty, unitPrice, revenue, profit }
  })

  // GENEL FİNANS KARTLARI İÇİN TOPLAM HESAPLAR
  const totalGlobalLabor = projectSummaries.reduce((sum, p) => sum + p.laborCost, 0)
  const totalGlobalRevenue = projectSummaries.reduce((sum, p) => sum + p.revenue, 0)
  const totalGlobalProfit = totalGlobalRevenue - totalGlobalLabor

  const filteredProjects = projectSummaries.filter(p => 
      p.projName.toLowerCase().includes(searchTerm.replace(/\s+/g, '').toLowerCase()) || 
      p.tasks.some(t => t.operator_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val)

  return (
    <div className="flex flex-col gap-6 md:gap-8 font-sans max-w-[1600px] mx-auto w-full pb-10 transition-colors duration-300">
      
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 md:gap-6 bg-card/60 backdrop-blur-2xl border border-border/50 p-5 md:p-6 lg:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm">
        <div className="flex items-center gap-4 md:gap-5 w-full xl:w-auto">
            <div className="bg-primary p-3 md:p-4 rounded-2xl shadow-lg shadow-primary/30 shrink-0">
                <Calculator className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground" />
            </div>
            <div>
                <h1 className="text-xl md:text-3xl font-black tracking-tight text-foreground">Maliyet & Hak Ediş</h1>
                <p className="text-muted-foreground font-medium text-xs md:text-sm mt-1">Proje bazlı işçilik, hakediş ve net kar bilançosu.</p>
            </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Proje Kodu, Operatör..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-11 h-12 bg-background/80 border-border text-foreground rounded-xl" />
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20">
                <PlusCircle className="mr-2 h-5 w-5" /> Maliyet / Kazanç İşle
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-card/60 backdrop-blur-md border border-rose-500/20 p-6 rounded-3xl shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all"><ArrowDownToLine className="h-16 w-16 text-rose-500" /></div>
              <h3 className="text-xs font-black text-rose-500 uppercase tracking-widest mb-1">Toplam İşçilik Maliyeti</h3>
              <p className="text-3xl md:text-4xl font-black text-foreground mt-2">{formatCurrency(totalGlobalLabor)}</p>
          </div>
          <div className="bg-card/60 backdrop-blur-md border border-blue-500/20 p-6 rounded-3xl shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all"><Wallet className="h-16 w-16 text-blue-500" /></div>
              <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">Toplam Hak Ediş</h3>
              <p className="text-3xl md:text-4xl font-black text-foreground mt-2">{formatCurrency(totalGlobalRevenue)}</p>
          </div>
          <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/30 p-6 rounded-3xl shadow-lg shadow-emerald-500/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all"><TrendingUp className="h-16 w-16 text-emerald-600" /></div>
              <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Toplam Net Kar</h3>
              <p className="text-3xl md:text-4xl font-black text-emerald-700 mt-2">{formatCurrency(totalGlobalProfit)}</p>
          </div>
      </div>

      <div className="flex flex-col gap-4">
          {filteredProjects.map((project) => {
              const isExpanded = expandedProjects.includes(project.projName)

              return (
              <div key={project.projName} className="flex flex-col bg-card/60 backdrop-blur-md border border-border/80 shadow-sm rounded-[1.5rem] md:rounded-[2rem] overflow-hidden transition-all duration-300">
                  
                  <div onClick={() => toggleProjectExpand(project.projName)} className="p-4 md:p-6 cursor-pointer hover:bg-muted/30 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4 select-none group">
                      
                      <div className="flex items-center gap-4">
                          <div className={`p-3 md:p-4 rounded-2xl flex items-center justify-center transition-colors ${isExpanded ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
                              <FolderKanban className="h-6 w-6 md:h-8 md:w-8" />
                          </div>
                          <div>
                              <div className="flex items-center gap-2">
                                  <h2 className="text-lg md:text-2xl font-black text-foreground">{project.projName}</h2>
                                  <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">PROJE ONAYLI</span>
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 text-xs font-bold text-muted-foreground">
                                  <span className="flex items-center gap-1"><HardHat className="h-3.5 w-3.5" /> {project.tasks.length} İşlem</span>
                                  <span className="w-1 h-1 rounded-full bg-border"></span>
                                  <span>{project.maxQty} Adet Üretim</span>
                                  <span className="w-1 h-1 rounded-full bg-border"></span>
                                  <span>Birim Satış: {formatCurrency(project.unitPrice)}</span>
                              </div>
                          </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 md:gap-6 bg-background/50 border border-border p-3 md:p-4 rounded-xl md:rounded-2xl w-full md:w-auto">
                          <div className="flex flex-col">
                              <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">İşçilik Maliyet</span>
                              <span className="text-sm md:text-base font-black text-foreground">{formatCurrency(project.laborCost)}</span>
                          </div>
                          <div className="w-px h-8 bg-border hidden sm:block"></div>
                          <div className="flex flex-col">
                              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Hak Ediş</span>
                              <span className="text-sm md:text-base font-black text-foreground">{formatCurrency(project.revenue)}</span>
                          </div>
                          <div className="w-px h-8 bg-border hidden sm:block"></div>
                          <div className="flex flex-col">
                              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Net Kar</span>
                              <span className="text-sm md:text-base font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-lg">{formatCurrency(project.profit)}</span>
                          </div>
                          
                          <div className={`ml-auto md:ml-4 p-2 rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-primary/10 text-primary' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
                              <ChevronDown className="h-5 w-5" />
                          </div>
                      </div>
                  </div>

                  <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                      <div className="overflow-hidden">
                          <div className="p-4 pt-0 bg-muted/10 border-t border-border/50">
                              <div className="overflow-x-auto custom-scrollbar bg-background rounded-2xl border border-border mt-4">
                                  <table className="w-full text-left border-collapse min-w-[900px]">
                                      <thead className="bg-muted/50 border-b border-border">
                                          <tr>
                                              <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Operatör</th>
                                              <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Yapılan İş</th>
                                              <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">İş Emri (Alt Kod)</th>
                                              <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Saat</th>
                                              {/* 🚀 ADET KOLONU EKLENDİ */}
                                              <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Adet</th>
                                              <th className="px-5 py-4 text-[10px] font-black text-rose-500 uppercase tracking-widest text-right">İşçilik Maliyeti</th>
                                              <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">İşlem</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border/50">
                                          {project.tasks.map((cost) => {
                                              const taskLaborCost = Number(cost.hours) * Number(cost.hourly_rate)
                                              return (
                                              <tr key={cost.id} className="hover:bg-primary/5 transition-colors group">
                                                  <td className="px-5 py-3 font-black text-sm text-foreground uppercase flex items-center gap-2">
                                                      <span className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs border border-primary/20">{cost.operator_name.charAt(0)}</span>
                                                      {cost.operator_name}
                                                  </td>
                                                  <td className="px-5 py-3 font-bold text-xs text-foreground/80">{cost.task_name}</td>
                                                  <td className="px-5 py-3 font-mono font-bold text-xs text-primary">{cost.work_order_no}</td>
                                                  <td className="px-5 py-3 text-center font-black text-foreground">{cost.hours} <span className="text-[10px] text-muted-foreground">saat</span></td>
                                                  {/* 🚀 ADET VERİSİ BURAYA GELDİ */}
                                                  <td className="px-5 py-3 text-center font-black text-foreground">{cost.quantity} <span className="text-[10px] text-muted-foreground">adet</span></td>
                                                  <td className="px-5 py-3 text-right">
                                                      <div className="flex flex-col items-end">
                                                          <span className="font-black text-sm text-rose-500">{formatCurrency(taskLaborCost)}</span>
                                                          <span className="text-[9px] font-bold text-muted-foreground">({formatCurrency(Number(cost.hourly_rate))} / s)</span>
                                                      </div>
                                                  </td>
                                                  <td className="px-5 py-3 text-right">
                                                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                          <button onClick={() => openEditModal(cost)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
                                                              <Edit2 className="h-4 w-4" />
                                                          </button>
                                                          <button onClick={() => deleteCost(cost.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                                              <Trash2 className="h-4 w-4" />
                                                          </button>
                                                      </div>
                                                  </td>
                                              </tr>
                                          )})}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )})}
          
          {filteredProjects.length === 0 && !loading && (
              <div className="py-12 bg-card/60 backdrop-blur-md rounded-3xl border border-border text-center flex flex-col items-center">
                  <div className="bg-muted p-4 rounded-full mb-3"><FolderKanban className="h-8 w-8 text-muted-foreground" /></div>
                  <p className="text-base font-black text-foreground">Henüz proje maliyeti işlenmemiş.</p>
                  <p className="text-xs font-medium text-muted-foreground mt-1">Sağ üstten Maliyet/Kazanç İşle butonunu kullanarak başlayın.</p>
              </div>
          )}
      </div>

      {/* YENİ KAYIT MODALI */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="bg-card text-foreground border-none shadow-2xl rounded-[2rem] max-w-2xl">
              <DialogHeader>
                  <DialogTitle className="text-2xl font-black flex items-center gap-2">
                      <Calculator className="text-primary" /> Yeni Operasyon İşle
                  </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-5 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Operatör Adı</Label>
                          <Input required placeholder="Örn: Oktay Esmer" value={formData.operator_name} onChange={e=>setFormData({...formData, operator_name: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-primary font-bold uppercase" />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Yapılan İş / Aşama</Label>
                          <Input required placeholder="Örn: Kalıp Hazırlama" value={formData.task_name} onChange={e=>setFormData({...formData, task_name: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-primary" />
                      </div>
                  </div>

                  <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">İş Emri & Proje Kodu</Label>
                      <Input required placeholder="Örn: KP 717 - 01" value={formData.work_order_no} onChange={e=>setFormData({...formData, work_order_no: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-primary font-mono font-bold" />
                      <p className="text-[10px] font-medium text-primary mt-1">Sistem, tireden (-) önceki kısmı (Örn: KP 717) proje olarak kabul edip gruplar.</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-2xl border border-border">
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mesai (Saat)</Label>
                          <Input type="number" step="0.5" required value={formData.hours} onChange={e=>setFormData({...formData, hours: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-primary font-black text-center" />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Adet</Label>
                          <Input type="number" required value={formData.quantity} onChange={e=>setFormData({...formData, quantity: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-primary font-black text-center" />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-rose-500">Saatlik Ücr. (₺)</Label>
                          <Input type="number" required value={formData.hourly_rate} onChange={e=>setFormData({...formData, hourly_rate: e.target.value})} className="h-12 bg-rose-50/50 border-rose-200 text-rose-700 rounded-xl focus:ring-2 focus:ring-rose-500 font-black text-center" />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Birim Satış (₺)</Label>
                          <Input type="number" required value={formData.unit_price} onChange={e=>setFormData({...formData, unit_price: e.target.value})} className="h-12 bg-emerald-50/50 border-emerald-200 text-emerald-700 rounded-xl focus:ring-2 focus:ring-emerald-500 font-black text-center" />
                      </div>
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-base rounded-xl shadow-xl shadow-primary/20 mt-2">
                      {submitting ? <Loader2 className="animate-spin mr-2" /> : <Calculator className="mr-2" />}
                      {submitting ? "SİSTEME İŞLENİYOR..." : "KAYDET VE BİLANÇOYU GÜNCELLE"}
                  </Button>
              </form>
          </DialogContent>
      </Dialog>

      {/* DÜZENLEME (EDIT) MODALI */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="bg-card text-foreground border-none shadow-2xl rounded-[2rem] max-w-2xl">
              <DialogHeader>
                  <DialogTitle className="text-2xl font-black flex items-center gap-2">
                      <Edit2 className="text-indigo-500" /> Operasyon Kaydını Düzenle
                  </DialogTitle>
              </DialogHeader>
              {editFormData && (
                  <form onSubmit={handleEditSubmit} className="space-y-5 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Operatör Adı</Label>
                              <Input required value={editFormData.operator_name} onChange={e=>setEditFormData({...editFormData, operator_name: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-indigo-500 font-bold uppercase" />
                          </div>
                          <div className="space-y-2">
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Yapılan İş / Aşama</Label>
                              <Input required value={editFormData.task_name} onChange={e=>setEditFormData({...editFormData, task_name: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-indigo-500" />
                          </div>
                      </div>

                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">İş Emri & Proje Kodu</Label>
                          <Input required value={editFormData.work_order_no} onChange={e=>setEditFormData({...editFormData, work_order_no: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-indigo-500 font-mono font-bold" />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-2xl border border-border">
                          <div className="space-y-2">
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mesai (Saat)</Label>
                              <Input type="number" step="0.5" required value={editFormData.hours} onChange={e=>setEditFormData({...editFormData, hours: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-indigo-500 font-black text-center" />
                          </div>
                          <div className="space-y-2">
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Adet</Label>
                              <Input type="number" required value={editFormData.quantity} onChange={e=>setEditFormData({...editFormData, quantity: e.target.value})} className="h-12 bg-background rounded-xl border-border focus:ring-2 focus:ring-indigo-500 font-black text-center" />
                          </div>
                          <div className="space-y-2">
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-rose-500">Saatlik Ücr. (₺)</Label>
                              <Input type="number" required value={editFormData.hourly_rate} onChange={e=>setEditFormData({...editFormData, hourly_rate: e.target.value})} className="h-12 bg-rose-50/50 border-rose-200 text-rose-700 rounded-xl focus:ring-2 focus:ring-rose-500 font-black text-center" />
                          </div>
                          <div className="space-y-2">
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Birim Satış (₺)</Label>
                              <Input type="number" required value={editFormData.unit_price} onChange={e=>setEditFormData({...editFormData, unit_price: e.target.value})} className="h-12 bg-emerald-50/50 border-emerald-200 text-emerald-700 rounded-xl focus:ring-2 focus:ring-emerald-500 font-black text-center" />
                          </div>
                      </div>

                      <Button type="submit" disabled={editSubmitting} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base rounded-xl shadow-xl shadow-indigo-500/20 mt-2 transition-colors">
                          {editSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-5 w-5" />}
                          {editSubmitting ? "GÜNCELLENİYOR..." : "DEĞİŞİKLİKLERİ KAYDET"}
                      </Button>
                  </form>
              )}
          </DialogContent>
      </Dialog>
    </div>
  )
}