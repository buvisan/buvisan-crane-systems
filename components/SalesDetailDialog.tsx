"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { FileText, Loader2, Printer, Receipt, CheckCircle2, } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function SalesDetailDialog({ sale }: { sale: any }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (open) {
        const fetchItems = async () => {
            setLoading(true)
            const { data } = await supabase
                .from('sales_order_items')
                .select('*, products(name, sku)')
                .eq('order_id', sale.id)
            setItems(data || [])
            setLoading(false)
        }
        fetchItems()
    }
  }, [open, sale.id])

  const formatSaleNumber = (id: number) => `SLS${String(id).padStart(5, '0')}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 rounded-xl shadow-sm transition-all" title="Satış Detayını Gör">
          <FileText className="h-5 w-5" />
        </button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[650px] p-8 rounded-[2.5rem] border-none shadow-2xl bg-white/95 backdrop-blur-xl">
        <DialogHeader className="mb-6 border-b border-slate-100 pb-6">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                  <div className="bg-emerald-100 p-3 rounded-2xl"><Receipt className="h-6 w-6 text-emerald-600" /></div>
                  <div>
                      <DialogTitle className="text-2xl font-black text-slate-800">Satış Detayı</DialogTitle>
                      <p className="text-sm font-bold text-slate-500 mt-1">{sale.customers?.name}</p>
                  </div>
              </div>
              <div className="text-right">
                  <span className="block text-emerald-600 font-mono font-black bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 shadow-inner">
                      {formatSaleNumber(sale.id)}
                  </span>
                  <span className="block text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest flex items-center gap-1 justify-end">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {sale.status}
                  </span>
              </div>
          </div>
        </DialogHeader>
        
        <div className="py-2">
            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin h-10 w-10 text-emerald-500" /></div>
            ) : (
                <div className="bg-slate-50 rounded-[1.5rem] border border-slate-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100/50 border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ürün / Kod</th>
                                <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Adet</th>
                                <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">B.Fiyat</th>
                                <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Tutar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-white/50 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-sm text-slate-800">{item.products?.name}</div>
                                        <div className="text-xs text-slate-400 font-mono mt-0.5">{item.products?.sku}</div>
                                    </td>
                                    <td className="px-5 py-4 text-right font-black text-slate-700">{item.quantity}</td>
                                    <td className="px-5 py-4 text-right font-semibold text-slate-500">{item.unit_price?.toLocaleString('tr-TR')} ₺</td>
                                    <td className="px-5 py-4 text-right font-black text-slate-900">
                                        {(item.quantity * item.unit_price)?.toLocaleString('tr-TR')} ₺
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            <div className="flex items-end justify-between mt-8 pt-6 border-t border-slate-100">
                <Link href={`/print/sales/${sale.id}`} target="_blank">
                    <Button className="h-14 px-6 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-all font-bold shadow-sm">
                        <Printer className="mr-2 h-5 w-5" /> İrsaliye Yazdır
                    </Button>
                </Link>

                <div className="text-right">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Genel Toplam</span>
                    <div className="text-3xl font-black text-emerald-600 tracking-tight">
                        {sale.total_amount?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </div>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}