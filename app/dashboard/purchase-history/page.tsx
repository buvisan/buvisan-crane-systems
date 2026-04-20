"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { History, Search, PackageOpen, PlusCircle, Save, Loader2, Calendar } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function PurchaseHistoryPage() {
    const supabase = createClient()
    const [history, setHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    
    // Manuel Ekleme Stateleri
    const [isManualModalOpen, setIsManualModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [manualForm, setManualForm] = useState({
        material_name: "",
        quantity: "1",
        description: "Manuel Arşiv Kaydı",
        created_at: new Date().toISOString().split('T')[0]
    })

    useEffect(() => {
        fetchHistory()
    }, [])

    const fetchHistory = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('material_requests')
            .select('*, profiles(first_name, last_name)')
            .in('status', ['GELDI', 'IPTAL'])
            .order('created_at', { ascending: false })
            
        if (data) setHistory(data)
        setLoading(false)
    }

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!manualForm.material_name) return alert("Malzeme adı girmelisiniz.")
        
        setSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            
            const { error } = await supabase.from('material_requests').insert([{
                request_no: `MNL-${Date.now().toString().slice(-6)}`,
                material_name: manualForm.material_name,
                quantity: Number(manualForm.quantity),
                description: manualForm.description,
                priority: 'NORMAL',
                status: 'GELDI', // Doğrudan geçmişe düşsün
                requested_by: user?.id,
                created_at: new Date(manualForm.created_at).toISOString() // İstenen geçmiş tarih
            }])
            
            if (error) throw error
            alert("✅ Kayıt başarıyla geçmiş arşive eklendi!")
            setIsManualModalOpen(false)
            setManualForm({ material_name: "", quantity: "1", description: "Manuel Arşiv Kaydı", created_at: new Date().toISOString().split('T')[0] })
            fetchHistory()
        } catch (error: any) {
            alert("Hata: " + error.message)
        } finally {
            setSaving(false)
        }
    }

    const filteredHistory = history.filter(h => 
        h.material_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        h.request_no?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="flex flex-col gap-6 md:gap-8 max-w-[1400px] mx-auto w-full font-sans pb-10">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 md:gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm flex-1">
                    <div className="bg-gradient-to-br from-slate-600 to-slate-800 p-3 md:p-4 rounded-xl md:rounded-2xl shadow-lg shadow-slate-500/30 shrink-0">
                        <History className="h-6 w-6 md:h-8 md:w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-3xl font-black tracking-tight text-slate-900">Sipariş Geçmişi</h1>
                        <p className="text-slate-500 font-medium text-xs md:text-sm mt-1">Gelen ve tamamlanmış siparişlerin kalıcı arşivi.</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input placeholder="Malzeme veya Talep No..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-12 md:h-14 bg-white/80 border-slate-200 text-sm font-bold text-slate-700 shadow-sm rounded-xl focus:ring-2 focus:ring-slate-500 w-full" />
                    </div>
                    <Button onClick={() => setIsManualModalOpen(true)} className="h-12 md:h-14 px-6 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                        <PlusCircle className="h-4 w-4" /> Eski Kayıt Gir
                    </Button>
                </div>
            </div>

            <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-sm rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden w-full">
                <div className="overflow-x-auto custom-scrollbar p-2">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-white/40 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Tarih</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Talep No</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Malzeme & Detay</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Miktar</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Durum</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50">
                            {filteredHistory.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-slate-300" />
                                            <span className="font-bold text-slate-600 text-sm">{new Date(item.created_at).toLocaleDateString('tr-TR')}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">{item.request_no}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-800 text-sm">{item.material_name}</span>
                                            {item.description && <span className="text-[10px] font-bold text-slate-500 mt-0.5 max-w-[250px] truncate">{item.description}</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center"><span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm font-black border border-blue-100">{item.quantity} Adet</span></td>
                                    <td className="px-6 py-4 text-right">
                                        {item.status === 'GELDI' ? (
                                            <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">DEPOYA GİRDİ</span>
                                        ) : (
                                            <span className="bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">İPTAL EDİLDİ</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredHistory.length === 0 && !loading && (
                                <tr><td colSpan={5} className="py-20 text-center"><div className="flex flex-col items-center gap-3"><div className="bg-white p-5 rounded-full shadow-sm"><PackageOpen className="h-10 w-10 text-slate-300" /></div><p className="text-lg font-bold text-slate-500">Arşivde kayıt bulunmuyor.</p></div></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
                <DialogContent className="rounded-[2rem] p-6 md:p-8 max-w-md border-none shadow-2xl">
                    <DialogHeader className="mb-4"><DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2"><History className="h-6 w-6 text-slate-500"/> Geçmişe Kayıt Gir</DialogTitle></DialogHeader>
                    <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kayıt Tarihi</Label>
                            <Input required type="date" value={manualForm.created_at} onChange={e=>setManualForm({...manualForm, created_at: e.target.value})} className="h-12 rounded-xl border-slate-200 font-bold text-sm" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Malzeme Adı</Label>
                            <Input required placeholder="Örn: Eski Kablo" value={manualForm.material_name} onChange={e=>setManualForm({...manualForm, material_name: e.target.value})} className="h-12 rounded-xl border-slate-200 font-bold text-sm" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alınan Miktar</Label>
                            <Input required type="number" min="1" value={manualForm.quantity} onChange={e=>setManualForm({...manualForm, quantity: e.target.value})} className="h-12 rounded-xl border-slate-200 font-bold text-sm" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Açıklama (İsteğe Bağlı)</Label>
                            <Input value={manualForm.description} onChange={e=>setManualForm({...manualForm, description: e.target.value})} className="h-12 rounded-xl border-slate-200 text-sm" />
                        </div>
                        <Button type="submit" disabled={saving} className="w-full h-14 mt-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black shadow-xl">
                            {saving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />} {saving ? "KAYDEDİLİYOR..." : "ARŞİVE EKLE"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}