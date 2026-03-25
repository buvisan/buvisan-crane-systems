"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts"
import { Banknote, Package, Trophy, Loader2, BarChart3, Activity, Lock } from "lucide-react"

const COLORS_GREEN = ['#3d4d34', '#4b5e40', '#6b855a', '#8b9e7d', '#c2cfb6']
const COLORS_ORANGE = ['#c75c10', '#d38b5d', '#e6a87c', '#f0c7a5', '#f8dfcb']

export default function TrackingDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false) // 🚀 YETKİ KONTROL STATE'İ
  const [dashboardData, setDashboardData] = useState({
      toplamCiro: 0, toplamAdet: 0, topProducts: [] as any[], personnelSales: [] as any[], brandData: [] as any[], monthlyTrend: [] as any[], recentSales: [] as any[]
  })

  const supabase = createClient()

  useEffect(() => { fetchDashboardData() }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    
    // 🚀 YETKİ KONTROLÜNÜ ÇEKİYORUZ
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        const { data: profile } = await supabase.from('profiles').select('department').eq('id', user.id).single()
        const dept = (profile?.department || "").toLowerCase()
        // Admin, Kurucu veya Teknoloji Yöneticisi ise ciroyu görebilir
        setIsAdmin(dept.includes("admin") || dept.includes("teknoloji") || dept.includes("yönetim") || dept.includes("kurucu"))
    }

    const { data: sales } = await supabase.from('tracking_sales').select(`*, tracking_products(brand, model), tracking_personnel(full_name)`).order('created_at', { ascending: false })

    if (sales) {
        const ciro = sales.reduce((acc, s) => acc + Number(s.total_amount), 0)
        const adet = sales.reduce((acc, s) => acc + Number(s.quantity), 0)

        const persMap: Record<string, { name: string, ciro: number, adet: number }> = {}
        sales.forEach(s => {
            const pName = s.tracking_personnel?.full_name || "Bilinmeyen"
            if (!persMap[pName]) persMap[pName] = { name: pName, ciro: 0, adet: 0 }
            persMap[pName].ciro += Number(s.total_amount)
            persMap[pName].adet += Number(s.quantity)
        })
        const personnelData = Object.values(persMap).sort((a, b) => b.ciro - a.ciro)

        const brandMap: Record<string, { name: string, value: number }> = {}
        sales.forEach(s => {
            const bName = s.tracking_products?.brand || "Bilinmeyen"
            if (!brandMap[bName]) brandMap[bName] = { name: bName, value: 0 }
            brandMap[bName].value += Number(s.quantity)
        })
        const brandData = Object.values(brandMap).sort((a,b) => b.value - a.value)

        const prodMap: Record<string, { model: string, adet: number }> = {}
        sales.forEach(s => {
            const mName = s.tracking_products?.brand || "Bilinmeyen" 
            if (!prodMap[mName]) prodMap[mName] = { model: mName, adet: 0 }
            prodMap[mName].adet += Number(s.quantity)
        })
        const top5 = Object.values(prodMap).sort((a,b) => b.adet - a.adet).slice(0, 5)

        const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
        const monthlyData = months.map(m => ({ name: m, adet: 0 }))
        sales.forEach(s => {
            const d = new Date(s.sale_date)
            monthlyData[d.getMonth()].adet += Number(s.quantity)
        })

        setDashboardData({
            toplamCiro: ciro, toplamAdet: adet, topProducts: top5, personnelSales: personnelData, brandData: brandData, monthlyTrend: monthlyData,
            recentSales: sales.slice(0, 5) 
        })
    }
    setLoading(false)
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-[#4b5e40]" /></div>

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full font-sans pb-10">
      
      <div className="flex items-center gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-6 rounded-[2rem] shadow-sm">
        <div className="bg-gradient-to-br from-[#4b5e40] to-[#6b855a] p-4 rounded-2xl shadow-lg shadow-[#4b5e40]/30"><BarChart3 className="h-8 w-8 text-white" /></div>
        <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Satış Takip Paneli</h1>
            <p className="text-slate-500 font-medium text-sm mt-1">Personel, marka ve model bazlı gerçek zamanlı satış analizleri.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full">
          
          <div className="xl:col-span-3 flex flex-col gap-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity"><Banknote className="h-20 w-20 text-[#4b5e40]" /></div>
                  <div className="relative z-10 flex flex-col items-start">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                          Toplam Ciro {!isAdmin && <Lock className="h-3.5 w-3.5 text-slate-400" />}
                      </h3>
                      {/* 🚀 SİHİRLİ BLUR ALANI */}
                      <div className={`text-4xl font-black text-[#3d4d34] tracking-tight transition-all duration-300 ${!isAdmin ? 'blur-md select-none opacity-60' : ''}`}>
                          {isAdmin ? dashboardData.toplamCiro.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }) : "₺ 9.999.999"}
                      </div>
                      {!isAdmin && <span className="text-[10px] font-bold text-rose-500 mt-2 bg-rose-50 px-2 py-1 rounded-md">Gizli Veri (Sadece Yönetim)</span>}
                  </div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity"><Package className="h-20 w-20 text-[#c75c10]" /></div>
                  <div className="relative z-10">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Toplam Satılan Ürün</h3>
                      <div className="text-5xl font-black text-[#c75c10] tracking-tight">{dashboardData.toplamAdet}</div>
                  </div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex-1">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-6"><Trophy className="h-5 w-5 text-amber-500" /> En Çok Satan 5 Marka</h3>
                  <div className="flex flex-col gap-4">
                      {dashboardData.topProducts.map((p, idx) => (
                          <div key={idx} className="flex items-center gap-4">
                              <span className="text-sm font-bold text-slate-700 w-24 truncate" title={p.model}>{p.model}</span>
                              <div className="flex-1 h-6 bg-slate-100 rounded-r-md overflow-hidden flex items-center">
                                  <div className="h-full bg-[#4b5e40] flex items-center justify-end pr-2 text-xs font-bold text-white transition-all duration-1000" style={{ width: `${(p.adet / Math.max(dashboardData.topProducts[0]?.adet || 1, 1)) * 100}%` }}>{p.adet}</div>
                              </div>
                          </div>
                      ))}
                      {dashboardData.topProducts.length === 0 && <p className="text-sm text-slate-400 font-medium">Satış verisi yok.</p>}
                  </div>
              </div>
          </div>

          <div className="xl:col-span-6 flex flex-col gap-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm h-[320px] flex flex-col">
                  <h3 className="text-lg font-black text-slate-800 mb-6">Personel Satış Adeti | Satış Tutarı</h3>
                  <div className="flex-1 w-full min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dashboardData.personnelSales} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                              <XAxis type="number" hide />
                              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 700}} width={100} />
                              <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)'}} formatter={(value: any) => new Intl.NumberFormat('tr-TR').format(value)} />
                              <Bar dataKey="ciro" fill="#4b5e40" radius={[0, 4, 4, 0]} barSize={20} name="Satış Tutarı (TL)" />
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm h-[280px] flex flex-col">
                  <h3 className="text-lg font-black text-slate-800 mb-6">Aylık Satış Trendi - Adet</h3>
                  <div className="flex-1 w-full min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={dashboardData.monthlyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} dx={-10} />
                              <Tooltip cursor={{stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)'}} />
                              <Line type="monotone" dataKey="adet" stroke="#c75c10" strokeWidth={4} dot={{r: 6, fill: '#c75c10', stroke: '#fff', strokeWidth: 2}} activeDot={{r: 8}} name="Satış Adeti" />
                          </LineChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>

          <div className="xl:col-span-3 flex flex-col gap-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex-1 flex flex-col">
                  <h3 className="text-lg font-black text-slate-800 mb-2">Marka Dağılımı</h3>
                  <div className="flex-1 w-full min-h-[160px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie data={dashboardData.brandData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                  {dashboardData.brandData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_GREEN[index % COLORS_GREEN.length]} />)}
                              </Pie>
                              <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)'}} />
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                      {dashboardData.brandData.slice(0,4).map((b, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full shrink-0" style={{backgroundColor: COLORS_GREEN[idx % COLORS_GREEN.length]}}></div>
                              <span className="text-xs font-bold text-slate-600 truncate">{b.name}</span>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex-1 flex flex-col">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Activity className="h-4 w-4 text-blue-500" /> Son Satış Hareketleri</h3>
                  <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
                      {dashboardData.recentSales.map((sale, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors">
                              <div className="flex flex-col w-[60%] truncate">
                                  <span className="text-xs font-bold text-slate-800 truncate">{sale.tracking_products?.brand} - {sale.customer_name}</span>
                                  <span className="text-[10px] text-slate-400 font-medium">{new Date(sale.sale_date).toLocaleDateString('tr-TR')} • {sale.tracking_personnel?.full_name}</span>
                              </div>
                              <div className="text-xs font-black text-emerald-600 shrink-0">
                                  +{sale.total_amount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                              </div>
                          </div>
                      ))}
                      {dashboardData.recentSales.length === 0 && <p className="text-xs text-slate-400">Son hareket bulunmuyor.</p>}
                  </div>
              </div>
          </div>
      </div>
    </div>
  )
}