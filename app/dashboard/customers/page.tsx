"use client"

export const dynamic = 'force-dynamic'

import { createClient } from "@/utils/supabase/client"
import { AddCustomerDialog } from "@/components/AddCustomerDialog"
import { Phone, Mail, MapPin, Building2, Trash2, Search, Briefcase, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

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
        <button onClick={handleDelete} className="p-2 md:p-2.5 bg-card border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 rounded-lg md:rounded-xl shadow-sm transition-all" title="Müşteriyi Sil">
            <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
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

  const filteredCustomers = customers.filter(c => 
      (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.contact_person || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone || "").includes(searchTerm)
  );

  const getAvatarColor = (name: string) => {
      if (!name) return "bg-muted text-muted-foreground border-border";
      const colors = [
          "bg-blue-500/10 text-blue-500 border-blue-500/20",
          "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
          "bg-violet-500/10 text-violet-500 border-violet-500/20",
          "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
          "bg-amber-500/10 text-amber-500 border-amber-500/20",
      ];
      const index = name.charCodeAt(0) % colors.length;
      return colors[index];
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 font-sans max-w-[1600px] mx-auto w-full pb-10">
      
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 md:gap-6 bg-card/60 backdrop-blur-2xl border border-border/50 p-5 md:p-6 lg:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm">
        
        <div className="flex items-center gap-4 md:gap-5 w-full xl:w-auto">
            <div className="bg-primary p-3 md:p-4 rounded-2xl shadow-lg shadow-primary/30 shrink-0">
                <Briefcase className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground" />
            </div>
            <div>
                <h1 className="text-xl md:text-3xl font-black tracking-tight text-foreground">Müşteri Portföyü</h1>
                <p className="text-muted-foreground font-medium text-xs md:text-sm mt-1">Sistemdeki tüm kayıtlı firmalar ve iletişim bilgileri.</p>
            </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 w-full xl:w-auto">
            <div className="relative w-full sm:flex-1 xl:w-72 shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                <Input 
                    placeholder="Firma, Yetkili veya Tel..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11 md:pl-12 h-12 md:h-14 bg-background/80 border-border text-foreground text-xs md:text-sm font-medium focus:ring-2 focus:ring-primary shadow-sm rounded-xl md:rounded-2xl transition-all w-full"
                />
            </div>
            <div className="w-full sm:w-auto shrink-0">
                <div className="w-full sm:w-auto">
                    <AddCustomerDialog />
                </div>
            </div>
        </div>

      </div>

      <div className="bg-card/60 backdrop-blur-2xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden w-full">
        <div className="overflow-x-auto p-2 custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[700px]">
                <thead className="bg-muted/40">
                    <tr>
                        <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest rounded-tl-3xl">Müşteri / Firma Bilgisi</th>
                        <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest">İletişim & Yetkili</th>
                        <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest">Vergi No</th>
                        <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest">Adres Lokasyonu</th>
                        <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right rounded-tr-3xl">İşlemler</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                    {filteredCustomers.map((customer: any) => {
                        const avatarClass = getAvatarColor(customer.name);
                        
                        return (
                        <tr key={customer.id} className="hover:bg-primary/5 transition-colors group">
                            
                            <td className="px-4 md:px-6 py-4 md:py-5">
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className={`h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-full border-2 flex items-center justify-center text-lg md:text-xl font-black shadow-sm ${avatarClass}`}>
                                        {customer.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm md:text-base font-black text-foreground max-w-[200px] md:max-w-[300px] truncate" title={customer.name}>
                                            {customer.name}
                                        </span>
                                    </div>
                                </div>
                            </td>

                            <td className="px-4 md:px-6 py-4 md:py-5">
                                <div className="flex flex-col gap-1.5 md:gap-2">
                                    {customer.contact_person && (
                                        <span className="font-bold text-foreground/90 text-xs md:text-sm flex items-center gap-1.5">
                                            <Users className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground" /> {customer.contact_person}
                                        </span>
                                    )}
                                    <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                                        {customer.phone && (
                                            <span className="inline-flex items-center gap-1 px-2 md:px-2.5 py-1 rounded-md text-[10px] md:text-[11px] font-bold bg-muted text-muted-foreground border border-border">
                                                <Phone className="h-3 w-3" /> {customer.phone}
                                            </span>
                                        )}
                                        {customer.email && (
                                            <span className="inline-flex items-center gap-1 px-2 md:px-2.5 py-1 rounded-md text-[10px] md:text-[11px] font-bold bg-muted text-muted-foreground border border-border">
                                                <Mail className="h-3 w-3" /> {customer.email}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </td>

                            <td className="px-4 md:px-6 py-4 md:py-5">
                                {customer.tax_no ? (
                                    <span className="inline-flex items-center px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-mono font-bold bg-muted/50 text-muted-foreground border border-border shadow-sm">
                                        {customer.tax_no}
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground/50 text-xs font-bold">-</span>
                                )}
                            </td>

                            <td className="px-4 md:px-6 py-4 md:py-5">
                                {customer.address ? (
                                    <div className="flex items-start gap-1.5 md:gap-2 text-xs md:text-sm font-medium text-muted-foreground max-w-[180px] md:max-w-[250px]">
                                        <MapPin className="h-3 w-3 md:h-4 md:w-4 shrink-0 text-rose-400 mt-0.5" />
                                        <span className="truncate" title={customer.address}>{customer.address}</span>
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground/50 text-xs font-bold">-</span>
                                )}
                            </td>

                            <td className="px-4 md:px-6 py-4 md:py-5 text-right">
                                <div className="flex items-center justify-end gap-1.5 md:gap-2 opacity-100 lg:opacity-30 lg:group-hover:opacity-100 transition-opacity">
                                    <AddCustomerDialog customerToEdit={customer} />
                                    <DeleteCustomerBtn id={customer.id} name={customer.name} />
                                </div>
                            </td>
                        </tr>
                    )})}
                    
                    {!loading && filteredCustomers.length === 0 && (
                        <tr>
                            <td colSpan={5} className="py-16 md:py-24 text-center">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="bg-card p-4 md:p-6 rounded-full shadow-sm"><Users className="h-8 w-8 md:h-12 md:w-12 text-muted-foreground/30" /></div>
                                    <p className="text-lg md:text-xl font-bold text-foreground">Müşteri bulunamadı.</p>
                                    <p className="text-xs md:text-sm font-medium text-muted-foreground">Yeni bir müşteri ekleyerek rehberinizi oluşturun.</p>
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