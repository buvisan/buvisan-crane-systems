"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ClipboardList, PlusCircle, Search, Download, Loader2, PackagePlus, UploadCloud, FileText, CheckCircle2, Edit2, Trash2 } from "lucide-react"

export default function WarehouseEntriesPage() {
  const [entries, setEntries] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  const [file, setFile] = useState<File | null>(null)
  const [existingDocUrl, setExistingDocUrl] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [oldQuantity, setOldQuantity] = useState<number>(0) // 🚀 Düzenlemede stok farkını bulmak için

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

  const openEdit = (entry: any) => {
      setForm({
          product_id: entry.product_id.toString(),
          quantity: entry.quantity,
          document_type: entry.document_type || "IRSALIYE",
          document_no: entry.document_no || "",
          supplier_name: entry.supplier_name || "",
          entry_date: entry.entry_date || new Date().toISOString().split('T')[0]
      })
      setOldQuantity(entry.quantity)
      setExistingDocUrl(entry.document_url)
      setFile(null)
      setEditingId(entry.id)
      setIsAdding(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!form.product_id) return alert("Lütfen depoya eklenecek ürünü seçin!")
      if (form.quantity <= 0) return alert("Miktar 0'dan büyük olmalıdır!")
      
      setSaving(true)

      try {
          const { data: { user } } = await supabase.auth.getUser()
          
          let docUrl = existingDocUrl
          if (file) docUrl = await uploadDocument(file)

          if (editingId) {
              // 🚀 GÜNCELLEME İŞLEMİ
              const { error: entryError } = await supabase.from('warehouse_entries').update({
                  product_id: Number(form.product_id), quantity: form.quantity, document_type: form.document_type,
                  document_no: form.document_no, document_url: docUrl, supplier_name: form.supplier_name,
                  entry_date: form.entry_date
              }).eq('id', editingId)
              if (entryError) throw entryError

              // Stok Farkını Hesapla ve Ürüne Yansıt
              const qtyDiff = form.quantity - oldQuantity
              if (qtyDiff !== 0) {
                  const { data: prodData } = await supabase.from('warehouse_products').select('total_stock').eq('id', form.product_id).single()
                  const newStock = (prodData?.total_stock || 0) + qtyDiff
                  await supabase.from('warehouse_products').update({ total_stock: newStock }).eq('id', form.product_id)

                  // Log at
                  await supabase.from('warehouse_movements').insert([{
                      product_id: Number(form.product_id), movement_type: qtyDiff > 0 ? 'GİRİŞ' : 'ÇIKIŞ', quantity: Math.abs(qtyDiff),
                      note: `Mal kabul kaydı düzeltildi. (${form.document_no} nolu evrak)`, performed_by: user?.id
                  }])
              }
              alert("✅ Mal kabul kaydı başarıyla güncellendi!")
          } else {
              // 🚀 YENİ EKLEME İŞLEMİ
              const { error: entryError } = await supabase.from('warehouse_entries').insert([{
                  product_id: Number(form.product_id), quantity: form.quantity, document_type: form.document_type,
                  document_no: form.document_no, document_url: docUrl, supplier_name: form.supplier_name,
                  entry_date: form.entry_date, created_by: user?.id
              }])
              if (entryError) throw entryError

              const { data: prodData } = await supabase.from('warehouse_products').select('total_stock').eq('id', form.product_id).single()
              const newStock = (prodData?.total_stock || 0) + Number(form.quantity)
              await supabase.from('warehouse_products').update({ total_stock: newStock }).eq('id', form.product_id)

              await supabase.from('warehouse_movements').insert([{
                  product_id: Number(form.product_id), movement_type: 'GİRİŞ', quantity: form.quantity,
                  note: `${form.supplier_name} firmasından ${form.document_type} (${form.document_no}) ile mal kabulü yapıldı.`, performed_by: user?.id
              }])
              alert("✅ Mal kabulü başarıyla yapıldı ve stoklara eklendi!")
          }

          resetForm()
          fetchData()

      } catch (error: any) {
          alert("Hata: " + error.message)
      } finally {
          setSaving(false)
      }
  }

  const handleDelete = async (entry: any) => {
      if(!confirm("Bu girişi silmek istediğinize emin misiniz? Bu işlem stokları EKSİLTİR!")) return;
      
      // Stoğu geri düş
      const { data: prodData } = await supabase.from('warehouse_products').select('total_stock').eq('id', entry.product_id).single()
      if (prodData) {
          const newStock = Math.max(0, prodData.total_stock - entry.quantity)
          await supabase.from('warehouse_products').update({ total_stock: newStock }).eq('id', entry.product_id)
      }

      await supabase.from('warehouse_entries').delete().eq('id', entry.id)
      fetchData()
  }

  const resetForm = () => {
      setForm({ product_id: "", quantity: 1, document_type: "IRSALIYE", document_no: "", supplier_name: "", entry_date: new Date().toISOString().split('T')[0] })
      setProductSearch("")
      setFile(null)
      setExistingDocUrl(null)
      setEditingId(null)
      setIsAdding(false)
  }

  const filteredEntries = entries.filter(e => 
      e.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.document_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.warehouse_products?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedProductName = products.find(p => p.id.toString() === form.product_id)?.name

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full font-sans pb-10">
      
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-4 md:gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-5 md:p-6 rounded-[2rem] shadow-sm flex-1">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 md:p-4 rounded-2xl shadow-lg shadow-emerald-500/30 shrink-0">
                <ClipboardList className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </div>
            <div>
                <h1 className="text-xl md:text-3xl font-black tracking-tight text-slate-900">Mal Kabul ve Giriş Fişleri</h1>
                <p className="text-slate-500 font-medium text-xs md:text-sm mt-1">İrsaliye/Fatura bazlı stok girişleri ve evrak arşivi.</p>
            </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <div className="relative w-full sm:w-64 xl:w-72 shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input placeholder="Tedarikçi, Evrak, Ürün..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-11 h-14 md:h-16 bg-white/80 border-white/50 text-sm font-bold text-slate-700 shadow-sm rounded-[1.5rem] md:rounded-[2rem] focus:ring-2 focus:ring-emerald-500 w-full" />
            </div>

            <Button onClick={() => { resetForm(); setIsAdding(!isAdding); }} className="h-14 md:h-16 px-6 md:px-8 bg-emerald-600 hover:bg-emerald-700 text-white text-sm md:text-base font-bold rounded-[1.5rem] md:rounded-[2rem] shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto">
                <PackagePlus className="h-5 w-5" /> Yeni Mal Kabulü Yap
            </Button>
        </div>
      </div>

      {isAdding && (
          <div className="bg-white/80 backdrop-blur-2xl border border-white shadow-xl rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-8 animate-in fade-in slide-in-from-top-4">
              <h2 className="text-lg md:text-xl font-black text-slate-800 mb-5 md:mb-6 flex items-center gap-2">
                  {editingId ? <Edit2 className="text-emerald-500 h-5 w-5"/> : <PackagePlus className="text-emerald-500 h-5 w-5"/>} 
                  {editingId ? "Mal Kabul Fişini Düzenle" : "Depoya Ürün Girişi (Lot)"}
              </h2>
              
              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6">
                  
                  <div className="md:col-span-12 space-y-2 relative">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hangi Ürün Geldi?</Label>
                      {form.product_id ? (
                          <div className="flex items-center justify-between h-12 md:h-14 px-4 md:px-5 rounded-xl md:rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm">
                              <div className="flex items-center gap-2 md:gap-3"><CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-emerald-500" /><span className="font-black text-xs md:text-sm text-emerald-900 truncate">{selectedProductName}</span></div>
                              <Button type="button" variant="ghost" onClick={() => { setForm({...form, product_id: ""}); setProductSearch(""); }} className="text-emerald-600 hover:bg-emerald-100 rounded-lg md:rounded-xl px-3 md:px-4 text-xs md:text-sm shrink-0">Değiştir</Button>
                          </div>
                      ) : (
                          <div className="relative z-50">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-slate-400" />
                              <Input placeholder="Barkod veya Ürün Adı Yazın..." value={productSearch} onChange={(e) => { setProductSearch(e.target.value); setIsProductDropdownOpen(true); }} onFocus={() => setIsProductDropdownOpen(true)} onBlur={() => setTimeout(() => setIsProductDropdownOpen(false), 200)} className="pl-10 md:pl-12 h-12 md:h-14 rounded-xl md:rounded-2xl bg-white border-slate-200 focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800 shadow-sm" />
                              {isProductDropdownOpen && (
                                  <div className="absolute w-full mt-2 bg-white rounded-xl md:rounded-2xl border border-slate-100 shadow-xl max-h-60 overflow-y-auto p-2">
                                      {products.filter(p => `${p.name} ${p.product_code}`.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                                          <button key={p.id} type="button" onClick={() => { setForm({...form, product_id: p.id.toString()}); setIsProductDropdownOpen(false); }} className="w-full text-left px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl text-xs md:text-sm font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
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
                      <Input type="number" min="1" required value={form.quantity} onChange={e => setForm({...form, quantity: Number(e.target.value)})} className="h-12 md:h-14 rounded-xl bg-white border-slate-200 text-xl md:text-2xl font-black text-center text-blue-600 shadow-sm" />
                  </div>
                  <div className="md:col-span-5 space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tedarikçi / Firma Adı</Label>
                      <Input required placeholder="Malı nereden aldık?" value={form.supplier_name} onChange={e => setForm({...form, supplier_name: e.target.value})} className="h-12 md:h-14 rounded-xl bg-white border-slate-200 font-bold shadow-sm text-sm" />
                  </div>
                  <div className="md:col-span-4 space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Geliş Tarihi</Label>
                      <Input required type="date" value={form.entry_date} onChange={e => setForm({...form, entry_date: e.target.value})} className="h-12 md:h-14 rounded-xl bg-white border-slate-200 font-bold shadow-sm text-sm" />
                  </div>

                  <div className="md:col-span-6 flex flex-col sm:flex-row gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex-1 space-y-2">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Evrak Tipi</Label>
                          <select value={form.document_type} onChange={e => setForm({...form, document_type: e.target.value})} className="w-full h-12 rounded-xl bg-white border border-slate-200 px-3 md:px-4 font-bold text-slate-700 outline-none focus:ring-emerald-500 shadow-sm text-sm">
                              <option value="IRSALIYE">SEVK İRSALİYESİ</option>
                              <option value="FATURA">ALIŞ FATURASI</option>
                              <option value="DIGER">DİĞER / TUTANAK</option>
                          </select>
                      </div>
                      <div className="flex-1 space-y-2">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Evrak Numarası</Label>
                          <Input required placeholder="Örn: IRS-2026-987" value={form.document_no} onChange={e => setForm({...form, document_no: e.target.value})} className="h-12 rounded-xl bg-white border-slate-200 font-bold font-mono shadow-sm text-sm" />
                      </div>
                  </div>

                  <div className="md:col-span-6 space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Evrak Dosyası (PDF veya Resim)</Label>
                      <div className={`relative flex items-center gap-3 md:gap-4 h-16 md:h-20 px-4 md:px-5 border-2 border-dashed rounded-xl md:rounded-2xl transition-all ${file ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-white hover:border-emerald-400'}`}>
                          <input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          <div className={`p-2 md:p-3 rounded-full ${file ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                              {file ? <FileText className="h-5 w-5 md:h-6 md:w-6" /> : <UploadCloud className="h-5 w-5 md:h-6 md:w-6" />}
                          </div>
                          <div className="flex flex-col min-w-0">
                              <span className="font-bold text-xs md:text-sm text-slate-700 truncate">{file ? file.name : existingDocUrl ? "Mevcut Evrak Yüklü (Değiştir)" : "Tıkla veya Evrağı Sürükle"}</span>
                              {!file && !existingDocUrl && <span className="text-[9px] md:text-[10px] text-slate-400 font-medium truncate">Sisteme fiziksel kopyasını da ekleyin.</span>}
                          </div>
                      </div>
                  </div>

                  <div className="md:col-span-12 flex flex-col-reverse sm:flex-row justify-end gap-3 mt-2 border-t border-slate-100 pt-5 md:pt-6">
                      <Button type="button" variant="ghost" onClick={resetForm} className="h-12 md:h-14 px-6 md:px-8 rounded-xl md:rounded-2xl font-bold w-full sm:w-auto">İptal Et</Button>
                      <Button type="submit" disabled={saving} className="h-12 md:h-14 px-6 md:px-10 rounded-xl md:rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-xl shadow-emerald-500/20 text-sm md:text-lg w-full sm:w-auto">
                          {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (editingId ? "Değişiklikleri Kaydet" : "Mal Kabulünü Tamamla")}
                      </Button>
                  </div>
              </form>
          </div>
      )}

      {/* LİSTELEME (Mobil Uyumlu) */}
      <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden w-full">
          <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                  <thead className="bg-slate-900 text-white">
                      <tr>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-[11px] font-black uppercase tracking-widest">Tarih</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-[11px] font-black uppercase tracking-widest">Gelen Ürün</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-center">Giriş Miktarı</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-[11px] font-black uppercase tracking-widest">Tedarikçi</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-[11px] font-black uppercase tracking-widest">Evrak Tipi & No</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-right">İşlemler</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredEntries.map((e) => (
                          <tr key={e.id} className="hover:bg-slate-50/80 transition-colors bg-white">
                              <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold text-slate-500">{new Date(e.entry_date).toLocaleDateString('tr-TR')}</td>
                              <td className="px-4 md:px-6 py-3 md:py-4">
                                  <div className="flex flex-col">
                                      <span className="font-black text-slate-800 text-xs md:text-sm truncate max-w-[200px]">{e.warehouse_products?.name}</span>
                                      <span className="font-mono text-[9px] md:text-[10px] text-slate-400 font-bold">{e.warehouse_products?.product_code}</span>
                                  </div>
                              </td>
                              <td className="px-4 md:px-6 py-3 md:py-4 text-center">
                                  <span className="inline-flex items-center justify-center min-w-[2.5rem] md:min-w-[3rem] h-7 md:h-8 rounded-md md:rounded-lg font-black text-xs md:text-sm bg-blue-100 text-blue-700">
                                      +{e.quantity}
                                  </span>
                              </td>
                              <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold text-slate-700 truncate max-w-[150px]">{e.supplier_name}</td>
                              <td className="px-4 md:px-6 py-3 md:py-4">
                                  <div className="flex items-center gap-2">
                                      <span className={`text-[9px] md:text-[10px] font-black tracking-widest uppercase px-2 py-1 rounded-md ${e.document_type === 'IRSALIYE' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                          {e.document_type.slice(0,3)}
                                      </span>
                                      <span className="font-mono font-bold text-slate-500 text-xs md:text-sm">{e.document_no}</span>
                                  </div>
                              </td>
                              <td className="px-4 md:px-6 py-3 md:py-4 text-right flex justify-end gap-1 md:gap-2 items-center">
                                  {e.document_url && (
                                      <a href={e.document_url} target="_blank" rel="noopener noreferrer" className="p-2 md:p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-lg md:rounded-xl transition-colors" title="Evrağı İndir">
                                          <Download className="h-4 w-4 md:h-5 md:w-5" />
                                      </a>
                                  )}
                                  <button onClick={() => openEdit(e)} className="p-2 md:p-2.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg md:rounded-xl transition-colors" title="Düzenle"><Edit2 className="h-4 w-4 md:h-5 md:w-5" /></button>
                                  <button onClick={() => handleDelete(e)} className="p-2 md:p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg md:rounded-xl transition-colors" title="Sil"><Trash2 className="h-4 w-4 md:h-5 md:w-5" /></button>
                              </td>
                          </tr>
                      ))}
                      {filteredEntries.length === 0 && !loading && (
                          <tr><td colSpan={6} className="py-16 md:py-20 text-center"><div className="flex flex-col items-center gap-3"><div className="bg-emerald-50 p-4 md:p-5 rounded-full shadow-sm"><ClipboardList className="h-8 w-8 md:h-10 md:w-10 text-emerald-300" /></div><p className="text-base md:text-lg font-bold text-emerald-600">Henüz mal kabulü yapılmamış.</p></div></td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  )
}