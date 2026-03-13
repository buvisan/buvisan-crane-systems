"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Trash2, Plus, Save, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

// Sipariş satırı tipi (TypeScript için)
type OrderItem = {
  product_id: string
  quantity: number
  unit_price: number
}

export function PurchaseOrderForm() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  // Veritabanından gelecek listeler
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])

  // Form Verileri
  const [supplierId, setSupplierId] = useState("")
  const [items, setItems] = useState<OrderItem[]>([
    { product_id: "", quantity: 1, unit_price: 0 } // Başlangıçta 1 boş satır olsun
  ])

  // Sayfa açılınca Tedarikçi ve Ürünleri çek
  useEffect(() => {
    const fetchData = async () => {
      const { data: supData } = await supabase.from("suppliers").select("*")
      const { data: prodData } = await supabase.from("products").select("*")
      if (supData) setSuppliers(supData)
      if (prodData) setProducts(prodData)
    }
    fetchData()
  }, [])

  // Yeni Satır Ekle
  const addItem = () => {
    setItems([...items, { product_id: "", quantity: 1, unit_price: 0 }])
  }

  // Satır Sil
  const removeItem = (index: number) => {
    const newItems = [...items]
    newItems.splice(index, 1)
    setItems(newItems)
  }

  // Satırdaki veriyi güncelle (Ürün, Miktar veya Fiyat değişince)
  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items]
    // @ts-ignore
    newItems[index][field] = value

    // Eğer ürün seçildiyse, o ürünün alış fiyatını otomatik getir (Kolaylık olsun)
    if (field === "product_id") {
        const selectedProduct = products.find(p => p.id == value)
        if (selectedProduct) {
            newItems[index].unit_price = selectedProduct.purchase_price
        }
    }
    
    setItems(newItems)
  }

  // Genel Toplamı Hesapla
  const calculateTotal = () => {
    return items.reduce((total, item) => total + (item.quantity * item.unit_price), 0)
  }

  // KAYDET BUTONUNA BASINCA
  const handleSubmit = async () => {
    if (!supplierId) { alert("Lütfen tedarikçi seçiniz!"); return; }
    // Boş satır var mı kontrol et
    if (items.some(i => !i.product_id || i.quantity <= 0)) { 
        alert("Lütfen tüm satırları eksiksiz doldurunuz."); return; 
    }

    setLoading(true)

    try {
        // 1. Önce Sipariş Başlığını (Purchase Order) Oluştur
        const { data: orderData, error: orderError } = await supabase
            .from("purchase_orders")
            .insert([{
                supplier_id: Number(supplierId),
                total_amount: calculateTotal(),
                status: "TAMAMLANDI", // Direkt tamamlandı yapıyoruz, stoklara işlesin diye
                order_date: new Date().toISOString()
            }])
            .select()
            .single()

        if (orderError) throw orderError

        // 2. Şimdi Sipariş Detaylarını (Kalemleri) Oluştur
        const orderItemsData = items.map(item => ({
            order_id: orderData.id,
            product_id: Number(item.product_id),
            quantity: item.quantity,
            unit_price: item.unit_price
        }))

        const { error: itemsError } = await supabase.from("purchase_order_items").insert(orderItemsData)
        if (itemsError) throw itemsError

        // 3. VE FİNAL: Ürünlerin Stoklarını Artır! (Stok Hareketi + Güncelleme)
        for (const item of items) {
            const currentProduct = products.find(p => p.id == item.product_id)
            if (currentProduct) {
                // a. Stok Hareketi Ekle (Log)
                await supabase.from("stock_movements").insert({
                    product_id: Number(item.product_id),
                    movement_type: "GIRIS",
                    quantity: item.quantity,
                    related_id: orderData.id,
                    description: `Sipariş No: PO-${orderData.id} ile giriş`
                })

                // b. Ana Stoğu Güncelle
                await supabase.from("products").update({
                    current_stock: currentProduct.current_stock + Number(item.quantity),
                    purchase_price: Number(item.unit_price) // Son alış fiyatını da güncelle
                }).eq("id", item.product_id)
            }
        }

        alert("Sipariş başarıyla oluşturuldu ve stoklara işlendi!")
        router.push("/dashboard/purchases") // Listeye geri dön
        router.refresh()

    } catch (error: any) {
        alert("Hata oluştu: " + error.message)
    } finally {
        setLoading(false)
    }
  }

  // Ortak Input Stili
  const inputStyle = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
        {/* Üst Kart: Tedarikçi Seçimi */}
        <Card>
            <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Tedarikçi Firma</Label>
                        <select 
                            className={inputStyle}
                            value={supplierId}
                            onChange={(e) => setSupplierId(e.target.value)}
                        >
                            <option value="">Seçiniz...</option>
                            {suppliers.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end justify-end">
                        <div className="text-right">
                            <span className="text-sm text-gray-500">Genel Toplam</span>
                            <div className="text-3xl font-bold text-blue-700">
                                {calculateTotal().toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Alt Kart: Ürün Listesi */}
        <Card>
            <CardContent className="pt-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                        <h3 className="font-semibold text-lg">Sipariş Kalemleri</h3>
                        <Button size="sm" onClick={addItem} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                            <Plus className="mr-2 h-4 w-4" /> Satır Ekle
                        </Button>
                    </div>

                    {items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-3 items-end bg-slate-50 p-3 rounded-lg border">
                            {/* Ürün Seçimi */}
                            <div className="col-span-5 space-y-1">
                                <Label className="text-xs">Ürün</Label>
                                <select 
                                    className={inputStyle}
                                    value={item.product_id}
                                    onChange={(e) => updateItem(index, "product_id", e.target.value)}
                                >
                                    <option value="">Ürün Seçiniz...</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Miktar */}
                            <div className="col-span-2 space-y-1">
                                <Label className="text-xs">Miktar</Label>
                                <Input 
                                    type="number" 
                                    value={item.quantity} 
                                    onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                                />
                            </div>

                            {/* Birim Fiyat */}
                            <div className="col-span-2 space-y-1">
                                <Label className="text-xs">Birim Fiyat (₺)</Label>
                                <Input 
                                    type="number" 
                                    value={item.unit_price} 
                                    onChange={(e) => updateItem(index, "unit_price", Number(e.target.value))}
                                />
                            </div>

                            {/* Satır Toplamı */}
                            <div className="col-span-2 space-y-1 text-right">
                                <Label className="text-xs text-gray-400">Tutar</Label>
                                <div className="font-semibold pt-2 text-gray-700">
                                    {(item.quantity * item.unit_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                </div>
                            </div>

                            {/* Sil Butonu */}
                            <div className="col-span-1 flex justify-end">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-red-500 hover:text-red-700 hover:bg-red-100"
                                    onClick={() => removeItem(index)}
                                    disabled={items.length === 1} // Tek satır kaldıysa silinmesin
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>

        {/* Kaydet Butonu */}
        <div className="flex justify-end gap-4">
             <Button variant="outline" onClick={() => router.back()}>İptal</Button>
             <Button size="lg" className="bg-blue-600 hover:bg-blue-700 min-w-[200px]" onClick={handleSubmit} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Siparişi Tamamla
             </Button>
        </div>
    </div>
  )
}