"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Package, AlertTriangle, Clock, Activity, AlertOctagon, Boxes } from "lucide-react"
import { DashboardNotes } from "@/components/DashboardNotes"

export default function DashboardPage() {
  const [data, setData] = useState<any>({
    products: [],
    pendingPurchases: [],
    stats: { criticalCount: 0, productCount: 0, pendingCount: 0 }
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: products } = await supabase.from('products').select('*')
      
      const { data: pending } = await supabase
          .from('purchase_orders')
          .select('*, suppliers(name)')
          .eq('status', 'BEKLIYOR') 
          .order('order_date', { ascending: false })

      const criticalCount = products?.filter((p: any) => p.current_stock <= (p.critical_stock_level || 5)).length || 0

      setData({
          products: products || [],
          pendingPurchases: pending || [],
          stats: { 
              criticalCount, 
              productCount: products?.length || 0,
              pendingCount: pending?.length || 0
          }
      })
      setLoading(false)
    }
    fetchData()
  }, [])

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full font-sans">
      
      {/* 🚀 ÜST BAŞLIK (Mobil Uyumlu) */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-2 md:gap-3">
          <Activity className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
          Sistem Metrikleri
        </h1>
        <p className="text-slate-500 font-medium text-xs md:text-sm lg:text-base">Buvisan Crane Systems genel durum özeti.</p>
      </div>

      {/* 🚀 3'LÜ KART ALANI (Mobilde Alt Alta, Tablette/PC'de Yan Yana) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        
        {/* ÜRÜN ÇEŞİDİ KARTI */}
        <div className="relative overflow-hidden bg-white/60 backdrop-blur-2xl border border-white/50 shadow-sm rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 group transition-all hover:shadow-lg hover:shadow-emerald-500/10">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 md:w-32 md:h-32 rounded-full bg-emerald-400/20 blur-3xl group-hover:bg-emerald-400/30 transition-all duration-500"></div>
          <div className="relative z-10 flex flex-col gap-3 md:gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-widest">Kayıtlı Ürün Çeşidi</span>
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl md:rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                <Boxes className="h-4 w-4 md:h-5 md:w-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
                <div className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tight tabular-nums">
                {loading ? "..." : data.stats.productCount}
                </div>
                <span className="font-semibold text-slate-500 text-sm">Kalem</span>
            </div>
          </div>
        </div>

        {/* BEKLEYEN SİPARİŞLER KARTI */}
        <div className="relative overflow-hidden bg-white/60 backdrop-blur-2xl border border-white/50 shadow-sm rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 group transition-all hover:shadow-lg hover:shadow-blue-500/10">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 md:w-32 md:h-32 rounded-full bg-blue-400/20 blur-3xl group-hover:bg-blue-400/30 transition-all duration-500"></div>
          <div className="relative z-10 flex flex-col gap-3 md:gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-widest">Açık Siparişler</span>
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl md:rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                <Clock className="h-4 w-4 md:h-5 md:w-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
                <div className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tight tabular-nums">
                {loading ? "..." : data.stats.pendingCount}
                </div>
                <span className="font-semibold text-slate-500 text-sm">Sipariş</span>
            </div>
          </div>
        </div>

        {/* KRİTİK STOK KARTI */}
        <div className={`relative overflow-hidden backdrop-blur-2xl border shadow-sm rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 group transition-all duration-500 sm:col-span-2 md:col-span-1 ${data.stats.criticalCount > 0 ? 'bg-red-50/80 border-red-100 shadow-red-500/10 hover:shadow-red-500/20' : 'bg-white/60 border-white/50 hover:shadow-lg'}`}>
          <div className={`absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 md:w-32 md:h-32 rounded-full blur-3xl transition-all duration-500 ${data.stats.criticalCount > 0 ? 'bg-red-500/20 group-hover:bg-red-500/30 animate-pulse' : 'bg-slate-300/20'}`}></div>
          <div className="relative z-10 flex flex-col gap-3 md:gap-4">
            <div className="flex items-center justify-between">
              <span className={`text-xs md:text-sm font-bold uppercase tracking-widest ${data.stats.criticalCount > 0 ? 'text-red-700' : 'text-slate-500'}`}>Kritik Stok</span>
              <div className={`h-8 w-8 md:h-10 md:w-10 rounded-xl md:rounded-2xl border flex items-center justify-center shadow-sm shrink-0 ${data.stats.criticalCount > 0 ? 'bg-red-100 border-red-200 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                <AlertOctagon className="h-4 w-4 md:h-5 md:w-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl lg:text-4xl font-black tracking-tight tabular-nums ${data.stats.criticalCount > 0 ? 'text-red-700' : 'text-slate-800'}`}>
                {loading ? "..." : data.stats.criticalCount}
              </span>
              <span className={`font-semibold text-sm ${data.stats.criticalCount > 0 ? 'text-red-500' : 'text-slate-500'}`}>Ürün</span>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        <div className="xl:col-span-8 flex flex-col gap-6">
            
            {/* 🚀 BEKLEYEN SATIN ALMALAR TABLOSU (Sağa kaydırılabilir) */}
            <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-sm rounded-[1.5rem] md:rounded-[2rem] overflow-hidden flex flex-col w-full">
                <div className="p-4 md:p-6 border-b border-white/40 bg-white/30 flex items-center gap-3">
                    <div className="p-1.5 md:p-2 bg-amber-100 text-amber-600 rounded-lg md:rounded-xl"><Clock className="h-4 w-4 md:h-5 md:w-5" /></div>
                    <h2 className="text-base md:text-lg font-bold text-slate-800">Bekleyen Satın Almalar</h2>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                            <tr>
                                <th className="px-4 py-3 md:py-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Tedarikçi Firma</th>
                                <th className="px-4 py-3 md:py-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarih</th>
                                <th className="px-4 py-3 md:py-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Durum</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50">
                            {data.pendingPurchases.map((order: any) => (
                                <tr key={order.id} className="hover:bg-white/50 transition-colors group">
                                    <td className="px-4 py-3 md:py-4 text-xs md:text-sm font-bold text-slate-700">{order.suppliers?.name || "Bilinmiyor"}</td>
                                    <td className="px-4 py-3 md:py-4 text-xs md:text-sm font-medium text-slate-500">{new Date(order.order_date).toLocaleDateString('tr-TR')}</td>
                                    <td className="px-4 py-3 md:py-4">
                                        <span className="inline-flex items-center gap-1.5 px-2 md:px-2.5 py-1 rounded-lg text-[10px] md:text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                            Onay Bekliyor
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {data.pendingPurchases.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-6 md:py-8 text-center text-xs md:text-sm font-medium text-slate-400">Bekleyen sipariş bulunmuyor.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 🚀 AZALAN VE KRİTİK STOKLAR TABLOSU (Sağa kaydırılabilir) */}
            <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-sm rounded-[1.5rem] md:rounded-[2rem] overflow-hidden flex flex-col w-full">
                <div className="p-4 md:p-6 border-b border-white/40 bg-white/30 flex items-center gap-3">
                    <div className="p-1.5 md:p-2 bg-red-100 text-red-600 rounded-lg md:rounded-xl"><AlertTriangle className="h-4 w-4 md:h-5 md:w-5" /></div>
                    <h2 className="text-base md:text-lg font-bold text-slate-800">Azalan & Kritik Stoklar</h2>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                            <tr>
                                <th className="px-4 py-3 md:py-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Ürün Adı</th>
                                <th className="px-4 py-3 md:py-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Mevcut</th>
                                <th className="px-4 py-3 md:py-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Kritik Sınır</th>
                                <th className="px-4 py-3 md:py-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Durum</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50">
                            {data.products.filter((p:any) => p.current_stock <= (p.critical_stock_level || 5)).slice(0, 5).map((p: any) => (
                                <tr key={p.id} className="hover:bg-red-50/30 transition-colors">
                                    <td className="px-4 py-3 md:py-4 text-xs md:text-sm font-bold text-slate-800 truncate max-w-[150px] md:max-w-none">{p.name}</td>
                                    <td className="px-4 py-3 md:py-4 text-xs md:text-sm font-black text-red-600 tabular-nums">{p.current_stock}</td>
                                    <td className="px-4 py-3 md:py-4 text-xs md:text-sm font-semibold text-slate-400 tabular-nums">{p.critical_stock_level || 5}</td>
                                    <td className="px-4 py-3 md:py-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[9px] md:text-[10px] font-bold bg-red-100 text-red-700">
                                            ACİL SİPARİŞ
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {data.products.filter((p:any) => p.current_stock <= (p.critical_stock_level || 5)).length === 0 && !loading && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-6 md:py-8 text-center text-xs md:text-sm font-medium text-slate-400">Tüm stoklar güvenli seviyede.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* NOTLAR ALANI */}
        <div className="xl:col-span-4 h-full min-h-[400px] md:min-h-[500px]">
            <div className="h-full bg-white/60 backdrop-blur-2xl border border-white/50 shadow-sm rounded-[1.5rem] md:rounded-[2rem] overflow-hidden w-full">
                <DashboardNotes />
            </div>
        </div>

      </div>
    </div>
  )
}