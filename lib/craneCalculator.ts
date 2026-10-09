// =============================================================================
// BUVİSAN – Vinç Hesaplama Motoru
// Kaynak: GÜNCEL_TEKLİF_ŞABLONU-BUVİSAN-22_04_2026.xlsx (ÇELİK KONSTRÜKSİYON,
// MEKANİK, MALİYET SAYFASI, TEKLİF FORMU, TEKLİF FORMU-ENG, TCMB sayfaları)
// Her formül Excel'deki hücre adresiyle yorumlanmıştır. Excel davranışları
// (VLOOKUP yaklaşık/tam eşleşme, ROUNDUP, MROUND) birebir korunmuştur.
// =============================================================================
import {
  PROFILES1, PROFILES2, CAPS, MAL_ROWS, CIFT_FIYAT, TEK_HDR, TEK_FIYAT,
  BASLIK_FIYAT, BUSBAR, TEKER_TABLO, DONAM_VERIM, MOTOR_E, MOTOR_B,
} from './craneData';

export class CalcError extends Error {
  constructor(msg: string) { super(msg); this.name = 'CalcError'; }
}

export type KopruTipi =
  | 'Çift Kiriş Kutu Tipi' | 'Çift Kiriş Hadde Profil'
  | 'Tek Kiriş Kutu Tipi' | 'Tek Kiriş Hadde Profil';

export interface OfferInputs {
  // ÇELİK KONSTRÜKSİYON – genel (B2:B9, B16)
  kapasiteKg: number; aciklikS: number; yukseklikH: number; holBoyuL: number;
  direkArasiL1: number; kopruTipi: KopruTipi | string; direkAdeti: number;
  direkBoyu: number; baslikTekerMerkezi: number;
  // Çift kiriş kutu (E2:E10)
  kutuAltUstGenislik: number; kutuAltUstKalinlik: number; kutuYanYukseklik: number;
  kutuYanKalinlik: number; kareGenislikb: number; kareYukseklikh: number;
  dikPayandaAraligi: number; payandaKalinligi: number; kosebent: string;
  // Çift kiriş hadde (J2:J4)
  cHaddeProfil: string; cHaddeB: number; cHaddeH: number;
  // Tek kiriş kutu (M2:M11)
  tAltGenislik: number; tAltKalinlik: number; tYanYukseklik: number; tYanKalinlik: number;
  tUstGenislik: number; tUstKalinlik: number; tKonsol: number;
  tPayandaAralik: number; tPayandaKalinlik: number; tKosebent: string;
  // Tek kiriş hadde (R2)
  tHaddeProfil: string;
  // Yürüme yolu (E14:E16, G14:G17)
  yurumeYoluTipi: string; yurumeProfil: string; yurumeB: number; yurumeH: number;
  rayB1: number; rayH1: number; rayAltiGenislik: number; rayAltiYukseklik: number;
  // Direk
  direkTipi: string; direkNpuProfil: string; direkNpuGenislik: number;
  direkKareGenislik: number; direkKareKalinlik: number;
  // MEKANİK
  halatSayisi: number; tamburaGelenHalat: number; kopruYurutmeHizi: number;
  kopruIvmelenme: number; baslikTekerSayisi: number; kediYurutmeHizi: number;
  kediIvmelenme: number; kediTekerSayisi: number;
  // MALİYET seçenekleri
  hareketSayisi: number; guse: string; platform: string; cRayKopru: string;
  cRayYurumeYolu: string; uzaktanKumanda: string; boyaKumlama: string;
  asiriYukSivici: string; busbarAmper: number; montajYapilacak: string;
  montajGun: number; montajKisi: number;
  // MALİYET birim fiyatları (TL)
  fiyatSacIscilik: number; fiyatProfilIscilik: number; fiyatGunlukIscilik: number;
  cRayBirim: number; cRayYurumeTutar: number; uzaktanKumandaTutar: number;
  boyaBirim: number; asiriYukTutar: number;
  kar: number; komisyon: number; finansman: number; nakliye: number;
  // Kur (TL) – TCMB Döviz Satış
  kurUSD: number; kurEUR: number;
}

export const DEFAULT_INPUTS: OfferInputs = {
  kapasiteKg: 10000, aciklikS: 15000, yukseklikH: 6000, holBoyuL: 30000,
  direkArasiL1: 6000, kopruTipi: 'Çift Kiriş Kutu Tipi', direkAdeti: 12, direkBoyu: 6000,
  baslikTekerMerkezi: 2800,
  kutuAltUstGenislik: 390, kutuAltUstKalinlik: 6, kutuYanYukseklik: 800, kutuYanKalinlik: 6,
  kareGenislikb: 40, kareYukseklikh: 30, dikPayandaAraligi: 1000, payandaKalinligi: 5,
  kosebent: '30x30x3 mm',
  cHaddeProfil: 'IPE400', cHaddeB: 40, cHaddeH: 30,
  tAltGenislik: 350, tAltKalinlik: 15, tYanYukseklik: 1000, tYanKalinlik: 6,
  tUstGenislik: 450, tUstKalinlik: 6, tKonsol: 65, tPayandaAralik: 1000,
  tPayandaKalinlik: 5, tKosebent: '30x30x3 mm',
  tHaddeProfil: 'IPE500',
  yurumeYoluTipi: 'Çelik Yürüme Yolu', yurumeProfil: 'IPE300', yurumeB: 40, yurumeH: 30,
  rayB1: 40, rayH1: 30, rayAltiGenislik: 120, rayAltiYukseklik: 10,
  direkTipi: 'Kare Kutu Profil', direkNpuProfil: 'NPU 180', direkNpuGenislik: 300,
  direkKareGenislik: 200, direkKareKalinlik: 5,
  halatSayisi: 4, tamburaGelenHalat: 1, kopruYurutmeHizi: 20, kopruIvmelenme: 5,
  baslikTekerSayisi: 4, kediYurutmeHizi: 20, kediIvmelenme: 3, kediTekerSayisi: 4,
  hareketSayisi: 12, guse: 'YAPILMAYACAK', platform: 'YAPILACAK', cRayKopru: 'YAPILACAK',
  cRayYurumeYolu: 'YOK', uzaktanKumanda: 'YAPILACAK', boyaKumlama: 'YAPILACAK',
  asiriYukSivici: 'CERESTECH 5 T/HALAT TİPİ LOADCELL', busbarAmper: 50,
  montajYapilacak: 'YAPILACAK', montajGun: 3, montajKisi: 3,
  fiyatSacIscilik: 75, fiyatProfilIscilik: 75, fiyatGunlukIscilik: 6000,
  cRayBirim: 2000, cRayYurumeTutar: 0, uzaktanKumandaTutar: 15000, boyaBirim: 250,
  asiriYukTutar: 10000, kar: 30, komisyon: 0, finansman: 0, nakliye: 0,
  kurUSD: 0, kurEUR: 0,
};

// ---------------------------------------------------------------- yardımcılar
const trUp = (s: string) => String(s ?? '').toLocaleUpperCase('tr-TR');
const eq = (a: string, b: string) => trUp(a) === trUp(b);          // Excel "=" büyük/küçük harf duyarsız
const abs = Math.abs;

function vl1(name: string, col: number): number {                  // VLOOKUP(name,'PROFİLLER-1'!A4:N85,col,FALSE)
  const r = PROFILES1[name];
  if (!r) throw new CalcError(`Profil bulunamadı (PROFİLLER-1): "${name}"`);
  const v = r[col - 1];
  if (typeof v !== 'number') throw new CalcError(`Profil verisi eksik: ${name} (sütun ${col})`);
  return v;
}
function vl2(name: string, col: number): number {                  // VLOOKUP(name,'PROFİLLER-2'!A7:AE26,col,FALSE)
  const r = PROFILES2[name];
  if (!r) throw new CalcError(`NPU profili bulunamadı (PROFİLLER-2): "${name}"`);
  const v = r[col - 1];
  if (typeof v !== 'number') throw new CalcError(`NPU verisi eksik: ${name} (sütun ${col})`);
  return v;
}
function approx(x: number, pairs: [number, number][], what: string): number {   // VLOOKUP(...,TRUE)
  let res: number | null = null;
  for (const [k, v] of pairs) { if (k <= x) res = v; else break; }
  if (res === null) throw new CalcError(`${what}: ${x} tablo başlangıcının altında (Excel #N/A)`);
  return res;
}
const roundUp = (x: number, d: number) => {                        // ROUNDUP (sıfırdan uzağa)
  const m = Math.pow(10, d);
  return Math.sign(x) * Math.ceil(+(abs(x) * m).toPrecision(12)) / m;
};
const mround = (x: number, m: number) => Math.round(x / m) * m;    // MROUND (pozitif)
const round10 = (x: number) => Math.round(x * 1e10) / 1e10;

// MALİYET SAYFASI!K24:V38 – kapasiteye göre tablo satırları
const CAP_ROW = { MOTOR: 25, HIZ: 26, HALAT: 27, DONAM: 28, KEDI_KW: 29, KEDI_ADET: 30,
  KEDI_TEKER: 31, MAK_AGIRLIK: 32, RAYDAN: 33, MAK_TEKER_ARASI: 34, TAMBUR: 35,
  KOPRU_KW: 36, KOPRU_ADET: 37, KOPRU_TEKER: 38 } as const;
function capLookup(row: number, capTon: number): number | string {
  // HLOOKUP(capTon, M24:V38, satır) – yaklaşık eşleşme: ≤ capTon olan en büyük başlık
  let idx = -1;
  CAPS.forEach((c, i) => { if (c <= capTon) idx = i; });
  if (idx < 0) throw new CalcError(`Kapasite tablo başlangıcının altında: ${capTon} ton`);
  const v = MAL_ROWS[String(row)][idx];
  if (v === null || v === undefined) throw new CalcError(`Kapasite tablosunda değer yok (satır ${row}, ${CAPS[idx]} ton)`);
  return v;
}
const capNum = (row: number, capTon: number) => Number(capLookup(row, capTon));

// ---------------------------------------------------------------- sonuç tipi
export interface Kontrol { ad: string; deger: number; uygun: boolean; metin: string }
export interface Kalem { kod: string; ad: string; tl: number; eur: number; usd: number }
export interface CraneResult {
  // statik
  kopruAgirlikKg: number; kopruMetresiKg: number; kirisYuku: number;
  maxSehim: number; sehimOrani: number; yanalSehim: number;
  yurumeYoluAgirlikKg: number; direkAgirlikKg: number; toplamCelikAgirlik: number;
  makineAgirligi: number; standartKapasiteTon: number;
  yurumeYoluSehim: number; yurumeYoluSehimOrani: number; yurumeYoluYanalSehim: number;
  direkKritikKuvvetN: number;
  kontroller: Kontrol[];
  // mekanik
  tamburCapi: number; kaldirmaHizi: number; halatCapi: number;
  gerekliKaldirmaTorku: number; gerekliRedCikisDevri: number; gerekliMotorGucu: number; kaldirmaMotorGucu: number;
  kaldirmaFreni: number; tamburBoyu: number; yivSayisi: number; sarilanHalatBoyu: number;
  maxTekerYuku: number; minTekerYuku: number; kopruTekerCapiGerekli: number; kopruTekerCapi: number;
  kopruYurutmeGerekliKw: number; kopruYurutmeMotorKw: number; kopruRedCikisDevri: number; kopruRedCikisMomenti: number;
  kediGerekliKw: number; kediMotorKw: number; kediTekerCapi: number;
  // maliyet
  kalemler: Kalem[]; araToplamTL: number; montajTL: number; toplamMaliyetTL: number;
  teklifTL: number; teklifUSD: number; teklifEUR: number;
  // teklif formu çıktıları
  trSatirlar: { ad: string; eur: number }[]; trToplamEUR: number; enToplamUSD: number;
  form: Record<string, string | number>;
  isEngineeringValid: boolean; engineeringWarnings: string[];
  uyarilar: string[];
}

// =============================================================================
export function calculateCraneProject(i: OfferInputs): CraneResult {
  const uyarilar: string[] = [];
  const B2 = i.kapasiteKg, B3 = i.aciklikS, B4 = i.yukseklikH, B5 = i.holBoyuL;
  const B6 = i.direkArasiL1, B7 = String(i.kopruTipi), B8 = i.direkAdeti, B9 = i.direkBoyu;
  const B16 = i.baslikTekerMerkezi;

  if (!(i.kurUSD > 0) || !(i.kurEUR > 0)) throw new CalcError('Döviz kuru (USD/EUR) alınamadı veya 0. Kuru elle girin.');
  if (!(B2 > 0 && B3 > 0 && B4 > 0 && B5 > 0)) throw new CalcError('Kapasite, açıklık, kaldırma yüksekliği ve hol boyu 0\'dan büyük olmalı.');
  const capTon = B2 / 1000;
  if (capTon > 32) throw new CalcError(`Kapasite ${capTon} ton: Excel şablonunda 32 tonun üzeri fiyat/tablo yoktur. Bu teklif mühendislik ile ayrıca hazırlanmalıdır.`);

  const tipOk = ['Çift Kiriş Kutu Tipi', 'Çift Kiriş Hadde Profil', 'Tek Kiriş Kutu Tipi', 'Tek Kiriş Hadde Profil'];
  const tip = tipOk.find(t => eq(t, B7));
  if (!tip) throw new CalcError(`Geçersiz köprü tipi: ${B7}`);
  const cift = tip.startsWith('Çift');

  // Standart kapasite (B11) – Excel HLOOKUP yaklaşık
  let B11 = -1; CAPS.forEach(c => { if (c <= capTon) B11 = c; });
  if (B11 < 0) throw new CalcError('Kapasite en az 1 ton olmalı.');
  // Fiyat tablosu tam eşleşme ister (MALİYET G6: MATCH(...,0))
  const hdr = cift ? CAPS : TEK_HDR;
  if (!hdr.includes(capTon)) {
    throw new CalcError(`Kapasite ${capTon} ton, ${cift ? 'çift' : 'tek'} kiriş makine fiyat tablosunda yok (Excel #N/A). Geçerli kapasiteler: ${hdr.join(', ')} ton.`);
  }

  const B12 = Number(capLookup(CAP_ROW.MAK_AGIRLIK, B11));      // Makine ağırlığı
  const B15 = Number(capLookup(CAP_ROW.MAK_TEKER_ARASI, B11));  // Makine teker merkezi arası

  // ============================================================ ÇİFT KUTU
  const E2 = i.kutuAltUstGenislik, E3 = i.kutuAltUstKalinlik, E4 = i.kutuYanYukseklik, E5 = i.kutuYanKalinlik;
  const E6 = i.kareGenislikb, E7 = i.kareYukseklikh, E8 = i.dikPayandaAraligi, E9 = i.payandaKalinligi;
  const E10 = i.kosebent;
  if (!(E8 > 0)) throw new CalcError('Dik payanda aralığı 0 olamaz.');
  const S34 = E3 * E2 * B3 * 8 * 4 / 1e6;
  const S35 = E4 * E5 * B3 * 8 * 4 / 1e6;
  const S36 = E6 * E7 * B3 * 8 * 2 / 1e6;
  const S37 = (E4 - 10) * (E2 - 60) * E9 * Math.ceil(+(B3 / E8).toPrecision(12)) * 2 * 8 / 1e6;
  const S38 = (eq(E10, '30x30x3 mm') && E4 < 1000) ? (1.36 * 8 * B3 / 1000)
            : (eq(E10, '30x30x3 mm') && E4 >= 1000) ? (1.36 * 12 * B3 / 1000)
            : (2.42 * 12 * B3 / 1000);
  const S39 = B3 * 30 / 1000;
  const G2 = S34 + S35 + S36 + S37 + S38 + S39;

  // Çift kutu statik (B34:N41)
  const Q34 = (B2 * 1.25 + B12) / 2;
  const b34 = 0.5 * E2, d34 = 0.5 * E3, f34 = E2 * E3;
  const b35 = 25 + 0.5 * E5, d35 = E3 + 0.5 * E4, f35 = E5 * E4;
  const b36 = b34, d36 = E3 + E4 + 0.5 * E3, f36 = E3 * E2;
  const b37 = E2 - 25 - 0.5 * E5, d37 = E3 + 0.5 * E4, f37 = E4 * E5;
  const b38 = E2 - 25 - 0.5 * E5, d38 = E3 + E4 + E3 + 0.5 * E7, f38 = E6 * E7;
  const f39 = f34 + f35 + f36 + f37 + f38;
  const h34 = (b34 * f34 + b35 * f35 + b36 * f36 + b37 * f37 + b38 * f38) / f39;
  const j34 = (f34 * d34 + d35 * f35 + d36 * f36 + d37 * f37 + d38 * f38) / f39;
  const h35 = abs(h34 - b34), h36 = abs(h34 - b35), h37 = abs(h34 - b36), h38 = abs(h34 - b37), h39 = abs(h34 - b38);
  const j35 = abs(j34 - d34), j36 = abs(j34 - d35), j37 = abs(j34 - d36), j38 = abs(j34 - d37), j39 = abs(j34 - d38);
  const l34 = E2 * E3 ** 3 / 12, l35 = E5 * E4 ** 3 / 12, l36 = E2 * E3 ** 3 / 12, l37 = E5 * E4 ** 3 / 12, l38 = E6 * E7 ** 3 / 12;
  const n34 = E3 * E2 ** 3 / 12, n35 = E4 * E5 ** 3 / 12, n36 = E3 * E2 ** 3 / 12, n37 = E4 * E5 ** 3 / 12, n38 = E7 * E6 ** 3 / 12;
  const L40 = l34 + l35 + l36 + l37 + l38 + j35 ** 2 * f34 + j36 ** 2 * f35 + j37 ** 2 * f36 + j38 ** 2 * f37 + j39 ** 2 * f38;
  const N40 = n34 + n35 + n36 + n37 + n38 + (h34 ** 2 * f34 + h35 ** 2 * f35 + h36 ** 2 * f36 + h37 ** 2 * f37 + h38 ** 2 * f38);
  const Q35 = Q34 * B3 ** 3 / 48 / 21000 / L40;
  const Q36 = B3 / Q35;
  const Q37 = Q34 * B3 ** 3 / 7 / 48 / 21000 / N40;

  // ============================================================ ÇİFT HADDE
  const J2 = i.cHaddeProfil, J3 = i.cHaddeB, J4 = i.cHaddeH;
  let J5 = 0, J44 = Q34, J45 = 0, J46 = 0, J48 = 0;
  if (tip === 'Çift Kiriş Hadde Profil') {
    J5 = (vl1(J2, 9) * B3 / 1000 + J3 * J4 * 8 * B3 / 1e6) * 2;
    const D44 = vl1(J2, 10), B45 = vl1(J2, 2), B46 = vl1(J2, 3);
    const F44 = B46 / 2, H44 = B45 / 2, D45 = J4 * J3, F45 = B46 / 2, H45 = B45 + J3 / 2;
    const F46 = (F45 * D45 + F44 * D44) / (D44 + D45);
    const H46 = (D44 * H44 + D45 * H45) / (D44 + D45);
    const F47 = F46 - F44, H47 = abs(H46 - H44), F48 = F46 - F45, H48 = abs(H46 - H45);
    const F49 = J3 * J4 ** 3 / 12, H49 = J4 * J3 ** 3 / 12;
    const F50 = vl1(J2, 11) * 1e6, H50 = vl1(J2, 13) * 1e6;
    const F51 = F49 + F50 + H47 ** 2 * D44 + H48 ** 2 * D45;
    const H51 = H49 + H50 + F47 ** 2 * D44 + F48 ** 2;          // Excel: son terimde D45 çarpanı yok (olduğu gibi)
    J45 = J44 * B3 ** 3 / 48 / 21000 / F51;
    J46 = B3 / J45;
    J48 = J44 * B3 ** 3 / 7 / 48 / 21000 / H51;
  }

  // ============================================================ TEK KUTU
  const M2 = i.tAltGenislik, M3 = i.tAltKalinlik, M4 = i.tYanYukseklik, M5 = i.tYanKalinlik;
  const M6 = i.tUstGenislik, M7 = i.tUstKalinlik, M8 = i.tKonsol, M9 = i.tPayandaAralik, M10 = i.tPayandaKalinlik;
  const M11 = i.tKosebent;
  let O2 = 0, B54 = B2 * 1.25 + B12, Q65 = 0, Q66 = 0, Q68 = 0;
  if (tip === 'Tek Kiriş Kutu Tipi') {
    if (!(M9 > 0)) throw new CalcError('Tek kiriş payanda aralığı 0 olamaz.');
    const S64 = M2 * M3 * 8 * B3 / 1e6;
    const S65 = M4 * M5 * 8 * 2 * B3 / 1e6;
    const S66 = M6 * M7 * 8 * B3 / 1e6;
    const S67 = ((M4 - 10) * (M2 - 2 * M8 - 10) * M10 * 7.85 / 1e6) * (B3 / M9);
    // Excel S68: koşul E4'e (çift kiriş yan sac yüksekliği) bakar – olduğu gibi korunmuştur
    const S68 = (eq(M11, '30x30x3 mm') && E4 < 1000) ? (1.36 * 8 * B3 / 1000)
              : (eq(M11, '30x30x3 mm') && E4 >= 1000) ? (1.36 * 12 * B3 / 1000)
              : (2.42 * 12 * B3 / 1000);
    O2 = S64 + S65 + S66 + S67 + S68;
    const b64 = 0.5 * M2, d64 = 0.5 * M3, f64 = M2 * M3;
    const b65 = M8 + 0.5 * M5, d65 = M3 + 0.5 * M4, f65 = M4 * M5;
    const b66 = 0.5 * M2, d66 = M3 + M4 + 0.5 * M7, f66 = M6 * M7;
    const b67 = M2 - M8 - 0.5 * M5, d67 = M3 + 0.5 * M4, f67 = M4 * M5;
    const f68 = f64 + f65 + f66 + f67;
    const h64 = (b64 * f64 + b65 * f65 + b66 * f66 + b67 * f67) / f68;
    const j64 = (d64 * f64 + d65 * f65 + d66 * f66 + d67 * f67) / f68;
    const h65 = abs(h64 - b64), h66 = abs(h64 - b65), h67 = abs(h64 - b66), h68 = abs(h64 - b67);
    const j65 = abs(j64 - d64), j66 = abs(j64 - d65), j67 = abs(j64 - d66), j68 = abs(j64 - d67);
    const l64 = M2 * M3 ** 3 / 12, l65 = M5 * M4 ** 3 / 12, l66 = M6 * M7 ** 3 / 12, l67 = M5 * M4 ** 3 / 12;
    const n64 = M3 * M2 ** 3 / 12, n65 = M4 * M5 ** 3 / 12, n66 = M7 * M6 ** 3 / 12, n67 = M4 * M5 ** 3 / 12;
    const L68 = l64 + l65 + l66 + l67 + (j65 ** 2 * f64 + j66 ** 2 * f65 + j67 ** 2 * f66 + j68 ** 2 * f67);
    const N68 = n64 + n65 + n66 + n67 + (h65 ** 2 * f64 + h66 ** 2 * f65 + h67 ** 2 * f66 + h68 ** 2 * f67);
    Q65 = B54 * B3 ** 3 / 48 / 21000 / L68;
    Q66 = B3 / Q65;
    Q68 = B54 * B3 ** 3 / 7 / 48 / 21000 / N68;
  }

  // ============================================================ TEK HADDE
  const R2 = i.tHaddeProfil;
  let R6 = 0, B55 = 0, B56 = 0, B58 = 0;
  if (tip === 'Tek Kiriş Hadde Profil') {
    R6 = vl1(R2, 9) * B3 / 1000;
    B55 = B54 * B3 ** 3 / 48 / 21000 / vl1(R2, 11) / 1e6;
    B56 = B3 / B55;
    B58 = B54 * B3 ** 3 / 7 / 48 / 21000 / vl1(R2, 13) / 1e6;
  }

  // Köprü ağırlığı (MEKANİK E3 / MALİYET D10)
  const kopruAgirlik = tip === 'Çift Kiriş Kutu Tipi' ? G2
    : tip === 'Çift Kiriş Hadde Profil' ? J5
    : tip === 'Tek Kiriş Kutu Tipi' ? O2 : R6;
  const kopruMetresi = tip === 'Çift Kiriş Kutu Tipi' ? G2 / B3 * 1000 / 2
    : tip === 'Çift Kiriş Hadde Profil' ? J5 / B3 * 1000 / 2
    : tip === 'Tek Kiriş Kutu Tipi' ? O2 * 1000 / B3 : R6 * 1000 / B3;
  const kirisYuku = tip === 'Çift Kiriş Kutu Tipi' ? Q34 : tip === 'Çift Kiriş Hadde Profil' ? J44
    : B54;
  const maxSehim = tip === 'Çift Kiriş Kutu Tipi' ? Q35 : tip === 'Çift Kiriş Hadde Profil' ? J45
    : tip === 'Tek Kiriş Kutu Tipi' ? Q65 : B55;
  const sehimOrani = tip === 'Çift Kiriş Kutu Tipi' ? Q36 : tip === 'Çift Kiriş Hadde Profil' ? J46
    : tip === 'Tek Kiriş Kutu Tipi' ? Q66 : B56;
  const yanalSehim = tip === 'Çift Kiriş Kutu Tipi' ? Q37 : tip === 'Çift Kiriş Hadde Profil' ? J48
    : tip === 'Tek Kiriş Kutu Tipi' ? Q68 : B58;

  // ============================================================ YÜRÜME YOLU (hadde profil)
  const E14 = i.yurumeProfil, E15 = i.yurumeB, E16 = i.yurumeH;
  const E18 = vl1(E14, 9) + (E15 * E16 * 7.85 / 1000);
  const E17 = E18 * B5 / 1000 * 2;
  const G14 = i.rayB1, G15 = i.rayH1, G16 = i.rayAltiGenislik, G17 = i.rayAltiYukseklik;
  const G18 = (G14 * G15 + G16 * G17) * 8 * B5 * 2 / 1e6;
  // yürüme yolu sehim (J73:J79)
  const D73 = vl1(E14, 10), B74 = vl1(E14, 2), B75 = vl1(E14, 3);
  const F73 = B75 / 2, H73 = B74 / 2, D74 = E15 * E16, F74 = B75 / 2, H74 = B74 + E16 / 2;
  const F75 = (F74 * D74 + F73 * D73) / (D73 + D74);
  const H75 = (D73 * H73 + D74 * H74) / (D73 + D74);
  const F76 = F75 - F73, H76 = abs(H75 - H73), F77 = F75 - F74, H77 = abs(H75 - H74);
  const F78 = E15 * E16 ** 3 / 12, H78 = E16 * E15 ** 3 / 12;
  const F79 = vl1(E14, 11) * 1e6, H79 = vl1(E14, 13) * 1e6;
  const F80 = F78 + F79 + H76 ** 2 * D73 + H77 ** 2 * D74;
  const H80 = H78 + H79 + F76 ** 2 * D73 + F77 ** 2;
  const J74 = kopruAgirlik * 1.1 / 2;
  const J75 = J74 + Q34;                                         // Excel J73 = Q34
  const J76 = (J75 * (B6 - B16) * (3 * B6 ** 2 - (B6 - B16) ** 2)) / 192 / 21000 / F80;
  const J77 = B6 / J76;
  const J79 = (J75 * (B6 - B16) * (3 * B6 ** 2 - (B6 - B16) ** 2)) / 192 / 21000 / 7 / H80;

  // ============================================================ DİREK
  let J21 = 0, M21 = 0, direkKritik = 0;
  const J15 = i.direkNpuGenislik, J16 = B9;
  const J22 = vl2(i.direkNpuProfil, 17) * 2 * J16 / 1000
    + (J16 / 500) * (80 * J15 * 8) * 8 * 2 / 1e6
    + (B74 + 150) * (J15 + 150) * 10 * 8 * 2 / 1e6;
  J21 = J22 * B8;
  const M14 = i.direkKareGenislik, M15 = i.direkKareKalinlik, M16 = B9;
  const M22 = ((M14 ** 2 * M16 - (M14 - 2 * M15) ** 2 * M16) + ((M14 + 150) ** 2 * 12 * 2)) * 8 / 1e6;
  M21 = M22 * B8;
  const direkTip = eq(i.direkTipi, 'Kare Kutu Profil') ? 'KARE' : eq(i.direkTipi, 'NPU Örme') ? 'NPU' : 'YOK';
  {
    const D90 = vl2(i.direkNpuProfil, 18) * 1e4 * 2;            // F86=F87=0 ⇒ D90=2·D88
    const H83 = Math.PI ** 2 * 21000 * D90 / (4 * J16 ** 2);
    const B93 = (M14 * M14 ** 3 / 12 + M14 * M14 * M14 / 2 - (M14 - M15 * 2) * (M14 - M15 * 2) ** 3 / 12
      - (M14 - M15 * 2) * (M14 - M15 * 2) * M14 / 2) / 1.05;
    const B94 = Math.PI ** 2 * 21000 * B93 / (2 * M16) ** 2;
    direkKritik = direkTip === 'NPU' ? H83 : direkTip === 'KARE' ? B94 : 0;
  }

  // ============================================================ MEKANİK
  const M_B2 = B2;
  const M_B3 = capNum(CAP_ROW.TAMBUR, capTon);
  const M_B4 = i.halatSayisi, M_B5 = i.tamburaGelenHalat;
  const verim = DONAM_VERIM.find(([k]) => k === M_B4);
  if (!verim) throw new CalcError(`Yük taşıyan halat sayısı ${M_B4} geçersiz. Geçerli: ${DONAM_VERIM.map(x => x[0]).join(', ')}`);
  const M_B6 = M_B2 * 9.81 * (M_B3 / 2000) * M_B5 / (verim[1] * M_B4);
  const M_B8 = capNum(CAP_ROW.HIZ, capTon);
  const M_B9 = M_B8 * M_B4 / (Math.PI * (M_B3 / 1000)) / M_B5;
  const M_B10 = M_B6 * M_B9 / (9550 * 0.94);
  const M_B11 = approx(M_B10, MOTOR_B, 'Kaldırma motoru');
  const M_B12 = M_B11 * 9550 / 1400;

  const M_E3 = kopruAgirlik * 1.1, M_E4 = i.kopruYurutmeHizi, M_E5 = i.kopruIvmelenme, M_G2 = i.baslikTekerSayisi;
  if (!(M_G2 > 0 && M_E5 > 0 && i.kediTekerSayisi > 0 && i.kediIvmelenme > 0)) throw new CalcError('Teker sayısı ve ivmelenme süreleri 0 olamaz.');
  const G9 = (M_E3 + (B12 + M_B2) * ((B3 - 1000) / B3)) / M_G2 * 2;
  const G10 = (M_E3 + (B12 + M_B2) * (1000 / B3)) / M_G2 * 2;
  const G3 = (2 * G9 + G10) / 3;
  const G4 = G3 * 9.81 / (E15 * 5.6 * 1.1 * 1.12);               // Excel: ÇELİK!E15
  const G5 = approx(G4, TEKER_TABLO, 'Köprü teker çapı');
  const mE6 = G9 * M_G2 / 2 * 6 * 9.81 / 1e6;
  const mE7 = mE6 * M_E4 / (60 * 0.9);
  const mE8 = G9 * M_G2 / 2 * (M_E4 / 60) ** 2 / (M_E5 * 0.9 * 1000) * 1.2;
  const M_E9 = (mE8 + mE7) / 1.4;
  const M_E10 = approx(M_E9, MOTOR_E, 'Köprü yürütme motoru');
  const G6 = M_E4 * 1000 / (G5 * 3.14);
  const G7 = M_E9 * 9550 * 0.95 / G6;

  const KE15 = i.kediYurutmeHizi, KE16 = i.kediIvmelenme, KG15 = i.kediTekerSayisi;
  const KG16 = (B12 + M_B2 * 1.03) / KG15;
  const KE17 = KG16 * KG15 * 1.1 * 9.81 * 6 / 1e6;
  const KE18 = KE17 * KE15 / (60 * 0.9);
  const KE19 = M_B2 * 1.1 * (KE15 / 60) ** 2 / (KE16 * 0.9 * 1000);
  const KE20 = (KE19 + KE18) / 1.4;
  const KE21 = approx(KE20, MOTOR_E, 'Kedi yürütme motoru');
  const KG18 = KG16 * 9.81 / (E6x(i) * 5.6 * 1.1 * 1.12);        // Excel: ÇELİK!E6
  const KG19 = approx(KG18, TEKER_TABLO, 'Kedi teker çapı');

  const M_B15 = B4, M_B16 = M_B3, M_B17 = capNum(CAP_ROW.HALAT, capTon), M_B18 = M_B4;
  const M_B19 = M_B17 + 2, M_B20 = M_B16 * 3.14, M_B21 = M_B15 * M_B4 / M_B20 + 4;
  const M_B22 = M_B21 * M_B19 + 50, M_B24 = (M_B15 * M_B18 + 4000) / 1000;

  // ============================================================ MALİYET SAYFASI
  const F1 = i.kurUSD, F2 = i.kurEUR;
  const marj = (i.kar + i.komisyon) / 100;
  const yap = (s: string) => eq(s, 'YAPILACAK');

  // G6 – kaldırma makinesi
  let G6m: number;
  {
    const hareketler = [4, 8, 10, 12];
    let hk = -1; hareketler.forEach(h => { if (h <= i.hareketSayisi) hk = h; });
    if (hk < 0) throw new CalcError('Hareket sayısı en az 4 olmalı (Excel VLOOKUP #N/A).');
    const ci = hdr.indexOf(capTon);
    const row = cift ? CIFT_FIYAT[String(hk)] : TEK_FIYAT[String(hk)];
    G6m = Number(row[ci] ?? 0);
    if (!(G6m > 0)) throw new CalcError(`Fiyat tablosunda ${capTon} ton / ${hk} hareket için makine fiyatı tanımlı değil (Excel'de 0 görünür).`);
  }
  // G7 – başlık
  const bi = CAPS.indexOf(capTon);
  if (bi < 0) throw new CalcError(`Başlık fiyat tablosunda ${capTon} ton yok (Excel #N/A).`);
  const G7m = Number(BASLIK_FIYAT[bi]);

  // G10 – köprü konstrüksiyonu
  const G10m = i.fiyatSacIscilik * kopruAgirlik;
  // G11 – yürüme yolu
  const ytip = eq(i.yurumeYoluTipi, 'Çelik Yürüme Yolu') ? 'CELIK' : eq(i.yurumeYoluTipi, 'Beton Yola Ray & Rayaltı') ? 'BETON' : 'YOK';
  const D11 = ytip === 'CELIK' ? E17 : ytip === 'BETON' ? G18 : 0;
  const G11m = i.fiyatProfilIscilik * D11;
  // G12 – kolon
  const D12 = direkTip === 'KARE' ? M21 : direkTip === 'NPU' ? J21 : 0;
  const G12m = i.fiyatProfilIscilik * D12;
  // G13 – güse
  const guseOn = yap(i.guse);
  const D13 = E18 * 0.6 * B8;
  const G13m = guseOn ? i.fiyatProfilIscilik * D13 : 0;
  // G14 – platform
  const D14 = kopruAgirlik / 10;
  const G14m = yap(i.platform) ? D14 * i.fiyatProfilIscilik : 0;
  // G16 – busbar (USD/m → TL)
  const E16b = BUSBAR[String(i.busbarAmper)];
  if (E16b === undefined) throw new CalcError(`Busbar ${i.busbarAmper}A tabloda yok. Geçerli: ${Object.keys(BUSBAR).join(', ')}`);
  const G16m = i.busbarAmper ? E16b * B5 * F1 / 1000 : 0;
  // G17 – C ray köprü
  const G17m = yap(i.cRayKopru) ? i.cRayBirim * B3 / 1000 : 0;
  // G18 – C ray yürüme yolu (Excel'de formülsüz boş hücre)
  const G18m = yap(i.cRayYurumeYolu) ? i.cRayYurumeTutar : 0;
  // G19 / G20 / G21
  const G19m = yap(i.uzaktanKumanda) ? i.uzaktanKumandaTutar : 0;
  const G20m = yap(i.boyaKumlama) ? B3 * i.boyaBirim / 100 : 0;
  const G21m = i.asiriYukSivici && !eq(i.asiriYukSivici, 'YOK') ? i.asiriYukTutar : 0;

  const araToplam = G6m + G7m + G10m + G11m + G12m + G13m + G14m + G16m + G17m + G18m + G19m + G20m + G21m;
  const G26 = yap(i.montajYapilacak) ? i.montajGun * i.montajKisi * i.fiyatGunlukIscilik : 0;
  const G28 = araToplam * (1 + i.finansman / 100) + i.nakliye + G26;
  const G32 = G28 * (1 + marj);
  const G33 = G32 / F1, G34 = G32 / F2;

  const mk = (kod: string, ad: string, tl: number): Kalem => {
    const t = tl * (1 + marj);
    return { kod, ad, tl: t, eur: t / F2, usd: t / F1 };
  };
  const kalemler: Kalem[] = [
    mk('I6', 'Kaldırma makinesi', G6m), mk('I7', 'Köprü yürütme başkirişi', G7m),
    mk('I10', 'Köprü konstrüksiyonu', G10m), mk('I11', 'Yürüme yolu', G11m),
    mk('I12', 'Kolon', G12m), mk('I13', 'Güse', G13m), mk('I14', 'Platform', G14m),
    mk('I16', 'Busbar', G16m), mk('I17', 'C-Ray köprü', G17m), mk('I18', 'C-Ray yürüme yolu', G18m),
    mk('I19', 'Uzaktan kumanda', G19m), mk('I20', 'Boya ve kumlama', G20m),
    mk('I21', 'Aşırı yük sivici', G21m),
    // Excel I24:I26 – finansman/nakliye/montaj tutar olarak işaretlenir
    mk('I24', 'Finansman', i.finansman), mk('I25', 'Nakliye', i.nakliye), mk('I26', 'Montaj', G26),
  ];
  const J = (kod: string) => kalemler.find(k => k.kod === kod)!.eur;
  const toplamJ = kalemler.reduce((s, k) => s + k.eur, 0);

  // ============================================================ TEKLİF FORMU (TR) – EUR satırları
  const ru = (x: number) => mround(roundUp(x, 2), 10);
  const trSatirlar = [
    { ad: `${capTon} Ton ${cift ? 'Çift Kirişli' : 'Monoray'} Kaldırma Makinesi`, eur: ru(J('I6')) },
    { ad: `${capTon} Ton Köprü Yürütme Başkirişi`, eur: ru(J('I7')) },
    { ad: `${capTon} Ton Vinç Köprüsü`, eur: ru(J('I10') + J('I14')) },
    { ad: 'Vinç Yürüme Yolu ve Rayı', eur: ru(J('I11')) },
    { ad: 'Vinç Kolonları', eur: ru(J('I12')) },
    { ad: 'Bara', eur: ru(J('I16')) },
    { ad: 'Çift Sıra Köprü Elektrik Tesisatı ve Kablo Kumanda', eur: ru(J('I17')) },
    { ad: 'Elfatek Uzaktan Kumanda', eur: ru(J('I19')) },
    { ad: 'Aşırı Yük Sivici', eur: ru(J('I21')) },
    { ad: 'Sa 2,5 Kumlama ve Shop Prime Uygulama', eur: ru(J('I20')) },
    { ad: 'Montaj ve Devreye Alma', eur: ru(J('I26')) },
  ];
  const trToplamEUR = trSatirlar.reduce((s, r) => s + r.eur, 0);
  const enToplamUSD = roundUp(G32 / F1, -2);                      // ENG!H33 = ROUNDUP(G32/F1,-2)

  const gizli: string[] = [];
  if (guseOn) gizli.push('Güse');
  if (i.finansman) gizli.push('Finansman');
  if (i.nakliye) gizli.push('Nakliye');
  if (yap(i.cRayYurumeYolu)) gizli.push('C-Ray yürüme yolu');
  if (gizli.length) uyarilar.push(`Excel teklif formu satırlarında yer almayan kalem(ler) toplamda var: ${gizli.join(', ')}. TR form toplamı (EUR) bu kalemleri içermez; ENG form toplamı (USD) içerir – Excel'deki davranış aynen korunmuştur.`);
  if (i.finansman) uyarilar.push('Finansman: Excel G28\'de yüzde, I24\'te tutar olarak kullanılır; iki toplam birbirinden farklı çıkar.');

  // Form alanları (TEKLİF FORMU lookups)
  const motor = (row: number) => Number(capLookup(row, capTon));
  const busAd = `${i.busbarAmper}A Busbar Elektrik Tesisatı -Kapalı Kutu Tip`;
  const girderTR = cift ? 'Çift Kiriş' : 'Tek Kiriş';
  const girderEN = cift ? 'Double Girder' : 'Single Girder';
  const form: Record<string, string | number> = {
    capTon, girderTR, girderEN,
    hoistModel: cift ? 'DGH' : 'MGH', hoistCode: `-${capTon}H${B4}`,
    hoistKw: motor(CAP_ROW.MOTOR), hoistSpeed: motor(CAP_ROW.HIZ),
    ropeDia: motor(CAP_ROW.HALAT), reeving: String(capLookup(CAP_ROW.DONAM, capTon)),
    trolleyKw: motor(CAP_ROW.KEDI_KW), trolleyQty: motor(CAP_ROW.KEDI_ADET), trolleyWheel: motor(CAP_ROW.KEDI_TEKER),
    endKw: motor(CAP_ROW.KOPRU_KW), endQty: motor(CAP_ROW.KOPRU_ADET), endWheel: motor(CAP_ROW.KOPRU_TEKER),
    travelGroup: `W${motor(CAP_ROW.KOPRU_TEKER)} P${round10(motor(CAP_ROW.KOPRU_KW) * 100)}`,
    girderType: tip.includes('Kutu') ? 'Kutu Tipi' : 'Hadde Tipi',
    girderTypeEN: tip.includes('Kutu') ? 'Box Type' : 'Profile Type',
    busbarTR: busAd, busbarEN: `${i.busbarAmper}A Busbar Electrical Installation-Closed Box Type`,
    spanM: B3, holM: B5 / 1000, bridgeM: B3 / 1000, columnQty: B8,
    columnType: i.direkTipi,
    walkwayTR: ytip === 'CELIK' ? 'Çelik Hadde Profil Yürüme Yolu + Dikdörtgen Ray'
      : ytip === 'BETON' ? 'Mevcut Beton Yol Üzeri - Dikdörtgen Ray Ve Rayaltı' : 'Yerinde Mevcut',
    walkwayEN: ytip === 'CELIK' ? 'Steel Roll Profile Walking Way + Rectangle Rail'
      : ytip === 'BETON' ? 'On Existing Concrete Way - Rectangle Rail & Under-rail' : 'Existing On Site',
  };

  // ============================================================ MÜHENDİSLİK KONTROLLERİ (F9:G11 / N9:O11)
  const kontroller: Kontrol[] = [];
  const engineeringWarnings: string[] = [];
  const kont = (ad: string, deger: number, uygun: boolean, metin: string) => {
    kontroller.push({ ad, deger, uygun, metin });
    if (!uygun) engineeringWarnings.push(`${ad}: ${metin} (değer ${deger.toFixed(2)})`);
  };
  if (tip === 'Çift Kiriş Kutu Tipi') {
    const F9 = B3 / E2, F10 = B3 / E4, F11 = E4 / E2;
    kont('S/B', F9, !(F9 > 65), F9 > 65 ? 'S/B <65 UYGUN DEĞİL' : 'S/B <65 UYGUN');
    kont('S/H', F10, !(F10 > 25), F10 > 25 ? 'S/H <25-30 UYGUN DEĞİL' : 'S/H <25-30 UYGUN');
    const ok = F11 > 1.6 && F11 < 3.3;                          // Excel çift kiriş: <3,3
    kont('H/B', F11, ok, ok ? 'H/B <1,6 ve 3,2> UYGUN' : 'H/B <1,6 ve 3,2> UYGUN DEĞİL');
  } else if (tip === 'Tek Kiriş Kutu Tipi') {
    const N9 = B3 / M2, N10 = B3 / M4, N11 = M4 / M2;
    kont('S/B', N9, !(N9 > 65), N9 > 65 ? 'S/B <65 UYGUN DEĞİL' : 'S/B <65 UYGUN');
    kont('S/H', N10, !(N10 > 25), N10 > 25 ? 'S/H <25-30 UYGUN DEĞİL' : 'S/H <25-30 UYGUN');
    const ok = N11 > 1.6 && N11 < 3.2;                          // Excel tek kiriş: <3,2
    kont('H/B', N11, ok, ok ? 'H/B <1,6 ve 3,2> UYGUN' : 'H/B <1,6 ve 3,2> UYGUN DEĞİL');
  }

  return {
    kopruAgirlikKg: kopruAgirlik, kopruMetresiKg: kopruMetresi, kirisYuku, maxSehim, sehimOrani, yanalSehim,
    yurumeYoluAgirlikKg: E17, direkAgirlikKg: D12, toplamCelikAgirlik: kopruAgirlik + D11 + D12,
    makineAgirligi: B12, standartKapasiteTon: B11,
    yurumeYoluSehim: J76, yurumeYoluSehimOrani: J77, yurumeYoluYanalSehim: J79,
    direkKritikKuvvetN: direkKritik, kontroller,
    tamburCapi: M_B3, kaldirmaHizi: M_B8, halatCapi: M_B17,
    gerekliKaldirmaTorku: M_B6, gerekliRedCikisDevri: M_B9, gerekliMotorGucu: M_B10, kaldirmaMotorGucu: M_B11,
    kaldirmaFreni: M_B12, tamburBoyu: M_B22, yivSayisi: M_B21, sarilanHalatBoyu: M_B24,
    maxTekerYuku: G9, minTekerYuku: G10, kopruTekerCapiGerekli: G4, kopruTekerCapi: G5,
    kopruYurutmeGerekliKw: M_E9, kopruYurutmeMotorKw: M_E10, kopruRedCikisDevri: G6, kopruRedCikisMomenti: G7,
    kediGerekliKw: KE20, kediMotorKw: KE21, kediTekerCapi: KG19,
    kalemler, araToplamTL: araToplam, montajTL: G26, toplamMaliyetTL: G28,
    teklifTL: G32, teklifUSD: G33, teklifEUR: G34,
    trSatirlar, trToplamEUR, enToplamUSD, form,
    isEngineeringValid: engineeringWarnings.length === 0, engineeringWarnings, uyarilar,
  };
}

// MEKANİK!G18 formülü ÇELİK!E6 (kare genişlik b) kullanır
function E6x(i: OfferInputs): number { return i.kareGenislikb; }
