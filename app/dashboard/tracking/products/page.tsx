"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CarFront, PlusCircle, Trash2, Loader2, PackageOpen } from "lucide-react"

export default function TrackingProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [form, setForm] = useState({ brand: "", model: "", price: "", stock: "" })
  const supabase = createClient()

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    const { data } = await supabase.from('tracking_products').select('*').order('brand', { ascending: true })
    if (data) setProducts(data)
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('tracking_products').insert([{
        brand: form.brand,
        model: form.model,
        price: Number(form.price),
        stock: Number(form.stock)
    }])
    setSaving(false)

    if (error) {
        alert("Hata: " + error.message)
    } else {
        setForm({ brand: "", model: "", price: "", stock: "" })
        setIsAdding(false)
        fetchProducts()
    }
  }

  const handleDelete = async (id: number) => {
    if(!confirm("Bu aracı/ürünü silmek istediğinize emin misiniz?")) return;
    await supabase.from('tracking_products').delete().eq('id', id)
    fetchProducts()
  }

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto w-full font-sans pb-10">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-6 rounded-[2rem] shadow-sm flex-1">
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-4 rounded-2xl shadow-lg shadow-indigo-500/30">
                <CarFront className="h-8 w-8 text-white" />
            </div>
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Ürünler ve Modeller</h1>
                <p className="text-slate-500 font-medium text-sm mt-1">Satıştaki araçların marka, model ve fiyat listesi.</p>
            </div>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} className="h-24 px-8 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold rounded-[2rem] shadow-lg shadow-indigo-500/30 transition-all flex flex-col items-center justify-center gap-2 shrink-0">
            <PlusCircle className="h-6 w-6" /> Yeni Ürün Ekle
        </Button>
      </div>

      {isAdding && (
          <div className="bg-white/80 backdrop-blur-2xl border border-white shadow-lg rounded-[2.5rem] p-8 animate-in fade-in slide-in-from-top-4">
              <h2 className="text-xl font-black text-slate-800 mb-6">Yeni Araç Kaydı</h2>
              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Marka</Label>
                      <Input required placeholder="Örn: Audi" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Model</Label>
                      <Input required placeholder="Örn: A3" value={form.model} onChange={e => setForm({...form, model: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Liste Fiyatı (TL)</Label>
                      <Input required type="number" placeholder="1500000" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold text-indigo-600" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Stok Adeti</Label>
                      <Input required type="number" placeholder="9" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                  </div>
                  <div className="md:col-span-4 flex justify-end gap-3 mt-2">
                      <Button type="button" variant="ghost" onClick={() => setIsAdding(false)} className="h-12 px-6 rounded-xl font-bold">İptal</Button>
                      <Button type="submit" disabled={saving} className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md">
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Kaydet"}
                      </Button>
                  </div>
              </form>
          </div>
      )}

      <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] overflow-hidden">
          <table className="w-full text-left border-collapse">
              <thead className="bg-white/40 border-b border-slate-100">
                  <tr>
                      <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Ürün Markası</th>
                      <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Ürün Modeli</th>
                      <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Fiyat</th>
                      <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Stok Adeti</th>
                      <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">İşlem</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                  {products.map((p) => (
                      <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="px-6 py-4 text-sm font-black text-slate-800">{p.brand}</td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-600">{p.model}</td>
                          <td className="px-6 py-4 text-sm font-black text-indigo-600 tabular-nums">
                              {p.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                          </td>
                          <td className="px-6 py-4">
                              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-sm font-bold border border-slate-200">
                                  {p.stock}
                              </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                              <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                  <Trash2 className="h-5 w-5" />
                              </button>
                          </td>
                      </tr>
                  ))}
                  {products.length === 0 && !loading && (
                      <tr>
                          <td colSpan={5} className="py-20 text-center">
                              <div className="flex flex-col items-center gap-3">
                                  <div className="bg-white p-5 rounded-full shadow-sm"><PackageOpen className="h-10 w-10 text-slate-300" /></div>
                                  <p className="text-lg font-bold text-slate-600">Henüz ürün eklenmemiş.</p>
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