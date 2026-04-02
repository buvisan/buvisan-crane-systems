"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { AlertCircle, ShoppingCart, Loader2, CheckCircle2, Factory, ArrowRight, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ActionUserBadge } from "@/components/ActionUserBadge"

export default function MissingMaterialsPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    setLoading(true)
    const { data, error } = await supabase
        .from('missing_materials')
        .select(`
            *,
            projects ( project_code, customers ( name ) ),
            profiles ( first_name, last_name, department ) 
        `)
        .order('status', { ascending: true }) 
        .order('created_at', { ascending: false })
    
    if (data) setItems(data)
    setLoading(false)
  }

  const formatTalepNumber = (id: number) => `TLP-${String(id).padStart(4, '0')}`;

  const markAsOrdered = async (item: any) => {
    if(!confirm(`⚠️ ${item.product_name} (${item.quantity} Adet) için satın alma siparişi oluşturulsun mu?`)) return;
    
    setActionLoading(item.id)

    try {
        const { data: { user } } = await supabase.auth.getUser()
        const userId = user ? user.id : null

        const pCode = item.projects?.project_code || "Proje Yok"
        const pCust = item.projects?.customers?.name || "-"
        const desc = `Üretim Talebi: ${item.product_name} (${item.quantity} Adet) | Proje: ${pCode} (${pCust}) | Talep No: ${formatTalepNumber(item.id)}`

        const { error: orderError } = await supabase.from('purchase_orders').insert([{
            order_date: new Date().toISOString(),
            status: 'BEKLIYOR',
            total_amount: 0,
            description: desc,
            created_by: userId
        }])

        if (orderError) throw new Error("Sipariş veritabanına eklenemedi: " + orderError.message)

        const { error: updateError } = await supabase
            .from('missing_materials')
            .update({ status: 'SIPARIS_VERILDI' })
            .eq('id', item.id)

        if (updateError) throw new Error("Talep durumu güncellenemedi.")
        
        fetchItems()

    } catch (error: any) {
        alert("❌ Hata: " + error.message)
    } finally {
        setActionLoading(null)
    }
  }

  const filteredItems = items.filter(item => 
      (item.product_name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
      (item.projects?.customers?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.projects?.project_code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      formatTalepNumber(item.id).toLowerCase().includes(searchTerm.toLowerCase()) 
  );

  return (
    <div className="flex flex-col gap-6 md:gap-8 font-sans max-w-[1600px] mx-auto w-full pb-10">
      
      {/* 🚀 ÜST BAŞLIK ALANI (Mobil Uyumlu) */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 md:gap-6 bg-white/60 backdrop-blur-2xl border border-white/50 p-5 md:p-6 lg:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm">
        <div className="flex items-center gap-4 md:gap-5 w-full xl:w-auto">
            <div className="bg-gradient-to-br from-red-500 to-rose-600 p-3 md:p-4 rounded-2xl shadow-lg shadow-red-500/30 shrink-0">
                <AlertCircle className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </div>
            <div>
                <h1 className="text-xl md:text-3xl font-black tracking-tight text-slate-900">Eksik Malzeme Radarı</h1>
                <p className="text-slate-500 font-medium text-xs md:text-sm mt-1">Saha ve üretim hattından gelen anlık acil parça talepleri.</p>
            </div>
        </div>
        <div className="relative w-full xl:w-80 shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-slate-400" />
            <Input 
                placeholder="Malzeme, Proje, TLP No..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 md:pl-12 h-12 md:h-14 bg-white/80 border-white text-xs md:text-sm font-medium focus:ring-2 focus:ring-red-500 shadow-sm rounded-xl md:rounded-2xl transition-all w-full"
            />
        </div>
      </div>

      {/* 🚀 KARTLAR (Bento Grid) ALANI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        
        {filteredItems.map((item) => {
            const isUrgent = item.status === 'TALEP_ACILDI';
            
            return (
            <div 
                key={item.id} 
                className={`relative flex flex-col justify-between bg-white/70 backdrop-blur-xl border-2 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl overflow-hidden group
                ${isUrgent ? 'border-red-200/50 shadow-red-500/5 hover:shadow-red-500/10' : 'border-emerald-100 shadow-sm opacity-80 hover:opacity-100'}`}
            >
                {isUrgent && <div className="absolute top-0 right-0 -mr-10 -mt-10 w-24 h-24 md:w-32 md:h-32 bg-red-400/20 rounded-full blur-3xl pointer-events-none group-hover:bg-red-400/30 transition-all"></div>}
                
                <div className="flex flex-col gap-3 md:gap-0 md:flex-row md:items-start justify-between mb-5 md:mb-6 relative z-10">
                    <div className="flex flex-col gap-1.5 md:gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md w-max ${isUrgent ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                                {isUrgent ? '⚠️ ACİL TALEP' : '✅ SİPARİŞİ VERİLDİ'}
                            </span>
                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-slate-100 text-slate-500">
                                {formatTalepNumber(item.id)}
                            </span>
                        </div>
                        <div className="flex flex-wrap md:flex-nowrap items-center gap-1.5 md:gap-2 mt-1">
                            <span className="font-mono font-bold text-slate-500 text-[9px] md:text-[10px] bg-slate-200/50 px-2 py-0.5 rounded border border-slate-200">
                                PRJ: {item.projects?.project_code || "KOD-YOK"}
                            </span>
                            <span className="font-bold text-slate-700 text-xs md:text-sm truncate max-w-[150px]">{item.projects?.customers?.name || "Bağımsız Talep"}</span>
                        </div>
                    </div>
                    {isUrgent && <div className="hidden md:block h-3 w-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse shrink-0 mt-1"></div>}
                </div>

                <div className="flex flex-col gap-1 mb-6 md:mb-8 relative z-10">
                    <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">İstenen Malzeme</span>
                    <div className="flex items-end gap-2 md:gap-3">
                        <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-tight truncate">
                            {item.product_name}
                        </h3>
                        <span className="text-lg md:text-xl font-black text-blue-600 bg-blue-50 px-2 md:px-3 py-1 rounded-xl mb-0.5 md:mb-1 border border-blue-100 shrink-0">
                            x{item.quantity}
                        </span>
                    </div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 relative z-10 flex flex-col gap-4">
                    
                    <div className="scale-[0.85] md:scale-95 origin-left -ml-2 md:ml-0">
                        <ActionUserBadge 
                            profile={item.profiles} 
                            actionText="Sahadan Talep Eden" 
                            date={item.created_at} 
                        />
                    </div>

                    {isUrgent ? (
                        <Button 
                            onClick={() => markAsOrdered(item)} 
                            disabled={actionLoading === item.id}
                            className="w-full h-12 md:h-14 rounded-xl md:rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-lg shadow-slate-900/20 transition-all flex items-center justify-between px-4 md:px-6 group/btn mt-2 text-xs md:text-sm"
                        >
                            <span className="flex items-center gap-1.5 md:gap-2">
                                {actionLoading === item.id ? <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" /> : <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 text-red-400" />}
                                {actionLoading === item.id ? "İşleniyor..." : "Satın Almaya Aktar"}
                            </span>
                            <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-slate-500 group-hover/btn:text-white group-hover/btn:translate-x-1 transition-all" />
                        </Button>
                    ) : (
                        <div className="w-full h-12 md:h-14 mt-2 rounded-xl md:rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-bold gap-2 text-xs md:text-sm">
                            <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5" />
                            <span>Satın Alma Ekibinde</span>
                        </div>
                    )}
                </div>
            </div>
        )})}
        
        {filteredItems.length === 0 && !loading && (
            <div className="col-span-full flex flex-col items-center justify-center p-12 md:p-20 bg-white/50 backdrop-blur-md rounded-[2rem] md:rounded-[3rem] border-2 border-dashed border-slate-200">
                <div className="bg-emerald-100 p-4 md:p-6 rounded-full mb-4 md:mb-6"><Factory className="h-10 w-10 md:h-16 md:w-16 text-emerald-600" /></div>
                <h2 className="text-xl md:text-3xl font-black text-slate-800 text-center">Üretim Hattı Güvende</h2>
                <p className="text-sm md:text-lg font-medium text-slate-500 mt-2 text-center max-w-md">Sahadan gelen herhangi bir eksik malzeme talebi bulunmuyor.</p>
            </div>
        )}
      </div>
    </div>
  )
}