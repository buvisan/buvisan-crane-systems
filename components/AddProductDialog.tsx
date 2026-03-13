"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlusCircle, Loader2, Pencil } from "lucide-react"
import { useRouter } from "next/navigation"

// productToEdit varsa "Düzenle", yoksa "Ekle" modunda çalışır
export function AddProductDialog({ productToEdit }: { productToEdit?: any }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [categories, setCategories] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])

  const [formData, setFormData] = useState({
    name: "",
    barcode: "",
    sku: "",
    purchase_price: "",
    sale_price: "",
    current_stock: "",
    category_id: "",
    unit_id: "",
  })

  // Verileri ve Düzenlenecek Ürünü Yükle
  useEffect(() => {
    const fetchData = async () => {
      const { data: catData } = await supabase.from("categories").select("*")
      const { data: unitData } = await supabase.from("units").select("*")
      if (catData) setCategories(catData)
      if (unitData) setUnits(unitData)
    }
    fetchData()

    // Eğer düzenleme modundaysak, mevcut verileri forma doldur
    if (productToEdit) {
        setFormData({
            name: productToEdit.name,
            barcode: productToEdit.barcode || "",
            sku: productToEdit.sku || "",
            purchase_price: productToEdit.purchase_price,
            sale_price: productToEdit.sale_price,
            current_stock: productToEdit.current_stock,
            category_id: productToEdit.category_id,
            unit_id: productToEdit.unit_id
        })
    }
  }, [productToEdit]) // productToEdit değişirse tekrar çalış

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const payload = {
        name: formData.name,
        barcode: formData.barcode,
        sku: formData.sku,
        purchase_price: parseFloat(formData.purchase_price.toString()) || 0,
        sale_price: parseFloat(formData.sale_price.toString()) || 0,
        current_stock: parseInt(formData.current_stock.toString()) || 0,
        category_id: parseInt(formData.category_id.toString()),
        unit_id: parseInt(formData.unit_id.toString()),
    }

    let error;

    if (productToEdit) {
        // GÜNCELLEME İŞLEMİ (UPDATE)
        const { error: updateError } = await supabase
            .from("products")
            .update(payload)
            .eq("id", productToEdit.id)
        error = updateError
    } else {
        // EKLEME İŞLEMİ (INSERT)
        const { error: insertError } = await supabase
            .from("products")
            .insert([payload])
        error = insertError
    }

    setLoading(false)

    if (error) {
      alert("Hata: " + error.message)
    } else {
      setOpen(false)
      if (!productToEdit) {
          // Sadece ekleme ise formu temizle
          setFormData({ name: "", barcode: "", sku: "", purchase_price: "", sale_price: "", current_stock: "", category_id: "", unit_id: "" })
      }
      router.refresh()
    }
  }

  const inputStyle = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {productToEdit ? (
            // Düzenleme Moduysa Kalem İkonu Göster
            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                <Pencil className="h-4 w-4" />
            </Button>
        ) : (
            // Ekleme Moduysa Büyük Buton Göster
            <Button className="bg-blue-600 hover:bg-blue-700">
                <PlusCircle className="mr-2 h-4 w-4" />
                Yeni Ürün Ekle
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{productToEdit ? "Ürünü Düzenle" : "Yeni Stok Kartı"}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Ürün Adı</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} className="col-span-3" required />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Kategori</Label>
              <select name="category_id" className={`${inputStyle} col-span-3`} value={formData.category_id} onChange={handleChange} required>
                <option value="">Seçiniz...</option>
                {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>

             <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Birim</Label>
              <select name="unit_id" className={`${inputStyle} col-span-3`} value={formData.unit_id} onChange={handleChange} required>
                <option value="">Seçiniz...</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.short_code})</option>)}
              </select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Barkod</Label>
              <Input name="barcode" value={formData.barcode} onChange={handleChange} className="col-span-3" />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Stok Kodu</Label>
              <Input name="sku" value={formData.sku} onChange={handleChange} className="col-span-3" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Alış Fiyatı</Label>
                    <Input name="purchase_price" type="number" value={formData.purchase_price} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                    <Label>Satış Fiyatı</Label>
                    <Input name="sale_price" type="number" value={formData.sale_price} onChange={handleChange} required />
                </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Stok Adedi</Label>
              <Input name="current_stock" type="number" value={formData.current_stock} onChange={handleChange} className="col-span-3" required />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}