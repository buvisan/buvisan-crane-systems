'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function YeniTeklifSayfasi() {
  const router = useRouter();
  const supabase = createClient();
  const teklifCiktisiRef = useRef<HTMLDivElement>(null);
  
  // 1. CANLI DÖVİZ KURLARI
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

  // 2. EXCEL'İN BÜTÜN GİRDİLERİ
  const [formData, setFormData] = useState({
    firmaAdi: 'ZM METAL MAKİNA İMALAT', yetkili: '', telefon: '', paraBirimi: 'TRY',
    
    // --- Genel Özellikler ---
    kapasiteKg: 10000, aciklikS: 15000, yukseklikH: 6000, 
    holBoyuL: 30000, direkArasiL1: 6000, direkAdeti: 12, direkBoyu: 6000,
    kopruTipi: 'Çift Kiriş Kutu Tipi', direkTipi: 'Kare Kutu Profil',
    
    // --- Statik ve Köprü ---
    kutuAltUstGenislik: 390, kutuAltUstKalinlik: 6, 
    kutuYanYukseklik: 800, kutuYanKalinlik: 6,
    kareGenislikb: 40, kareYukseklikh: 30, 
    dikPayandaAraligi: 1000, payandaKalinligi: 5, 
    kosebent: '30x30x3 mm', calismaProfiliKopru: 'IPE400',
    
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

  // 3. DEVASA MÜHENDİSLİK MOTORU (Excel 1:1 Klonu)
  const handleHesapla = () => {
    setHesaplaniyor(true);
    setTimeout(() => {
      let kopruAgirlikKg = 0;
      
      // EXCEL: KÖPRÜ AĞIRLIĞI HESAPLAMA SİSTEMATİĞİ
      if (formData.kopruTipi === 'Çift Kiriş Kutu Tipi') {
        const altUst = (formData.kutuAltUstKalinlik * formData.kutuAltUstGenislik * formData.aciklikS * 8 * 4) / 1000000;
        const yan = (formData.kutuYanYukseklik * formData.kutuYanKalinlik * formData.aciklikS * 8 * 4) / 1000000;
        const kareRay = (formData.kareGenislikb * formData.kareYukseklikh * formData.aciklikS * 8 * 2) / 1000000;
        
        const payandaAdet = Math.ceil(formData.aciklikS / formData.dikPayandaAraligi);
        const diyafram = ((formData.kutuYanYukseklik - 10) * (formData.kutuAltUstGenislik - 60) * formData.payandaKalinligi * payandaAdet * 2 * 8) / 1000000;
        
        const kosebentCarpan = (formData.kosebent === '30x30x3 mm' && formData.kutuYanYukseklik < 1000) ? (1.36 * 8) : 
                               (formData.kosebent === '30x30x3 mm' && formData.kutuYanYukseklik >= 1000) ? (1.36 * 12) : (2.42 * 12);
        const kosebentAgirlik = (kosebentCarpan * formData.aciklikS) / 1000;
        const ek = (formData.aciklikS * 30) / 1000;
        
        kopruAgirlikKg = altUst + yan + kareRay + diyafram + kosebentAgirlik + ek;
      } 
      else if (formData.kopruTipi === 'Çift Kiriş Hadde Profil') {
        const rayKareAgirlik = (formData.kareGenislikb * formData.kareYukseklikh * 8 * formData.aciklikS) / 1000000;
        kopruAgirlikKg = ((66.3 * formData.aciklikS / 1000) + rayKareAgirlik) * 2; // 66.3 Örnek IPE400
      }
      else if (formData.kopruTipi === 'Tek Kiriş Kutu Profil') {
         const altUst = (formData.kutuAltUstKalinlik * formData.kutuAltUstGenislik * formData.aciklikS * 8 * 2) / 1000000;
         const yan = (formData.kutuYanYukseklik * formData.kutuYanKalinlik * formData.aciklikS * 8 * 2) / 1000000;
         kopruAgirlikKg = altUst + yan;
      }
      else {
         kopruAgirlikKg = (66.3 * formData.aciklikS / 1000);
      }

      // EXCEL: YÜRÜME YOLU
      const rayAltiSacAgirlik = (formData.rayAltiGenislik * formData.rayAltiYukseklik * 7.85) / 1000;
      const yurumeYoluAgirlikKg = (50.5 + rayAltiSacAgirlik) * (formData.holBoyuL / 1000) * (formData.kopruTipi.includes('Çift') ? 2 : 1);
      const toplamCelikAgirlik = kopruAgirlikKg + yurumeYoluAgirlikKg;

      // EXCEL: MEKANİK MOTOR
      const mekanikEmniyetliAgirlik = kopruAgirlikKg * 1.1; 
      const yaklasmaMesafesi = 1000; 
      const maxTekerYuku = (mekanikEmniyetliAgirlik + ((formData.kapasiteKg + formData.makineAgirligi) * ((formData.aciklikS - yaklasmaMesafesi) / formData.aciklikS))) / formData.baslikTekerSayisi * 2;
      
      const gerekliKaldirmaTorku = (formData.kapasiteKg * 9.81 * (formData.tamburCapi / 2000) * formData.tamburaGelenHalatSayisi) / (0.95 * formData.halatSayisi);
      const kaldirmaReduktorCikisDevri = (formData.kaldirmaHizi * formData.halatSayisi) / (Math.PI * (formData.tamburCapi / 1000) * formData.tamburaGelenHalatSayisi);
      const gerekliMotorGucu = (gerekliKaldirmaTorku * kaldirmaReduktorCikisDevri) / (9550 * 0.94);
      
      const yurutmeDirenci = maxTekerYuku * (formData.baslikTekerSayisi / 2) * 6 * 9.81 / 1000000;
      const ivmelenmeGucu = (maxTekerYuku * (formData.baslikTekerSayisi / 2)) * Math.pow((formData.yurutmeHizi / 60), 2) / (formData.ivmelenmeSuresi * 0.9 * 1000) * 1.2;
      const yurutmeEylemsizlik = (yurutmeDirenci * formData.yurutmeHizi) / (60 * 0.9);
      const yurutmeMotorGucu = (ivmelenmeGucu + yurutmeEylemsizlik) / 1.4;

      // EXCEL: MALİYETLER
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

  // 4. SUPABASE KAYDETME SİSTEMİ
  const handleKaydet = async () => {
    if (!hesaplamaSonucu) {
      alert("Lütfen önce Maliyetleri Hesapla butonuna basınız.");
      return;
    }
    setKaydediliyor(true);
    const yeniTeklifNo = `2604-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    try {
      const { error } = await supabase.from('sc_offers').insert([
        {
          offer_no: yeniTeklifNo, customer_name: formData.firmaAdi || 'İsimsiz Müşteri',
          capacity_ton: formData.kapasiteKg / 1000, span_m: formData.aciklikS,
          status: 'TASLAK', total_price_eur: parseFloat(hesaplamaSonucu.tahminiToplamSatis),
          currency: formData.paraBirimi, form_data: { inputs: formData, results: hesaplamaSonucu }
        }
      ]);
      if (error) {
         alert("SUPABASE HATASI: Lütfen SQL Editorden 'currency' ve 'form_data' sütunlarını eklediğinize emin olun.");
         throw error;
      }
      router.push('/dashboard/offers');
    } catch (error) {
      console.error("Kaydetme hatası:", error);
      setKaydediliyor(false);
    }
  };

  // 🚀 5. NATIVE BROWSER PDF (Asla Çökmez!)
  const generateNativePDF = () => {
    if (!teklifCiktisiRef.current) return;
    
    // Arkada gizli bir web penceresi (iframe) oluşturuyoruz
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) return;

    // Tailwind'den bağımsız saf CSS şablonumuzu basıyoruz
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Teklif-${formData.firmaAdi || 'ERP'}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #000; margin: 0; padding: 0; }
            .header { border-bottom: 3px solid #f97316; padding-bottom: 15px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title-box h1 { font-size: 36px; color: #1e3a8a; margin: 0 0 5px 0; font-weight: 900; letter-spacing: -1px; }
            .title-box p { font-size: 14px; color: #64748b; margin: 0; font-weight: bold; letter-spacing: 2px; }
            .info-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 6px; margin-bottom: 30px; font-size: 14px; }
            .info-box p { margin: 0 0 10px 0; }
            .info-box p strong { display: inline-block; width: 120px; color: #334155; }
            h2 { font-size: 20px; color: #1e3a8a; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 15px; }
            h3 { font-size: 20px; color: #ea580c; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
            td, th { border: 1px solid #cbd5e1; padding: 12px; }
            .bg-gray { background-color: #f1f5f9; font-weight: bold; width: 35%; color: #334155; }
            .th-orange { background-color: #f97316; color: white; text-align: left; border-color: #ea580c; }
            .text-right { text-align: right; }
            .text-green { color: #047857; font-weight: bold; font-size: 16px; }
            .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          </style>
        </head>
        <body>
          ${teklifCiktisiRef.current.innerHTML}
          <div class="footer">
            Buvisan Vinç Sistemleri | Organize Sanayi Bölgesi, Bursa, Türkiye | portal.buvisan.com
          </div>
        </body>
      </html>
    `);
    iframeDoc.close();

    // İframe yüklendiğinde tarayıcının kusursuz PDF motorunu tetikliyoruz
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 2000);
    };
  };

  // ARAYÜZ YARDIMCI BİLEŞENLERİ
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
            <button onClick={generateNativePDF} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl mt-4 font-bold tracking-wide shadow-lg transition-all">
              PDF TEKLİF YAZDIR & İNDİR
            </button>
          )}

          <button onClick={handleHesapla} disabled={hesaplaniyor} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl mt-4 font-bold text-lg tracking-wide shadow-lg transition-all">
            {hesaplaniyor ? 'MÜHENDİSLİK MOTORU ÇALIŞIYOR...' : 'MALİYETLERİ HESAPLA'}
          </button>
        </div>
      </div>

      {/* SADECE VERİ DEPOSU (Ekranda gözükmez) */}
      <div style={{ display: 'none' }}>
        <div ref={teklifCiktisiRef}>
            <div className="header">
                <div className="title-box">
                  <h1>BUVİSAN</h1>
                  <p>VİNÇ SİSTEMLERİ</p>
                </div>
                <div className="text-right">
                  <p><strong>Tarih:</strong> {new Date().toLocaleDateString('tr-TR')}</p>
                </div>
            </div>
            
            <div className="info-box">
                <p><strong>Firma:</strong> {formData.firmaAdi || 'Müşteri Kaydı Yok'}</p>
                <p><strong>Kapasite:</strong> {formData.kapasiteKg} kg</p>
                <p style={{ margin: 0 }}><strong>Köprü Tipi:</strong> {formData.kopruTipi}</p>
            </div>

            <h2>VİNÇ TEKNİK ÖZELLİKLERİ</h2>
            <table>
                <tbody>
                    <tr><td className="bg-gray">Açıklık (S)</td><td>{formData.aciklikS} mm</td></tr>
                    <tr><td className="bg-gray">Kaldırma Yüksekliği (H)</td><td>{formData.yukseklikH} mm</td></tr>
                    {hesaplamaSonucu && (
                      <>
                        <tr><td className="bg-gray">Kaldırma Motor Gücü</td><td>{hesaplamaSonucu.gerekliMotorGucu} kW</td></tr>
                        <tr><td className="bg-gray">Max Tekerlek Yükü</td><td>{hesaplamaSonucu.maxTekerYuku} kg</td></tr>
                      </>
                    )}
                </tbody>
            </table>

            {hesaplamaSonucu && (
              <div>
                  <h3>FİYATLANDIRMA ({hesaplamaSonucu.paraBirimiSembolu})</h3>
                  <table>
                      <thead>
                          <tr>
                              <th className="th-orange">Açıklama</th>
                              <th className="th-orange text-right">Tutar ({hesaplamaSonucu.paraBirimiSembolu})</th>
                          </tr>
                      </thead>
                      <tbody>
                          <tr>
                              <td>Vinç Sistemi Komple İmalat ve Montaj Maliyeti</td>
                              <td className="text-right text-green">{hesaplamaSonucu.tahminiToplamSatis} {hesaplamaSonucu.paraBirimiSembolu}</td>
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