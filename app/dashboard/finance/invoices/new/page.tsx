"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Save, ArrowLeft, Plus, Trash2, Calculator, Receipt, Building2, Loader2 } from "lucide-react"

type InvoiceItem = { description: string, quantity: number, unit_price: number, tax_rate: number, total: number }

export default function NewInvoicePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
      document_type: "FATURA", document_no: `INV-${Date.now().toString().slice(-6)}`, issue_date: new Date().toISOString().split('T')[0],
      customer_name: "", tax_office: "", tax_number: "", address: "", notes: "", status: "BEKLIYOR"
  })

  const [items, setItems] = useState<InvoiceItem[]>([
      { description: "", quantity: 1, unit_price: 0, tax_rate: 20, total: 0 }
  ])

  // Toplamları Hesapla
  const calculateTotals = () => {
      let subTotal = 0; let taxTotal = 0;
      items.forEach(item => {
          const rowTotal = item.quantity * item.unit_price
          subTotal += rowTotal
          taxTotal += rowTotal * (item.tax_rate / 100)
      })
      return { subTotal, taxTotal, grandTotal: subTotal + taxTotal }
  }

  const { subTotal, taxTotal, grandTotal } = calculateTotals()

  const addItem = () => setItems([...items, { description: "", quantity: 1, unit_price: 0, tax_rate: 20, total: 0 }])
  
  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
      const newItems = [...items]
      // @ts-ignore
      newItems[index][field] = value
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price
      setItems(newItems)
  }

  const removeItem = (index: number) => {
      const newItems = [...items]
      newItems.splice(index, 1)
      setItems(newItems)
  }

  const handleSave = async () => {
      if (!form.customer_name || !form.document_no) return alert("Firma adı ve belge numarası zorunludur.")
      setLoading(true)

      try {
          const { data: { user } } = await supabase.auth.getUser()
          
          // 1. Ana Faturayı Kaydet
          const { data: invoiceData, error: invoiceError } = await supabase.from('finance_invoices').insert([{
              ...form, sub_total: subTotal, tax_total: taxTotal, grand_total: grandTotal, created_by: user?.id
          }]).select().single()

          if (invoiceError) throw invoiceError

          // 2. Fatura Kalemlerini Kaydet
          const invoiceItemsData = items.map(item => ({
              invoice_id: invoiceData.id, description: item.description, quantity: item.quantity, 
              unit_price: item.unit_price, tax_rate: item.tax_rate, total: item.quantity * item.unit_price
          }))

          const { error: itemsError } = await supabase.from('finance_invoice_items').insert(invoiceItemsData)
          if (itemsError) throw itemsError

          alert("✅ Belge başarıyla oluşturuldu!")
          router.push('/dashboard/finance/invoices')
          
      } catch (error: any) {
          alert("Hata oluştu: " + error.message)
      } finally {
          setLoading(false)
      }
  }

  return (
    <div className="flex flex-col gap-8 max-w-[1200px] mx-auto w-full font-sans pb-20">
        
        <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()} className="h-12 w-12 rounded-full p-0 bg-white shadow-sm border border-slate-100 hover:bg-slate-50"><ArrowLeft className="h-5 w-5 text-slate-600" /></Button>
            <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Yeni Belge Düzenle</h1>
                <p className="text-slate-500 font-medium text-sm">Fatura veya İrsaliye detaylarını girin.</p>
            </div>
        </div>

        <div className="bg-white/80 backdrop-blur-2xl border border-white shadow-xl shadow-slate-200/40 rounded-[2.5rem] p-8">
            
            {/* ÜST BİLGİLER */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-8 border-b border-slate-100 pb-8">
                <div className="md:col-span-4 space-y-4">
                    <div className="flex items-center gap-2 mb-4"><Receipt className="h-5 w-5 text-indigo-500" /><h3 className="font-black text-slate-800">Belge Türü & Tarih</h3></div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Belge Tipi</Label>
                        <select value={form.document_type} onChange={e => setForm({...form, document_type: e.target.value})} className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 px-4 font-black text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="FATURA">FATURA</option>
                            <option value="IRSALIYE">SEVK İRSALİYESİ</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Belge Numarası</Label>
                        <Input value={form.document_no} onChange={e => setForm({...form, document_no: e.target.value})} className="h-12 rounded-xl bg-slate-50 font-mono font-bold text-slate-700" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Düzenlenme Tarihi</Label>
                        <Input type="date" value={form.issue_date} onChange={e => setForm({...form, issue_date: e.target.value})} className="h-12 rounded-xl bg-slate-50" />
                    </div>
                </div>

                <div className="md:col-span-8 space-y-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-2"><Building2 className="h-5 w-5 text-blue-500" /><h3 className="font-black text-slate-800">Müşteri / Cari Bilgileri</h3></div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Firma Adı (Unvan)</Label>
                        <Input value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} className="h-12 rounded-xl bg-white border-slate-200 font-black text-slate-800 shadow-sm" placeholder="Örn: Buvisan Vinç Sistemleri San. Tic. A.Ş." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vergi Dairesi</Label>
                            <Input value={form.tax_office} onChange={e => setForm({...form, tax_office: e.target.value})} className="h-12 rounded-xl bg-white shadow-sm" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vergi / TC Kimlik No</Label>
                            <Input value={form.tax_number} onChange={e => setForm({...form, tax_number: e.target.value})} className="h-12 rounded-xl bg-white font-mono shadow-sm" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Açık Adres</Label>
                        <Textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="resize-none h-20 rounded-xl bg-white shadow-sm" />
                    </div>
                </div>
            </div>

            {/* ÜRÜN KALEMLERİ */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-slate-800 text-lg flex items-center gap-2"><Calculator className="h-5 w-5 text-emerald-500" /> Ürün / Hizmet Kalemleri</h3>
                    <Button onClick={addItem} variant="outline" className="h-10 rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold"><Plus className="h-4 w-4 mr-2"/> Yeni Satır</Button>
                </div>
                
                <div className="space-y-3">
                    {items.map((item, index) => (
                        <div key={index} className="flex flex-col md:flex-row items-start md:items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 relative">
                            <div className="w-full md:flex-1 space-y-1">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Açıklama</Label>
                                <Input placeholder="Örn: 10 Ton Vinç Montajı" value={item.description} onChange={e => updateItem(index, 'description', e.target.value)} className="h-12 rounded-xl bg-white" />
                            </div>
                            <div className="w-full md:w-24 space-y-1">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Miktar</Label>
                                <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(index, 'quantity', Number(e.target.value))} className="h-12 rounded-xl bg-white text-center font-bold" />
                            </div>
                            <div className="w-full md:w-32 space-y-1">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Birim Fiyat</Label>
                                <Input type="number" value={item.unit_price} onChange={e => updateItem(index, 'unit_price', Number(e.target.value))} className="h-12 rounded-xl bg-white font-bold text-right" />
                            </div>
                            <div className="w-full md:w-24 space-y-1">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">KDV (%)</Label>
                                <select value={item.tax_rate} onChange={e => updateItem(index, 'tax_rate', Number(e.target.value))} className="w-full h-12 rounded-xl bg-white border border-slate-200 px-3 font-bold text-slate-700 outline-none">
                                    <option value={0}>%0</option>
                                    <option value={10}>%10</option>
                                    <option value={20}>%20</option>
                                </select>
                            </div>
                            <div className="w-full md:w-36 space-y-1">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tutar</Label>
                                <div className="h-12 flex items-center justify-end px-4 bg-slate-200/50 rounded-xl font-black text-slate-700 tabular-nums">
                                    {(item.quantity * item.unit_price).toLocaleString('tr-TR')} ₺
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={items.length === 1} className="h-12 w-12 mt-5 md:mt-6 shrink-0 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"><Trash2 className="h-5 w-5" /></Button>
                        </div>
                    ))}
                </div>
            </div>

            {/* TOPLAM VE KAYDET */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-8 pt-8 border-t border-slate-100">
                <div className="w-full md:w-1/2 space-y-2">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Belge Notu (İsteğe Bağlı)</Label>
                    <Textarea placeholder="Ödeme vadesi, banka hesap bilgileri vb..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="resize-none h-24 rounded-xl bg-slate-50 border-slate-200" />
                </div>
                
                <div className="w-full md:w-[400px] flex flex-col gap-3 bg-slate-800 text-white p-6 rounded-3xl shadow-xl shadow-slate-900/20">
                    <div className="flex justify-between items-center text-sm font-medium text-slate-300">
                        <span>Ara Toplam:</span>
                        <span>{subTotal.toLocaleString('tr-TR', {style:'currency', currency:'TRY'})}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium text-slate-300 pb-3 border-b border-slate-700">
                        <span>KDV Toplamı:</span>
                        <span>{taxTotal.toLocaleString('tr-TR', {style:'currency', currency:'TRY'})}</span>
                    </div>
                    <div className="flex justify-between items-end mt-1">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Genel Toplam</span>
                        <span className="text-3xl font-black text-emerald-400 tabular-nums tracking-tight">{grandTotal.toLocaleString('tr-TR', {style:'currency', currency:'TRY'})}</span>
                    </div>
                    <Button onClick={handleSave} disabled={loading} className="w-full h-14 mt-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-lg transition-all">
                        {loading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Save className="mr-2 h-6 w-6" />} {loading ? "Kaydediliyor..." : "BELGEYİ OLUŞTUR"}
                    </Button>
                </div>
            </div>
        </div>
    </div>
  )
}