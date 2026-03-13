"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileText, Loader2, Printer } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import Link from "next/link"

export function PurchaseDetailDialog({ order }: { order: any }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // Pencere açılınca o siparişe ait ürünleri çek
  useEffect(() => {
    if (open) {
        const fetchItems = async () => {
            setLoading(true)
            const { data } = await supabase
                .from('purchase_order_items')
                .select('*, products(name, sku)')
                .eq('order_id', order.id)
            
            setItems(data || [])
            setLoading(false)
        }
        fetchItems()
    }
  }, [open, order.id])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50">
          <FileText className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Sipariş Detayı: PO-{order.id}</DialogTitle>
          <p className="text-sm text-gray-500">Tedarikçi: {order.suppliers?.name}</p>
        </DialogHeader>
        
        <div className="py-4">
            {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-600" /></div>
            ) : (
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50">
                                <TableHead>Ürün</TableHead>
                                <TableHead className="text-right">Miktar</TableHead>
                                <TableHead className="text-right">Birim Fiyat</TableHead>
                                <TableHead className="text-right">Tutar</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <div className="font-medium">{item.products?.name}</div>
                                        <div className="text-xs text-gray-400">{item.products?.sku}</div>
                                    </TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right">{item.unit_price?.toLocaleString('tr-TR')} ₺</TableCell>
                                    <TableCell className="text-right font-medium">
                                        {(item.quantity * item.unit_price)?.toLocaleString('tr-TR')} ₺
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
                
                {/* YAZDIR BUTONU BURAYA GELDİ */}
                <Link href={`/print/purchases/${order.id}`} target="_blank">
                    <Button variant="outline" className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                        <Printer className="h-4 w-4" />
                        Siparişi Yazdır
                    </Button>
                </Link>

                <div className="text-right">
                    <span className="text-sm text-gray-500">Toplam Tutar</span>
                    <div className="text-xl font-bold text-blue-900">
                        {order.total_amount?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </div>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}