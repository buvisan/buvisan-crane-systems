"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Calculator, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

export default function NewOfferPage() {
  const router = useRouter()
  const supabase = createClient()
  const [customers, setCustomers] = useState<any[]>([])
  
  // TEKNİK VERİLER (GİRDİLER)
  const [specs, setSpecs] = useState({
    capacity: 10,       // Kapasite (Ton)
    span: 20,           // Açıklık (Metre)
    lifting_height: 8,  // Kaldırma Yüksekliği (Metre)
    class: "FEM 2m",    // Sınıf
    hoist_speed: "4/1.3", // Kaldırma Hızı
    trolley_speed: "20/5", // Kedi Hızı
    bridge_speed: "30/5",  // Köprü Hızı
    
    // Opsiyonel (Checkbox gibi düşünülebilir)
    has_walkway: false, // Yürüyüş yolu var mı?
    has_cabin: false,   // Kabin var mı?
  })

  // Müşterileri Çek
  useEffect(() => {
    const fetchCustomers = async () => {
      const { data } = await supabase.from('customers').select('id, name')
      if (data) setCustomers(data)
    }
    fetchCustomers()
  }, [])

  const handleChange = (field: string, value: any) => {
    setSpecs({ ...specs, [field]: value })
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-blue-950">Yeni Teklif Hesabı</h1>
          <p className="text-gray-500">Vinç teknik özelliklerini girerek maliyet ve fiyat hesabı oluşturun.</p>
        </div>
        <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
            <Save className="mr-2 h-4 w-4" />
            Taslağı Kaydet
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* --- SOL TARA (GİRDİLER) --- */}
        <div className="col-span-12 md:col-span-4 space-y-6">
            
            {/* 1. Müşteri & Proje */}
            <Card>
                <CardHeader className="bg-gray-50 py-3"><CardTitle className="text-sm">Proje Bilgileri</CardTitle></CardHeader>
                <CardContent className="space-y-3 pt-4">
                    <div className="space-y-1">
                        <Label>Müşteri Seçimi</Label>
                        <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" >
                            <option value="">Seçiniz...</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <Label>Proje Adı</Label>
                        <Input placeholder="Örn: X Fabrikası Yeni Hol" />
                    </div>
                </CardContent>
            </Card>

            {/* 2. Teknik Özellikler (Ana Girdiler) */}
            <Card className="border-blue-200">
                <CardHeader className="bg-blue-50 py-3"><CardTitle className="text-sm text-blue-800">Teknik Parametreler</CardTitle></CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Kapasite (Ton)</Label>
                            <Input type="number" value={specs.capacity} onChange={(e) => handleChange('capacity', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Açıklık (m)</Label>
                            <Input type="number" value={specs.span} onChange={(e) => handleChange('span', e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Kaldırma Yük. (m)</Label>
                            <Input type="number" value={specs.lifting_height} onChange={(e) => handleChange('lifting_height', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Çalışma Sınıfı</Label>
                            <Input value={specs.class} onChange={(e) => handleChange('class', e.target.value)} />
                        </div>
                    </div>
                    
                    <div className="border-t pt-4"></div>
                    
                    <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Kaldırma Hızı (m/dk)</Label>
                        <Input value={specs.hoist_speed} onChange={(e) => handleChange('hoist_speed', e.target.value)} />
                    </div>
                     <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Kedi Yürüyüş Hızı (m/dk)</Label>
                        <Input value={specs.trolley_speed} onChange={(e) => handleChange('trolley_speed', e.target.value)} />
                    </div>
                     <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Köprü Yürüyüş Hızı (m/dk)</Label>
                        <Input value={specs.bridge_speed} onChange={(e) => handleChange('bridge_speed', e.target.value)} />
                    </div>
                </CardContent>
            </Card>

            <Button className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg">
                <Calculator className="mr-2 h-5 w-5" />
                HESAPLA
            </Button>
        </div>

        {/* --- SAĞ TARAF (SONUÇLAR - GRID YAPISI) --- */}
        <div className="col-span-12 md:col-span-8">
            <div className="grid grid-cols-2 gap-4">
                
                {/* KİRİŞLER */}
                <Card className="col-span-2 md:col-span-1 border-l-4 border-l-orange-500">
                    <CardHeader className="py-2 bg-orange-50"><CardTitle className="text-sm">Ana Kiriş Hesabı</CardTitle></CardHeader>
                    <CardContent className="pt-4 text-sm space-y-2">
                        <div className="flex justify-between"><span>Kiriş Tipi:</span> <span className="font-bold">Kutu Kiriş</span></div>
                        <div className="flex justify-between"><span>Sac Ağırlığı:</span> <span className="font-bold text-gray-500">--- kg</span></div>
                        <div className="flex justify-between"><span>İşçilik Maliyeti:</span> <span className="font-bold text-gray-500">--- TL</span></div>
                        <div className="flex justify-between border-t pt-1 mt-1"><span className="font-bold text-orange-700">Toplam Maliyet:</span> <span className="font-bold text-lg">0 TL</span></div>
                    </CardContent>
                </Card>

                {/* YÜRÜYÜŞ YOLLARI */}
                <Card className="col-span-2 md:col-span-1 border-l-4 border-l-blue-500">
                    <CardHeader className="py-2 bg-blue-50"><CardTitle className="text-sm">Yürüyüş Yolu (Ray & Klemens)</CardTitle></CardHeader>
                    <CardContent className="pt-4 text-sm space-y-2">
                        <div className="flex justify-between"><span>Ray Tipi:</span> <span className="font-bold">---</span></div>
                        <div className="flex justify-between"><span>Ray Uzunluğu:</span> <span className="font-bold text-gray-500">--- m</span></div>
                        <div className="flex justify-between border-t pt-1 mt-1"><span className="font-bold text-blue-700">Toplam Maliyet:</span> <span className="font-bold text-lg">0 TL</span></div>
                    </CardContent>
                </Card>

                {/* ELEKTRİK & TESİSAT */}
                <Card className="col-span-2 md:col-span-1 border-l-4 border-l-purple-500">
                    <CardHeader className="py-2 bg-purple-50"><CardTitle className="text-sm">Elektrik & Pano</CardTitle></CardHeader>
                    <CardContent className="pt-4 text-sm space-y-2">
                        <div className="flex justify-between"><span>Pano Tipi:</span> <span className="font-bold">---</span></div>
                        <div className="flex justify-between"><span>Kablo Metraj:</span> <span className="font-bold text-gray-500">--- m</span></div>
                        <div className="flex justify-between border-t pt-1 mt-1"><span className="font-bold text-purple-700">Toplam Maliyet:</span> <span className="font-bold text-lg">0 TL</span></div>
                    </CardContent>
                </Card>

                 {/* BOYA & MONTAJ */}
                 <Card className="col-span-2 md:col-span-1 border-l-4 border-l-gray-500">
                    <CardHeader className="py-2 bg-gray-50"><CardTitle className="text-sm">Boya, Nakliye & Montaj</CardTitle></CardHeader>
                    <CardContent className="pt-4 text-sm space-y-2">
                        <div className="flex justify-between"><span>Boya Alanı:</span> <span className="font-bold">--- m²</span></div>
                        <div className="flex justify-between"><span>Montaj Süresi:</span> <span className="font-bold text-gray-500">--- Gün</span></div>
                        <div className="flex justify-between border-t pt-1 mt-1"><span className="font-bold text-gray-700">Toplam Maliyet:</span> <span className="font-bold text-lg">0 TL</span></div>
                    </CardContent>
                </Card>

                {/* GENEL TOPLAM KUTUSU */}
                <Card className="col-span-2 bg-blue-900 text-white shadow-lg transform scale-105">
                     <CardContent className="pt-6 flex justify-between items-center">
                        <div className="space-y-1">
                            <p className="text-blue-200 text-sm">TAHMİNİ MALİYET</p>
                            <p className="text-3xl font-bold">0,00 ₺</p>
                        </div>
                        <div className="space-y-1 text-right">
                            <p className="text-green-300 text-sm">SATIŞ FİYATI (+%20 Kar)</p>
                            <p className="text-3xl font-bold text-green-400">0,00 ₺</p>
                        </div>
                     </CardContent>
                </Card>

            </div>
        </div>
      </div>
    </div>
  )
}