"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileText, PlusCircle, Search, Trash2, Printer, Loader2, Receipt, FileSignature } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function InvoicesPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("ALL") 
  
  const supabase = createClient()

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    setLoading(true)
    const { data } = await supabase.from('finance_invoices').select('*').order('created_at', { ascending: false })
    if (data) setDocuments(data)
    setLoading(false)
  }

  const handleDelete = async (id: number) => {
    if(!confirm("Bu belgeyi kalıcı olarak silmek istediğinize emin misiniz?")) return;
    await supabase.from('finance_invoices').delete().eq('id', id)
    fetchDocuments()
  }

  const filteredDocs = documents.filter(doc => {
      const matchesSearch = doc.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) || doc.document_no.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = filterType === "ALL" || doc.document_type === filterType
      return matchesSearch && matchesType
  })

  return (
    <div className="flex flex-col gap-6 md:gap-8 max-w-[1600px] mx-auto w-full font-sans pb-10">
      
      {/* 🚀 ÜST BAŞLIK ALANI */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 md:gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm flex-1">
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-3 md:p-4 rounded-2xl shadow-lg shadow-blue-500/30 shrink-0">
                <FileText className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </div>
            <div>
                <h1 className="text-xl md:text-3xl font-black tracking-tight text-slate-900">Faturalar ve İrsaliyeler</h1>
                <p className="text-slate-500 font-medium text-xs md:text-sm mt-1">Resmi belge oluşturma, listeleme ve yazdırma merkezi.</p>
            </div>
        </div>
        
        <Link href="/dashboard/finance/invoices/new" className="shrink-0 w-full md:w-auto">
            <Button className="h-14 md:h-16 px-6 md:px-8 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm md:text-base font-bold rounded-xl md:rounded-[2rem] shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2">
                <PlusCircle className="h-4 w-4 md:h-5 md:w-5" /> Yeni Belge Oluştur
            </Button>
        </Link>
      </div>

      {/* 🚀 FİLTRE VE ARAMA ÇUBUĞU (Mobilde yana kaydırılabilir haplar) */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white/80 p-3 md:p-4 rounded-[1.5rem] md:rounded-[2rem] border border-white shadow-sm">
          <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto custom-scrollbar pb-2 lg:pb-0">
              <Button onClick={() => setFilterType("ALL")} variant={filterType === "ALL" ? "default" : "ghost"} className={`rounded-xl px-4 md:px-6 h-10 md:h-12 text-xs md:text-sm font-bold shrink-0 ${filterType === "ALL" ? "bg-slate-800 text-white" : "text-slate-500"}`}>Tümü</Button>
              <Button onClick={() => setFilterType("FATURA")} variant={filterType === "FATURA" ? "default" : "ghost"} className={`rounded-xl px-4 md:px-6 h-10 md:h-12 text-xs md:text-sm font-bold shrink-0 ${filterType === "FATURA" ? "bg-indigo-100 text-indigo-700" : "text-slate-500"}`}><Receipt className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" /> Faturalar</Button>
              <Button onClick={() => setFilterType("IRSALIYE")} variant={filterType === "IRSALIYE" ? "default" : "ghost"} className={`rounded-xl px-4 md:px-6 h-10 md:h-12 text-xs md:text-sm font-bold shrink-0 ${filterType === "IRSALIYE" ? "bg-orange-100 text-orange-700" : "text-slate-500"}`}><FileSignature className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" /> İrsaliyeler</Button>
          </div>
          <div className="relative w-full lg:w-80 shrink-0">
              <Search className="absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-slate-400" />
              <Input placeholder="Firma veya Belge No Ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 md:pl-11 h-12 bg-white border-slate-200 text-xs md:text-sm font-bold text-slate-700 shadow-sm rounded-xl focus:ring-2 focus:ring-blue-500 w-full" />
          </div>
      </div>

      {/* 🚀 AKIŞKAN TABLO ALANI */}
      <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                  <thead className="bg-slate-900 text-white">
                      <tr>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest rounded-tl-2xl">Tarih</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest">Belge Tipi</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest">Belge No</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest">Firma Bilgisi</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest">Durum</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest bg-slate-800 text-right">Genel Toplam</th>
                          <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-right rounded-tr-2xl">İşlemler</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredDocs.map((doc) => (
                          <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors bg-white group">
                              <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold text-slate-500">{new Date(doc.issue_date).toLocaleDateString('tr-TR')}</td>
                              <td className="px-4 md:px-6 py-3 md:py-4">
                                  <span className={`inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 rounded-md md:rounded-lg text-[9px] md:text-[11px] font-black tracking-widest uppercase ${doc.document_type === 'FATURA' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                                      {doc.document_type === 'FATURA' ? <Receipt className="h-3 w-3 md:h-3.5 md:w-3.5" /> : <FileSignature className="h-3 w-3 md:h-3.5 md:w-3.5" />} {doc.document_type}
                                  </span>
                              </td>
                              <td className="px-4 md:px-6 py-3 md:py-4 font-mono font-black text-xs md:text-sm text-slate-700">{doc.document_no}</td>
                              <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-black text-slate-800 truncate max-w-[150px] md:max-w-[250px]">{doc.customer_name}</td>
                              <td className="px-4 md:px-6 py-3 md:py-4">
                                  <span className={`px-2 md:px-3 py-1 rounded-md md:rounded-lg text-[10px] md:text-xs font-bold ${doc.status === 'ODENDI' ? 'bg-emerald-100 text-emerald-700' : doc.status === 'IPTAL' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{doc.status}</span>
                              </td>
                              <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-black text-slate-900 bg-slate-50 text-right tabular-nums">
                                  {doc.grand_total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                              </td>
                              <td className="px-4 md:px-6 py-3 md:py-4 text-right flex items-center justify-end gap-1.5 md:gap-2 opacity-100 lg:opacity-40 lg:group-hover:opacity-100 transition-opacity">
                                  <Button variant="outline" size="sm" className="h-8 md:h-9 px-2.5 md:px-3 rounded-lg text-blue-600 border-blue-200 hover:bg-blue-50 font-bold text-[10px] md:text-xs" onClick={() => router.push(`/dashboard/finance/invoices/${doc.id}/print`)}>
                                      <Printer className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Yazdır
                                  </Button>
                                  <button onClick={() => handleDelete(doc.id)} className="p-1.5 md:p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4 md:h-5 md:w-5" /></button>
                              </td>
                          </tr>
                      ))}
                      {filteredDocs.length === 0 && !loading && (
                          <tr><td colSpan={7} className="py-16 md:py-20 text-center"><div className="flex flex-col items-center gap-3"><div className="bg-slate-50 p-4 md:p-5 rounded-full shadow-sm"><FileText className="h-8 w-8 md:h-10 md:w-10 text-slate-300" /></div><p className="text-base md:text-lg font-bold text-slate-500">Belge bulunamadı.</p></div></td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  )
}