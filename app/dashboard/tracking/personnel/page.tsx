"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, PlusCircle, Trash2, Loader2, UserPlus, MapPin, Award, Edit2 } from "lucide-react"

export default function TrackingPersonnelPage() {
  const [personnel, setPersonnel] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  const [form, setForm] = useState({ full_name: "", region: "", premium_limit: "", premium_percentage: "" })
  const supabase = createClient()

  useEffect(() => {
    fetchPersonnel()
  }, [])

  const fetchPersonnel = async () => {
    setLoading(true)
    const { data } = await supabase
        .from('tracking_personnel')
        .select(`*, tracking_sales ( total_amount )`)
        .order('created_at', { ascending: true })
    
    if (data) {
        const calculatedData = data.map(person => {
            const totalSales = person.tracking_sales.reduce((sum: number, sale: any) => sum + Number(sale.total_amount), 0)
            const earnedPremium = totalSales >= person.premium_limit ? (totalSales * (person.premium_percentage / 100)) : 0
            return { ...person, totalSales, earnedPremium }
        })
        setPersonnel(calculatedData)
    }
    setLoading(false)
  }

  const openEdit = (p: any) => {
      setForm({ full_name: p.full_name, region: p.region, premium_limit: p.premium_limit, premium_percentage: p.premium_percentage })
      setEditingId(p.id)
      setIsAdding(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    let error;
    if (editingId) {
        const { error: updateError } = await supabase.from('tracking_personnel').update({
            full_name: form.full_name, region: form.region, premium_limit: Number(form.premium_limit), premium_percentage: Number(form.premium_percentage)
        }).eq('id', editingId)
        error = updateError;
    } else {
        const { error: insertError } = await supabase.from('tracking_personnel').insert([{
            full_name: form.full_name, region: form.region, premium_limit: Number(form.premium_limit), premium_percentage: Number(form.premium_percentage)
        }])
        error = insertError;
    }

    setSaving(false)

    if (error) alert("Hata: " + error.message)
    else {
        setForm({ full_name: "", region: "", premium_limit: "", premium_percentage: "" })
        setEditingId(null)
        setIsAdding(false)
        fetchPersonnel()
    }
  }

  const handleDelete = async (id: number) => {
    if(!confirm("Bu personeli silmek istediğinize emin misiniz?")) return;
    const { error } = await supabase.from('tracking_personnel').delete().eq('id', id)
    
    if (error) {
        if (error.code === '23503') alert("DİKKAT: Bu personelin sistemde kayıtlı satışları bulunuyor! Personeli silebilmek için önce o satışları silmeli veya başka bir personele aktarmalısınız.");
        else alert("Silinirken hata oluştu: " + error.message);
    } else {
        fetchPersonnel()
    }
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 max-w-[1400px] mx-auto w-full font-sans pb-10">
      
      {/* 🚀 ÜST BAŞLIK ALANI (Mobil Uyumlu) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 md:gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm flex-1">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 md:p-4 rounded-xl md:rounded-2xl shadow-lg shadow-emerald-500/30 shrink-0">
                <Users className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </div>
            <div>
                <h1 className="text-xl md:text-3xl font-black tracking-tight text-slate-900">Satış Personelleri</h1>
                <p className="text-slate-500 font-medium text-xs md:text-sm mt-1">Ekip üyeleri, bölgeler ve otomatik prim hakediş tablosu.</p>
            </div>
        </div>
        
        <Button onClick={() => { setIsAdding(!isAdding); setEditingId(null); setForm({ full_name: "", region: "", premium_limit: "", premium_percentage: "" }) }} className="w-full md:w-auto h-14 md:h-24 px-6 md:px-8 bg-emerald-600 hover:bg-emerald-700 text-white text-sm md:text-base font-bold rounded-xl md:rounded-[2rem] shadow-lg shadow-emerald-500/30 transition-all flex flex-row md:flex-col items-center justify-center gap-2 shrink-0">
            <UserPlus className="h-5 w-5 md:h-6 md:w-6" /> Yeni Personel Ekle
        </Button>
      </div>

      {/* 🚀 FORM ALANI */}
      {isAdding && (
          <div className="bg-white/80 backdrop-blur-2xl border border-white shadow-lg rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-8 animate-in fade-in slide-in-from-top-4">
              <h2 className="text-lg md:text-xl font-black text-slate-800 mb-5 md:mb-6">{editingId ? "Personel Bilgilerini Güncelle" : "Yeni Personel Kaydı"}</h2>
              <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  <div className="space-y-1.5 md:space-y-2">
                      <Label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Ad Soyad</Label>
                      <Input required placeholder="Örn: Emre Akyüz" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200 text-sm" />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                      <Label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Bölge</Label>
                      <Input required placeholder="Örn: Ege" value={form.region} onChange={e => setForm({...form, region: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200 text-sm" />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                      <Label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Prim Limiti (TL)</Label>
                      <Input required type="number" placeholder="3000000" value={form.premium_limit} onChange={e => setForm({...form, premium_limit: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold text-emerald-600 text-sm" />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                      <Label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Prim Yüzdesi (%)</Label>
                      <Input required type="number" step="0.01" placeholder="1.00" value={form.premium_percentage} onChange={e => setForm({...form, premium_percentage: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200 text-sm" />
                  </div>
                  <div className="sm:col-span-2 md:col-span-4 flex flex-col-reverse sm:flex-row justify-end gap-3 mt-2 md:mt-4">
                      <Button type="button" variant="ghost" onClick={() => { setIsAdding(false); setEditingId(null); }} className="h-12 px-6 rounded-xl font-bold w-full sm:w-auto">İptal</Button>
                      <Button type="submit" disabled={saving} className="h-12 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md w-full sm:w-auto">
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingId ? "Güncelle" : "Kaydet")}
                      </Button>
                  </div>
              </form>
          </div>
      )}

      {/* 🚀 AKIŞKAN TABLO LİSTESİ */}
      <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden w-full">
          <div className="overflow-x-auto custom-scrollbar p-2">
              <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-emerald-900/90 text-white backdrop-blur-md">
                      <tr>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-xs font-bold uppercase tracking-widest rounded-tl-xl md:rounded-tl-2xl">Ad Soyad</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-xs font-bold uppercase tracking-widest">Bölge</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-xs font-bold uppercase tracking-widest">Prim Limiti</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-xs font-bold uppercase tracking-widest text-center">Prim Yüzdesi</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-xs font-bold uppercase tracking-widest">Toplam Satış</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-xs font-bold uppercase tracking-widest">Hakedilen Prim</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-xs font-bold uppercase tracking-widest text-right rounded-tr-xl md:rounded-tr-2xl">İşlem</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-100 bg-white/40">
                      {personnel.map((p) => {
                          const limitPassed = p.totalSales >= p.premium_limit;
                          return (
                          <tr key={p.id} className="hover:bg-emerald-50/50 transition-colors group">
                              <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-black text-emerald-900 truncate max-w-[150px]">{p.full_name}</td>
                              <td className="px-4 md:px-6 py-3 md:py-4"><span className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-emerald-700 bg-white/80 border border-emerald-200 px-2 py-1 rounded-lg w-max shadow-sm"><MapPin className="h-3 w-3" /> {p.region}</span></td>
                              <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold text-emerald-800 tabular-nums">{p.premium_limit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                              <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold text-emerald-800 text-center">%{p.premium_percentage}</td>
                              <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-black text-slate-800 tabular-nums">{p.totalSales.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                              <td className="px-4 md:px-6 py-3 md:py-4">
                                  <span className={`inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black tabular-nums shadow-sm ${limitPassed && p.earnedPremium > 0 ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-white border border-slate-200 text-slate-400'}`}>
                                      <Award className="h-3 w-3 md:h-4 md:w-4" /> {p.earnedPremium.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                  </span>
                              </td>
                              <td className="px-4 md:px-6 py-3 md:py-4 text-right flex justify-end gap-1.5 md:gap-2 opacity-100 lg:opacity-30 lg:group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => openEdit(p)} className="p-1.5 md:p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg md:rounded-xl transition-colors"><Edit2 className="h-4 w-4 md:h-5 md:w-5" /></button>
                                  <button onClick={() => handleDelete(p.id)} className="p-1.5 md:p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg md:rounded-xl transition-colors"><Trash2 className="h-4 w-4 md:h-5 md:w-5" /></button>
                              </td>
                          </tr>
                      )})}
                      {personnel.length === 0 && !loading && (
                          <tr><td colSpan={7} className="py-16 md:py-20 text-center text-slate-500 text-sm font-bold">Personel kaydı bulunmuyor.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  )
}