"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
    Settings, BellRing, Shield, Moon, Loader2, CheckCircle2, 
    Laptop, Smartphone, Sun, Monitor, Lock, LogOut 
} from "lucide-react"

export default function SettingsPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState("notifications")
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const [emailNotif, setEmailNotif] = useState(true)
  const [popupNotif, setPopupNotif] = useState(true)

  const [theme, setTheme] = useState("light")
  const [accentColor, setAccentColor] = useState("blue")

  const [passwords, setPasswords] = useState({ newPass: "", confirmPass: "" })
  const [passLoading, setPassLoading] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState({ os: "Bilinmiyor", browser: "Bilinmeyen Tarayıcı", isMobile: false })

  useEffect(() => {
    const savedEmail = localStorage.getItem("pref_emailNotif")
    const savedPopup = localStorage.getItem("pref_popupNotif")
    const savedTheme = localStorage.getItem("pref_theme") || "light"
    const savedAccent = localStorage.getItem("pref_accent") || "blue"
    
    if (savedEmail !== null) setEmailNotif(savedEmail === "true")
    if (savedPopup !== null) setPopupNotif(savedPopup === "true")
    
    setTheme(savedTheme)
    setAccentColor(savedAccent)
    
    applyTheme(savedTheme)

    const ua = navigator.userAgent;
    let os = "Bilinmeyen OS";
    let browser = "Bilinmeyen Tarayıcı";
    let isMobile = false;

    if (ua.includes("Win")) os = "Windows";
    else if (ua.includes("Mac")) os = "MacOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("iPhone") || ua.includes("iPad")) { os = "iOS"; isMobile = true; }
    else if (ua.includes("Android")) { os = "Android"; isMobile = true; }

    if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Edge")) browser = "Edge";

    setDeviceInfo({ os, browser, isMobile })

  }, [])

  const applyTheme = (selectedTheme: string) => {
      const root = document.documentElement;
      if (selectedTheme === 'dark') {
          root.classList.add('dark');
      } else if (selectedTheme === 'light') {
          root.classList.remove('dark');
      } else {
          if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
              root.classList.add('dark');
          } else {
              root.classList.remove('dark');
          }
      }
  }

  const handleThemeChange = (newTheme: string) => {
      setTheme(newTheme);
      applyTheme(newTheme);
  }

  const handleSavePreferences = () => {
    setSaving(true)
    setSavedSuccess(false)
    
    setTimeout(() => {
        localStorage.setItem("pref_emailNotif", emailNotif.toString())
        localStorage.setItem("pref_popupNotif", popupNotif.toString())
        localStorage.setItem("pref_theme", theme)
        localStorage.setItem("pref_accent", accentColor)
        
        setSaving(false)
        setSavedSuccess(true)
        setTimeout(() => setSavedSuccess(false), 3000)
    }, 800)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
      e.preventDefault()
      if (passwords.newPass !== passwords.confirmPass) {
          alert("Yeni şifreler birbiriyle eşleşmiyor!")
          return
      }
      if (passwords.newPass.length < 6) {
          alert("Şifre en az 6 karakter olmalıdır!")
          return
      }

      setPassLoading(true)
      const { error } = await supabase.auth.updateUser({ password: passwords.newPass })
      setPassLoading(false)

      if (error) {
          alert("Şifre güncellenirken hata oluştu: " + error.message)
      } else {
          alert("✅ Şifreniz başarıyla güncellendi!")
          setPasswords({ newPass: "", confirmPass: "" })
      }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  const menuBtnClass = (tabId: string) => `flex items-center gap-2 md:gap-3 w-full p-3 md:p-4 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold transition-all text-left whitespace-nowrap md:whitespace-normal shrink-0 md:shrink border ${activeTab === tabId ? 'bg-white shadow-sm border-slate-200 text-slate-800' : 'bg-transparent hover:bg-white/60 border-transparent text-slate-500 hover:text-slate-800'}`

  return (
    <div className="flex flex-col gap-6 md:gap-8 max-w-[1100px] mx-auto w-full font-sans pb-10">
      
      {/* ÜST BAŞLIK */}
      <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm text-center sm:text-left">
        <div className="bg-gradient-to-br from-slate-700 to-slate-900 p-4 md:p-5 rounded-2xl md:rounded-3xl shadow-lg shadow-slate-900/30 shrink-0">
            <Settings className="h-8 w-8 md:h-10 w-10 text-white" />
        </div>
        <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Sistem Ayarları</h1>
            <p className="text-slate-500 font-medium text-xs md:text-sm mt-1">Uygulama deneyiminizi ve güvenlik tercihlerinizi kişiselleştirin.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
          
          {/* 🚀 SOL MENÜ (Mobilde Yatay Kaydırılabilir Tab) */}
          <div className="md:col-span-4 flex md:flex-col gap-2 overflow-x-auto custom-scrollbar pb-2 md:pb-0 w-full snap-x">
              <button onClick={() => setActiveTab("notifications")} className={`${menuBtnClass("notifications")} snap-start`}>
                  <BellRing className={`h-4 w-4 md:h-5 md:w-5 ${activeTab === 'notifications' ? 'text-blue-600' : 'text-slate-400'}`} /> Bildirim Tercihleri
              </button>
              <button onClick={() => setActiveTab("security")} className={`${menuBtnClass("security")} snap-start`}>
                  <Shield className={`h-4 w-4 md:h-5 md:w-5 ${activeTab === 'security' ? 'text-blue-600' : 'text-slate-400'}`} /> Güvenlik & Şifre
              </button>
              <button onClick={() => setActiveTab("appearance")} className={`${menuBtnClass("appearance")} snap-start`}>
                  <Moon className={`h-4 w-4 md:h-5 md:w-5 ${activeTab === 'appearance' ? 'text-blue-600' : 'text-slate-400'}`} /> Görünüm (Tema)
              </button>
          </div>

          {/* SAĞ İÇERİK ALANI */}
          <div className="md:col-span-8 bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-8 overflow-hidden relative">
              
              {/* 1️⃣ BİLDİRİM TERCİHLERİ SEKMESİ */}
              {activeTab === "notifications" && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                      <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-4 md:mb-6">Bildirim Tercihleri</h2>
                      <div className="flex flex-col gap-3 md:gap-5">
                          <div className="flex items-center justify-between bg-white p-4 md:p-5 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:border-blue-200 transition-all" onClick={() => setEmailNotif(!emailNotif)}>
                              <div className="flex flex-col gap-1 pr-3 md:pr-4">
                                  <span className="font-bold text-sm md:text-base text-slate-800">E-Posta Bildirimleri</span>
                                  <span className="text-[10px] md:text-xs font-medium text-slate-500">Satın alma onayı ve acil durumlarda mailinize ileti gönderilir.</span>
                              </div>
                              <div className={`relative inline-block w-12 md:w-14 h-7 md:h-8 shrink-0 rounded-full transition-colors duration-300 ${emailNotif ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                  <div className={`absolute top-1 w-5 md:w-6 h-5 md:h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${emailNotif ? 'translate-x-6 md:translate-x-7' : 'translate-x-1'}`}></div>
                              </div>
                          </div>

                          <div className="flex items-center justify-between bg-white p-4 md:p-5 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:border-blue-200 transition-all" onClick={() => setPopupNotif(!popupNotif)}>
                              <div className="flex flex-col gap-1 pr-3 md:pr-4">
                                  <span className="font-bold text-sm md:text-base text-slate-800">Uygulama İçi Uyarılar</span>
                                  <span className="text-[10px] md:text-xs font-medium text-slate-500">Program içindeyken sağ üstte çan ikonunda anlık bildirim göster.</span>
                              </div>
                              <div className={`relative inline-block w-12 md:w-14 h-7 md:h-8 shrink-0 rounded-full transition-colors duration-300 ${popupNotif ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                  <div className={`absolute top-1 w-5 md:w-6 h-5 md:h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${popupNotif ? 'translate-x-6 md:translate-x-7' : 'translate-x-1'}`}></div>
                              </div>
                          </div>
                      </div>

                      <div className="mt-6 md:mt-8 flex flex-col sm:flex-row items-center justify-end gap-3 md:gap-4 border-t border-slate-100 pt-5 md:pt-6">
                          {savedSuccess && <span className="text-emerald-600 font-bold text-xs md:text-sm flex items-center gap-1.5 md:gap-2 animate-in fade-in order-2 sm:order-1"><CheckCircle2 className="h-4 w-4 md:h-5 w-5" /> Kaydedildi</span>}
                          <Button onClick={handleSavePreferences} disabled={saving} className="w-full sm:w-auto h-12 px-6 rounded-xl md:rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-md transition-all order-1 sm:order-2">
                              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Tercihleri Kaydet"}
                          </Button>
                      </div>
                  </div>
              )}

              {/* 2️⃣ GÜVENLİK & ŞİFRE SEKMESİ */}
              {activeTab === "security" && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                      <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-4 md:mb-6">Güvenlik ve Oturumlar</h2>
                      
                      <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-3xl border border-slate-100 shadow-sm mb-6 md:mb-8">
                          <h3 className="font-bold text-sm md:text-base text-slate-800 flex items-center gap-2 mb-3 md:mb-4"><Lock className="h-4 w-4 text-blue-600"/> Şifremi Değiştir</h3>
                          <form onSubmit={handlePasswordChange} className="flex flex-col gap-3 md:gap-4">
                              <div className="space-y-1.5 md:space-y-2">
                                  <Label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Yeni Şifre</Label>
                                  <Input type="password" required minLength={6} value={passwords.newPass} onChange={(e) => setPasswords({...passwords, newPass: e.target.value})} className="h-10 md:h-12 rounded-xl bg-slate-50 border-slate-200 text-sm" placeholder="••••••••" />
                              </div>
                              <div className="space-y-1.5 md:space-y-2">
                                  <Label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Yeni Şifre (Tekrar)</Label>
                                  <Input type="password" required minLength={6} value={passwords.confirmPass} onChange={(e) => setPasswords({...passwords, confirmPass: e.target.value})} className="h-10 md:h-12 rounded-xl bg-slate-50 border-slate-200 text-sm" placeholder="••••••••" />
                              </div>
                              <Button type="submit" disabled={passLoading} className="h-10 md:h-12 w-full mt-1 md:mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 text-sm md:text-base">
                                  {passLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Şifreyi Güncelle"}
                              </Button>
                          </form>
                      </div>

                      {/* AKTİF CİHAZ (TARAYICI) */}
                      <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-3xl border border-slate-100 shadow-sm">
                          <h3 className="font-bold text-sm md:text-base text-slate-800 mb-3 md:mb-4">Mevcut Oturum</h3>
                          <div className="flex flex-col gap-3 md:gap-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                  <div className="flex items-center gap-3 md:gap-4">
                                      {deviceInfo.isMobile ? <Smartphone className="h-5 w-5 md:h-6 md:w-6 text-emerald-600 shrink-0" /> : <Laptop className="h-5 w-5 md:h-6 md:w-6 text-emerald-600 shrink-0" />}
                                      <div className="min-w-0">
                                          <p className="text-xs md:text-sm font-bold text-slate-800 truncate">{deviceInfo.os} • {deviceInfo.browser}</p>
                                          <p className="text-[10px] md:text-xs text-slate-500 font-medium">Şu an aktif olan oturumunuz</p>
                                      </div>
                                  </div>
                                  <span className="text-[9px] md:text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md w-max">BU CİHAZ</span>
                              </div>
                          </div>
                          
                          <div className="mt-4 md:mt-5 pt-4 md:pt-5 border-t border-slate-100">
                              <Button onClick={handleLogout} variant="destructive" className="w-full h-10 md:h-12 rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-sm md:text-base">
                                  <LogOut className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" /> Cihazdan Çıkış Yap
                              </Button>
                          </div>
                      </div>
                  </div>
              )}

              {/* 3️⃣ GÖRÜNÜM SEKMESİ (TEMA) */}
              {activeTab === "appearance" && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                      <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-4 md:mb-6">Tema ve Görünüm</h2>
                      
                      <div className="mb-6 md:mb-8 bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-3xl border border-slate-100 shadow-sm">
                          <Label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 md:mb-4 block">Arayüz Teması</Label>
                          <div className="grid grid-cols-3 gap-2 md:gap-4">
                              <button onClick={() => handleThemeChange("light")} className={`flex flex-col items-center gap-2 md:gap-3 p-3 md:p-5 rounded-xl md:rounded-2xl border-2 transition-all ${theme === 'light' ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-slate-50 hover:border-blue-200'}`}>
                                  <Sun className={`h-5 w-5 md:h-8 md:w-8 ${theme === 'light' ? 'text-blue-600' : 'text-slate-400'}`} />
                                  <span className={`font-bold text-[10px] md:text-sm ${theme === 'light' ? 'text-blue-800' : 'text-slate-600'}`}>Aydınlık</span>
                              </button>
                              <button onClick={() => handleThemeChange("dark")} className={`flex flex-col items-center gap-2 md:gap-3 p-3 md:p-5 rounded-xl md:rounded-2xl border-2 transition-all ${theme === 'dark' ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-slate-50 hover:border-blue-200'}`}>
                                  <Moon className={`h-5 w-5 md:h-8 md:w-8 ${theme === 'dark' ? 'text-blue-600' : 'text-slate-400'}`} />
                                  <span className={`font-bold text-[10px] md:text-sm ${theme === 'dark' ? 'text-blue-800' : 'text-slate-600'}`}>Karanlık</span>
                              </button>
                              <button onClick={() => handleThemeChange("system")} className={`flex flex-col items-center gap-2 md:gap-3 p-3 md:p-5 rounded-xl md:rounded-2xl border-2 transition-all ${theme === 'system' ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-slate-50 hover:border-blue-200'}`}>
                                  <Monitor className={`h-5 w-5 md:h-8 md:w-8 ${theme === 'system' ? 'text-blue-600' : 'text-slate-400'}`} />
                                  <span className={`font-bold text-[10px] md:text-sm ${theme === 'system' ? 'text-blue-800' : 'text-slate-600'}`}>Sistem</span>
                              </button>
                          </div>
                      </div>

                      <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-3xl border border-slate-100 shadow-sm">
                          <Label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 md:mb-4 block">Vurgu Rengi</Label>
                          <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 custom-scrollbar">
                              {['blue', 'emerald', 'rose', 'amber', 'indigo'].map((color) => (
                                  <button 
                                      key={color} 
                                      onClick={() => setAccentColor(color)}
                                      className={`h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-full flex items-center justify-center transition-all ${accentColor === color ? 'ring-4 ring-offset-2 md:ring-offset-4 ring-slate-200 scale-105 md:scale-110' : 'hover:scale-110 shadow-sm'} 
                                      ${color === 'blue' ? 'bg-blue-600' : color === 'emerald' ? 'bg-emerald-500' : color === 'rose' ? 'bg-rose-500' : color === 'amber' ? 'bg-amber-500' : 'bg-indigo-600'}`}
                                  >
                                      {accentColor === color && <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-white" />}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div className="mt-6 md:mt-8 flex flex-col sm:flex-row items-center justify-end gap-3 md:gap-4 border-t border-slate-100 pt-5 md:pt-6">
                          {savedSuccess && <span className="text-emerald-600 font-bold text-xs md:text-sm flex items-center gap-1.5 md:gap-2 animate-in fade-in order-2 sm:order-1"><CheckCircle2 className="h-4 w-4 md:h-5 md:w-5" /> Kaydedildi</span>}
                          <Button onClick={handleSavePreferences} disabled={saving} className="w-full sm:w-auto h-12 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-md transition-all order-1 sm:order-2">
                              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Görünümü Kaydet"}
                          </Button>
                      </div>
                  </div>
              )}

          </div>
      </div>
    </div>
  )
}