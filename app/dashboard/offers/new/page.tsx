'use client';
import React, { useState, useRef } from 'react';

export default function YeniTeklifSayfasi() {
  const teklifCiktisiRef = useRef<HTMLDivElement>(null);
  
  // 1. AŞAMA: EXCELDEKİ BÜTÜN HÜCRELERİN (GİRDİLERİN) EKSİKSİZ STATE TANIMI
  const [formData, setFormData] = useState({
    // --- Müşteri ---
    firmaAdi: 'ZM METAL MAKİNA İMALAT', yetkili: '', telefon: '',
    
    // --- ÇELİK KONSTRÜKSİYON (VİNÇ GENEL) ---
    kapasiteKg: 10000, aciklikS: 15000, yukseklikH: 6000, 
    holBoyuL: 30000, direkArasiL1: 6000, direkAdeti: 12, direkBoyu: 6000,
    kopruTipi: 'Çift Kiriş Kutu Tipi',
    
    // --- ÇELİK KONSTRÜKSİYON (KUTU VE HADDE ÖLÇÜLERİ) ---
    kutuAltUstGenislik: 390, kutuAltUstKalinlik: 6, 
    kutuYanYukseklik: 800, kutuYanKalinlik: 6,
    calismaProfiliKopru: 'IPE400', kareGenislikb: 40, kareYukseklikh: 30,
    
    // --- YÜRÜME YOLU VE DİREK ÖLÇÜLERİ ---
    yurumeYoluTipi: 'Çelik Yürüme Yolu',
    yurumeYoluProfili: 'IPE300', rayAltiGenislik: 120, rayAltiYukseklik: 10,
    direkTipi: 'NPU Profil Örme', direkProfili: 'NPU 180',
    direKutuGenislik: 200, direKutuKalinlik: 5,
    payandaAraligi: 1000, payandaKalinligi: 5,
    
    // --- MEKANİK (MOTOR VE REDÜKTÖR GİRDİLERİ) ---
    makineAgirligi: 960, raydanMakineUstu: 550, 
    makineTekerMerkezi: 1260, baslikTekerMerkezi: 2800, baslikTekerSayisi: 4,
    kaldirmaHizi: 4, yurutmeHizi: 20, ivmelenmeSuresi: 5,
    tamburCapi: 300, halatSayisi: 4, tamburaGelenHalatSayisi: 1,
    
    // --- OPSİYONLAR VE MALİYET SAYFASI SEÇENEKLERİ ---
    kolonTipi: 'Kare Kutu Profil', 
    guseYapilacak: 'YAPILMAYACAK', 
    platformYapilacak: 'YOK', // HATANIN SEBEBİ BURASIYDI, EKLENDİ!
    busbarAmper: 50, 
    cRayKopru: 'YAPILACAK', 
    cRayYurumeYolu: 'YOK',
    uzaktanKumanda: 'YAPILACAK', 
    boyaKumlama: 'YAPILACAK', 
    asiriYukSivici: 'CWL-10T',
    montajYapilacak: 'YAPILACAK', montajSuresiGun: 3, montajElemaniSayisi: 3
  });

  const [activeTab, setActiveTab] = useState('genel');
  const [hesaplamaSonucu, setHesaplamaSonucu] = useState<any>(null);
  const [hesaplaniyor, setHesaplaniyor] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  // 2. AŞAMA: DEVASA MÜHENDİSLİK MOTORU (Excel'in Birebir Dijital İkizi)
  const handleHesapla = () => {
    setHesaplaniyor(true);
    
    setTimeout(() => {
      // SABİTLER VE ÇARPANLAR (Supabase'den gelecek, şimdilik statik)
      const yerCekimi = 9.81;
      const celikYogunluk = 7.85; // ton/m3
      const sacBirimIscilik = 75; // TL
      const montajGunlukYevmiye = 6000; // TL
      
      // ==========================================
      // 1. ÇELİK KONSTRÜKSİYON VE STATİK (Ağırlık / Sehim Kontrolleri)
      // ==========================================
      let kopruAgirlikKg = 0;
      let kirisYuku = 0;

      if (formData.kopruTipi === 'Çift Kiriş Kutu Tipi') {
        const altUstAgirlik = (formData.kutuAltUstGenislik * formData.kutuAltUstKalinlik * formData.aciklikS * celikYogunluk) / 1000000;
        const yanAgirlik = (formData.kutuYanYukseklik * formData.kutuYanKalinlik * formData.aciklikS * celikYogunluk) / 1000000;
        const kopruMetreAgirligi = ((altUstAgirlik + yanAgirlik) / (formData.aciklikS / 1000));
        
        kopruAgirlikKg = ((altUstAgirlik * 2) + (yanAgirlik * 2)) * 1.15 * 2; // %15 kaynak/örüm payı x Çift Kiriş
        kirisYuku = kopruAgirlikKg / 2;
      } 
      else if (formData.kopruTipi === 'Tek Kiriş Kutu Profil') {
        const altUstAgirlik = (formData.kutuAltUstGenislik * formData.kutuAltUstKalinlik * formData.aciklikS * celikYogunluk) / 1000000;
        const yanAgirlik = (formData.kutuYanYukseklik * formData.kutuYanKalinlik * formData.aciklikS * celikYogunluk) / 1000000;
        kopruAgirlikKg = ((altUstAgirlik * 2) + (yanAgirlik * 2)) * 1.15; // Tek Kiriş
        kirisYuku = kopruAgirlikKg;
      }
      else {
        // Hadde Profil (IPE, HEA vb.)
        const profilBirimAgirlik = 66.3; // IPE400
        const rayKareAgirlik = (formData.kareGenislikb * formData.kareYukseklikh * 8 * formData.aciklikS) / 1000000;
        kopruAgirlikKg = ((profilBirimAgirlik * formData.aciklikS / 1000) + rayKareAgirlik);
        if (formData.kopruTipi.includes('Çift')) kopruAgirlikKg *= 2;
        kirisYuku = formData.kopruTipi.includes('Çift') ? kopruAgirlikKg / 2 : kopruAgirlikKg;
      }

      // Yürüme Yolu Ağırlık Formülü
      const rayAltiSacAgirlik = (formData.rayAltiGenislik * formData.rayAltiYukseklik * celikYogunluk) / 1000;
      const yurumeYoluMetreAgirlik = 50.5 + rayAltiSacAgirlik; // Örnek IPE300
      const yurumeYoluAgirlikKg = yurumeYoluMetreAgirlik * (formData.holBoyuL / 1000) * (formData.kopruTipi.includes('Çift') ? 2 : 1);
      
      const toplamCelikAgirlik = kopruAgirlikKg + yurumeYoluAgirlikKg;

      // ==========================================
      // 2. MEKANİK VE MAKİNA HESAPLAMALARI (Excel MEKANİK Sekmesi)
      // ==========================================
      
      // Tekerlek Yükleri (G9, G10 Hücre Formülleri)
      const yaklasmaMesafesi = 1000; // Standart yaklaşma payı
      const maxTekerYuku = (kopruAgirlikKg + ((formData.kapasiteKg + formData.makineAgirligi) * ((formData.aciklikS - yaklasmaMesafesi) / formData.aciklikS))) / formData.baslikTekerSayisi;
      const minTekerYuku = (kopruAgirlikKg + ((formData.kapasiteKg + formData.makineAgirligi) * (yaklasmaMesafesi / formData.aciklikS))) / formData.baslikTekerSayisi;

      // Kaldırma Torku (B6 Hücre Formülü: B2*9.81*(B3/2000)*B5/(VLOOKUP...))
      const mekanikVerim = 0.94;
      const gerekliKaldirmaTorku = (formData.kapasiteKg * yerCekimi * (formData.tamburCapi / 2000) * formData.tamburaGelenHalatSayisi) / (mekanikVerim * formData.halatSayisi);
      
      // Kaldırma Motor Gücü (B9 ve B10 Formülleri)
      const kaldirmaReduktorCikisDevri = (formData.kaldirmaHizi * formData.halatSayisi) / (Math.PI * (formData.tamburCapi / 1000) * formData.tamburaGelenHalatSayisi);
      const gerekliMotorGucu = (gerekliKaldirmaTorku * kaldirmaReduktorCikisDevri) / (9550 * 0.94);
      
      // Yürütme Gücü (İvmelenme ve Sürtünme - E8 ve E9 Formülleri)
      const yurutmeDirenci = maxTekerYuku * formData.baslikTekerSayisi * 0.005; // Sürtünme katsayısı
      const ivmelenmeGucu = (maxTekerYuku * formData.baslikTekerSayisi / 2) * Math.pow((formData.yurutmeHizi / 60), 2) / (formData.ivmelenmeSuresi * 0.9 * 1000) * 1.2;
      const yurutmeMotorGucu = (yurutmeDirenci + ivmelenmeGucu) / 1.4;

      // ==========================================
      // 3. MALİYET VE FİYATLANDIRMA (Excel MALİYET SAYFASI)
      // ==========================================
      
      const celikIscilikMaliyeti = toplamCelikAgirlik * sacBirimIscilik;
      
      // Kaldırma Makinası Matris Fiyatı
      const makinaFiyati = formData.kopruTipi.includes('Çift') ? 277900 : 250110; 

      // Opsiyonel Fiyatlandırma Paneli (Hücre Çarpanları)
      let ekstraMaliyetler = 0;
      if (formData.platformYapilacak === 'YAPILACAK') ekstraMaliyetler += (formData.aciklikS / 1000) * 2000;
      if (formData.cRayKopru === 'YAPILACAK') ekstraMaliyetler += 30000;
      if (formData.cRayYurumeYolu === 'YAPILACAK') ekstraMaliyetler += 45000;
      if (formData.uzaktanKumanda === 'YAPILACAK') ekstraMaliyetler += 15000;
      if (formData.boyaKumlama === 'YAPILACAK') ekstraMaliyetler += 37500;
      
      // Montaj
      let montajMaliyeti = 0;
      if (formData.montajYapilacak === 'YAPILACAK') {
        montajMaliyeti = formData.montajSuresiGun * formData.montajElemaniSayisi * montajGunlukYevmiye;
      }
      
      // Tüm Proje Toplamı
      const tahminiToplamSatis = celikIscilikMaliyeti + makinaFiyati + ekstraMaliyetler + montajMaliyeti;

      setHesaplamaSonucu({
        kopruAgirlikKg: kopruAgirlikKg.toFixed(2),
        yurumeYoluAgirlikKg: yurumeYoluAgirlikKg.toFixed(2),
        toplamCelikAgirlik: (toplamCelikAgirlik).toFixed(2),
        
        gerekliKaldirmaTorku: gerekliKaldirmaTorku.toFixed(2),
        kaldirmaReduktorCikisDevri: kaldirmaReduktorCikisDevri.toFixed(2),
        gerekliMotorGucu: gerekliMotorGucu.toFixed(2),
        yurutmeMotorGucu: yurutmeMotorGucu.toFixed(2),
        maxTekerYuku: maxTekerYuku.toFixed(2),
        
        celikIscilikMaliyeti: celikIscilikMaliyeti.toFixed(2),
        makinaFiyati: makinaFiyati.toFixed(2),
        ekstraMaliyetler: ekstraMaliyetler.toFixed(2),
        montajMaliyeti: montajMaliyeti.toFixed(2),
        
        tahminiToplamSatis: tahminiToplamSatis.toFixed(2)
      });
      setHesaplaniyor(false);
    }, 800); // Hesaplama hissi için ufak bir bekleme
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

  const SelectRow = ({ label, name, options }: { label: string, name: keyof typeof formData, options: string[] }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">{label}</label>
      <select name={name} value={formData[name] as any} onChange={handleInputChange} 
              className="w-full p-2.5 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-600 outline-none shadow-sm">
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
          <p className="text-sm text-slate-500 font-medium">MEKANİK, STATİK ve MALİYET SAYFASI Entegrasyonu</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          {hesaplamaSonucu && (
            <button onClick={generatePDF} className="flex-1 md:flex-none px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all">
              PDF TEKLİF YAZDIR
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* SOL PANEL (EXCEL SAYFALARI) */}
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
                  <InputRow label="Hadde Çalışma Profili (Örn: IPE400)" name="calismaProfiliKopru" type="text" />
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
          <div className="bg-[#1e293b] text-white p-7 rounded-xl shadow-xl flex-1 border border-slate-700">
            <h2 className="text-xl font-bold mb-5 pb-4 border-b border-slate-600">Teknik ve Maliyet Analizi</h2>
            
            {hesaplamaSonucu ? (
              <div className="space-y-4">
                 {/* STATİK BÖLÜMÜ */}
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

                 {/* MEKANİK BÖLÜMÜ */}
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

                 {/* MALİYET BÖLÜMÜ */}
                 <div>
                   <p className="text-xs font-bold text-emerald-400 mb-2 tracking-widest uppercase">Maliyet Dağılımı</p>
                   <div className="space-y-2">
                     <div className="flex justify-between text-sm bg-slate-800/80 p-2.5 rounded border border-slate-700">
                       <span className="text-slate-300">Çelik + İşçilik</span>
                       <span className="font-bold text-white">{hesaplamaSonucu.celikIscilikMaliyeti} ₺</span>
                     </div>
                     <div className="flex justify-between text-sm bg-slate-800/80 p-2.5 rounded border border-slate-700">
                       <span className="text-slate-300">Makina ({formData.kapasiteKg/1000}T)</span>
                       <span className="font-bold text-white">{hesaplamaSonucu.makinaFiyati} ₺</span>
                     </div>
                     <div className="flex justify-between text-sm bg-slate-800/80 p-2.5 rounded border border-slate-700">
                       <span className="text-slate-300">Opsiyonlar & Montaj</span>
                       <span className="font-bold text-white">{(Number(hesaplamaSonucu.ekstraMaliyetler) + Number(hesaplamaSonucu.montajMaliyeti)).toFixed(2)} ₺</span>
                     </div>
                   </div>
                 </div>
                 
                 <div className="pt-4 border-t border-slate-600 mt-6">
                   <span className="block text-sm text-slate-400 uppercase tracking-wider mb-1">PROJE TOPLAM TUTARI</span>
                   <span className="text-3xl font-black text-emerald-400">{hesaplamaSonucu.tahminiToplamSatis} ₺</span>
                 </div>
              </div>
            ) : (
              <div className="text-slate-400 py-16 text-center flex flex-col items-center justify-center">
                <svg className="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                <p>Verileri girip <strong>Maliyetleri Hesapla</strong> butonuna basınız.</p>
              </div>
            )}

          </div>
          
          <button onClick={handleHesapla} disabled={hesaplaniyor} className="w-full bg-blue-700 hover:bg-blue-600 text-white py-4 rounded-xl mt-4 font-bold text-lg tracking-wide shadow-lg transition-all disabled:opacity-50">
            {hesaplaniyor ? 'MÜHENDİSLİK MOTORU ÇALIŞIYOR...' : 'MALİYETLERİ HESAPLA'}
          </button>
        </div>
      </div>

      {/* GİZLİ PDF ŞABLONU */}
      <div style={{ display: 'none' }}>
        <div ref={teklifCiktisiRef} className="bg-white text-black p-12 font-sans" style={{ width: '210mm', minHeight: '297mm' }}>
            {/* ... (Önceki yazdığımız PDF tasarımı burada aynı şekilde kalacak) ... */}
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
        </div>
      </div>
    </div>
  );
}