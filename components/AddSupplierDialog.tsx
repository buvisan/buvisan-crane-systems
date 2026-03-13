"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus, Loader2, Pencil, Truck } from "lucide-react"
import { useRouter } from "next/navigation"

export function AddSupplierDialog({ supplierToEdit }: { supplierToEdit?: any }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    name: "", contact_person: "", phone: "", email: "", address: "", tax_no: "",
  })

  useEffect(() => {
    if (supplierToEdit) {
        setFormData({
            name: supplierToEdit.name,
            contact_person: supplierToEdit.contact_person || "",
            phone: supplierToEdit.phone || "",
            email: supplierToEdit.email || "",
            address: supplierToEdit.address || "",
            tax_no: supplierToEdit.tax_no || ""
        })
    }
  }, [supplierToEdit])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    let error;
    if (supplierToEdit) {
        const { error: updateError } = await supabase.from("suppliers").update(formData).eq("id", supplierToEdit.id)
        error = updateError
    } else {
        const { error: insertError } = await supabase.from("suppliers").insert([formData])
        error = insertError
    }

    setLoading(false)

    if (error) {
      alert("Hata: " + error.message)
    } else {
      setOpen(false)
      if (!supplierToEdit) setFormData({ name: "", contact_person: "", phone: "", email: "", address: "", tax_no: "" })
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {supplierToEdit ? (
            <button className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 rounded-xl shadow-sm transition-all" title="Düzenle">
                <Pencil className="h-5 w-5" />
            </button>
        ) : (
            <Button className="h-14 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold rounded-2xl shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2">
                <UserPlus className="h-5 w-5" /> Yeni Tedarikçi
            </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] p-8 rounded-[2.5rem] border-none shadow-2xl bg-white/95 backdrop-blur-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-4">
                <div className="bg-indigo-100 p-3 rounded-2xl"><Truck className="h-6 w-6 text-indigo-600" /></div>
                <div>
                    <DialogTitle className="text-2xl font-black text-slate-800">
                        {supplierToEdit ? "Tedarikçiyi Düzenle" : "Yeni Tedarikçi Kaydı"}
                    </DialogTitle>
                    <p className="text-sm font-bold text-slate-500 mt-1">Firma ve iletişim bilgilerini girin.</p>
                </div>
            </div>
          </DialogHeader>
          
          <div className="grid gap-5 py-2">
            <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Firma Adı</Label>
                <Input name="name" value={formData.name} onChange={handleChange} required className="h-14 rounded-2xl bg-slate-50 border-slate-200 text-lg font-black text-slate-800 px-4 focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Örn: X Çelik A.Ş." />
            </div>
            
            <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Yetkili Kişi</Label>
                <Input name="contact_person" value={formData.contact_person} onChange={handleChange} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold px-4 focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Örn: Mehmet Demir" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Telefon</Label>
                    <Input name="phone" value={formData.phone} onChange={handleChange} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold px-4 focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="05XX XXX XX XX" />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vergi No</Label>
                    <Input name="tax_no" value={formData.tax_no} onChange={handleChange} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold px-4 focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="V.D / No" />
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">E-Mail</Label>
                <Input name="email" type="email" value={formData.email} onChange={handleChange} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold px-4 focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="ornek@tedarikci.com" />
            </div>

            <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Adres</Label>
                <Input name="address" value={formData.address} onChange={handleChange} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold px-4 focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Firma açık adresi..." />
            </div>
          </div>

          <DialogFooter className="mt-8">
            <Button type="submit" disabled={loading} className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-xl shadow-indigo-500/30 transition-all">
                {loading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : null}
                {loading ? "Kaydediliyor..." : "Tedarikçiyi Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}