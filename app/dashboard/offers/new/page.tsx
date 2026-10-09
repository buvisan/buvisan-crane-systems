'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { calculateCraneProject, CalcError, DEFAULT_INPUTS, OfferInputs, CraneResult } from '@/lib/craneCalculator';
import { PROFILES1, PROFILES2, CAPS } from '@/lib/craneData';
import { buildOfferHtml, printHtml, FirmaBilgileri } from '@/lib/offerPdf';

type Cur = 'TRY' | 'USD' | 'EUR';
const SYM: Record<Cur, string> = { TRY: '₺', USD: '$', EUR: '€' };
const nf = (n: number, d = 2) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
const P1 = Object.keys(PROFILES1);
const P2 = Object.keys(PROFILES2);
const YN = ['YAPILACAK', 'YOK'];

// ---- Alt bileşenler DIŞARIDA tanımlı (içeride tanımlanınca her tuşta yeniden oluşur, odak kaybolur)
const lbl = 'block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider';
const inp = 'w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-600 outline-none';

function Num({ label, k, v, set, step }: { label: string; k: keyof OfferInputs; v: number; set: (k: keyof OfferInputs, val: any) => void; step?: string }) {
  return (
    <div>
      <label className={lbl}>{label}</label>
      <input type="number" step={step ?? 'any'} className={inp} value={Number.isFinite(v) ? v : ''}
        onChange={e => set(k, e.target.value === '' ? NaN : Number(e.target.value))} />
    </div>
  );
}
function Sel({ label, k, v, set, options }: { label: string; k: keyof OfferInputs; v: string; set: (k: keyof OfferInputs, val: any) => void; options: (string | number)[] }) {
  return (
    <div>
      <label className={lbl}>{label}</label>
      <select className={inp} value={v} onChange={e => set(k, e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function Txt({ label, name, v, set }: { label: string; name: keyof FirmaBilgileri; v: string; set: (k: keyof FirmaBilgileri, val: string) => void }) {
  return (
    <div>
      <label className={lbl}>{label}</label>
      <input type="text" className={inp} value={v} onChange={e => set(name, e.target.value)} />
    </div>
  );
}
function Line({ a, b }: { a: string; b: string }) {
  return <div className="flex justify-between text-sm bg-slate-800/80 p-2 rounded"><span className="text-slate-300">{a}</span><span className="font-bold text-white">{b}</span></div>;
}

export default function YeniTeklifSayfasi() {
  const router = useRouter();
  const supabase = createClient();

  const [inputs, setInputs] = useState<OfferInputs>({ ...DEFAULT_INPUTS, kapasiteKg: 10000 });
  const [firma, setFirma] = useState<FirmaBilgileri>({
    firmaAdi: '', yetkili: '', telefon: '', email: '', adres: '',
  });
  const [para, setPara] = useState<Cur>('EUR');
  const [tab, setTab] = useState('genel');
  const [kurBilgi, setKurBilgi] = useState<string>('Kur alınıyor…');
  const [teklifNo, setTeklifNo] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const set = (k: keyof OfferInputs, val: any) => setInputs(p => ({ ...p, [k]: val }));
  const setF = (k: keyof FirmaBilgileri, val: string) => setFirma(p => ({ ...p, [k]: val }));

  // TCMB Döviz Satış kuru (Excel: TCMB!C2 ve C5)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/kur', { cache: 'no-store' });
        const d = await r.json();
        if (!d.usd) throw new Error(d.error || 'kur yok');
        setInputs(p => ({ ...p, kurUSD: d.usd, kurEUR: d.eur }));
        setKurBilgi(`${d.kaynak} – ${d.tarih}`);
      } catch {
        setKurBilgi('Kur alınamadı – lütfen aşağıdan elle girin');
      }
    })();
  }, []);

  // Teklif no: YYAAGG-001 (Excel biçimi), aynı gün sıra numarası
  useEffect(() => {
    (async () => {
      const d = new Date();
      const pre = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      const { count } = await supabase.from('sc_offers').select('id', { count: 'exact', head: true }).like('offer_no', `${pre}-%`);
      setTeklifNo(`${pre}-${String((count ?? 0) + 1).padStart(3, '0')}`);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Her girdi değişiminde anında hesapla (eski sürümdeki "bayat hesap" hatası kalktı)
  const { sonuc, hata } = useMemo(() => {
    try {
      const bad = (Object.keys(inputs) as (keyof OfferInputs)[]).filter(k => typeof inputs[k] === 'number' && Number.isNaN(inputs[k]));
      if (bad.length) throw new CalcError('Boş sayısal alan var: ' + bad.join(', '));
      return { sonuc: calculateCraneProject(inputs) as CraneResult, hata: '' };
    } catch (e: any) {
      return { sonuc: null as CraneResult | null, hata: e instanceof CalcError ? e.message : 'Beklenmeyen hata: ' + e.message };
    }
  }, [inputs]);

  const toplam = sonuc ? (para === 'TRY' ? sonuc.teklifTL : para === 'USD' ? sonuc.teklifUSD : sonuc.teklifEUR) : 0;
  const kalemDeger = (k: { tl: number; usd: number; eur: number }) => (para === 'TRY' ? k.tl : para === 'USD' ? k.usd : k.eur);
  const tarih = new Date().toLocaleDateString('tr-TR');

  const handleKaydet = async () => {
    if (!sonuc || !teklifNo) return;
    setKaydediliyor(true);
    try {
      const { error } = await supabase.from('sc_offers').insert([{
        offer_no: teklifNo, customer_name: firma.firmaAdi || 'İsimsiz Müşteri',
        capacity_ton: inputs.kapasiteKg / 1000, span_m: inputs.aciklikS,
        status: sonuc.isEngineeringValid ? 'TASLAK' : 'MÜHENDİSLİK ONAYI BEKLİYOR',
        total_price_eur: toplam, currency: para,
        form_data: {
          inputs, customer: firma, kur: { usd: inputs.kurUSD, eur: inputs.kurEUR, kaynak: kurBilgi },
          totals: { tl: sonuc.teklifTL, usd: sonuc.teklifUSD, eur: sonuc.teklifEUR, trFormEUR: sonuc.trToplamEUR, enFormUSD: sonuc.enToplamUSD },
          results: sonuc,
        },
      }]);
      if (error) throw error;
      router.push('/dashboard/offers');
    } catch (e: any) {
      alert('Kayıt hatası: ' + (e?.message ?? e));
      setKaydediliyor(false);
    }
  };

  const pdf = (lang: 'tr' | 'en') => {
    if (!sonuc) return;
    printHtml(buildOfferHtml({ lang, teklifNo, tarih, firma, inputs, sonuc }));
  };

  const tip = String(inputs.kopruTipi);
  const kutuCift = tip === 'Çift Kiriş Kutu Tipi', haddeCift = tip === 'Çift Kiriş Hadde Profil';
  const kutuTek = tip === 'Tek Kiriş Kutu Tipi', haddeTek = tip === 'Tek Kiriş Hadde Profil';
  const N = (label: string, k: keyof OfferInputs) => <Num label={label} k={k} v={inputs[k] as number} set={set} />;
  const S = (label: string, k: keyof OfferInputs, options: (string | number)[]) => <Sel label={label} k={k} v={String(inputs[k])} set={set} options={options} />;

  const tabs = [
    ['genel', 'Genel & Müşteri'], ['kopru', 'Statik & Köprü'], ['yol', 'Yürüme Yolu & Direk'],
    ['mekanik', 'Mekanik Motor'], ['opsiyon', 'Donanım & Opsiyon'], ['fiyat', 'Birim Fiyatlar (Admin)'],
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1500px] mx-auto bg-[#f8fafc] min-h-screen font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Vinç Projesi Hesaplama Motoru (ERP)</h1>
          <p className="text-sm text-emerald-600 font-bold mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {kurBilgi} · Teklif No: {teklifNo || '…'}
          </p>
        </div>
        <button onClick={handleKaydet} disabled={kaydediliyor || !sonuc}
          className="px-6 py-2.5 bg-white border-2 border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 disabled:opacity-40">
          {kaydediliyor ? 'KAYDEDİLİYOR...' : 'TASLAĞI KAYDET'}
        </button>
      </div>

      {hata && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-600 rounded-md">
          <h3 className="text-red-800 font-bold">Hesaplanamadı</h3>
          <p className="text-sm text-red-700 mt-1">{hata}</p>
        </div>
      )}
      {sonuc && !sonuc.isEngineeringValid && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
          <h3 className="text-red-800 font-bold">Mühendislik Sınır Uyarısı!</h3>
          <ul className="list-disc ml-5 text-sm text-red-700 mt-2">{sonuc.engineeringWarnings.map((w, k) => <li key={k}>{w}</li>)}</ul>
          <p className="text-xs text-red-600 mt-2 font-semibold">Bu teklif 'Mühendislik Onayı Bekliyor' statüsünde kaydedilecektir.</p>
        </div>
      )}
      {sonuc && sonuc.uyarilar.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-md text-sm text-amber-800">
          {sonuc.uyarilar.map((w, k) => <p key={k}>• {w}</p>)}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
            {tabs.map(([id, t]) => (
              <button key={id} onClick={() => setTab(id)}
                className={`px-5 py-4 text-sm font-bold whitespace-nowrap border-b-2 ${tab === id ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}>{t}</button>
            ))}
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {tab === 'genel' && (<>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 border-b">
                <Txt label="Firma Adı" name="firmaAdi" v={firma.firmaAdi} set={setF} />
                <Txt label="Yetkili Kişi" name="yetkili" v={firma.yetkili} set={setF} />
                <Txt label="E-Mail" name="email" v={firma.email} set={setF} />
                <Txt label="Telefon" name="telefon" v={firma.telefon} set={setF} />
                <div className="md:col-span-2"><Txt label="Firma Adresi" name="adres" v={firma.adres} set={setF} /></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {N('Kapasite (Q) kg', 'kapasiteKg')}{N('Açıklık (S) mm', 'aciklikS')}
                {N('Kaldırma Yüksekliği (H) mm', 'yukseklikH')}{N('Hol Boyu (L) mm', 'holBoyuL')}
              </div>
              <p className="text-xs text-slate-500">Geçerli kapasiteler (ton): {CAPS.join(', ')} — Excel şablonu 32 tonun üzerini desteklemez. Tek kirişte fiyat tablosu 10 tona kadardır.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {S('Köprü Tipi', 'kopruTipi', ['Çift Kiriş Kutu Tipi', 'Çift Kiriş Hadde Profil', 'Tek Kiriş Kutu Tipi', 'Tek Kiriş Hadde Profil'])}
                {S('Direk Tipi', 'direkTipi', ['Kare Kutu Profil', 'NPU Örme', 'YOK'])}
              </div>
            </>)}

            {tab === 'kopru' && (<div className="bg-orange-50 border border-orange-100 p-5 rounded-lg space-y-4">
              <h3 className="font-bold text-orange-800">{tip} – Geometri</h3>
              {kutuCift && (<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {N('Alt/Üst Sac Genişliği (B)', 'kutuAltUstGenislik')}{N('Alt/Üst Sac Kalınlığı (t1)', 'kutuAltUstKalinlik')}
                {N('Yan Sac Yüksekliği (H)', 'kutuYanYukseklik')}{N('Yan Sac Kalınlığı (t2)', 'kutuYanKalinlik')}
                {N('Kare Genişlik (b)', 'kareGenislikb')}{N('Kare Yükseklik (h)', 'kareYukseklikh')}
                {N('Dik Payanda Aralığı', 'dikPayandaAraligi')}{N('Payanda Kalınlığı', 'payandaKalinligi')}
                {S('Köşebent', 'kosebent', ['30x30x3 mm', '40x40x4 mm'])}
              </div>)}
              {haddeCift && (<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {S('Çalışma Profili', 'cHaddeProfil', P1)}{N('Kare Genişlik (b)', 'cHaddeB')}{N('Kare Yükseklik (h)', 'cHaddeH')}
              </div>)}
              {kutuTek && (<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {N('Alt Sac Genişliği (B)', 'tAltGenislik')}{N('Alt Sac Kalınlığı (t1)', 'tAltKalinlik')}
                {N('Yan Sac Yüksekliği (H)', 'tYanYukseklik')}{N('Yan Sac Kalınlığı (t2)', 'tYanKalinlik')}
                {N('Üst Sac Genişliği (B3)', 'tUstGenislik')}{N('Üst Sac Kalınlığı (t3)', 'tUstKalinlik')}
                {N('Konsol Genişliği (Bb)', 'tKonsol')}{N('Dik Payanda Aralığı', 'tPayandaAralik')}
                {N('Payanda Kalınlığı', 'tPayandaKalinlik')}{S('Köşebent', 'tKosebent', ['30x30x3 mm', '40x40x4 mm'])}
              </div>)}
              {haddeTek && (<div className="grid grid-cols-2 gap-4">{S('Çalışma Profili', 'tHaddeProfil', P1)}</div>)}
            </div>)}

            {tab === 'yol' && (<>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {S('Yürüme Yolu Tipi', 'yurumeYoluTipi', ['Çelik Yürüme Yolu', 'Beton Yola Ray & Rayaltı', 'YOK'])}
                {S('Çalışma Profili', 'yurumeProfil', P1)}{N('Ray Kare Genişlik (b)', 'yurumeB')}{N('Ray Kare Yükseklik (h)', 'yurumeH')}
                {N('Ray Genişlik (b1)', 'rayB1')}{N('Ray Yükseklik (h1)', 'rayH1')}
                {N('Ray Altı Genişlik (b2)', 'rayAltiGenislik')}{N('Ray Altı Yükseklik', 'rayAltiYukseklik')}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-4">
                {N('Direk Adeti', 'direkAdeti')}{N('Direk Boyu (h) mm', 'direkBoyu')}
                {N('Direk Arası (L1) mm', 'direkArasiL1')}{N('Başlık Teker Merkezi Arası mm', 'baslikTekerMerkezi')}
                {S('NPU Profili', 'direkNpuProfil', P2)}{N('NPU Direk Genişliği (L)', 'direkNpuGenislik')}
                {N('Kare Direk Genişliği (a)', 'direkKareGenislik')}{N('Kare Direk Kalınlığı (a)', 'direkKareKalinlik')}
              </div>
            </>)}

            {tab === 'mekanik' && (<div className="bg-purple-50 border border-purple-100 p-5 rounded-lg">
              <h3 className="font-bold text-purple-800 mb-4">Kaldırma / Köprü / Kedi Yürütme</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {S('Yük Taşıyan Halat Sayısı', 'halatSayisi', [1, 2, 4, 6, 8, 10, 12])}{N('Tambura Gelen Halat Sayısı', 'tamburaGelenHalat')}
                {N('Başlık Teker Sayısı', 'baslikTekerSayisi')}{N('Köprü Yürütme Hızı (m/dk)', 'kopruYurutmeHizi')}
                {N('Köprü İvmelenme Süresi (sn)', 'kopruIvmelenme')}{N('Kedi Yürütme Hızı (m/dk)', 'kediYurutmeHizi')}
                {N('Kedi İvmelenme Süresi (sn)', 'kediIvmelenme')}{N('Kedi Teker Sayısı', 'kediTekerSayisi')}
              </div>
              <p className="text-xs text-slate-500 mt-3">Tambur çapı, kaldırma hızı, halat çapı, makine ağırlığı kapasiteye göre Excel tablosundan otomatik gelir.</p>
            </div>)}

            {tab === 'opsiyon' && (<div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {S('Hareket Sayısı (makine fiyatı)', 'hareketSayisi', [4, 8, 10, 12])}
              {S('Güse', 'guse', ['YAPILACAK', 'YAPILMAYACAK'])}{S('Servis Platformu', 'platform', YN)}
              {S('C-Ray Köprü Üzeri', 'cRayKopru', YN)}{S('C-Ray Yürüme Yolu', 'cRayYurumeYolu', YN)}
              {S('Uzaktan Kumanda', 'uzaktanKumanda', YN)}{S('Boya ve Kumlama', 'boyaKumlama', YN)}
              {S('Busbar (A)', 'busbarAmper', [50, 75, 100, 150, 200])}{S('Montaj Hizmeti', 'montajYapilacak', YN)}
              {N('Montaj Süresi (Gün)', 'montajGun')}{N('Montaj Elemanı Sayısı', 'montajKisi')}
            </div>)}

            {tab === 'fiyat' && (<div className="bg-emerald-50 border border-emerald-100 p-5 rounded-lg space-y-6">
              <div><h3 className="font-bold text-emerald-800 mb-4">İşçilik (TL)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                  {N('Sac Birim İşçilik (TL/kg)', 'fiyatSacIscilik')}{N('Profil Birim İşçilik (TL/kg)', 'fiyatProfilIscilik')}{N('Günlük Birim İşçilik (TL)', 'fiyatGunlukIscilik')}
                </div></div>
              <div><h3 className="font-bold text-emerald-800 mb-4">Opsiyon Fiyatları (TL)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                  {N('C-Ray Köprü (TL/m)', 'cRayBirim')}{N('C-Ray Yürüme Yolu (Set TL)', 'cRayYurumeTutar')}{N('Uzaktan Kumanda (Set TL)', 'uzaktanKumandaTutar')}
                  {N('Boya & Kumlama birim', 'boyaBirim')}{N('Aşırı Yük Sivici (TL)', 'asiriYukTutar')}
                </div></div>
              <div><h3 className="font-bold text-emerald-800 mb-4">Oranlar, Kur</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                  {N('Kâr Oranı (%)', 'kar')}{N('Komisyon Oranı (%)', 'komisyon')}{N('Finansman (%)', 'finansman')}
                  {N('Nakliye (TL)', 'nakliye')}{N('Dolar Kuru (TL)', 'kurUSD')}{N('Euro Kuru (TL)', 'kurEUR')}
                </div></div>
            </div>)}
          </div>
        </div>

        {/* SAĞ PANEL */}
        <div className="xl:col-span-4 flex flex-col">
          <div className="bg-[#1e293b] text-white p-6 rounded-xl shadow-xl border border-slate-700">
            <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-600">
              <h2 className="text-xl font-bold">Teknik ve Maliyet Analizi</h2>
              <select value={para} onChange={e => setPara(e.target.value as Cur)}
                className="bg-slate-700 text-emerald-400 font-bold border border-slate-600 rounded px-3 py-1">
                <option value="TRY">Türk Lirası (₺)</option><option value="USD">Dolar ($)</option><option value="EUR">Euro (€)</option>
              </select>
            </div>
            {sonuc ? (<div className="space-y-4">
              <div><p className="text-[10px] font-bold text-orange-400 mb-1.5 tracking-widest uppercase">Statik</p><div className="space-y-1.5">
                <Line a="Köprü Ağırlığı" b={`${nf(sonuc.kopruAgirlikKg)} kg`} />
                <Line a="Toplam Çelik Tonajı" b={`${nf(sonuc.toplamCelikAgirlik)} kg`} />
                <Line a="Max. Sehim" b={`${nf(sonuc.maxSehim)} mm  (L/${nf(sonuc.sehimOrani, 0)})`} />
                <Line a="Yanal Sehim" b={`${nf(sonuc.yanalSehim)} mm`} />
                {sonuc.kontroller.map(k => (
                  <div key={k.ad} className={`flex justify-between text-xs p-2 rounded ${k.uygun ? 'bg-emerald-900/40 text-emerald-300' : 'bg-red-900/50 text-red-300'}`}>
                    <span>{k.metin}</span><span>{nf(k.deger)}</span></div>))}
              </div></div>
              <div><p className="text-[10px] font-bold text-purple-400 mb-1.5 tracking-widest uppercase">Mekanik</p><div className="space-y-1.5">
                <Line a="Kaldırma Torku" b={`${nf(sonuc.gerekliKaldirmaTorku)} Nm`} />
                <Line a="Kaldırma Motoru" b={`${sonuc.kaldirmaMotorGucu} kW`} />
                <Line a="Köprü Yürütme Motoru" b={`${sonuc.kopruYurutmeMotorKw} kW × ${sonuc.form.endQty}`} />
                <Line a="Kedi Motoru" b={`${sonuc.kediMotorKw} kW`} />
                <Line a="Maksimum Teker Yükü" b={`${nf(sonuc.maxTekerYuku)} kg`} />
                <Line a="Köprü Teker Çapı" b={`${sonuc.kopruTekerCapi} mm`} />
              </div></div>
              <div><p className="text-[10px] font-bold text-emerald-400 mb-1.5 tracking-widest uppercase">Maliyet Dağılımı ({SYM[para]}, kâr dahil)</p>
                <div className="space-y-1.5">
                  {sonuc.kalemler.filter(k => k.tl !== 0).map(k => <Line key={k.kod} a={k.ad} b={nf(kalemDeger(k))} />)}
                </div></div>
              <div className="pt-4 border-t border-slate-600 mt-4">
                <div className="flex justify-between items-end">
                  <span className="text-sm text-slate-400 uppercase tracking-wider">Proje Toplam Tutarı</span>
                  <span className="text-3xl font-black text-emerald-400">{nf(toplam)} {SYM[para]}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">TR form (EUR, yuvarlanmış): {nf(sonuc.trToplamEUR, 0)} € · ENG form (USD): {nf(sonuc.enToplamUSD, 0)} $</p>
              </div>
            </div>) : <div className="text-slate-400 py-12 text-center text-sm">Girdileri tamamlayın; hata varsa yukarıda gösterilir.</div>}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button onClick={() => pdf('tr')} disabled={!sonuc}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white py-3 rounded-xl font-bold shadow-lg">PDF TEKLİF (TR)</button>
            <button onClick={() => pdf('en')} disabled={!sonuc}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white py-3 rounded-xl font-bold shadow-lg">PDF OFFER (EN)</button>
          </div>
        </div>
      </div>
    </div>
  );
}
