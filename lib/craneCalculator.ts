export interface OfferInputs {
  // Girdiler
  kapasiteKg: number;
  aciklikS: number;
  yukseklikH: number;
  holBoyuL: number;
  kopruTipi: string;
  kutuAltUstGenislik: number;
  kutuAltUstKalinlik: number;
  kutuYanYukseklik: number;
  kutuYanKalinlik: number;
  dikPayandaAraligi: number;
  payandaKalinligi: number;
  kosebent: string;
  kareGenislikb: number;
  kareYukseklikh: number;
  rayAltiGenislik: number;
  rayAltiYukseklik: number;
  makineAgirligi: number;
  baslikTekerSayisi: number;
  tamburCapi: number;
  halatSayisi: number;
  tamburaGelenHalatSayisi: number;
  kaldirmaHizi: number;
  yurutmeHizi: number;
  ivmelenmeSuresi: number;
  
  // Fiyatlar
  fiyatIscilikKg: number;
  fiyatMakineListe: number;
  fiyatPlatformMetre: number;
  fiyatCRayKopru: number;
  fiyatCRayYurume: number;
  fiyatUzaktanKumanda: number;
  fiyatBoyaKumlama: number;
  fiyatMontajYevmiye: number;
  
  // Seçimler
  platformYapilacak: string;
  cRayKopru: string;
  cRayYurumeYolu: string;
  uzaktanKumanda: string;
  boyaKumlama: string;
  montajYapilacak: string;
  montajSuresiGun: number;
  montajElemaniSayisi: number;
  
  paraBirimi: string;
}

export const calculateCraneProject = (inputs: OfferInputs, kurCarpani: number = 1) => {
  const yerCekimi = 9.81; 
  const celikYogunlukKutu = 8.00; // Excel Kuralı
  const celikYogunlukRay = 7.85;  // Excel Kuralı
  
  let kopruAgirlikKg = 0;
  
  // 1. STATİK: KÖPRÜ AĞIRLIĞI
  if (inputs.kopruTipi === 'Çift Kiriş Kutu Tipi') {
    const altUst = (inputs.kutuAltUstKalinlik * inputs.kutuAltUstGenislik * inputs.aciklikS * celikYogunlukKutu * 4) / 1000000;
    const yan = (inputs.kutuYanYukseklik * inputs.kutuYanKalinlik * inputs.aciklikS * celikYogunlukKutu * 4) / 1000000;
    const kareRay = (inputs.kareGenislikb * inputs.kareYukseklikh * inputs.aciklikS * celikYogunlukKutu * 2) / 1000000;
    
    const payandaAdet = Math.ceil(inputs.aciklikS / inputs.dikPayandaAraligi);
    const diyafram = ((inputs.kutuYanYukseklik - 10) * (inputs.kutuAltUstGenislik - 60) * inputs.payandaKalinligi * payandaAdet * 2 * celikYogunlukKutu) / 1000000;
    
    const kosebentCarpan = (inputs.kosebent === '30x30x3 mm' && inputs.kutuYanYukseklik < 1000) ? (1.36 * 8) : 
                           (inputs.kosebent === '30x30x3 mm' && inputs.kutuYanYukseklik >= 1000) ? (1.36 * 12) : (2.42 * 12);
    const kosebentAgirlik = (kosebentCarpan * inputs.aciklikS) / 1000;
    const ek = (inputs.aciklikS * 30) / 1000;
    
    kopruAgirlikKg = altUst + yan + kareRay + diyafram + kosebentAgirlik + ek;
  } else if (inputs.kopruTipi === 'Çift Kiriş Hadde Profil') {
    const rayKareAgirlik = (inputs.kareGenislikb * inputs.kareYukseklikh * 8 * inputs.aciklikS) / 1000000;
    kopruAgirlikKg = ((66.3 * inputs.aciklikS / 1000) + rayKareAgirlik) * 2; // Sabit 66.3 IPE400
  }

  // Yürüme Yolu
  const rayAltiSacAgirlik = (inputs.rayAltiGenislik * inputs.rayAltiYukseklik * celikYogunlukRay) / 1000;
  const yurumeYoluAgirlikKg = (50.5 + rayAltiSacAgirlik) * (inputs.holBoyuL / 1000) * (inputs.kopruTipi.includes('Çift') ? 2 : 1);
  const toplamCelikAgirlik = kopruAgirlikKg + yurumeYoluAgirlikKg;

  // 2. MEKANİK MOTOR HESAPLARI
  const mekanikEmniyetliAgirlik = kopruAgirlikKg * 1.1; 
  const yaklasmaMesafesi = 1000; 
  const maxTekerYuku = (mekanikEmniyetliAgirlik + ((inputs.kapasiteKg + inputs.makineAgirligi) * ((inputs.aciklikS - yaklasmaMesafesi) / inputs.aciklikS))) / inputs.baslikTekerSayisi * 2;
  
  const kaldirmaVerimi = 0.95;
  const gerekliKaldirmaTorku = (inputs.kapasiteKg * yerCekimi * (inputs.tamburCapi / 2000) * inputs.tamburaGelenHalatSayisi) / (kaldirmaVerimi * inputs.halatSayisi);
  const kaldirmaReduktorCikisDevri = (inputs.kaldirmaHizi * inputs.halatSayisi) / (Math.PI * (inputs.tamburCapi / 1000) * inputs.tamburaGelenHalatSayisi);
  const gerekliMotorGucu = (gerekliKaldirmaTorku * kaldirmaReduktorCikisDevri) / (9550 * 0.94);
  
  const yurutmeDirenci = maxTekerYuku * (inputs.baslikTekerSayisi / 2) * 6 * 9.81 / 1000000;
  const ivmelenmeGucu = (maxTekerYuku * (inputs.baslikTekerSayisi / 2)) * Math.pow((inputs.yurutmeHizi / 60), 2) / (inputs.ivmelenmeSuresi * 0.9 * 1000) * 1.2;
  const yurutmeEylemsizlik = (yurutmeDirenci * inputs.yurutmeHizi) / (60 * 0.9);
  const yurutmeMotorGucu = (ivmelenmeGucu + yurutmeEylemsizlik) / 1.4;

  // 3. MÜHENDİSLİK GÜVENLİK SINIR KONTROLLERİ
  let isEngineeringValid = true;
  let engineeringWarnings: string[] = [];
  
  // Sehim Kontrolü (Örnek)
  if (inputs.aciklikS / inputs.kutuAltUstGenislik > 65) {
     isEngineeringValid = false;
     engineeringWarnings.push("S/B < 65 Sınırı Aşıldı: Açıklık/Genişlik oranı güvenlik sınırları dışında.");
  }
  if (inputs.aciklikS / inputs.kutuYanYukseklik > 25) {
     isEngineeringValid = false;
     engineeringWarnings.push("S/H < 25 Sınırı Aşıldı: Açıklık/Yükseklik oranı güvenlik sınırları dışında.");
  }

  // 4. MALİYET (Önce TL)
  const celikIscilikMaliyetiTL = toplamCelikAgirlik * inputs.fiyatIscilikKg; 
  const makinaFiyatiTL = inputs.fiyatMakineListe; 

  let ekstraMaliyetlerTL = 0;
  if (inputs.platformYapilacak === 'YAPILACAK') ekstraMaliyetlerTL += (inputs.aciklikS / 1000) * inputs.fiyatPlatformMetre;
  if (inputs.cRayKopru === 'YAPILACAK') ekstraMaliyetlerTL += inputs.fiyatCRayKopru;
  if (inputs.cRayYurumeYolu === 'YAPILACAK') ekstraMaliyetlerTL += inputs.fiyatCRayYurume;
  if (inputs.uzaktanKumanda === 'YAPILACAK') ekstraMaliyetlerTL += inputs.fiyatUzaktanKumanda;
  if (inputs.boyaKumlama === 'YAPILACAK') ekstraMaliyetlerTL += inputs.fiyatBoyaKumlama;
  
  let montajMaliyetiTL = inputs.montajYapilacak === 'YAPILACAK' ? (inputs.montajSuresiGun * inputs.montajElemaniSayisi * inputs.fiyatMontajYevmiye) : 0;
  
  const tahminiToplamSatisTL = celikIscilikMaliyetiTL + makinaFiyatiTL + ekstraMaliyetlerTL + montajMaliyetiTL;

  // 5. KURA ÇEVİRME
  return {
    kopruAgirlikKg: parseFloat(kopruAgirlikKg.toFixed(2)),
    yurumeYoluAgirlikKg: parseFloat(yurumeYoluAgirlikKg.toFixed(2)),
    toplamCelikAgirlik: parseFloat(toplamCelikAgirlik.toFixed(2)),
    
    gerekliKaldirmaTorku: parseFloat(gerekliKaldirmaTorku.toFixed(2)),
    gerekliMotorGucu: parseFloat(gerekliMotorGucu.toFixed(2)),
    yurutmeMotorGucu: parseFloat(yurutmeMotorGucu.toFixed(2)),
    maxTekerYuku: parseFloat(maxTekerYuku.toFixed(2)),
    
    celikIscilikMaliyeti: parseFloat((celikIscilikMaliyetiTL * kurCarpani).toFixed(2)),
    makinaFiyati: parseFloat((makinaFiyatiTL * kurCarpani).toFixed(2)),
    ekstraMaliyetler: parseFloat((ekstraMaliyetlerTL * kurCarpani).toFixed(2)),
    montajMaliyeti: parseFloat((montajMaliyetiTL * kurCarpani).toFixed(2)),
    tahminiToplamSatis: parseFloat((tahminiToplamSatisTL * kurCarpani).toFixed(2)),
    
    isEngineeringValid,
    engineeringWarnings
  };
};
