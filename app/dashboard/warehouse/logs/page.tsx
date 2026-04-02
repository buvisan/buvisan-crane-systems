"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Input } from "@/components/ui/input"
import { History, Search, Loader2, ArrowUpRight, ArrowDownRight, Fingerprint } from "lucide-react"

export default function WarehouseLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [profiles, setProfiles] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  
  const supabase = createClient()

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    
    const { data: movementsData } = await supabase.from('warehouse_movements').select(`*, warehouse_products(name, product_code)`).order('created_at', { ascending: false })
    
    const { data: profilesData } = await supabase.from('profiles').select('id, first_name, last_name, department')
    
    const profileMap: Record<string, any> = {}
    if (profilesData) {
        profilesData.forEach(p => { profileMap[p.id] = p })
    }
    
    if (movementsData) setLogs(movementsData)
    setProfiles(profileMap)
    setLoading(false)
  }

  const filteredLogs = logs.filter(log => 
      log.warehouse_products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      log.warehouse_products?.product_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.note?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 md:gap-8 max-w-[1600px] mx-auto w-full font-sans pb-10">
      
      {/* 🚀 ÜST BAŞLIK ALANI (Mobil Uyumlu) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4 md:gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm flex-1">
            <div className="bg-gradient-to-br from-slate-700 to-slate-900 p-3 md:p-4 rounded-xl md:rounded-2xl shadow-lg shadow-slate-500/30 shrink-0">
                <History className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </div>
            <div>
                <h1 className="text-xl md:text-3xl font-black tracking-tight text-slate-900">Stok Hareket Analizi</h1>
                <p className="text-slate-500 font-medium text-xs md:text-sm mt-1">Depoda yapılan tüm giriş/çıkış operasyonlarının tarihçesi.</p>
            </div>
        </div>
        
        <div className="relative w-full lg:w-80 shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-slate-400" />
            <Input placeholder="Ürün, Barkod veya Not Ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-11 md:pl-12 h-12 md:h-14 bg-white/80 border-white/50 text-sm font-bold text-slate-700 shadow-sm rounded-xl md:rounded-[2rem] focus:ring-2 focus:ring-slate-500 w-full" />
        </div>
      </div>

      {/* 🚀 AKIŞKAN TABLO ALANI */}
      <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden w-full">
          <div className="overflow-x-auto custom-scrollbar p-2">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                  <thead className="bg-slate-900 text-white">
                      <tr>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest rounded-tl-xl md:rounded-tl-2xl">Tarih / Saat</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest">İşlem Gören Ürün</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest">İşlem Tipi</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-center">Miktar</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest">İşlem Notu / Detay</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-right rounded-tr-xl md:rounded-tr-2xl">İşlemi Yapan Personel</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white/40">
                      {filteredLogs.map((log) => {
                          const isGiris = log.movement_type === 'GİRİŞ';
                          const userProfile = profiles[log.performed_by];
                          const d = new Date(log.created_at);
                          
                          return (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-4 md:px-6 py-3 md:py-4">
                                  <div className="flex flex-col">
                                      <span className="text-xs md:text-sm font-bold text-slate-700">{d.toLocaleDateString('tr-TR')}</span>
                                      <span className="text-[9px] md:text-[10px] font-black text-slate-400">{d.toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                                  </div>
                              </td>
                              <td className="px-4 md:px-6 py-3 md:py-4">
                                  <div className="flex flex-col">
                                      <span className="text-xs md:text-sm font-black text-slate-800 truncate max-w-[200px]">{log.warehouse_products?.name || "Bilinmeyen Ürün"}</span>
                                      <span className="font-mono text-[9px] md:text-[10px] text-slate-400 font-bold">{log.warehouse_products?.product_code}</span>
                                  </div>
                              </td>
                              <td className="px-4 md:px-6 py-3 md:py-4">
                                  <span className={`inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 rounded-md md:rounded-lg text-[9px] md:text-[10px] font-black tracking-widest uppercase ${isGiris ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                      {isGiris ? <ArrowDownRight className="h-3 w-3 md:h-3.5 md:w-3.5" /> : <ArrowUpRight className="h-3 w-3 md:h-3.5 md:w-3.5" />} {log.movement_type}
                                  </span>
                              </td>
                              <td className="px-4 md:px-6 py-3 md:py-4 text-center">
                                  <span className={`text-base md:text-lg font-black tracking-tight ${isGiris ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {isGiris ? '+' : '-'}{log.quantity}
                                  </span>
                              </td>
                              <td className="px-4 md:px-6 py-3 md:py-4">
                                  <p className="text-[10px] md:text-xs font-bold text-slate-500 max-w-[150px] md:max-w-xs truncate" title={log.note}>{log.note || "-"}</p>
                              </td>
                              <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                                  {userProfile ? (
                                      <div className="inline-flex items-center gap-2 md:gap-3 bg-white border border-slate-100 px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl shadow-sm">
                                          <div className="flex flex-col text-right">
                                              <span className="text-[10px] md:text-xs font-black text-slate-800">{userProfile.first_name} {userProfile.last_name}</span>
                                              <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">{userProfile.department}</span>
                                          </div>
                                          <div className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px] md:text-xs shrink-0">
                                              {userProfile.first_name?.charAt(0) || "U"}
                                          </div>
                                      </div>
                                  ) : (
                                      <span className="text-[10px] md:text-xs font-bold text-slate-400 flex items-center justify-end gap-1"><Fingerprint className="h-3 w-3 md:h-4 md:w-4"/> Sistem / Saha</span>
                                  )}
                              </td>
                          </tr>
                      )})}
                      {filteredLogs.length === 0 && !loading && (
                          <tr><td colSpan={6} className="py-16 md:py-20 text-center"><div className="flex flex-col items-center gap-3"><div className="bg-white p-4 md:p-5 rounded-full shadow-sm"><History className="h-8 w-8 md:h-10 md:w-10 text-slate-300" /></div><p className="text-sm md:text-lg font-bold text-slate-500">Henüz hiçbir stok hareketi kaydedilmemiş.</p></div></td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  )
}