"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, PlusCircle, Trash2, Loader2, UserPlus, MapPin, Award } from "lucide-react"

export default function TrackingPersonnelPage() {
  const [personnel, setPersonnel] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [form, setForm] = useState({ full_name: "", region: "", premium_limit: "", premium_percentage: "" })
  const supabase = createClient()

  useEffect(() => {
    fetchPersonnel()
  }, [])

  const fetchPersonnel = async () => {
    setLoading(true)
    // Personelleri ve onlara ait satışların toplam tutarını çekiyoruz
    const { data } = await supabase
        .from('tracking_personnel')
        .select(`*, tracking_sales ( total_amount )`)
        .order('created_at', { ascending: true })
    
    if (data) {
        // Excel mantığı: Toplam satış > Prim limiti ise Hakedilen Prim hesapla, yoksa 0.
        const calculatedData = data.map(person => {
            const totalSales = person.tracking_sales.reduce((sum: number, sale: any) => sum + Number(sale.total_amount), 0)
            const earnedPremium = totalSales >= person.premium_limit 
                ? (totalSales * (person.premium_percentage / 100)) 
                : 0
            
            return { ...person, totalSales, earnedPremium }
        })
        setPersonnel(calculatedData)
    }
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('tracking_personnel').insert([{
        full_name: form.full_name,
        region: form.region,
        premium_limit: Number(form.premium_limit),
        premium_percentage: Number(form.premium_percentage)
    }])
    setSaving(false)

    if (error) {
        alert("Hata: " + error.message)
    } else {
        setForm({ full_name: "", region: "", premium_limit: "", premium_percentage: "" })
        setIsAdding(false)
        fetchPersonnel()
    }
  }

  const handleDelete = async (id: number) => {
    if(!confirm("Bu personeli silmek istediğinize emin misiniz?")) return;
    await supabase.from('tracking_personnel').delete().eq('id', id)
    fetchPersonnel()
  }

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto w-full font-sans pb-10">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-6 rounded-[2rem] shadow-sm flex-1">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl shadow-lg shadow-emerald-500/30">
                <Users className="h-8 w-8 text-white" />
            </div>
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Satış Personelleri</h1>
                <p className="text-slate-500 font-medium text-sm mt-1">Ekip üyeleri, bölgeler ve otomatik prim hakediş tablosu.</p>
            </div>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} className="h-24 px-8 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold rounded-[2rem] shadow-lg shadow-emerald-500/30 transition-all flex flex-col items-center justify-center gap-2 shrink-0">
            <UserPlus className="h-6 w-6" /> Yeni Personel Ekle
        </Button>
      </div>

      {isAdding && (
          <div className="bg-white/80 backdrop-blur-2xl border border-white shadow-lg rounded-[2.5rem] p-8 animate-in fade-in slide-in-from-top-4">
              <h2 className="text-xl font-black text-slate-800 mb-6">Yeni Personel Kaydı</h2>
              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ad Soyad</Label>
                      <Input required placeholder="Örn: Emre Akyüz" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bölge</Label>
                      <Input required placeholder="Örn: Ege" value={form.region} onChange={e => setForm({...form, region: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Prim Limiti (TL)</Label>
                      <Input required type="number" placeholder="3000000" value={form.premium_limit} onChange={e => setForm({...form, premium_limit: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold text-emerald-600" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Prim Yüzdesi (%)</Label>
                      <Input required type="number" step="0.01" placeholder="1.00" value={form.premium_percentage} onChange={e => setForm({...form, premium_percentage: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                  </div>
                  <div className="md:col-span-4 flex justify-end gap-3 mt-2">
                      <Button type="button" variant="ghost" onClick={() => setIsAdding(false)} className="h-12 px-6 rounded-xl font-bold">İptal</Button>
                      <Button type="submit" disabled={saving} className="h-12 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md">
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Kaydet"}
                      </Button>
                  </div>
              </form>
          </div>
      )}

      <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] overflow-hidden">
          <table className="w-full text-left border-collapse">
              <thead className="bg-emerald-900 text-white">
                  <tr>
                      <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest">Ad Soyad</th>
                      <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest">Bölge</th>
                      <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest">Prim Limiti</th>
                      <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest">Prim Yüzdesi</th>
                      <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest">Toplam Satış</th>
                      <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest">Hakedilen Prim</th>
                      <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-right"></th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100">
                  {personnel.map((p) => {
                      const limitPassed = p.totalSales >= p.premium_limit;
                      return (
                      <tr key={p.id} className="hover:bg-emerald-50/50 transition-colors bg-emerald-50/20">
                          <td className="px-6 py-4 text-sm font-black text-emerald-900">{p.full_name}</td>
                          <td className="px-6 py-4">
                              <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-white border border-emerald-200 px-2 py-1 rounded w-max">
                                  <MapPin className="h-3 w-3" /> {p.region}
                              </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-emerald-800 tabular-nums">
                              {p.premium_limit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-emerald-800 text-center">
                              %{p.premium_percentage}
                          </td>
                          <td className="px-6 py-4 text-sm font-black text-slate-800 tabular-nums">
                              {p.totalSales.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                          </td>
                          <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-black tabular-nums shadow-sm ${limitPassed && p.earnedPremium > 0 ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-white border border-slate-200 text-slate-400'}`}>
                                  <Award className="h-4 w-4" />
                                  {p.earnedPremium.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                              </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                              <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                  <Trash2 className="h-5 w-5" />
                              </button>
                          </td>
                      </tr>
                  )})}
                  {personnel.length === 0 && !loading && (
                      <tr>
                          <td colSpan={7} className="py-20 text-center bg-white">
                              <div className="flex flex-col items-center gap-3">
                                  <div className="bg-emerald-50 p-5 rounded-full shadow-sm"><Users className="h-10 w-10 text-emerald-300" /></div>
                                  <p className="text-lg font-bold text-emerald-600">Henüz personel eklenmemiş.</p>
                              </div>
                          </td>
                      </tr>
                  )}
              </tbody>
          </table>
      </div>
    </div>
  )
}