import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { PlusCircle, FileText, CheckCircle2, Users, FolderCheck } from "lucide-react"
import { SalesDetailDialog } from "@/components/SalesDetailDialog"

async function getSales() {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('sales_orders')
        .select(`*, customers ( name )`)
        .order('sale_date', { ascending: false })
    
    if (error) console.log('Hata:', error)
    return data || []
}

export default async function SalesPage() {
  const sales = await getSales()

  // Sadece operasyonel hesaplamalar
  const totalSalesCount = sales.length
  const uniqueCustomers = new Set(sales.map((s: any) => s.customer_id)).size

  const formatSaleNumber = (id: number) => `SLS${String(id).padStart(5, '0')}`;

  return (
    <div className="flex flex-col gap-8 font-sans max-w-[1600px] mx-auto w-full pb-10">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-5">
            <div className="bg-gradient-to-br from-emerald-400 to-teal-600 p-4 rounded-2xl shadow-lg shadow-emerald-500/30">
                <FolderCheck className="h-8 w-8 text-white" />
            </div>
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Satış İşlemleri</h1>
                <p className="text-slate-500 font-medium text-sm mt-1">Tamamlanan satışlar, irsaliyeler ve müşteri yönetimi.</p>
            </div>
        </div>
        
        <Link href="/dashboard/sales/new" className="flex-shrink-0">
            <Button className="h-14 px-6 bg-emerald-500 hover:bg-emerald-600 text-white text-base font-bold rounded-2xl shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2">
                <PlusCircle className="h-5 w-5" />
                Yeni Satış Yap
            </Button>
        </Link>
      </div>

      {/* 🚀 OPERASYONEL ÖZET KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-sm rounded-[2rem] p-6 flex items-center justify-between relative overflow-hidden group hover:shadow-lg hover:shadow-teal-500/10 transition-all">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-teal-400/20 blur-3xl group-hover:bg-teal-400/30 transition-all"></div>
              <div className="relative z-10 flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">İşlem Sayısı</span>
                  <div className="text-4xl font-black text-slate-800 tabular-nums tracking-tight">
                      {totalSalesCount} <span className="text-xl font-bold text-slate-500">Satış</span>
                  </div>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shadow-sm relative z-10">
                  <FileText className="h-7 w-7" />
              </div>
          </div>

          <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-sm rounded-[2rem] p-6 flex items-center justify-between relative overflow-hidden group hover:shadow-lg hover:shadow-emerald-500/10 transition-all">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-emerald-400/20 blur-3xl group-hover:bg-emerald-400/30 transition-all"></div>
              <div className="relative z-10 flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aktif Müşteri Portföyü</span>
                  <div className="text-4xl font-black text-slate-800 tabular-nums tracking-tight">
                      {uniqueCustomers} <span className="text-xl font-bold text-slate-500">Firma</span>
                  </div>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm relative z-10">
                  <Users className="h-7 w-7" />
              </div>
          </div>
      </div>

      <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] overflow-hidden">
        <div className="overflow-x-auto p-2">
            <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-white/40">
                    <tr>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-tl-3xl">Satış Fişi</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Müşteri Bilgisi</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarih</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Durum</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right rounded-tr-3xl">Detay</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                    {sales.map((sale: any) => (
                        <tr key={sale.id} className="hover:bg-emerald-50/40 transition-colors group">
                            <td className="px-6 py-5">
                                <span className="inline-flex items-center px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-mono font-bold text-sm border border-emerald-100">
                                    {formatSaleNumber(sale.id)}
                                </span>
                            </td>
                            <td className="px-6 py-5">
                                <span className="text-sm font-black text-slate-800 max-w-[250px] truncate block">
                                    {sale.customers?.name || "Bilinmeyen Müşteri"}
                                </span>
                            </td>
                            <td className="px-6 py-5">
                                <span className="text-sm font-bold text-slate-500">
                                    {new Date(sale.sale_date).toLocaleDateString('tr-TR')}
                                </span>
                            </td>
                            <td className="px-6 py-5">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-sm bg-emerald-500 text-white shadow-emerald-500/30">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    {sale.status}
                                </span>
                            </td>
                            <td className="px-6 py-5 text-right">
                                <div className="flex justify-end opacity-40 group-hover:opacity-100 transition-opacity">
                                    <SalesDetailDialog sale={sale} />
                                </div>
                            </td>
                        </tr>
                    ))}
                    
                    {sales.length === 0 && (
                        <tr>
                            <td colSpan={5} className="py-20 text-center">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="bg-white p-5 rounded-full shadow-sm"><FolderCheck className="h-10 w-10 text-slate-300" /></div>
                                    <p className="text-lg font-bold text-slate-600">Henüz satış yapılmamış.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  )
}