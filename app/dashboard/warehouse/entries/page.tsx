"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ClipboardList, PlusCircle, Search, Download, Loader2, PackagePlus, UploadCloud, FileText, CheckCircle2 } from "lucide-react"

export default function WarehouseEntriesPage() {
  const [entries, setEntries] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  const [file, setFile] = useState<File | null>(null)
  const [productSearch, setProductSearch] = useState("")
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false)

  const [form, setForm] = useState({
      product_id: "", quantity: 1, document_type: "IRSALIYE", document_no: "", supplier_name: "", entry_date: new Date().toISOString().split('T')[0]
  })

  const supabase = createClient()

  useEffect(() => { 
      fetchData() 
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: entriesData } = await supabase.from('warehouse_entries').select(`*, warehouse_products(name, product_code)`).order('created_at', { ascending: false })
    const { data: productsData } = await supabase.from('warehouse_products').select('id, name, product_code')
    
    if (entriesData) setEntries(entriesData)
    if (productsData) setProducts(productsData)
    setLoading(false)
  }

  const uploadDocument = async (file: File) => {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const { error } = await supabase.storage.from('warehouse-docs').upload(fileName, file)
      if (error) throw error
      const { data } = supabase.storage.from('warehouse-docs').getPublicUrl(fileName)
      return data.publicUrl
  }

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!form.product_id) return alert("Lütfen depoya eklenecek ürünü seçin!")
      if (form.quantity <= 0) return alert("Miktar 0'dan büyük olmalıdır!")
      
      setSaving(true)

      try {
          const { data: { user } } = await supabase.auth.getUser()
          
          let docUrl = null
          if (file) docUrl = await uploadDocument(file)

          // 1. GİRİŞ FİŞİNİ OLUŞTUR (Parti/Lot)
          const { error: entryError } = await supabase.from('warehouse_entries').insert([{
              product_id: Number(form.product_id), quantity: form.quantity, document_type: form.document_type,
              document_no: form.document_no, document_url: docUrl, supplier_name: form.supplier_name,
              entry_date: form.entry_date, created_by: user?.id
          }])
          if (entryError) throw entryError

          // 2. ANA ÜRÜNÜN STOĞUNU ARTIR
          const currentProduct = products.find(p => p.id.toString() === form.product_id)
          const { data: prodData } = await supabase.from('warehouse_products').select('total_stock').eq('id', form.product_id).single()
          const newStock = (prodData?.total_stock || 0) + Number(form.quantity)
          
          const { error: stockError } = await supabase.from('warehouse_products').update({ total_stock: newStock }).eq('id', form.product_id)
          if (stockError) throw stockError

          // 3. LOG (HAREKET) TABLOSUNA YAZ (Analiz Ekranı İçin)
          await supabase.from('warehouse_movements').insert([{
              product_id: Number(form.product_id), movement_type: 'GİRİŞ', quantity: form.quantity,
              note: `${form.supplier_name} firmasından ${form.document_type} (${form.document_no}) ile mal kabulü yapıldı.`,
              performed_by: user?.id
          }])

          alert("✅ Mal kabulü başarıyla yapıldı ve stoklara eklendi!")
          setForm({ product_id: "", quantity: 1, document_type: "IRSALIYE", document_no: "", supplier_name: "", entry_date: new Date().toISOString().split('T')[0] })
          setProductSearch("")
          setFile(null)
          setIsAdding(false)
          fetchData()

      } catch (error: any) {
          alert("Hata: " + error.message)
      } finally {
          setSaving(false)
      }
  }

  const filteredEntries = entries.filter(e => 
      e.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.document_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.warehouse_products?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedProductName = products.find(p => p.id.toString() === form.product_id)?.name

  return (
    <div className="flex flex-col gap-8 max-w-[1600px] mx-auto w-full font-sans pb-10">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-6 rounded-[2rem] shadow-sm flex-1">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl shadow-lg shadow-emerald-500/30">
                <ClipboardList className="h-8 w-8 text-white" />
            </div>
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Mal Kabul ve Giriş Fişleri</h1>
                <p className="text-slate-500 font-medium text-sm mt-1">İrsaliye/Fatura bazlı stok girişleri ve evrak arşivi.</p>
            </div>
        </div>
        
        <div className="relative w-full md:w-64 shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input placeholder="Tedarikçi, Evrak, Ürün Ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-11 h-16 bg-white/80 border-white/50 text-sm font-bold text-slate-700 shadow-sm rounded-[2rem] focus:ring-2 focus:ring-emerald-500" />
        </div>

        <Button onClick={() => setIsAdding(!isAdding)} className="h-16 px-8 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold rounded-[2rem] shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2 shrink-0">
            <PackagePlus className="h-5 w-5" /> Yeni Mal Kabulü Yap
        </Button>
      </div>

      {isAdding && (
          <div className="bg-white/80 backdrop-blur-2xl border border-white shadow-xl rounded-[2.5rem] p-8 animate-in fade-in slide-in-from-top-4">
              <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><PackagePlus className="text-emerald-500"/> Depoya Ürün Girişi (Lot)</h2>
              
              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* AKILLI ÜRÜN SEÇİCİ */}
                  <div className="md:col-span-12 space-y-2 relative">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hangi Ürün Geldi?</Label>
                      {form.product_id ? (
                          <div className="flex items-center justify-between h-14 px-5 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm">
                              <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-500" /><span className="font-black text-emerald-900">{selectedProductName}</span></div>
                              <Button type="button" variant="ghost" onClick={() => { setForm({...form, product_id: ""}); setProductSearch(""); }} className="text-emerald-600 hover:bg-emerald-100 rounded-xl px-4">Değiştir</Button>
                          </div>
                      ) : (
                          <div className="relative z-50">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                              <Input placeholder="Barkod veya Ürün Adı Yazın..." value={productSearch} onChange={(e) => { setProductSearch(e.target.value); setIsProductDropdownOpen(true); }} onFocus={() => setIsProductDropdownOpen(true)} onBlur={() => setTimeout(() => setIsProductDropdownOpen(false), 200)} className="pl-12 h-14 rounded-2xl bg-white border-slate-200 focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800 shadow-sm" />
                              {isProductDropdownOpen && (
                                  <div className="absolute w-full mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl max-h-60 overflow-y-auto p-2">
                                      {products.filter(p => `${p.name} ${p.product_code}`.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                                          <button key={p.id} type="button" onClick={() => { setForm({...form, product_id: p.id.toString()}); setIsProductDropdownOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl text-sm font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                                              <span className="text-emerald-600 font-mono mr-2">{p.product_code}</span> {p.name}
                                          </button>
                                      ))}
                                  </div>
                              )}
                          </div>
                      )}
                  </div>

                  <div className="md:col-span-3 space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gelen Miktar</Label>
                      <Input type="number" min="1" required value={form.quantity} onChange={e => setForm({...form, quantity: Number(e.target.value)})} className="h-14 rounded-xl bg-white border-slate-200 text-2xl font-black text-center text-blue-600 shadow-sm" />
                  </div>
                  <div className="md:col-span-5 space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tedarikçi / Firma Adı</Label>
                      <Input required placeholder="Mali nereden aldık?" value={form.supplier_name} onChange={e => setForm({...form, supplier_name: e.target.value})} className="h-14 rounded-xl bg-white border-slate-200 font-bold shadow-sm" />
                  </div>
                  <div className="md:col-span-4 space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Geliş Tarihi</Label>
                      <Input required type="date" value={form.entry_date} onChange={e => setForm({...form, entry_date: e.target.value})} className="h-14 rounded-xl bg-white border-slate-200 font-bold shadow-sm" />
                  </div>

                  <div className="md:col-span-6 flex gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex-1 space-y-2">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Evrak Tipi</Label>
                          <select value={form.document_type} onChange={e => setForm({...form, document_type: e.target.value})} className="w-full h-12 rounded-xl bg-white border border-slate-200 px-4 font-bold text-slate-700 outline-none focus:ring-emerald-500 shadow-sm">
                              <option value="IRSALIYE">SEVK İRSALİYESİ</option>
                              <option value="FATURA">ALIŞ FATURASI</option>
                              <option value="DIGER">DİĞER / TUTANAK</option>
                          </select>
                      </div>
                      <div className="flex-1 space-y-2">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Evrak Numarası</Label>
                          <Input required placeholder="Örn: IRS-2026-987" value={form.document_no} onChange={e => setForm({...form, document_no: e.target.value})} className="h-12 rounded-xl bg-white border-slate-200 font-bold font-mono shadow-sm" />
                      </div>
                  </div>

                  {/* PDF YÜKLEME SLOTU */}
                  <div className="md:col-span-6 space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Evrak Dosyası (PDF veya Resim)</Label>
                      <div className={`relative flex items-center gap-4 h-20 px-5 border-2 border-dashed rounded-2xl transition-all ${file ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-white hover:border-emerald-400'}`}>
                          <input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          <div className={`p-3 rounded-full ${file ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                              {file ? <FileText className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
                          </div>
                          <div className="flex flex-col">
                              <span className="font-bold text-sm text-slate-700">{file ? file.name : "Tıkla veya Evrağı Sürükle"}</span>
                              {!file && <span className="text-[10px] text-slate-400 font-medium">Sisteme fiziksel kopyasını da ekleyin.</span>}
                          </div>
                      </div>
                  </div>

                  <div className="md:col-span-12 flex justify-end gap-3 mt-4 border-t border-slate-100 pt-6">
                      <Button type="button" variant="ghost" onClick={() => setIsAdding(false)} className="h-14 px-8 rounded-2xl font-bold">İptal</Button>
                      <Button type="submit" disabled={saving} className="h-14 px-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-xl shadow-emerald-500/20 text-lg">
                          {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Mal Kabulünü Tamamla"}
                      </Button>
                  </div>
              </form>
          </div>
      )}

      {/* LİSTELEME */}
      <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead className="bg-slate-900 text-white">
                      <tr>
                          <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest">Tarih</th>
                          <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest">Gelen Ürün</th>
                          <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-center">Giriş Miktarı</th>
                          <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest">Tedarikçi</th>
                          <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest">Evrak Tipi & No</th>
                          <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-right">Fiziksel Evrak</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredEntries.map((e) => (
                          <tr key={e.id} className="hover:bg-slate-50/80 transition-colors bg-white">
                              <td className="px-6 py-4 text-sm font-bold text-slate-500">{new Date(e.entry_date).toLocaleDateString('tr-TR')}</td>
                              <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                      <span className="font-black text-slate-800">{e.warehouse_products?.name}</span>
                                      <span className="font-mono text-[10px] text-slate-400 font-bold">{e.warehouse_products?.product_code}</span>
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                  <span className="inline-flex items-center justify-center min-w-[3rem] h-8 rounded-lg font-black text-sm bg-blue-100 text-blue-700">
                                      +{e.quantity}
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-sm font-bold text-slate-700">{e.supplier_name}</td>
                              <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                      <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-1 rounded-md ${e.document_type === 'IRSALIYE' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                          {e.document_type}
                                      </span>
                                      <span className="font-mono font-bold text-slate-500 text-sm">{e.document_no}</span>
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                  {e.document_url ? (
                                      <a href={e.document_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-colors">
                                          <Download className="h-4 w-4" /> İndir
                                      </a>
                                  ) : (
                                      <span className="text-xs text-slate-400 font-bold italic">Evrak Yüklenmemiş</span>
                                  )}
                              </td>
                          </tr>
                      ))}
                      {filteredEntries.length === 0 && !loading && (
                          <tr><td colSpan={6} className="py-20 text-center"><div className="flex flex-col items-center gap-3"><div className="bg-emerald-50 p-5 rounded-full shadow-sm"><ClipboardList className="h-10 w-10 text-emerald-300" /></div><p className="text-lg font-bold text-emerald-600">Henüz mal kabulü yapılmamış.</p></div></td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  )
}