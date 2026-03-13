"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Loader2, LogIn, HardHat } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      alert("Giriş Başarısız: E-posta veya şifre hatalı.")
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-2xl border-none bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-3 text-center pb-8 pt-8">
          <div className="mx-auto bg-slate-800 w-20 h-20 rounded-2xl flex items-center justify-center mb-2 shadow-lg transform rotate-3 hover:rotate-0 transition-all duration-300">
            <HardHat className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-black text-slate-800 tracking-tight">ERP Sistemine Giriş</CardTitle>
          <CardDescription className="text-slate-500 font-medium">
            Lütfen yetkili e-posta ve şifrenizi girin.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-bold">E-Posta Adresi</Label>
              <Input 
                id="email" type="email" required placeholder="ornek@buvisan.com" 
                className="h-12 bg-slate-50 border-slate-200 focus:bg-white"
                value={email} onChange={(e) => setEmail(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-bold">Şifre</Label>
              <Input 
                id="password" type="password" required placeholder="••••••••" 
                className="h-12 bg-slate-50 border-slate-200 focus:bg-white"
                value={password} onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pt-6 pb-8">
            <Button type="submit" disabled={loading} className="w-full h-14 text-lg bg-slate-800 hover:bg-slate-700 text-white shadow-xl hover:shadow-2xl transition-all font-bold rounded-xl">
              {loading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <LogIn className="mr-2 h-6 w-6" />}
              {loading ? "Giriş Yapılıyor..." : "GİRİŞ YAP"}
            </Button>
            <div className="text-center text-xs text-slate-400 font-medium mt-2">
              Sisteme giriş bilgileriniz için sistem yöneticinize başvurun.
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}