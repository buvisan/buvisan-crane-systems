'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function YeniTeklifSayfasi() {
  const router = useRouter();
  const supabase = createClient();
  const teklifCiktisiRef = useRef<HTMLDivElement>(null);
  
  const [dovizKurlari, setDovizKurlari] = useState<{ [key: string]: number }>({
    TRY: 1, USD: 0, EUR: 0, GBP: 0
  });

  useEffect(() => {
    const kurlariGetir = async () => {
      try {
        const response = await fetch('https://open.er-api.com/v6/latest/TRY');
        const data = await response.json();
        if (data && data.rates) {
          setDovizKurlari({ TRY: 1, USD: data.rates.USD, EUR: data.rates.EUR, GBP: data.rates.GBP });
        }
      } catch (error) {
        console.error("Kur çekilemedi:", error);
      }
    };
    kurlariGetir();
  }, []);

  const [formData, setFormData] = useState({
    firmaAdi: 'ZM METAL MAKİNA İMALAT', yetkili: '', telefon: '',
    paraBirimi: 'TRY',
    
    // --- Genel Özellikler ---
    kapasiteKg: 10000, aciklikS: 15000, yukseklikH: 6000, 
    holBoyuL: 30000, direkArasiL1: 6000, direkAdeti: 12, direkBoyu: 6000,
    kopruTipi: 'Çift Kiriş Kutu Tipi', direkTipi: 'Kare Kutu Profil',
    
    // --- Statik ve Köprü ---
    kutuAltUstGenislik: 390, kutuAltUstKalinlik: 6, 
    kutuYanYukseklik: 800, kutuYanKalinlik: 6,
    kareGenislikb: 40, kareYukseklikh: 30, 
    dikPayandaAraligi: 1000, payandaKalinligi: 5, 
    kosebent: '30x30x3 mm',
    calismaProfiliKopru: 'IPE400',
    
    // --- Yürüme Yolu ---
    yurumeYoluTipi: 'Çelik Yürüme Yolu', yurumeYoluProfili: 'IPE300', 
    rayAltiGenislik: 120, rayAltiYukseklik: 10,
    
    // --- Mekanik Motor ---
    makineAgirligi: 960, baslikTekerSayisi: 4, 
    tamburCapi: 300, halatSayisi: 4, tamburaGelenHalatSayisi: 1,
    kaldirmaHizi: 4, yurutmeHizi: 20, ivmelenmeSuresi: 5,
    makineTekerMerkezi: 1260, baslikTekerMerkezi: 2800, 
    
    // --- Maliyet Opsiyonları ---
    guseYapilacak: 'YAPILMAYACAK', platformYapilacak: 'YOK', cRayKopru: 'YAPILACAK', 
    cRayYurumeYolu: 'YOK', uzaktanKumanda: 'YAPILACAK', boyaKumlama: 'YAPILACAK', 
    asiriYukSivici: 'CWL-10T', montajYapilacak: 'YAPILACAK', montajSuresiGun: 3, montajElemaniSayisi: 3
  });

  const [activeTab, setActiveTab] = useState('genel');
  const [hesaplamaSonucu, setHesaplamaSonucu] = useState<any>(null);
  const [hesaplaniyor, setHesaplaniyor] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  useEffect(() => {
    if (hesaplamaSonucu) handleHesapla();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.paraBirimi]); 

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
  };

  const handleHesapla = () => {
    setHesaplaniyor(true);
    setTimeout(() => {
      const yerCekimi = 9.81; 
      const celikYogunlukKutu = 8.00; 
      const celikYogunlukRay = 7.85; 
      
      // 1. KÖPRÜ AĞIRLIĞI
      let kopruAgirlikKg = 0;
      
      if (formData.kopruTipi === 'Çift Kiriş Kutu Tipi') {
        const altUstAgirlik = (formData.kutuAltUstGenislik * formData.kutuAltUstKalinlik * formData.aciklikS * celikYogunlukKutu * 4) / 1000000;
        const yanAgirlik = (formData.kutuYanYukseklik * formData.kutuYanKalinlik * formData.aciklikS * celikYogunlukKutu * 4) / 1000000;
        const rayAgirlik = (formData.kareGenislikb * formData.kareYukseklikh * formData.aciklikS * celikYogunlukKutu * 2) / 1000000;
        const payandaAdet = Math.ceil(formData.aciklikS / formData.dikPayandaAraligi);
        const diyaframAgirlik = ((formData.kutuYanYukseklik - 10) * (formData.kutuAltUstGenislik - 60) * formData.payandaKalinligi * payandaAdet * 2 * celikYogunlukKutu) / 1000000;
        let kosebentKatsayisi = formData.kosebent !== '30x30x3 mm' ? 2.42 : 1.36; 
        const kosebentSira = formData.kutuYanYukseklik >= 1000 ? 12 : 8;
        const kosebentAgirlik = (kosebentKatsayisi * kosebentSira * formData.aciklikS) / 1000;
        const ekSacAgirlik = (formData.aciklikS * 30) / 1000; 

        kopruAgirlikKg = altUstAgirlik + yanAgirlik + rayAgirlik + diyaframAgirlik + kosebentAgirlik + ekSacAgirlik;
      } else if (formData.kopruTipi === 'Çift Kiriş Hadde Profil') {
        const rayKareAgirlik = (formData.kareGenislikb * formData.kareYukseklikh * 8 * formData.aciklikS) / 1000000;
        kopruAgirlikKg = ((66.3 * formData.aciklikS / 1000) + rayKareAgirlik) * 2;
      }

      // 2. YÜRÜME YOLU
      const rayAltiSacAgirlik = (formData.rayAltiGenislik * formData.rayAltiYukseklik * celikYogunlukRay) / 1000;
      const yurumeYoluAgirlikKg = (50.5 + rayAltiSacAgirlik) * (formData.holBoyuL / 1000) * (formData.kopruTipi.includes('Çift') ? 2 : 1);
      const toplamCelikAgirlik = kopruAgirlikKg + yurumeYoluAgirlikKg;

      // 3. MEKANİK MOTOR
      const mekanikEmniyetliAgirlik = kopruAgirlikKg * 1.1; 
      const yaklasmaMesafesi = 1000; 
      const maxTekerYuku = (mekanikEmniyetliAgirlik + ((formData.kapasiteKg + formData.makineAgirligi) * ((formData.aciklikS - yaklasmaMesafesi) / formData.aciklikS))) / formData.baslikTekerSayisi * 2;
      const gerekliKaldirmaTorku = (formData.kapasiteKg * yerCekimi * (formData.tamburCapi / 2000) * formData.tamburaGelenHalatSayisi) / (0.95 * formData.halatSayisi);
      const kaldirmaReduktorCikisDevri = (formData.kaldirmaHizi * formData.halatSayisi) / (Math.PI * (formData.tamburCapi / 1000) * formData.tamburaGelenHalatSayisi);
      const gerekliMotorGucu = (gerekliKaldirmaTorku * kaldirmaReduktorCikisDevri) / (9550 * 0.94);
      const yurutmeDirenci = maxTekerYuku * (formData.baslikTekerSayisi / 2) * 6 * 9.81 / 1000000;
      const ivmelenmeGucu = (maxTekerYuku * (formData.baslikTekerSayisi / 2)) * Math.pow((formData.yurutmeHizi / 60), 2) / (formData.ivmelenmeSuresi * 0.9 * 1000) * 1.2;
      const yurutmeMotorGucu = (ivmelenmeGucu + ((yurutmeDirenci * formData.yurutmeHizi) / (60 * 0.9))) / 1.4;

      // 4. MALİYET 
      const celikIscilikMaliyetiTL = toplamCelikAgirlik * 75; 
      const makinaFiyatiTL = formData.kopruTipi.includes('Çift') ? 277900 : 250110; 

      let ekstraMaliyetlerTL = 0;
      if (formData.platformYapilacak === 'YAPILACAK') ekstraMaliyetlerTL += (formData.aciklikS / 1000) * 2000;
      if (formData.cRayKopru === 'YAPILACAK') ekstraMaliyetlerTL += 30000;
      if (formData.cRayYurumeYolu === 'YAPILACAK') ekstraMaliyetlerTL += 45000;
      if (formData.uzaktanKumanda === 'YAPILACAK') ekstraMaliyetlerTL += 15000;
      if (formData.boyaKumlama === 'YAPILACAK') ekstraMaliyetlerTL += 37500;
      
      let montajMaliyetiTL = formData.montajYapilacak === 'YAPILACAK' ? (formData.montajSuresiGun * formData.montajElemaniSayisi * 6000) : 0;
      const tahminiToplamSatisTL = celikIscilikMaliyetiTL + makinaFiyatiTL + ekstraMaliyetlerTL + montajMaliyetiTL;

      const kurCarpani = dovizKurlari[formData.paraBirimi] || 1; 
      const semboller: any = { TRY: '₺', USD: '$', EUR: '€', GBP: '£' };

      setHesaplamaSonucu({
        kopruAgirlikKg: kopruAgirlikKg.toFixed(2), yurumeYoluAgirlikKg: yurumeYoluAgirlikKg.toFixed(2),
        toplamCelikAgirlik: (toplamCelikAgirlik).toFixed(2), gerekliKaldirmaTorku: gerekliKaldirmaTorku.toFixed(2),
        kaldirmaReduktorCikisDevri: kaldirmaReduktorCikisDevri.toFixed(2), gerekliMotorGucu: gerekliMotorGucu.toFixed(2),
        yurutmeMotorGucu: yurutmeMotorGucu.toFixed(2), maxTekerYuku: maxTekerYuku.toFixed(2),
        paraBirimi: formData.paraBirimi, paraBirimiSembolu: semboller[formData.paraBirimi],
        celikIscilikMaliyeti: (celikIscilikMaliyetiTL * kurCarpani).toFixed(2), makinaFiyati: (makinaFiyatiTL * kurCarpani).toFixed(2),
        ekstraMaliyetler: (ekstraMaliyetlerTL * kurCarpani).toFixed(2), montajMaliyeti: (montajMaliyetiTL * kurCarpani).toFixed(2),
        tahminiToplamSatis: (tahminiToplamSatisTL * kurCarpani).toFixed(2)
      });
      setHesaplaniyor(false);
    }, 400); 
  };

  const handleKaydet = async () => {
    if (!hesaplamaSonucu) {
      alert("Lütfen önce Maliyetleri Hesapla butonuna basarak statik analizi tamamlayın.");
      return;
    }
    setKaydediliyor(true);
    const yeniTeklifNo = `2604-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    try {
      const { error } = await supabase.from('sc_offers').insert([
        {
          offer_no: yeniTeklifNo, 
          customer_name: formData.firmaAdi || 'İsimsiz Müşteri',
          capacity_ton: formData.kapasiteKg / 1000, 
          span_m: formData.aciklikS,
          status: 'TASLAK', 
          total_price_eur: parseFloat(hesaplamaSonucu.tahminiToplamSatis),
          currency: formData.paraBirimi, 
          // NOT: Supabase'de 'form_data' adında bir JSON sütunu yoksa, aşağıdaki satır hata verebilir. 
          // Hata verirse o sütunu açman gerekecek (Aşağıdaki nota bak).
          form_data: { inputs: formData, results: hesaplamaSonucu }
        }
      ]);
      
      if (error) {
         // SUPABASE'İN HATASINI EKRANA YAZDIRIYORUZ!
         alert("SUPABASE HATASI: " + error.message);
         throw error;
      }
      
      router.push('/dashboard/offers');
    } catch (error) {
      console.error("Kaydetme hatası:", error);
      setKaydediliyor(false);
    }
  };

const generatePDF = async () => {
    const element = teklifCiktisiRef.current;
    if (!element) return;

    try {
      // 1. Şablonu PDF motorunun görebileceği hale getir (ama ekrandan uzak tut)
      element.style.display = 'block';
      element.style.position = 'absolute';
      element.style.top = '-9999px';

      // 2. Next.js ortamında kütüphaneyi en güvenli şekilde dinamik çağır
      const module = await import('html2pdf.js');
      const html2pdf = module.default || module;

      const opt = {
        margin: 10, 
        filename: `Teklif-${formData.firmaAdi || 'ERP'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false }, 
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // 3. PDF'i oluştur ve indir
      await (html2pdf as any)().from(element).set(opt).save();

    } catch (err: any) {
      console.error("PDF Motoru Hatası:", err);
      alert("PDF oluşturulurken bir hata meydana geldi: " + (err.message || "Bilinmeyen hata"));
    } finally {
      // 4. İŞTE KİLİTLENMEYİ ÖNLEYEN KISIM: 
      // İşlem başarılı olsa da, hata verse de ekranı eski temiz haline döndür!
      element.style.display = 'none';
      element.style.position = 'static';
    }
  };

  const InputRow = ({ label, name, type = 'number' }: { label: string, name: keyof typeof formData, type?: string }) => (
    <div>
      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">{label}</label>
      <input type={type} name={name} value={formData[name] as any} onChange={handleInputChange} 
             className="w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-600 outline-none" />
    </div>
  );

  const SelectRow = ({ label, name, options }: { label: string, name: keyof typeof formData, options: string[] }) => (
    <div>
      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">{label}</label>
      <select name={name} value={formData[name] as any} onChange={handleInputChange} 
              className="w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-600 outline-none">
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-[1500px] mx-auto bg-[#f8fafc] min-h-screen font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Vinç Projesi Hesaplama Motoru (ERP)</h1>
          <p className="text-sm text-emerald-600 font-bold mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Canlı Döviz Kuru Devrede
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button onClick={handleKaydet} disabled={kaydediliyor}
            className="px-6 py-2.5 bg-white border-2 border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-all">
            {kaydediliyor ? 'KAYDEDİLİYOR...' : 'TASLAĞI KAYDET'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* SOL PANEL */}
        <div className="xl:col-span-8 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
            {[{ id: 'genel', title: 'Genel Özellikler' }, { id: 'kopru', title: 'Statik & Köprü' }, { id: 'mekanik', title: 'Mekanik Motor' }, { id: 'opsiyon', title: 'Maliyet Opsiyonları' }].map(sekme => (
              <button key={sekme.id} onClick={() => setActiveTab(sekme.id)}
                className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-all border-b-2 
                ${activeTab === sekme.id ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}>
                {sekme.title}
              </button>
            ))}
          </div>

          <div className="p-6 md:p-8 flex-1 overflow-y-auto">
            {activeTab === 'genel' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6 border-b">
                  <InputRow label="Firma Adı" name="firmaAdi" type="text" />
                  <InputRow label="Kapasite (Q) kg" name="kapasiteKg" />
                  <InputRow label="Açıklık (S) mm" name="aciklikS" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <InputRow label="Kaldırma Yüksekliği (H)" name="yukseklikH" />
                  <InputRow label="Hol Boyu (L)" name="holBoyuL" />
                  <InputRow label="Direk Arası (L1)" name="direkArasiL1" />
                  <InputRow label="Direk Adeti" name="direkAdeti" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SelectRow label="Köprü Tipi" name="kopruTipi" options={['Çift Kiriş Kutu Tipi', 'Çift Kiriş Hadde Profil', 'Tek Kiriş Kutu Profil', 'Tek Kiriş Hadde Profil']} />
                  <SelectRow label="Direk Tipi" name="direkTipi" options={['NPU Profil Örme', 'Kare Kutu Profil']} />
                </div>
              </div>
            )}

            {activeTab === 'kopru' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="bg-orange-50 border border-orange-100 p-5 rounded-lg">
                  <h3 className="font-bold text-orange-800 mb-4">Çelik Konstrüksiyon Geometrisi</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <InputRow label="Alt/Üst Genişlik (B)" name="kutuAltUstGenislik" />
                    <InputRow label="Alt/Üst Kalınlık (t1)" name="kutuAltUstKalinlik" />
                    <InputRow label="Yan Yükseklik (H)" name="kutuYanYukseklik" />
                    <InputRow label="Yan Kalınlık (t2)" name="kutuYanKalinlik" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-orange-200 pt-4 mt-2">
                    <InputRow label="Dik Payanda Aralığı" name="dikPayandaAraligi" />
                    <InputRow label="Payanda Kalınlığı" name="payandaKalinligi" />
                    <SelectRow label="Köşebent" name="kosebent" options={['30x30x3 mm', '40x40x4 mm']} />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b pb-6">
                  <InputRow label="Hadde Çalışma Profili" name="calismaProfiliKopru" type="text" />
                  <InputRow label="Ray Kare Genişlik (b)" name="kareGenislikb" />
                  <InputRow label="Ray Kare Yükseklik (h)" name="kareYukseklikh" />
                </div>

                <div>
                   <h3 className="font-bold text-slate-700 mb-4">Yürüme Yolu ve Direk</h3>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <SelectRow label="Yürüme Yolu Tipi" name="yurumeYoluTipi" options={['Çelik Yürüme Yolu', 'Betonarme', 'YOK']} />
                      <InputRow label="Çalışma Profili" name="yurumeYoluProfili" type="text" />
                      <InputRow label="Ray Altı Genişlik (b2)" name="rayAltiGenislik" />
                      <InputRow label="Ray Altı Yükseklik (h2)" name="rayAltiYukseklik" />
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'mekanik' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-purple-50 border border-purple-100 p-5 rounded-lg">
                  <h3 className="font-bold text-purple-800 mb-4">Motor, Redüktör ve Tambur Seçimi</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                    <InputRow label="Makine Ağırlığı (kg)" name="makineAgirligi" />
                    <InputRow label="Başlık Teker Sayısı" name="baslikTekerSayisi" />
                    <InputRow label="Tambur Çapı (mm)" name="tamburCapi" />
                    <InputRow label="Halat Sayısı" name="halatSayisi" />
                    <InputRow label="Tambura Gelen Halat" name="tamburaGelenHalatSayisi" />
                    <InputRow label="İvmelenme Süresi (sn)" name="ivmelenmeSuresi" />
                    <InputRow label="Kaldırma Hızı (m/dk)" name="kaldirmaHizi" />
                    <InputRow label="Yürütme Hızı (m/dk)" name="yurutmeHizi" />
                  </div>
                  <div className="grid grid-cols-2 gap-5 border-t border-purple-200 mt-4 pt-4">
                    <InputRow label="Makine Teker Merkezi Arası (mm)" name="makineTekerMerkezi" />
                    <InputRow label="Başlık Teker Merkezi Arası (mm)" name="baslikTekerMerkezi" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'opsiyon' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
                <SelectRow label="Guse" name="guseYapilacak" options={['YAPILACAK', 'YAPILMAYACAK']} />
                <SelectRow label="Servis Platformu" name="platformYapilacak" options={['YAPILACAK', 'YOK']} />
                <SelectRow label="C-Ray Köprü Üzeri" name="cRayKopru" options={['YAPILACAK', 'YOK']} />
                <SelectRow label="C-Ray Yürüme Yolu" name="cRayYurumeYolu" options={['YAPILACAK', 'YOK']} />
                <SelectRow label="Uzaktan Kumanda" name="uzaktanKumanda" options={['YAPILACAK', 'YOK']} />
                <SelectRow label="Boya ve Kumlama" name="boyaKumlama" options={['YAPILACAK', 'YOK']} />
                <SelectRow label="Aşırı Yük Sivici (Loadcell)" name="asiriYukSivici" options={['CWL-3T', 'CWL-5T', 'CWL-10T', 'CWL-16T', 'CWL-32T']} />
                <SelectRow label="Montaj Hizmeti" name="montajYapilacak" options={['YAPILACAK', 'YOK']} />
                <div className="col-span-2 grid grid-cols-2 gap-4 border-t pt-4">
                   <InputRow label="Montaj Süresi (Gün)" name="montajSuresiGun" />
                   <InputRow label="Montaj Elemanı Sayısı" name="montajElemaniSayisi" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SAĞ PANEL */}
        <div className="xl:col-span-4 flex flex-col h-full">
          <div className="bg-[#1e293b] text-white p-6 rounded-xl shadow-xl flex-1 border border-slate-700">
            <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-600">
              <h2 className="text-xl font-bold">Teknik ve Maliyet Analizi</h2>
              <select 
                name="paraBirimi" value={formData.paraBirimi} onChange={handleInputChange}
                className="bg-slate-700 text-emerald-400 font-bold border border-slate-600 rounded px-3 py-1 outline-none cursor-pointer">
                <option value="TRY">Türk Lirası (₺)</option><option value="USD">Dolar ($)</option>
                <option value="EUR">Euro (€)</option><option value="GBP">Sterlin (£)</option>
              </select>
            </div>
            
            {hesaplamaSonucu ? (
              <div className="space-y-4">
                 <div className="mb-4">
                   <p className="text-[10px] font-bold text-orange-400 mb-1.5 tracking-widest uppercase">Statik Değerler</p>
                   <div className="space-y-1.5">
                     <div className="flex justify-between text-sm bg-slate-800/80 p-2 rounded">
                       <span className="text-slate-300">Köprü Ağırlığı</span>
                       <span className="font-bold text-white">{hesaplamaSonucu.kopruAgirlikKg} kg</span>
                     </div>
                     <div className="flex justify-between text-sm bg-slate-800/80 p-2 rounded">
                       <span className="text-slate-300">Toplam Çelik Tonajı</span>
                       <span className="font-bold text-white">{hesaplamaSonucu.toplamCelikAgirlik} kg</span>
                     </div>
                   </div>
                 </div>

                 <div className="mb-4">
                   <p className="text-[10px] font-bold text-purple-400 mb-1.5 tracking-widest uppercase">Mekanik Değerler</p>
                   <div className="space-y-1.5">
                     <div className="flex justify-between text-sm bg-slate-800/80 p-2 rounded">
                       <span className="text-slate-300">Kaldırma Torku</span>
                       <span className="font-bold text-white">{hesaplamaSonucu.gerekliKaldirmaTorku} Nm</span>
                     </div>
                     <div className="flex justify-between text-sm bg-slate-800/80 p-2 rounded">
                       <span className="text-slate-300">Yürütme Motor Gücü</span>
                       <span className="font-bold text-white">{hesaplamaSonucu.yurutmeMotorGucu} kW</span>
                     </div>
                     <div className="flex justify-between text-sm bg-slate-800/80 p-2 rounded">
                       <span className="text-slate-300">Maksimum Teker Yükü</span>
                       <span className="font-bold text-white">{hesaplamaSonucu.maxTekerYuku} kg</span>
                     </div>
                   </div>
                 </div>

                 <div>
                   <p className="text-[10px] font-bold text-emerald-400 mb-1.5 tracking-widest uppercase">Maliyet Dağılımı ({hesaplamaSonucu.paraBirimiSembolu})</p>
                   <div className="space-y-1.5">
                     <div className="flex justify-between text-sm bg-slate-800/80 p-2 rounded">
                       <span className="text-slate-300">Çelik + İşçilik</span>
                       <span className="font-bold text-white">{hesaplamaSonucu.celikIscilikMaliyeti}</span>
                     </div>
                     <div className="flex justify-between text-sm bg-slate-800/80 p-2 rounded">
                       <span className="text-slate-300">Makina ({formData.kapasiteKg/1000}T)</span>
                       <span className="font-bold text-white">{hesaplamaSonucu.makinaFiyati}</span>
                     </div>
                     <div className="flex justify-between text-sm bg-slate-800/80 p-2 rounded">
                       <span className="text-slate-300">Opsiyonlar & Montaj</span>
                       <span className="font-bold text-white">{(Number(hesaplamaSonucu.ekstraMaliyetler) + Number(hesaplamaSonucu.montajMaliyeti)).toFixed(2)}</span>
                     </div>
                   </div>
                 </div>
                 
                 <div className="pt-4 border-t border-slate-600 mt-6 flex justify-between items-end">
                   <span className="block text-sm text-slate-400 uppercase tracking-wider mb-1">PROJE TOPLAM TUTARI</span>
                   <span className="text-3xl font-black text-emerald-400">{hesaplamaSonucu.tahminiToplamSatis} {hesaplamaSonucu.paraBirimiSembolu}</span>
                 </div>
              </div>
            ) : (
              <div className="text-slate-400 py-16 text-center">Verileri girip <strong>Maliyetleri Hesapla</strong> butonuna basınız.</div>
            )}
          </div>

          {hesaplamaSonucu && (
            <button onClick={generatePDF} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl mt-4 font-bold tracking-wide shadow-lg transition-all">
              PDF TEKLİF YAZDIR & İNDİR
            </button>
          )}

          <button onClick={handleHesapla} disabled={hesaplaniyor} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl mt-4 font-bold text-lg tracking-wide shadow-lg transition-all">
            {hesaplaniyor ? 'MÜHENDİSLİK MOTORU ÇALIŞIYOR...' : 'MALİYETLERİ HESAPLA'}
          </button>
        </div>
      </div>

{/* GİZLİ PDF ŞABLONU (SIFIR TAILWIND CLASS - %100 INLINE CSS) */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={teklifCiktisiRef} style={{ width: '210mm', minHeight: '297mm', backgroundColor: '#ffffff', color: '#000000', fontFamily: 'Arial, sans-serif', padding: '40px', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '3px solid #f97316', paddingBottom: '15px', marginBottom: '30px' }}>
                <div>
                  <h1 style={{ fontSize: '36px', fontWeight: '900', color: '#1e3a8a', margin: '0 0 5px 0' }}>BUVİSAN</h1>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b', letterSpacing: '2px', margin: 0 }}>VİNÇ SİSTEMLERİ</p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '14px' }}>
                  <p style={{ margin: 0 }}><strong>Tarih:</strong> {new Date().toLocaleDateString('tr-TR')}</p>
                </div>
            </div>
            
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '6px', marginBottom: '30px', fontSize: '14px' }}>
                <p style={{ margin: '0 0 10px 0' }}><strong style={{ display: 'inline-block', width: '120px' }}>Firma:</strong> {formData.firmaAdi || 'Müşteri Kaydı Yok'}</p>
                <p style={{ margin: '0 0 10px 0' }}><strong style={{ display: 'inline-block', width: '120px' }}>Kapasite:</strong> {formData.kapasiteKg} kg</p>
                <p style={{ margin: 0 }}><strong style={{ display: 'inline-block', width: '120px' }}>Köprü Tipi:</strong> {formData.kopruTipi}</p>
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e3a8a', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', marginBottom: '15px', marginTop: 0 }}>VİNÇ TEKNİK ÖZELLİKLERİ</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px', fontSize: '14px' }}>
                <tbody>
                    <tr>
                        <td style={{ border: '1px solid #cbd5e1', padding: '10px', fontWeight: 'bold', backgroundColor: '#f1f5f9', width: '35%' }}>Açıklık (S)</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '10px' }}>{formData.aciklikS} mm</td>
                    </tr>
                    <tr>
                        <td style={{ border: '1px solid #cbd5e1', padding: '10px', fontWeight: 'bold', backgroundColor: '#f1f5f9' }}>Kaldırma Yüksekliği (H)</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '10px' }}>{formData.yukseklikH} mm</td>
                    </tr>
                    {hesaplamaSonucu && (
                      <>
                        <tr>
                            <td style={{ border: '1px solid #cbd5e1', padding: '10px', fontWeight: 'bold', backgroundColor: '#f1f5f9' }}>Kaldırma Motor Gücü</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '10px' }}>{hesaplamaSonucu.gerekliMotorGucu} kW</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid #cbd5e1', padding: '10px', fontWeight: 'bold', backgroundColor: '#f1f5f9' }}>Max Tekerlek Yükü</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '10px' }}>{hesaplamaSonucu.maxTekerYuku} kg</td>
                        </tr>
                      </>
                    )}
                </tbody>
            </table>

            {hesaplamaSonucu && (
              <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#ea580c', marginBottom: '15px', marginTop: 0 }}>FİYATLANDIRMA ({hesaplamaSonucu.paraBirimiSembolu})</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '16px' }}>
                      <thead>
                          <tr>
                              <th style={{ backgroundColor: '#f97316', color: '#ffffff', border: '1px solid #ea580c', padding: '12px', textAlign: 'left' }}>Açıklama</th>
                              <th style={{ backgroundColor: '#f97316', color: '#ffffff', border: '1px solid #ea580c', padding: '12px', textAlign: 'right' }}>Tutar ({hesaplamaSonucu.paraBirimiSembolu})</th>
                          </tr>
                      </thead>
                      <tbody>
                          <tr>
                              <td style={{ border: '1px solid #cbd5e1', padding: '12px' }}>Vinç Sistemi Komple İmalat ve Montaj Maliyeti</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#047857' }}>{hesaplamaSonucu.tahminiToplamSatis} {hesaplamaSonucu.paraBirimiSembolu}</td>
                          </tr>
                      </tbody>
                  </table>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}