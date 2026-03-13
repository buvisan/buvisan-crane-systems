"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRightLeft, Loader2, Plus, Minus, Package } from "lucide-react"
import { useRouter } from "next/navigation"

export function StockMovementDialog({ product }: { product: any }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [type, setType] = useState<"GIRIS" | "CIKIS">("GIRIS")
  const [quantity, setQuantity] = useState("")
  const [description, setDescription] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const qty = Number(quantity)
    if (qty <= 0) {
        alert("Miktar 0'dan büyük olmalı!")
        setLoading(false)
        return
    }

    if (type === "CIKIS" && product.current_stock < qty) {
        alert("Yetersiz Stok! Depoda bu kadar ürün yok.")
        setLoading(false)
        return
    }

    const newStock = type === "GIRIS" ? product.current_stock + qty : product.current_stock - qty

    const { error: moveError } = await supabase.from("stock_movements").insert([{
        product_id: product.id,
        movement_type: type,
        quantity: qty,
        description: description,
    }])

    if (moveError) {
        alert("Hareket kaydedilemedi: " + moveError.message)
        setLoading(false)
        return
    }

    const { error: updateError } = await supabase.from("products").update({ current_stock: newStock }).eq("id", product.id)

    setLoading(false)

    if (updateError) {
      alert("Stok güncellenemedi: " + updateError.message)
    } else {
      setOpen(false)
      setQuantity("")
      setDescription("")
      router.refresh() 
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 rounded-xl shadow-sm transition-all" title="Stok Giriş / Çıkış">
          <ArrowRightLeft className="h-5 w-5" />
        </button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[450px] p-8 rounded-[2.5rem] border-none shadow-2xl bg-white/95 backdrop-blur-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-4 mb-2">
                <div className="bg-indigo-100 p-3 rounded-2xl"><Package className="h-6 w-6 text-indigo-600" /></div>
                <DialogTitle className="text-2xl font-black text-slate-800">Stok Hareketi</DialogTitle>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{product.sku}</span>
                <span className="font-bold text-slate-700 text-sm block truncate">{product.name}</span>
                <div className="mt-2 flex items-center gap-2 text-xl">
                    <span className="font-black text-slate-900">{product.current_stock}</span>
                    <span className="font-bold text-slate-400 text-sm">{product.units?.short_code}</span>
                </div>
            </div>
          </DialogHeader>
          
          <div className="grid gap-6 py-2">
            {/* DEV BUTONLAR (DOKUNMATİK DOSTU) */}
            <div className="grid grid-cols-2 gap-4">
                <div onClick={() => setType("GIRIS")} className={`cursor-pointer border-2 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all ${type === 'GIRIS' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-lg shadow-emerald-500/20' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    <Plus className="h-8 w-8" />
                    <span className="font-black text-sm">Stok Ekle</span>
                </div>
                <div onClick={() => setType("CIKIS")} className={`cursor-pointer border-2 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all ${type === 'CIKIS' ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-lg shadow-rose-500/20' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    <Minus className="h-8 w-8" />
                    <span className="font-black text-sm">Stok Düş</span>
                </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">İşlem Miktarı</Label>
              <Input type="number" placeholder="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus className="h-14 rounded-2xl bg-slate-50 border-slate-200 text-xl font-black text-center focus:ring-2 focus:ring-indigo-500 transition-all" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Açıklama / Proje (Opsiyonel)</Label>
              <Input placeholder="Örn: PRJ-2026 için çıkış yapıldı" value={description} onChange={(e) => setDescription(e.target.value)} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-medium focus:ring-2 focus:ring-indigo-500 transition-all" />
            </div>
          </div>

          <DialogFooter className="mt-8">
            <Button type="submit" disabled={loading} className={`w-full h-14 rounded-2xl font-black text-lg text-white shadow-xl transition-all ${type === 'GIRIS' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30'}`}>
              {loading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : null}
              {type === 'GIRIS' ? 'GİRİŞİ ONAYLA' : 'ÇIKIŞI ONAYLA'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}