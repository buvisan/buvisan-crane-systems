"use client"

import Image from 'next/image' 
import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { 
  Home, Package, ClipboardList, Users, Truck, 
  Calculator, HardHat, FileCog, Factory, AlertCircle, Bell, 
  LogOut, UserCircle, Settings, ChevronDown, PieChart, TrendingUp,
  Wallet, FileText, Archive, ScanLine, History, Menu, X,
  ShoppingCart, ListOrdered, Send, Loader2, ArchiveRestore, Plus, Trash2, MessageCircle, Printer, Palette, Moon, Sun, Check, CheckCircle
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<any>(null)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  
  const [latestNotif, setLatestNotif] = useState<any>(null)

  // SİPARİŞ STATELERİ
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [orderHeader, setOrderHeader] = useState({ project_code: "", material_type: "", priority: "NORMAL" })
  const [orderItemForm, setOrderItemForm] = useState({ material_name: "", current_stock: "0", quantity: "1" })
  const [orderItems, setOrderItems] = useState<any[]>([]) 
  const [orderSubmitting, setOrderSubmitting] = useState(false)
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false)
  const [allOrders, setAllOrders] = useState<any[]>([])
  const [isFormViewerOpen, setIsFormViewerOpen] = useState(false)
  const [viewingOrderGroup, setViewingOrderGroup] = useState<any>(null)

  // 🚀 TEMA MOTORU STATELERİ
  const [isThemePanelOpen, setIsThemePanelOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [activeColor, setActiveColor] = useState("blue")
  const [activeBg, setActiveBg] = useState("glass") // "glass", "solid", "dark"

  // 🎨 TEMA İLK YÜKLEME VE KAYDETME
  useEffect(() => {
      // LocalStorage'dan eski ayarları çek
      const savedDark = localStorage.getItem("theme-dark") === "true";
      const savedColor = localStorage.getItem("theme-color") || "blue";
      const savedBg = localStorage.getItem("theme-bg") || "glass";

      setIsDarkMode(savedDark);
      setActiveColor(savedColor);
      setActiveBg(savedBg);

      applyThemeToHTML(savedDark, savedColor);
      fetchUserData();
  }, [])

  // DOM'A TEMA İŞLEME SİHRİ
  const applyThemeToHTML = (isDark: boolean, color: string) => {
      const root = document.documentElement;
      if (isDark) root.classList.add('dark');
      else root.classList.remove('dark');
      
      root.setAttribute('data-theme', color);
  }

  const toggleDarkMode = () => {
      const newDark = !isDarkMode;
      setIsDarkMode(newDark);
      localStorage.setItem("theme-dark", String(newDark));
      applyThemeToHTML(newDark, activeColor);
  }

  const changeThemeColor = (color: string) => {
      setActiveColor(color);
      localStorage.setItem("theme-color", color);
      applyThemeToHTML(isDarkMode, color);
  }

  const changeBgStyle = (bgType: string) => {
      setActiveBg(bgType);
      localStorage.setItem("theme-bg", bgType);
  }

  // Dinamik Arkaplan Sınıfı (Tema seçimine göre değişir)
  const getBackgroundClass = () => {
      if (isDarkMode) return "bg-slate-950"; // Karanlık modda sabit siyah/lacivert
      if (activeBg === "solid") return "bg-muted"; // Dümdüz gri krallık
      // Glassmorphism (Canlı Gradient)
      return "bg-[#f4f7f9] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 via-[#f0f4f8] to-slate-200"; 
  }


  useEffect(() => {
      if (isMobileMenuOpen) document.body.style.overflow = 'hidden'
      else document.body.style.overflow = 'unset'
  }, [isMobileMenuOpen])

  const playSound = () => {
      const audio = document.getElementById('notif-sound') as HTMLAudioElement;
      if (audio) { audio.currentTime = 0; audio.play().catch(e => console.warn("Ses engellendi:", e)); }
  }

  useEffect(() => {
      if (!profile?.id) return;
      const channel = supabase.channel('global_all_tables').on('postgres_changes', { event: '*', schema: 'public' }, async (payload: any) => {
          const table = payload.table; const eventType = payload.eventType; const newData = payload.new as any; const oldData = payload.old as any;
          const dept = (profile.department || "").toLowerCase();
          const isMaster = dept.includes('admin') || dept.includes('yönetim') || dept.includes('teknoloji');
          let shouldNotify = false; let notifObj: any = null;

          if (table === 'notes' && eventType === 'INSERT') {
              if (newData.user_id !== profile.id && (newData.receiver_id === profile.id || !newData.receiver_id)) {
                  shouldNotify = true;
                  const {data: u} = await supabase.from('profiles').select('first_name').eq('id', newData.user_id).single();
                  notifObj = { id: Date.now(), type: 'msg', title: `Yeni Mesaj: ${u?.first_name || 'Biri'}`, desc: newData.content, color: 'bg-blue-100 text-primary', path: '/dashboard', icon: <MessageCircle className="h-5 w-5"/>, date: new Date().toISOString() };
              }
          }
          
          if (table === 'material_requests' && eventType === 'INSERT' && newData.status !== 'GELDI' && (dept.includes('satın') || isMaster)) {
              shouldNotify = true;
              notifObj = { id: Date.now(), type: 'sys', title: newData.priority === 'ACIL' ? '🔥 ACİL SİPARİŞ FORMU' : 'Yeni Sipariş Formu Geldi', desc: `Talep No: ${newData.request_no} - Malzeme: ${newData.material_name}`, color: newData.priority === 'ACIL' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600', path: '/dashboard/purchases', icon: <FileText className="h-5 w-5"/>, date: new Date().toISOString() };
          }

          if (shouldNotify && notifObj) { 
              playSound(); 
              setNotifications(prev => [notifObj, ...prev]); 
              setLatestNotif(notifObj);
              setTimeout(() => setLatestNotif(null), 6000);
          }
      }).subscribe();
      return () => { supabase.removeChannel(channel); }
  }, [profile])

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) { setProfile({ ...data, id: user.id }); fetchAllOrders(); } 
        else { setProfile({ id: user.id, first_name: "Kaya", last_name: "", department: "Teknoloji Yön." }); }
    } else router.push('/login')
  }

  const fetchAllOrders = async () => {
      const { data } = await supabase.from('material_requests').select('*, profiles(first_name, last_name, department)').neq('status', 'GELDI').order('created_at', { ascending: false })
      if (data) {
          const grouped = data.reduce((acc: any, req: any) => {
              if (!acc[req.request_no]) {
                  acc[req.request_no] = { 
                      request_no: req.request_no, project_code: req.project_code, material_type: req.description,
                      status: req.status, created_at: req.created_at, requested_by: req.requested_by, profiles: req.profiles, priority: req.priority, items: [req] 
                  }
              } else { acc[req.request_no].items.push(req) }
              return acc
          }, {})
          setAllOrders(Object.values(grouped))
      }
  }

  const handleAddOrderItem = () => {
      if (!orderItemForm.material_name.trim()) return alert("Lütfen malzeme adı giriniz!");
      if (Number(orderItemForm.quantity) < 1) return alert("Miktar en az 1 olmalıdır!");
      setOrderItems([...orderItems, { ...orderItemForm }]);
      setOrderItemForm({ material_name: "", current_stock: "0", quantity: "1" });
  }

  const handleRemoveOrderItem = (index: number) => {
      const newItems = [...orderItems]; newItems.splice(index, 1); setOrderItems(newItems);
  }

  const handleOrderSubmit = async () => {
      if (!orderHeader.material_type) return alert("Lütfen Malzeme Cinsi (Örn: Elektrik, Çelik) belirtiniz.");
      if (orderItems.length === 0) return alert("Lütfen listeye en az 1 malzeme ekleyin!");
      
      setOrderSubmitting(true)
      try {
          const requestNo = `FRM-${Date.now().toString().slice(-5)}`
          const payloads = orderItems.map(item => ({
              request_no: requestNo, project_code: orderHeader.project_code || "-", description: orderHeader.material_type,
              material_name: item.material_name, current_stock: Number(item.current_stock), quantity: Number(item.quantity),
              priority: orderHeader.priority, status: 'BEKLIYOR', requested_by: profile?.id
          }))
          
          const { error } = await supabase.from('material_requests').insert(payloads)
          if (error) throw error
          
          alert(`✅ Sipariş formu oluşturuldu ve Satın Almaya iletildi! \nForm No: ${requestNo}`)
          setOrderItems([]); setOrderHeader({ project_code: "", material_type: "", priority: "NORMAL" });
          setIsOrderModalOpen(false); fetchAllOrders();
      } catch (err: any) { alert("Hata: " + err.message) }
      finally { setOrderSubmitting(false) }
  }

  const handleDeleteForm = async (requestNo: string) => {
      if (!confirm("Bu sipariş formunu tamamen iptal edip silmek istediğinize emin misiniz?")) return;
      const { error } = await supabase.from('material_requests').delete().eq('request_no', requestNo)
      if (error) alert("Hata: " + error.message)
      else fetchAllOrders()
  }

  const openFormViewer = (orderGroup: any) => {
      setViewingOrderGroup(orderGroup)
      setIsFormViewerOpen(true)
  }

  const handlePrint = () => {
      const printContent = document.getElementById('printable-form');
      if (!printContent) return;

      const originalVisibility: {el: Element, display: string}[] = [];
      Array.from(document.body.children).forEach((el) => {
          if (el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
              originalVisibility.push({ el, display: (el as HTMLElement).style.display });
              (el as HTMLElement).style.display = 'none';
          }
      });

      const printWrapper = document.createElement('div');
      printWrapper.id = 'print-wrapper'; printWrapper.style.width = '100%'; printWrapper.style.backgroundColor = 'white';
      printWrapper.innerHTML = printContent.outerHTML;

      const style = document.createElement('style'); style.id = 'print-style';
      style.innerHTML = `@media print { @page { size: A4 portrait; margin: 10mm; } body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } #print-wrapper { display: block !important; zoom: 1.20 !important; } }`;

      document.head.appendChild(style); document.body.appendChild(printWrapper);
      window.print();
      document.body.removeChild(printWrapper); document.head.removeChild(style);
      originalVisibility.forEach(({ el, display }) => { (el as HTMLElement).style.display = display; });
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); }

  const handleMarkAllRead = () => { setNotifications([]); setIsNotifOpen(false); }

  const menuGroups = [
    { title: "GENEL", allowedRoles: ["yönetim", "admin", "satış", "muhasebe", "mühendis", "üretim", "proje", "mühendis", "satın"], items: [ { href: "/dashboard", label: "Ana Sayfa", icon: Home }, { href: "/dashboard/inventory", label: "Stok & Envanter", icon: Package }, { href: "/dashboard/customers", label: "Müşteriler", icon: Users }, { href: "/dashboard/suppliers", label: "Tedarikçiler", icon: Truck }, { href: "/dashboard/archive", label: "Üretim Arşivi", icon: ArchiveRestore } ] },
    { title: "SATIN ALMA BİRİMİ", allowedRoles: ["satın", "admin", "yönetim"], items: [ { href: "/dashboard/purchases", label: "Satın Alma Paneli", icon: ClipboardList }, { href: "/dashboard/purchase-history", label: "Sipariş Geçmişi", icon: History } ] },
    { title: "MÜHENDİSLİK & PROJE", allowedRoles: ["mühendis", "arge", "proje", "tasarım", "mühendis"], items: [ { href: "/dashboard/engineering/projects", label: "Proje Paneli", icon: FileCog }, { href: "/dashboard/offers", label: "Teklif & Hesaplama", icon: Calculator } ] },
    { title: "İMALAT YÖNETİMİ", allowedRoles: ["imalat", "üretim", "fabrika"], items: [ { href: "/dashboard/manufacturing/dashboard", label: "İmalat Paneli", icon: Factory }, { href: "/dashboard/manufacturing/missing", label: "Eksik Malzemeler", icon: AlertCircle } ] },
    { title: "SAHA (ÜRETİM)", allowedRoles: ["imalat", "üretim", "saha", "montaj"], items: [ { href: "/dashboard/production-screen", label: "Üretim Ekranı", icon: HardHat } ] },
    { title: "DEPO & LOJİSTİK", allowedRoles: ["depo", "lojistik", "üretim", "satın", "mühendis"], items: [ { href: "/dashboard/warehouse/products", label: "Depo Ürünleri (QR)", icon: Archive }, { href: "/dashboard/warehouse/entries", label: "Mal Kabul & İrsaliye", icon: ClipboardList }, { href: "/dashboard/warehouse/scanner", label: "QR Barkod Terminali", icon: ScanLine }, { href: "/dashboard/warehouse/logs", label: "Stok Hareket Analizi", icon: History } ] },
    { title: "MUHASEBE & FİNANS", allowedRoles: ["muhasebe", "finans", "yönetici", "admin"], items: [ { href: "/dashboard/finance/invoices", label: "Faturalar & İrsaliyeler", icon: FileText }, { href: "/dashboard/finance/dashboard", label: "Finans Özeti", icon: Wallet }, { href: "/dashboard/finance/payroll", label: "Puantaj & Bordro", icon: Calculator } ] },
    { title: "SATIŞ TAKİP", allowedRoles: ["satış", "pazarlama", "bayi", "üretim", "muhasebe", "proje" ], items: [ { href: "/dashboard/tracking", label: "Takip Paneli", icon: PieChart }, { href: "/dashboard/tracking/products", label: "Ürünler / Modeller", icon: Package }, { href: "/dashboard/tracking/sales", label: "Satış İşlemleri", icon: TrendingUp }, { href: "/dashboard/tracking/personnel", label: "Personeller", icon: Users } ] }
  ]

  const userDept = (profile?.department || "").toLowerCase()
  const isMaster = userDept.includes("teknoloji") || userDept.includes("admin") || userDept.includes("yönetim") || userDept.includes("kurucu")
  const filteredMenuGroups = menuGroups.filter(group => { if (isMaster) return true; if (group.allowedRoles.includes("ALL")) return true; return group.allowedRoles.some(role => userDept.includes(role)); })

  // 🎨 RENK PALETİ SEÇENEKLERİ
  const THEMES = [
      { id: "blue", name: "Kurumsal Mavi", color: "bg-primary" },
      { id: "red", name: "Dinamik Kırmızı", color: "bg-rose-600" },
      { id: "emerald", name: "Doğa Yeşili", color: "bg-emerald-600" },
      { id: "violet", name: "Premium Mor", color: "bg-violet-600" },
      { id: "orange", name: "Enerjik Turuncu", color: "bg-orange-500" },
      { id: "zinc", name: "Asil Siyah", color: "bg-slate-800" },
  ]

  return (
    /* 🚀 DİNAMİK ARKA PLAN SINIFI */
    <div className={`min-h-screen w-full flex font-sans overflow-x-hidden transition-colors duration-500 ${getBackgroundClass()} ${isDarkMode ? 'dark text-slate-100' : 'text-foreground'}`}>
      
      <audio id="notif-sound" src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto"></audio>
      
      {isMobileMenuOpen && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden animate-in fade-in" onClick={() => setIsMobileMenuOpen(false)}></div>)}

      {/* TOAST BİLDİRİM */}
      {latestNotif && (
          <div className="fixed bottom-6 right-6 z-[999] animate-in slide-in-from-bottom-10 fade-in duration-500">
              <div onClick={() => { router.push(latestNotif.path); setLatestNotif(null); setIsNotifOpen(true); }} className="bg-card border border-border shadow-2xl rounded-2xl p-4 flex items-start gap-4 w-[320px] cursor-pointer hover:scale-[1.02] transition-transform relative group">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${latestNotif.color}`}>{latestNotif.icon}</div>
                  <div className="flex flex-col flex-1 pr-4">
                      <span className="text-sm font-black text-foreground">{latestNotif.title}</span>
                      <span className="text-xs font-bold text-muted-foreground mt-1 leading-tight line-clamp-2">{latestNotif.desc}</span>
                      <span className="text-[9px] font-black text-primary mt-2 uppercase tracking-widest">Şimdi Geldi</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setLatestNotif(null); }} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4" /></button>
                  <div className="absolute bottom-0 left-0 h-1 bg-primary animate-[shrink_6s_linear_forwards] rounded-b-2xl"></div>
              </div>
          </div>
      )}

      {/* SOL MENÜ */}
      <aside className={`fixed inset-y-0 left-0 z-[70] w-[280px] lg:w-[300px] transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col p-4 lg:p-5 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} lg:flex print:hidden`}>
        <div className="flex-1 flex flex-col bg-card/95 lg:bg-card/60 backdrop-blur-2xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.08)] lg:shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] overflow-hidden relative transition-colors">
          <div className="flex items-center justify-between gap-3 p-5 border-b border-border/50">
            <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 flex-shrink-0">
                {/* Gece modundaysa logoyu beyaz (invert) yapmak için ufak bir hile */}
                <Image src="/buvisan.png" alt="Buvisan Logo" width={160} height={50} priority className={`object-contain ${isDarkMode ? 'brightness-0 invert' : ''}`} />
            </Link>
            <button className="p-2 text-muted-foreground hover:text-foreground bg-muted/50 rounded-xl lg:hidden" onClick={() => setIsMobileMenuOpen(false)}><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto py-6 px-4 no-scrollbar">
            <nav className="flex flex-col gap-8">
              {filteredMenuGroups.map((group, index) => (
                <div key={index} className="space-y-2">
                  <h3 className="px-4 text-[11px] font-black text-muted-foreground/70 mb-3 tracking-widest uppercase">{group.title}</h3>
                  {group.items.map((item) => {
                    const isActive = pathname.startsWith(item.href)
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3.5 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-all duration-300 relative overflow-hidden group ${isActive ? "text-primary-foreground shadow-lg shadow-primary/30 bg-primary" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}>
                        <item.icon className={`h-5 w-5 relative z-10 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                        <span className="relative z-10">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              ))}
            </nav>
          </div>
          <div className="p-4 mt-auto border-t border-border/50 bg-muted/20">
             <div className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border shadow-sm">
                <div className="h-10 w-10 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black border border-background shadow-inner">{profile?.first_name?.charAt(0) || "U"}</div>
                <div className="flex flex-col overflow-hidden"><span className="text-sm font-bold text-foreground truncate">{profile?.first_name} {profile?.last_name}</span><span className="text-[10px] font-black text-primary uppercase tracking-widest truncate">{profile?.department || "Departman"}</span></div>
             </div>
          </div>
        </div>
      </aside>
      
      <main className="flex-1 lg:pl-[300px] flex flex-col min-h-screen relative w-full overflow-x-hidden print:hidden">
        
        {/* MOBİL ÜST BAR */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-card/80 backdrop-blur-xl border-b border-border sticky top-0 z-40 shadow-sm print:hidden">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsMobileMenuOpen(true)} className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl text-primary hover:bg-primary/20 transition-colors"><Menu className="h-6 w-6" /></button>
                <Image src="/buvisan.png" alt="Logo" width={100} height={30} className={`object-contain ${isDarkMode ? 'brightness-0 invert' : ''}`} />
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => setIsOrderModalOpen(true)} className="p-2.5 bg-primary text-primary-foreground rounded-xl shadow-md active:scale-95 transition-transform"><ShoppingCart className="h-5 w-5" /></button>
                <button onClick={() => { setIsNotifOpen(!isNotifOpen); setIsUserMenuOpen(false); }} className="relative p-2.5 bg-muted border border-border rounded-xl text-muted-foreground">
                    <Bell className="h-5 w-5" />
                    {notifications.length > 0 && <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-background animate-pulse"></span>}
                </button>
            </div>
        </div>

        <header className="hidden lg:flex h-20 items-center justify-between px-8 mt-5 mx-8 bg-card/60 backdrop-blur-2xl border border-border/50 shadow-[0_4px_20px_rgb(0,0,0,0.03)] rounded-[2rem] sticky top-5 z-30 transition-colors">
          <div className="flex items-center gap-4 shrink-0">
             <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse"></div>
             <span className="font-black text-foreground text-sm uppercase tracking-widest">Sistem Çevrimiçi</span>
          </div>

          <div className="flex-1 flex justify-end items-center gap-3 pr-6 border-r border-border mr-6">
              <Button onClick={() => setIsOrderModalOpen(true)} className="h-11 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-md shadow-primary/20 text-sm transition-transform active:scale-95 flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" /> Sipariş Oluştur (Form)
              </Button>
              <Button variant="outline" onClick={() => { fetchAllOrders(); setIsTrackingModalOpen(true); }} className="h-11 px-5 font-bold rounded-xl border-2 border-border text-foreground hover:bg-muted text-sm transition-transform active:scale-95 flex items-center gap-2">
                  <ListOrdered className="h-4 w-4" /> Sipariş Takip
              </Button>
          </div>

          <div className="flex items-center gap-5 shrink-0">
             
             {/* 🚀 TEMA AYARLARI BUTONU */}
             <div className="relative">
                 <button onClick={() => {setIsThemePanelOpen(!isThemePanelOpen); setIsNotifOpen(false); setIsUserMenuOpen(false);}} className={`h-12 w-12 rounded-2xl border flex items-center justify-center transition-all ${isThemePanelOpen ? 'bg-primary/10 border-primary/30 text-primary shadow-inner' : 'bg-card/80 border-border text-muted-foreground hover:text-primary hover:shadow-md'}`}>
                    <Palette className="h-5 w-5" />
                 </button>

                 {/* TEMA AÇILIR PANELİ */}
                 {isThemePanelOpen && (
                     <div className="absolute right-0 mt-3 w-[300px] bg-card/95 backdrop-blur-3xl border border-border rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 z-50">
                         <div className="p-5 border-b border-border flex items-center gap-2 bg-muted/30">
                             <Palette className="h-5 w-5 text-primary" />
                             <h3 className="font-black text-foreground">Tema Ayarları</h3>
                         </div>
                         
                         <div className="p-5 flex flex-col gap-6">
                             {/* GECE/GÜNDÜZ MODU */}
                             <div className="flex flex-col gap-3">
                                 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Aydınlatma Modu</span>
                                 <div className="flex bg-muted p-1.5 rounded-xl border border-border">
                                     <button onClick={() => {setIsDarkMode(false); localStorage.setItem("theme-dark", "false"); applyThemeToHTML(false, activeColor);}} className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${!isDarkMode ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}><Sun className="h-4 w-4"/> Açık</button>
                                     <button onClick={() => {setIsDarkMode(true); localStorage.setItem("theme-dark", "true"); applyThemeToHTML(true, activeColor);}} className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${isDarkMode ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}><Moon className="h-4 w-4"/> Koyu</button>
                                 </div>
                             </div>

                             {/* RENK PALETİ */}
                             <div className="flex flex-col gap-3">
                                 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sistem Ana Rengi</span>
                                 <div className="grid grid-cols-3 gap-2">
                                     {THEMES.map(theme => (
                                         <button 
                                             key={theme.id} 
                                             onClick={() => changeThemeColor(theme.id)}
                                             className={`h-10 rounded-xl transition-all flex items-center justify-center ${theme.color} ${activeColor === theme.id ? 'ring-2 ring-offset-2 ring-primary ring-offset-background scale-105' : 'hover:scale-105 opacity-80 hover:opacity-100'}`}
                                             title={theme.name}
                                         >
                                             {activeColor === theme.id && <Check className="h-5 w-5 text-primary-foreground" />}
                                         </button>
                                     ))}
                                 </div>
                             </div>

                             {/* ARKA PLAN STİLİ (Sadece Light Modda Etkili) */}
                             {!isDarkMode && (
                                 <div className="flex flex-col gap-3">
                                     <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Arkaplan Stili</span>
                                     <div className="grid grid-cols-2 gap-2">
                                         <button onClick={() => changeBgStyle("glass")} className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${activeBg === 'glass' ? 'bg-primary/10 border-primary text-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}>Canlı (Glass)</button>
                                         <button onClick={() => changeBgStyle("solid")} className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${activeBg === 'solid' ? 'bg-primary/10 border-primary text-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}>Sade (Mat)</button>
                                     </div>
                                 </div>
                             )}
                         </div>
                     </div>
                 )}
             </div>

             <div className="relative">
                 <button onClick={() => {setIsNotifOpen(!isNotifOpen); setIsUserMenuOpen(false); setIsThemePanelOpen(false);}} className={`h-12 w-12 rounded-2xl border flex items-center justify-center transition-all relative ${isNotifOpen ? 'bg-primary/10 border-primary/30 text-primary shadow-inner' : 'bg-card/80 border-border text-muted-foreground hover:text-primary hover:shadow-md'}`}>
                    <Bell className="h-5 w-5" />
                    {notifications.length > 0 && <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-destructive text-primary-foreground text-[10px] font-black border-2 border-background shadow-sm animate-bounce">{notifications.length > 9 ? '9+' : notifications.length}</span>}
                 </button>

                 {isNotifOpen && (
                     <div className="absolute right-0 mt-3 w-[340px] md:w-[400px] bg-card/95 backdrop-blur-3xl border border-border rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 z-50">
                         <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
                             <div className="flex items-center gap-2">
                                 <Bell className="h-5 w-5 text-primary" />
                                 <h3 className="font-black text-foreground">Bildirim Merkezi</h3>
                             </div>
                             {notifications.length > 0 && <span className="text-[10px] font-black bg-primary/20 text-primary px-2 py-1 rounded-lg uppercase tracking-widest">{notifications.length} Yeni</span>}
                         </div>
                         
                         <div className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar bg-muted/10">
                             {notifications.length === 0 ? (
                                 <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                                     <div className="bg-muted p-4 rounded-full mb-3 shadow-inner">
                                         <CheckCircle className="h-8 w-8 text-emerald-400" />
                                     </div>
                                     <p className="text-sm font-black text-foreground">Her şey kontrol altında!</p>
                                     <p className="text-xs font-bold mt-1">Okunmamış yeni bildiriminiz yok.</p>
                                 </div>
                             ) : (
                                 <div className="flex flex-col gap-1.5">
                                     {notifications.map(notif => (
                                         <div key={notif.id} onClick={() => { setIsNotifOpen(false); router.push(notif.path); }} className="p-3 bg-card hover:bg-muted border border-border rounded-2xl cursor-pointer transition-colors flex gap-3 group shadow-sm">
                                             <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${notif.color}`}>
                                                 {notif.icon}
                                             </div>
                                             <div className="flex flex-col flex-1 overflow-hidden justify-center">
                                                 <div className="flex items-center justify-between gap-2">
                                                     <p className="text-sm font-black text-foreground truncate">{notif.title}</p>
                                                     <span className="text-[9px] font-bold text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded">{new Date(notif.date).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'})}</span>
                                                 </div>
                                                 <p className="text-xs font-bold text-muted-foreground mt-0.5 truncate group-hover:text-foreground transition-colors">{notif.desc}</p>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             )}
                         </div>

                         {notifications.length > 0 && (
                             <div className="p-3 border-t border-border text-center bg-card">
                                 <button onClick={handleMarkAllRead} className="text-xs font-black text-primary hover:text-primary-foreground transition-colors w-full p-3 rounded-xl hover:bg-primary border border-primary/20">
                                     Tüm Bildirimleri Temizle
                                 </button>
                             </div>
                         )}
                     </div>
                 )}
             </div>

             <div className="relative">
                 <button onClick={() => {setIsUserMenuOpen(!isUserMenuOpen); setIsNotifOpen(false); setIsThemePanelOpen(false);}} className="flex items-center gap-3 h-12 pl-2 pr-4 rounded-2xl bg-card/80 border border-border hover:shadow-md transition-all">
                     <div className="h-8 w-8 rounded-xl bg-foreground text-background flex items-center justify-center font-black text-sm">{profile?.first_name?.charAt(0) || "U"}</div>
                     <ChevronDown className="h-4 w-4 text-muted-foreground" />
                 </button>
                 {isUserMenuOpen && (
                     <div className="absolute right-0 mt-3 w-64 bg-card/95 backdrop-blur-3xl border border-border rounded-[2rem] shadow-2xl p-2 animate-in fade-in slide-in-from-top-4 z-50">
                        <div className="flex flex-col gap-1">
                            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-black text-destructive hover:bg-destructive/10 rounded-xl transition-colors mt-1"><LogOut className="h-4 w-4" /> Çıkış Yap</button>
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

      {/* SİPARİŞ OLUŞTURMA MODALI */}
      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
          <DialogContent className="rounded-[2rem] p-6 max-w-4xl border-none bg-card shadow-2xl z-[100] flex flex-col max-h-[90vh]">
              <DialogHeader className="shrink-0 mb-4">
                  <DialogTitle className="text-2xl font-black text-foreground flex items-center gap-2"><ShoppingCart className="text-primary"/> Malzeme İstek Formu Oluştur</DialogTitle>
                  <p className="text-xs font-bold text-muted-foreground mt-1">Malzemeleri sepete ekleyin. Sistem otomatik olarak standart istek formu oluşturacaktır.</p>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-6">
                  <div className="bg-primary/5 border border-primary/20 rounded-[1.5rem] p-4 flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2"><Label className="text-[10px] font-bold text-primary uppercase tracking-widest">Proje No (Varsa)</Label><Input placeholder="Örn: 26-092" value={orderHeader.project_code} onChange={e=>setOrderHeader({...orderHeader, project_code: e.target.value})} className="font-bold border-primary/30 focus:ring-primary h-11 bg-background text-foreground" /></div>
                          <div className="space-y-2"><Label className="text-[10px] font-bold text-primary uppercase tracking-widest">Malzeme Cinsi / Kategori</Label><Input placeholder="Örn: Elektrik, Çelik, Hırdavat..." value={orderHeader.material_type} onChange={e=>setOrderHeader({...orderHeader, material_type: e.target.value})} className="font-bold border-primary/30 focus:ring-primary h-11 bg-background text-foreground" /></div>
                      </div>
                  </div>

                  <div className="bg-muted/50 border border-border rounded-[1.5rem] p-4 flex flex-col gap-4">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div className="space-y-2 col-span-2 md:col-span-3"><Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ürün Tanımı / Malzeme Adı</Label><Input placeholder="Örn: 6204 Rulman" value={orderItemForm.material_name} onChange={e=>setOrderItemForm({...orderItemForm, material_name: e.target.value})} className="font-bold border-border h-11 bg-background text-foreground" /></div>
                          <div className="space-y-2 col-span-1"><Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mevcut Stok</Label><Input type="number" value={orderItemForm.current_stock} onChange={e=>setOrderItemForm({...orderItemForm, current_stock: e.target.value})} className="font-bold border-border h-11 bg-background text-foreground" /></div>
                          <div className="space-y-2 col-span-1"><Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Miktar</Label><Input type="number" min="1" value={orderItemForm.quantity} onChange={e=>setOrderItemForm({...orderItemForm, quantity: e.target.value})} className="font-black text-primary border-border h-11 bg-background" /></div>
                      </div>
                      <Button type="button" onClick={handleAddOrderItem} className="w-full h-11 bg-foreground hover:bg-foreground/90 text-background font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2"><Plus className="h-4 w-4" /> SATIR EKLE</Button>
                  </div>

                  {orderItems.length > 0 && (
                      <div className="flex flex-col gap-2">
                          <h3 className="font-black text-foreground text-sm flex items-center gap-2">Forma Eklenecek Malzemeler <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs">{orderItems.length}</span></h3>
                          <div className="border border-border rounded-2xl overflow-hidden">
                              <table className="w-full text-left text-xs md:text-sm">
                                  <thead className="bg-muted border-b border-border text-muted-foreground font-bold"><tr><th className="px-3 py-3">No</th><th className="px-3 py-3">Ürün Tanımı</th><th className="px-3 py-3 text-center">Stok</th><th className="px-3 py-3 text-center">Miktar</th><th className="px-3 py-3 text-right">Sil</th></tr></thead>
                                  <tbody className="divide-y divide-border">
                                      {orderItems.map((item, index) => (
                                          <tr key={index} className="bg-background hover:bg-muted/50">
                                              <td className="px-3 py-3 font-bold text-muted-foreground">{index + 1}</td>
                                              <td className="px-3 py-3 font-bold text-foreground">{item.material_name}</td>
                                              <td className="px-3 py-3 font-medium text-muted-foreground text-center">{item.current_stock}</td>
                                              <td className="px-3 py-3 font-black text-primary text-center">{item.quantity} ADET</td>
                                              <td className="px-3 py-3 text-right"><button onClick={() => handleRemoveOrderItem(index)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button></td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  )}
              </div>
              <div className="shrink-0 pt-4 mt-2 border-t border-border">
                  <Button onClick={handleOrderSubmit} disabled={orderSubmitting || orderItems.length === 0} className="w-full h-14 md:h-16 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-base md:text-lg rounded-xl shadow-xl shadow-primary/20 transition-all">
                      {orderSubmitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <FileText className="h-5 w-5 mr-2" />} {orderSubmitting ? "FORM OLUŞTURULUYOR..." : `FORMU OLUŞTUR VE İLET (${orderItems.length} Kalem)`}
                  </Button>
              </div>
          </DialogContent>
      </Dialog>

      {/* SİPARİŞ TAKİP MODALI */}
      <Dialog open={isTrackingModalOpen} onOpenChange={setIsTrackingModalOpen}>
          <DialogContent className="rounded-[2rem] p-6 max-w-5xl border-none bg-card shadow-2xl overflow-hidden max-h-[85vh] flex flex-col z-[100]">
              <DialogHeader className="shrink-0"><DialogTitle className="text-2xl font-black text-foreground flex items-center gap-2"><ListOrdered className="text-primary"/> Şirket İçi Tüm Formlar</DialogTitle></DialogHeader>
              <div className="overflow-y-auto custom-scrollbar flex-1 mt-4 border border-border rounded-xl">
                  <table className="w-full text-left border-collapse text-sm">
                      <thead className="bg-muted sticky top-0">
                          <tr>
                              <th className="px-4 py-3 font-bold text-muted-foreground">Form No</th>
                              <th className="px-4 py-3 font-bold text-muted-foreground">Talep Eden</th>
                              <th className="px-4 py-3 font-bold text-muted-foreground">Malzeme Cinsi</th>
                              <th className="px-4 py-3 font-bold text-muted-foreground">Durum</th>
                              <th className="px-4 py-3 font-bold text-muted-foreground text-right">İşlem</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                          {allOrders.map(group => {
                              const isMyOrder = group.requested_by === profile?.id || isMaster;
                              const canEdit = isMyOrder && group.status === 'BEKLIYOR';

                              return (
                              <tr key={group.request_no} className={`hover:bg-muted/50 ${isMyOrder ? 'bg-primary/5' : 'bg-background'}`}>
                                  <td className="px-4 py-4 font-mono text-xs font-bold text-primary">{group.request_no}</td>
                                  <td className="px-4 py-3 font-black text-foreground">{group.profiles?.first_name} {group.profiles?.last_name}</td>
                                  <td className="px-4 py-3 font-bold text-foreground">{group.material_type || "Belirtilmedi"} <span className="text-[10px] text-muted-foreground block">{group.items.length} Kalem İçeriyor</span></td>
                                  <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${group.status === 'BEKLIYOR' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' : group.status === 'SIPARIS_VERILDI' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' : group.status === 'GELDI' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400'}`}>{group.status.replace('_', ' ')}</span></td>
                                  <td className="px-4 py-3 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                          <Button onClick={() => openFormViewer(group)} size="sm" className="h-8 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs">
                                              <FileText className="h-3.5 w-3.5 mr-1" /> Formu Aç
                                          </Button>
                                          {canEdit && (
                                              <button onClick={() => handleDeleteForm(group.request_no)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors" title="Formu İptal Et"><Trash2 className="h-4 w-4" /></button>
                                          )}
                                      </div>
                                  </td>
                              </tr>
                          )})}
                          {allOrders.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-muted-foreground font-medium">Henüz verilen bir sipariş yok.</td></tr>}
                      </tbody>
                  </table>
              </div>
          </DialogContent>
      </Dialog>

      {/* KUSURSUZ ZM METAL FORMU (SABİT BEYAZ KAĞIT TASARIMI - TEMADAN ETKİLENMEZ) */}
      <Dialog open={isFormViewerOpen} onOpenChange={setIsFormViewerOpen}>
          <DialogContent className="w-[95vw] max-w-4xl p-0 border-none bg-muted shadow-2xl flex flex-col h-[90vh] max-h-[90vh] z-[200] overflow-hidden print:w-full print:max-w-none print:h-auto print:max-h-none print:shadow-none print:block print:p-0 print:m-0 print:bg-card">
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 print:bg-card print:p-0 w-full">
                  {/* Kağıt her zaman beyaz ve yazılar siyahtır (Karanlık Moddan Etkilenmez) */}
                  <div className="bg-card text-black border-[3px] border-black w-full min-w-[700px] mx-auto shadow-sm print:shadow-none print:min-w-0" id="printable-form">
                      <table className="w-full border-collapse border border-black mb-4">
                          <tbody>
                              <tr>
                                  <td className="border border-black w-1/4 p-2 text-center align-middle">
                                      <Image src="/buvisan.png" alt="Buvisan Logo" width={150} height={50} className="mx-auto object-contain brightness-0" />
                                  </td>
                                  <td className="border border-black w-2/4 text-center align-middle">
                                      <h2 className="text-xl font-bold tracking-widest text-foreground uppercase">MALZEME İSTEK FORMU</h2>
                                  </td>
                                  <td className="border border-black w-1/4 p-0 align-top text-[11px]">
                                      <table className="w-full h-full border-collapse">
                                          <tbody>
                                              <tr>
                                                  <td className="border-b border-r border-black p-1.5 text-slate-700 font-bold bg-muted">Doküman No</td>
                                                  <td className="border-b border-black p-1.5 font-bold text-foreground uppercase">DOC-{viewingOrderGroup?.request_no?.replace(/\D/g, '') || '001'}</td>
                                              </tr>
                                              <tr>
                                                  <td className="border-b border-r border-black p-1.5 text-slate-700 font-bold bg-muted">Yayın Tarihi</td>
                                                  <td className="border-b border-black p-1.5 font-bold text-foreground">{viewingOrderGroup?.created_at ? new Date(viewingOrderGroup.created_at).toLocaleDateString('tr-TR') : '13.12.2017'}</td>
                                              </tr>
                                              <tr>
                                                  <td className="border-b border-r border-black p-1.5 text-slate-700 font-bold bg-muted">Revizyon No</td>
                                                  <td className="border-b border-black p-1.5 font-bold text-foreground">00</td>
                                              </tr>
                                              <tr>
                                                  <td className="border-r border-black p-1.5 text-slate-700 font-bold bg-muted">Revizyon Tarihi</td>
                                                  <td className="p-1.5 font-bold text-foreground">--</td>
                                              </tr>
                                          </tbody>
                                      </table>
                                  </td>
                              </tr>
                          </tbody>
                      </table>

                      <table className="w-full border-collapse border border-black mb-4 text-[11px]">
                          <tbody>
                              <tr>
                                  <td className="border border-black p-2 font-bold w-1/4 bg-muted text-slate-700">Malzeme İstek Formu No</td>
                                  <td className="border border-black p-2 w-1/4 font-black uppercase text-foreground">{viewingOrderGroup?.request_no}</td>
                                  <td className="border border-black p-2 font-bold w-1/4 bg-muted text-slate-700">İstek Yapan Personel</td>
                                  <td className="border border-black p-2 font-black w-1/4 uppercase text-foreground">{viewingOrderGroup?.profiles?.first_name} {viewingOrderGroup?.profiles?.last_name}</td>
                              </tr>
                              <tr>
                                  <td className="border border-black p-2 font-bold bg-muted text-slate-700">Proje No</td>
                                  <td className="border border-black p-2 font-black text-foreground">{viewingOrderGroup?.project_code}</td>
                                  <td className="border border-black p-2 font-bold bg-muted text-slate-700">İstek Yapan Bölüm</td>
                                  <td className="border border-black p-2 font-black uppercase text-foreground">{viewingOrderGroup?.profiles?.department || "-"}</td>
                              </tr>
                              <tr>
                                  <td className="border border-black p-2 font-bold bg-muted text-slate-700">Tarih</td>
                                  <td className="border border-black p-2 font-black text-foreground">{viewingOrderGroup?.created_at ? new Date(viewingOrderGroup.created_at).toLocaleDateString('tr-TR') : ''}</td>
                                  <td className="border border-black p-2 font-bold bg-muted text-slate-700">Malzeme Cinsi</td>
                                  <td className="border border-black p-2 font-black text-foreground">{viewingOrderGroup?.material_type || viewingOrderGroup?.description || "-"}</td>
                              </tr>
                          </tbody>
                      </table>

                      <table className="w-full text-xs border-collapse border border-black">
                          <thead>
                              <tr className="bg-muted text-foreground">
                                  <th className="border border-black p-2 text-center w-12 font-bold">No</th>
                                  <th className="border border-black p-2 text-left pl-3 font-bold">Ürün Tanımı</th>
                                  <th className="border border-black p-2 text-center w-20 font-bold">Stok</th>
                                  <th className="border border-black p-2 text-center w-28 font-bold">Miktar</th>
                                  <th className="border border-black p-2 text-center w-32 font-bold">Termin</th>
                              </tr>
                          </thead>
                          <tbody>
                              {viewingOrderGroup?.items?.map((item: any, idx: number) => (
                                  <tr key={idx} className="h-8">
                                      <td className="border border-black p-2 text-center font-bold text-foreground">{idx + 1}</td>
                                      <td className="border border-black p-2 pl-3 font-black text-foreground">{item.material_name}</td>
                                      <td className="border border-black p-2 text-center font-bold text-foreground">{item.current_stock || 0}</td>
                                      <td className="border border-black p-2 text-center font-black text-sm text-foreground">{item.quantity} ADET</td>
                                      <td className="border border-black p-2 text-center"></td>
                                  </tr>
                              ))}
                              {/* Boş Satırlar */}
                              {[...Array(Math.max(0, 10 - (viewingOrderGroup?.items?.length || 0)))].map((_, i) => (
                                  <tr key={`empty-${i}`} className="h-8">
                                      <td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                      
                      <div className="mt-4 pb-2 text-right text-[10px] text-muted-foreground font-bold">Sayfa 1 / 1</div>
                  </div>
              </div>

              {/* SABİT BUTON ALANI */}
              <div className="shrink-0 flex justify-end gap-3 p-4 border-t border-border bg-card w-full print:hidden">
                  <Button variant="outline" onClick={() => setIsFormViewerOpen(false)} className="font-bold border-border text-foreground hover:bg-muted/50 h-12 px-6">Kapat</Button>
                  <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-lg h-12 px-6"><Printer className="h-4 w-4 mr-2"/> Yazdır / PDF Olarak İndir</Button>
              </div>
          </DialogContent>
      </Dialog>

    </div>
  )
}