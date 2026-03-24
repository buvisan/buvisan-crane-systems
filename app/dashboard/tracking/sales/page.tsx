"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TrendingUp, PlusCircle, Trash2, Loader2, Receipt, CalendarDays, Calculator } from "lucide-react"

export default function TrackingSalesPage() {
  const [sales, setSales] = useState<any[]>([])
  const [personnel, setPersonnel] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [form, setForm] = useState({
      sale_date: new Date().toISOString().split('T')[0],
      personnel_id: "",
      customer_name: "",
      customer_location: "",
      product_id: "",
      list_price: 0,
      discount_rate: 0,
      sale_price: 0,
      quantity: 1,
      total_amount: 0
  })

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  // Formül: Seçilen araca, iskontoya ve adete göre otomatik fiyat hesaplama
  useEffect(() => {
      const listPrice = Number(form.list_price) || 0
      const discount = Number(form.discount_rate) || 0
      const qty = Number(form.quantity) || 1

      const calculatedSalePrice = listPrice - (listPrice * (discount / 100))
      const calculatedTotal = calculatedSalePrice * qty

      setForm(prev => ({
          ...prev,
          sale_price: calculatedSalePrice,
          total_amount: calculatedTotal
      }))
  }, [form.list_price, form.discount_rate, form.quantity])

  // Araç seçildiğinde o aracın fiyatını otomatik form'a çekme
  const handleProductChange = (productId: string) => {
      const selectedProduct = products.find(p => p.id.toString() === productId)
      setForm(prev => ({
          ...prev,
          product_id: productId,
          list_price: selectedProduct ? selectedProduct.price : 0
      }))
  }

  const fetchData = async () => {
    setLoading(true)
    
    // Satışları çek (Personel ve Ürün bilgileriyle birlikte JOIN işlemi)
    const { data: salesData } = await supabase
        .from('tracking_sales')
        .select(`*, tracking_personnel(full_name), tracking_products(brand, model)`)
        .order('sale_date', { ascending: false })
    
    // Dropdown (Seçim kutuları) için verileri çek
    const { data: personnelData } = await supabase.from('tracking_personnel').select('*')
    const { data: productsData } = await supabase.from('tracking_products').select('*')

    if (salesData) setSales(salesData)
    if (personnelData) setPersonnel(personnelData)
    if (productsData) setProducts(productsData)
    
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.personnel_id || !form.product_id) return alert("Lütfen Personel ve Araç seçiniz!")

    setSaving(true)
    const { error } = await supabase.from('tracking_sales').insert([{
        sale_date: form.sale_date,
        personnel_id: Number(form.personnel_id),
        customer_name: form.customer_name,
        customer_location: form.customer_location,
        product_id: Number(form.product_id),
        list_price: form.list_price,
        discount_rate: form.discount_rate,
        sale_price: form.sale_price,
        quantity: form.quantity,
        total_amount: form.total_amount
    }])
    setSaving(false)

    if (error) {
        alert("Hata: " + error.message)
    } else {
        setForm({
            sale_date: new Date().toISOString().split('T')[0],
            personnel_id: "", customer_name: "", customer_location: "", product_id: "",
            list_price: 0, discount_rate: 0, sale_price: 0, quantity: 1, total_amount: 0
        })
        setIsAdding(false)
        fetchData()
    }
  }

  const handleDelete = async (id: number) => {
    if(!confirm("Bu satış kaydını tamamen silmek istediğinize emin misiniz? (Personelin primi de düşecektir)")) return;
    await supabase.from('tracking_sales').delete().eq('id', id)
    fetchData()
  }

  return (
    <div className="flex flex-col gap-8 max-w-[1600px] mx-auto w-full font-sans pb-10">
      
      {/* ÜST BAŞLIK */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-6 rounded-[2rem] shadow-sm flex-1">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-2xl shadow-lg shadow-amber-500/30">
                <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Satışlar ve İşlemler</h1>
                <p className="text-slate-500 font-medium text-sm mt-1">Personel bazlı araç satış kayıtları ve iskonto yönetim ekranı.</p>
            </div>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} className="h-24 px-8 bg-amber-500 hover:bg-amber-600 text-white text-base font-bold rounded-[2rem] shadow-lg shadow-amber-500/30 transition-all flex flex-col items-center justify-center gap-2 shrink-0">
            <PlusCircle className="h-6 w-6" /> Yeni Satış Gir
        </Button>
      </div>

      {/* 🚀 AKILLI SATIŞ FORMU */}
      {isAdding && (
          <div className="bg-white/80 backdrop-blur-2xl border border-white shadow-xl shadow-amber-500/5 rounded-[2.5rem] p-8 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                  <Calculator className="h-6 w-6 text-amber-500" />
                  <h2 className="text-xl font-black text-slate-800">Akıllı Satış Formu</h2>
              </div>
              
              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* Sol Taraf: Temel Bilgiler */}
                  <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tarih</Label>
                          <Input required type="date" value={form.sale_date} onChange={e => setForm({...form, sale_date: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Satış Personeli</Label>
                          <select required value={form.personnel_id} onChange={e => setForm({...form, personnel_id: e.target.value})} className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500">
                              <option value="">-- Personel Seçin --</option>
                              {personnel.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.region})</option>)}
                          </select>
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Müşteri Adı</Label>
                          <Input required placeholder="Örn: Emre Sel" value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Müşteri Konumu (İl)</Label>
                          <Input required placeholder="Örn: Bursa" value={form.customer_location} onChange={e => setForm({...form, customer_location: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Satılan Araç / Model</Label>
                          <select required value={form.product_id} onChange={e => handleProductChange(e.target.value)} className="w-full h-12 px-4 rounded-xl bg-amber-50 border border-amber-200 text-sm font-black text-amber-900 outline-none focus:ring-2 focus:ring-amber-500">
                              <option value="">-- Satılan Aracı Seçin --</option>
                              {products.map(p => <option key={p.id} value={p.id}>{p.brand} - {p.model} ({p.price.toLocaleString('tr-TR', {style:'currency', currency:'TRY'})})</option>)}
                          </select>
                      </div>
                  </div>

                  {/* Sağ Taraf: Fiyat Hesaplamaları */}
                  <div className="md:col-span-4 flex flex-col gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">İskonto (%)</Label>
                              <Input type="number" step="0.01" value={form.discount_rate} onChange={e => setForm({...form, discount_rate: Number(e.target.value)})} className="h-12 rounded-xl bg-white border-slate-200 font-bold" />
                          </div>
                          <div className="space-y-2">
                              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Adet</Label>
                              <Input type="number" min="1" value={form.quantity} onChange={e => setForm({...form, quantity: Number(e.target.value)})} className="h-12 rounded-xl bg-white border-slate-200 font-bold text-blue-600" />
                          </div>
                      </div>
                      
                      <div className="mt-auto space-y-3 pt-4 border-t border-slate-200">
                          <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-slate-500">Birim Satış Fiyatı:</span>
                              <span className="text-sm font-black text-slate-700">{form.sale_price.toLocaleString('tr-TR', {style:'currency', currency:'TRY'})}</span>
                          </div>
                          <div className="flex justify-between items-end bg-emerald-100 p-3 rounded-xl border border-emerald-200">
                              <span className="text-xs font-black text-emerald-800 uppercase tracking-widest">TOPLAM TUTAR</span>
                              <span className="text-2xl font-black text-emerald-600 tracking-tight">{form.total_amount.toLocaleString('tr-TR', {style:'currency', currency:'TRY'})}</span>
                          </div>
                      </div>
                  </div>

                  <div className="md:col-span-12 flex justify-end gap-3 mt-4">
                      <Button type="button" variant="ghost" onClick={() => setIsAdding(false)} className="h-14 px-8 rounded-2xl font-bold">İptal Et</Button>
                      <Button type="submit" disabled={saving} className="h-14 px-10 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black shadow-xl shadow-amber-500/20 text-lg">
                          {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Satışı Veritabanına Yaz"}
                      </Button>
                  </div>
              </form>
          </div>
      )}

      {/* LİSTELEME (EXCEL GÖRÜNÜMÜNÜN MODERN HALİ) */}
      <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead className="bg-[#4b5e40] text-white">
                      <tr>
                          <th className="px-4 py-4 text-[11px] font-black uppercase tracking-widest">Tarih</th>
                          <th className="px-4 py-4 text-[11px] font-black uppercase tracking-widest">Satış Personeli</th>
                          <th className="px-4 py-4 text-[11px] font-black uppercase tracking-widest">Müşteri Adı</th>
                          <th className="px-4 py-4 text-[11px] font-black uppercase tracking-widest">Müşteri Konumu</th>
                          <th className="px-4 py-4 text-[11px] font-black uppercase tracking-widest">Marka</th>
                          <th className="px-4 py-4 text-[11px] font-black uppercase tracking-widest">Model</th>
                          <th className="px-4 py-4 text-[11px] font-black uppercase tracking-widest">Liste Fiyatı</th>
                          <th className="px-4 py-4 text-[11px] font-black uppercase tracking-widest text-center">İskonto</th>
                          <th className="px-4 py-4 text-[11px] font-black uppercase tracking-widest">Satış Fiyatı</th>
                          <th className="px-4 py-4 text-[11px] font-black uppercase tracking-widest text-center">Adet</th>
                          <th className="px-4 py-4 text-[11px] font-black uppercase tracking-widest bg-[#3d4d34]">Toplam Tutar</th>
                          <th className="px-4 py-4 text-[11px] font-black uppercase tracking-widest text-right"></th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e1e6de]">
                      {sales.map((sale) => (
                          <tr key={sale.id} className="hover:bg-[#f1f4ef] transition-colors bg-[#ebf0e8]">
                              <td className="px-4 py-3 text-sm font-bold text-slate-600">
                                  {new Date(sale.sale_date).toLocaleDateString('tr-TR')}
                              </td>
                              <td className="px-4 py-3 text-sm font-black text-slate-800">{sale.tracking_personnel?.full_name}</td>
                              <td className="px-4 py-3 text-sm font-bold text-slate-700">{sale.customer_name}</td>
                              <td className="px-4 py-3 text-sm font-medium text-slate-600">{sale.customer_location}</td>
                              <td className="px-4 py-3 text-sm font-bold text-slate-800">{sale.tracking_products?.brand}</td>
                              <td className="px-4 py-3 text-sm font-bold text-slate-600">{sale.tracking_products?.model}</td>
                              <td className="px-4 py-3 text-sm font-medium text-slate-500 tabular-nums">
                                  {sale.list_price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                              </td>
                              <td className="px-4 py-3 text-sm font-bold text-amber-600 text-center bg-amber-50/50">
                                  %{sale.discount_rate}
                              </td>
                              <td className="px-4 py-3 text-sm font-bold text-slate-800 tabular-nums">
                                  {sale.sale_price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                              </td>
                              <td className="px-4 py-3 text-sm font-black text-blue-600 text-center bg-blue-50/50">
                                  {sale.quantity}
                              </td>
                              <td className="px-4 py-3 text-sm font-black text-[#2e4024] bg-[#dbe6d5] tabular-nums shadow-inner">
                                  {sale.total_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                              </td>
                              <td className="px-4 py-3 text-right">
                                  <button onClick={() => handleDelete(sale.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                      <Trash2 className="h-4 w-4" />
                                  </button>
                              </td>
                          </tr>
                      ))}
                      {sales.length === 0 && !loading && (
                          <tr>
                              <td colSpan={12} className="py-20 text-center bg-white">
                                  <div className="flex flex-col items-center gap-3">
                                      <div className="bg-amber-50 p-5 rounded-full shadow-sm"><Receipt className="h-10 w-10 text-amber-300" /></div>
                                      <p className="text-lg font-bold text-amber-600">Henüz satış kaydı bulunmuyor.</p>
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