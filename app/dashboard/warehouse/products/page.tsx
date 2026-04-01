"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Archive, PlusCircle, Search, Trash2, Loader2, UploadCloud, QrCode, Printer, X, Image as ImageIcon } from "lucide-react"

export default function WarehouseProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [qrModal, setQrModal] = useState<{isOpen: boolean, code: string, name: string}>({ isOpen: false, code: "", name: "" })

  const [form, setForm] = useState({
      product_code: `BUV-${Date.now().toString().slice(-6)}`,
      name: "", category: "", description: ""
  })

  const supabase = createClient()

  useEffect(() => { fetchProducts() }, [])

  const fetchProducts = async () => {
    setLoading(true)
    const { data } = await supabase.from('warehouse_products').select('*').order('created_at', { ascending: false })
    if (data) setProducts(data)
    setLoading(false)
  }

  const uploadImage = async (file: File) => {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const { error } = await supabase.storage.from('warehouse-images').upload(fileName, file)
      if (error) throw error
      const { data } = supabase.storage.from('warehouse-images').getPublicUrl(fileName)
      return data.publicUrl
  }

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!form.name || !form.product_code) return alert("Ürün adı ve Barkod kodu zorunludur.")
      setSaving(true)

      try {
          let imageUrl = null
          if (imageFile) imageUrl = await uploadImage(imageFile)

          const { error } = await supabase.from('warehouse_products').insert([{
              product_code: form.product_code, name: form.name, category: form.category, description: form.description, image_url: imageUrl
          }])

          if (error) throw error

          alert("✅ Ürün başarıyla depoya tanımlandı!")
          setForm({ product_code: `BUV-${Date.now().toString().slice(-6)}`, name: "", category: "", description: "" })
          setImageFile(null)
          setIsAdding(false)
          fetchProducts()

      } catch (error: any) {
          alert("Hata: " + error.message)
      } finally {
          setSaving(false)
      }
  }

  const handleDelete = async (id: number) => {
      if(!confirm("Bu ürünü silmek istediğinize emin misiniz? Tüm stok geçmişi silinebilir!")) return;
      await supabase.from('warehouse_products').delete().eq('id', id)
      fetchProducts()
  }

  const filteredProducts = products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.product_code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // API Kullanarak Bedava ve Hızlı QR Kod Üretici Linki
  const getQrUrl = (code: string) => `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${code}`

  return (
    <div className="flex flex-col gap-8 max-w-[1600px] mx-auto w-full font-sans pb-10">
      
      {/* 🚀 ÜST KART */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-6 rounded-[2rem] shadow-sm flex-1">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-2xl shadow-lg shadow-indigo-500/30">
                <Archive className="h-8 w-8 text-white" />
            </div>
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Depo Ürünleri ve Barkodlar</h1>
                <p className="text-slate-500 font-medium text-sm mt-1">Görselli stok tanımlamaları ve otomatik QR kod merkezi.</p>
            </div>
        </div>
        
        <div className="relative w-full md:w-64 shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input placeholder="Ürün veya Barkod Ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-11 h-16 bg-white/80 border-white/50 text-sm font-bold text-slate-700 shadow-sm rounded-[2rem] focus:ring-2 focus:ring-indigo-500" />
        </div>

        <Button onClick={() => setIsAdding(!isAdding)} className="h-16 px-8 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold rounded-[2rem] shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2 shrink-0">
            <PlusCircle className="h-5 w-5" /> Yeni Ürün Tanımla
        </Button>
      </div>

      {/* 🚀 YENİ ÜRÜN EKLEME FORMU */}
      {isAdding && (
          <div className="bg-white/80 backdrop-blur-2xl border border-white shadow-xl rounded-[2.5rem] p-8 animate-in fade-in slide-in-from-top-4">
              <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><PlusCircle className="text-indigo-500"/> Ürün Kartı Oluştur</h2>
              
              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  
                  {/* RESİM YÜKLEME ALANI */}
                  <div className="md:col-span-3 flex flex-col gap-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ürün Görseli</Label>
                      <div className="relative h-48 w-full border-2 border-dashed border-slate-300 rounded-3xl bg-slate-50 flex flex-col items-center justify-center overflow-hidden hover:border-indigo-400 hover:bg-indigo-50 transition-colors group">
                          <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          {imageFile ? (
                              <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                              <>
                                  <div className="p-3 bg-white rounded-full shadow-sm mb-2 text-slate-400 group-hover:text-indigo-500 transition-colors"><UploadCloud className="h-6 w-6"/></div>
                                  <span className="text-xs font-bold text-slate-500">Resim Seç</span>
                              </>
                          )}
                      </div>
                  </div>

                  {/* BİLGİ ALANI */}
                  <div className="md:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Seri / Barkod Kodu</Label>
                          <div className="flex gap-2">
                              <Input required value={form.product_code} onChange={e => setForm({...form, product_code: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200 font-mono font-bold text-indigo-700" />
                              <Button type="button" variant="outline" onClick={() => setForm({...form, product_code: `BUV-${Date.now().toString().slice(-6)}`})} className="h-12 border-slate-200 text-slate-500 font-bold" title="Rastgele Üret"><QrCode className="h-4 w-4"/></Button>
                          </div>
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kategori / Grup</Label>
                          <Input placeholder="Örn: Elektrik Malzemeleri, Rulman..." value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="h-12 rounded-xl bg-white border-slate-200 font-bold text-slate-700" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ürün Adı</Label>
                          <Input required placeholder="Örn: 220V Kontaktör, 6204 Rulman..." value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-14 rounded-xl bg-white border-slate-200 text-lg font-black text-slate-800 focus:ring-indigo-500" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Açıklama / Kullanım Yeri</Label>
                          <Textarea placeholder="Bu parça nerelerde kullanılır, özellikleri nelerdir?" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="resize-none h-20 rounded-xl bg-white border-slate-200" />
                      </div>
                  </div>

                  <div className="md:col-span-12 flex justify-end gap-3 mt-2 border-t border-slate-100 pt-6">
                      <Button type="button" variant="ghost" onClick={() => setIsAdding(false)} className="h-14 px-8 rounded-2xl font-bold">İptal</Button>
                      <Button type="submit" disabled={saving} className="h-14 px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-xl shadow-indigo-500/20 text-lg">
                          {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Ürünü Depoya Kaydet"}
                      </Button>
                  </div>
              </form>
          </div>
      )}

      {/* 🚀 LİSTELEME */}
      <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead className="bg-slate-900 text-white">
                      <tr>
                          <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest w-16">Görsel</th>
                          <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest">Seri / Barkod</th>
                          <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest">Ürün Adı</th>
                          <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest">Kategori</th>
                          <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-center">Mevcut Stok</th>
                          <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-right">İşlemler</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredProducts.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-colors bg-white">
                              <td className="px-6 py-3">
                                  <div className="h-12 w-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                                      {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-slate-300" />}
                                  </div>
                              </td>
                              <td className="px-6 py-4 font-mono font-black text-indigo-600 text-sm">{p.product_code}</td>
                              <td className="px-6 py-4 text-sm font-black text-slate-800">{p.name}</td>
                              <td className="px-6 py-4 text-sm font-bold text-slate-500"><span className="bg-slate-100 px-3 py-1 rounded-lg">{p.category || "Genel"}</span></td>
                              <td className="px-6 py-4 text-center">
                                  <span className={`inline-flex items-center justify-center min-w-[3rem] h-8 rounded-lg font-black text-sm ${p.total_stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                      {p.total_stock}
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-right flex justify-end gap-2 items-center">
                                  {/* 🚀 QR GÖRÜNTÜLEME BUTONU */}
                                  <Button variant="outline" size="sm" className="h-10 rounded-xl text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-bold" onClick={() => setQrModal({ isOpen: true, code: p.product_code, name: p.name })}>
                                      <QrCode className="h-4 w-4 mr-2" /> QR Etiket
                                  </Button>
                                  <button onClick={() => handleDelete(p.id)} className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 className="h-5 w-5" /></button>
                              </td>
                          </tr>
                      ))}
                      {filteredProducts.length === 0 && !loading && (
                          <tr><td colSpan={6} className="py-20 text-center"><div className="flex flex-col items-center gap-3"><div className="bg-slate-50 p-5 rounded-full shadow-sm"><Archive className="h-10 w-10 text-slate-300" /></div><p className="text-lg font-bold text-slate-500">Depoya henüz ürün tanımlanmadı.</p></div></td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* 🚀 BARKOD / QR YAZDIRMA MODALI */}
      {qrModal.isOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-sm w-full flex flex-col items-center text-center relative">
                  <button onClick={() => setQrModal({isOpen: false, code: "", name: ""})} className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"><X className="h-5 w-5" /></button>
                  
                  {/* YAZDIRILACAK ALAN (Sadece bu div yazıcıdan çıkar) */}
                  <div id="print-qr-section" className="flex flex-col items-center p-4 border-2 border-dashed border-slate-300 rounded-2xl w-full">
                      <h3 className="font-black text-lg text-slate-800 mb-4">{qrModal.name}</h3>
                      <img src={getQrUrl(qrModal.code)} alt="QR" className="w-48 h-48 mb-4 border p-2 rounded-xl shadow-sm" />
                      <p className="font-mono font-black text-indigo-600 text-xl tracking-widest bg-indigo-50 px-4 py-1.5 rounded-lg border border-indigo-100">{qrModal.code}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-3">BUVİSAN DEPO SİSTEMİ</p>
                  </div>

                  <Button onClick={() => {
                      const printContent = document.getElementById('print-qr-section')?.innerHTML;
                      const originalContent = document.body.innerHTML;
                      if(printContent) {
                          document.body.innerHTML = `<div style="display:flex; justify-content:center; padding:20px;">${printContent}</div>`;
                          window.print();
                          document.body.innerHTML = originalContent;
                          window.location.reload(); // React state'i toparlamak için sayfayı yeniler
                      }
                  }} className="w-full h-14 mt-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-lg shadow-lg flex items-center justify-center gap-2">
                      <Printer className="h-5 w-5" /> Etiketi Yazdır
                  </Button>
              </div>
          </div>
      )}

    </div>
  )
}