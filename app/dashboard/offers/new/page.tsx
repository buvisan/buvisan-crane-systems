"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  ArrowLeft, Save, Info, AlertTriangle, 
  CheckCircle2, Ruler, Weight, HardHat, Layers, Crosshair, Euro, Banknote, BookOpen
} from "lucide-react"

// 🚀 PROFİL KÜTÜPHANESİ (Excel'deki DÜŞEYARA Veritabanı)
const PROFILE_LIBRARY: Record<string, { h: number, b: number, weight: number, area: number, ixx: number }> = {
  "IPE 200": { h: 200, b: 100, weight: 22.4, area: 2850, ixx: 1940 },
  "IPE 240": { h: 240, b: 120, weight: 30.7, area: 3910, ixx: 3890 },
  "IPE 270": { h: 270, b: 135, weight: 36.1, area: 4590, ixx: 5790 },
  "IPE 300": { h: 300, b: 150, weight: 42.2, area: 5380, ixx: 8360 },
  "IPE 360": { h: 360, b: 170, weight: 57.1, area: 7270, ixx: 16270 },
  "IPE 400": { h: 400, b: 180, weight: 66.3, area: 8450, ixx: 23130 },
  "IPE 450": { h: 450, b: 190, weight: 77.6, area: 9880, ixx: 33740 },
  "IPE 500": { h: 500, b: 200, weight: 90.7, area: 11600, ixx: 48200 },
  "HEA 300": { h: 290, b: 300, weight: 88.3, area: 11250, ixx: 18260 },
  "HEB 300": { h: 300, b: 300, weight: 117.0, area: 14910, ixx: 25170 },
};

export default function NewOfferEngineeringPage() {
  const router = useRouter()
  const supabase = createClient()
  
  // 1. GENEL VİNÇ ÖZELLİKLERİ
  const [generalSpecs, setGeneralSpecs] = useState({
    capacity: 10000,    // kg
    span: 15000,        // mm
    height: 6000,       // mm
    hoistWeight: 960,   // kg
    bridgeType: "CIFT_KIRIS_KUTU"
  })

  // 2. KUTU PROFİL ÖLÇÜLERİ (Steiner Teoremi İçin)
  const [boxSpecs, setBoxSpecs] = useState({
    topPlateW: 390,     
    topPlateT: 6,       
    sidePlateH: 800,    
    sidePlateT: 6       
  })

  // 3. HADDE PROFİL (IPE/HEA) SEÇİMİ
  const [selectedProfile, setSelectedProfile] = useState("IPE 400")

  // 4. FİNANS VE MALİYET SABİTLERİ
  const [financeSpecs, setFinanceSpecs] = useState({
    laborRateTRY: 75,   
    euroRate: 52.74,    
    profitMargin: 30    
  })

  // 5. HESAPLANAN SONUÇLAR
  const [results, setResults] = useState({
    totalArea: 0,
    IXX: 0,
    beamLoad: 0,
    totalWeight: 0,
    maxDeflection: 0,
    deflectionRatio: 0,
    deflectionStatus: "BEKLİYOR",
    bucklingStatus: "-",
    laborCostEUR: 0,
    totalPriceEUR: 0
  })

  // 🚀 DEV MÜHENDİSLİK MOTORU
  useEffect(() => {
    const calculateStatics = () => {
      const Q = generalSpecs.capacity;
      const L = generalSpecs.span;
      const E = 21000; // Çelik Elastisite Modülü (kgf/mm2)
      
      let IXX_net = 0;
      let totalArea_mm2 = 0;
      let weight_per_meter = 0;
      let bucklingStatus = "-";
      let isDoubleGirder = generalSpecs.bridgeType.includes("CIFT_KIRIS");

      // --- A) KUTU PROFİL HESABI (Steiner Teoremi) ---
      if (generalSpecs.bridgeType.includes("KUTU")) {
          const B = boxSpecs.topPlateW;
          const t1 = boxSpecs.topPlateT;
          const H = boxSpecs.sidePlateH;
          const t2 = boxSpecs.sidePlateT;

          const A_alt = B * t1; const y_alt = t1 / 2; const Ixx_alt_local = (B * Math.pow(t1, 3)) / 12;
          const A_ust = B * t1; const y_ust = t1 + H + (t1 / 2); const Ixx_ust_local = (B * Math.pow(t1, 3)) / 12;
          const A_yan = 2 * (H * t2); const y_yan = t1 + (H / 2); const Ixx_yan_local = 2 * ((t2 * Math.pow(H, 3)) / 12);

          totalArea_mm2 = A_alt + A_ust + A_yan;
          const centerOfGravityY = ((A_alt * y_alt) + (A_ust * y_ust) + (A_yan * y_yan)) / totalArea_mm2;

          const Ixx_alt_steiner = Ixx_alt_local + (A_alt * Math.pow((centerOfGravityY - y_alt), 2));
          const Ixx_ust_steiner = Ixx_ust_local + (A_ust * Math.pow((centerOfGravityY - y_ust), 2));
          const Ixx_yan_steiner = Ixx_yan_local + (A_yan * Math.pow((centerOfGravityY - y_yan), 2));

          IXX_net = Ixx_alt_steiner + Ixx_ust_steiner + Ixx_yan_steiner;
          weight_per_meter = (totalArea_mm2 / 100) * 0.785; // mm2 -> cm2 -> kg/m

          const SB_ratio = H / t2;
          bucklingStatus = SB_ratio < 65 ? "S/B < 65 UYGUN" : "S/B > 65 RİSKLİ";
      } 
      // --- B) HADDE PROFİL HESABI (Kütüphaneden Çekim) ---
      else if (generalSpecs.bridgeType.includes("HADDE")) {
          const profile = PROFILE_LIBRARY[selectedProfile];
          totalArea_mm2 = profile.area;
          weight_per_meter = profile.weight;
          // Kütüphanedeki IXX değeri cm4 cinsindendir. Statik hesap (mm) için 10^4 ile çarpıyoruz.
          IXX_net = profile.ixx * 10000;
          bucklingStatus = "STANDART PROFİL";
      }

      // Çift Kiriş ise Atalet ve Ağırlık 2 ile çarpılır
      if (isDoubleGirder) {
          IXX_net = IXX_net * 2;
      }

      // --- ORTAK KİRİŞ YÜKÜ VE SEHİM HESABI ---
      const beamLoad = isDoubleGirder ? (Q + generalSpecs.hoistWeight) / 2 : (Q + generalSpecs.hoistWeight);
      const maxDeflection = (beamLoad * Math.pow(L, 3)) / (48 * E * IXX_net); // f = (F*L^3)/(48*E*I)
      const deflectionRatio = L / maxDeflection;
      const deflectionStatus = deflectionRatio >= 1000 ? "UYGUN" : "UYGUN DEĞİL";

      // --- AĞIRLIK VE FİNANS HESABI ---
      // Çift kiriş ise x2, ve %15 Guse/Kaynak toleransı
      const girderMultiplier = isDoubleGirder ? 2 : 1;
      const totalWeight = (weight_per_meter * (L / 1000)) * 1.15 * girderMultiplier; 

      const laborCostTRY = totalWeight * financeSpecs.laborRateTRY;
      const laborCostEUR = laborCostTRY / financeSpecs.euroRate;
      
      const baseCostEUR = laborCostEUR + (totalWeight * 1.2); // Çelik malzeme baz fiyatı
      const totalPriceEUR = baseCostEUR * (1 + (financeSpecs.profitMargin / 100));

      setResults({
        totalArea: totalArea_mm2,
        IXX: IXX_net,
        beamLoad: beamLoad,
        totalWeight: totalWeight,
        maxDeflection: maxDeflection,
        deflectionRatio: deflectionRatio,
        deflectionStatus: deflectionStatus,
        bucklingStatus: bucklingStatus,
        laborCostEUR: laborCostEUR,
        totalPriceEUR: totalPriceEUR
      });
    }

    calculateStatics();
  }, [generalSpecs, boxSpecs, financeSpecs, selectedProfile])

  const formatCurrency = (val: number, currency: string = "EUR") => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency }).format(val || 0)
  }

  return (
    <div className="flex flex-col gap-6 font-sans max-w-[1600px] mx-auto w-full pb-20">
      
      {/* ÜST NAVİGASYON */}
      <div className="flex items-center justify-between bg-card/60 backdrop-blur-xl p-4 border border-border/50 rounded-[2rem] shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="rounded-xl"><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-xl font-black text-foreground">Gelişmiş Statik & Maliyet Motoru</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">ZM METAL MAKİNA İMALAT SANAYİ VE TİCARET LİMİTED ŞİRKETİ</p>
          </div>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 rounded-xl px-6 h-12 shadow-lg shadow-blue-600/20">
          <Save className="h-5 w-5" /> Teklifi Oluştur (PDF)
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* SOL PANEL: GİRDİLER VE FİNANS */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          
          <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm">
            <h3 className="flex items-center gap-2 font-black text-sm uppercase mb-5 text-blue-600"><Info className="h-5 w-5" /> Vinç Genel Özellikleri</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Kapasite (Q) kg</Label><Input type="number" value={generalSpecs.capacity} onChange={e=>setGeneralSpecs({...generalSpecs, capacity: Number(e.target.value)})} className="rounded-xl font-black h-12" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Açıklık (S) mm</Label><Input type="number" value={generalSpecs.span} onChange={e=>setGeneralSpecs({...generalSpecs, span: Number(e.target.value)})} className="rounded-xl font-black h-12" /></div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Köprü Tipi</Label>
                <select className="w-full h-12 rounded-xl border border-border bg-background px-3 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-600" value={generalSpecs.bridgeType} onChange={e=>setGeneralSpecs({...generalSpecs, bridgeType: e.target.value})}>
                  <option value="CIFT_KIRIS_KUTU">Çift Kiriş Kutu Tipi Köprü</option>
                  <option value="TEK_KIRIS_KUTU">Tek Kiriş Kutu Tipi Köprü</option>
                  <option value="CIFT_KIRIS_HADDE">Çift Kiriş Hadde Profil</option>
                  <option value="TEK_KIRIS_HADDE">Tek Kiriş Hadde Profil</option>
                </select>
              </div>
            </div>
          </div>

          {/* DİNAMİK KESİT PANELİ (KUTU MU, HADDE Mİ?) */}
          {generalSpecs.bridgeType.includes("KUTU") ? (
            <div className="bg-card p-6 rounded-[2rem] border border-emerald-500/30 shadow-sm relative overflow-hidden animate-in fade-in zoom-in-95">
              <h3 className="flex items-center gap-2 font-black text-sm uppercase mb-5 text-emerald-600"><Layers className="h-5 w-5" /> Kutu Kesit Parametreleri</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-5 relative z-10">
                <div className="space-y-2"><Label className="text-[10px] font-black text-muted-foreground">Alt/Üst Sac Gen. (B) mm</Label><Input type="number" value={boxSpecs.topPlateW} onChange={e=>setBoxSpecs({...boxSpecs, topPlateW: Number(e.target.value)})} className="rounded-xl h-11 font-black text-emerald-700 bg-emerald-500/5 border-emerald-500/30" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black text-muted-foreground">Sac Kalınlığı (t1) mm</Label><Input type="number" value={boxSpecs.topPlateT} onChange={e=>setBoxSpecs({...boxSpecs, topPlateT: Number(e.target.value)})} className="rounded-xl h-11 font-black text-emerald-700 bg-emerald-500/5 border-emerald-500/30" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black text-muted-foreground">Yan Sac Yük. (H) mm</Label><Input type="number" value={boxSpecs.sidePlateH} onChange={e=>setBoxSpecs({...boxSpecs, sidePlateH: Number(e.target.value)})} className="rounded-xl h-11 font-black text-emerald-700 bg-emerald-500/5 border-emerald-500/30" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black text-muted-foreground">Yan Sac Kal. (t2) mm</Label><Input type="number" value={boxSpecs.sidePlateT} onChange={e=>setBoxSpecs({...boxSpecs, sidePlateT: Number(e.target.value)})} className="rounded-xl h-11 font-black text-emerald-700 bg-emerald-500/5 border-emerald-500/30" /></div>
              </div>
            </div>
          ) : (
            <div className="bg-card p-6 rounded-[2rem] border border-amber-500/30 shadow-sm relative overflow-hidden animate-in fade-in zoom-in-95">
              <h3 className="flex items-center gap-2 font-black text-sm uppercase mb-5 text-amber-600"><BookOpen className="h-5 w-5" /> Hadde Profil Kütüphanesi</h3>
              <div className="space-y-2 relative z-10">
                <Label className="text-[10px] font-black text-muted-foreground">Profil Tipi Seçiniz</Label>
                <select className="w-full h-12 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 font-black text-sm text-amber-700 outline-none focus:ring-2 focus:ring-amber-500" value={selectedProfile} onChange={e=>setSelectedProfile(e.target.value)}>
                  {Object.keys(PROFILE_LIBRARY).map(key => (
                    <option key={key} value={key}>{key} (G: {PROFILE_LIBRARY[key].weight} kg/m)</option>
                  ))}
                </select>
                <p className="text-[9px] font-bold text-amber-600 mt-2">Seçilen profilin statik değerleri (Ixx, Alan) veritabanından anlık çekilir.</p>
              </div>
            </div>
          )}

          {/* FİNANS SABİTLERİ */}
          <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm">
             <h3 className="flex items-center gap-2 font-black text-sm uppercase mb-5 text-foreground"><Banknote className="h-5 w-5 text-indigo-500" /> Piyasa ve Maliyet Sabitleri</h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-[10px] font-black text-muted-foreground">İşçilik (TL/kg)</Label><Input type="number" value={financeSpecs.laborRateTRY} onChange={e=>setFinanceSpecs({...financeSpecs, laborRateTRY: Number(e.target.value)})} className="rounded-xl h-11 font-black" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black text-muted-foreground">Euro Kuru (€)</Label><Input type="number" value={financeSpecs.euroRate} onChange={e=>setFinanceSpecs({...financeSpecs, euroRate: Number(e.target.value)})} className="rounded-xl h-11 font-black text-indigo-600" /></div>
                <div className="space-y-2 col-span-2"><Label className="text-[10px] font-black text-muted-foreground">Kar & Komisyon Oranı (%)</Label><Input type="number" value={financeSpecs.profitMargin} onChange={e=>setFinanceSpecs({...financeSpecs, profitMargin: Number(e.target.value)})} className="rounded-xl h-11 font-black" /></div>
             </div>
          </div>
        </div>

        {/* SAĞ PANEL: CANLI MÜHENDİSLİK & MALİYET SONUÇLARI */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 text-white p-5 rounded-[1.5rem] shadow-lg relative overflow-hidden group">
               <Crosshair className="absolute -right-4 -bottom-4 h-24 w-24 text-white/5 group-hover:scale-110 transition-transform" />
               <span className="text-[9px] font-black uppercase opacity-60 tracking-widest">Net Atalet (Ixx)</span>
               <p className="text-xl font-black mt-2">{Math.round(results.IXX).toLocaleString()} <span className="text-sm font-medium opacity-50">mm⁴</span></p>
            </div>
            <div className="bg-blue-600 text-white p-5 rounded-[1.5rem] shadow-lg shadow-blue-600/20 relative overflow-hidden group">
               <Weight className="absolute -right-4 -bottom-4 h-24 w-24 text-white/10 group-hover:scale-110 transition-transform" />
               <span className="text-[9px] font-black uppercase opacity-80 tracking-widest text-blue-200">Çelik Ağırlığı</span>
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

          {/* DİJİTAL MÜHENDİSLİK RAPORU */}
          <div className="bg-card/40 backdrop-blur-sm border border-border p-6 md:p-8 rounded-[2.5rem] flex-1">
             <h2 className="text-lg md:text-xl font-black text-foreground mb-6 flex items-center gap-3 border-b border-border pb-4"><HardHat className="text-blue-600" /> Dinamik Statik Raporu</h2>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-background p-3 rounded-xl border border-border">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Toplam Kesit Alanı</span>
                        <span className="font-black text-foreground text-sm">{results.totalArea.toLocaleString()} mm²</span>
                    </div>
                    <div className="flex justify-between items-center bg-background p-3 rounded-xl border border-border">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Kiriş Yükü (Kapasite Dağılımı)</span>
                        <span className="font-black text-foreground text-sm">{results.beamLoad.toLocaleString()} kgf</span>
                    </div>
                    <div className="flex justify-between items-center bg-background p-3 rounded-xl border border-border">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Gövde Buruşma Kontrolü</span>
                        <span className={`font-black text-xs px-2 py-1 rounded-md ${results.bucklingStatus.includes("UYGUN") ? 'bg-emerald-500/10 text-emerald-600' : (results.bucklingStatus === "STANDART PROFİL" ? 'bg-blue-500/10 text-blue-600' : 'bg-rose-500/10 text-rose-500')}`}>{results.bucklingStatus}</span>
                    </div>
                </div>

                <div className="bg-muted/40 p-6 rounded-3xl border border-border space-y-4 flex flex-col justify-between relative overflow-hidden">
                    <Euro className="absolute -right-4 -bottom-4 h-32 w-32 text-indigo-500/5" />
                    
                    <div>
                        <h4 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground mb-4">Otomatik Maliyetlendirme</h4>
                        <div className="flex justify-between items-center border-b border-border/50 pb-3">
                            <span className="text-xs font-bold">Hesaplanan İşçilik:</span>
                            <span className="text-sm font-black text-rose-500">{formatCurrency(results.laborCostEUR, "EUR")}</span>
                        </div>
                    </div>
                    
                    <div className="pt-4 mt-auto">
                        <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-lg shadow-indigo-600/20 flex flex-col relative z-10">
                            <span className="text-[10px] font-black uppercase opacity-80 tracking-widest mb-1">Hesaplanan Tahmini Teklif Tutarı</span>
                            <span className="text-3xl font-black">{formatCurrency(results.totalPriceEUR, "EUR")}</span>
                        </div>
                    </div>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  )
}