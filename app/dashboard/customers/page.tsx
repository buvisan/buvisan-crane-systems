"use client"

export const dynamic = 'force-dynamic'

import { createClient } from "@/utils/supabase/client"
import { AddCustomerDialog } from "@/components/AddCustomerDialog"
import { Phone, Mail, MapPin, Building2, Trash2, Search, Briefcase, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"


// Silme Butonu Bileşeni (Arayüzü güncellendi)
function DeleteCustomerBtn({ id, name }: { id: number, name: string }) {
    const router = useRouter()
    const supabase = createClient()
    const handleDelete = async () => {
        if (confirm(`⚠️ ${name} isimli müşteriyi silmek istediğinize emin misiniz?`)) {
            const { error } = await supabase.from("customers").delete().eq("id", id)
            if (error) alert("Silinemedi (Siparişi olan müşteri silinemez): " + error.message)
            else router.refresh()
        }
    }
    return (
        <button onClick={handleDelete} className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 rounded-xl shadow-sm transition-all" title="Müşteriyi Sil">
            <Trash2 className="h-5 w-5" />
        </button>
    )
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const supabase = createClient()

  useEffect(() => {
    const fetchCustomers = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('customers')
            .select('*')
            .order('id', { ascending: false })
        if (data) setCustomers(data)
        setLoading(false)
    }
    fetchCustomers()
  }, [])

  // Arama Filtresi (Canlı Arama)
  const filteredCustomers = customers.filter(c => 
      (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.contact_person || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone || "").includes(searchTerm)
  );

  // Avatar Rengi Belirleyici (İsme Göre Dinamik)
  const getAvatarColor = (name: string) => {
      if (!name) return "bg-slate-100 text-slate-600 border-slate-200";
      const colors = [
          "bg-blue-100 text-blue-700 border-blue-200",
          "bg-indigo-100 text-indigo-700 border-indigo-200",
          "bg-violet-100 text-violet-700 border-violet-200",
          "bg-emerald-100 text-emerald-700 border-emerald-200",
          "bg-amber-100 text-amber-700 border-amber-200",
      ];
      const index = name.charCodeAt(0) % colors.length;
      return colors[index];
  }

  return (
    <div className="flex flex-col gap-8 font-sans max-w-[1600px] mx-auto w-full pb-10">
      
      {/* 🚀 ÜST BAŞLIK ALANI (BENTO GRID STYLE) */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-white/60 backdrop-blur-2xl border border-white/50 p-6 md:p-8 rounded-[2.5rem] shadow-sm">
        
        <div className="flex items-center gap-5">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-4 rounded-2xl shadow-lg shadow-blue-500/30">
                <Briefcase className="h-8 w-8 text-white" />
            </div>
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Müşteri Portföyü</h1>
                <p className="text-slate-500 font-medium text-sm mt-1">Sistemdeki tüm kayıtlı firmalar ve iletişim bilgileri.</p>
            </div>
        </div>
        
        <div className="flex items-center gap-4 w-full lg:w-auto">
            {/* Akıllı Arama */}
            <div className="relative w-full lg:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input 
                    placeholder="Firma, Yetkili veya Tel Ara..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-14 bg-white/80 border-white text-sm font-medium focus:ring-2 focus:ring-blue-500 shadow-sm rounded-2xl transition-all w-full"
                />
            </div>
            {/* Yeni Müşteri Butonu Dialog İçinde Geliyor */}
            <div className="flex-shrink-0">
                <AddCustomerDialog />
            </div>
        </div>

      </div>

      {/* 🚀 AKIŞKAN TABLO LİSTESİ */}
      <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] overflow-hidden">
        <div className="overflow-x-auto p-2">
            <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-white/40">
                    <tr>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-tl-3xl">Müşteri / Firma Bilgisi</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">İletişim & Yetkili</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vergi No</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Adres Lokasyonu</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right rounded-tr-3xl">İşlemler</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                    {filteredCustomers.map((customer: any) => {
                        const avatarClass = getAvatarColor(customer.name);
                        
                        return (
                        <tr key={customer.id} className="hover:bg-blue-50/40 transition-colors group">
                            
                            {/* 1. SÜTUN: FİRMA VE AVATAR */}
                            <td className="px-6 py-5">
                                <div className="flex items-center gap-4">
                                    <div className={`h-12 w-12 shrink-0 rounded-full border-2 flex items-center justify-center text-xl font-black shadow-sm ${avatarClass}`}>
                                        {customer.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-base font-black text-slate-800 max-w-[300px] truncate" title={customer.name}>
                                            {customer.name}
                                        </span>
                                    </div>
                                </div>
                            </td>

                            {/* 2. SÜTUN: İLETİŞİM VE YETKİLİ */}
                            <td className="px-6 py-5">
                                <div className="flex flex-col gap-2">
                                    {customer.contact_person && (
                                        <span className="font-bold text-slate-700 text-sm flex items-center gap-1.5">
                                            <Users className="h-3.5 w-3.5 text-slate-400" /> {customer.contact_person}
                                        </span>
                                    )}
                                    <div className="flex items-center gap-2">
                                        {customer.phone && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                <Phone className="h-3 w-3" /> {customer.phone}
                                            </span>
                                        )}
                                        {customer.email && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                <Mail className="h-3 w-3" /> {customer.email}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </td>

                            {/* 3. SÜTUN: VERGİ NO */}
                            <td className="px-6 py-5">
                                {customer.tax_no ? (
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-slate-50 text-slate-600 border border-slate-200 shadow-sm">
                                        {customer.tax_no}
                                    </span>
                                ) : (
                                    <span className="text-slate-300 text-xs font-bold">-</span>
                                )}
                            </td>

                            {/* 4. SÜTUN: ADRES */}
                            <td className="px-6 py-5">
                                {customer.address ? (
                                    <div className="flex items-start gap-2 text-sm font-medium text-slate-500 max-w-[250px]">
                                        <MapPin className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                                        <span className="truncate" title={customer.address}>{customer.address}</span>
                                    </div>
                                ) : (
                                    <span className="text-slate-300 text-xs font-bold">-</span>
                                )}
                            </td>

                            {/* 5. SÜTUN: AKSİYONLAR */}
                            <td className="px-6 py-5 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                                    <AddCustomerDialog customerToEdit={customer} />
                                    <DeleteCustomerBtn id={customer.id} name={customer.name} />
                                </div>
                            </td>
                        </tr>
                    )})}
                    
                    {!loading && filteredCustomers.length === 0 && (
                        <tr>
                            <td colSpan={5} className="py-24 text-center">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="bg-white p-6 rounded-full shadow-sm"><Users className="h-12 w-12 text-slate-300" /></div>
                                    <p className="text-xl font-bold text-slate-700">Müşteri bulunamadı.</p>
                                    <p className="text-sm font-medium text-slate-400">Yeni bir müşteri ekleyerek rehberinizi oluşturun.</p>
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