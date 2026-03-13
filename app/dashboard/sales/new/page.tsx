import { SalesOrderForm } from "@/components/SalesOrderForm"

export default function NewSalePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-blue-950">Yeni Satış İşlemi</h1>
        <p className="text-gray-500 text-sm">Müşteriye yapılan satışları girin ve stoktan düşün.</p>
      </div>

      <SalesOrderForm />
    </div>
  )
}