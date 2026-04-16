"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CarFront, PlusCircle, Trash2, Loader2, PackageOpen, Search, Edit2, ChevronDown, Layers } from "lucide-react"

export default function TrackingProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("") 
  
  // 🚀 DÜZENLEME ID'Sİ ARTIK BİR DİZİ (Çünkü birden fazla kopyayı aynı anda sileceğiz)
  const [editingIds, setEditingIds] = useState<number[] | null>(null)
  
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  const [form, setForm] = useState({ brand: "", model: "", price: "", stock: "" })
  const supabase = createClient()

  useEffect(() => { fetchProducts() }, [])

  const fetchProducts = async () => {
    setLoading(true)
    const { data } = await supabase.from('tracking_products').select('*').order('brand', { ascending: true })
    if (data) setProducts(data)
    setLoading(false)
  }

  const openEdit = (p: any) => {
      setForm({ brand: p.brand, model: p.model, price: p.price, stock: p.stock })
      setEditingIds(p.all_ids) // Birleştirilmiş tüm ID'leri hafızaya al
      setIsAdding(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    let error;
    if (editingIds && editingIds.length > 0) {
        // 🚀 VERİTABANI TEMİZLİĞİ: Sadece ilk kaydı güncelliyoruz, diğer gereksiz kopyaları siliyoruz!
        const firstId = editingIds[0];
        const duplicates = editingIds.slice(1);

        const { error: updateError } = await supabase.from('tracking_products').update({
            brand: form.brand, model: form.model, price: Number(form.price), stock: Number(form.stock)
        }).eq('id', firstId)

        if (duplicates.length > 0) {
            await supabase.from('tracking_products').delete().in('id', duplicates)
        }
        error = updateError;
    } else {
        const { error: insertError } = await supabase.from('tracking_products').insert([{
            brand: form.brand, model: form.model, price: Number(form.price), stock: Number(form.stock)
        }])
        error = insertError;
    }
    
    setSaving(false)

    if (error) alert("Hata: " + error.message)
    else { setForm({ brand: "", model: "", price: "", stock: "" }); setEditingIds(null); setIsAdding(false); fetchProducts(); }
  }

  const handleDelete = async (ids: number[]) => {
    if(!confirm("Bu ürünü (ve varsa tüm kopyalarını) tamamen silmek istediğinize emin misiniz?")) return;
    const { error } = await supabase.from('tracking_products').delete().in('id', ids)
    if (error && error.code === '23503') alert("DİKKAT: Bu ürünün sistemde kayıtlı satışları var. Önce satışları silmelisiniz.");
    else if (error) alert("Silinirken hata oluştu: " + error.message);
    else fetchProducts()
  }

  const toggleGroup = (groupName: string) => {
      setExpandedGroups(prev => prev.includes(groupName) ? prev.filter(g => g !== groupName) : [...prev, groupName])
  }

  // 🚀 AKILLI KONSOLİDASYON VE GRUPLAMA MOTORU
  const getGroupedProducts = () => {
      const filtered = products.filter(p => 
          p.brand.toLowerCase().includes(searchTerm.toLowerCase()) || p.model.toLowerCase().includes(searchTerm.toLowerCase())
      )

      // 1. AŞAMA: AYNI OLANLARI BİRLEŞTİR (Stokları topla)
      const consolidatedMap: Record<string, any> = {};
      filtered.forEach(p => {
          // İsim, model ve fiyat tamamen aynıysa birleştir
          const key = `${p.brand.trim().toUpperCase()}_${p.model.trim().toUpperCase()}_${p.price}`;
          if (!consolidatedMap[key]) {
              consolidatedMap[key] = { ...p, all_ids: [p.id] }; // İlk defa görüyorsak ekle
          } else {
              consolidatedMap[key].stock += p.stock; // Zaten varsa sadece stok miktarını üstüne ekle
              consolidatedMap[key].all_ids.push(p.id); // ID'sini de çöpe atmak üzere listeye ekle
          }
      });

      const consolidatedList = Object.values(consolidatedMap);

      // Eğer arama yapılıyorsa direkt liste olarak ver (Gruplama yapma)
      if (searchTerm) return { "Arama Sonuçları": consolidatedList };

      // 2. AŞAMA: BİRLEŞTİRİLMİŞ LİSTEYİ TONAJLARINA GÖRE AKILLI GRUPLA
      const grouped: Record<string, any[]> = {}
      
      consolidatedList.forEach(p => {
          const brandUpper = p.brand.toUpperCase()
          let groupName = "DİĞER ÜRÜNLER VE AKSESUARLAR"

          const tonMatch = brandUpper.match(/(\d+(?:[.,]\d+)?)\s*TON/);
          if (tonMatch) {
              groupName = `${tonMatch[0]} KAPASİTELİ SİSTEMLER`
          } else if (brandUpper.includes("VİNÇ")) {
              groupName = "VİNÇ SİSTEMLERİ"
          } else if (brandUpper.includes("KEDİ")) {
              groupName = "KEDİ VE YÜRÜYÜŞ SİSTEMLERİ"
          }

          if (!grouped[groupName]) grouped[groupName] = []
          grouped[groupName].push(p)
      })

      // Sıralama (Büyük tonajlar üstte olsun)
      const sortedKeys = Object.keys(grouped).sort((a, b) => {
          if (a.includes("TON") && b.includes("TON")) {
              const numA = parseFloat(a.replace(',', '.').match(/\d+(\.\d+)?/)?.[0] || "0")
              const numB = parseFloat(b.replace(',', '.').match(/\d+(\.\d+)?/)?.[0] || "0")
              return numB - numA 
          }
          return a.localeCompare(b)
      })

      const sortedGrouped: Record<string, any[]> = {}
      sortedKeys.forEach(k => sortedGrouped[k] = grouped[k])

      return sortedGrouped
  }

  const groupedProducts = getGroupedProducts();

  return (
    <div className="flex flex-col gap-6 md:gap-8 max-w-[1400px] mx-auto w-full font-sans pb-10">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 md:gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm flex-1">
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-3 md:p-4 rounded-xl md:rounded-2xl shadow-lg shadow-indigo-500/30 shrink-0"><CarFront className="h-6 w-6 md:h-8 md:w-8 text-white" /></div>
            <div>
                <h1 className="text-xl md:text-3xl font-black tracking-tight text-slate-900">Ürünler ve Modeller</h1>
                <p className="text-slate-500 font-medium text-xs md:text-sm mt-1">Satıştaki araçların marka, model ve fiyat listesi.</p>
            </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            <div className="relative w-full sm:w-64 md:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-slate-400" />
                <Input placeholder="Marka veya Model Ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 md:pl-11 h-12 md:h-14 bg-white/80 border-white/50 text-sm md:text-base font-bold text-slate-700 shadow-sm rounded-xl md:rounded-[2rem] focus:ring-2 focus:ring-indigo-500 w-full" />
            </div>

            <Button onClick={() => { setIsAdding(!isAdding); setEditingIds(null); setForm({ brand: "", model: "", price: "", stock: "" }) }} className="h-12 md:h-14 px-6 md:px-8 w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white text-sm md:text-base font-bold rounded-xl md:rounded-[2rem] shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2">
                <PlusCircle className="h-4 w-4 md:h-5 md:w-5" /> Yeni Ürün Ekle
            </Button>
        </div>
      </div>

      {isAdding && (
          <div className="bg-white/80 backdrop-blur-2xl border border-white shadow-lg rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-8 animate-in fade-in slide-in-from-top-4">
              <h2 className="text-lg md:text-xl font-black text-slate-800 mb-5 md:mb-6">{editingIds ? "Ürün Bilgilerini Güncelle" : "Yeni Araç Kaydı"}</h2>
              <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  <div className="space-y-1.5 md:space-y-2">
                      <Label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Marka / Tanım</Label>
                      <Input required placeholder="Örn: 10 TON ÇİFT KİRİŞ..." value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200 text-sm font-bold text-slate-800" />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                      <Label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Model Yılı / Kodu</Label>
                      <Input required placeholder="Örn: 2026" value={form.model} onChange={e => setForm({...form, model: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200 text-sm font-bold text-slate-800" />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                      <Label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Liste Fiyatı (TL)</Label>
                      <Input required type="number" placeholder="1500000" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200 font-black text-indigo-600 text-sm" />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                      <Label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Toplam Stok Adeti</Label>
                      <Input required type="number" placeholder="1" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200 text-sm font-bold text-blue-600" />
                  </div>
                  <div className="sm:col-span-2 md:col-span-4 flex flex-col-reverse sm:flex-row justify-end gap-3 mt-2 md:mt-4">
                      <Button type="button" variant="ghost" onClick={() => { setIsAdding(false); setEditingIds(null); }} className="h-12 px-6 rounded-xl font-bold w-full sm:w-auto">İptal</Button>
                      <Button type="submit" disabled={saving} className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md w-full sm:w-auto">
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingIds ? "Güncelle ve Kopyaları Temizle" : "Kaydet")}
                      </Button>
                  </div>
              </form>
          </div>
      )}

      <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden w-full p-2">
          
          {Object.keys(groupedProducts).length === 0 && !loading ? (
              <div className="py-16 md:py-20 text-center"><div className="flex flex-col items-center gap-3"><div className="bg-white p-4 md:p-5 rounded-full shadow-sm"><PackageOpen className="h-8 w-8 md:h-10 md:w-10 text-slate-300" /></div><p className="text-sm md:text-lg font-bold text-slate-500">Ürün bulunamadı.</p></div></div>
          ) : (
              <div className="flex flex-col gap-3">
                  {Object.entries(groupedProducts).map(([groupName, groupItems]) => {
                      const isExpanded = expandedGroups.includes(groupName) || searchTerm !== "";

                      return (
                      <div key={groupName} className="flex flex-col border border-slate-200/60 bg-white/40 rounded-[1rem] overflow-hidden shadow-sm transition-all duration-300">
                          
                          <div 
                              onClick={() => toggleGroup(groupName)}
                              className="flex items-center justify-between p-4 md:p-5 cursor-pointer bg-slate-50/50 hover:bg-indigo-50/50 transition-colors select-none"
                          >
                              <div className="flex items-center gap-3 md:gap-4">
                                  <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Layers className="h-5 w-5" /></div>
                                  <div>
                                      <h3 className="font-black text-sm md:text-base text-slate-800">{groupName}</h3>
                                      <p className="text-[10px] md:text-xs font-bold text-slate-400 mt-0.5">{groupItems.length} Benzersiz Ürün Kayıtlı</p>
                                  </div>
                              </div>
                              <div className={`p-2 rounded-full transition-all duration-300 ${isExpanded ? 'bg-indigo-100 text-indigo-600 rotate-180' : 'bg-slate-100 text-slate-400'}`}>
                                  <ChevronDown className="h-5 w-5" />
                              </div>
                          </div>

                          <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                              <div className="overflow-hidden">
                                  <div className="overflow-x-auto custom-scrollbar border-t border-slate-100">
                                      <table className="w-full text-left border-collapse min-w-[800px]">
                                          <thead className="bg-white/80 border-b border-slate-100">
                                              <tr>
                                                  <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ürün Tanımı / Marka</th>
                                                  <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Model / Kod</th>
                                                  <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fiyat</th>
                                                  <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Toplam Stok</th>
                                                  <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">İşlem</th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 bg-white/30">
                                              {groupItems.map((p) => (
                                                  <tr key={p.all_ids.join('-')} className="hover:bg-indigo-50/40 transition-colors group/row">
                                                      <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-black text-slate-800 max-w-[300px] whitespace-normal leading-tight">
                                                          {p.brand} 
                                                          {p.all_ids.length > 1 && <span className="text-[9px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded ml-2">Birleşik Veri</span>}
                                                      </td>
                                                      <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold text-slate-500">{p.model}</td>
                                                      <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-black text-indigo-600 tabular-nums">{p.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                                                      <td className="px-4 md:px-6 py-3 md:py-4"><span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold border border-blue-200 shadow-sm">{p.stock} Adet</span></td>
                                                      <td className="px-4 md:px-6 py-3 md:py-4 text-right flex justify-end gap-1.5 md:gap-2 opacity-100 lg:opacity-40 lg:group-hover/row:opacity-100 transition-opacity">
                                                          <button onClick={() => openEdit(p)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Düzenle ve Kopyaları Sil"><Edit2 className="h-4 w-4 md:h-5 md:w-5" /></button>
                                                          <button onClick={() => handleDelete(p.all_ids)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors" title="Tüm Kopyaları Sil"><Trash2 className="h-4 w-4 md:h-5 md:w-5" /></button>
                                                      </td>
                                                  </tr>
                                              ))}
                                          </tbody>
                                      </table>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )})}
              </div>
          )}
      </div>
    </div>
  )
}