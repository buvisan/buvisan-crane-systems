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
  Wallet, FileText, Archive, ScanLine, History, Menu, X,
  ShoppingCart, ListOrdered, Send, Loader2, ArchiveRestore, Plus, Trash2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<any>(null)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [unreadNotifs, setUnreadNotifs] = useState(2)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // 🚀 SİPARİŞ SEPETİ STATELERİ
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false)
  const [orderItems, setOrderItems] = useState<any[]>([]) // Sepetteki Ürünler
  const [orderForm, setOrderForm] = useState({ project_code: "", material_code: "", material_name: "", current_stock: "0", quantity: "1", priority: "NORMAL", description: "" })
  const [orderSubmitting, setOrderSubmitting] = useState(false)
  const [myOrders, setMyOrders] = useState<any[]>([])

  useEffect(() => {
    fetchUserData()
  }, [])

  useEffect(() => {
      if (isMobileMenuOpen) document.body.style.overflow = 'hidden'
      else document.body.style.overflow = 'unset'
  }, [isMobileMenuOpen])

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) {
            setProfile({ ...data, id: user.id })
            fetchMyOrders(user.id)
        } else {
            setProfile({ id: user.id, first_name: "Kaya", last_name: "", department: "Teknoloji Yön." }) 
        }
    } else {
        router.push('/login')
    }
  }

  const fetchMyOrders = async (userId: string) => {
      if (!userId) return;
      const { data } = await supabase.from('material_requests').select('*').eq('requested_by', userId).order('created_at', { ascending: false })
      if (data) setMyOrders(data)
  }

  // 🚀 YENİ: SEPETE ÜRÜN EKLEME
  const handleAddOrderItem = () => {
      if (!orderForm.material_name.trim()) { alert("Lütfen malzeme adı giriniz!"); return; }
      if (Number(orderForm.quantity) < 1) { alert("İstenen miktar en az 1 olmalıdır!"); return; }

      // Formdaki veriyi sepete at
      setOrderItems([...orderItems, { ...orderForm }])

      // Formu temizle (Kullanıcıya kolaylık olsun diye Proje No ve Önceliği silmiyoruz, devam etsin diye)
      setOrderForm({ 
          ...orderForm, 
          material_code: "", 
          material_name: "", 
          current_stock: "0", 
          quantity: "1", 
          description: "" 
      })
  }

  // 🚀 YENİ: SEPETTEN ÜRÜN SİLME
  const handleRemoveOrderItem = (index: number) => {
      const newItems = [...orderItems];
      newItems.splice(index, 1);
      setOrderItems(newItems);
  }

  // 🚀 SEPETİ TOPLUCA GÖNDER (BULK INSERT)
  const handleOrderSubmit = async () => {
      if (orderItems.length === 0) { alert("Lütfen önce listeye en az 1 adet malzeme ekleyin!"); return; }
      
      setOrderSubmitting(true)
      try {
          const requestNo = `TLP-${Date.now().toString().slice(-6)}`
          
          // Sepetteki her bir ürünü veritabanı formatına çeviriyoruz
          const payloads = orderItems.map(item => ({
              request_no: requestNo,
              project_code: item.project_code,
              material_code: item.material_code,
              material_name: item.material_name,
              current_stock: Number(item.current_stock),
              quantity: Number(item.quantity),
              priority: item.priority,
              description: item.description,
              requested_by: profile?.id
          }))

          // Tek seferde hepsini yolluyoruz (Bulk Insert)
          const { error } = await supabase.from('material_requests').insert(payloads)
          
          if (error) throw error
          
          alert(`✅ ${orderItems.length} kalem siparişiniz Satın Almaya başarıyla iletildi! \nTalep No: ${requestNo}`)
          setOrderItems([]) // Sepeti boşalt
          setIsOrderModalOpen(false) 
          fetchMyOrders(profile?.id) 
      } catch (err: any) { alert("Hata: " + err.message) }
      finally { setOrderSubmitting(false) }
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
      allowedRoles: ["yönetim", "admin", "satış", "satın", "muhasebe", "mühendis", "üretim", "proje"], 
      items: [
        { href: "/dashboard", label: "Ana Sayfa", icon: Home },
        { href: "/dashboard/inventory", label: "Stok & Envanter", icon: Package },
        { href: "/dashboard/purchases", label: "Satın Alma", icon: ClipboardList },
        { href: "/dashboard/customers", label: "Müşteriler", icon: Users },
        { href: "/dashboard/suppliers", label: "Tedarikçiler", icon: Truck },
        { href: "/dashboard/archive", label: "Üretim Arşivi", icon: ArchiveRestore },
      ]
    },
    {
      title: "MÜHENDİSLİK & PROJE",
      allowedRoles: ["mühendis", "arge", "proje", "tasarım", "ressam"], 
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
      allowedRoles: ["depo", "lojistik", "üretim", "satın", "teknik"],
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
      
      {isMobileMenuOpen && (
          <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden animate-in fade-in" 
              onClick={() => setIsMobileMenuOpen(false)}
          ></div>
      )}

      {/* SOL MENÜ */}
      <aside className={`fixed inset-y-0 left-0 z-[70] w-[280px] lg:w-[300px] transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col p-4 lg:p-5 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} lg:flex`}>
        <div className="flex-1 flex flex-col bg-white/95 lg:bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.08)] lg:shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] overflow-hidden relative">
          
          <div className="flex items-center justify-between gap-3 p-5 border-b border-gray-100/50">
            <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 flex-shrink-0">
              <Image src="/buvisan.png" alt="Buvisan Logo" width={160} height={50} priority className="object-contain" />
            </Link>
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
                        onClick={() => setIsMobileMenuOpen(false)} 
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
                  {profile?.first_name?.charAt(0) || "U"}
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
        
        {/* MOBİL ÜST BAR */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-40 shadow-sm">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsMobileMenuOpen(true)} className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 hover:bg-indigo-100 transition-colors">
                    <Menu className="h-6 w-6" />
                </button>
                <Image src="/buvisan.png" alt="Logo" width={100} height={30} className="object-contain" />
            </div>
            
            <div className="flex items-center gap-2">
                <button onClick={() => setIsOrderModalOpen(true)} className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md active:scale-95 transition-transform" title="Sipariş Ver">
                    <ShoppingCart className="h-5 w-5" />
                </button>
                <button onClick={() => { fetchMyOrders(profile?.id); setIsTrackingModalOpen(true); }} className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl shadow-sm active:scale-95 transition-transform" title="Sipariş Takip">
                    <ListOrdered className="h-5 w-5" />
                </button>

                <button onClick={() => {setIsNotifOpen(!isNotifOpen); setIsUserMenuOpen(false)}} className="relative p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500">
                    <Bell className="h-5 w-5" />
                    {unreadNotifs > 0 && <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-white animate-bounce"></span>}
                </button>
            </div>
        </div>

        {/* MASAÜSTÜ HEADER */}
        <header className="hidden lg:flex h-20 items-center justify-between px-8 mt-5 mx-8 bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_4px_20px_rgb(0,0,0,0.03)] rounded-[2rem] sticky top-5 z-30">
          
          <div className="flex items-center gap-4 shrink-0">
             <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse"></div>
             <span className="font-black text-slate-700 text-sm uppercase tracking-widest">Sistem Çevrimiçi</span>
          </div>

          <div className="flex-1 flex justify-end items-center gap-3 pr-6 border-r border-slate-200 mr-6">
              <Button onClick={() => setIsOrderModalOpen(true)} className="h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 text-sm transition-transform active:scale-95 flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" /> Sipariş Ver
              </Button>
              <Button variant="outline" onClick={() => { fetchMyOrders(profile?.id); setIsTrackingModalOpen(true); }} className="h-11 px-5 font-bold rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 text-sm transition-transform active:scale-95 flex items-center gap-2">
                  <ListOrdered className="h-4 w-4" /> Sipariş Takip
              </Button>
          </div>

          <div className="flex items-center gap-5 shrink-0">
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

      {/* 🚀 ÇOKLU SİPARİŞ VER MODALI (SEPET SİSTEMİ) */}
      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
          <DialogContent className="rounded-[2rem] p-6 max-w-4xl border-none shadow-2xl z-[100] flex flex-col max-h-[95vh] md:max-h-[90vh]">
              <DialogHeader className="shrink-0 mb-4">
                  <DialogTitle className="text-2xl font-black text-slate-800 flex items-center gap-2"><ShoppingCart className="text-blue-500"/> Çoklu Sipariş İsteği</DialogTitle>
                  <p className="text-xs font-bold text-slate-500 mt-1">Malzemeleri listeye ekleyin, işiniz bitince topluca satın almaya iletin.</p>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-6">
                  
                  {/* FORMU DOLDURMA ALANI */}
                  <div className="bg-slate-50 border border-slate-200 rounded-[1.5rem] p-4 md:p-5 flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Proje No / Kodu (Varsa)</Label>
                              <Input placeholder="Örn: 26-092" value={orderForm.project_code} onChange={e=>setOrderForm({...orderForm, project_code: e.target.value})} className="font-bold border-blue-200 focus:ring-blue-500 h-11 bg-white" />
                          </div>
                          <div className="space-y-2">
                              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tedarik Süresi</Label>
                              <div className="flex bg-slate-200/50 p-1 rounded-xl">
                                  <button type="button" onClick={() => setOrderForm({...orderForm, priority: 'NORMAL'})} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${orderForm.priority === 'NORMAL' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Normal</button>
                                  <button type="button" onClick={() => setOrderForm({...orderForm, priority: 'ACIL'})} className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${orderForm.priority === 'ACIL' ? 'bg-rose-500 shadow text-white' : 'text-slate-500'}`}>ACİL</button>
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-2 col-span-2 md:col-span-1">
                              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Malzeme Kodu</Label>
                              <Input placeholder="Örn: RLM-6204" value={orderForm.material_code} onChange={e=>setOrderForm({...orderForm, material_code: e.target.value})} className="font-bold border-blue-200 focus:ring-blue-500 h-11 bg-white" />
                          </div>
                          <div className="space-y-2 col-span-2 md:col-span-1">
                              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Malzeme Adı</Label>
                              <Input placeholder="Örn: 6204 Rulman" value={orderForm.material_name} onChange={e=>setOrderForm({...orderForm, material_name: e.target.value})} className="font-bold border-blue-200 focus:ring-blue-500 h-11 bg-white" />
                          </div>
                          <div className="space-y-2 col-span-1">
                              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mevcut Stok</Label>
                              <Input type="number" value={orderForm.current_stock} onChange={e=>setOrderForm({...orderForm, current_stock: e.target.value})} className="font-bold border-blue-200 focus:ring-blue-500 h-11 bg-white" />
                          </div>
                          <div className="space-y-2 col-span-1">
                              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">İstenen Miktar</Label>
                              <Input type="number" min="1" value={orderForm.quantity} onChange={e=>setOrderForm({...orderForm, quantity: e.target.value})} className="font-black text-blue-600 border-blue-200 focus:ring-blue-500 h-11 bg-white" />
                          </div>
                      </div>

                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sipariş Açıklaması / Not</Label>
                          <Textarea placeholder="Malzemeyi nerede kullanacağınızı veya özelliklerini yazın..." value={orderForm.description} onChange={e=>setOrderForm({...orderForm, description: e.target.value})} className="font-medium border-blue-200 focus:ring-blue-500 min-h-[50px] resize-none bg-white" />
                      </div>

                      <Button type="button" onClick={handleAddOrderItem} className="w-full h-12 bg-blue-100 hover:bg-blue-200 text-blue-700 font-black text-sm rounded-xl transition-all flex items-center justify-center gap-2 mt-2">
                          <Plus className="h-5 w-5" /> LİSTEYE (SEPETE) EKLE
                      </Button>
                  </div>

                  {/* 🚀 EKLENEN ÜRÜNLER (SEPET LİSTESİ) */}
                  {orderItems.length > 0 && (
                      <div className="flex flex-col gap-2">
                          <h3 className="font-black text-slate-700 text-sm flex items-center gap-2">
                              Eklenen Malzemeler <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs">{orderItems.length}</span>
                          </h3>
                          <div className="border border-slate-200 rounded-2xl overflow-hidden">
                              <table className="w-full text-left text-xs md:text-sm">
                                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold">
                                      <tr>
                                          <th className="px-3 py-3">Malzeme</th>
                                          <th className="px-3 py-3">Proje</th>
                                          <th className="px-3 py-3">Miktar</th>
                                          <th className="px-3 py-3">Öncelik</th>
                                          <th className="px-3 py-3 text-right">Sil</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                      {orderItems.map((item, index) => (
                                          <tr key={index} className="bg-white hover:bg-slate-50">
                                              <td className="px-3 py-3 font-bold text-slate-800">
                                                  {item.material_name} <span className="text-[10px] text-slate-400 block">{item.material_code}</span>
                                              </td>
                                              <td className="px-3 py-3 font-medium text-slate-600">{item.project_code || "-"}</td>
                                              <td className="px-3 py-3 font-black text-blue-600">{item.quantity}</td>
                                              <td className="px-3 py-3">
                                                  {item.priority === 'ACIL' ? <span className="text-[10px] font-black bg-rose-100 text-rose-600 px-2 py-1 rounded">ACİL</span> : <span className="text-[10px] font-bold text-slate-500">Normal</span>}
                                              </td>
                                              <td className="px-3 py-3 text-right">
                                                  <button onClick={() => handleRemoveOrderItem(index)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                                      <Trash2 className="h-4 w-4" />
                                                  </button>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  )}

              </div>

              {/* 🚀 TOPLU GÖNDERME BUTONU */}
              <div className="shrink-0 pt-4 mt-2 border-t border-slate-100">
                  <Button 
                      onClick={handleOrderSubmit} 
                      disabled={orderSubmitting || orderItems.length === 0} 
                      className="w-full h-14 md:h-16 bg-slate-900 hover:bg-slate-800 text-white font-black text-base md:text-lg rounded-xl shadow-xl transition-all"
                  >
                      {orderSubmitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Send className="h-5 w-5 mr-2" />} 
                      {orderSubmitting ? "GÖNDERİLİYOR..." : `TÜM LİSTEYİ SATIN ALMAYA İLET (${orderItems.length} Kalem)`}
                  </Button>
              </div>

          </DialogContent>
      </Dialog>

      {/* SİPARİŞ TAKİP MODALI */}
      <Dialog open={isTrackingModalOpen} onOpenChange={setIsTrackingModalOpen}>
          <DialogContent className="rounded-[2rem] p-6 max-w-4xl border-none shadow-2xl overflow-hidden max-h-[85vh] flex flex-col z-[100]">
              <DialogHeader className="shrink-0">
                  <DialogTitle className="text-2xl font-black text-slate-800 flex items-center gap-2"><ListOrdered className="text-blue-500"/> Verdiğim Siparişler</DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto custom-scrollbar flex-1 mt-4 border border-slate-100 rounded-xl">
                  <table className="w-full text-left border-collapse text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                          <tr>
                              <th className="px-4 py-3 font-bold text-slate-500">Talep No</th>
                              <th className="px-4 py-3 font-bold text-slate-500">Malzeme</th>
                              <th className="px-4 py-3 font-bold text-slate-500">Miktar</th>
                              <th className="px-4 py-3 font-bold text-slate-500">Tedarik</th>
                              <th className="px-4 py-3 font-bold text-slate-500">Durum</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {myOrders.map(o => (
                              <tr key={o.id} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-3 font-mono font-bold text-slate-400">{o.request_no}</td>
                                  <td className="px-4 py-3 font-bold text-slate-700">
                                      {o.material_name} <span className="text-xs text-slate-400 block">{o.material_code}</span>
                                      {o.description && <span className="text-[10px] text-slate-400 italic mt-0.5 block truncate max-w-[150px]">{o.description}</span>}
                                  </td>
                                  <td className="px-4 py-3 font-black text-blue-600">{o.quantity}</td>
                                  <td className="px-4 py-3">
                                      {o.priority === 'ACIL' ? <span className="text-[10px] font-black bg-rose-100 text-rose-600 px-2 py-1 rounded">ACİL</span> : <span className="text-[10px] font-bold text-slate-400">Normal</span>}
                                  </td>
                                  <td className="px-4 py-3">
                                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                                          o.status === 'BEKLIYOR' ? 'bg-amber-100 text-amber-700' :
                                          o.status === 'SIPARIS_VERILDI' ? 'bg-blue-100 text-blue-700' :
                                          o.status === 'GELDI' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                      }`}>
                                          {o.status.replace('_', ' ')}
                                      </span>
                                  </td>
                              </tr>
                          ))}
                          {myOrders.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-slate-400 font-medium">Henüz verdiğiniz bir sipariş yok.</td></tr>}
                      </tbody>
                  </table>
              </div>
          </DialogContent>
      </Dialog>

    </div>
  )
}