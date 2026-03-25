"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useParams, useRouter } from "next/navigation"
import { Loader2, Printer, ArrowLeft } from "lucide-react"

export default function PrintInvoicePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [invoice, setInvoice] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
      fetchInvoice()
  }, [])

  const fetchInvoice = async () => {
      if (!params.id) return;
      const { data: invData } = await supabase.from('finance_invoices').select('*').eq('id', params.id).single()
      const { data: itemsData } = await supabase.from('finance_invoice_items').select('*').eq('invoice_id', params.id)
      
      if (invData) setInvoice(invData)
      if (itemsData) setItems(itemsData)
      setLoading(false)
  }

  // Yükleme ekranı
  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="animate-spin h-10 w-10 text-blue-600" /></div>
  if (!invoice) return <div className="flex h-screen items-center justify-center">Belge bulunamadı.</div>

  const isFatura = invoice.document_type === 'FATURA'

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-10 print:py-0 print:bg-white font-sans text-slate-800">
        
        {/* YAZDIRMA KONTROL PANELİ (Sadece Ekranda Görünür, Kağıtta Çıkmaz) */}
        <div className="w-[210mm] flex justify-between items-center mb-6 print:hidden">
            <button onClick={() => router.back()} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 shadow-sm">
                <ArrowLeft className="h-4 w-4" /> Geri Dön
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm">
                <Printer className="h-4 w-4" /> PDF Olarak Kaydet / Yazdır
            </button>
        </div>

        {/* A4 KAĞIT ŞABLONU */}
        <div className="w-[210mm] min-h-[297mm] bg-white shadow-xl print:shadow-none p-[15mm] relative box-border">
            
            {/* ÜST ANTET (Şirket Bilgileriniz) */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900">BUVİSAN</h1>
                    <h2 className="text-sm font-bold tracking-widest text-slate-500 mt-1">VİNÇ SİSTEMLERİ SAN. TİC. A.Ş.</h2>
                    <div className="text-[10px] text-slate-500 mt-4 leading-relaxed">
                        <p>Nilüfer Organize Sanayi Bölgesi (NOSAB)</p>
                        <p>Bursa, Türkiye</p>
                        <p>Tel: +90 (224) 123 45 67</p>
                        <p>Vergi Dairesi: Nilüfer / V.N: 1234567890</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-3xl font-black text-slate-300 uppercase tracking-widest">{isFatura ? 'E-FATURA' : 'E-İRSALİYE'}</h2>
                    <div className="mt-4 flex flex-col gap-1 text-sm">
                        <p><span className="font-bold text-slate-400">Tarih:</span> <span className="font-black">{new Date(invoice.issue_date).toLocaleDateString('tr-TR')}</span></p>
                        <p><span className="font-bold text-slate-400">Belge No:</span> <span className="font-mono font-black">{invoice.document_no}</span></p>
                    </div>
                </div>
            </div>

            {/* MÜŞTERİ BİLGİLERİ */}
            <div className="bg-slate-50 p-6 rounded-xl mb-8 border border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-200 pb-2">Sayın / To</h3>
                <p className="text-lg font-black text-slate-900 uppercase leading-tight mb-2">{invoice.customer_name}</p>
                <div className="text-xs text-slate-600 space-y-1">
                    <p><span className="font-bold">Adres:</span> {invoice.address || "Belirtilmemiş"}</p>
                    <p><span className="font-bold">Vergi Dairesi:</span> {invoice.tax_office || "-"}</p>
                    <p><span className="font-bold">Vergi/TC No:</span> {invoice.tax_number || "-"}</p>
                </div>
            </div>

            {/* ÜRÜN KALEMLERİ TABLOSU */}
            <table className="w-full text-sm text-left mb-8 border-collapse">
                <thead>
                    <tr className="border-b-2 border-slate-900 text-slate-900">
                        <th className="py-3 px-2 font-black uppercase text-[10px] tracking-widest">Sıra</th>
                        <th className="py-3 px-2 font-black uppercase text-[10px] tracking-widest">Hizmet / Ürün Açıklaması</th>
                        <th className="py-3 px-2 font-black uppercase text-[10px] tracking-widest text-center">Miktar</th>
                        <th className="py-3 px-2 font-black uppercase text-[10px] tracking-widest text-right">Birim Fiyat</th>
                        <th className="py-3 px-2 font-black uppercase text-[10px] tracking-widest text-center">KDV</th>
                        <th className="py-3 px-2 font-black uppercase text-[10px] tracking-widest text-right">Tutar</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => (
                        <tr key={item.id} className="text-slate-700">
                            <td className="py-4 px-2 font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-4 px-2 font-bold">{item.description}</td>
                            <td className="py-4 px-2 text-center font-bold">{item.quantity}</td>
                            <td className="py-4 px-2 text-right tabular-nums">{item.unit_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                            <td className="py-4 px-2 text-center text-slate-500">%{item.tax_rate}</td>
                            <td className="py-4 px-2 text-right font-black tabular-nums">{item.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* TOPLAM HESAPLAMALAR */}
            <div className="flex justify-end mt-10">
                <div className="w-72 bg-slate-50 rounded-xl p-5 border border-slate-200">
                    <div className="flex justify-between items-center mb-2 text-sm">
                        <span className="font-bold text-slate-500">Ara Toplam:</span>
                        <span className="font-black tabular-nums">{invoice.sub_total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                    </div>
                    <div className="flex justify-between items-center mb-4 text-sm pb-4 border-b border-slate-200">
                        <span className="font-bold text-slate-500">Hesaplanan KDV:</span>
                        <span className="font-black tabular-nums">{invoice.tax_total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                    </div>
                    <div className="flex justify-between items-end">
                        <span className="font-black text-slate-900 uppercase tracking-widest text-[11px]">Genel Toplam</span>
                        <span className="font-black text-2xl text-slate-900 tabular-nums tracking-tight">{invoice.grand_total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                    </div>
                </div>
            </div>

            {/* ALT BİLGİ VE İMZA ALANI */}
            <div className="absolute bottom-[15mm] left-[15mm] right-[15mm]">
                {invoice.notes && (
                    <div className="mb-10 text-xs text-slate-600 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <span className="font-bold uppercase tracking-widest text-[10px] block mb-1">Açıklama / Not:</span>
                        {invoice.notes}
                    </div>
                )}
                
                <div className="flex justify-between items-end border-t-2 border-slate-100 pt-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <div>Bu belge elektronik olarak <br/> Buvisan ERP sistemi üzerinden oluşturulmuştur.</div>
                    <div className="text-center">
                        <div className="w-48 border-b border-slate-300 mb-2"></div>
                        Teslim Eden / Yetkili İmza
                    </div>
                </div>
            </div>

        </div>
    </div>
  )
}