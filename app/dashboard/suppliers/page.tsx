"use client"

export const dynamic = 'force-dynamic'

import { createClient } from "@/utils/supabase/client"
import { AddSupplierDialog } from "@/components/AddSupplierDialog"
import { Phone, Mail, MapPin, Trash2, Search, Truck, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

// Silme Butonu Bileşeni (Arayüzü Güncellendi)
function DeleteSupplierBtn({ id, name }: { id: number, name: string }) {
    const router = useRouter()
    const supabase = createClient()
    const handleDelete = async () => {
        if (confirm(`⚠️ ${name} isimli tedarikçiyi silmek istediğinize emin misiniz?`)) {
            const { error } = await supabase.from("suppliers").delete().eq("id", id)
            if (error) alert("Silinemedi (Geçmiş satın alması olan firma silinemez): " + error.message)
            else router.refresh()
        }
    }
    return (
        <button onClick={handleDelete} className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 rounded-xl shadow-sm transition-all" title="Tedarikçiyi Sil">
            <Trash2 className="h-5 w-5" />
        </button>
    )
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const supabase = createClient()

  useEffect(() => {
    const fetchSuppliers = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('suppliers')
            .select('*')
            .order('id', { ascending: false })
        if (data) setSuppliers(data)
        setLoading(false)
    }
    fetchSuppliers()
  }, [])

  // Canlı Arama Filtresi
  const filteredSuppliers = suppliers.filter(s => 
      (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.contact_person || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone || "").includes(searchTerm)
  );

  // İsme Göre Dinamik Avatar Rengi
  const getAvatarColor = (name: string) => {
      if (!name) return "bg-slate-100 text-slate-600 border-slate-200";
      const colors = [
          "bg-indigo-100 text-indigo-700 border-indigo-200",
          "bg-blue-100 text-blue-700 border-blue-200",
          "bg-violet-100 text-violet-700 border-violet-200",
          "bg-purple-100 text-purple-700 border-purple-200",
          "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
      ];
      const index = name.charCodeAt(0) % colors.length;
      return colors[index];
  }

  return (
    <div className="flex flex-col gap-8 font-sans max-w-[1600px] mx-auto w-full pb-10">
      
      {/* 🚀 ÜST BAŞLIK ALANI (BENTO GRID STYLE) */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-white/60 backdrop-blur-2xl border border-white/50 p-6 md:p-8 rounded-[2.5rem] shadow-sm">
        
        <div className="flex items-center gap-5">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-2xl shadow-lg shadow-indigo-500/30">
                <Truck className="h-8 w-8 text-white" />
            </div>
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Tedarikçi Ağı</h1>
                <p className="text-slate-500 font-medium text-sm mt-1">Malzeme ve hizmet satın aldığımız tüm firmalar.</p>
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
                    className="pl-12 h-14 bg-white/80 border-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 shadow-sm rounded-2xl transition-all w-full"
                />
            </div>
            {/* Yeni Tedarikçi Butonu */}
            <div className="flex-shrink-0">
                <AddSupplierDialog />
            </div>
        </div>

      </div>

      {/* 🚀 AKIŞKAN TABLO LİSTESİ */}
      <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] overflow-hidden">
        <div className="overflow-x-auto p-2">
            <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-white/40">
                    <tr>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-tl-3xl">Tedarikçi Firma</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">İletişim & Yetkili</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vergi No</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Adres Lokasyonu</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right rounded-tr-3xl">İşlemler</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                    {filteredSuppliers.map((supplier: any) => {
                        const avatarClass = getAvatarColor(supplier.name);
                        
                        return (
                        <tr key={supplier.id} className="hover:bg-indigo-50/30 transition-colors group">
                            
                            {/* 1. SÜTUN: FİRMA VE AVATAR */}
                            <td className="px-6 py-5">
                                <div className="flex items-center gap-4">
                                    <div className={`h-12 w-12 shrink-0 rounded-full border-2 flex items-center justify-center text-xl font-black shadow-sm ${avatarClass}`}>
                                        {supplier.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-base font-black text-slate-800 max-w-[300px] truncate" title={supplier.name}>
                                            {supplier.name}
                                        </span>
                                    </div>
                                </div>
                            </td>

                            {/* 2. SÜTUN: İLETİŞİM VE YETKİLİ */}
                            <td className="px-6 py-5">
                                <div className="flex flex-col gap-2">
                                    {supplier.contact_person && (
                                        <span className="font-bold text-slate-700 text-sm flex items-center gap-1.5">
                                            <Users className="h-3.5 w-3.5 text-slate-400" /> {supplier.contact_person}
                                        </span>
                                    )}
                                    <div className="flex items-center gap-2">
                                        {supplier.phone && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                <Phone className="h-3 w-3" /> {supplier.phone}
                                            </span>
                                        )}
                                        {supplier.email && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                <Mail className="h-3 w-3" /> {supplier.email}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </td>

                            {/* 3. SÜTUN: VERGİ NO */}
                            <td className="px-6 py-5">
                                {supplier.tax_no ? (
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-slate-50 text-slate-600 border border-slate-200 shadow-sm">
                                        {supplier.tax_no}
                                    </span>
                                ) : (
                                    <span className="text-slate-300 text-xs font-bold">-</span>
                                )}
                            </td>

                            {/* 4. SÜTUN: ADRES */}
                            <td className="px-6 py-5">
                                {supplier.address ? (
                                    <div className="flex items-start gap-2 text-sm font-medium text-slate-500 max-w-[250px]">
                                        <MapPin className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
                                        <span className="truncate" title={supplier.address}>{supplier.address}</span>
                                    </div>
                                ) : (
                                    <span className="text-slate-300 text-xs font-bold">-</span>
                                )}
                            </td>

                            {/* 5. SÜTUN: AKSİYONLAR */}
                            <td className="px-6 py-5 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                                    <AddSupplierDialog supplierToEdit={supplier} />
                                    <DeleteSupplierBtn id={supplier.id} name={supplier.name} />
                                </div>
                            </td>
                        </tr>
                    )})}
                    
                    {!loading && filteredSuppliers.length === 0 && (
                        <tr>
                            <td colSpan={5} className="py-24 text-center">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="bg-white p-6 rounded-full shadow-sm"><Truck className="h-12 w-12 text-slate-300" /></div>
                                    <p className="text-xl font-bold text-slate-700">Tedarikçi bulunamadı.</p>
                                    <p className="text-sm font-medium text-slate-400">Tedarik zincirinizi oluşturmak için yeni firma ekleyin.</p>
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