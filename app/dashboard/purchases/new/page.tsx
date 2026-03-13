import { PurchaseOrderForm } from "@/components/PurchaseOrderForm"

export default function NewPurchasePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-blue-950">Yeni Satın Alma Siparişi</h1>
        <p className="text-gray-500 text-sm">Tedarikçiden alınan ürünleri stoğa işlemek için formu doldurun.</p>
      </div>

      <PurchaseOrderForm />
    </div>
  )
}