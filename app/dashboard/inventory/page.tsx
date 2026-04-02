"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Search, Filter, Trash2, Package, Boxes, AlertOctagon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { AddProductDialog } from "@/components/AddProductDialog"
import { StockMovementDialog } from "@/components/StockMovementDialog"
import { useRouter } from "next/navigation"

function DeleteProductBtn({ id }: { id: number }) {
    const router = useRouter()
    const supabase = createClient()

    const handleDelete = async () => {
        if (confirm("Bu ürünü silmek istediğinize emin misiniz?")) {
            const { error } = await supabase.from("products").delete().eq("id", id)
            if (error) {
                alert("Silinemedi (Hareket görmüş ürünler silinemez): " + error.message)
            } else {
                router.refresh()
            }
        }
    }

    return (
        <button onClick={handleDelete} className="p-2 md:p-2.5 bg-white border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 rounded-lg md:rounded-xl shadow-sm transition-all flex items-center justify-center h-full" title="Ürünü Sil">
            <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
        </button>
    )
}

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"ALL" | "CRITICAL">("ALL")
  
  const supabase = createClient()

  useEffect(() => {
    const fetchProducts = async () => {
        const { data } = await supabase
          .from('products')
          .select(`*, categories ( name ), units ( name, short_code )`)
          .order('id', { ascending: false })
        
        if (data) setProducts(data)
        setLoading(false)
    }
    fetchProducts()
  }, [])

  const filteredProducts = products.filter(p => {
      const matchesSearch = (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (p.sku || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (p.barcode || "").includes(searchTerm);
      const isCritical = p.current_stock <= (p.critical_stock_level || 5);
      const matchesFilter = filterType === "ALL" ? true : isCritical;
      
      return matchesSearch && matchesFilter;
  });

  const renderStockBar = (current: number, critical: number) => {
      const safeCritical = critical || 5;
      const maxVisual = Math.max(current, safeCritical * 4); 
      const percentage = Math.min(100, Math.max(0, (current / maxVisual) * 100));
      
      let colorClass = "bg-emerald-500 shadow-emerald-500/50";
      let bgClass = "bg-emerald-100";
      
      if (current <= safeCritical) {
          colorClass = "bg-rose-500 shadow-rose-500/50 animate-pulse";
          bgClass = "bg-rose-100";
      } else if (current <= safeCritical * 1.5) {
          colorClass = "bg-amber-400 shadow-amber-400/50";
          bgClass = "bg-amber-100";
      }

      return (
          <div className="flex flex-col gap-1 w-24 md:w-32">
              <div className="flex justify-between items-end">
                  <span className={`text-base md:text-lg font-black leading-none ${current <= safeCritical ? 'text-rose-600' : 'text-slate-800'}`}>
                      {current}
                  </span>
              </div>
              <div className={`h-1.5 md:h-2 w-full rounded-full overflow-hidden ${bgClass}`}>
                  <div className={`h-full rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] transition-all duration-1000 ${colorClass}`} style={{ width: `${percentage}%` }}></div>
              </div>
          </div>
      )
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 font-sans w-full pb-10">
      
      {/* 🚀 ÜST BAŞLIK ALANI (Mobil Uyumlu Flex-Col) */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-4 md:gap-5 bg-white/60 backdrop-blur-2xl border border-white/50 p-5 md:p-6 rounded-[2rem] shadow-sm flex-1">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-3 md:p-4 rounded-2xl shadow-lg shadow-blue-500/30 shrink-0">
                <Boxes className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </div>
            <div>
                <h1 className="text-xl md:text-3xl font-black tracking-tight text-slate-900">Merkez Depo Envanteri</h1>
                <p className="text-slate-500 font-medium text-xs md:text-sm mt-1">Tüm stokları, kritik seviyeleri ve giriş/çıkışları yönetin.</p>
            </div>
        </div>
        
        {/* Senin eklediğin component, mobilde tam genişlik (w-full) alır */}
        <div className="w-full xl:w-auto shrink-0">
            <div className="w-full sm:w-auto xl:w-max">
                <AddProductDialog />
            </div>
        </div>
      </div>

      {/* 🚀 KONTROL PANELİ (Mobil Uyumlu Grid/Flex) */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/60 backdrop-blur-2xl border border-white/50 p-4 md:p-5 rounded-[2rem] shadow-sm">
        
        <div className="relative w-full md:w-96 shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input 
                className="pl-12 h-14 bg-white/80 border-white text-sm font-medium focus:ring-2 focus:ring-blue-500 shadow-sm rounded-2xl w-full" 
                type="text" 
                placeholder="Barkod, Kod veya Ürün Adı..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        <div className="flex w-full md:w-auto bg-slate-100/50 p-1 md:p-1.5 rounded-2xl border border-slate-200/50">
            <button 
                onClick={() => setFilterType("ALL")}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-bold transition-all ${filterType === 'ALL' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Package className="h-4 w-4 shrink-0" /> Tüm Stoklar
            </button>
            <button 
                onClick={() => setFilterType("CRITICAL")}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-bold transition-all ${filterType === 'CRITICAL' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'text-slate-500 hover:text-rose-600'}`}
            >
                <AlertOctagon className="h-4 w-4 shrink-0" /> <span className="truncate">Kritik Seviye</span>
            </button>
        </div>
      </div>

      {/* 🚀 AKIŞKAN TABLO ALANI */}
      <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden w-full">
        <div className="overflow-x-auto p-2 custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-white/40">
                    <tr>
                        <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-tl-3xl">Ürün & Kod</th>
                        <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori</th>
                        <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Depo Durumu (Bar)</th>
                        <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Alış / Satış</th>
                        <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest text-right rounded-tr-3xl">Aksiyonlar</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                    {filteredProducts.map((product: any) => (
                        <tr key={product.id} className="hover:bg-white/80 transition-colors group">
                            
                            <td className="px-4 md:px-6 py-4 md:py-5">
                                <div className="flex flex-col gap-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-mono text-[10px] md:text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                            {product.sku || "KOD-YOK"}
                                        </span>
                                        {product.barcode && <span className="font-mono text-[9px] md:text-[10px] text-slate-400">| B: {product.barcode}</span>}
                                    </div>
                                    <span className="text-sm md:text-base font-black text-slate-800 mt-1 max-w-[200px] md:max-w-[250px] truncate" title={product.name}>
                                        {product.name}
                                    </span>
                                </div>
                            </td>

                            <td className="px-4 md:px-6 py-4 md:py-5">
                                <span className="inline-flex items-center px-2 md:px-3 py-1 rounded-md md:rounded-lg text-[10px] md:text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                    {product.categories?.name || "Kategorisiz"}
                                </span>
                            </td>

                            <td className="px-4 md:px-6 py-4 md:py-5">
                                <div className="flex items-center gap-2 md:gap-3">
                                    {renderStockBar(product.current_stock, product.critical_stock_level)}
                                    <span className="text-[10px] md:text-xs font-bold text-slate-400 mt-4 md:mt-5">{product.units?.short_code}</span>
                                </div>
                            </td>

                            <td className="px-4 md:px-6 py-4 md:py-5 text-right">
                                <div className="flex flex-col gap-1 items-end">
                                    <span className="text-xs md:text-sm font-bold text-slate-500" title="Alış Fiyatı">
                                        ↓ {product.purchase_price?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    </span>
                                    <span className="text-xs md:text-sm font-black text-slate-800" title="Satış Fiyatı">
                                        ↑ {product.sale_price?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    </span>
                                </div>
                            </td>

                            <td className="px-4 md:px-6 py-4 md:py-5 text-right">
                                {/* Mobilde her zaman görünür, masaüstünde hover ile görünür */}
                                <div className="flex items-center justify-end gap-1.5 md:gap-2 opacity-100 lg:opacity-30 lg:group-hover:opacity-100 transition-opacity">
                                    <div className="h-8 md:h-10">
                                        <StockMovementDialog product={product} />
                                    </div>
                                    <div className="h-8 md:h-10 p-1.5 md:p-2.5 bg-white border border-slate-200 text-slate-400 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 rounded-lg md:rounded-xl shadow-sm transition-all flex items-center justify-center">
                                        <AddProductDialog productToEdit={product} />
                                    </div>
                                    <div className="h-8 md:h-10">
                                        <DeleteProductBtn id={product.id} />
                                    </div>
                                </div>
                            </td>
                        </tr>
                    ))}
                    
                    {!loading && filteredProducts.length === 0 && (
                        <tr>
                            <td colSpan={5} className="py-16 md:py-20 text-center">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="bg-white p-4 md:p-5 rounded-full shadow-sm"><Package className="h-8 w-8 md:h-10 md:w-10 text-slate-300" /></div>
                                    <p className="text-base md:text-lg font-bold text-slate-600">Ürün bulunamadı.</p>
                                    <p className="text-xs md:text-sm text-slate-400">Arama kriterlerinizi değiştirin veya yeni ürün ekleyin.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  )
}