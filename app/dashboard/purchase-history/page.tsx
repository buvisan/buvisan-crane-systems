"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { History, Search, PackageOpen, PlusCircle, Save, Loader2, Calendar, Edit2, Trash2, FileText, UploadCloud, File, Printer } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function PurchaseHistoryPage() {
    const supabase = createClient()
    const [historyGroups, setHistoryGroups] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    
    // Manuel Ekleme Stateleri
    const [isManualModalOpen, setIsManualModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [manualForm, setManualForm] = useState<{
        title: string, description: string, created_at: string, file: File | null
    }>({
        title: "", description: "", created_at: new Date().toISOString().split('T')[0], file: null
    })

    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editSaving, setEditSaving] = useState(false)
    const [editForm, setEditForm] = useState<any>(null)

    // 🚀 FORM GÖRÜNTÜLEYİCİ STATELERİ
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
                        status: req.status, created_at: req.created_at, requested_by: req.requested_by, profiles: req.profiles, file_url: req.file_url,
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

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!manualForm.title) return alert("Arşiv başlığı (Malzeme Adı) girmelisiniz.")
        
        setSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            let publicUrl = null; let fileName = null;

            if (manualForm.file) {
                const fileExt = manualForm.file.name.split('.').pop();
                fileName = `ARCHIVE_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('purchase_documents').upload(`archive/${fileName}`, manualForm.file);
                if (uploadError) throw uploadError;
                const { data } = supabase.storage.from('purchase_documents').getPublicUrl(`archive/${fileName}`);
                publicUrl = data.publicUrl;
            }
            
            const requestNo = `MNL-${Date.now().toString().slice(-5)}`
            const { error } = await supabase.from('material_requests').insert([{
                request_no: requestNo, material_name: manualForm.title, quantity: 1, description: manualForm.description,
                priority: 'NORMAL', status: 'GELDI', requested_by: user?.id, created_at: new Date(manualForm.created_at).toISOString(),
                file_url: publicUrl, file_name: fileName ? manualForm.file?.name : null
            }])
            
            if (error) throw error
            alert("✅ Kayıt başarıyla geçmiş arşive eklendi!")
            setIsManualModalOpen(false); setManualForm({ title: "", description: "", created_at: new Date().toISOString().split('T')[0], file: null }); fetchHistory();
        } catch (error: any) { alert("Hata: " + error.message) } 
        finally { setSaving(false) }
    }

    const handleDeleteHistory = async (requestNo: string) => {
        if(!confirm("Bu formu arşiveden tamamen silmek istediğinize emin misiniz?")) return;
        const { error } = await supabase.from('material_requests').delete().eq('request_no', requestNo)
        if (error) alert("Hata: " + error.message); else fetchHistory();
    }

    const filteredHistory = historyGroups.filter(h => 
        h.material_type?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        h.request_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.items[0]?.material_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="flex flex-col gap-6 md:gap-8 max-w-[1400px] mx-auto w-full font-sans pb-10">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 md:gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm flex-1">
                    <div className="bg-gradient-to-br from-slate-600 to-slate-800 p-3 md:p-4 rounded-xl md:rounded-2xl shadow-lg shadow-slate-500/30 shrink-0"><History className="h-6 w-6 md:h-8 md:w-8 text-white" /></div>
                    <div><h1 className="text-xl md:text-3xl font-black tracking-tight text-slate-900">Sipariş Geçmişi</h1><p className="text-slate-500 font-medium text-xs md:text-sm mt-1">Gelen ve tamamlanmış formların kalıcı arşivi.</p></div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                    <div className="relative w-full sm:w-64"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="Başlık veya Talep No..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-12 md:h-14 bg-white/80 border-slate-200 text-sm font-bold text-slate-700 shadow-sm rounded-xl focus:ring-2 focus:ring-slate-500 w-full" /></div>
                    <Button onClick={() => setIsManualModalOpen(true)} className="h-12 md:h-14 px-6 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"><PlusCircle className="h-4 w-4" /> Geçmiş Form / Kayıt Gir</Button>
                </div>
            </div>

            <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-sm rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden w-full">
                <div className="overflow-x-auto custom-scrollbar p-2">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead className="bg-white/40 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Tarih</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Form No</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Sipariş Başlığı / Form</th>
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
                                            <span className="font-black text-slate-800 text-sm">{group.items[0]?.material_name || "Belirtilmedi"}</span>
                                            {group.file_url ? (
                                                <a href={group.file_url} target="_blank" className="flex items-center gap-1.5 text-[10px] font-black uppercase bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg w-max border border-slate-200 hover:bg-slate-800 hover:text-white transition-colors"><FileText className="h-3.5 w-3.5" /> Dışarıdan Yüklenen Arşiv Dosyası</a>
                                            ) : (
                                                <Button onClick={() => openFormViewer(group)} variant="outline" className="h-8 text-[10px] font-black uppercase text-blue-600 border-blue-200 hover:bg-blue-50 w-max"><FileText className="h-3.5 w-3.5 mr-1" /> ZM Metal Formunu Görüntüle</Button>
                                            )}
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

            {/* YENİ MANUEL ARŞİV FORMU YÜKLEME MODALI */}
            <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
                <DialogContent className="rounded-[2rem] p-6 md:p-8 max-w-xl border-none shadow-2xl">
                    <DialogHeader className="mb-4"><DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2"><History className="h-6 w-6 text-slate-500"/> Eski Siparişi Arşive Yükle</DialogTitle></DialogHeader>
                    <form onSubmit={handleManualSubmit} className="flex flex-col gap-5">
                        <div className="space-y-2"><Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kayıt Tarihi (Eski Tarih Seçebilirsiniz)</Label><Input required type="date" value={manualForm.created_at} onChange={e=>setManualForm({...manualForm, created_at: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold text-sm" /></div>
                        <div className="space-y-2"><Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sipariş Başlığı / Firma Adı</Label><Input required placeholder="Örn: XYZ Firması Çelik Alımı" value={manualForm.title} onChange={e=>setManualForm({...manualForm, title: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold text-sm" /></div>
                        <div className="space-y-2"><Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Açıklama / Not</Label><Input placeholder="İsteğe bağlı arşiv notu..." value={manualForm.description} onChange={e=>setManualForm({...manualForm, description: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200 text-sm" /></div>
                        
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Arşivlenecek Sipariş Formu (PDF / Excel)</Label>
                            <div onClick={() => fileInputRef.current?.click()} className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${manualForm.file ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'}`}>
                                <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.xls,.xlsx,.doc,.docx" onChange={(e) => setManualForm({...manualForm, file: e.target.files?.[0] || null})} />
                                <div className={`p-3 rounded-full mb-3 transition-colors ${manualForm.file ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                                    {manualForm.file ? <File className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
                                </div>
                                <span className={`font-black text-sm text-center ${manualForm.file ? 'text-emerald-700' : 'text-slate-700'}`}>{manualForm.file ? "Dosya Hazır" : "Tıkla ve Dosya Seç (İsteğe Bağlı)"}</span>
                                <span className="text-xs font-bold text-slate-400 text-center mt-1 truncate w-full max-w-[300px]">{manualForm.file ? manualForm.file.name : "Maksimum boyut: 10MB"}</span>
                            </div>
                        </div>

                        <Button type="submit" disabled={saving} className="w-full h-14 mt-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black shadow-xl">
                            {saving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />} {saving ? "YÜKLENİYOR..." : "ARŞİVE EKLE"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* 🚀 ZM METAL İSTEK FORMU GÖRÜNÜMÜ (MODAL) */}
            <Dialog open={isFormViewerOpen} onOpenChange={setIsFormViewerOpen}>
                <DialogContent className="max-w-4xl p-0 border-none bg-transparent shadow-none overflow-hidden max-h-screen custom-scrollbar print:overflow-visible">
                    <div className="bg-white text-black border-[3px] border-black w-full mx-auto print:border-none print:w-full" id="printable-form">
                        <div className="flex border-b-[3px] border-black">
                            <div className="w-1/4 border-r-[3px] border-black flex flex-col items-center justify-center p-2 bg-yellow-100/30 print:bg-transparent">
                                <h1 className="font-black text-xl text-center leading-tight">ZM METAL MAKİNA</h1>
                                <h2 className="font-bold text-[10px] text-center leading-tight">İMALAT SANAYİ VE TİC. LTD. ŞTİ.</h2>
                            </div>
                            <div className="w-2/4 border-r-[3px] border-black flex items-center justify-center p-4"><h2 className="text-2xl font-black tracking-widest text-slate-700">MALZEME İSTEK FORMU</h2></div>
                            <div className="w-1/4 flex flex-col text-[11px] font-bold">
                                <div className="flex border-b-[3px] border-black"><span className="w-1/2 border-r-[3px] border-black p-1.5 bg-slate-50 print:bg-transparent">Doküman No</span><span className="w-1/2 p-1.5">SD04.F01</span></div>
                                <div className="flex border-b-[3px] border-black"><span className="w-1/2 border-r-[3px] border-black p-1.5 bg-slate-50 print:bg-transparent">Yayın Tarihi</span><span className="w-1/2 p-1.5">13.12.2017</span></div>
                                <div className="flex border-b-[3px] border-black"><span className="w-1/2 border-r-[3px] border-black p-1.5 bg-slate-50 print:bg-transparent">Revizyon No</span><span className="w-1/2 p-1.5">--</span></div>
                                <div className="flex"><span className="w-1/2 border-r-[3px] border-black p-1.5 bg-slate-50 print:bg-transparent">Revizyon Tarihi</span><span className="w-1/2 p-1.5">--</span></div>
                            </div>
                        </div>
                        <div className="flex border-b-[3px] border-black text-[11px]">
                            <div className="w-1/2 flex flex-col border-r-[3px] border-black">
                                <div className="flex border-b-[3px] border-black"><span className="w-1/2 border-r-[3px] border-black p-1.5 font-black bg-slate-50 print:bg-transparent">Form No</span><span className="w-1/2 p-1.5 font-bold uppercase">{viewingOrderGroup?.request_no}</span></div>
                                <div className="flex border-b-[3px] border-black"><span className="w-1/2 border-r-[3px] border-black p-1.5 font-black bg-slate-50 print:bg-transparent">Proje No</span><span className="w-1/2 p-1.5 font-bold">{viewingOrderGroup?.project_code}</span></div>
                                <div className="flex"><span className="w-1/2 border-r-[3px] border-black p-1.5 font-black bg-slate-50 print:bg-transparent">Tarih</span><span className="w-1/2 p-1.5 font-bold">{viewingOrderGroup?.created_at ? new Date(viewingOrderGroup.created_at).toLocaleDateString('tr-TR') : ''}</span></div>
                            </div>
                            <div className="w-1/2 flex flex-col">
                                <div className="flex border-b-[3px] border-black"><span className="w-1/2 border-r-[3px] border-black p-1.5 font-black bg-slate-50 print:bg-transparent">İstek Yapan Personel</span><span className="w-1/2 p-1.5 font-bold">{viewingOrderGroup?.profiles?.first_name} {viewingOrderGroup?.profiles?.last_name}</span></div>
                                <div className="flex border-b-[3px] border-black"><span className="w-1/2 border-r-[3px] border-black p-1.5 font-black bg-slate-50 print:bg-transparent">İstek Yapan Bölüm</span><span className="w-1/2 p-1.5 font-bold">{viewingOrderGroup?.profiles?.department || "-"}</span></div>
                                <div className="flex"><span className="w-1/2 border-r-[3px] border-black p-1.5 font-black bg-slate-50 print:bg-transparent">Malzeme Cinsi</span><span className="w-1/2 p-1.5 font-bold">{viewingOrderGroup?.material_type}</span></div>
                            </div>
                        </div>
                        <table className="w-full text-xs border-collapse">
                            <thead className="bg-slate-50 print:bg-transparent">
                                <tr className="border-b-[3px] border-black">
                                    <th className="border-r-[3px] border-black p-2 text-center w-12 font-black">No</th><th className="border-r-[3px] border-black p-2 text-left font-black">Ürün Tanımı</th><th className="border-r-[3px] border-black p-2 text-center w-20 font-black">Stok</th><th className="border-r-[3px] border-black p-2 text-center w-24 font-black">Miktar</th><th className="p-2 text-center w-24 font-black">Termin</th>
                                </tr>
                            </thead>
                            <tbody>
                                {viewingOrderGroup?.items?.map((item: any, idx: number) => (
                                    <tr key={idx} className="border-b-[3px] border-black last:border-b-0">
                                        <td className="border-r-[3px] border-black p-2.5 text-center font-bold">{idx + 1}</td><td className="border-r-[3px] border-black p-2.5 font-bold">{item.material_name}</td><td className="border-r-[3px] border-black p-2.5 text-center font-bold">{item.current_stock || 0}</td><td className="border-r-[3px] border-black p-2.5 text-center font-black text-sm">{item.quantity}</td><td className="p-2.5 text-center"></td>
                                    </tr>
                                ))}
                                {[...Array(Math.max(0, 8 - (viewingOrderGroup?.items?.length || 0)))].map((_, i) => (
                                    <tr key={`empty-${i}`} className="border-b-[3px] border-black last:border-b-0 h-10"><td className="border-r-[3px] border-black"></td><td className="border-r-[3px] border-black"></td><td className="border-r-[3px] border-black"></td><td className="border-r-[3px] border-black"></td><td></td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end gap-3 mt-4 print:hidden bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl w-max ml-auto">
                        <Button variant="outline" onClick={() => setIsFormViewerOpen(false)} className="font-bold border-slate-600 text-slate-300 hover:bg-slate-800">Kapat</Button>
                        <Button onClick={() => window.print()} className="bg-blue-500 hover:bg-blue-600 text-white font-black shadow-lg"><Printer className="h-4 w-4 mr-2"/> Yazdır / PDF İndir</Button>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    )
}