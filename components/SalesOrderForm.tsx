"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Plus, Save, Loader2, AlertCircle, ShoppingBag, Rocket, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

type SaleItem = {
  product_id: string
  quantity: number
  unit_price: number
  cost_price: number 
}

export function SalesOrderForm() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [customers, setCustomers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])

  const [customerId, setCustomerId] = useState("")
  const [items, setItems] = useState<SaleItem[]>([
    { product_id: "", quantity: 1, unit_price: 0, cost_price: 0 }
  ])

  useEffect(() => {
    const fetchData = async () => {
      const { data: custData } = await supabase.from("customers").select("*")
      const { data: prodData } = await supabase.from("products").select("*")
      if (custData) setCustomers(custData)
      if (prodData) setProducts(prodData)
    }
    fetchData()
  }, [])

  const addItem = () => setItems([...items, { product_id: "", quantity: 1, unit_price: 0, cost_price: 0 }])
  const removeItem = (index: number) => {
    const newItems = [...items]
    newItems.splice(index, 1)
    setItems(newItems)
  }

  const updateItem = (index: number, field: keyof SaleItem, value: any) => {
    const newItems = [...items]
    // @ts-ignore
    newItems[index][field] = value

    if (field === "product_id") {
        const selectedProduct = products.find(p => p.id == value)
        if (selectedProduct) {
            newItems[index].unit_price = selectedProduct.sale_price 
            newItems[index].cost_price = selectedProduct.purchase_price 
        }
    }
    setItems(newItems)
  }

  const calculateTotal = () => items.reduce((total, item) => total + (item.quantity * item.unit_price), 0)
  const calculateProfit = () => items.reduce((total, item) => total + ((item.unit_price - item.cost_price) * item.quantity), 0)

  const handleSubmit = async () => {
    if (!customerId) { alert("Lütfen müşteri seçiniz!"); return; }
    
    // Stok Kontrolü
    for (const item of items) {
        const product = products.find(p => p.id == item.product_id)
        if (product && item.quantity > product.current_stock) {
            alert(`HATA: ${product.name} ürününden stokta sadece ${product.current_stock} adet var. Siz ${item.quantity} adet satmaya çalışıyorsunuz!`)
            return;
        }
    }

    setLoading(true)

    try {
        const { data: saleData, error: saleError } = await supabase.from("sales_orders").insert([{
            customer_id: Number(customerId),
            total_amount: calculateTotal(),
            status: "TAMAMLANDI",
            sale_date: new Date().toISOString()
        }]).select().single()

        if (saleError) throw saleError

        const saleItemsData = items.map(item => ({
            order_id: saleData.id,
            product_id: Number(item.product_id),
            quantity: item.quantity,
            unit_price: item.unit_price
        }))

        const { error: itemsError } = await supabase.from("sales_order_items").insert(saleItemsData)
        if (itemsError) throw itemsError

        for (const item of items) {
            const currentProduct = products.find(p => p.id == item.product_id)
            if (currentProduct) {
                await supabase.from("stock_movements").insert({
                    product_id: Number(item.product_id),
                    movement_type: "SATIS",
                    quantity: item.quantity,
                    related_id: saleData.id,
                    description: `Satış No: SLS-${saleData.id}`
                })
                await supabase.from("products").update({
                    current_stock: currentProduct.current_stock - Number(item.quantity)
                }).eq("id", item.product_id)
            }
        }

        router.push("/dashboard/sales")
        router.refresh()
    } catch (error: any) {
        alert("Hata: " + error.message)
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto pb-20 font-sans">
        
        {/* 🚀 ÜST KART: MÜŞTERİ VE ÖZET */}
        <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-lg shadow-emerald-500/5 rounded-[2.5rem] p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-emerald-500" /> Müşteri Seçimi
                    </Label>
                    <select 
                        className="w-full h-16 rounded-2xl bg-white border border-slate-200 px-5 text-lg font-black text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm transition-all"
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                    >
                        <option value="">Firma Seçiniz...</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                
                <div className="flex flex-col items-start md:items-end justify-center bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Genel Toplam</span>
                    <div className="text-4xl font-black text-emerald-600 tracking-tight mt-1">
                        {calculateTotal().toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </div>
                    <div className="text-xs font-bold text-emerald-700/70 mt-2 flex items-center gap-1.5 bg-emerald-100/50 px-3 py-1.5 rounded-lg border border-emerald-200/50">
                        // O kısmı bul ve şununla değiştir:
                <div className="flex flex-col items-start md:items-end justify-center bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Fatura Genel Toplamı</span>
                    <div className="text-4xl font-black text-emerald-600 tracking-tight mt-1">
                        {calculateTotal().toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </div>
                </div>
                    </div>
                </div>
            </div>
        </div>

        {/* 🚀 ALT KART: ÜRÜN KALEMLERİ */}
        <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 border-b border-slate-100 pb-6">
                <div>
                    <h3 className="font-black text-2xl text-slate-800">Satış Kalemleri</h3>
                    <p className="text-sm text-slate-500 font-medium">Listeye ürün ekleyin ve adetlerini belirleyin.</p>
                </div>
                <Button onClick={addItem} className="h-12 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-lg shadow-slate-900/20 transition-all flex items-center gap-2">
                    <Plus className="h-5 w-5" /> Yeni Satır Ekle
                </Button>
            </div>

            <div className="space-y-4">
                {items.map((item, index) => {
                    const product = products.find(p => p.id == item.product_id)
                    const stockStatus = product ? product.current_stock : 0
                    const isStockLow = stockStatus < item.quantity

                    return (
                    <div key={index} className={`relative grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-white p-5 rounded-2xl border-2 transition-all ${isStockLow ? 'border-rose-200 shadow-md shadow-rose-500/10' : 'border-slate-100 hover:border-emerald-200'}`}>
                        
                        {/* Ürün */}
                        <div className="md:col-span-5 space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ürün</Label>
                            <select 
                                className="w-full h-14 rounded-xl bg-slate-50 border border-slate-200 px-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                                value={item.product_id}
                                onChange={(e) => updateItem(index, "product_id", e.target.value)}
                            >
                                <option value="">Seçiniz...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} (Stok: {p.current_stock})</option>
                                ))}
                            </select>
                            {product && (
                                <div className="text-[10px] font-bold flex gap-3 mt-1 px-1">
                                    <span className="text-slate-400">Maliyet: {product.purchase_price}₺</span>
                                    <span className={isStockLow ? "text-rose-600" : "text-emerald-600"}>
                                        Depo Stok: {product.current_stock}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Miktar */}
                        <div className="md:col-span-2 space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Adet</Label>
                            <Input 
                                type="number" 
                                value={item.quantity} 
                                className={`h-14 rounded-xl bg-slate-50 border-slate-200 text-lg font-black text-center focus:ring-emerald-500 ${isStockLow ? 'border-rose-400 text-rose-600 bg-rose-50/50 focus:ring-rose-500' : ''}`}
                                onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                            />
                        </div>

                        {/* Birim Fiyat */}
                        <div className="md:col-span-2 space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Birim Fiyat (₺)</Label>
                            <Input 
                                type="number" 
                                value={item.unit_price} 
                                className="h-14 rounded-xl bg-slate-50 border-slate-200 font-bold focus:ring-emerald-500"
                                onChange={(e) => updateItem(index, "unit_price", Number(e.target.value))}
                            />
                        </div>

                        {/* Tutar & Sil */}
                        <div className="md:col-span-3 flex items-center justify-between h-14 bg-slate-50 px-4 rounded-xl border border-slate-100">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Tutar</span>
                                <span className="font-black text-slate-800">{(item.quantity * item.unit_price).toLocaleString('tr-TR')} ₺</span>
                            </div>
                            <button 
                                onClick={() => removeItem(index)}
                                disabled={items.length === 1}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30"
                                type="button"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>
                        
                        {/* Hata Balonu */}
                        {isStockLow && (
                            <div className="absolute -top-3 -right-3 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg shadow-rose-500/40 flex items-center gap-1.5 animate-pulse">
                                <AlertCircle className="w-3.5 h-3.5" /> YETERSİZ STOK
                            </div>
                        )}
                    </div>
                )})}
            </div>
        </div>

        {/* 🚀 ONAY ALANI */}
        <div className="flex flex-col sm:flex-row justify-end gap-4 mt-8">
             <Button variant="outline" onClick={() => router.back()} className="h-16 px-8 rounded-2xl font-bold text-slate-600 border-2 border-slate-200 hover:bg-slate-100 transition-all">
                Vazgeç ve Çık
             </Button>
             <Button className="h-16 px-10 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg shadow-xl shadow-emerald-500/30 transition-all flex items-center gap-3" onClick={handleSubmit} disabled={loading}>
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
                {loading ? 'İşleniyor...' : 'SATIŞI ONAYLA'}
             </Button>
        </div>
    </div>
  )
}