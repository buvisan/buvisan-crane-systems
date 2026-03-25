"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserCircle, Mail, Briefcase, Save, Loader2, ShieldCheck, Lock } from "lucide-react"

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
        // 🚀 ÇÖZÜM BURADA: 'upsert' yerine 'update' kullandık.
        // Veritabanına "SADECE isim ve soyismi güncelle, diğer sütunlara dokunma" emrini verdik!
        const { error } = await supabase.from('profiles').update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            updated_at: new Date().toISOString()
        }).eq('id', user.id)

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
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-4 flex-1">
                    <div className="bg-white p-3 rounded-xl shadow-sm shrink-0"><Mail className="h-6 w-6 text-slate-400" /></div>
                    <div className="min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block truncate">Sistem Giriş E-Postası (Değiştirilemez)</span>
                        <span className="text-lg font-black text-slate-700 truncate block">{userEmail}</span>
                    </div>
                </div>
                <div className="sm:ml-auto bg-emerald-100 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shrink-0 w-max">
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
                
                {/* 🚀 MÜHÜRLENMİŞ DEPARTMAN ALANI (DISABLED) */}
                <div className="space-y-3 md:col-span-2 relative">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Briefcase className="h-4 w-4" /> Departman / Ünvan Yetkisi
                    </Label>
                    <div className="relative">
                        <Input 
                            value={formData.department} 
                            disabled 
                            className="h-14 rounded-2xl bg-slate-100 border-slate-200 font-black text-slate-500 px-5 shadow-inner cursor-not-allowed pr-12" 
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" title="Güvenlik sebebiyle bu alan mühürlenmiştir.">
                            <Lock className="h-5 w-5" />
                        </div>
                    </div>
                    <p className="text-[11px] text-rose-500 font-bold ml-1 mt-2 flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5" /> Bu alan sistem yöneticisi tarafından atanır ve değiştirilemez.
                    </p>
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