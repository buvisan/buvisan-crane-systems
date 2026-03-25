"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from "recharts"
import { Wallet, TrendingUp, AlertCircle, CheckCircle2, FileText, Loader2, ArrowUpRight, Activity } from "lucide-react"

export default function FinanceDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, pending: 0, paid: 0 })
  const [chartData, setChartData] = useState<any[]>([])
  const [recentInvoices, setRecentInvoices] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    fetchFinanceData()
  }, [])

  const fetchFinanceData = async () => {
    setLoading(true)
    
    // 🚀 Sadece FATURA olanları finansal hesaba katıyoruz (İrsaliyeler mali değer taşımaz)
    const { data } = await supabase
        .from('finance_invoices')
        .select('*')
        .eq('document_type', 'FATURA')
        .order('issue_date', { ascending: false })

    if (data) {
        let total = 0; let pending = 0; let paid = 0;
        
        const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
        const monthlyData = months.map(m => ({ name: m, ciro: 0 }))

        data.forEach(inv => {
            // İptal edilen faturaları hesaba katmıyoruz
            if (inv.status !== 'IPTAL') {
                const amount = Number(inv.grand_total)
                total += amount
                if (inv.status === 'BEKLIYOR') pending += amount
                if (inv.status === 'ODENDI') paid += amount

                const d = new Date(inv.issue_date)
                monthlyData[d.getMonth()].ciro += amount
            }
        })

        setStats({ total, pending, paid })
        setChartData(monthlyData)
        setRecentInvoices(data.slice(0, 6)) // Son 6 faturayı al
    }
    setLoading(false)
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-blue-600" /></div>

  return (
    <div className="flex flex-col gap-8 max-w-[1600px] mx-auto w-full font-sans pb-10">
      
      {/* 🚀 ÜST BAŞLIK */}
      <div className="flex items-center gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-6 rounded-[2rem] shadow-sm">
        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-500/30">
            <Wallet className="h-8 w-8 text-white" />
        </div>
        <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Finans ve Gelir Özeti</h1>
            <p className="text-slate-500 font-medium text-sm mt-1">Kesilen faturalar, tahsilat durumları ve nakit akış analizi.</p>
        </div>
      </div>

      {/* 🚀 3'LÜ KPI KARTLARI (ÖZET) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Toplam Kesilen Fatura */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><FileText className="h-24 w-24 text-blue-500" /></div>
              <div className="relative z-10 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-blue-600 bg-blue-50 w-max px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest"><TrendingUp className="h-4 w-4"/> Toplam Fatura Hacmi</div>
                  <div className="text-4xl font-black text-slate-800 tracking-tight mt-2">{stats.total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}</div>
                  <p className="text-xs font-bold text-slate-400 mt-1">İptal edilenler hariç tüm faturalar.</p>
              </div>
          </div>

          {/* Tahsilat Bekleyen (Piyasadaki Para) */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><AlertCircle className="h-24 w-24 text-amber-500" /></div>
              <div className="relative z-10 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 w-max px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest"><AlertCircle className="h-4 w-4"/> Tahsilat Bekleyen</div>
                  <div className="text-4xl font-black text-amber-600 tracking-tight mt-2">{stats.pending.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}</div>
                  <p className="text-xs font-bold text-slate-400 mt-1">Müşterilerden beklenen ödemeler.</p>
              </div>
          </div>

          {/* Tahsil Edilen (Kasaya Giren) */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><CheckCircle2 className="h-24 w-24 text-emerald-500" /></div>
              <div className="relative z-10 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 w-max px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest"><CheckCircle2 className="h-4 w-4"/> Tahsil Edilen (Kasa)</div>
                  <div className="text-4xl font-black text-emerald-600 tracking-tight mt-2">{stats.paid.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}</div>
                  <p className="text-xs font-bold text-slate-400 mt-1">Ödemesi tamamlanan faturalar.</p>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full">
          
          {/* 🚀 GRAFİK ALANI: AYLIK CİRO TRENDİ */}
          <div className="xl:col-span-8 flex flex-col gap-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm h-[400px] flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-black text-slate-800">Aylık Fatura Hacmi (Ciro Trendi)</h3>
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase tracking-widest">2026 Yılı</span>
                  </div>
                  <div className="flex-1 w-full min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                              <defs>
                                  <linearGradient id="colorCiro" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                  </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} width={80} tickFormatter={(val) => `₺${(val/1000).toFixed(0)}k`} />
                              <Tooltip cursor={{stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)'}} formatter={(value: any) => new Intl.NumberFormat('tr-TR', {style: 'currency', currency: 'TRY'}).format(value)} />
                              <Area type="monotone" dataKey="ciro" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorCiro)" activeDot={{r: 8, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2}} name="Aylık Ciro" />
                          </AreaChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>

          {/* 🚀 SON KESİLEN FATURALAR VİDGETI */}
          <div className="xl:col-span-4 flex flex-col gap-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Activity className="h-4 w-4 text-indigo-500" /> Son Faturalar</h3>
                  </div>
                  
                  <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
                      {recentInvoices.map((inv, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-colors group">
                              <div className="flex flex-col w-[60%] truncate">
                                  <span className="text-sm font-black text-slate-800 truncate">{inv.customer_name}</span>
                                  <span className="text-[10px] text-slate-400 font-bold mt-1 flex items-center gap-1.5">
                                      <span className={`px-2 py-0.5 rounded text-[9px] ${inv.status === 'ODENDI' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'IPTAL' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{inv.status}</span>
                                      {inv.document_no}
                                  </span>
                              </div>
                              <div className="flex flex-col items-end shrink-0">
                                  <span className="text-sm font-black text-indigo-600">
                                      {inv.grand_total.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-bold">{new Date(inv.issue_date).toLocaleDateString('tr-TR')}</span>
                              </div>
                          </div>
                      ))}
                      {recentInvoices.length === 0 && <p className="text-sm text-slate-400 text-center mt-10 font-bold">Finansal hareket bulunmuyor.</p>}
                  </div>
              </div>
          </div>

      </div>
    </div>
  )
}