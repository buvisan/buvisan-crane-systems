"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlusCircle, FileText, Trash2, Calculator } from "lucide-react"
import Link from "next/link"

export default function OffersPage() {
  const [offers, setOffers] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    fetchOffers()
  }, [])

  const fetchOffers = async () => {
    const { data } = await supabase
        .from('offers')
        .select('*, customers(name)')
        .order('created_at', { ascending: false })
    if (data) setOffers(data)
  }

  const deleteOffer = async (id: number) => {
    if(!confirm("Bu teklifi silmek istediğinize emin misiniz?")) return;
    await supabase.from('offers').delete().eq('id', id)
    fetchOffers()
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 font-sans max-w-[1600px] mx-auto w-full pb-10">
      
      {/* 🚀 ÜST BAŞLIK ALANI (Mobil Uyumlu) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 md:gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-5 md:p-6 rounded-[2rem] shadow-sm flex-1">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 md:p-4 rounded-2xl shadow-lg shadow-blue-500/30 shrink-0">
                <Calculator className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </div>
            <div>
                <h1 className="text-xl md:text-3xl font-black tracking-tight text-slate-900">Teklifler & Projeler</h1>
                <p className="text-slate-500 font-medium text-xs md:text-sm mt-1">Hazırlanan vinç teklifleri ve hesaplamalar.</p>
            </div>
        </div>
        
        <Link href="/dashboard/offers/new" className="w-full md:w-auto shrink-0">
            <Button className="h-14 md:h-16 px-6 md:px-8 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm md:text-base font-bold rounded-[1.5rem] md:rounded-[2rem] shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2">
                <PlusCircle className="h-5 w-5" /> Yeni Hesaplama Yap
            </Button>
        </Link>
      </div>

      {/* 🚀 AKIŞKAN TABLO ALANI */}
      <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden w-full">
        <div className="overflow-x-auto p-2 custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[700px]">
                <thead className="bg-white/40">
                    <tr>
                        <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-tl-3xl">Proje Adı</th>
                        <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Müşteri</th>
                        <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarih</th>
                        <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Durum</th>
                        <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tutar</th>
                        <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest text-right rounded-tr-3xl">İşlemler</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                    {offers.map((offer: any) => (
                        <tr key={offer.id} className="hover:bg-blue-50/40 transition-colors group">
                            <td className="px-4 md:px-6 py-4 md:py-5 text-xs md:text-sm font-black text-blue-900 truncate max-w-[200px]">{offer.project_name || 'İsimsiz Proje'}</td>
                            <td className="px-4 md:px-6 py-4 md:py-5 text-xs md:text-sm font-bold text-slate-600 truncate max-w-[150px]">{offer.customers?.name || '-'}</td>
                            <td className="px-4 md:px-6 py-4 md:py-5 text-xs md:text-sm font-medium text-slate-500">{new Date(offer.created_at).toLocaleDateString('tr-TR')}</td>
                            <td className="px-4 md:px-6 py-4 md:py-5">
                                <span className={`inline-flex items-center px-2 md:px-3 py-1 rounded-lg text-[9px] md:text-[11px] font-bold border ${
                                    offer.status === 'ONAYLANDI' ? 'bg-green-50 text-green-700 border-green-200' :
                                    offer.status === 'REDDEDILDI' ? 'bg-red-50 text-red-700 border-red-200' :
                                    'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                    {offer.status}
                                </span>
                            </td>
                            <td className="px-4 md:px-6 py-4 md:py-5 text-right text-xs md:text-sm font-black text-slate-800 tabular-nums">
                                {offer.total_price?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                            </td>
                            <td className="px-4 md:px-6 py-4 md:py-5 text-right flex items-center justify-end gap-1 md:gap-2">
                                <Button variant="outline" size="icon" className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50 bg-white/50">
                                    <FileText className="h-4 w-4 md:h-5 md:w-5" />
                                </Button>
                                <Button onClick={() => deleteOffer(offer.id)} variant="outline" size="icon" className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl text-red-500 border-red-200 hover:bg-red-50 bg-white/50">
                                    <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                                </Button>
                            </td>
                        </tr>
                    ))}
                    
                    {offers.length === 0 && (
                        <tr>
                            <td colSpan={6} className="py-16 md:py-24 text-center">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="bg-white p-4 md:p-6 rounded-full shadow-sm"><FileText className="h-8 w-8 md:h-12 md:w-12 text-slate-300" /></div>
                                    <p className="text-base md:text-xl font-bold text-slate-700">Henüz kayıtlı teklif yok.</p>
                                    <Link href="/dashboard/offers/new" className="text-blue-600 hover:text-blue-700 font-bold text-xs md:text-sm transition-colors">
                                        İlk teklifi oluşturmak için tıklayın.
                                    </Link>
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