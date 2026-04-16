"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
    Calculator, PlusCircle, Trash2, Loader2, Users, FileText, 
    Download, Search, Briefcase, CalendarDays, ArrowRight, FileSpreadsheet
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function PayrollPage() {
    const [records, setRecords] = useState<any[]>([])
    const [personnel, setPersonnel] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    const [isCalcModalOpen, setIsCalcModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    const supabase = createClient()

    // 🚀 CANLI HESAPLAMA STATELERİ
    const [calcForm, setCalcForm] = useState({
        personnel_id: "",
        record_month: new Date().getMonth() + 1,
        record_year: new Date().getFullYear(),
        base_salary: "",
        normal_overtime_hours: "0",
        sunday_overtime_hours: "0",
        leave_hours: "0"
    })

    const [liveResult, setLiveResult] = useState({
        hourlyRate: 0,
        normalOTPay: 0,
        sundayOTPay: 0,
        deduction: 0,
        netEarned: 0
    })

    useEffect(() => {
        fetchData()
    }, [])

    // 🚀 ANLIK MATEMATİK MOTORU
    useEffect(() => {
        const salary = Number(calcForm.base_salary) || 0
        const normalHours = Number(calcForm.normal_overtime_hours) || 0
        const sundayHours = Number(calcForm.sunday_overtime_hours) || 0
        const leaveHours = Number(calcForm.leave_hours) || 0

        // Standart Türkiye Aylık Çalışma Saati = 225 Saat
        const hourlyRate = salary > 0 ? (salary / 225) : 0
        
        // Hafta içi / Cmt mesaisi (1.5 Katı)
        const normalOTPay = normalHours * (hourlyRate * 1.5)
        
        // Pazar mesaisi (2 Katı)
        const sundayOTPay = sundayHours * (hourlyRate * 2.0)
        
        // Eksik / Ücretsiz İzin Kesintisi
        const deduction = leaveHours * hourlyRate

        const netEarned = salary + normalOTPay + sundayOTPay - deduction

        setLiveResult({ hourlyRate, normalOTPay, sundayOTPay, deduction, netEarned })
    }, [calcForm])

    const fetchData = async () => {
        setLoading(true)
        const { data: recData } = await supabase.from('payroll_records').select('*, tracking_personnel(full_name, title)').order('created_at', { ascending: false })
        const { data: perData } = await supabase.from('tracking_personnel').select('*').order('full_name')
        
        if (recData) setRecords(recData)
        if (perData) setPersonnel(perData)
        setLoading(false)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!calcForm.personnel_id) return alert("Lütfen personel seçiniz!")
        if (Number(calcForm.base_salary) <= 0) return alert("Maaş bilgisi 0 olamaz!")

        setSaving(true)
        try {
            const { error } = await supabase.from('payroll_records').insert([{
                personnel_id: Number(calcForm.personnel_id),
                record_month: Number(calcForm.record_month),
                record_year: Number(calcForm.record_year),
                base_salary: Number(calcForm.base_salary),
                normal_overtime_hours: Number(calcForm.normal_overtime_hours),
                sunday_overtime_hours: Number(calcForm.sunday_overtime_hours),
                leave_hours: Number(calcForm.leave_hours),
                net_earned: liveResult.netEarned
            }])

            if (error) throw error
            
            alert("✅ Personel hakedişi başarıyla kaydedildi!")
            setIsCalcModalOpen(false)
            setCalcForm({ personnel_id: "", record_month: new Date().getMonth() + 1, record_year: new Date().getFullYear(), base_salary: "", normal_overtime_hours: "0", sunday_overtime_hours: "0", leave_hours: "0" })
            fetchData()
        } catch (error: any) {
            alert("Hata: " + error.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: number) => {
        if(!confirm("Bu puantaj kaydını silmek istediğinize emin misiniz?")) return;
        await supabase.from('payroll_records').delete().eq('id', id)
        fetchData()
    }

    const formatMoney = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val)
    
    const filteredRecords = records.filter(r => r.tracking_personnel?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]

    return (
        <div className="flex flex-col gap-6 md:gap-8 max-w-[1600px] mx-auto w-full font-sans pb-10">
            
            {/* ÜST BAŞLIK ALANI */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 md:gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm flex-1">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-3 md:p-4 rounded-xl md:rounded-2xl shadow-lg shadow-blue-500/30 shrink-0">
                        <Briefcase className="h-6 w-6 md:h-8 md:w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-3xl font-black tracking-tight text-slate-900">Puantaj ve Hakediş</h1>
                        <p className="text-slate-500 font-medium text-xs md:text-sm mt-1">Personel mesai, izin ve maaş hesaplama merkezi.</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-slate-400" />
                        <Input placeholder="Personel Ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 md:pl-11 h-12 md:h-14 bg-white/80 border-white/50 text-sm font-bold text-slate-700 shadow-sm rounded-xl md:rounded-2xl focus:ring-2 focus:ring-blue-500 w-full" />
                    </div>
                    <Button onClick={() => setIsCalcModalOpen(true)} className="h-12 md:h-14 px-6 md:px-8 bg-blue-600 hover:bg-blue-700 text-white text-sm md:text-base font-bold rounded-xl md:rounded-[2rem] shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2">
                        <Calculator className="h-4 w-4 md:h-5 md:w-5" /> Yeni Puantaj Hesapla
                    </Button>
                </div>
            </div>

            {/* RAPORLAMA BUTONLARI (HAZIRLIK) */}
            <div className="flex items-center justify-end gap-3 w-full">
                <Button variant="outline" className="h-10 text-xs font-bold text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-xl">
                    <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel'e Aktar
                </Button>
                <Button variant="outline" className="h-10 text-xs font-bold text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100 rounded-xl">
                    <FileText className="h-4 w-4 mr-2" /> PDF Çıktısı Al
                </Button>
            </div>

            {/* PUANTAJ TABLOSU */}
            <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden w-full">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
                        <thead className="bg-[#1e293b] text-white">
                            <tr>
                                <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest rounded-tl-xl md:rounded-tl-2xl">Dönem</th>
                                <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest">Personel</th>
                                <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest">Kök Maaş</th>
                                <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-center">H.İçi/Cmt Mesai</th>
                                <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-center text-amber-300">Pazar Mesai</th>
                                <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-center text-rose-300">İzin/Eksik</th>
                                <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest bg-emerald-600">Net Hakediş</th>
                                <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-right rounded-tr-xl md:rounded-tr-2xl">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white/50">
                            {filteredRecords.map((rec) => (
                                <tr key={rec.id} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-black text-slate-500">
                                        <span className="bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{months[rec.record_month - 1]} {rec.record_year}</span>
                                    </td>
                                    <td className="px-4 md:px-6 py-3 md:py-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs md:text-sm font-black text-slate-800">{rec.tracking_personnel?.full_name}</span>
                                            <span className="text-[10px] font-bold text-slate-400">{rec.tracking_personnel?.title || "Personel"}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold text-slate-600 tabular-nums">{formatMoney(rec.base_salary)}</td>
                                    
                                    <td className="px-4 md:px-6 py-3 md:py-4 text-center">
                                        <span className="inline-flex flex-col items-center justify-center bg-blue-50 text-blue-700 px-3 py-1 rounded-xl border border-blue-100">
                                            <span className="text-xs font-black">{rec.normal_overtime_hours} Saat</span>
                                        </span>
                                    </td>
                                    <td className="px-4 md:px-6 py-3 md:py-4 text-center">
                                        <span className="inline-flex flex-col items-center justify-center bg-amber-50 text-amber-700 px-3 py-1 rounded-xl border border-amber-100">
                                            <span className="text-xs font-black">{rec.sunday_overtime_hours} Saat</span>
                                        </span>
                                    </td>
                                    <td className="px-4 md:px-6 py-3 md:py-4 text-center">
                                        <span className="inline-flex flex-col items-center justify-center bg-rose-50 text-rose-700 px-3 py-1 rounded-xl border border-rose-100">
                                            <span className="text-xs font-black">{rec.leave_hours} Saat</span>
                                        </span>
                                    </td>
                                    
                                    <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-black text-emerald-800 bg-emerald-50/50 shadow-inner tabular-nums">{formatMoney(rec.net_earned)}</td>
                                    <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                                        <button onClick={() => handleDelete(rec.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 className="h-5 w-5" /></button>
                                    </td>
                                </tr>
                            ))}
                            {filteredRecords.length === 0 && !loading && (
                                <tr><td colSpan={8} className="py-16 text-center"><div className="flex flex-col items-center gap-3"><div className="bg-slate-50 p-4 rounded-full shadow-sm"><Users className="h-10 w-10 text-slate-300" /></div><p className="text-lg font-bold text-slate-500">Puantaj kaydı bulunmuyor.</p></div></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 🚀 AKILLI HESAPLAMA MODALI */}
            <Dialog open={isCalcModalOpen} onOpenChange={setIsCalcModalOpen}>
                <DialogContent className="rounded-[2rem] p-6 md:p-8 max-w-4xl border-none shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
                    <DialogHeader className="shrink-0 border-b border-slate-100 pb-4 mb-2">
                        <DialogTitle className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            <Calculator className="h-7 w-7 text-blue-600" /> Puantaj ve Hakediş Makinesi
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-6">
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2 md:col-span-1">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dönem (Ay / Yıl)</Label>
                                <div className="flex gap-2">
                                    <select value={calcForm.record_month} onChange={e=>setCalcForm({...calcForm, record_month: Number(e.target.value)})} className="h-12 flex-1 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 px-3 outline-none focus:ring-2 focus:ring-blue-500">
                                        {months.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                                    </select>
                                    <Input type="number" value={calcForm.record_year} onChange={e=>setCalcForm({...calcForm, record_year: Number(e.target.value)})} className="h-12 w-24 rounded-xl bg-slate-50 border-slate-200 font-bold text-slate-700 text-center" />
                                </div>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personel Seçiniz</Label>
                                <select value={calcForm.personnel_id} onChange={e=>setCalcForm({...calcForm, personnel_id: e.target.value})} className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 px-4 outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">-- Listeden Seçin --</option>
                                    {personnel.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.title})</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 grid grid-cols-1 sm:grid-cols-2 gap-6 relative">
                            <div className="space-y-2">
                                <Label className="text-xs font-black text-blue-800 uppercase tracking-widest">Aylık Kök Maaş (TL)</Label>
                                <Input type="number" placeholder="Örn: 25000" value={calcForm.base_salary} onChange={e=>setCalcForm({...calcForm, base_salary: e.target.value})} className="h-14 rounded-xl bg-white border-blue-200 text-lg font-black text-blue-700 shadow-sm" />
                            </div>
                            <div className="flex flex-col justify-center bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hesaplanan Saatlik Ücret</span>
                                <span className="text-xl font-black text-slate-800 tabular-nums">{formatMoney(liveResult.hourlyRate)} <span className="text-xs font-bold text-slate-400">/ saat</span></span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">H.İçi / Cmt Mesai (Saat)</Label>
                                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">1.5x Çarpan</span>
                                </div>
                                <Input type="number" min="0" value={calcForm.normal_overtime_hours} onChange={e=>setCalcForm({...calcForm, normal_overtime_hours: e.target.value})} className="h-12 rounded-xl text-center font-bold text-lg" />
                                <div className="text-right text-xs font-black text-slate-500">+ {formatMoney(liveResult.normalOTPay)}</div>
                            </div>

                            <div className="bg-amber-50/30 p-4 rounded-2xl border border-amber-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Pazar / Tatil Mesai</Label>
                                    <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded">2.0x Çarpan</span>
                                </div>
                                <Input type="number" min="0" value={calcForm.sunday_overtime_hours} onChange={e=>setCalcForm({...calcForm, sunday_overtime_hours: e.target.value})} className="h-12 rounded-xl text-center font-bold text-lg border-amber-300" />
                                <div className="text-right text-xs font-black text-amber-600">+ {formatMoney(liveResult.sundayOTPay)}</div>
                            </div>

                            <div className="bg-rose-50/30 p-4 rounded-2xl border border-rose-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Eksik / İzin (Saat)</Label>
                                    <span className="text-[10px] font-bold bg-rose-200 text-rose-800 px-2 py-0.5 rounded">Kesinti</span>
                                </div>
                                <Input type="number" min="0" value={calcForm.leave_hours} onChange={e=>setCalcForm({...calcForm, leave_hours: e.target.value})} className="h-12 rounded-xl text-center font-bold text-lg border-rose-300" />
                                <div className="text-right text-xs font-black text-rose-600">- {formatMoney(liveResult.deduction)}</div>
                            </div>
                        </div>

                    </div>

                    <div className="shrink-0 mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row items-end md:items-center justify-between gap-4">
                        <div className="bg-slate-900 p-4 rounded-2xl shadow-xl flex items-center justify-between gap-8 w-full md:w-auto min-w-[300px]">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">TOPLAM HAKEDİŞ</span>
                            <span className="text-3xl font-black text-emerald-400 tabular-nums">{formatMoney(liveResult.netEarned)}</span>
                        </div>

                        <Button onClick={handleSave} disabled={saving} className="h-14 px-8 w-full md:w-auto rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-base shadow-lg shadow-blue-500/30 transition-all">
                            {saving ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <ArrowRight className="h-5 w-5 mr-2" />} 
                            {saving ? "KAYDEDİLİYOR..." : "PUANTAJI KAYDET"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    )
}