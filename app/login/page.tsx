"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Lock, Mail, Package2, ArrowRight } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError("Giriş başarısız. Lütfen e-posta ve şifrenizi kontrol edin.")
      setLoading(false)
    } else {
      // 🚀 MİLYON DOLARLIK KOD BURASI: Önce refresh yapıp Next.js'e yeni kimliği tanıtıyoruz
      router.refresh() 
      router.push("/dashboard")
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#f4f7f9] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 via-[#f0f4f8] to-slate-100 flex items-center justify-center p-4 font-sans">
      
      <div className="w-full max-w-[450px] bg-white/80 backdrop-blur-2xl border border-white/50 p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] relative overflow-hidden">
          
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col items-center mb-10">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-4 rounded-3xl shadow-lg shadow-blue-500/30 mb-6">
                  <Package2 className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 text-center">Buvisan ERP</h1>
              <p className="text-slate-500 font-medium text-sm mt-2 text-center">Sisteme erişmek için yetkili bilgilerinizi girin.</p>
          </div>

          <form onSubmit={handleLogin} className="relative z-10 flex flex-col gap-6">
              
              {error && (
                  <div className="bg-rose-50 text-rose-600 text-sm font-bold p-4 rounded-2xl border border-rose-100 flex items-center justify-center text-center animate-in fade-in slide-in-from-top-2">
                      {error}
                  </div>
              )}

              <div className="space-y-3">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Mail className="h-4 w-4" /> E-Posta Adresi
                  </Label>
                  <Input 
                      type="email" 
                      required
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      className="h-14 rounded-2xl bg-slate-50 border-slate-200 text-base font-bold text-slate-800 px-5 focus:ring-2 focus:ring-blue-500 transition-all shadow-inner" 
                      placeholder="ornek@buvisan.com" 
                  />
              </div>

              <div className="space-y-3">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Lock className="h-4 w-4" /> Şifre
                  </Label>
                  <Input 
                      type="password" 
                      required
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      className="h-14 rounded-2xl bg-slate-50 border-slate-200 text-base font-bold text-slate-800 px-5 focus:ring-2 focus:ring-blue-500 transition-all shadow-inner" 
                      placeholder="••••••••" 
                  />
              </div>

              <Button 
                  type="submit" 
                  disabled={loading || !email || !password} 
                  className="h-16 w-full mt-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-xl shadow-blue-500/30 transition-all flex items-center justify-center gap-3 group"
              >
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : null}
                  {loading ? "GİRİŞ YAPILIYOR..." : "SİSTEME GİRİŞ YAP"}
                  {!loading && <ArrowRight className="h-5 w-5 text-blue-300 group-hover:text-white group-hover:translate-x-1 transition-all" />}
              </Button>
          </form>

      </div>
    </div>
  )
}