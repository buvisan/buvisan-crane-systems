"use client"

import { useState, useRef, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScanLine, Loader2, PackageMinus, PackagePlus, Image as ImageIcon, CheckCircle2 } from "lucide-react"

export default function BarcodeScannerPage() {
  const [barcode, setBarcode] = useState("")
  const [loading, setLoading] = useState(false)
  const [product, setProduct] = useState<any>(null)
  
  const [action, setAction] = useState<"OUT" | "IN" | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState("")
  const [processing, setProcessing] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
      if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const codeFromQr = urlParams.get('code');
          
          if (codeFromQr) {
              setBarcode(codeFromQr);
              fetchProductByCode(codeFromQr); 
          } else {
              inputRef.current?.focus() 
          }
      }
  }, [])

  const fetchProductByCode = async (codeStr: string) => {
      setLoading(true)
      setProduct(null)
      setAction(null)
      setQuantity(1)
      setNote("")

      const { data } = await supabase.from('warehouse_products').select('*').eq('product_code', codeStr).single()
      
      if (data) {
          setProduct(data)
      } else {
          alert("❌ Bu barkoda ait bir ürün bulunamadı!")
      }
      setLoading(false)
  }

  const handleSearch = (e?: React.FormEvent) => {
      if (e) e.preventDefault()
      if (!barcode.trim()) return
      fetchProductByCode(barcode.trim())
  }

  const handleProcess = async () => {
      if (!product || !action) return
      if (quantity <= 0) return alert("Miktar 0'dan büyük olmalıdır!")
      
      if (action === "OUT" && quantity > product.total_stock) {
          return alert(`Yetersiz Stok! Depoda sadece ${product.total_stock} adet var.`)
      }

      setProcessing(true)
      try {
          const { data: { user } } = await supabase.auth.getUser()

          const newStock = action === "IN" ? product.total_stock + quantity : product.total_stock - quantity

          const { error: stockError } = await supabase.from('warehouse_products').update({ total_stock: newStock }).eq('id', product.id)
          if (stockError) throw stockError

          const { error: logError } = await supabase.from('warehouse_movements').insert([{
              product_id: product.id,
              movement_type: action === "IN" ? 'GİRİŞ' : 'ÇIKIŞ',
              quantity: quantity,
              note: note || (action === "IN" ? "Barkod terminalinden hızlı giriş yapıldı." : "Barkod terminalinden hızlı çıkış yapıldı."),
              performed_by: user?.id
          }])
          if (logError) throw logError

          alert(`✅ İşlem Başarılı! Yeni Stok: ${newStock}`)
          
          setProduct(null)
          setAction(null)
          setBarcode("")
          inputRef.current?.focus()
          
          if (typeof window !== 'undefined') {
              window.history.replaceState({}, document.title, window.location.pathname)
          }

      } catch (error: any) {
          alert("Hata: " + error.message)
      } finally {
          setProcessing(false)
      }
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 max-w-[1000px] mx-auto w-full font-sans pb-10">
      
      {/* 🚀 ÜST BAŞLIK ALANI */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm">
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-3 md:p-4 rounded-xl md:rounded-2xl shadow-lg shadow-blue-500/30 shrink-0">
            <ScanLine className="h-6 w-6 md:h-8 md:w-8 text-white" />
        </div>
        <div>
            <h1 className="text-xl md:text-3xl font-black tracking-tight text-slate-900">QR Barkod Terminali</h1>
            <p className="text-slate-500 font-medium text-xs md:text-sm mt-1">Barkod okuyucu veya telefon kamerası ile hızlı işlem merkezi.</p>
        </div>
      </div>

      {!product && (
          <div className="bg-slate-900 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-12 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 md:p-8 opacity-10 pointer-events-none"><ScanLine className="h-32 w-32 md:h-48 md:w-48 text-white" /></div>
              
              <form onSubmit={handleSearch} className="relative z-10 flex flex-col items-center max-w-xl mx-auto w-full gap-5 md:gap-6">
                  <div className="text-center space-y-1.5 md:space-y-2 mb-2">
                      <h2 className="text-xl md:text-2xl font-black text-white tracking-widest uppercase">Barkod Okutun</h2>
                      <p className="text-slate-400 font-medium text-xs md:text-sm">Ürünün QR kodunu telefonla taratın veya kodu aşağıya girin.</p>
                  </div>
                  
                  <div className="relative w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-0 shadow-2xl shadow-black/50 rounded-[1.5rem] md:rounded-2xl overflow-hidden border-2 border-slate-700 focus-within:border-blue-500 transition-colors bg-slate-800/50 backdrop-blur-sm p-2 sm:p-0">
                      <ScanLine className="absolute left-5 h-6 w-6 md:h-8 md:w-8 text-blue-400 animate-pulse hidden sm:block" />
                      <Input 
                          ref={inputRef}
                          value={barcode} 
                          onChange={e => setBarcode(e.target.value)} 
                          placeholder="QR Kodu..." 
                          className="h-16 md:h-20 sm:pl-16 md:pl-20 sm:pr-32 bg-transparent border-slate-600 sm:border-none text-xl md:text-2xl font-black text-white tracking-widest placeholder:text-slate-600 focus-visible:ring-0 text-center sm:text-left rounded-xl sm:rounded-none" 
                      />
                      <Button type="submit" disabled={loading || !barcode} className="sm:absolute sm:right-2 h-14 md:h-16 px-6 bg-blue-600 hover:bg-blue-500 text-white font-black text-base md:text-lg rounded-xl w-full sm:w-auto mt-2 sm:mt-0">
                          {loading ? <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin" /> : "BUL"}
                      </Button>
                  </div>
              </form>
          </div>
      )}

      {product && (
          <div className="bg-white/80 backdrop-blur-2xl border border-white shadow-xl shadow-slate-200/50 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-12 animate-in fade-in slide-in-from-bottom-8 w-full">
              
              <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start border-b border-slate-100 pb-6 md:pb-8 mb-6 md:mb-8">
                  <div className="h-32 w-32 md:h-48 md:w-48 shrink-0 rounded-2xl md:rounded-3xl bg-slate-50 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                      {product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" /> : <ImageIcon className="h-10 w-10 md:h-12 md:w-12 text-slate-300" />}
                  </div>
                  <div className="flex flex-col flex-1 text-center md:text-left w-full">
                      <span className="text-blue-600 font-mono font-black tracking-widest text-xs md:text-sm bg-blue-50 px-2.5 py-1 rounded-lg w-max mx-auto md:mx-0 mb-2 md:mb-3">{product.product_code}</span>
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 leading-tight mb-2">{product.name}</h2>
                      <p className="text-slate-500 font-medium text-xs md:text-sm mb-4 md:mb-6 px-4 md:px-0">{product.description || "Açıklama bulunmuyor."}</p>
                      
                      <div className="inline-flex items-center justify-center md:justify-start gap-3 md:gap-4 p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 w-full md:w-max">
                          <span className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-widest">Mevcut Stok:</span>
                          <span className={`text-3xl md:text-4xl font-black tracking-tight ${product.total_stock > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {product.total_stock} <span className="text-sm md:text-lg text-slate-400">Adet</span>
                          </span>
                      </div>
                  </div>
              </div>

              {!action ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                      <button onClick={() => setAction("OUT")} className="flex flex-col items-center justify-center gap-3 md:gap-4 p-6 md:p-8 rounded-2xl md:rounded-3xl border-2 border-rose-100 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 transition-all group">
                          <div className="h-12 w-12 md:h-16 md:w-16 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"><PackageMinus className="h-6 w-6 md:h-8 md:w-8 text-rose-500" /></div>
                          <span className="text-xl md:text-2xl font-black text-rose-700">Stok Çıkışı Yap</span>
                          <span className="text-xs md:text-sm font-bold text-rose-400 text-center">Üretim hattına veya sahaya ürün ver.</span>
                      </button>
                      <button onClick={() => setAction("IN")} className="flex flex-col items-center justify-center gap-3 md:gap-4 p-6 md:p-8 rounded-2xl md:rounded-3xl border-2 border-emerald-100 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 transition-all group">
                          <div className="h-12 w-12 md:h-16 md:w-16 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"><PackagePlus className="h-6 w-6 md:h-8 md:w-8 text-emerald-500" /></div>
                          <span className="text-xl md:text-2xl font-black text-emerald-700">Hızlı Giriş Yap</span>
                          <span className="text-xs md:text-sm font-bold text-emerald-400 text-center">İade veya faturasız hızlı ürün girişi.</span>
                      </button>
                  </div>
              ) : (
                  <div className="flex flex-col gap-4 md:gap-6 animate-in zoom-in-95 duration-300">
                      <div className={`flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl md:rounded-2xl ${action === 'OUT' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {action === 'OUT' ? <PackageMinus className="h-5 w-5 md:h-6 md:w-6 shrink-0" /> : <PackagePlus className="h-5 w-5 md:h-6 md:w-6 shrink-0" />}
                          <h3 className="text-base md:text-xl font-black">{action === 'OUT' ? 'STOK ÇIKIŞI İŞLEMİ' : 'HIZLI STOK GİRİŞİ İŞLEMİ'}</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                          <div className="space-y-2 md:space-y-3">
                              <Label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">İşlem Miktarı (Adet)</Label>
                              <Input type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className={`h-14 md:h-16 rounded-xl md:rounded-2xl text-2xl md:text-3xl font-black text-center border-2 ${action === 'OUT' ? 'focus:border-rose-500 text-rose-600' : 'focus:border-emerald-500 text-emerald-600'}`} />
                          </div>
                          <div className="md:col-span-2 space-y-2 md:space-y-3">
                              <Label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">İşlem Notu (Nereye Verildi? Neden Alındı?)</Label>
                              <Input placeholder={action === 'OUT' ? "Örn: Montaj için Kaya Ali'ye verildi." : "Örn: Sahadan iade."} value={note} onChange={e => setNote(e.target.value)} className="h-14 md:h-16 rounded-xl md:rounded-2xl bg-slate-50 border-slate-200 font-bold px-4 md:px-5 text-sm" />
                          </div>
                      </div>

                      <div className="flex flex-col-reverse sm:flex-row gap-3 md:gap-4 mt-2 md:mt-4">
                          <Button variant="outline" onClick={() => setAction(null)} className="h-14 md:h-16 w-full sm:w-auto px-6 md:px-8 rounded-xl md:rounded-2xl font-bold text-slate-500 border-slate-200 hover:bg-slate-100">İptal Et</Button>
                          <Button onClick={handleProcess} disabled={processing} className={`h-14 md:h-16 flex-1 rounded-xl md:rounded-2xl text-white font-black text-sm md:text-lg shadow-xl flex items-center justify-center gap-2 md:gap-3 transition-all ${action === 'OUT' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/30' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30'}`}>
                              {processing ? <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin" /> : <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6" />}
                              {processing ? "İŞLENİYOR..." : (action === 'OUT' ? "STOKTAN DÜŞ VE KAYDET" : "STOĞA EKLE VE KAYDET")}
                          </Button>
                      </div>
                  </div>
              )}

          </div>
      )}
    </div>
  )
}