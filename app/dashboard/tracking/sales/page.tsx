"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TrendingUp, PlusCircle, Trash2, Loader2, Receipt, Calculator, Search, X, Edit2, Globe, ShoppingCart, Plus } from "lucide-react"

type SaleItem = {
    product_id: string;
    brand: string;
    model: string;
    list_price: number;
    discount_rate: number;
    sale_price: number;
    quantity: number;
    total_amount: number;
}

export default function TrackingSalesPage() {
  const [sales, setSales] = useState<any[]>([])
  const [personnel, setPersonnel] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  const [searchTerm, setSearchTerm] = useState("") 
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState<{index: number, isOpen: boolean}>({ index: -1, isOpen: false })

  const [currency, setCurrency] = useState("TRY")
  const [rates, setRates] = useState<Record<string, number>>({ TRY: 1 })

  // 🚀 SEPET MANTIĞI EKLENDİ (items)
  const [form, setForm] = useState({
      sale_date: new Date().toISOString().split('T')[0], personnel_id: "", customer_name: "", customer_location: ""
  })
  
  const [items, setItems] = useState<SaleItem[]>([
      { product_id: "", brand: "", model: "", list_price: 0, discount_rate: 0, sale_price: 0, quantity: 1, total_amount: 0 }
  ])

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

  const formatPrice = (priceInTRY: number) => {
      const rate = rates[currency] || 1
      const convertedPrice = priceInTRY * rate
      try {
          return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency }).format(convertedPrice)
      } catch (e) {
          return `${convertedPrice.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ${currency}`
      }
  }

  // Sepetteki her kalem için anlık hesaplama
  const updateItem = (index: number, field: keyof SaleItem, value: any) => {
      const newItems = [...items]
      // @ts-ignore
      newItems[index][field] = value
      
      const listPrice = Number(newItems[index].list_price) || 0
      const discount = Number(newItems[index].discount_rate) || 0
      const qty = Number(newItems[index].quantity) || 1
      
      newItems[index].sale_price = listPrice - (listPrice * (discount / 100))
      newItems[index].total_amount = newItems[index].sale_price * qty
      
      setItems(newItems)
  }

  const addLineItem = () => {
      setItems([...items, { product_id: "", brand: "", model: "", list_price: 0, discount_rate: 0, sale_price: 0, quantity: 1, total_amount: 0 }])
  }

  const removeLineItem = (index: number) => {
      const newItems = [...items]
      newItems.splice(index, 1)
      setItems(newItems)
  }

  const getGrandTotal = () => items.reduce((sum, item) => sum + item.total_amount, 0)

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

  // DÜZENLEME EKRANI TEK SATIRA İNER (Çoklu satır güncellemesi database yapısı gereği karmasıktır)
  const openEdit = (sale: any) => {
      const rate = rates[currency] || 1
      setForm({
          sale_date: sale.sale_date, personnel_id: sale.personnel_id.toString(), customer_name: sale.customer_name, customer_location: sale.customer_location
      })
      setItems([{
          product_id: sale.product_id?.toString() || "", 
          brand: sale.tracking_products?.brand || "", 
          model: sale.tracking_products?.model || "",
          list_price: sale.list_price * rate, 
          discount_rate: sale.discount_rate, 
          sale_price: sale.sale_price * rate, 
          quantity: sale.quantity, 
          total_amount: sale.total_amount * rate
      }])
      setEditingId(sale.id)
      setIsAdding(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.personnel_id) return alert("Lütfen Personel seçiniz!")
    
    // Geçersiz satırları kontrol et
    const invalidItems = items.filter(i => !i.brand || !i.list_price)
    if (invalidItems.length > 0) return alert("Lütfen sepetteki tüm makinelerin markasını ve fiyatını girin!")
    
    setSaving(true)
    const rate = rates[currency] || 1
    const { data: { user } } = await supabase.auth.getUser()

    try {
        if (editingId) {
            // GÜNCELLEME SADECE İLK SATIR İÇİN GEÇERLİDİR
            let finalProductId = items[0].product_id
            if (!finalProductId) {
                const { data: newProd, error: prodErr } = await supabase.from('tracking_products').insert([{
                    brand: items[0].brand, model: items[0].model || "-", price: Number(items[0].list_price) / rate, stock: 1
                }]).select().single()
                if (prodErr) throw prodErr
                finalProductId = newProd.id.toString()
            }

            const payload = {
                sale_date: form.sale_date, personnel_id: Number(form.personnel_id), customer_name: form.customer_name,
                customer_location: form.customer_location, product_id: Number(finalProductId), 
                list_price: items[0].list_price / rate, discount_rate: items[0].discount_rate, 
                sale_price: items[0].sale_price / rate, quantity: items[0].quantity, total_amount: items[0].total_amount / rate
            }
            const { error: updateError } = await supabase.from('tracking_sales').update(payload).eq('id', editingId)
            if (updateError) throw updateError

        } else {
            // ÇOKLU EKLEME (SEPET)
            const insertPromises = items.map(async (item) => {
                let finalProductId = item.product_id
                if (!finalProductId) {
                    const { data: newProd, error: prodErr } = await supabase.from('tracking_products').insert([{
                        brand: item.brand, model: item.model || "-", price: Number(item.list_price) / rate, stock: 1
                    }]).select().single()
                    if (prodErr) throw prodErr
                    finalProductId = newProd.id.toString()
                }

                return supabase.from('tracking_sales').insert([{
                    sale_date: form.sale_date, personnel_id: Number(form.personnel_id), customer_name: form.customer_name,
                    customer_location: form.customer_location, product_id: Number(finalProductId), 
                    list_price: item.list_price / rate, discount_rate: item.discount_rate, 
                    sale_price: item.sale_price / rate, quantity: item.quantity, total_amount: item.total_amount / rate
                }])
            })

            await Promise.all(insertPromises) // Tüm satırları bekle
        }

        setForm({ sale_date: new Date().toISOString().split('T')[0], personnel_id: "", customer_name: "", customer_location: "" })
        setItems([{ product_id: "", brand: "", model: "", list_price: 0, discount_rate: 0, sale_price: 0, quantity: 1, total_amount: 0 }])
        setEditingId(null)
        setIsAdding(false)
        fetchData()
        alert("✅ Satış başarıyla kaydedildi!")

    } catch (error: any) {
        alert("Hata: " + error.message)
    } finally {
        setSaving(false)
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
    <div className="flex flex-col gap-6 md:gap-8 max-w-[1600px] mx-auto w-full font-sans pb-10">
      
      {/* ÜST BAŞLIK ALANI */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 md:gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm flex-1">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 md:p-4 rounded-xl md:rounded-2xl shadow-lg shadow-amber-500/30 shrink-0">
                <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </div>
            <div>
                <h1 className="text-xl md:text-3xl font-black tracking-tight text-slate-900">Satışlar ve İşlemler</h1>
                <p className="text-slate-500 font-medium text-xs md:text-sm mt-1">Personel bazlı araç satış kayıtları ve iskonto yönetim ekranı.</p>
            </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-slate-400" />
                    <Input placeholder="Listede Ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 md:pl-11 h-12 md:h-14 bg-white/80 border-white/50 text-xs md:text-sm font-bold text-slate-700 shadow-sm rounded-xl md:rounded-2xl focus:ring-2 focus:ring-amber-500 w-full" />
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 bg-white/80 border border-white/50 shadow-sm rounded-xl md:rounded-2xl h-12 md:h-14 px-3 shrink-0">
                    <Globe className="h-4 w-4 md:h-5 md:w-5 text-emerald-600" />
                    <select 
                        value={currency} 
                        onChange={(e) => setCurrency(e.target.value)}
                        className="bg-transparent border-none text-xs md:text-sm font-black text-slate-800 outline-none cursor-pointer pr-1"
                    >
                        {currencyOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            <Button onClick={() => { setIsAdding(!isAdding); setEditingId(null); setForm({ sale_date: new Date().toISOString().split('T')[0], personnel_id: "", customer_name: "", customer_location: "" }); setItems([{ product_id: "", brand: "", model: "", list_price: 0, discount_rate: 0, sale_price: 0, quantity: 1, total_amount: 0 }]); }} className="h-12 md:h-14 px-6 md:px-8 bg-amber-500 hover:bg-amber-600 text-white text-sm md:text-base font-bold rounded-xl md:rounded-[2rem] shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center gap-2 shrink-0">
                <PlusCircle className="h-4 w-4 md:h-5 md:w-5" /> Yeni Satış Gir
            </Button>
        </div>
      </div>

      {/* 🚀 ÇOKLU SEPET FORM ALANI */}
      {isAdding && (
          <div className="bg-white/80 backdrop-blur-2xl border border-white shadow-xl shadow-amber-500/5 rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-8 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-2 md:gap-3 mb-5 md:mb-6 border-b border-slate-100 pb-4">
                  <Calculator className="h-5 w-5 md:h-6 md:w-6 text-amber-500" />
                  <h2 className="text-lg md:text-xl font-black text-slate-800">{editingId ? "Satış Kaydını Düzenle" : "Çoklu Satış Formu"}</h2>
              </div>
              
              <form onSubmit={handleSave} className="flex flex-col gap-6 md:gap-8">
                  
                  {/* Müşteri ve Personel Bilgileri */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-[1.5rem] border border-slate-100">
                      <div className="space-y-1.5 md:space-y-2">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tarih</Label>
                          <Input required type="date" value={form.sale_date} onChange={e => setForm({...form, sale_date: e.target.value})} className="h-12 rounded-xl bg-white border-slate-200 text-sm shadow-sm" />
                      </div>
                      <div className="space-y-1.5 md:space-y-2">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Satış Personeli</Label>
                          <select required value={form.personnel_id} onChange={e => setForm({...form, personnel_id: e.target.value})} className="w-full h-12 px-3 md:px-4 rounded-xl bg-white border border-slate-200 text-xs md:text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 shadow-sm">
                              <option value="">-- Personel Seçin --</option>
                              {personnel.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                          </select>
                      </div>
                      <div className="space-y-1.5 md:space-y-2">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Müşteri Adı</Label>
                          <Input required placeholder="Örn: Kaya Ali Tosun" value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} className="h-12 rounded-xl bg-white border-slate-200 text-sm shadow-sm" />
                      </div>
                      <div className="space-y-1.5 md:space-y-2">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Müşteri Konumu (İl)</Label>
                          <Input required placeholder="Örn: Bursa" value={form.customer_location} onChange={e => setForm({...form, customer_location: e.target.value})} className="h-12 rounded-xl bg-white border-slate-200 text-sm shadow-sm" />
                      </div>
                  </div>

                  {/* 🚀 ÜRÜN SEPETİ */}
                  <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                          <h3 className="font-black text-slate-800 text-sm md:text-base flex items-center gap-2"><ShoppingCart className="h-4 w-4 md:h-5 md:w-5 text-emerald-500" /> Satılan Ürünler (Sepet)</h3>
                          {!editingId && (
                              <Button type="button" onClick={addLineItem} variant="outline" className="h-9 md:h-10 rounded-lg md:rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold text-xs md:text-sm">
                                  <Plus className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2"/> Yeni Satır
                              </Button>
                          )}
                      </div>
                      
                      <div className="space-y-3">
                          {items.map((item, index) => (
                              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-amber-50/30 p-4 rounded-2xl border border-amber-100 relative group">
                                  <div className="md:col-span-3 space-y-1.5 relative">
                                      <Label className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Marka / Cins</Label>
                                      <Input
                                          placeholder="Örn: 10 Ton Çift..." value={item.brand}
                                          onChange={(e) => { updateItem(index, 'brand', e.target.value); updateItem(index, 'product_id', ""); setIsProductDropdownOpen({index, isOpen: true}); }}
                                          onFocus={() => setIsProductDropdownOpen({index, isOpen: true})}
                                          onBlur={() => setTimeout(() => setIsProductDropdownOpen({index: -1, isOpen: false}), 200)}
                                          className="h-12 rounded-xl bg-white border-amber-200 focus:ring-amber-500 font-bold text-sm"
                                      />
                                      {isProductDropdownOpen.isOpen && isProductDropdownOpen.index === index && item.brand && (
                                          <div className="absolute z-50 w-full sm:w-[200%] mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-48 overflow-y-auto p-1">
                                              {products.filter(p => p.brand.toLowerCase().includes(item.brand.toLowerCase())).map(p => (
                                                  <button key={p.id} type="button" onClick={() => { 
                                                      const productRate = rates[currency] || 1;
                                                      const newItems = [...items];
                                                      newItems[index].brand = p.brand;
                                                      newItems[index].model = p.model;
                                                      newItems[index].list_price = p.price * productRate;
                                                      newItems[index].product_id = p.id.toString();
                                                      setItems(newItems);
                                                      updateItem(index, 'quantity', newItems[index].quantity) // Trigger re-calc
                                                      setIsProductDropdownOpen({index:-1, isOpen: false}); 
                                                  }} className="w-full text-left px-3 py-2 text-xs md:text-sm font-bold text-slate-700 hover:bg-amber-50 rounded-lg">
                                                      {p.brand} - {p.model}
                                                  </button>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                                  <div className="md:col-span-2 space-y-1.5">
                                      <Label className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Model</Label>
                                      <Input placeholder="2026" value={item.model} onChange={e => updateItem(index, 'model', e.target.value)} className="h-12 rounded-xl bg-white border-amber-200 focus:ring-amber-500 font-bold text-sm" />
                                  </div>
                                  <div className="md:col-span-2 space-y-1.5">
                                      <Label className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-1.5 rounded">Liste F. ({currency})</Label>
                                      <Input type="number" value={item.list_price || ""} onChange={e => updateItem(index, 'list_price', Number(e.target.value))} className="h-12 rounded-xl bg-white border-amber-200 font-bold text-amber-700 text-sm" />
                                  </div>
                                  <div className="md:col-span-1 space-y-1.5">
                                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">İsk %</Label>
                                      <Input type="number" step="0.01" value={item.discount_rate} onChange={e => updateItem(index, 'discount_rate', Number(e.target.value))} className="h-12 rounded-xl bg-white border-slate-200 font-bold text-sm" />
                                  </div>
                                  <div className="md:col-span-1 space-y-1.5">
                                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Adet</Label>
                                      <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(index, 'quantity', Number(e.target.value))} className="h-12 rounded-xl bg-white border-slate-200 font-bold text-blue-600 text-center text-sm" />
                                  </div>
                                  <div className="md:col-span-3 space-y-1.5">
                                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Satır Tutarı</Label>
                                      <div className="h-12 flex items-center justify-end px-3 bg-white border border-slate-200 rounded-xl font-black text-slate-700 tabular-nums text-sm shadow-sm">
                                          {item.total_amount.toLocaleString('tr-TR', {style:'currency', currency: currency})}
                                      </div>
                                  </div>

                                  {!editingId && items.length > 1 && (
                                      <Button type="button" variant="destructive" size="icon" onClick={() => removeLineItem(index)} className="absolute -top-2 -right-2 h-6 w-6 md:h-8 md:w-8 shrink-0 rounded-full md:rounded-lg opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity z-10 shadow-md">
                                          <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                                      </Button>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* GENEL TOPLAM VE KAYDET */}
                  <div className="flex flex-col-reverse md:flex-row items-end justify-between gap-4 border-t border-slate-100 pt-6">
                      <div className="flex gap-2 w-full md:w-auto">
                          <Button type="button" variant="ghost" onClick={() => { setIsAdding(false); setEditingId(null); }} className="h-12 md:h-14 px-6 rounded-xl md:rounded-2xl font-bold w-full md:w-auto bg-slate-100 hover:bg-slate-200">İptal Et</Button>
                          <Button type="submit" disabled={saving} className="h-12 md:h-14 px-6 md:px-10 rounded-xl md:rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black shadow-xl shadow-amber-500/20 text-sm md:text-lg w-full md:w-auto">
                              {saving ? <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" /> : (editingId ? "Güncelle" : "Satışı Kaydet")}
                          </Button>
                      </div>
                      
                      <div className="w-full md:w-auto bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex items-center gap-6 justify-between md:justify-end min-w-[300px]">
                          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400">SEPET TOPLAMI</span>
                          <span className="text-2xl md:text-3xl font-black text-emerald-400 tabular-nums tracking-tight">
                              {getGrandTotal().toLocaleString('tr-TR', {style:'currency', currency: currency})}
                          </span>
                      </div>
                  </div>
              </form>
          </div>
      )}

      {/* 🚀 AKIŞKAN TABLO LİSTESİ */}
      <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden w-full">
          <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
                  <thead className="bg-[#4b5e40] text-white">
                      <tr>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest rounded-tl-xl md:rounded-tl-2xl">Tarih</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest">Satış Personeli</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest">Müşteri</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest">Marka & Model</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest">Liste Fiyatı</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-center">İskonto</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest">Satış Fiyatı</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-center">Adet</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest bg-[#3d4d34]">Satır Tutarı</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-right rounded-tr-xl md:rounded-tr-2xl">İşlem</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e1e6de] bg-[#ebf0e8]/50">
                      {filteredSales.map((sale) => (
                          <tr key={sale.id} className="hover:bg-[#f1f4ef] transition-colors">
                              <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold text-slate-600">{new Date(sale.sale_date).toLocaleDateString('tr-TR')}</td>
                              <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-black text-slate-800">{sale.tracking_personnel?.full_name}</td>
                              <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold text-slate-700 truncate max-w-[150px]">{sale.customer_name}</td>
                              <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold text-slate-800 truncate max-w-[150px]">{sale.tracking_products?.brand} <span className="text-slate-500 font-medium">({sale.tracking_products?.model})</span></td>
                              <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium text-slate-500 tabular-nums">{formatPrice(sale.list_price)}</td>
                              <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold text-amber-600 text-center bg-amber-50/50">%{sale.discount_rate}</td>
                              <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold text-slate-800 tabular-nums">{formatPrice(sale.sale_price)}</td>
                              <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-black text-blue-600 text-center bg-blue-50/50">{sale.quantity}</td>
                              <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-black text-[#2e4024] bg-[#dbe6d5] tabular-nums shadow-inner">{formatPrice(sale.total_amount)}</td>
                              <td className="px-4 md:px-6 py-3 md:py-4 text-right flex justify-end gap-1.5 md:gap-2">
                                  <button onClick={() => openEdit(sale)} className="p-1.5 md:p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg md:rounded-xl transition-colors"><Edit2 className="h-4 w-4 md:h-5 md:w-5" /></button>
                                  <button onClick={() => handleDelete(sale.id)} className="p-1.5 md:p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg md:rounded-xl transition-colors"><Trash2 className="h-4 w-4 md:h-5 md:w-5" /></button>
                              </td>
                          </tr>
                      ))}
                      {filteredSales.length === 0 && !loading && (
                          <tr><td colSpan={10} className="py-16 md:py-20 text-center bg-white"><div className="flex flex-col items-center gap-3"><div className="bg-amber-50 p-4 md:p-5 rounded-full shadow-sm"><Receipt className="h-8 w-8 md:h-10 md:w-10 text-amber-300" /></div><p className="text-base md:text-lg font-bold text-amber-600">Satış kaydı bulunmuyor.</p></div></td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  )
}