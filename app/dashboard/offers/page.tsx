"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Calculator, Plus, Loader2, Search, 
  FileText, Trash2, Edit, FileCheck, FileSignature
} from "lucide-react"

export default function OffersDashboardPage() {
  const supabase = createClient()
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchOffers()
  }, [])

  const fetchOffers = async () => {
    setLoading(true)
    // Supabase tablosu hazır olduğunda verileri çekecek
    const { data, error } = await supabase
      .from('sc_offers')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setOffers(data)
    setLoading(false)
  }

  const formatCurrency = (val: number, currency: string = "EUR") => {
    return new Intl.NumberFormat('tr-TR', { 
        style: 'currency', 
        currency: currency 
    }).format(val || 0)
  }

  const filteredOffers = offers.filter(o => 
    o.offer_no?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 md:gap-8 font-sans max-w-[1600px] mx-auto w-full pb-10 transition-colors duration-300">
      
      {/* ÜST BAŞLIK & KONTROL PANELİ */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 md:gap-6 bg-card/60 backdrop-blur-2xl border border-border/50 p-5 md:p-6 lg:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm">
        <div className="flex items-center gap-4 md:gap-5 w-full xl:w-auto">
            <div className="bg-blue-600 p-3 md:p-4 rounded-2xl shadow-lg shadow-blue-600/30 shrink-0">
                <Calculator className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </div>
            <div>
                <h1 className="text-xl md:text-3xl font-black tracking-tight text-foreground">Teklifler & Projeler</h1>
                <p className="text-muted-foreground font-medium text-xs md:text-sm mt-1">Hazırlanan vinç teklifleri ve statik hesaplamalar.</p>
            </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Müşteri veya Teklif No..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="pl-11 h-12 bg-background/80 border-border text-foreground rounded-xl" 
                />
            </div>
            {/* 🚀 DEV HESAPLAMA MOTORUNU AÇACAK BUTON */}
            <Button className="w-full sm:w-auto h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all">
                <Plus className="mr-2 h-5 w-5" /> Yeni Hesaplama Yap
            </Button>
        </div>
      </div>

      {/* LİSTELEME ALANI */}
      <div className="bg-card/60 backdrop-blur-2xl border border-border/50 shadow-sm rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden w-full min-h-[500px] flex flex-col">
        <div className="overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="bg-muted/40">
                    <tr>
                        <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Proje Adı / Teklif No</th>
                        <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Müşteri</th>
                        <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tarih</th>
                        <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Durum</th>
                        <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tutar</th>
                        <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">İşlemler</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                    {loading ? (
                        <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-blue-600" /></td></tr>
                    ) : filteredOffers.length > 0 ? (
                        filteredOffers.map((offer) => (
                            <tr key={offer.id} className="hover:bg-muted/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-black text-sm text-foreground">{offer.offer_no}</span>
                                        <span className="text-[10px] font-bold text-muted-foreground">{offer.capacity_ton} TON - {offer.span_m}mm Açıklık</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-bold text-xs text-foreground/80">{offer.customer_name}</td>
                                <td className="px-6 py-4 text-xs font-medium text-muted-foreground">{new Date(offer.created_at).toLocaleDateString('tr-TR')}</td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800 uppercase tracking-widest">
                                        {offer.status || 'BEKLIYOR'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-black text-blue-600 dark:text-blue-400">{formatCurrency(offer.total_price_eur, "EUR")}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="PDF Oluştur">
                                            <FileSignature className="h-4 w-4" />
                                        </button>
                                        <button className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors" title="Düzenle">
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Sil">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={6} className="py-24 text-center">
                                <div className="flex flex-col items-center justify-center">
                                    <div className="bg-muted p-5 rounded-full mb-4 shadow-inner">
                                        <FileText className="h-10 w-10 text-muted-foreground/50" />
                                    </div>
                                    <h3 className="text-lg font-black text-foreground">Henüz kayıtlı teklif yok.</h3>
                                    <p className="text-sm font-medium text-blue-600 mt-1 cursor-pointer hover:underline">İlk teklifi oluşturmak için tıklayın.</p>
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