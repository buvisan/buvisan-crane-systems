"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CarFront, PlusCircle, Trash2, Loader2, PackageOpen, Search, Edit2 } from "lucide-react"

export default function TrackingProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("") 
  const [editingId, setEditingId] = useState<number | null>(null) // 🚀 DÜZENLEME STATE'İ
  
  const [form, setForm] = useState({ brand: "", model: "", price: "", stock: "" })
  const supabase = createClient()

  useEffect(() => { fetchProducts() }, [])

  const fetchProducts = async () => {
    setLoading(true)
    const { data } = await supabase.from('tracking_products').select('*').order('brand', { ascending: true })
    if (data) setProducts(data)
    setLoading(false)
  }

  // 🚀 DÜZENLEME MODUNU AÇ
  const openEdit = (p: any) => {
      setForm({ brand: p.brand, model: p.model, price: p.price, stock: p.stock })
      setEditingId(p.id)
      setIsAdding(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    let error;
    if (editingId) {
        const { error: updateError } = await supabase.from('tracking_products').update({
            brand: form.brand, model: form.model, price: Number(form.price), stock: Number(form.stock)
        }).eq('id', editingId)
        error = updateError;
    } else {
        const { error: insertError } = await supabase.from('tracking_products').insert([{
            brand: form.brand, model: form.model, price: Number(form.price), stock: Number(form.stock)
        }])
        error = insertError;
    }
    
    setSaving(false)

    if (error) alert("Hata: " + error.message)
    else { setForm({ brand: "", model: "", price: "", stock: "" }); setEditingId(null); setIsAdding(false); fetchProducts(); }
  }

  const handleDelete = async (id: number) => {
    if(!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
    const { error } = await supabase.from('tracking_products').delete().eq('id', id)
    if (error && error.code === '23503') alert("DİKKAT: Bu ürünün sistemde kayıtlı satışları var. Önce satışları silmelisiniz.");
    else if (error) alert("Silinirken hata oluştu: " + error.message);
    else fetchProducts()
  }

  const filteredProducts = products.filter(p => 
      p.brand.toLowerCase().includes(searchTerm.toLowerCase()) || p.model.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto w-full font-sans pb-10">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-6 rounded-[2rem] shadow-sm flex-1">
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-4 rounded-2xl shadow-lg shadow-indigo-500/30"><CarFront className="h-8 w-8 text-white" /></div>
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Ürünler ve Modeller</h1>
                <p className="text-slate-500 font-medium text-sm mt-1">Satıştaki araçların marka, model ve fiyat listesi.</p>
            </div>
        </div>

        <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input placeholder="Marka veya Model Ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-11 h-16 bg-white/80 border-white/50 text-base font-bold text-slate-700 shadow-sm rounded-[2rem] focus:ring-2 focus:ring-indigo-500" />
        </div>

        <Button onClick={() => { setIsAdding(!isAdding); setEditingId(null); setForm({ brand: "", model: "", price: "", stock: "" }) }} className="h-16 px-8 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold rounded-[2rem] shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2 shrink-0">
            <PlusCircle className="h-5 w-5" /> Yeni Ürün Ekle
        </Button>
      </div>

      {isAdding && (
          <div className="bg-white/80 backdrop-blur-2xl border border-white shadow-lg rounded-[2.5rem] p-8 animate-in fade-in slide-in-from-top-4">
              <h2 className="text-xl font-black text-slate-800 mb-6">{editingId ? "Ürün Bilgilerini Güncelle" : "Yeni Araç Kaydı"}</h2>
              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Marka</Label>
                      <Input required placeholder="Örn: 10 TON ÇİFT KİRİŞ..." value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Model Yılı / Kodu</Label>
                      <Input required placeholder="Örn: 2026" value={form.model} onChange={e => setForm({...form, model: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Liste Fiyatı (TL)</Label>
                      <Input required type="number" placeholder="1500000" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold text-indigo-600" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Stok Adeti</Label>
                      <Input required type="number" placeholder="1" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                  </div>
                  <div className="md:col-span-4 flex justify-end gap-3 mt-2">
                      <Button type="button" variant="ghost" onClick={() => { setIsAdding(false); setEditingId(null); }} className="h-12 px-6 rounded-xl font-bold">İptal</Button>
                      <Button type="submit" disabled={saving} className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md">
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingId ? "Güncelle" : "Kaydet")}
                      </Button>
                  </div>
              </form>
          </div>
      )}

      <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] overflow-hidden">
          <table className="w-full text-left border-collapse">
              <thead className="bg-white/40 border-b border-slate-100">
                  <tr>
                      <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Ürün Markası / Cinsi</th>
                      <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Model / Kod</th>
                      <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Fiyat</th>
                      <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Stok</th>
                      <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">İşlem</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                  {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="px-6 py-4 text-sm font-black text-slate-800">{p.brand}</td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-600">{p.model}</td>
                          <td className="px-6 py-4 text-sm font-black text-indigo-600 tabular-nums">{p.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                          <td className="px-6 py-4"><span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-sm font-bold border border-slate-200">{p.stock}</span></td>
                          <td className="px-6 py-4 text-right flex justify-end gap-2">
                              <button onClick={() => openEdit(p)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="h-5 w-5" /></button>
                              <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="h-5 w-5" /></button>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
    </div>
  )
}