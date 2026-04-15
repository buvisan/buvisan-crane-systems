"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea" // 🚀 İŞTE EKSİK OLAN KOD BURASIYDI!
import { Plus, Trash2, Save, ShoppingCart, Loader2, AlertCircle, Flame, Building2, Info } from "lucide-react"

export function PurchaseOrderForm() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([]) 
  const [selectedSupplier, setSelectedSupplier] = useState("")
  
  const [items, setItems] = useState([
      { request_id: "", product_name: "", quantity: 1, unit_price: 0, description: "" }
  ])
  
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
      fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
      setFetching(true)
      try {
          const { data: supData } = await supabase.from('suppliers').select('id, name').order('name')
          if (supData) setSuppliers(supData)

          const { data: reqData } = await supabase
              .from('material_requests')
              .select('*, profiles(first_name, last_name)')
              .eq('status', 'BEKLIYOR') 
              .order('priority', { ascending: true }) 
              .order('created_at', { ascending: false })
          
          if (reqData) setRequests(reqData)
      } catch (error) {
          console.error(error)
      } finally {
          setFetching(false)
      }
  }

  const handleAddItem = () => {
      setItems([...items, { request_id: "", product_name: "", quantity: 1, unit_price: 0, description: "" }])
  }

  const handleRemoveItem = (index: number) => {
      const newItems = [...items]
      newItems.splice(index, 1)
      setItems(newItems.length > 0 ? newItems : [{ request_id: "", product_name: "", quantity: 1, unit_price: 0, description: "" }])
  }

  const handleItemChange = (index: number, field: string, value: any) => {
      const newItems = [...items]
      newItems[index] = { ...newItems[index], [field]: value }
      setItems(newItems)
  }

  const handleRequestSelect = (index: number, reqId: string) => {
      const req = requests.find(r => r.id.toString() === reqId)
      const newItems = [...items]
      
      if (req) {
          newItems[index].request_id = req.id.toString()
          newItems[index].product_name = `${req.material_name} (${req.material_code || 'Kodsuz'})`
          newItems[index].quantity = req.quantity
          newItems[index].description = req.description || "" 
      } else {
          newItems[index].request_id = ""
          newItems[index].product_name = ""
          newItems[index].description = ""
      }
      setItems(newItems)
  }

  const totalAmount = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unit_price)), 0)

  const handleSubmit = async () => {
      if (!selectedSupplier) return alert("Lütfen tedarikçi firma seçin!")
      if (items.some(i => !i.product_name.trim())) return alert("Lütfen ürün adlarını boş bırakmayın!")

      setLoading(true)
      try {
          const { data: po, error: poError } = await supabase.from('purchase_orders').insert([{
              supplier_id: Number(selectedSupplier),
              total_amount: totalAmount,
              description: description,
              status: 'BEKLIYOR'
          }]).select().single()

          if (poError) throw poError

          const requestIds = items.map(i => i.request_id).filter(id => id !== "")
          
          if (requestIds.length > 0) {
              await supabase.from('material_requests')
                  .update({ 
                      status: 'SIPARIS_VERILDI', 
                      purchase_order_id: po.id 
                  })
                  .in('id', requestIds)
          }

          alert("✅ Satın Alma Fişi başarıyla oluşturuldu! Bağlı talepleri olan kullanıcılara anında bildirim gitti.")
          router.push('/dashboard/purchases')

      } catch (error: any) {
          alert("Kayıt sırasında hata oluştu: " + error.message)
      } finally {
          setLoading(false)
      }
  }

  if (fetching) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-blue-500" /></div>

  return (
      <div className="flex flex-col gap-6 md:gap-8">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-sm gap-6">
              <div className="flex-1 w-full max-w-md space-y-2">
                  <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> Tedarikçi Firma
                  </span>
                  <select 
                      className="w-full h-12 md:h-14 bg-slate-50 border border-slate-200 rounded-xl px-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedSupplier}
                      onChange={(e: any) => setSelectedSupplier(e.target.value)}
                  >
                      <option value="">Seçiniz...</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
              </div>
              <div className="flex flex-col items-start md:items-end bg-blue-50/50 md:bg-transparent p-4 md:p-0 rounded-2xl md:rounded-none">
                  <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Genel Toplam</span>
                  <span className="text-3xl md:text-4xl font-black text-blue-600 tracking-tight">
                      {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totalAmount)}
                  </span>
              </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="font-black text-slate-800 text-sm md:text-base flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 text-slate-400" /> Sipariş Kalemleri
                  </h3>
                  <Button onClick={handleAddItem} variant="outline" size="sm" className="h-9 text-xs font-bold rounded-lg border-blue-200 text-blue-600 hover:bg-blue-50">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Satır Ekle
                  </Button>
              </div>

              <div className="p-2 md:p-4 flex flex-col gap-2">
                  <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <div className="col-span-5">Bekleyen Talep / Ürün Adı</div>
                      <div className="col-span-2 text-center">Miktar</div>
                      <div className="col-span-2 text-center">Birim Fiyat (₺)</div>
                      <div className="col-span-2 text-right">Tutar</div>
                      <div className="col-span-1 text-center">Sil</div>
                  </div>

                  {items.map((item, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 p-3 md:p-4 bg-white md:bg-transparent rounded-xl md:rounded-none border md:border-b md:border-x-0 md:border-t-0 border-slate-100 items-center transition-all hover:bg-slate-50">
                          
                          <div className="col-span-1 md:col-span-5 flex flex-col gap-2">
                              <span className="md:hidden text-[10px] font-black text-slate-400 uppercase">Talep Seç veya Ürün Yaz</span>
                              
                              <select 
                                  className="w-full h-10 md:h-11 bg-indigo-50/50 border border-indigo-100 rounded-lg px-3 font-bold text-xs text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                  value={item.request_id}
                                  onChange={(e: any) => handleRequestSelect(index, e.target.value)}
                              >
                                  <option value="">-- Yeni / Manuel Ürün Girişi --</option>
                                  <optgroup label="Bekleyen Sipariş İstekleri">
                                      {requests.map(req => (
                                          <option key={req.id} value={req.id} className={req.priority === 'ACIL' ? 'text-rose-600 font-bold' : ''}>
                                              {req.priority === 'ACIL' ? '🔥 [ACİL] ' : ''} 
                                              {req.material_name} - ({req.quantity} Adet) | İsteyen: {req.profiles?.first_name}
                                          </option>
                                      ))}
                                  </optgroup>
                              </select>

                              <Input 
                                  placeholder="Ürün Adı ve Özelliği" 
                                  value={item.product_name}
                                  onChange={(e: any) => handleItemChange(index, "product_name", e.target.value)}
                                  className={`h-10 md:h-11 font-bold text-sm rounded-lg ${item.request_id ? 'bg-slate-100 border-transparent text-slate-600' : 'bg-white border-slate-200'}`}
                                  readOnly={item.request_id !== ""} 
                              />
                          </div>

                          <div className="col-span-1 md:col-span-2 flex flex-col gap-1">
                              <span className="md:hidden text-[10px] font-black text-slate-400 uppercase">Miktar</span>
                              <Input 
                                  type="number" min="1" 
                                  value={item.quantity}
                                  onChange={(e: any) => handleItemChange(index, "quantity", e.target.value)}
                                  className="h-10 md:h-11 text-center font-black text-blue-600 rounded-lg border-slate-200"
                              />
                          </div>

                          <div className="col-span-1 md:col-span-2 flex flex-col gap-1">
                              <span className="md:hidden text-[10px] font-black text-slate-400 uppercase">Birim Fiyat</span>
                              <Input 
                                  type="number" min="0" step="0.01"
                                  value={item.unit_price}
                                  onChange={(e: any) => handleItemChange(index, "unit_price", e.target.value)}
                                  className="h-10 md:h-11 text-center font-bold text-slate-700 rounded-lg border-slate-200"
                              />
                          </div>

                          <div className="col-span-1 md:col-span-2 flex flex-col items-start md:items-end justify-center">
                              <span className="md:hidden text-[10px] font-black text-slate-400 uppercase mb-1">Tutar</span>
                              <span className="font-black text-sm md:text-base text-slate-800">
                                  {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(item.quantity) * Number(item.unit_price))}
                              </span>
                          </div>

                          <div className="col-span-1 md:col-span-1 flex justify-end md:justify-center pt-2 md:pt-0 border-t border-slate-100 md:border-none mt-2 md:mt-0">
                              <button onClick={() => handleRemoveItem(index)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Satırı Sil">
                                  <Trash2 className="h-5 w-5" />
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          <div className="space-y-2">
              <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 ml-2">
                  <Info className="h-3 w-3" /> Fiş Açıklaması / Not (İsteğe Bağlı)
              </span>
              <Textarea 
                  placeholder="Tedarikçiye iletilecek notlar veya sipariş açıklaması..." 
                  value={description}
                  onChange={(e: any) => setDescription(e.target.value)}
                  className="min-h-[80px] bg-white border border-slate-200 rounded-2xl p-4 text-sm font-medium resize-none shadow-sm"
              />
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 pt-6 border-t border-slate-200">
              <Button variant="ghost" onClick={() => router.back()} className="h-12 px-6 rounded-xl font-bold text-slate-500 hover:bg-slate-100">İptal Et</Button>
              <Button onClick={handleSubmit} disabled={loading} className="h-12 px-8 rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 transition-transform active:scale-95 text-sm md:text-base">
                  {loading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Save className="h-5 w-5 mr-2" />} 
                  {loading ? "KAYDEDİLİYOR..." : "SİPARİŞ FİŞİNİ TAMAMLA"}
              </Button>
          </div>

      </div>
  )
}