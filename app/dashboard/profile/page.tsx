"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserCircle, Mail, Briefcase, Save, Loader2, ShieldCheck } from "lucide-react"

export default function ProfilePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    department: ""
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        setUserEmail(user.email || "")
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) {
            setFormData({
                first_name: data.first_name || "",
                last_name: data.last_name || "",
                department: data.department || ""
            })
        }
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
        const { error } = await supabase.from('profiles').upsert({
            id: user.id,
            ...formData,
            updated_at: new Date().toISOString()
        })

        if (!error) {
            alert("✅ Profil başarıyla güncellendi! Değişikliklerin her yere yansıması için sayfayı yenileyebilirsiniz.")
        } else {
            alert("Hata oluştu: " + error.message)
        }
    }
    setSaving(false)
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-blue-600" /></div>

  return (
    <div className="flex flex-col gap-8 max-w-[800px] mx-auto w-full font-sans pb-10">
      
      <div className="flex items-center gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-8 rounded-[2.5rem] shadow-sm">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-5 rounded-3xl shadow-lg shadow-blue-500/30">
            <UserCircle className="h-10 w-10 text-white" />
        </div>
        <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Profilim</h1>
            <p className="text-slate-500 font-medium text-sm mt-1">Kişisel bilgilerinizi ve sistemdeki imzanızı düzenleyin.</p>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col gap-6">
            
            {/* Sadece Okunabilir (E-posta) Alanı */}
            <div className="flex items-center gap-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                <div className="bg-white p-3 rounded-xl shadow-sm"><Mail className="h-6 w-6 text-slate-400" /></div>
                <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Sistem Giriş E-Postası (Değiştirilemez)</span>
                    <span className="text-lg font-black text-slate-700">{userEmail}</span>
                </div>
                <div className="ml-auto bg-emerald-100 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4" /> Doğrulanmış Hesap
                </div>
            </div>

            {/* Form Alanı */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Adınız</Label>
                    <Input 
                        value={formData.first_name} 
                        onChange={(e) => setFormData({...formData, first_name: e.target.value})} 
                        className="h-14 rounded-2xl bg-white border-slate-200 text-lg font-black text-slate-800 px-5 focus:ring-2 focus:ring-blue-500 shadow-sm" 
                    />
                </div>
                <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Soyadınız</Label>
                    <Input 
                        value={formData.last_name} 
                        onChange={(e) => setFormData({...formData, last_name: e.target.value})} 
                        className="h-14 rounded-2xl bg-white border-slate-200 text-lg font-black text-slate-800 px-5 focus:ring-2 focus:ring-blue-500 shadow-sm" 
                    />
                </div>
                <div className="space-y-3 md:col-span-2">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Briefcase className="h-4 w-4" /> Departman / Ünvan
                    </Label>
                    <Input 
                        value={formData.department} 
                        onChange={(e) => setFormData({...formData, department: e.target.value})} 
                        placeholder="Örn: Teknoloji Yöneticisi, Satın Alma, Üretim"
                        className="h-14 rounded-2xl bg-white border-slate-200 font-bold text-slate-700 px-5 focus:ring-2 focus:ring-blue-500 shadow-sm" 
                    />
                    <p className="text-xs text-slate-400 font-medium ml-1 mt-2">Bu ünvan, yaptığınız tüm sistem işlemlerinin altında (Log kayıtlarında) görünecektir.</p>
                </div>
            </div>

            {/* Kaydet Butonu */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="h-14 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2">
                    {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    {saving ? "Kaydediliyor..." : "DEĞİŞİKLİKLERİ KAYDET"}
                </Button>
            </div>
        </div>
      </div>
    </div>
  )
}