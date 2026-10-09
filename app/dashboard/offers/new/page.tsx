'use client';
import React, { useState, useRef, useEffect } from 'react';

export default function YeniTeklifSayfasi() {
  const teklifCiktisiRef = useRef<HTMLDivElement>(null);
  
  // 1. CANLI DÖVİZ KURU STATE'İ
  const [dovizKurlari, setDovizKurlari] = useState<{ [key: string]: number }>({
    TRY: 1, USD: 0, EUR: 0, GBP: 0
  });

  // SAYFA AÇILDIĞINDA İNTERNETTEN GÜNLÜK CANLI KURLARI ÇEK
  useEffect(() => {
    const kurlariGetir = async () => {
      try {
        // Ücretsiz ve anlık güncellenen güvenilir kur API'si
        const response = await fetch('https://open.er-api.com/v6/latest/TRY');
        const data = await response.json();
        if (data && data.rates) {
          setDovizKurlari({
            TRY: 1,
            USD: data.rates.USD,
            EUR: data.rates.EUR,
            GBP: data.rates.GBP
          });
        }
      } catch (error) {
        console.error("Kur çekilemedi, internet bağlantınızı kontrol edin:", error);
      }
    };
    kurlariGetir();
  }, []);

  // 2. EXCELDEKİ BÜTÜN HÜCRELERİN STATE TANIMI
  const [formData, setFormData] = useState({
    firmaAdi: 'ZM METAL MAKİNA İMALAT', yetkili: '', telefon: '',
    
    // --- Para Birimi ---
    paraBirimi: 'TRY', // YENİ EKLENDİ

    // --- Vinç Genel Özellikleri ---
    kapasiteKg: 10000, aciklikS: 15000, yukseklikH: 6000, 
    holBoyuL: 30000, direkArasiL1: 6000, direkAdeti: 12, direkBoyu: 6000,
    kopruTipi: 'Çift Kiriş Kutu Tipi',
    
    // --- Çift/Tek Kiriş Kutu Tipi Geometrisi ---
    kutuAltUstGenislik: 390, kutuAltUstKalinlik: 6, 
    kutuYanYukseklik: 800, kutuYanKalinlik: 6,
    
    // --- Çift/Tek Kiriş Hadde Profil Geometrisi ---
    calismaProfiliKopru: 'IPE400', kareGenislikb: 40, kareYukseklikh: 30,
    
    // --- Vinç Yürüme Yolu & Direk ---
    yurumeYoluTipi: 'Çelik Yürüme Yolu',
    yurumeYoluProfili: 'IPE300', rayAltiGenislik: 120, rayAltiYukseklik: 10,
    direkTipi: 'NPU Profil Örme', direkProfili: 'NPU 180',
    direKutuGenislik: 200, direKutuKalinlik: 5,
    payandaAraligi: 1000, payandaKalinligi: 5,
    
    // --- Mekanik (Motor ve Redüktör) ---
    makineAgirligi: 960, raydanMakineUstu: 550, 
    makineTekerMerkezi: 1260, baslikTekerMerkezi: 2800, baslikTekerSayisi: 4,
    kaldirmaHizi: 4, yurutmeHizi: 20, ivmelenmeSuresi: 5,
    tamburCapi: 300, halatSayisi: 4, tamburaGelenHalatSayisi: 1,
    
    // --- Opsiyonlar ve Maliyet Sabitleri ---
    kolonTipi: 'Kare Kutu Profil', guseYapilacak: 'YAPILMAYACAK', platformYapilacak: 'YOK',
    busbarAmper: 50, cRayKopru: 'YAPILACAK', cRayYurumeYolu: 'YOK',
    uzaktanKumanda: 'YAPILACAK', boyaKumlama: 'YAPILACAK', asiriYukSivici: 'CWL-10T',
    montajYapilacak: 'YAPILACAK', montajSuresiGun: 3, montajElemaniSayisi: 3
  });

  const [activeTab, setActiveTab] = useState('genel');
  const [hesaplamaSonucu, setHesaplamaSonucu] = useState<any>(null);
  const [hesaplaniyor, setHesaplaniyor] = useState(false);

  // KULLANICI PARA BİRİMİNİ DEĞİŞTİRDİĞİ AN HESAPLAMAYI OTOMATİK TETİKLE
  useEffect(() => {
    if (hesaplamaSonucu) {
      handleHesapla();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.paraBirimi]); 

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  // 3. MÜHENDİSLİK MOTORU
  const handleHesapla = () => {
    setHesaplaniyor(true);
    
    setTimeout(() => {
      const yerCekimi = 9.81;
      const celikYogunluk = 7.85; 
      const sacBirimIscilikTL = 75; // Bütün fiyatları önce TL bazlı hesaplayacağız
      const montajGunlukYevmiyeTL = 6000; 
      
      // 1. STATİK (Ağırlık)
      let kopruAgirlikKg = 0;
      if (formData.kopruTipi === 'Çift Kiriş Kutu Tipi') {
        const altUstAgirlik = (formData.kutuAltUstGenislik * formData.kutuAltUstKalinlik * formData.aciklikS * celikYogunluk) / 1000000;
        const yanAgirlik = (formData.kutuYanYukseklik * formData.kutuYanKalinlik * formData.aciklikS * celikYogunluk) / 1000000;
        kopruAgirlikKg = ((altUstAgirlik * 2) + (yanAgirlik * 2)) * 1.15 * 2; 
      } else if (formData.kopruTipi === 'Tek Kiriş Kutu Profil') {
        const altUstAgirlik = (formData.kutuAltUstGenislik * formData.kutuAltUstKalinlik * formData.aciklikS * celikYogunluk) / 1000000;
        const yanAgirlik = (formData.kutuYanYukseklik * formData.kutuYanKalinlik * formData.aciklikS * celikYogunluk) / 1000000;
        kopruAgirlikKg = ((altUstAgirlik * 2) + (yanAgirlik * 2)) * 1.15; 
      } else {
        const profilBirimAgirlik = 66.3; 
        const rayKareAgirlik = (formData.kareGenislikb * formData.kareYukseklikh * 8 * formData.aciklikS) / 1000000;
        kopruAgirlikKg = ((profilBirimAgirlik * formData.aciklikS / 1000) + rayKareAgirlik);
        if (formData.kopruTipi.includes('Çift')) kopruAgirlikKg *= 2;
      }

      const rayAltiSacAgirlik = (formData.rayAltiGenislik * formData.rayAltiYukseklik * celikYogunluk) / 1000;
      const yurumeYoluAgirlikKg = (50.5 + rayAltiSacAgirlik) * (formData.holBoyuL / 1000) * (formData.kopruTipi.includes('Çift') ? 2 : 1);
      const toplamCelikAgirlik = kopruAgirlikKg + yurumeYoluAgirlikKg;

      // 2. MEKANİK
      const yaklasmaMesafesi = 1000; 
      const maxTekerYuku = (kopruAgirlikKg + ((formData.kapasiteKg + formData.makineAgirligi) * ((formData.aciklikS - yaklasmaMesafesi) / formData.aciklikS))) / formData.baslikTekerSayisi;
      const gerekliKaldirmaTorku = (formData.kapasiteKg * yerCekimi * (formData.tamburCapi / 2000) * formData.tamburaGelenHalatSayisi) / (0.94 * formData.halatSayisi);
      const kaldirmaReduktorCikisDevri = (formData.kaldirmaHizi * formData.halatSayisi) / (Math.PI * (formData.tamburCapi / 1000) * formData.tamburaGelenHalatSayisi);
      const gerekliMotorGucu = (gerekliKaldirmaTorku * kaldirmaReduktorCikisDevri) / (9550 * 0.94);
      
      const yurutmeDirenci = maxTekerYuku * formData.baslikTekerSayisi * 0.005;
      const ivmelenmeGucu = (maxTekerYuku * formData.baslikTekerSayisi / 2) * Math.pow((formData.yurutmeHizi / 60), 2) / (formData.ivmelenmeSuresi * 0.9 * 1000) * 1.2;
      const yurutmeMotorGucu = (yurutmeDirenci + ivmelenmeGucu) / 1.4;

      // 3. MALİYET (ÖNCE TL OLARAK HESAPLIYORUZ)
      const celikIscilikMaliyetiTL = toplamCelikAgirlik * sacBirimIscilikTL;
      const makinaFiyatiTL = formData.kopruTipi.includes('Çift') ? 277900 : 250110; 

      let ekstraMaliyetlerTL = 0;
      if (formData.platformYapilacak === 'YAPILACAK') ekstraMaliyetlerTL += (formData.aciklikS / 1000) * 2000;
      if (formData.cRayKopru === 'YAPILACAK') ekstraMaliyetlerTL += 30000;
      if (formData.cRayYurumeYolu === 'YAPILACAK') ekstraMaliyetlerTL += 45000;
      if (formData.uzaktanKumanda === 'YAPILACAK') ekstraMaliyetlerTL += 15000;
      if (formData.boyaKumlama === 'YAPILACAK') ekstraMaliyetlerTL += 37500;
      
      let montajMaliyetiTL = 0;
      if (formData.montajYapilacak === 'YAPILACAK') {
        montajMaliyetiTL = formData.montajSuresiGun * formData.montajElemaniSayisi * montajGunlukYevmiyeTL;
      }
      
      const tahminiToplamSatisTL = celikIscilikMaliyetiTL + makinaFiyatiTL + ekstraMaliyetlerTL + montajMaliyetiTL;

      // 4. CANLI KURA GÖRE DÖNÜŞÜM İŞLEMİ (SİHRİN OLDUĞU YER)
      const kurCarpani = dovizKurlari[formData.paraBirimi] || 1; 
      const semboller: any = { TRY: '₺', USD: '$', EUR: '€', GBP: '£' };
      const sembol = semboller[formData.paraBirimi];

      setHesaplamaSonucu({
        // Statik
        kopruAgirlikKg: kopruAgirlikKg.toFixed(2),
        yurumeYoluAgirlikKg: yurumeYoluAgirlikKg.toFixed(2),
        toplamCelikAgirlik: (toplamCelikAgirlik).toFixed(2),
        
        // Mekanik
        gerekliKaldirmaTorku: gerekliKaldirmaTorku.toFixed(2),
        kaldirmaReduktorCikisDevri: kaldirmaReduktorCikisDevri.toFixed(2),
        gerekliMotorGucu: gerekliMotorGucu.toFixed(2),
        yurutmeMotorGucu: yurutmeMotorGucu.toFixed(2),
        maxTekerYuku: maxTekerYuku.toFixed(2),
        
        // Kur Çevirili Maliyetler
        paraBirimi: formData.paraBirimi,
        paraBirimiSembolu: sembol,
        celikIscilikMaliyeti: (celikIscilikMaliyetiTL * kurCarpani).toFixed(2),
        makinaFiyati: (makinaFiyatiTL * kurCarpani).toFixed(2),
        ekstraMaliyetler: (ekstraMaliyetlerTL * kurCarpani).toFixed(2),
        montajMaliyeti: (montajMaliyetiTL * kurCarpani).toFixed(2),
        tahminiToplamSatis: (tahminiToplamSatisTL * kurCarpani).toFixed(2)
      });
      
      setHesaplaniyor(false);
    }, 400); 
  };

  const generatePDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    if (teklifCiktisiRef.current) {
      const element = teklifCiktisiRef.current;
      element.style.display = 'block';
      await (html2pdf() as any).from(element).set({
        margin: 10, filename: `Teklif-${formData.firmaAdi || 'ERP'}.pdf`,
        html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).save();
      element.style.display = 'none';
    }
  };

  // Form Bileşenleri
  const InputRow = ({ label, name, type = 'number' }: { label: string, name: keyof typeof formData, type?: string }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">{label}</label>
      <input type={type} name={name} value={formData[name] as any} onChange={handleInputChange} 
             className="w-full p-2.5 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all shadow-sm" />
    </div>
  );

  const SelectRow = ({ label, name, options, labels }: { label: string, name: keyof typeof formData, options: string[], labels?: string[] }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">{label}</label>
      <select name={name} value={formData[name] as any} onChange={handleInputChange} 
              className="w-full p-2.5 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-600 outline-none shadow-sm">
        {options.map((opt, i) => <option key={opt} value={opt}>{labels ? labels[i] : opt}</option>)}
      </select>
    </div>
  );

  const sekmeler = [
    { id: 'genel', title: 'Genel Özellikler' },
    { id: 'kopru', title: 'Statik & Köprü' },
    { id: 'mekanik', title: 'Mekanik Motor' },
    { id: 'opsiyon', title: 'Maliyet Opsiyonları' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1500px] mx-auto bg-slate-100 min-h-screen font-sans">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Vinç Projesi Hesaplama Motoru (ERP)</h1>
          <p className="text-sm text-emerald-600 font-bold mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Canlı Döviz Kuru Devrede
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          {hesaplamaSonucu && (
            <button onClick={generatePDF} className="flex-1 md:flex-none px-6 py-2.5 bg-blue-700 text-white font-bold rounded-lg hover:bg-blue-800 shadow-lg shadow-blue-200 transition-all">
              PDF TEKLİF YAZDIR
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* SOL PANEL */}
        <div className="xl:col-span-8 bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden flex flex-col">
          
          <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
            {sekmeler.map(sekme => (
              <button key={sekme.id} onClick={() => setActiveTab(sekme.id)}
                className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-all border-b-2 
                ${activeTab === sekme.id ? 'border-blue-700 text-blue-800 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200'}`}>
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
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded mb-6">
                  <h3 className="font-bold text-orange-800 mb-2">Çelik Konstrüksiyon Geometrisi</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InputRow label="Alt/Üst Genişlik (B)" name="kutuAltUstGenislik" />
                    <InputRow label="Alt/Üst Kalınlık (t1)" name="kutuAltUstKalinlik" />
                    <InputRow label="Yan Yükseklik (H)" name="kutuYanYukseklik" />
                    <InputRow label="Yan Kalınlık (t2)" name="kutuYanKalinlik" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InputRow label="Hadde Çalışma Profili" name="calismaProfiliKopru" type="text" />
                  <InputRow label="Ray Kare Genişlik (b)" name="kareGenislikb" />
                </div>
              </div>
            )}

            {activeTab === 'mekanik' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
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

        {/* SAĞ PANEL (SİYAH HESAPLAMA EKRANI VE KONTROL PANELİ) */}
        <div className="xl:col-span-4 flex flex-col h-full">
          <div className="bg-[#1e293b] text-white p-6 rounded-xl shadow-xl flex-1 border border-slate-700">
            
            <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-600">
              <h2 className="text-xl font-bold">Teknik ve Maliyet Analizi</h2>
              {/* SİHİRLİ PARA BİRİMİ SEÇİCİSİ */}
              <select 
                name="paraBirimi" 
                value={formData.paraBirimi} 
                onChange={handleInputChange}
                className="bg-slate-700 text-emerald-400 font-bold border border-slate-600 rounded px-3 py-1 outline-none cursor-pointer">
                <option value="TRY">Türk Lirası (₺)</option>
                <option value="USD">Dolar ($)</option>
                <option value="EUR">Euro (€)</option>
                <option value="GBP">Sterlin (£)</option>
              </select>
            </div>
            
            {hesaplamaSonucu ? (
              <div className="space-y-4">
                 <div className="mb-4">
                   <p className="text-xs font-bold text-orange-400 mb-2 tracking-widest uppercase">Statik Değerler</p>
                   <div className="space-y-2">
                     <div className="flex justify-between text-sm bg-slate-800/80 p-2.5 rounded border border-slate-700">
                       <span className="text-slate-300">Köprü Ağırlığı</span>
                       <span className="font-bold text-white">{hesaplamaSonucu.kopruAgirlikKg} kg</span>
                     </div>
                     <div className="flex justify-between text-sm bg-slate-800/80 p-2.5 rounded border border-slate-700">
                       <span className="text-slate-300">Toplam Çelik Tonajı</span>
                       <span className="font-bold text-white">{hesaplamaSonucu.toplamCelikAgirlik} kg</span>
                     </div>
                   </div>
                 </div>

                 <div className="mb-4">
                   <p className="text-xs font-bold text-purple-400 mb-2 tracking-widest uppercase">Mekanik Değerler</p>
                   <div className="space-y-2">
                     <div className="flex justify-between text-sm bg-slate-800/80 p-2.5 rounded border border-slate-700">
                       <span className="text-slate-300">Kaldırma Torku</span>
                       <span className="font-bold text-white">{hesaplamaSonucu.gerekliKaldirmaTorku} Nm</span>
                     </div>
                     <div className="flex justify-between text-sm bg-slate-800/80 p-2.5 rounded border border-slate-700">
                       <span className="text-slate-300">Kaldırma Motor Gücü</span>
                       <span className="font-bold text-white">{hesaplamaSonucu.gerekliMotorGucu} kW</span>
                     </div>
                     <div className="flex justify-between text-sm bg-slate-800/80 p-2.5 rounded border border-slate-700">
                       <span className="text-slate-300">Maksimum Teker Yükü</span>
                       <span className="font-bold text-white">{hesaplamaSonucu.maxTekerYuku} kg</span>
                     </div>
                   </div>
                 </div>

                 <div>
                   <p className="text-xs font-bold text-emerald-400 mb-2 tracking-widest uppercase">Maliyet Dağılımı ({hesaplamaSonucu.paraBirimiSembolu})</p>
                   <div className="space-y-2">
                     <div className="flex justify-between text-sm bg-slate-800/80 p-2.5 rounded border border-slate-700">
                       <span className="text-slate-300">Çelik + İşçilik</span>
                       <span className="font-bold text-white">{hesaplamaSonucu.celikIscilikMaliyeti} {hesaplamaSonucu.paraBirimiSembolu}</span>
                     </div>
                     <div className="flex justify-between text-sm bg-slate-800/80 p-2.5 rounded border border-slate-700">
                       <span className="text-slate-300">Makina ({formData.kapasiteKg/1000}T)</span>
                       <span className="font-bold text-white">{hesaplamaSonucu.makinaFiyati} {hesaplamaSonucu.paraBirimiSembolu}</span>
                     </div>
                     <div className="flex justify-between text-sm bg-slate-800/80 p-2.5 rounded border border-slate-700">
                       <span className="text-slate-300">Opsiyonlar & Montaj</span>
                       <span className="font-bold text-white">{(Number(hesaplamaSonucu.ekstraMaliyetler) + Number(hesaplamaSonucu.montajMaliyeti)).toFixed(2)} {hesaplamaSonucu.paraBirimiSembolu}</span>
                     </div>
                   </div>
                 </div>
                 
                 <div className="pt-4 border-t border-slate-600 mt-6 flex justify-between items-end">
                   <span className="block text-sm text-slate-400 uppercase tracking-wider mb-1">PROJE TOPLAM TUTARI</span>
                   <span className="text-3xl font-black text-emerald-400">{hesaplamaSonucu.tahminiToplamSatis} {hesaplamaSonucu.paraBirimiSembolu}</span>
                 </div>
              </div>
            ) : (
              <div className="text-slate-400 py-16 text-center flex flex-col items-center justify-center">
                <svg className="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                <p>Verileri girip <strong>Maliyetleri Hesapla</strong> butonuna basınız.</p>
              </div>
            )}

          </div>
          
          <button onClick={handleHesapla} disabled={hesaplaniyor} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl mt-4 font-bold text-lg tracking-wide shadow-lg transition-all disabled:opacity-50">
            {hesaplaniyor ? 'MÜHENDİSLİK MOTORU ÇALIŞIYOR...' : 'MALİYETLERİ HESAPLA'}
          </button>
        </div>
      </div>

      {/* GİZLİ PDF ŞABLONU */}
      <div style={{ display: 'none' }}>
        <div ref={teklifCiktisiRef} className="bg-white text-black p-12 font-sans" style={{ width: '210mm', minHeight: '297mm' }}>
            <div className="border-b-[3px] border-orange-500 pb-4 mb-8 flex justify-between items-end">
                <div>
                  <h1 className="text-4xl font-black text-[#1e3a8a] tracking-tighter">BUVİSAN</h1>
                  <p className="text-sm font-bold tracking-widest text-slate-500">VİNÇ SİSTEMLERİ</p>
                </div>
                <div className="text-right text-sm">
                  <p><strong>Tarih:</strong> {new Date().toLocaleDateString('tr-TR')}</p>
                </div>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-md mb-8">
                <p className="mb-2"><strong className="inline-block w-32">Firma:</strong> {formData.firmaAdi || 'Müşteri Kaydı Yok'}</p>
                <p className="mb-2"><strong className="inline-block w-32">Kapasite:</strong> {formData.kapasiteKg} kg</p>
                <p><strong className="inline-block w-32">Köprü Tipi:</strong> {formData.kopruTipi}</p>
            </div>

            <h2 className="text-xl font-bold text-[#1e3a8a] border-b-2 border-slate-100 mb-4 pb-2">VİNÇ TEKNİK ÖZELLİKLERİ</h2>
            <table className="w-full border-collapse border border-slate-300 mb-10 text-sm">
                <tbody>
                    <tr><td className="border border-slate-300 p-2.5 font-bold bg-slate-100 w-1/3">Açıklık (S)</td><td className="border border-slate-300 p-2.5">{formData.aciklikS} mm</td></tr>
                    <tr><td className="border border-slate-300 p-2.5 font-bold bg-slate-100">Kaldırma Yüksekliği (H)</td><td className="border border-slate-300 p-2.5">{formData.yukseklikH} mm</td></tr>
                    {hesaplamaSonucu && (
                      <>
                        <tr><td className="border border-slate-300 p-2.5 font-bold bg-slate-100">Kaldırma Motor Gücü</td><td className="border border-slate-300 p-2.5">{hesaplamaSonucu.gerekliMotorGucu} kW</td></tr>
                        <tr><td className="border border-slate-300 p-2.5 font-bold bg-slate-100">Max Tekerlek Yükü</td><td className="border border-slate-300 p-2.5">{hesaplamaSonucu.maxTekerYuku} kg</td></tr>
                      </>
                    )}
                </tbody>
            </table>

            {hesaplamaSonucu && (
              <div>
                  <h3 className="font-bold text-xl mb-3 text-orange-600">FİYATLANDIRMA ({hesaplamaSonucu.paraBirimiSembolu})</h3>
                  <table className="w-full border-collapse border border-slate-300 text-base">
                      <thead>
                          <tr className="bg-orange-500 text-white">
                              <th className="border border-orange-600 p-3 text-left">Açıklama</th>
                              <th className="border border-orange-600 p-3 text-right">Tutar ({hesaplamaSonucu.paraBirimiSembolu})</th>
                          </tr>
                      </thead>
                      <tbody>
                          <tr>
                              <td className="border border-slate-300 p-3">Vinç Sistemi Komple İmalat ve Montaj Maliyeti</td>
                              <td className="border border-slate-300 p-3 text-right font-bold text-emerald-700">{hesaplamaSonucu.tahminiToplamSatis} {hesaplamaSonucu.paraBirimiSembolu}</td>
                          </tr>
                      </tbody>
                  </table>
              </div>
            )}
            
            <div className="absolute bottom-10 w-[190mm] text-center text-xs text-gray-400 border-t pt-4">
              Buvisan Vinç Sistemleri | Organize Sanayi Bölgesi, Bursa | portal.buvisan.com
            </div>
        </div>
      </div>
    </div>
  );
}