"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Loader2, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useParams } from "next/navigation"

export default function SalePrintPage() {
  const [sale, setSale] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const params = useParams()

  useEffect(() => {
    const fetchSaleData = async () => {
      // 1. Satış Başlığını Çek
      const { data: saleData } = await supabase
        .from('sales_orders')
        .select('*, customers(*)')
        .eq('id', params.id)
        .single()

      if (saleData) {
        setSale(saleData)
        
        // 2. Satış Kalemlerini Çek
        const { data: itemsData } = await supabase
          .from('sales_order_items')
          .select('*, products(name, sku, categories(name))')
          .eq('order_id', saleData.id)
        
        setItems(itemsData || [])
      }
      setLoading(false)

      // Otomatik Yazdır
      setTimeout(() => {
        window.print()
      }, 800)
    }

    fetchSaleData()
  }, [params.id])

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-gray-400" /></div>
  }

  if (!sale) return <div className="text-center p-10">Satış bulunamadı.</div>

  return (
    <div className="bg-white min-h-screen text-black p-8 max-w-[210mm] mx-auto">
      {/* YAZDIR BUTONU */}
      <div className="print:hidden mb-6 flex justify-end">
        <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Yazdır / PDF İndir
        </Button>
      </div>

      {/* --- BELGE --- */}
      <div className="border border-gray-300 p-8 min-h-[297mm] relative shadow-lg print:shadow-none print:border-0 print:p-0">
        
        {/* BAŞLIK */}
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight uppercase">Buvisan Crane Systems</h1>
                <p className="text-sm text-gray-500">Demirci Mahallesi, Doğan Caddesi No:40</p>
                <p className="text-sm text-gray-500">Nilüfer / BURSA</p>
                <p className="text-sm text-gray-500">Tel: +90 (224) 374 00 01 | Email: info@buvisan.com</p>
            </div>
            <div className="text-right">
                <h2 className="text-3xl font-black text-gray-800">SATIŞ İRSALİYESİ</h2>
                <p className="text-lg font-mono text-gray-600 mt-2">#SLS-{sale.id}</p>
            </div>
        </div>

        {/* BİLGİ KUTULARI */}
        <div className="grid grid-cols-2 gap-8 mb-8">
            {/* SOL: MÜŞTERİ */}
            <div className="border rounded p-4 bg-gray-50 print:bg-transparent print:border-gray-300">
                <h3 className="font-bold text-gray-700 border-b pb-2 mb-2 text-sm uppercase">SAYIN (MÜŞTERİ)</h3>
                <p className="font-bold text-lg">{sale.customers?.name}</p>
                <p className="text-sm">{sale.customers?.contact_person}</p>
                <p className="text-sm">{sale.customers?.phone}</p>
                <p className="text-sm text-gray-500 mt-2">{sale.customers?.address}</p>
                <p className="text-sm font-mono mt-1">VN/TC: {sale.customers?.tax_no}</p>
            </div>

            {/* SAĞ: DETAYLAR */}
            <div className="border rounded p-4 bg-gray-50 print:bg-transparent print:border-gray-300">
                <h3 className="font-bold text-gray-700 border-b pb-2 mb-2 text-sm uppercase">BELGE DETAYLARI</h3>
                <div className="flex justify-between py-1 text-sm">
                    <span className="text-gray-600">Düzenleme Tarihi:</span>
                    <span className="font-semibold">{new Date(sale.sale_date).toLocaleDateString('tr-TR')}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                    <span className="text-gray-600">Durum:</span>
                    <span className="uppercase font-bold">{sale.status}</span>
                </div>
            </div>
        </div>

        {/* TABLO */}
        <div className="mb-8">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gray-100 print:bg-gray-200 border-y-2 border-gray-800 text-gray-700">
                        <th className="py-3 px-4 text-left font-bold">ÜRÜN / HİZMET</th>
                        <th className="py-3 px-4 text-left font-bold">KOD</th>
                        <th className="py-3 px-4 text-right font-bold">MİKTAR</th>
                        <th className="py-3 px-4 text-right font-bold">BİRİM FİYAT</th>
                        <th className="py-3 px-4 text-right font-bold">TUTAR</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {items.map((item) => (
                        <tr key={item.id}>
                            <td className="py-3 px-4">
                                <p className="font-semibold">{item.products?.name}</p>
                            </td>
                            <td className="py-3 px-4 text-gray-500 font-mono">
                                {item.products?.sku}
                            </td>
                            <td className="py-3 px-4 text-right">{item.quantity}</td>
                            <td className="py-3 px-4 text-right">{item.unit_price?.toLocaleString('tr-TR')} ₺</td>
                            <td className="py-3 px-4 text-right font-bold">{(item.quantity * item.unit_price)?.toLocaleString('tr-TR')} ₺</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="border-t-2 border-gray-800">
                        <td colSpan={3}></td>
                        <td className="py-3 px-4 text-right font-bold text-gray-600">GENEL TOPLAM:</td>
                        <td className="py-3 px-4 text-right font-bold text-xl bg-gray-50 print:bg-transparent">
                            {sale.total_amount?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>

        {/* ALT KISIM */}
        <div className="grid grid-cols-2 gap-12 mt-12 pt-8 border-t border-gray-300">
            <div>
                <h4 className="font-bold text-sm mb-2 text-gray-700">TESLİM EDEN</h4>
                <div className="h-20 border-b border-gray-300"></div>
                <p className="text-xs text-gray-400 mt-1">İmza / Kaşe</p>
            </div>
            <div>
                <h4 className="font-bold text-sm mb-2 text-gray-700">TESLİM ALAN</h4>
                <div className="h-20 border-b border-gray-300"></div>
                <p className="text-xs text-gray-400 mt-1">İmza / Kaşe</p>
            </div>
        </div>
        
        <div className="absolute bottom-8 left-8 right-8 text-center text-[10px] text-gray-400">
            Bu belge Buvisan Crane Systems ERP yazılımı ile oluşturulmuştur.
        </div>

      </div>
    </div>
  )
}