"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TrendingUp, PlusCircle, Trash2, Loader2, Receipt, Calculator, Search, X, Edit2, Globe } from "lucide-react"

export default function TrackingSalesPage() {
  const [sales, setSales] = useState<any[]>([])
  const [personnel, setPersonnel] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  const [searchTerm, setSearchTerm] = useState("") 
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false)
  const [productSearch, setProductSearch] = useState("") 

  // 🚀 CANLI DÖVİZ KURU STATELERİ
  const [currency, setCurrency] = useState("TRY")
  const [rates, setRates] = useState<Record<string, number>>({ TRY: 1 })

  const [form, setForm] = useState({
      sale_date: new Date().toISOString().split('T')[0], personnel_id: "", customer_name: "", customer_location: "", 
      product_id: "", brand: "", model: "", list_price: 0, discount_rate: 0, sale_price: 0, quantity: 1, total_amount: 0
  })

  const supabase = createClient()

  useEffect(() => { 
      fetchData()
      fetchExchangeRates() 
  }, [])

  const fetchExchangeRates = async () => {
      try {
          const res = await fetch('https://open.er-api.com/v6/latest/TRY')
          const data = await res.json()
          if (data && data.rates) setRates(data.rates)
      } catch (error) {
          console.error("Döviz kurları çekilemedi:", error)
      }
  }

  // TL olarak duran veriyi ekrandaki seçili kura çevirir (Tablolar için)
  const formatPrice = (priceInTRY: number) => {
      const rate = rates[currency] || 1
      const convertedPrice = priceInTRY * rate
      try {
          return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency }).format(convertedPrice)
      } catch (e) {
          return `${convertedPrice.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ${currency}`
      }
  }

  // Form içindeki hesaplamalar HER ZAMAN seçili kur üzerinden yapılır
  useEffect(() => {
      const listPrice = Number(form.list_price) || 0
      const discount = Number(form.discount_rate) || 0
      const qty = Number(form.quantity) || 1
      const calculatedSalePrice = listPrice - (listPrice * (discount / 100))
      const calculatedTotal = calculatedSalePrice * qty
      setForm(prev => ({ ...prev, sale_price: calculatedSalePrice, total_amount: calculatedTotal }))
  }, [form.list_price, form.discount_rate, form.quantity])

  const fetchData = async () => {
    setLoading(true)
    const { data: salesData } = await supabase.from('tracking_sales').select(`*, tracking_personnel(full_name), tracking_products(brand, model)`).order('sale_date', { ascending: false })
    const { data: personnelData } = await supabase.from('tracking_personnel').select('*')
    const { data: productsData } = await supabase.from('tracking_products').select('*')

    if (salesData) setSales(salesData)
    if (personnelData) setPersonnel(personnelData)
    if (productsData) setProducts(productsData)
    setLoading(false)
  }

  const openEdit = (sale: any) => {
      const rate = rates[currency] || 1
      setForm({
          sale_date: sale.sale_date, personnel_id: sale.personnel_id.toString(), customer_name: sale.customer_name,
          customer_location: sale.customer_location, product_id: sale.product_id.toString(), 
          brand: sale.tracking_products?.brand || "", model: sale.tracking_products?.model || "",
          // 🚀 SEÇİLİ KURA ÇEVİRİP FORMA DOLDURUYORUZ
          list_price: sale.list_price * rate, 
          discount_rate: sale.discount_rate, 
          sale_price: sale.sale_price * rate, 
          quantity: sale.quantity, 
          total_amount: sale.total_amount * rate
      })
      setEditingId(sale.id)
      setIsAdding(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.personnel_id) return alert("Lütfen Personel seçiniz!")
    if (!form.brand || !form.list_price) return alert("Lütfen Makine Markasını ve Liste Fiyatını giriniz!")
    
    setSaving(true)
    let finalProductId = form.product_id

    // Ürün kaydı varsa kur çevirisi ile TRY olarak kaydedelim
    const rate = rates[currency] || 1

    if (!finalProductId) {
        const { data: newProd, error: prodErr } = await supabase.from('tracking_products').insert([{
            brand: form.brand, model: form.model || "-", 
            price: Number(form.list_price) / rate, // 🚀 TRY'ye ÇEVİRİP KAYDEDİYORUZ
            stock: 1
        }]).select().single()

        if (prodErr) { alert("Yeni makine veritabanına kaydedilirken hata oluştu: " + prodErr.message); setSaving(false); return; }
        finalProductId = newProd.id.toString()
    }

    const payload = {
        sale_date: form.sale_date, personnel_id: Number(form.personnel_id), customer_name: form.customer_name,
        customer_location: form.customer_location, product_id: Number(finalProductId), 
        // 🚀 VERİTABANINA GİDERKEN TRY'YE GERİ ÇEVİRİYORUZ (Güvenli Veri)
        list_price: form.list_price / rate,
        discount_rate: form.discount_rate, 
        sale_price: form.sale_price / rate, 
        quantity: form.quantity, 
        total_amount: form.total_amount / rate
    }

    let error;
    if (editingId) {
        const { error: updateError } = await supabase.from('tracking_sales').update(payload).eq('id', editingId)
        error = updateError;
    } else {
        const { error: insertError } = await supabase.from('tracking_sales').insert([payload])
        error = insertError;
    }

    setSaving(false)

    if (error) alert("Hata: " + error.message)
    else {
        setForm({ sale_date: new Date().toISOString().split('T')[0], personnel_id: "", customer_name: "", customer_location: "", product_id: "", brand: "", model: "", list_price: 0, discount_rate: 0, sale_price: 0, quantity: 1, total_amount: 0 })
        setEditingId(null)
        setIsAdding(false)
        fetchData()
    }
  }

  const handleDelete = async (id: number) => {
    if(!confirm("Bu satış kaydını silmek istediğinize emin misiniz?")) return;
    await supabase.from('tracking_sales').delete().eq('id', id)
    fetchData()
  }

  const filteredSales = sales.filter(s => 
      s.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.tracking_products?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.tracking_personnel?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const currencyOptions = ['TRY', 'USD', 'EUR', 'GBP', ...Object.keys(rates).filter(c => !['TRY', 'USD', 'EUR', 'GBP'].includes(c))]

  return (
    <div className="flex flex-col gap-8 max-w-[1600px] mx-auto w-full font-sans pb-10">
      
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
        
        <div className="relative w-full md:w-64 shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input placeholder="Listede Ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-11 h-16 bg-white/80 border-white/50 text-sm font-bold text-slate-700 shadow-sm rounded-[2rem] focus:ring-2 focus:ring-amber-500" />
        </div>

        <div className="flex items-center gap-2 bg-white/80 border border-white/50 shadow-sm rounded-[2rem] h-16 px-4 shrink-0">
            <Globe className="h-5 w-5 text-emerald-600" />
            <select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-transparent border-none text-sm font-black text-slate-800 outline-none cursor-pointer pr-2"
            >
                {currencyOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>

        <Button onClick={() => { setIsAdding(!isAdding); setEditingId(null); setForm({ sale_date: new Date().toISOString().split('T')[0], personnel_id: "", customer_name: "", customer_location: "", product_id: "", brand: "", model: "", list_price: 0, discount_rate: 0, sale_price: 0, quantity: 1, total_amount: 0 }) }} className="h-16 px-8 bg-amber-500 hover:bg-amber-600 text-white text-base font-bold rounded-[2rem] shadow-lg shadow-amber-500/30 transition-all flex items-center gap-2 shrink-0">
            <PlusCircle className="h-5 w-5" /> Yeni Satış Gir
        </Button>
      </div>

      {isAdding && (
          <div className="bg-white/80 backdrop-blur-2xl border border-white shadow-xl shadow-amber-500/5 rounded-[2.5rem] p-8 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                  <Calculator className="h-6 w-6 text-amber-500" />
                  <h2 className="text-xl font-black text-slate-800">{editingId ? "Satış Kaydını Düzenle" : "Akıllı Satış Formu"}</h2>
              </div>
              
              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tarih</Label>
                          <Input required type="date" value={form.sale_date} onChange={e => setForm({...form, sale_date: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Satış Personeli</Label>
                          <select required value={form.personnel_id} onChange={e => setForm({...form, personnel_id: e.target.value})} className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500">
                              <option value="">-- Personel Seçin --</option>
                              {personnel.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                          </select>
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Müşteri Adı</Label>
                          <Input required placeholder="Örn: Kaya Ali Tosun" value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Müşteri Konumu (İl)</Label>
                          <Input required placeholder="Örn: Bursa" value={form.customer_location} onChange={e => setForm({...form, customer_location: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                      </div>
                      
                      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                          <div className="space-y-2 relative md:col-span-1">
                              <Label className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Makine Markası / Cinsi</Label>
                              <Input
                                  placeholder="Örn: 10 Ton Çift..."
                                  value={form.brand}
                                  onChange={(e) => { setForm({...form, brand: e.target.value, product_id: ""}); setIsProductDropdownOpen(true); }}
                                  onFocus={() => setIsProductDropdownOpen(true)}
                                  onBlur={() => setTimeout(() => setIsProductDropdownOpen(false), 200)}
                                  className="h-12 rounded-xl bg-white border-amber-200 focus:ring-amber-500 font-bold"
                              />
                              {isProductDropdownOpen && form.brand && (
                                  <div className="absolute z-50 w-full md:w-[250%] mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-48 overflow-y-auto p-1">
                                      {products.filter(p => p.brand.toLowerCase().includes(form.brand.toLowerCase())).map(p => (
                                          <button key={p.id} type="button" onClick={() => { 
                                              const productRate = rates[currency] || 1;
                                              setForm({...form, brand: p.brand, model: p.model, list_price: p.price * productRate, product_id: p.id.toString()}); 
                                              setIsProductDropdownOpen(false); 
                                          }} className="w-full text-left px-3 py-2 text-sm font-bold text-slate-700 hover:bg-amber-50 rounded-lg">
                                              {p.brand} - {p.model}
                                          </button>
                                      ))}
                                      {products.filter(p => p.brand.toLowerCase().includes(form.brand.toLowerCase())).length === 0 && (
                                          <div className="px-3 py-2 text-[11px] font-bold text-emerald-600 text-center bg-emerald-50 rounded-lg">✨ Yeni makine olarak eklenecek</div>
                                      )}
                                  </div>
                              )}
                          </div>
                          <div className="space-y-2">
                              <Label className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Model / Kod</Label>
                              <Input placeholder="Örn: 2026" value={form.model} onChange={e => setForm({...form, model: e.target.value, product_id: ""})} className="h-12 rounded-xl bg-white border-amber-200 focus:ring-amber-500 font-bold" />
                          </div>
                          <div className="space-y-2">
                              {/* 🚀 ETİKET SEÇİLİ KURA DÖNÜŞTÜ */}
                              <Label className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded">Liste Fiyatı ({currency})</Label>
                              <Input type="number" value={form.list_price || ""} onChange={e => setForm({...form, list_price: Number(e.target.value), product_id: ""})} className="h-12 rounded-xl bg-white border-amber-200 focus:ring-amber-500 font-bold text-amber-700" />
                          </div>
                      </div>
                  </div>

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
                              <span className="text-sm font-black text-slate-700">
                                  {/* 🚀 SONUÇLAR DOĞRUDAN FORM DEĞERİNDEN GÖSTERİLİR */}
                                  {form.sale_price.toLocaleString('tr-TR', {style:'currency', currency: currency})}
                              </span>
                          </div>
                          <div className="flex justify-between items-end bg-emerald-100 p-3 rounded-xl border border-emerald-200">
                              <span className="text-xs font-black text-emerald-800 uppercase tracking-widest">TOPLAM TUTAR</span>
                              <span className="text-2xl font-black text-emerald-600 tracking-tight">
                                  {form.total_amount.toLocaleString('tr-TR', {style:'currency', currency: currency})}
                              </span>
                          </div>
                      </div>
                  </div>

                  <div className="md:col-span-12 flex justify-end gap-3 mt-4">
                      <Button type="button" variant="ghost" onClick={() => { setIsAdding(false); setEditingId(null); }} className="h-14 px-8 rounded-2xl font-bold">İptal Et</Button>
                      <Button type="submit" disabled={saving} className="h-14 px-10 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black shadow-xl shadow-amber-500/20 text-lg">
                          {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (editingId ? "Satışı Güncelle" : "Satışı Veritabanına Yaz")}
                      </Button>
                  </div>
              </form>
          </div>
      )}

      {/* LİSTELEME */}
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
                          <th className="px-4 py-4 text-[11px] font-black uppercase tracking-widest text-right">İşlem</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e1e6de]">
                      {filteredSales.map((sale) => (
                          <tr key={sale.id} className="hover:bg-[#f1f4ef] transition-colors bg-[#ebf0e8]">
                              <td className="px-4 py-3 text-sm font-bold text-slate-600">{new Date(sale.sale_date).toLocaleDateString('tr-TR')}</td>
                              <td className="px-4 py-3 text-sm font-black text-slate-800">{sale.tracking_personnel?.full_name}</td>
                              <td className="px-4 py-3 text-sm font-bold text-slate-700">{sale.customer_name}</td>
                              <td className="px-4 py-3 text-sm font-medium text-slate-600">{sale.customer_location}</td>
                              <td className="px-4 py-3 text-sm font-bold text-slate-800 truncate max-w-[150px]">{sale.tracking_products?.brand}</td>
                              <td className="px-4 py-3 text-sm font-bold text-slate-600">{sale.tracking_products?.model}</td>
                              <td className="px-4 py-3 text-sm font-medium text-slate-500 tabular-nums">{formatPrice(sale.list_price)}</td>
                              <td className="px-4 py-3 text-sm font-bold text-amber-600 text-center bg-amber-50/50">%{sale.discount_rate}</td>
                              <td className="px-4 py-3 text-sm font-bold text-slate-800 tabular-nums">{formatPrice(sale.sale_price)}</td>
                              <td className="px-4 py-3 text-sm font-black text-blue-600 text-center bg-blue-50/50">{sale.quantity}</td>
                              <td className="px-4 py-3 text-sm font-black text-[#2e4024] bg-[#dbe6d5] tabular-nums shadow-inner">{formatPrice(sale.total_amount)}</td>
                              <td className="px-4 py-3 text-right flex justify-end gap-1">
                                  <button onClick={() => openEdit(sale)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="h-4 w-4" /></button>
                                  <button onClick={() => handleDelete(sale.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
                              </td>
                          </tr>
                      ))}
                      {filteredSales.length === 0 && !loading && (
                          <tr><td colSpan={12} className="py-20 text-center bg-white"><div className="flex flex-col items-center gap-3"><div className="bg-amber-50 p-5 rounded-full shadow-sm"><Receipt className="h-10 w-10 text-amber-300" /></div><p className="text-lg font-bold text-amber-600">Satış kaydı bulunmuyor.</p></div></td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  )
}