"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
    Calculator, Trash2, Loader2, Users, FileText, 
    Search, Briefcase, Save, PlusCircle, UserPlus, Table, Landmark, AlertCircle, FileDown
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]
const CURRENT_MONTH = new Date().getMonth() + 1
const CURRENT_YEAR = new Date().getFullYear()

export default function PayrollPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<"puantaj" | "personel">("puantaj")
    const [searchTerm, setSearchTerm] = useState("")

    // PERSONEL STATELERİ
    const [personnel, setPersonnel] = useState<any[]>([])
    const [isAddPersonModalOpen, setIsAddPersonModalOpen] = useState(false)
    const [personForm, setPersonForm] = useState({ full_name: "", tc_no: "", iban: "", department: "", base_salary: "" })
    const [savingPerson, setSavingPerson] = useState(false)

    // PUANTAJ (EXCEL) STATELERİ
    const [periodMonth, setPeriodMonth] = useState(CURRENT_MONTH)
    const [periodYear, setPeriodYear] = useState(CURRENT_YEAR)
    const [payrollGrid, setPayrollGrid] = useState<any[]>([])
    const [savingGrid, setSavingGrid] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    useEffect(() => {
        fetchPersonnel()
    }, [])

    useEffect(() => {
        if (activeTab === "puantaj") {
            fetchPayrollGrid()
        }
    }, [periodMonth, periodYear, activeTab])

    const fetchPersonnel = async () => {
        const { data } = await supabase.from('fin_personnel').select('*').order('full_name')
        if (data) setPersonnel(data)
    }

    const savePersonnel = async (e: React.FormEvent) => {
        e.preventDefault()
        setSavingPerson(true)
        try {
            const { error } = await supabase.from('fin_personnel').insert([{
                ...personForm, base_salary: Number(personForm.base_salary) || 0
            }])
            if (error) throw error
            alert("✅ Personel başarıyla finans sistemine eklendi!")
            setPersonForm({ full_name: "", tc_no: "", iban: "", department: "", base_salary: "" })
            setIsAddPersonModalOpen(false)
            fetchPersonnel()
        } catch (error: any) { alert("Hata: " + error.message) } 
        finally { setSavingPerson(false) }
    }

    const deletePersonnel = async (id: number) => {
        if(!confirm("DİKKAT: Bu personeli silerseniz geçmiş puantaj kayıtları da tamamen silinir! Emin misiniz?")) return;
        await supabase.from('fin_personnel').delete().eq('id', id)
        fetchPersonnel()
        fetchPayrollGrid()
    }

    const fetchPayrollGrid = async () => {
        setLoading(true)
        const { data, error } = await supabase.from('fin_payroll')
            .select(`*, fin_personnel(full_name, department, base_salary)`)
            .eq('period_month', periodMonth)
            .eq('period_year', periodYear)
            .order('created_at', { ascending: true })

        if (data) setPayrollGrid(data)
        setHasChanges(false)
        setLoading(false)
    }

    const startNewPeriod = async () => {
        if(!confirm(`${MONTHS[periodMonth-1]} ${periodYear} dönemi için puantaj tablosu oluşturulacak. Onaylıyor musunuz?`)) return;
        setLoading(true)
        
        const { data: activePers } = await supabase.from('fin_personnel').select('*').eq('is_active', true)
        if (!activePers || activePers.length === 0) {
            alert("Sistemde kayıtlı personel yok! Önce personel ekleyin."); setLoading(false); return;
        }

        const newRecords = activePers.map(p => ({
            personnel_id: p.id, period_month: periodMonth, period_year: periodYear,
            work_days: 30, overtime_15x: 0, overtime_20x: 0, missing_days: 0, advance_payment: 0, additions: 0,
            net_salary: p.base_salary, status: 'HESAPLANDI'
        }))

        const { error } = await supabase.from('fin_payroll').insert(newRecords)
        if (error) alert("Hata: " + error.message)
        else fetchPayrollGrid()
    }

    const handleCellChange = (index: number, field: string, value: string) => {
        const val = Number(value) || 0
        const updatedGrid = [...payrollGrid]
        updatedGrid[index][field] = val

        const row = updatedGrid[index]
        const baseSalary = Number(row.fin_personnel?.base_salary) || 0
        
        const dailyRate = baseSalary / 30
        const hourlyRate = dailyRate / 7.5
        
        const ot15 = Number(row.overtime_15x) * (hourlyRate * 1.5)
        const ot20 = Number(row.overtime_20x) * (hourlyRate * 2.0)
        const missingCut = Number(row.missing_days) * dailyRate
        const advance = Number(row.advance_payment)
        const adds = Number(row.additions)

        updatedGrid[index].net_salary = baseSalary + ot15 + ot20 - missingCut - advance + adds
        
        setPayrollGrid(updatedGrid)
        setHasChanges(true)
    }

    const saveBulkGrid = async () => {
        setSavingGrid(true)
        try {
            const updatePromises = payrollGrid.map(row => 
                supabase.from('fin_payroll').update({
                    work_days: row.work_days, overtime_15x: row.overtime_15x, overtime_20x: row.overtime_20x,
                    missing_days: row.missing_days, advance_payment: row.advance_payment, additions: row.additions,
                    net_salary: row.net_salary
                }).eq('id', row.id)
            )

            await Promise.all(updatePromises)
            alert("✅ Tüm puantaj değişiklikleri başarıyla kaydedildi!")
            setHasChanges(false)
        } catch (error: any) {
            alert("Kayıt sırasında bir hata oluştu: " + error.message)
        } finally {
            setSavingGrid(false)
        }
    }

    const formatMoney = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val)
    const grandTotalNet = payrollGrid.reduce((sum, row) => sum + Number(row.net_salary), 0)

    const filteredPersonnel = personnel.filter(p => p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()))

    return (
        <div className="flex flex-col gap-6 md:gap-8 max-w-[1600px] mx-auto w-full font-sans pb-10">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 md:gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm flex-1">
                    <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-3 md:p-4 rounded-xl md:rounded-2xl shadow-lg shadow-emerald-500/30 shrink-0">
                        <Landmark className="h-6 w-6 md:h-8 md:w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-3xl font-black tracking-tight text-slate-900">İzole Finans & Bordro</h1>
                        <p className="text-slate-500 font-medium text-xs md:text-sm mt-1">Muhasebeye özel personel ve maaş yönetim ekranı.</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 bg-white/60 backdrop-blur-2xl border border-white/50 p-1.5 md:p-2 rounded-2xl shadow-sm shrink-0">
                    <button onClick={() => setActiveTab("puantaj")} className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'puantaj' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
                        <Table className="h-4 w-4" /> Puantaj Tablosu
                    </button>
                    <button onClick={() => setActiveTab("personel")} className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'personel' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
                        <Users className="h-4 w-4" /> Finansal Personel Listesi
                    </button>
                </div>
            </div>

            <div className="relative w-full">
                
                {activeTab === "personel" && (
                    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center justify-between">
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input placeholder="Personel Ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-11 h-12 bg-white border-slate-200 text-sm font-bold rounded-xl shadow-sm w-full" />
                            </div>
                            <Button onClick={() => setIsAddPersonModalOpen(true)} className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md rounded-xl">
                                <UserPlus className="h-4 w-4 mr-2" /> Yeni Personel Tanımla
                            </Button>
                        </div>

                        <div className="bg-white/80 border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead className="bg-slate-100/50">
                                    <tr>
                                        <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Ad Soyad</th>
                                        <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Departman</th>
                                        <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">TC Kimlik</th>
                                        <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Kök Maaş</th>
                                        <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Banka / IBAN</th>
                                        <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px] text-right">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredPersonnel.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 font-black text-slate-800">{p.full_name}</td>
                                            <td className="px-6 py-4 font-bold text-slate-500">{p.department || "-"}</td>
                                            <td className="px-6 py-4 font-mono text-slate-400 text-xs">{p.tc_no || "-"}</td>
                                            <td className="px-6 py-4 font-black text-emerald-700 tabular-nums">{formatMoney(p.base_salary)}</td>
                                            <td className="px-6 py-4 font-mono text-xs text-slate-500 truncate max-w-[200px]">{p.iban || "-"}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => deletePersonnel(p.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredPersonnel.length === 0 && (<tr><td colSpan={6} className="py-10 text-center text-slate-400 font-bold">Personel kaydı bulunmuyor.</td></tr>)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === "puantaj" && (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
                        
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/80 p-4 rounded-[1.5rem] border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3">
                                <Label className="text-xs font-black text-slate-500 uppercase tracking-widest shrink-0">Bordro Dönemi:</Label>
                                <select value={periodMonth} onChange={e=>setPeriodMonth(Number(e.target.value))} className="h-10 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 px-3 outline-none focus:ring-2 focus:ring-emerald-500">
                                    {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                                </select>
                                <Input type="number" value={periodYear} onChange={e=>setPeriodYear(Number(e.target.value))} className="h-10 w-24 rounded-xl bg-slate-50 border-slate-200 font-bold text-slate-800 text-center" />
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <Button variant="outline" className="h-10 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50 w-full md:w-auto">
                                    <FileDown className="h-4 w-4 mr-2" /> Excel İndir
                                </Button>
                                {hasChanges && (
                                    <Button onClick={saveBulkGrid} disabled={savingGrid} className="h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-500/20 w-full md:w-auto animate-pulse">
                                        {savingGrid ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Kaydet
                                    </Button>
                                )}
                            </div>
                        </div>

                        {loading ? (
                            <div className="h-64 flex items-center justify-center"><Loader2 className="h-10 w-10 text-emerald-500 animate-spin" /></div>
                        ) : payrollGrid.length === 0 ? (
                            <div className="bg-white/80 border border-slate-200 rounded-[2rem] p-10 flex flex-col items-center justify-center text-center shadow-sm">
                                <div className="bg-slate-50 p-5 rounded-full mb-4"><AlertCircle className="h-10 w-10 text-amber-400" /></div>
                                <h3 className="text-lg font-black text-slate-800 mb-2">{MONTHS[periodMonth-1]} {periodYear} Dönemi İçin Kayıt Yok</h3>
                                <p className="text-sm font-medium text-slate-500 mb-6">Bu ay için henüz puantaj tablosu oluşturulmamış.</p>
                                <Button onClick={startNewPeriod} className="h-14 px-8 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black shadow-lg">
                                    <Calculator className="h-5 w-5 mr-2" /> Bu Ayın Tablosunu Başlat
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <div className="bg-white border border-slate-200 rounded-[1.5rem] shadow-xl overflow-hidden">
                                    <div className="overflow-x-auto custom-scrollbar">
                                        <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1200px]">
                                            <thead className="bg-[#1e293b] text-white">
                                                <tr>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest border-r border-slate-700">Personel Adı</th>
                                                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-center border-r border-slate-700 w-24">Çalıştığı Gün</th>
                                                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-center border-r border-slate-700 w-28 text-blue-300">N. Mesai (Saat)</th>
                                                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-center border-r border-slate-700 w-28 text-amber-300">P. Mesai (Saat)</th>
                                                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-center border-r border-slate-700 w-28 text-rose-300">Eksik (Gün)</th>
                                                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-center border-r border-slate-700 w-28 text-rose-300">Avans (TL)</th>
                                                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-center border-r border-slate-700 w-28 text-emerald-300">Prim/Ek (TL)</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-right bg-emerald-700">ELE GEÇEN NET (TL)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                {payrollGrid.map((row, idx) => (
                                                    <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                                                        <td className="px-4 py-2 border-r border-slate-200">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black text-slate-800">{row.fin_personnel?.full_name}</span>
                                                                <span className="text-[10px] font-bold text-slate-400">Kök Maaş: {formatMoney(row.fin_personnel?.base_salary)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-0 border-r border-slate-200"><Input type="number" min="0" value={row.work_days} onChange={e=>handleCellChange(idx, 'work_days', e.target.value)} className="h-12 w-full text-center font-bold text-sm border-none focus:ring-0 focus:bg-blue-50 rounded-none shadow-none" /></td>
                                                        <td className="p-0 border-r border-slate-200"><Input type="number" min="0" value={row.overtime_15x} onChange={e=>handleCellChange(idx, 'overtime_15x', e.target.value)} className="h-12 w-full text-center font-black text-blue-600 text-sm border-none focus:ring-0 focus:bg-blue-50 rounded-none shadow-none" /></td>
                                                        <td className="p-0 border-r border-slate-200"><Input type="number" min="0" value={row.overtime_20x} onChange={e=>handleCellChange(idx, 'overtime_20x', e.target.value)} className="h-12 w-full text-center font-black text-amber-600 text-sm border-none focus:ring-0 focus:bg-amber-50 rounded-none shadow-none" /></td>
                                                        <td className="p-0 border-r border-slate-200"><Input type="number" min="0" step="0.5" value={row.missing_days} onChange={e=>handleCellChange(idx, 'missing_days', e.target.value)} className="h-12 w-full text-center font-black text-rose-500 text-sm border-none focus:ring-0 focus:bg-rose-50 rounded-none shadow-none" /></td>
                                                        <td className="p-0 border-r border-slate-200"><Input type="number" min="0" value={row.advance_payment} onChange={e=>handleCellChange(idx, 'advance_payment', e.target.value)} className="h-12 w-full text-center font-bold text-rose-700 text-sm border-none focus:ring-0 focus:bg-rose-50 rounded-none shadow-none" /></td>
                                                        <td className="p-0 border-r border-slate-200"><Input type="number" min="0" value={row.additions} onChange={e=>handleCellChange(idx, 'additions', e.target.value)} className="h-12 w-full text-center font-bold text-emerald-600 text-sm border-none focus:ring-0 focus:bg-emerald-50 rounded-none shadow-none" /></td>
                                                        
                                                        <td className="px-4 py-2 text-right bg-emerald-50/50">
                                                            <span className="text-sm font-black text-emerald-800 tabular-nums">{formatMoney(row.net_salary)}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                
                                <div className="bg-slate-900 rounded-[1.5rem] p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
                                    <div className="flex items-center gap-3 text-slate-400">
                                        <Users className="h-5 w-5" /> <span className="text-sm font-bold">{payrollGrid.length} Personel Kayıtlı</span>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Bu Ay Ödenecek Toplam Tutar:</span>
                                        <span className="text-2xl md:text-4xl font-black text-emerald-400 tabular-nums tracking-tight">{formatMoney(grandTotalNet)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* PERSONEL EKLEME MODALI */}
            <Dialog open={isAddPersonModalOpen} onOpenChange={setIsAddPersonModalOpen}>
                <DialogContent className="rounded-[2rem] p-6 md:p-8 max-w-xl border-none shadow-2xl">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            <UserPlus className="h-6 w-6 text-emerald-600" /> Yeni Finansal Personel Kaydı
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={savePersonnel} className="flex flex-col gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ad Soyad</Label>
                            <Input required placeholder="Örn: Ali Yılmaz" value={personForm.full_name} onChange={e=>setPersonForm({...personForm, full_name: e.target.value})} className="h-12 rounded-xl border-slate-200 shadow-sm font-bold text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Departman</Label>
                                <Input placeholder="Örn: Kaynak" value={personForm.department} onChange={e=>setPersonForm({...personForm, department: e.target.value})} className="h-12 rounded-xl border-slate-200 shadow-sm font-bold text-sm" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded">Kök Maaş (Net)</Label>
                                <Input required type="number" placeholder="25000" value={personForm.base_salary} onChange={e=>setPersonForm({...personForm, base_salary: e.target.value})} className="h-12 rounded-xl border-emerald-200 shadow-sm font-black text-emerald-700 text-sm" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TC Kimlik No</Label>
                            <Input placeholder="11122233344" maxLength={11} value={personForm.tc_no} onChange={e=>setPersonForm({...personForm, tc_no: e.target.value})} className="h-12 rounded-xl border-slate-200 shadow-sm font-mono text-sm" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Banka IBAN</Label>
                            <Input placeholder="TR..." value={personForm.iban} onChange={e=>setPersonForm({...personForm, iban: e.target.value})} className="h-12 rounded-xl border-slate-200 shadow-sm font-mono text-sm" />
                        </div>
                        <Button type="submit" disabled={savingPerson} className="w-full h-14 mt-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black shadow-xl">
                            {savingPerson ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />} {savingPerson ? "KAYDEDİLİYOR..." : "PERSONELİ KAYDET"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

        </div>
    )
}