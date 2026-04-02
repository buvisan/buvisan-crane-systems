"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PackageMinus, PackagePlus, Loader2, CheckCircle2, ScanLine, AlertCircle } from "lucide-react"

export default function WorkerScanPage() {
  const [loading, setLoading] = useState(true)
  const [product, setProduct] = useState<any>(null)
  
  const [workerName, setWorkerName] = useState("")
  const [action, setAction] = useState<"OUT" | "IN" | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  useEffect(() => {
      if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const codeFromQr = urlParams.get('code');
          if (codeFromQr) {
              fetchProductByCode(codeFromQr);
          } else {
              setLoading(false) // Kod yoksa boş ekran
          }
      }
  }, [])

  const fetchProductByCode = async (codeStr: string) => {
      const { data } = await supabase.from('warehouse_products').select('*').eq('product_code', codeStr).single()
      if (data) setProduct(data)
      setLoading(false)
  }

  const handleProcess = async () => {
      if (!workerName.trim()) return alert("Lütfen adınızı ve soyadınızı yazın!")
      if (quantity <= 0) return alert("Miktar 0'dan büyük olmalıdır!")
      if (action === "OUT" && quantity > product.total_stock) return alert(`Yetersiz Stok! Depoda sadece ${product.total_stock} adet var.`)

      setProcessing(true)
      try {
          const newStock = action === "IN" ? product.total_stock + quantity : product.total_stock - quantity

          // 1. Stoğu Güncelle
          const { error: stockError } = await supabase.from('warehouse_products').update({ total_stock: newStock }).eq('id', product.id)
          if (stockError) throw stockError

          // 2. Loga İşçinin Adını Yazdır
          const { error: logError } = await supabase.from('warehouse_movements').insert([{
              product_id: product.id,
              movement_type: action === "IN" ? 'GİRİŞ' : 'ÇIKIŞ',
              quantity: quantity,
              // 🚀 İŞÇİNİN ADI LOGLARA YAZILIYOR
              note: `[SAHA PERSONELİ: ${workerName.toUpperCase()}] tarafından barkod ile ${action === "IN" ? 'eklendi' : 'alındı'}.`,
              performed_by: null // Şifresiz giriş olduğu için ID yok
          }])
          if (logError) throw logError

          setSuccess(true)
      } catch (error: any) {
          alert("Hata: " + error.message)
      } finally {
          setProcessing(false)
      }
  }

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-900"><Loader2 className="animate-spin h-12 w-12 text-blue-500" /></div>

  if (!product) return (
      <div className="flex flex-col h-screen items-center justify-center bg-slate-900 p-6 text-center">
          <AlertCircle className="h-16 w-16 text-rose-500 mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">Ürün Bulunamadı</h1>
          <p className="text-slate-400">Lütfen geçerli bir QR barkod okutun.</p>
      </div>
  )

  if (success) return (
      <div className="flex flex-col h-screen items-center justify-center bg-emerald-900 p-6 text-center animate-in zoom-in duration-300">
          <div className="h-24 w-24 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(16,185,129,0.5)]">
              <CheckCircle2 className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">İşlem Başarılı!</h1>
          <p className="text-emerald-100 text-lg mb-8">{workerName}, stok işlemi sisteme kaydedildi. Kolay gelsin.</p>
          <Button onClick={() => window.location.reload()} variant="outline" className="bg-transparent text-white border-white hover:bg-white/10 h-14 rounded-2xl px-8 font-bold">Yeni Barkod Okut</Button>
      </div>
  )

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8 font-sans flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-[2rem] p-6 shadow-2xl">
          
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                  {product.image_url ? <img src={product.image_url} alt="img" className="w-full h-full object-cover"/> : <ScanLine className="h-6 w-6 text-slate-400" />}
              </div>
              <div className="flex flex-col">
                  <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-max mb-1">{product.product_code}</span>
                  <h1 className="text-lg font-black text-slate-800 leading-tight">{product.name}</h1>
                  <span className="text-xs font-bold text-slate-500 mt-1">Depodaki Stok: {product.total_stock} Adet</span>
              </div>
          </div>

          <div className="space-y-5">
              <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">Adınız Soyadınız</Label>
                  <Input placeholder="Örn: Ahmet Yılmaz" value={workerName} onChange={e => setWorkerName(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold text-slate-800 focus:ring-indigo-500" />
              </div>

              {!action ? (
                  <div className="grid grid-cols-2 gap-4 mt-6">
                      <button onClick={() => setAction("OUT")} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-rose-100 bg-rose-50 hover:bg-rose-100 transition-colors">
                          <PackageMinus className="h-8 w-8 text-rose-500" />
                          <span className="font-black text-rose-700 text-sm">Ürün Alıyorum</span>
                      </button>
                      <button onClick={() => setAction("IN")} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-emerald-100 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                          <PackagePlus className="h-8 w-8 text-emerald-500" />
                          <span className="font-black text-emerald-700 text-sm">Ürün Bırakıyorum</span>
                      </button>
                  </div>
              ) : (
                  <div className="animate-in fade-in duration-300">
                      <div className="space-y-2 mb-6">
                          <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">Miktar (Kaç Adet?)</Label>
                          <Input type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className={`h-16 rounded-2xl text-center text-3xl font-black border-2 ${action === 'OUT' ? 'text-rose-600 border-rose-200 focus:border-rose-500' : 'text-emerald-600 border-emerald-200 focus:border-emerald-500'}`} />
                      </div>
                      
                      <div className="flex gap-3">
                          <Button variant="outline" onClick={() => setAction(null)} className="h-14 px-6 rounded-2xl font-bold">İptal</Button>
                          <Button onClick={handleProcess} disabled={processing} className={`flex-1 h-14 rounded-2xl font-black text-white ${action === 'OUT' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                              {processing ? <Loader2 className="animate-spin h-5 w-5" /> : (action === "OUT" ? "STOĞU DÜŞ" : "STOĞA EKLE")}
                          </Button>
                      </div>
                  </div>
              )}
          </div>
      </div>
    </div>
  )
}