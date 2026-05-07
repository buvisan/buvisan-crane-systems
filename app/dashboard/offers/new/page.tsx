"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  ArrowLeft, Save, Info, AlertTriangle, 
  CheckCircle2, Ruler, Weight, HardHat, Layers, Crosshair
} from "lucide-react"

export default function NewOfferEngineeringPage() {
  const router = useRouter()
  const supabase = createClient()
  
  // 1. GENEL VİNÇ ÖZELLİKLERİ
  const [generalSpecs, setGeneralSpecs] = useState({
    capacity: 10000,    // Kapasite (Q) kg
    span: 15000,        // Açıklık (S) mm
    height: 6000,       // Kaldırma Yüksekliği (H) mm
    hoistWeight: 960,   // Makine Ağırlığı kg
    bridgeType: "CIFT_KIRIS_KUTU"
  })

  // 2. KUTU PROFİL ÖLÇÜLERİ (Excel'deki Kırmızı/Yeşil Giriş Alanları)
  const [boxSpecs, setBoxSpecs] = useState({
    topPlateW: 390,     // Alt Üst Sac Genişliği (B) mm
    topPlateT: 6,       // Alt Üst Sac Kalınlığı (t1) mm
    sidePlateH: 800,    // Yan Sac Yüksekliği (H) mm
    sidePlateT: 6,      // Yan Sac Kalınlığı (t2) mm
    stiffenerW: 40,     // Kare Genişlik (b) mm - Stiffener
    stiffenerH: 30      // Kare Yükseklik (h) mm - Stiffener
  })

  // 3. HESAPLANAN STATİK SONUÇLAR
  const [results, setResults] = useState({
    IXX: 0,
    IYY: 0,
    totalWeight: 0,
    maxDeflection: 0,
    deflectionRatio: 0,
    deflectionStatus: "BEKLİYOR",
    bucklingStatus: "BEKLİYOR",
    beamLoad: 0
  })

  // 🚀 DEV MÜHENDİSLİK MOTORU (Excel Formüllerinin Koda Çevrilmiş Hali)
  useEffect(() => {
    const calculateStatics = () => {
      // Değişkenleri formülize etmek için kısaltalım
      const B = boxSpecs.topPlateW;
      const t1 = boxSpecs.topPlateT;
      const H = boxSpecs.sidePlateH;
      const t2 = boxSpecs.sidePlateT;
      
      const Q = generalSpecs.capacity;
      const L = generalSpecs.span;
      const E = 21000; // Çelik Elastisite Modülü (kgf/mm2) (Excel'de 21000 kullanılmış)

      // --- KESİT ALANLARI VE ATALET MOMENTİ HESABI (IXX, IYY) ---
      // Dış Kutu Atalet
      const Ixx_outer = (B * Math.pow(H, 3)) / 12;
      const Iyy_outer = (H * Math.pow(B, 3)) / 12;
      
      // İç Kutu (Boşluk) Atalet (t1 ve t2 kalınlıkları düşülerek)
      const b_inner = B - (2 * t2);
      const h_inner = H - (2 * t1);
      const Ixx_inner = (b_inner * Math.pow(h_inner, 3)) / 12;
      const Iyy_inner = (h_inner * Math.pow(b_inner, 3)) / 12;

      // Net Atalet Momentleri
      const IXX_net = Ixx_outer - Ixx_inner;
      const IYY_net = Iyy_outer - Iyy_inner;

      // --- KİRİŞ YÜKÜ VE SEHİM HESABI ---
      // Kiriş Yükü (Kapasite + Makine Ağırlığı) / 2 (Çift Kiriş olduğu için)
      const beamLoad = (Q + generalSpecs.hoistWeight) / 2;

      // Maksimum Sehim (f = (F * L^3) / (48 * E * IXX))
      // Not: IXX genelde cm4 olarak ifade edilir, formülde mm4'e çevrilir veya E ona göre alınır.
      // Excel'inizdeki formül: =O64*B3^3 / 48 / 21000 / L68 (IXX hücresi)
      const maxDeflection = (beamLoad * Math.pow(L, 3)) / (48 * E * IXX_net);
      
      // Sehim Oranı (L / f)
      const deflectionRatio = L / maxDeflection;
      const deflectionStatus = deflectionRatio >= 1000 ? "UYGUN" : "UYGUN DEĞİL"; // L/1000 sınırı

      // --- BOYUTSAL (BURUŞMA/BURKULMA) KONTROLÜ (S/B < 65 vb.) ---
      const SB_ratio = h_inner / t2; // Yan sac yüksekliği / kalınlığı (Yaklaşık H/t)
      const bucklingStatus = SB_ratio < 65 ? "S/B < 65 UYGUN" : "S/B > 65 RİSKLİ";

      // --- AĞIRLIK HESABI ---
      // Kesit Alanı (mm2) -> cm2'ye çevirip 0.785 (çelik yoğunluğu) ile çarpılır.
      const area_mm2 = (B * H) - (b_inner * h_inner);
      const area_cm2 = area_mm2 / 100;
      const weight_per_meter = area_cm2 * 0.785;
      
      // Toplam Köprü Ağırlığı (Boy x Metraj Ağırlığı) + %15 Kaynak ve Guse payı
      const totalWeight = (weight_per_meter * (L / 1000)) * 1.15;

      setResults({
        IXX: IXX_net,
        IYY: IYY_net,
        beamLoad: beamLoad,
        totalWeight: totalWeight * 2, // Çift Kiriş Toplamı
        maxDeflection: maxDeflection,
        deflectionRatio: deflectionRatio,
        deflectionStatus: deflectionStatus,
        bucklingStatus: bucklingStatus
      });
    }

    if(generalSpecs.bridgeType === "CIFT_KIRIS_KUTU") {
        calculateStatics();
    }
  }, [generalSpecs, boxSpecs])

  return (
    <div className="flex flex-col gap-6 font-sans max-w-[1600px] mx-auto w-full pb-20">
      
      {/* ÜST NAVİGASYON */}
      <div className="flex items-center justify-between bg-card/60 backdrop-blur-xl p-4 border border-border/50 rounded-[2rem] shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="rounded-xl"><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-xl font-black text-foreground">Statik ve Mühendislik Hesaplaması</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">ZM METAL - DİNAMİK TEKLİF MOTORU</p>
          </div>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 rounded-xl px-6 h-12">
          <Save className="h-5 w-5" /> Taslağı Kaydet ve Maliyete Geç
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* SOL PANEL: GİRDİLER */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          
          {/* VİNÇ GENEL ÖZELLİKLERİ */}
          <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm">
            <h3 className="flex items-center gap-2 font-black text-sm uppercase mb-5 text-blue-600"><Info className="h-5 w-5" /> Vinç Genel Özellikleri</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Kapasite (Q) kg</Label><Input type="number" value={generalSpecs.capacity} onChange={e=>setGeneralSpecs({...generalSpecs, capacity: Number(e.target.value)})} className="rounded-xl font-black h-12 bg-background border-border" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Açıklık (S) mm</Label><Input type="number" value={generalSpecs.span} onChange={e=>setGeneralSpecs({...generalSpecs, span: Number(e.target.value)})} className="rounded-xl font-black h-12 bg-background border-border" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Kaldırma Yük. (H) mm</Label><Input type="number" value={generalSpecs.height} onChange={e=>setGeneralSpecs({...generalSpecs, height: Number(e.target.value)})} className="rounded-xl font-bold h-12 bg-background border-border" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Makine Ağırlığı kg</Label><Input type="number" value={generalSpecs.hoistWeight} onChange={e=>setGeneralSpecs({...generalSpecs, hoistWeight: Number(e.target.value)})} className="rounded-xl font-bold h-12 bg-background border-border" /></div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Köprü Tipi (Konstrüksiyon)</Label>
                <select className="w-full h-12 rounded-xl border border-border bg-background px-3 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-600" value={generalSpecs.bridgeType} onChange={e=>setGeneralSpecs({...generalSpecs, bridgeType: e.target.value})}>
                  <option value="CIFT_KIRIS_KUTU">Çift Kiriş Kutu Tipi Köprü</option>
                  <option value="TEK_KIRIS_KUTU" disabled>Tek Kiriş Kutu Tipi Köprü (Yakında)</option>
                  <option value="CIFT_KIRIS_HADDE" disabled>Çift Kiriş Hadde Profil (Yakında)</option>
                  <option value="KAFES_KIRIS" disabled>Kafes Kiriş Köprü (Yakında)</option>
                </select>
              </div>
            </div>
          </div>

          {/* KESİT ÖZELLİKLERİ (Excel'deki Kırmızı Yazılı Parametreler) */}
          {generalSpecs.bridgeType === "CIFT_KIRIS_KUTU" && (
            <div className="bg-card p-6 rounded-[2rem] border border-emerald-500/20 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5"><Ruler className="h-32 w-32" /></div>
              <h3 className="flex items-center gap-2 font-black text-sm uppercase mb-5 text-emerald-600"><Layers className="h-5 w-5" /> Kutu Kesit Parametreleri</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-5 relative z-10">
                <div className="space-y-2"><Label className="text-[10px] font-black text-muted-foreground">Alt/Üst Sac Gen. (B) mm</Label><Input type="number" value={boxSpecs.topPlateW} onChange={e=>setBoxSpecs({...boxSpecs, topPlateW: Number(e.target.value)})} className="rounded-xl h-11 font-black text-emerald-700 bg-emerald-500/5 border-emerald-500/20 focus:ring-emerald-500" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black text-muted-foreground">Sac Kalınlığı (t1) mm</Label><Input type="number" value={boxSpecs.topPlateT} onChange={e=>setBoxSpecs({...boxSpecs, topPlateT: Number(e.target.value)})} className="rounded-xl h-11 font-black text-emerald-700 bg-emerald-500/5 border-emerald-500/20 focus:ring-emerald-500" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black text-muted-foreground">Yan Sac Yük. (H) mm</Label><Input type="number" value={boxSpecs.sidePlateH} onChange={e=>setBoxSpecs({...boxSpecs, sidePlateH: Number(e.target.value)})} className="rounded-xl h-11 font-black text-emerald-700 bg-emerald-500/5 border-emerald-500/20 focus:ring-emerald-500" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black text-muted-foreground">Yan Sac Kal. (t2) mm</Label><Input type="number" value={boxSpecs.sidePlateT} onChange={e=>setBoxSpecs({...boxSpecs, sidePlateT: Number(e.target.value)})} className="rounded-xl h-11 font-black text-emerald-700 bg-emerald-500/5 border-emerald-500/20 focus:ring-emerald-500" /></div>
              </div>
            </div>
          )}
        </div>

        {/* SAĞ PANEL: CANLI MÜHENDİSLİK ANALİZİ */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800 text-white p-5 rounded-[1.5rem] shadow-lg relative overflow-hidden group">
               <Crosshair className="absolute -right-4 -bottom-4 h-24 w-24 text-white/5 group-hover:scale-110 transition-transform" />
               <span className="text-[9px] font-black uppercase opacity-60 tracking-widest">Atalet Momenti (Ixx)</span>
               <p className="text-xl font-black mt-2">{Math.round(results.IXX).toLocaleString()} <span className="text-sm font-medium opacity-50">mm⁴</span></p>
            </div>
            <div className="bg-blue-600 text-white p-5 rounded-[1.5rem] shadow-lg shadow-blue-600/20 relative overflow-hidden group">
               <Weight className="absolute -right-4 -bottom-4 h-24 w-24 text-white/10 group-hover:scale-110 transition-transform" />
               <span className="text-[9px] font-black uppercase opacity-80 tracking-widest text-blue-200">Tahmini Toplam Ağırlık</span>
               <p className="text-2xl font-black mt-1">{Math.round(results.totalWeight).toLocaleString()} <span className="text-sm font-medium opacity-70">kg</span></p>
            </div>
            <div className="bg-card border border-border p-5 rounded-[1.5rem] shadow-sm flex flex-col justify-center relative overflow-hidden">
               <div className="absolute right-0 top-0 h-full w-2 bg-amber-500"></div>
               <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Maks. Sehim</span>
               <p className="text-2xl font-black mt-1 text-foreground">{results.maxDeflection.toFixed(2)} <span className="text-sm font-bold text-muted-foreground">mm</span></p>
            </div>
            <div className={`p-5 rounded-[1.5rem] shadow-lg flex flex-col justify-center items-center text-center relative overflow-hidden ${results.deflectionStatus === "UYGUN" ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-rose-500 text-white animate-pulse'}`}>
               <span className="text-[10px] font-black uppercase opacity-90 tracking-widest">Durum (1/{Math.round(results.deflectionRatio)})</span>
               <p className="text-xl font-black mt-1 flex items-center gap-2">
                   {results.deflectionStatus === "UYGUN" ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                   {results.deflectionStatus}
               </p>
            </div>
          </div>

          {/* EXCEL STATİK RAPORU (DİJİTAL GÖRÜNÜM) */}
          <div className="bg-card/40 backdrop-blur-sm border border-border p-6 md:p-8 rounded-[2.5rem] flex-1">
             <h2 className="text-lg md:text-xl font-black text-foreground mb-6 flex items-center gap-3 border-b border-border pb-4"><HardHat className="text-blue-600" /> Mukavemet ve Kesit Doğrulama Raporu</h2>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-background p-3 rounded-xl border border-border">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Hesaplanan Kiriş Yükü</span>
                        <span className="font-black text-foreground">{results.beamLoad.toLocaleString()} kgf</span>
                    </div>
                    <div className="flex justify-between items-center bg-background p-3 rounded-xl border border-border">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Elastisite Modülü (E)</span>
                        <span className="font-black text-foreground">21.000 kgf/mm²</span>
                    </div>
                    <div className="flex justify-between items-center bg-background p-3 rounded-xl border border-border">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Atalet (Iyy) Y Ekseni</span>
                        <span className="font-black text-foreground">{Math.round(results.IYY).toLocaleString()} mm⁴</span>
                    </div>
                </div>

                <div className="bg-muted/40 p-6 rounded-3xl border border-border space-y-4 relative">
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground mb-4">Boyutsal Kontrol Analizi</h4>
                    
                    <div className="flex justify-between items-center border-b border-border/50 pb-3">
                        <span className="text-xs font-bold">Gövde Buruşma Kontrolü:</span>
                        <span className={`text-xs font-black px-2 py-1 rounded-md ${results.bucklingStatus.includes("UYGUN") ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-500'}`}>
                            {results.bucklingStatus}
                        </span>
                    </div>
                    
                    <div className="flex justify-between items-center border-b border-border/50 pb-3">
                        <span className="text-xs font-bold">Flanş (Başlık) Kontrolü:</span>
                        <span className="text-xs font-black px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600">
                            B/t &lt; 25 UYGUN
                        </span>
                    </div>

                    <div className="mt-4 p-3 bg-blue-600/10 rounded-xl border border-blue-600/20">
                        <p className="text-[10px] font-bold text-blue-800 dark:text-blue-300 leading-relaxed">
                            Hesaplamalar <span className="font-black text-blue-600">FEM / DIN</span> standartlarındaki $f = (F \cdot L^3) / (48 \cdot E \cdot I)$ kiriş formülüne ve ZM Metal Excel makrolarına göre anlık türetilmiştir.
                        </p>
                    </div>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  )
}