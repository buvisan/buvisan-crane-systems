"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Loader2, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useParams } from "next/navigation"

export default function PurchasePrintPage() {
  const [order, setOrder] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const params = useParams()

  useEffect(() => {
    const fetchOrderData = async () => {
      // 1. Sipariş Başlığını Çek
      const { data: orderData } = await supabase
        .from('purchase_orders')
        .select('*, suppliers(*)')
        .eq('id', params.id)
        .single()

      if (orderData) {
        setOrder(orderData)
        
        // 2. Sipariş Kalemlerini Çek
        const { data: itemsData } = await supabase
          .from('purchase_order_items')
          .select('*, products(name, sku, categories(name))') // Kategori adını da alalım
          .eq('order_id', orderData.id)
        
        setItems(itemsData || [])
      }
      setLoading(false)

      // 3. Veri geldikten az sonra otomatik yazdır penceresini aç
      setTimeout(() => {
        window.print()
      }, 800)
    }

    fetchOrderData()
  }, [params.id])

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-gray-400" /></div>
  }

  if (!order) return <div className="text-center p-10">Sipariş bulunamadı.</div>

  return (
    <div className="bg-white min-h-screen text-black p-8 max-w-[210mm] mx-auto">
      {/* YAZDIRMA BUTONU (Sadece ekranda görünür, kağıtta gizlenir) */}
      <div className="print:hidden mb-6 flex justify-end">
        <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Yazdır / PDF İndir
        </Button>
      </div>

      {/* --- BELGE BAŞLANGICI --- */}
      <div className="border border-gray-300 p-8 min-h-[297mm] relative shadow-lg print:shadow-none print:border-0 print:p-0">
        
        {/* BAŞLIK (HEADER) */}
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight uppercase">Buvisan Crane Systems</h1>
                <p className="text-sm text-gray-500">Demirci Mahallesi, Doğan Caddesi No:40</p>
                <p className="text-sm text-gray-500">Nilüfer / BURSA</p>
                <p className="text-sm text-gray-500">Tel: +90 (224) 374 00 01 | Email: info@buvisan.com</p>
            </div>
            <div className="text-right">
                <h2 className="text-3xl font-black text-gray-800">SATIN ALMA SİPARİŞİ</h2>
                <p className="text-lg font-mono text-gray-600 mt-2">#{order.id}</p>
            </div>
        </div>

        {/* BİLGİ KUTULARI */}
        <div className="grid grid-cols-2 gap-8 mb-8">
            {/* SOL: TEDARİKÇİ */}
            <div className="border rounded p-4 bg-gray-50 print:bg-transparent print:border-gray-300">
                <h3 className="font-bold text-gray-700 border-b pb-2 mb-2 text-sm uppercase">TEDARİKÇİ FİRMA</h3>
                <p className="font-bold text-lg">{order.suppliers?.name}</p>
                <p className="text-sm">{order.suppliers?.contact_person}</p>
                <p className="text-sm">{order.suppliers?.phone}</p>
                <p className="text-sm text-gray-500 mt-2">{order.suppliers?.address}</p>
                <p className="text-sm font-mono mt-1">VN: {order.suppliers?.tax_no}</p>
            </div>

            {/* SAĞ: SİPARİŞ DETAYLARI */}
            <div className="border rounded p-4 bg-gray-50 print:bg-transparent print:border-gray-300">
                <h3 className="font-bold text-gray-700 border-b pb-2 mb-2 text-sm uppercase">SİPARİŞ BİLGİLERİ</h3>
                <div className="flex justify-between py-1 text-sm">
                    <span className="text-gray-600">Sipariş Tarihi:</span>
                    <span className="font-semibold">{new Date(order.order_date).toLocaleDateString('tr-TR')}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                    <span className="text-gray-600">Termin Tarihi:</span>
                    <span className="font-semibold">{order.deadline ? new Date(order.deadline).toLocaleDateString('tr-TR') : '-'}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                    <span className="text-gray-600">Durum:</span>
                    <span className="uppercase font-bold">{order.status}</span>
                </div>
                 <div className="flex justify-between py-1 text-sm">
                    <span className="text-gray-600">Açıklama:</span>
                    <span className="max-w-[150px] text-right truncate">{order.description || '-'}</span>
                </div>
            </div>
        </div>

        {/* TABLO */}
        <div className="mb-8">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gray-100 print:bg-gray-200 border-y-2 border-gray-800 text-gray-700">
                        <th className="py-3 px-4 text-left font-bold">ÜRÜN / HİZMET</th>
                        <th className="py-3 px-4 text-left font-bold">KATEGORİ/KOD</th>
                        <th className="py-3 px-4 text-right font-bold">MİKTAR</th>
                        <th className="py-3 px-4 text-right font-bold">BİRİM FİYAT</th>
                        <th className="py-3 px-4 text-right font-bold">TOPLAM</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {items.map((item) => (
                        <tr key={item.id}>
                            <td className="py-3 px-4">
                                <p className="font-semibold">{item.products?.name}</p>
                            </td>
                            <td className="py-3 px-4 text-gray-500">
                                {item.products?.categories?.name} <br/>
                                <span className="text-xs font-mono">{item.products?.sku}</span>
                            </td>
                            <td className="py-3 px-4 text-right">{item.quantity}</td>
                            <td className="py-3 px-4 text-right">{item.unit_price?.toLocaleString('tr-TR')} ₺</td>
                            <td className="py-3 px-4 text-right font-bold">{(item.quantity * item.unit_price)?.toLocaleString('tr-TR')} ₺</td>
                        </tr>
                    ))}
                </tbody>
                {/* TOPLAM ALANI */}
                <tfoot>
                    <tr className="border-t-2 border-gray-800">
                        <td colSpan={3}></td>
                        <td className="py-3 px-4 text-right font-bold text-gray-600">GENEL TOPLAM:</td>
                        <td className="py-3 px-4 text-right font-bold text-xl bg-gray-50 print:bg-transparent">
                            {order.total_amount?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>

        {/* ALT NOTLAR VE İMZA */}
        <div className="grid grid-cols-2 gap-12 mt-12 pt-8 border-t border-gray-300">
            <div>
                <h4 className="font-bold text-sm mb-2 text-gray-700">NOTLAR & ŞARTLAR</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                    1. Bu sipariş formu Buvisan Crane Systems tarafından düzenlenmiştir.<br/>
                    2. Ürünlerin faturası kesilirken Sipariş No (#PO-{order.id}) belirtilmelidir.<br/>
                    3. Teslimat adresi aksi belirtilmedikçe yukarıdaki fabrika adresidir.<br/>
                    4. Lütfen termin tarihine riayet ediniz.
                </p>
            </div>
            <div className="flex flex-col justify-between">
                <div className="flex justify-between items-end h-24 border-b border-gray-400 pb-2">
                    <span className="font-bold text-sm">ONAYLAYAN (KAŞE / İMZA)</span>
                    <span className="text-xs text-gray-400">Tarih: ..../..../20....</span>
                </div>
                <p className="text-xs text-center mt-2 text-gray-400">Bu belge elektronik ortamda oluşturulmuştur.</p>
            </div>
        </div>

      </div>
    </div>
  )
}