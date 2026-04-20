"use client"

import Image from 'next/image' 
import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { 
  Package2, Home, Package, ClipboardList, Tag, Users, Truck, 
  Calculator, HardHat, FileCog, Factory, AlertCircle, Bell, 
  LogOut, UserCircle, Settings, ChevronDown, Activity, PieChart, TrendingUp, CarFront,
  Wallet, FileText, Archive, ScanLine, History, Menu, X,
  ShoppingCart, ListOrdered, Send, Loader2, ArchiveRestore, Plus, Trash2, MessageCircle, Edit2, Save, UploadCloud, File
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // 🚀 YENİ PDF'Lİ SİPARİŞ FORMU STATELERİ
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [orderForm, setOrderForm] = useState<{title: string, priority: string, description: string, file: File | null}>({ 
      title: "", priority: "NORMAL", description: "", file: null 
  })
  const [orderSubmitting, setOrderSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // TAKİP STATELERİ
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false)
  const [allOrders, setAllOrders] = useState<any[]>([])
  
  // DÜZENLEME STATELERİ
  const [isEditOrderOpen, setIsEditOrderOpen] = useState(false)
  const [editOrderData, setEditOrderData] = useState<any>(null)
  const [editSaving, setEditSaving] = useState(false)

  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => { fetchUserData() }, [])

  useEffect(() => {
      if (isMobileMenuOpen) document.body.style.overflow = 'hidden'
      else document.body.style.overflow = 'unset'
  }, [isMobileMenuOpen])

  const playSound = () => {
      const audio = document.getElementById('notif-sound') as HTMLAudioElement;
      if (audio) {
          audio.currentTime = 0;
          audio.play().catch(e => console.warn("Tarayıcı sesi engelledi. Ekrana bir kez tıklayın:", e));
      }
  }

  useEffect(() => {
      if (!profile?.id) return;

      const channel = supabase.channel('global_all_tables')
      .on('postgres_changes', { event: '*', schema: 'public' }, async (payload: any) => {
          const table = payload.table;
          const eventType = payload.eventType;
          const newData = payload.new as any;
          const oldData = payload.old as any;
          
          const dept = (profile.department || "").toLowerCase();
          const isMaster = dept.includes('admin') || dept.includes('yönetim') || dept.includes('teknoloji');

          let shouldNotify = false;
          let notifObj: any = null;

          if (table === 'notes' && eventType === 'INSERT') {
              if (newData.user_id !== profile.id && (newData.receiver_id === profile.id || !newData.receiver_id)) {
                  shouldNotify = true;
                  const {data: u} = await supabase.from('profiles').select('first_name').eq('id', newData.user_id).single();
                  notifObj = { id: Date.now(), type: 'msg', title: `Yeni Mesaj: ${u?.first_name || 'Biri'}`, desc: newData.content, color: 'bg-blue-100 text-blue-600', path: '/dashboard', icon: <MessageCircle className="h-4 w-4"/>, date: new Date().toISOString() };
              }
          }

          if (table === 'material_requests' && eventType === 'INSERT' && newData.status !== 'GELDI' && (dept.includes('satın') || isMaster)) {
              shouldNotify = true;
              notifObj = { id: Date.now(), type: 'sys', title: newData.priority === 'ACIL' ? '🔥 ACİL SİPARİŞ FORMU' : 'Yeni Sipariş Formu', desc: `Başlık: ${newData.material_name}`, color: newData.priority === 'ACIL' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600', path: '/dashboard/purchases', icon: <FileText className="h-4 w-4"/>, date: new Date().toISOString() };
          }

          if (table === 'material_requests' && eventType === 'UPDATE' && newData.requested_by === profile.id && oldData?.status !== newData.status) {
              shouldNotify = true;
              notifObj = { id: Date.now(), type: 'sys', title: 'Siparişin Güncellendi', desc: `${newData.material_name} -> ${newData.status.replace('_', ' ')}`, color: 'bg-emerald-100 text-emerald-600', path: '/dashboard', icon: <Package className="h-4 w-4"/>, date: new Date().toISOString() };
          }

          if (table === 'tracking_sales' && eventType === 'INSERT' && (dept.includes('mühendis') || dept.includes('proje') || isMaster)) {
              shouldNotify = true;
              notifObj = { id: Date.now(), type: 'sys', title: 'Yeni Satış Geldi!', desc: `${newData.customer_name} firmasına satış yapıldı.`, color: 'bg-indigo-100 text-indigo-600', path: '/dashboard/engineering/projects', icon: <TrendingUp className="h-4 w-4"/>, date: new Date().toISOString() };
          }

          if (shouldNotify && notifObj) {
              playSound();
              setNotifications(prev => [notifObj, ...prev]);
          }
      })
      .subscribe();

      return () => { supabase.removeChannel(channel); }
  }, [profile])

  const loadNotifications = async (userId: string, dept: string) => {
      let notifs: any[] = [];
      const userDept = dept.toLowerCase();
      const isMaster = userDept.includes('admin') || userDept.includes('yönetim') || userDept.includes('teknoloji');

      const { data: dms } = await supabase.from('notes').select('*, profiles!notes_user_id_fkey(first_name, last_name)').eq('receiver_id', userId).eq('is_read', false);
      if (dms) { dms.forEach(dm => notifs.push({ id: `dm_${dm.id}`, type: 'msg', title: `Mesaj: ${dm.profiles?.first_name}`, desc: dm.content, date: dm.created_at, color: 'bg-blue-100 text-blue-600', path: '/dashboard', icon: <MessageCircle className="h-4 w-4" /> })) }

      const lastRead = localStorage.getItem(`lastReadGenel_${userId}`);
      let gq = supabase.from('notes').select('*, profiles!notes_user_id_fkey(first_name, last_name)').is('receiver_id', null);
      if (lastRead) gq = gq.gt('created_at', lastRead);
      const { data: gms } = await gq;
      if (gms) { gms.forEach(gm => { if (gm.user_id !== userId) { notifs.push({ id: `gm_${gm.id}`, type: 'msg', title: `Genel Pano: ${gm.profiles?.first_name}`, desc: gm.content, date: gm.created_at, color: 'bg-emerald-100 text-emerald-600', path: '/dashboard', icon: <Users className="h-4 w-4" /> }) } }) }

      if (userDept.includes('satın') || isMaster) {
          const { data: reqs } = await supabase.from('material_requests').select('*, profiles(first_name)').eq('status', 'BEKLIYOR');
          if (reqs) { reqs.forEach(req => notifs.push({ id: `req_${req.id}`, type: 'sys', title: req.priority === 'ACIL' ? '🔥 ACİL SİPARİŞ' : 'Sipariş Talebi', desc: `${req.profiles?.first_name || 'Biri'}: ${req.material_name}`, date: req.created_at, color: req.priority === 'ACIL' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600', path: '/dashboard/purchases', icon: <FileText className="h-4 w-4" /> })) }
      }

      if (userDept.includes('mühendis') || userDept.includes('proje') || isMaster) {
          const { data: sales } = await supabase.from('tracking_sales').select('*').eq('status', 'BEKLIYOR');
          if (sales) { sales.forEach(s => notifs.push({ id: `sale_${s.id}`, type: 'sys', title: 'Yeni Satış', desc: `${s.customer_name} firmasına. Onayınız bekleniyor.`, date: s.created_at, color: 'bg-indigo-100 text-indigo-600', path: '/dashboard/engineering/projects', icon: <TrendingUp className="h-4 w-4" /> })) }
      }

      const clearTime = localStorage.getItem(`clearedNotifsTime_${userId}`);
      if (clearTime) {
          notifs = notifs.filter(n => n.type === 'msg' || new Date(n.date).getTime() > new Date(clearTime).getTime());
      }

      notifs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setNotifications(notifs);
  }

  const handleMarkAllRead = async () => {
      if (!profile?.id) return;
      await supabase.from('notes').update({ is_read: true }).eq('receiver_id', profile.id).eq('is_read', false);
      localStorage.setItem(`lastReadGenel_${profile.id}`, new Date().toISOString());
      localStorage.setItem(`clearedNotifsTime_${profile.id}`, new Date().toISOString());
      setNotifications([]);
      setIsNotifOpen(false);
  }

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) {
            setProfile({ ...data, id: user.id })
            fetchAllOrders()
            loadNotifications(user.id, data.department || "") 
        } else {
            setProfile({ id: user.id, first_name: "Kaya", last_name: "", department: "Teknoloji Yön." }) 
            loadNotifications(user.id, "Teknoloji Yön.")
        }
    } else {
        router.push('/login')
    }
  }

  const fetchAllOrders = async () => {
      const { data } = await supabase
          .from('material_requests')
          .select('*, profiles(first_name, last_name)')
          .neq('status', 'GELDI') 
          .order('created_at', { ascending: false })
      if (data) setAllOrders(data)
  }

  // 🚀 YENİ PDF'Lİ SİPARİŞ GÖNDERME MOTORU
  const handleOrderSubmit = async () => {
      if (!orderForm.title) { alert("Lütfen Sipariş Başlığı / Proje Adı giriniz!"); return; }
      if (!orderForm.file) { alert("Lütfen bir PDF veya Excel Sipariş Formu yükleyiniz!"); return; }
      
      setOrderSubmitting(true)
      try {
          // 1. Önce Dosyayı Supabase'e Yükle
          const fileExt = orderForm.file.name.split('.').pop();
          const fileName = `REQ_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage.from('purchase_documents').upload(`requests/${fileName}`, orderForm.file);
          if (uploadError) throw uploadError;

          // 2. Dosyanın URL'sini al
          const { data: { publicUrl } } = supabase.storage.from('purchase_documents').getPublicUrl(`requests/${fileName}`);

          // 3. Veritabanına kaydet
          const requestNo = `TLP-${Date.now().toString().slice(-6)}`
          const payload = {
              request_no: requestNo, 
              material_name: orderForm.title, // Artık başlık olarak kullanıyoruz
              description: orderForm.description, 
              priority: orderForm.priority, 
              quantity: 1, // Form bazlı olduğu için varsayılan 1
              file_url: publicUrl,
              file_name: orderForm.file.name,
              status: 'BEKLIYOR',
              requested_by: profile?.id
          }

          const { error } = await supabase.from('material_requests').insert([payload])
          if (error) throw error
          
          alert(`✅ Sipariş formunuz Satın Almaya başarıyla iletildi! \nTalep No: ${requestNo}`)
          setOrderForm({ title: "", priority: "NORMAL", description: "", file: null }) 
          setIsOrderModalOpen(false) 
          fetchAllOrders() 
      } catch (err: any) { 
          alert("Hata: " + err.message) 
      } finally { 
          setOrderSubmitting(false) 
      }
  }

  const handleDeleteOrder = async (id: number) => {
      if (!confirm("Siparişi tamamen iptal edip silmek istediğinize emin misiniz?")) return;
      // İleride file storage'dan da silebiliriz ama şimdilik tablodan siliyoruz
      const { error } = await supabase.from('material_requests').delete().eq('id', id)
      if (error) alert("Hata: " + error.message)
      else fetchAllOrders()
  }

  const handleUpdateOrder = async () => {
      if (!editOrderData.material_name) return alert("Sipariş başlığı boş olamaz!");
      setEditSaving(true)
      try {
          const { error } = await supabase.from('material_requests').update({
              material_name: editOrderData.material_name,
              description: editOrderData.description,
              priority: editOrderData.priority
          }).eq('id', editOrderData.id);
          
          if (error) throw error;
          alert("✅ Sipariş güncellendi!");
          setIsEditOrderOpen(false);
          fetchAllOrders();
      } catch (e: any) {
          alert("Hata: " + e.message);
      } finally {
          setEditSaving(false);
      }
  }

  const handleLogout = async () => {
      await supabase.auth.signOut()
      router.push('/login')
  }

  const menuGroups = [
    { title: "GENEL", allowedRoles: ["yönetim", "admin", "satış", "muhasebe", "mühendis", "üretim", "proje", "ressam", "satın"], items: [ { href: "/dashboard", label: "Ana Sayfa", icon: Home }, { href: "/dashboard/inventory", label: "Stok & Envanter", icon: Package }, { href: "/dashboard/customers", label: "Müşteriler", icon: Users }, { href: "/dashboard/suppliers", label: "Tedarikçiler", icon: Truck }, { href: "/dashboard/archive", label: "Üretim Arşivi", icon: ArchiveRestore } ] },
    { title: "SATIN ALMA BİRİMİ", allowedRoles: ["satın", "admin", "yönetim"], items: [ { href: "/dashboard/purchases", label: "Satın Alma Paneli", icon: ClipboardList }, { href: "/dashboard/purchase-history", label: "Sipariş Geçmişi", icon: History } ] },
    { title: "MÜHENDİSLİK & PROJE", allowedRoles: ["mühendis", "arge", "proje", "tasarım", "ressam"], items: [ { href: "/dashboard/engineering/projects", label: "Proje Paneli", icon: FileCog }, { href: "/dashboard/offers", label: "Teklif & Hesaplama", icon: Calculator } ] },
    { title: "İMALAT YÖNETİMİ", allowedRoles: ["imalat", "üretim", "fabrika"], items: [ { href: "/dashboard/manufacturing/dashboard", label: "İmalat Paneli", icon: Factory }, { href: "/dashboard/manufacturing/missing", label: "Eksik Malzemeler", icon: AlertCircle } ] },
    { title: "SAHA (ÜRETİM)", allowedRoles: ["imalat", "üretim", "saha", "montaj"], items: [ { href: "/dashboard/production-screen", label: "Üretim Ekranı", icon: HardHat } ] },
    { title: "DEPO & LOJİSTİK", allowedRoles: ["depo", "lojistik", "üretim", "satın", "teknik"], items: [ { href: "/dashboard/warehouse/products", label: "Depo Ürünleri (QR)", icon: Archive }, { href: "/dashboard/warehouse/entries", label: "Mal Kabul & İrsaliye", icon: ClipboardList }, { href: "/dashboard/warehouse/scanner", label: "QR Barkod Terminali", icon: ScanLine }, { href: "/dashboard/warehouse/logs", label: "Stok Hareket Analizi", icon: History } ] },
    { title: "MUHASEBE & FİNANS", allowedRoles: ["muhasebe", "finans", "yönetici", "admin"], items: [ { href: "/dashboard/finance/invoices", label: "Faturalar & İrsaliyeler", icon: FileText }, { href: "/dashboard/finance/dashboard", label: "Finans Özeti", icon: Wallet }, { href: "/dashboard/finance/payroll", label: "Puantaj & Bordro", icon: Calculator } ] },
    { title: "SATIŞ TAKİP", allowedRoles: ["satış", "pazarlama", "bayi", "üretim", "muhasebe", "proje" ], items: [ { href: "/dashboard/tracking", label: "Takip Paneli", icon: PieChart }, { href: "/dashboard/tracking/products", label: "Ürünler / Modeller", icon: Package }, { href: "/dashboard/tracking/sales", label: "Satış İşlemleri", icon: TrendingUp }, { href: "/dashboard/tracking/personnel", label: "Personeller", icon: Users } ] }
  ]

  const userDept = (profile?.department || "").toLowerCase()
  const isMaster = userDept.includes("teknoloji") || userDept.includes("admin") || userDept.includes("yönetim") || userDept.includes("kurucu")
  const filteredMenuGroups = menuGroups.filter(group => { if (isMaster) return true; if (group.allowedRoles.includes("ALL")) return true; return group.allowedRoles.some(role => userDept.includes(role)); })

  return (
    <div className="min-h-screen w-full bg-[#f4f7f9] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 via-[#f0f4f8] to-slate-100 flex font-sans overflow-x-hidden">
      
      <audio id="notif-sound" src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto"></audio>
      {isMobileMenuOpen && (<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden animate-in fade-in" onClick={() => setIsMobileMenuOpen(false)}></div>)}

      {/* SOL MENÜ */}
      <aside className={`fixed inset-y-0 left-0 z-[70] w-[280px] lg:w-[300px] transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col p-4 lg:p-5 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} lg:flex`}>
        <div className="flex-1 flex flex-col bg-white/95 lg:bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.08)] lg:shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] overflow-hidden relative">
          <div className="flex items-center justify-between gap-3 p-5 border-b border-gray-100/50">
            <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 flex-shrink-0"><Image src="/buvisan.png" alt="Buvisan Logo" width={160} height={50} priority className="object-contain" /></Link>
            <button className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-xl lg:hidden" onClick={() => setIsMobileMenuOpen(false)}><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto py-6 px-4 no-scrollbar">
            <nav className="flex flex-col gap-8">
              {filteredMenuGroups.map((group, index) => (
                <div key={index} className="space-y-2">
                  <h3 className="px-4 text-[11px] font-black text-slate-400 mb-3 tracking-widest uppercase">{group.title}</h3>
                  {group.items.map((item) => {
                    const isActive = pathname.startsWith(item.href)
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3.5 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-all duration-300 relative overflow-hidden group ${isActive ? "text-white shadow-lg shadow-blue-500/30" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 lg:hover:bg-white/80"}`}>
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
                <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-black border border-white shadow-inner">{profile?.first_name?.charAt(0) || "U"}</div>
                <div className="flex flex-col overflow-hidden"><span className="text-sm font-bold text-slate-800 truncate">{profile?.first_name} {profile?.last_name}</span><span className="text-[10px] font-black text-blue-600 uppercase tracking-widest truncate">{profile?.department || "Departman"}</span></div>
             </div>
          </div>
        </div>
      </aside>
      
      <main className="flex-1 lg:pl-[300px] flex flex-col min-h-screen relative w-full overflow-x-hidden">
        
        <div className="lg:hidden flex items-center justify-between p-4 bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-40 shadow-sm">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsMobileMenuOpen(true)} className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 hover:bg-indigo-100 transition-colors"><Menu className="h-6 w-6" /></button>
                <Image src="/buvisan.png" alt="Logo" width={100} height={30} className="object-contain" />
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => setIsOrderModalOpen(true)} className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md active:scale-95 transition-transform" title="Sipariş Ver"><ShoppingCart className="h-5 w-5" /></button>
                <button onClick={() => { fetchAllOrders(); setIsTrackingModalOpen(true); }} className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl shadow-sm active:scale-95 transition-transform" title="Sipariş Takip"><ListOrdered className="h-5 w-5" /></button>
                <button onClick={() => {setIsNotifOpen(!isNotifOpen); setIsUserMenuOpen(false)}} className="relative p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500">
                    <Bell className="h-5 w-5" />
                    {notifications.length > 0 && <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-white animate-pulse"></span>}
                </button>
            </div>
        </div>

        <header className="hidden lg:flex h-20 items-center justify-between px-8 mt-5 mx-8 bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_4px_20px_rgb(0,0,0,0.03)] rounded-[2rem] sticky top-5 z-30">
          <div className="flex items-center gap-4 shrink-0">
             <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse"></div>
             <span className="font-black text-slate-700 text-sm uppercase tracking-widest">Sistem Çevrimiçi</span>
          </div>

          <div className="flex-1 flex justify-end items-center gap-3 pr-6 border-r border-slate-200 mr-6">
              <Button onClick={() => setIsOrderModalOpen(true)} className="h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 text-sm transition-transform active:scale-95 flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" /> Sipariş Formu Yükle
              </Button>
              <Button variant="outline" onClick={() => { fetchAllOrders(); setIsTrackingModalOpen(true); }} className="h-11 px-5 font-bold rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 text-sm transition-transform active:scale-95 flex items-center gap-2">
                  <ListOrdered className="h-4 w-4" /> Sipariş Takip
              </Button>
          </div>

          <div className="flex items-center gap-5 shrink-0">
             <div className="relative">
                 <button onClick={() => {setIsNotifOpen(!isNotifOpen); setIsUserMenuOpen(false)}} className={`h-12 w-12 rounded-2xl border flex items-center justify-center transition-all relative ${isNotifOpen ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-inner' : 'bg-white/80 border-white text-slate-500 hover:text-blue-600 hover:shadow-md'}`}>
                    <Bell className="h-5 w-5" />
                    {notifications.length > 0 && <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-black border-2 border-white shadow-sm animate-bounce">{notifications.length > 9 ? '9+' : notifications.length}</span>}
                 </button>

                 {isNotifOpen && (
                     <div className="absolute right-0 mt-3 w-[320px] md:w-[380px] bg-white/95 backdrop-blur-3xl border border-slate-100 rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 z-50">
                         <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                             <h3 className="font-black text-slate-800">Bildirimler</h3>
                             {notifications.length > 0 && <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">{notifications.length} Yeni</span>}
                         </div>
                         <div className="max-h-[350px] overflow-y-auto p-2 custom-scrollbar">
                             {notifications.length === 0 ? (
                                 <div className="p-8 flex flex-col items-center justify-center text-slate-400">
                                     <Bell className="h-8 w-8 mb-2 opacity-20" />
                                     <p className="text-xs font-bold">Harika! Okunmamış bildirim yok.</p>
                                 </div>
                             ) : (
                                 <div className="flex flex-col gap-1">
                                     {notifications.map(notif => (
                                         <div key={notif.id} onClick={() => { setIsNotifOpen(false); router.push(notif.path); }} className="p-3 hover:bg-slate-50 rounded-2xl cursor-pointer transition-colors flex gap-3 group">
                                             <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${notif.color}`}>{notif.icon}</div>
                                             <div className="flex flex-col flex-1 overflow-hidden">
                                                 <div className="flex items-start justify-between gap-2"><p className="text-xs font-black text-slate-800 truncate">{notif.title}</p><span className="text-[9px] font-bold text-slate-400 shrink-0">{new Date(notif.date).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'})}</span></div>
                                                 <p className="text-[10px] font-medium text-slate-500 mt-0.5 truncate group-hover:text-slate-700 transition-colors">{notif.desc}</p>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             )}
                         </div>
                         {notifications.length > 0 && (
                             <div className="p-3 border-t border-slate-100 text-center bg-slate-50/50"><button onClick={handleMarkAllRead} className="text-xs font-black text-blue-600 hover:text-blue-800 transition-colors w-full p-2 rounded-xl hover:bg-blue-50/50">Tüm Bildirimleri Okundu İşaretle</button></div>
                         )}
                     </div>
                 )}
             </div>

             <div className="relative">
                 <button onClick={() => {setIsUserMenuOpen(!isUserMenuOpen); setIsNotifOpen(false)}} className="flex items-center gap-3 h-12 pl-2 pr-4 rounded-2xl bg-white/80 border border-white hover:shadow-md transition-all">
                     <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">{profile?.first_name?.charAt(0) || "U"}</div>
                     <ChevronDown className="h-4 w-4 text-slate-400" />
                 </button>
                 {isUserMenuOpen && (
                     <div className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-3xl border border-slate-100 rounded-[2rem] shadow-2xl p-2 animate-in fade-in slide-in-from-top-4 z-50">
                        <div className="flex flex-col gap-1">
                            <Link href="/dashboard/profile" onClick={() => setIsUserMenuOpen(false)} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors"><UserCircle className="h-4 w-4" /> Profilim</Link>
                            <Link href="/dashboard/settings" onClick={() => setIsUserMenuOpen(false)} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors"><Settings className="h-4 w-4" /> Ayarlar</Link>
                            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-black text-rose-600 hover:bg-rose-50 rounded-xl transition-colors mt-1"><LogOut className="h-4 w-4" /> Sistemden Çıkış Yap</button>
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

      {/* 🚀 YENİ: PDF DESTEKLİ SİPARİŞ VER MODALI */}
      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
          <DialogContent className="rounded-[2rem] p-6 md:p-8 max-w-xl border-none shadow-2xl z-[100]">
              <DialogHeader className="mb-4">
                  <DialogTitle className="text-2xl font-black text-slate-800 flex items-center gap-2">
                      <ShoppingCart className="text-blue-500"/> Sipariş Formu Yükle
                  </DialogTitle>
                  <p className="text-xs font-bold text-slate-500 mt-1">Excel veya PDF formatındaki sipariş formunuzu sisteme yükleyin.</p>
              </DialogHeader>
              
              <div className="flex flex-col gap-5 py-2">
                  <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sipariş Başlığı / Proje Adı</Label>
                      <Input placeholder="Örn: 26-092 Çelik İhtiyaçları" value={orderForm.title} onChange={e=>setOrderForm({...orderForm, title: e.target.value})} className="h-12 font-bold border-slate-200 focus:ring-blue-500 bg-slate-50 rounded-xl" />
                  </div>
                  
                  <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tedarik Süresi (Öncelik)</Label>
                      <div className="flex bg-slate-100 p-1.5 rounded-xl">
                          <button type="button" onClick={() => setOrderForm({...orderForm, priority: 'NORMAL'})} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${orderForm.priority === 'NORMAL' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Normal</button>
                          <button type="button" onClick={() => setOrderForm({...orderForm, priority: 'ACIL'})} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${orderForm.priority === 'ACIL' ? 'bg-rose-500 shadow-md text-white' : 'text-slate-500 hover:text-rose-500'}`}>ACİL</button>
                      </div>
                  </div>

                  <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Açıklama / Not</Label>
                      <Textarea placeholder="Satın alma birimine iletmek istediğiniz özel notlar..." value={orderForm.description} onChange={(e: any) => setOrderForm({...orderForm, description: e.target.value})} className="font-medium border-slate-200 focus:ring-blue-500 min-h-[80px] resize-none bg-slate-50 rounded-xl p-3" />
                  </div>

                  {/* DOSYA YÜKLEME ALANI */}
                  <div className="space-y-2">
                      <Label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Sipariş Formu (PDF / Excel)</Label>
                      <div 
                          onClick={() => fileInputRef.current?.click()} 
                          className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${orderForm.file ? 'border-emerald-400 bg-emerald-50' : 'border-blue-200 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-400'}`}
                      >
                          <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.xls,.xlsx,.doc,.docx" onChange={(e) => setOrderForm({...orderForm, file: e.target.files?.[0] || null})} />
                          <div className={`p-3 rounded-full mb-3 transition-colors ${orderForm.file ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                              {orderForm.file ? <File className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
                          </div>
                          <span className={`font-black text-sm text-center ${orderForm.file ? 'text-emerald-700' : 'text-blue-700'}`}>
                              {orderForm.file ? "Dosya Seçildi" : "Tıkla ve Dosya Seç"}
                          </span>
                          <span className="text-xs font-bold text-slate-400 text-center mt-1 truncate w-full max-w-[300px]">
                              {orderForm.file ? orderForm.file.name : "Maksimum boyut: 10MB"}
                          </span>
                      </div>
                  </div>
              </div>

              <div className="shrink-0 pt-4 mt-2 border-t border-slate-100">
                  <Button onClick={handleOrderSubmit} disabled={orderSubmitting} className="w-full h-14 md:h-16 bg-blue-600 hover:bg-blue-700 text-white font-black text-base md:text-lg rounded-xl shadow-xl shadow-blue-500/20 transition-all">
                      {orderSubmitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Send className="h-5 w-5 mr-2" />} 
                      {orderSubmitting ? "YÜKLENİYOR..." : "SİPARİŞ FORMUNU İLET"}
                  </Button>
              </div>
          </DialogContent>
      </Dialog>

      {/* 🚀 SİPARİŞ TAKİP MODALI (HERKES TÜMÜNÜ GÖRÜR - PDF LİNKLİ) */}
      <Dialog open={isTrackingModalOpen} onOpenChange={setIsTrackingModalOpen}>
          <DialogContent className="rounded-[2rem] p-6 max-w-5xl border-none shadow-2xl overflow-hidden max-h-[85vh] flex flex-col z-[100]">
              <DialogHeader className="shrink-0"><DialogTitle className="text-2xl font-black text-slate-800 flex items-center gap-2"><ListOrdered className="text-blue-500"/> Şirket İçi Tüm Siparişler</DialogTitle></DialogHeader>
              <div className="overflow-y-auto custom-scrollbar flex-1 mt-4 border border-slate-100 rounded-xl">
                  <table className="w-full text-left border-collapse text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                          <tr>
                              <th className="px-4 py-3 font-bold text-slate-500">Talep Eden</th>
                              <th className="px-4 py-3 font-bold text-slate-500">Sipariş Başlığı / Formu</th>
                              <th className="px-4 py-3 font-bold text-slate-500">Durum</th>
                              <th className="px-4 py-3 font-bold text-slate-500 text-right">İşlem</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {allOrders.map(o => {
                              const isMyOrder = o.requested_by === profile?.id || isMaster;
                              const canEdit = isMyOrder && o.status === 'BEKLIYOR';

                              return (
                              <tr key={o.id} className={`hover:bg-slate-50/50 ${isMyOrder ? 'bg-blue-50/20' : ''}`}>
                                  <td className="px-4 py-3">
                                      <div className="flex flex-col">
                                          <span className="font-black text-slate-700">{o.profiles?.first_name} {o.profiles?.last_name}</span>
                                          <span className="font-mono text-[9px] text-slate-400">{o.request_no}</span>
                                      </div>
                                  </td>
                                  <td className="px-4 py-4">
                                      <div className="flex flex-col gap-2">
                                          <span className="font-bold text-slate-800 text-sm">{o.material_name}</span>
                                          {o.file_url ? (
                                              <a href={o.file_url} target="_blank" className="flex items-center gap-1.5 text-[10px] font-black uppercase bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg w-max border border-blue-100 hover:bg-blue-600 hover:text-white transition-colors">
                                                  <FileText className="h-3.5 w-3.5" /> Formu İndir / Görüntüle
                                              </a>
                                          ) : (
                                              <span className="text-[10px] text-slate-400 font-bold">Eski Kayıt (Dosya Yok)</span>
                                          )}
                                      </div>
                                  </td>
                                  <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${o.status === 'BEKLIYOR' ? 'bg-amber-100 text-amber-700' : o.status === 'SIPARIS_VERILDI' ? 'bg-blue-100 text-blue-700' : o.status === 'GELDI' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{o.status.replace('_', ' ')}</span></td>
                                  <td className="px-4 py-3 text-right">
                                      {canEdit ? (
                                          <div className="flex items-center justify-end gap-1">
                                              <button onClick={() => { setEditOrderData(o); setIsEditOrderOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Düzenle"><Edit2 className="h-4 w-4" /></button>
                                              <button onClick={() => handleDeleteOrder(o.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Siparişi İptal Et"><Trash2 className="h-4 w-4" /></button>
                                          </div>
                                      ) : (
                                          <span className="text-[10px] font-bold text-slate-300">Yetkisiz</span>
                                      )}
                                  </td>
                              </tr>
                          )})}
                          {allOrders.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-slate-400 font-medium">Henüz verilen bir sipariş yok.</td></tr>}
                      </tbody>
                  </table>
              </div>
          </DialogContent>
      </Dialog>

      {/* 🚀 SİPARİŞ DÜZENLEME MODALI */}
      <Dialog open={isEditOrderOpen} onOpenChange={setIsEditOrderOpen}>
          <DialogContent className="rounded-[2rem] p-6 max-w-md border-none shadow-2xl flex flex-col z-[110]">
              <DialogHeader className="mb-4"><DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2"><Edit2 className="h-5 w-5 text-blue-500"/> Sipariş Bilgilerini Düzenle</DialogTitle></DialogHeader>
              {editOrderData && (
                  <div className="flex flex-col gap-4">
                      <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sipariş Başlığı</Label>
                          <Input value={editOrderData.material_name} onChange={e => setEditOrderData({...editOrderData, material_name: e.target.value})} className="font-bold border-slate-200" />
                      </div>
                      <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Öncelik</Label>
                          <select value={editOrderData.priority} onChange={e => setEditOrderData({...editOrderData, priority: e.target.value})} className="w-full h-10 px-3 rounded-md bg-white border border-slate-200 text-sm font-bold text-slate-700 outline-none">
                              <option value="NORMAL">Normal</option>
                              <option value="ACIL">ACİL</option>
                          </select>
                      </div>
                      <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Açıklama / Not</Label>
                          <Textarea value={editOrderData.description} onChange={e => setEditOrderData({...editOrderData, description: e.target.value})} className="font-medium border-slate-200 resize-none min-h-[60px]" />
                      </div>
                      <p className="text-[10px] font-bold text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">Not: Yüklenen PDF dosyasını değiştirmek için bu siparişi silip yeniden yüklemeniz gerekmektedir.</p>
                      <Button onClick={handleUpdateOrder} disabled={editSaving} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl mt-2">
                          {editSaving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5 mr-2" />} KAYDET
                      </Button>
                  </div>
              )}
          </DialogContent>
      </Dialog>

    </div>
  )
}