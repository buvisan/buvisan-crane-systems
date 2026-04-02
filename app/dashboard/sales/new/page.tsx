import { SalesOrderForm } from "@/components/SalesOrderForm"
import { Tag, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewSalePage() {
  return (
    <div className="flex flex-col gap-6 md:gap-8 font-sans max-w-[1600px] mx-auto w-full pb-10">
      
      {/* 🚀 ÜST BAŞLIK VE GERİ BUTONU */}
      <div className="flex items-center gap-3 md:gap-4">
        <Link href="/dashboard/sales" className="p-2 md:p-3 bg-white/60 hover:bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-200 transition-colors shrink-0">
          <ArrowLeft className="h-5 w-5 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-xl md:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Tag className="h-6 w-6 md:h-8 md:w-8 text-emerald-600 hidden sm:block" />
            Yeni Satış İşlemi
          </h1>
          <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">Müşteriye yapılan satışları girin ve stoktan düşün.</p>
        </div>
      </div>

      {/* 🚀 FORM KAPSAYICISI (Mobilde akıllıca daralır) */}
      <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8">
        <SalesOrderForm />
      </div>
      
    </div>
  )
}