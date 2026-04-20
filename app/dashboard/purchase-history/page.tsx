"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { History, Search, PackageOpen, PlusCircle, Save, Loader2, Calendar, Trash2, FileText, Printer } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function PurchaseHistoryPage() {
    const supabase = createClient()
    const [historyGroups, setHistoryGroups] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    
    const [isManualModalOpen, setIsManualModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [manualHeader, setManualHeader] = useState({ project_code: "", material_type: "", created_at: new Date().toISOString().split('T')[0] })
    const [manualItemForm, setManualItemForm] = useState({ material_name: "", current_stock: "0", quantity: "1" })
    const [manualItems, setManualItems] = useState<any[]>([])

    const [isFormViewerOpen, setIsFormViewerOpen] = useState(false)
    const [viewingOrderGroup, setViewingOrderGroup] = useState<any>(null)

    useEffect(() => { fetchHistory() }, [])

    const fetchHistory = async () => {
        setLoading(true)
        const { data } = await supabase.from('material_requests').select('*, profiles(first_name, last_name, department)').in('status', ['GELDI', 'IPTAL']).order('created_at', { ascending: false })
            
        if (data) {
            const grouped = data.reduce((acc: any, req: any) => {
                if (!acc[req.request_no]) {
                    acc[req.request_no] = { 
                        request_no: req.request_no, project_code: req.project_code, material_type: req.description,
                        status: req.status, created_at: req.created_at, requested_by: req.requested_by, profiles: req.profiles,
                        items: [req] 
                    }
                } else { acc[req.request_no].items.push(req) }
                return acc
            }, {})
            setHistoryGroups(Object.values(grouped))
        }
        setLoading(false)
    }

    const openFormViewer = (reqGroup: any) => {
        setViewingOrderGroup(reqGroup)
        setIsFormViewerOpen(true)
    }

    const handleAddManualItem = () => {
        if (!manualItemForm.material_name.trim()) return alert("Malzeme adı girmelisiniz.");
        setManualItems([...manualItems, {...manualItemForm}]);
        setManualItemForm({ material_name: "", current_stock: "0", quantity: "1" });
    }

    const handleManualSubmit = async () => {
        if (!manualHeader.material_type) return alert("Malzeme cinsi girmelisiniz.");
        if (manualItems.length === 0) return alert("En az bir kalem eklemelisiniz.");
        
        setSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const requestNo = `MNL-${Date.now().toString().slice(-5)}`
            const payloads = manualItems.map(item => ({
                request_no: requestNo, 
                project_code: manualHeader.project_code || "-", 
                description: manualHeader.material_type,
                material_name: item.material_name, 
                current_stock: Number(item.current_stock), 
                quantity: Number(item.quantity),
                priority: 'NORMAL', 
                status: 'GELDI',
                requested_by: user?.id,
                created_at: new Date(manualHeader.created_at).toISOString()
            }))

            const { error } = await supabase.from('material_requests').insert(payloads)
            if (error) throw error
            alert("✅ Form başarıyla geçmiş arşive eklendi!")
            setIsManualModalOpen(false); setManualItems([]); setManualHeader({ project_code: "", material_type: "", created_at: new Date().toISOString().split('T')[0] })
            fetchHistory();
        } catch (error: any) { alert("Hata: " + error.message) } 
        finally { setSaving(false) }
    }

    const handleDeleteHistory = async (requestNo: string) => {
        if(!confirm("Bu formu arşivden tamamen silmek istediğinize emin misiniz?")) return;
        const { error } = await supabase.from('material_requests').delete().eq('request_no', requestNo)
        if (error) alert("Hata: " + error.message); else fetchHistory();
    }

    const filteredHistory = historyGroups.filter(h => h.material_type?.toLowerCase().includes(searchTerm.toLowerCase()) || h.request_no?.toLowerCase().includes(searchTerm.toLowerCase()) || h.items.some((i:any) => i.material_name?.toLowerCase().includes(searchTerm.toLowerCase())))

    return (
        <div className="flex flex-col gap-6 md:gap-8 max-w-[1400px] mx-auto w-full font-sans pb-10">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 md:gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm flex-1">
                    <div className="bg-gradient-to-br from-slate-600 to-slate-800 p-3 md:p-4 rounded-xl md:rounded-2xl shadow-lg shadow-slate-500/30 shrink-0"><History className="h-6 w-6 md:h-8 md:w-8 text-white" /></div>
                    <div><h1 className="text-xl md:text-3xl font-black tracking-tight text-slate-900">Sipariş Geçmişi</h1><p className="text-slate-500 font-medium text-xs md:text-sm mt-1">Gelen ve tamamlanmış formların kalıcı arşivi.</p></div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                    <div className="relative w-full sm:w-64"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="Başlık veya Form No..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-12 md:h-14 bg-white/80 border-slate-200 text-sm font-bold text-slate-700 shadow-sm rounded-xl focus:ring-2 focus:ring-slate-500 w-full" /></div>
                    <Button onClick={() => setIsManualModalOpen(true)} className="h-12 md:h-14 px-6 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"><PlusCircle className="h-4 w-4" /> Eski Kayıt Gir</Button>
                </div>
            </div>

            <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-sm rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden w-full">
                <div className="overflow-x-auto custom-scrollbar p-2">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead className="bg-white/40 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Tarih</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Form No</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Malzeme Cinsi & Kapsam</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Durum</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50">
                            {filteredHistory.map((group) => (
                                <tr key={group.request_no} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-300" /><span className="font-bold text-slate-600 text-sm">{new Date(group.created_at).toLocaleDateString('tr-TR')}</span></div></td>
                                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">{group.request_no}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-2">
                                            <span className="font-black text-slate-800 text-sm">{group.material_type || "Belirtilmedi"} <span className="text-xs font-medium text-slate-400">({group.items.length} Kalem)</span></span>
                                            <Button onClick={() => openFormViewer(group)} variant="outline" className="h-8 text-[10px] font-black uppercase text-slate-600 border-slate-200 hover:bg-slate-800 hover:text-white w-max transition-colors"><FileText className="h-3.5 w-3.5 mr-1" /> ZM Metal Formunu Görüntüle</Button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {group.status === 'GELDI' ? <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">DEPOYA GİRDİ</span> : <span className="bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">İPTAL EDİLDİ</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleDeleteHistory(group.request_no)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Formu Arşivden Sil"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredHistory.length === 0 && !loading && (<tr><td colSpan={5} className="py-20 text-center"><div className="flex flex-col items-center gap-3"><div className="bg-white p-5 rounded-full shadow-sm"><PackageOpen className="h-10 w-10 text-slate-300" /></div><p className="text-lg font-bold text-slate-500">Arşivde kayıt bulunmuyor.</p></div></td></tr>)}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* YENİ MANUEL ARŞİV FORMU EKLME MODALI */}
            <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
                <DialogContent className="rounded-[2rem] p-6 md:p-8 max-w-4xl border-none shadow-2xl flex flex-col max-h-[90vh]">
                    <DialogHeader className="shrink-0 mb-4"><DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2"><History className="h-6 w-6 text-slate-500"/> Geçmiş Sipariş Formu Gir</DialogTitle></DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-6">
                        <div className="bg-slate-50/80 border border-slate-200 rounded-[1.5rem] p-4 flex flex-col gap-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2"><Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kayıt Tarihi</Label><Input required type="date" value={manualHeader.created_at} onChange={e=>setManualHeader({...manualHeader, created_at: e.target.value})} className="font-bold border-slate-200 h-11 bg-white" /></div>
                                <div className="space-y-2"><Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Proje No</Label><Input placeholder="Örn: 24-012" value={manualHeader.project_code} onChange={e=>setManualHeader({...manualHeader, project_code: e.target.value})} className="font-bold border-slate-200 h-11 bg-white" /></div>
                                <div className="space-y-2"><Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Malzeme Cinsi</Label><Input required placeholder="Örn: Rulman" value={manualHeader.material_type} onChange={e=>setManualHeader({...manualHeader, material_type: e.target.value})} className="font-bold border-slate-200 h-11 bg-white" /></div>
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-[1.5rem] p-4 flex flex-col gap-4">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="space-y-2 col-span-2 md:col-span-3"><Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Malzeme Adı</Label><Input placeholder="Örn: 6204 Rulman" value={manualItemForm.material_name} onChange={e=>setManualItemForm({...manualItemForm, material_name: e.target.value})} className="font-bold border-slate-200 h-11 bg-white" /></div>
                                <div className="space-y-2 col-span-1"><Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stok</Label><Input type="number" value={manualItemForm.current_stock} onChange={e=>setManualItemForm({...manualItemForm, current_stock: e.target.value})} className="font-bold border-slate-200 h-11 bg-white" /></div>
                                <div className="space-y-2 col-span-1"><Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Miktar</Label><Input type="number" min="1" value={manualItemForm.quantity} onChange={e=>setManualItemForm({...manualItemForm, quantity: e.target.value})} className="font-black text-slate-800 border-slate-200 h-11 bg-white" /></div>
                            </div>
                            <Button type="button" onClick={handleAddManualItem} className="w-full h-11 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-xl"><PlusCircle className="h-4 w-4 mr-2" /> LİSTEYE EKLE</Button>
                        </div>

                        {manualItems.length > 0 && (
                            <div className="border border-slate-200 rounded-2xl overflow-hidden">
                                <table className="w-full text-left text-xs md:text-sm">
                                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold"><tr><th className="px-3 py-3">Ürün Tanımı</th><th className="px-3 py-3 text-center">Stok</th><th className="px-3 py-3 text-center">Miktar</th><th className="px-3 py-3 text-right">Sil</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {manualItems.map((item, index) => (
                                            <tr key={index} className="bg-white">
                                                <td className="px-3 py-3 font-bold text-slate-800">{item.material_name}</td><td className="px-3 py-3 font-medium text-slate-600 text-center">{item.current_stock}</td><td className="px-3 py-3 font-black text-slate-800 text-center">{item.quantity} ADET</td>
                                                <td className="px-3 py-3 text-right"><button onClick={() => {const ni=[...manualItems]; ni.splice(index,1); setManualItems(ni)}} className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"><Trash2 className="h-4 w-4" /></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    <div className="shrink-0 pt-4 mt-2 border-t border-slate-100">
                        <Button onClick={handleManualSubmit} disabled={saving || manualItems.length === 0} className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-black text-base rounded-xl shadow-xl">
                            {saving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />} {saving ? "EKLENİYOR..." : "ARŞİVE EKLE"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* 🚀 KUSURSUZ ZM METAL İSTEK FORMU GÖRÜNÜMÜ */}
            <Dialog open={isFormViewerOpen} onOpenChange={setIsFormViewerOpen}>
                <DialogContent className="w-[95vw] max-w-4xl p-0 border-none bg-white shadow-2xl flex flex-col h-[90vh] max-h-[90vh] z-[200] overflow-hidden print:w-full print:max-w-none print:h-auto print:max-h-none print:shadow-none print:block print:p-0 print:m-0">
                    
                    <style>{`
                        @media print {
                            @page { size: A4 portrait; margin: 10mm; }
                            body * { visibility: hidden !important; }
                            #printable-form, #printable-form * { visibility: visible !important; border-color: black !important; color: black !important; }
                            #printable-form { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; padding: 0 !important; zoom: 1.20 !important; }
                            .print\\:hidden, .print\\:hidden * { display: none !important; visibility: hidden !important; }
                        }
                    `}</style>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 bg-slate-50 print:bg-white print:p-0 w-full">
                        <div className="bg-white text-black border-[3px] border-black w-full min-w-[700px] mx-auto shadow-sm print:shadow-none print:min-w-0" id="printable-form">
                            <table className="w-full border-collapse border border-black mb-4">
                                <tbody>
                                    <tr>
                                        <td className="border border-black w-1/4 p-2 text-center align-middle"><Image src="/buvisan.png" alt="Buvisan Logo" width={150} height={50} className="mx-auto object-contain" /></td>
                                        <td className="border border-black w-2/4 text-center align-middle"><h2 className="text-xl font-bold tracking-widest text-slate-800 uppercase">MALZEME İSTEK FORMU</h2></td>
                                        <td className="border border-black w-1/4 p-0 align-top text-[11px]">
                                            <table className="w-full h-full border-collapse">
                                                <tbody>
                                                    <tr><td className="border-b border-r border-black p-1.5 text-slate-700 font-bold bg-slate-50 print:bg-transparent">Doküman No</td><td className="border-b border-black p-1.5 font-bold text-blue-700 uppercase">DOC-{viewingOrderGroup?.request_no?.split('-')[1] || '001'}</td></tr>
                                                    <tr><td className="border-b border-r border-black p-1.5 text-slate-700 font-bold bg-slate-50 print:bg-transparent">Yayın Tarihi</td><td className="border-b border-black p-1.5 font-bold text-slate-900">{viewingOrderGroup?.created_at ? new Date(viewingOrderGroup.created_at).toLocaleDateString('tr-TR') : ''}</td></tr>
                                                    <tr><td className="border-b border-r border-black p-1.5 text-slate-700 font-bold bg-slate-50 print:bg-transparent">Revizyon No</td><td className="border-b border-black p-1.5 font-bold">00</td></tr>
                                                    <tr><td className="border-r border-black p-1.5 text-slate-700 font-bold bg-slate-50 print:bg-transparent">Revizyon Tarihi</td><td className="p-1.5 font-bold">--</td></tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            <table className="w-full border-collapse border border-black mb-4 text-[11px]">
                                <tbody>
                                    <tr><td className="border border-black p-2 font-bold w-1/4 bg-slate-50 print:bg-transparent text-slate-700">Malzeme İstek Formu No</td><td className="border border-black p-2 w-1/4 font-black uppercase text-slate-900">{viewingOrderGroup?.request_no}</td><td className="border border-black p-2 font-bold w-1/4 bg-slate-50 print:bg-transparent text-slate-700">İstek Yapan Personel</td><td className="border border-black p-2 font-black w-1/4 uppercase text-slate-900">{viewingOrderGroup?.profiles?.first_name} {viewingOrderGroup?.profiles?.last_name}</td></tr>
                                    <tr><td className="border border-black p-2 font-bold bg-slate-50 print:bg-transparent text-slate-700">Proje No</td><td className="border border-black p-2 font-black text-slate-900">{viewingOrderGroup?.project_code}</td><td className="border border-black p-2 font-bold bg-slate-50 print:bg-transparent text-slate-700">İstek Yapan Bölüm</td><td className="border border-black p-2 font-black uppercase text-slate-900">{viewingOrderGroup?.profiles?.department || "-"}</td></tr>
                                    <tr><td className="border border-black p-2 font-bold bg-slate-50 print:bg-transparent text-slate-700">Tarih</td><td className="border border-black p-2 font-black text-slate-900">{viewingOrderGroup?.created_at ? new Date(viewingOrderGroup.created_at).toLocaleDateString('tr-TR') : ''}</td><td className="border border-black p-2 font-bold bg-slate-50 print:bg-transparent text-slate-700">Malzeme Cinsi</td><td className="border border-black p-2 font-black text-slate-900">{viewingOrderGroup?.material_type || viewingOrderGroup?.description || "-"}</td></tr>
                                </tbody>
                            </table>

                            <table className="w-full text-xs border-collapse border border-black">
                                <thead>
                                    <tr className="bg-slate-50 print:bg-transparent text-slate-800"><th className="border border-black p-2 text-center w-12 font-bold">No</th><th className="border border-black p-2 text-left pl-3 font-bold">Ürün Tanımı</th><th className="border border-black p-2 text-center w-20 font-bold">Stok</th><th className="border border-black p-2 text-center w-28 font-bold">Miktar</th><th className="border border-black p-2 text-center w-32 font-bold">Termin</th></tr>
                                </thead>
                                <tbody>
                                    {viewingOrderGroup?.items?.map((item: any, idx: number) => (
                                        <tr key={idx} className="h-8"><td className="border border-black p-2 text-center font-bold text-slate-800">{idx + 1}</td><td className="border border-black p-2 pl-3 font-black text-slate-900">{item.material_name}</td><td className="border border-black p-2 text-center font-bold text-slate-800">{item.current_stock || 0}</td><td className="border border-black p-2 text-center font-black text-sm text-slate-900">{item.quantity} ADET</td><td className="border border-black p-2 text-center"></td></tr>
                                    ))}
                                    {[...Array(Math.max(0, 10 - (viewingOrderGroup?.items?.length || 0)))].map((_, i) => (
                                        <tr key={`empty-${i}`} className="h-8"><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td></tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="mt-4 pb-2 text-right text-[10px] text-slate-500 font-bold">Sayfa 1 / 1</div>
                        </div>
                    </div>

                    <div className="shrink-0 flex justify-end gap-3 p-4 border-t border-slate-200 bg-white print:hidden w-full">
                        <Button variant="outline" onClick={() => setIsFormViewerOpen(false)} className="font-bold border-slate-300 text-slate-600 hover:bg-slate-100 h-12 px-6">Kapat</Button>
                        <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg h-12 px-6"><Printer className="h-4 w-4 mr-2"/> Yazdır / PDF Olarak Kaydet</Button>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    )
}