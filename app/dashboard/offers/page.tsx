"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlusCircle, FileText, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function OffersPage() {
  const [offers, setOffers] = useState<any[]>([])
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchOffers()
  }, [])

  const fetchOffers = async () => {
    // Teklifleri ve Müşteri isimlerini çekiyoruz
    const { data } = await supabase
        .from('offers')
        .select('*, customers(name)')
        .order('created_at', { ascending: false })
    
    if (data) setOffers(data)
  }

  const deleteOffer = async (id: number) => {
    if(!confirm("Bu teklifi silmek istediğinize emin misiniz?")) return;
    await supabase.from('offers').delete().eq('id', id)
    fetchOffers()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold tracking-tight text-blue-950">Teklifler & Projeler</h1>
            <p className="text-gray-500 text-sm">Hazırlanan vinç teklifleri ve hesaplamalar.</p>
        </div>
        
        {/* YENİ TEKLİF BUTONU -> Bizi az önce yaptığımız sayfaya götürecek */}
        <Link href="/dashboard/offers/new">
            <Button className="bg-blue-600 hover:bg-blue-700">
                <PlusCircle className="mr-2 h-4 w-4" />
                Yeni Hesaplama Yap
            </Button>
        </Link>
      </div>

      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead>Proje Adı</TableHead>
              <TableHead>Müşteri</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">Tutar</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {offers.map((offer: any) => (
              <TableRow key={offer.id} className="hover:bg-blue-50/50">
                <TableCell className="font-medium text-blue-900">{offer.project_name || 'İsimsiz Proje'}</TableCell>
                <TableCell>{offer.customers?.name || '-'}</TableCell>
                <TableCell>{new Date(offer.created_at).toLocaleDateString('tr-TR')}</TableCell>
                <TableCell>
                    <Badge variant="outline" className={
                        offer.status === 'ONAYLANDI' ? 'bg-green-50 text-green-700 border-green-200' :
                        offer.status === 'REDDEDILDI' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-gray-100 text-gray-600 border-gray-200'
                    }>
                        {offer.status}
                    </Badge>
                </TableCell>
                <TableCell className="text-right font-bold text-gray-700">
                    {offer.total_price?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                </TableCell>
                <TableCell className="text-right flex items-center justify-end gap-1">
                    {/* Detay/Düzenle Butonu (İleride yapacağız) */}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50">
                        <FileText className="h-4 w-4" />
                    </Button>
                    
                    {/* Silme Butonu */}
                    <Button onClick={() => deleteOffer(offer.id)} variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </TableCell>
              </TableRow>
            ))}
            
            {offers.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                            <FileText className="h-8 w-8 text-gray-300" />
                            <p>Henüz kayıtlı teklif yok.</p>
                            <Link href="/dashboard/offers/new" className="text-blue-600 hover:underline text-sm">
                                İlk teklifi oluşturmak için tıklayın.
                            </Link>
                        </div>
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}