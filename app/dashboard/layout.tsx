"use client"

import Image from 'next/image' 
import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { 
  Package2, Home, Package, ClipboardList, Tag, Users, Truck, 
  Calculator, HardHat, FileCog, Factory, AlertCircle, Bell, 
  LogOut, UserCircle, Settings, ChevronDown, Activity, PieChart, TrendingUp, CarFront,
  Wallet, FileText, Archive, ScanLine, History, Menu, X // 🚀 MENU VE X İKONLARI EKLENDİ
} from "lucide-react"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<any>(null)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [unreadNotifs, setUnreadNotifs] = useState(2)
  
  // 🚀 MOBİL MENÜ KONTROL STATE'İ
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    fetchUserData()
  }, [])

  // Mobil menü açıkken arkadaki sayfanın kaymasını engeller
  useEffect(() => {
      if (isMobileMenuOpen) document.body.style.overflow = 'hidden'
      else document.body.style.overflow = 'unset'
  }, [isMobileMenuOpen])

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) setProfile(data)
        else setProfile({ first_name: "Kaya", last_name: "", department: "Teknoloji Yön." }) 
    } else {
        router.push('/login')
    }
  }

  const handleLogout = async () => {
      await supabase.auth.signOut()
      router.push('/login')
  }

  const handleNotificationClick = (path: string) => {
      setIsNotifOpen(false) 
      setUnreadNotifs(prev => Math.max(0, prev - 1)) 
      router.push(path) 
  }

  const menuGroups = [
    {
      title: "GENEL",
      allowedRoles: ["yönetim", "admin", "satış", "satın", "muhasebe", "mühendis", "üretim"], // 🚀 DİKKAT: Buraya "depo" yazmadık!
      items: [
        { href: "/dashboard", label: "Ana Sayfa", icon: Home },
        { href: "/dashboard/inventory", label: "Stok & Envanter", icon: Package },
        { href: "/dashboard/purchases", label: "Satın Alma", icon: ClipboardList },
        { href: "/dashboard/sales", label: "Satış İşlemleri", icon: Tag },
        { href: "/dashboard/customers", label: "Müşteriler", icon: Users },
        { href: "/dashboard/suppliers", label: "Tedarikçiler", icon: Truck },
      ]
    },
    {
      title: "MÜHENDİSLİK & PROJE",
      allowedRoles: ["mühendis", "arge", "proje", "tasarım"], 
      items: [
        { href: "/dashboard/engineering/projects", label: "Proje Paneli", icon: FileCog },
        { href: "/dashboard/offers", label: "Teklif & Hesaplama", icon: Calculator },
      ]
    },
    {
      title: "İMALAT YÖNETİMİ",
      allowedRoles: ["imalat", "üretim", "fabrika"],
      items: [
        { href: "/dashboard/manufacturing/dashboard", label: "İmalat Paneli", icon: Factory },
        { href: "/dashboard/manufacturing/missing", label: "Eksik Malzemeler", icon: AlertCircle },
      ]
    },
    {
      title: "SAHA (ÜRETİM)",
      allowedRoles: ["imalat", "üretim", "saha", "montaj"],
      items: [
        { href: "/dashboard/production-screen", label: "Üretim Ekranı", icon: HardHat },
      ]
    },
    {
      title: "DEPO & LOJİSTİK",
      allowedRoles: ["depo", "lojistik", "üretim", "satın"],
      items: [
        { href: "/dashboard/warehouse/products", label: "Depo Ürünleri (QR)", icon: Archive },
        { href: "/dashboard/warehouse/entries", label: "Mal Kabul & İrsaliye", icon: ClipboardList },
        { href: "/dashboard/warehouse/scanner", label: "QR Barkod Terminali", icon: ScanLine },
        { href: "/dashboard/warehouse/logs", label: "Stok Hareket Analizi", icon: History },
      ]
    },
    {
      title: "MUHASEBE & FİNANS",
      allowedRoles: ["muhasebe", "finans", "yönetici"],
      items: [
        { href: "/dashboard/finance/invoices", label: "Faturalar & İrsaliyeler", icon: FileText },
        { href: "/dashboard/finance/dashboard", label: "Finans Özeti", icon: Wallet },
      ]
    },
    {
      title: "SATIŞ TAKİP",
      allowedRoles: ["satış", "pazarlama", "bayi","satın", "üretim","muhasebe","proje" ],
      items: [
        { href: "/dashboard/tracking", label: "Takip Paneli", icon: PieChart },
        { href: "/dashboard/tracking/products", label: "Ürünler / Modeller", icon: Package },
        { href: "/dashboard/tracking/sales", label: "Satış İşlemleri", icon: TrendingUp },
        { href: "/dashboard/tracking/personnel", label: "Personeller", icon: Users },
      ]
    }
  ]

  const userDept = (profile?.department || "").toLowerCase()
  const isMaster = userDept.includes("teknoloji") || userDept.includes("admin") || userDept.includes("yönetim") || userDept.includes("kurucu")

  const filteredMenuGroups = menuGroups.filter(group => {
    if (isMaster) return true; 
    if (group.allowedRoles.includes("ALL")) return true; 
    return group.allowedRoles.some(role => userDept.includes(role)); 
  })

  return (
    <div className="min-h-screen w-full bg-[#f4f7f9] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 via-[#f0f4f8] to-slate-100 flex font-sans overflow-x-hidden">
      
      {/* 🚀 MOBİL EKRANLAR İÇİN KARARTMA EFEKTİ (Menü açıkken arkaya tıklanmasın diye) */}
      {isMobileMenuOpen && (
          <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden animate-in fade-in" 
              onClick={() => setIsMobileMenuOpen(false)}
          ></div>
      )}

      {/* 🚀 SOL MENÜ (Hem Masaüstü Hem Mobil İçin Güncellendi) */}
      <aside className={`fixed inset-y-0 left-0 z-[70] w-[280px] lg:w-[300px] transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col p-4 lg:p-5 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} lg:flex`}>
        <div className="flex-1 flex flex-col bg-white/95 lg:bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.08)] lg:shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] overflow-hidden relative">
          
          <div className="flex items-center justify-between gap-3 p-5 border-b border-gray-100/50">
            <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 flex-shrink-0">
              <Image src="/buvisan.png" alt="Buvisan Logo" width={160} height={50} priority className="object-contain" />
            </Link>
            {/* Mobilde Kapatma Butonu */}
            <button className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-xl lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
                <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-6 px-4 no-scrollbar">
            <nav className="flex flex-col gap-8">
              {filteredMenuGroups.map((group, index) => (
                <div key={index} className="space-y-2">
                  <h3 className="px-4 text-[11px] font-black text-slate-400 mb-3 tracking-widest uppercase">{group.title}</h3>
                  {group.items.map((item) => {
                    const isActive = pathname.startsWith(item.href)
                    return (
                      <Link 
                        key={item.href} 
                        href={item.href} 
                        onClick={() => setIsMobileMenuOpen(false)} // Tıklayınca menü kapansın
                        className={`flex items-center gap-3.5 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-all duration-300 relative overflow-hidden group ${isActive ? "text-white shadow-lg shadow-blue-500/30" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 lg:hover:bg-white/80"}`}
                      >
                        {isActive && <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-100 z-0 transition-opacity"></div>}
                        <item.icon className={`h-5 w-5 relative z-10 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                        <span className="relative z-10">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              ))}
            </nav>
          </div>

          <div className="p-4 mt-auto border-t border-slate-100 lg:border-white/40 bg-slate-50 lg:bg-white/20">
             <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-100 lg:bg-white/50 lg:border-white/60 shadow-sm">
                <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-black border border-white shadow-inner">
                  {profile?.first_name?.charAt(0) || "K"}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-bold text-slate-800 truncate">{profile?.first_name} {profile?.last_name}</span>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest truncate">{profile?.department || "Departman"}</span>
                </div>
             </div>
          </div>
        </div>
      </aside>
      
      <main className="flex-1 lg:pl-[300px] flex flex-col min-h-screen relative w-full overflow-x-hidden">
        
        {/* 🚀 MOBİL İÇİN YENİ ÜST SABİT BAR (Sadece mobilde görünür) */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-40 shadow-sm">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsMobileMenuOpen(true)} className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 hover:bg-indigo-100 transition-colors">
                    <Menu className="h-6 w-6" />
                </button>
                <Image src="/buvisan.png" alt="Logo" width={120} height={40} className="object-contain" />
            </div>
            
            {/* Mobil Bildirim Zili */}
            <button onClick={() => {setIsNotifOpen(!isNotifOpen); setIsUserMenuOpen(false)}} className="relative p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500">
                <Bell className="h-5 w-5" />
                {unreadNotifs > 0 && <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-white animate-bounce"></span>}
            </button>
        </div>

        {/* 🚀 MASAÜSTÜ HEADER VE MOBİL AYARLARI KARIŞIK */}
        <header className="hidden lg:flex h-20 items-center justify-between px-8 mt-5 mx-8 bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_4px_20px_rgb(0,0,0,0.03)] rounded-[2rem] sticky top-5 z-30">
          
          <div className="flex items-center gap-4">
             <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse"></div>
             <span className="font-black text-slate-700 text-sm uppercase tracking-widest">Sistem Çevrimiçi</span>
          </div>

          <div className="flex items-center gap-5">
             <div className="relative">
                 <button onClick={() => {setIsNotifOpen(!isNotifOpen); setIsUserMenuOpen(false)}} className={`h-12 w-12 rounded-2xl border flex items-center justify-center transition-all relative ${isNotifOpen ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-inner' : 'bg-white/80 border-white text-slate-500 hover:text-blue-600 hover:shadow-md'}`}>
                    <Bell className="h-5 w-5" />
                    {unreadNotifs > 0 && <span className="absolute top-2.5 right-3 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-white animate-bounce"></span>}
                 </button>

                 {isNotifOpen && (
                     <div className="absolute right-0 mt-3 w-80 bg-white/95 backdrop-blur-3xl border border-slate-100 rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 z-50">
                         <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                             <h3 className="font-black text-slate-800">Bildirimler</h3>
                             <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">{unreadNotifs} Yeni</span>
                         </div>
                         <div className="max-h-[300px] overflow-y-auto p-2">
                             <div onClick={() => handleNotificationClick('/dashboard/manufacturing/missing')} className="p-3 hover:bg-slate-50 rounded-2xl cursor-pointer transition-colors flex gap-3">
                                 <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0"><AlertCircle className="h-4 w-4"/></div>
                                 <div>
                                     <p className="text-xs font-bold text-slate-700">Acil Eksik Malzeme</p>
                                     <p className="text-[10px] text-slate-500 mt-0.5">Üretimden yeni bir malzeme talebi var.</p>
                                 </div>
                             </div>
                         </div>
                         <div className="p-3 border-t border-slate-100 text-center">
                             <button onClick={() => setUnreadNotifs(0)} className="text-xs font-bold text-blue-600 hover:text-blue-800">Tümünü Okundu İşaretle</button>
                         </div>
                     </div>
                 )}
             </div>

             <div className="relative">
                 <button onClick={() => {setIsUserMenuOpen(!isUserMenuOpen); setIsNotifOpen(false)}} className="flex items-center gap-3 h-12 pl-2 pr-4 rounded-2xl bg-white/80 border border-white hover:shadow-md transition-all">
                     <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                         {profile?.first_name?.charAt(0) || "U"}
                     </div>
                     <ChevronDown className="h-4 w-4 text-slate-400" />
                 </button>

                 {isUserMenuOpen && (
                     <div className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-3xl border border-slate-100 rounded-[2rem] shadow-2xl p-2 animate-in fade-in slide-in-from-top-4 z-50">
                        <div className="flex flex-col gap-1">
                            <Link href="/dashboard/profile" onClick={() => setIsUserMenuOpen(false)} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors">
                                <UserCircle className="h-4 w-4" /> Profilim
                            </Link>
                            <Link href="/dashboard/settings" onClick={() => setIsUserMenuOpen(false)} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors">
                                <Settings className="h-4 w-4" /> Ayarlar
                            </Link>
                            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-black text-rose-600 hover:bg-rose-50 rounded-xl transition-colors mt-1">
                                <LogOut className="h-4 w-4" /> Sistemden Çıkış Yap
                            </button>
                        </div>
                     </div>
                 )}
             </div>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-5 lg:p-8 pt-6 w-full max-w-[100vw]">
          {children}
        </div>

      </main>
    </div>
  )
}