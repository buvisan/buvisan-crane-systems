'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { calculateCraneProject, OfferInputs } from '@/lib/craneCalculator';

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

  const [formData, setFormData] = useState<OfferInputs>({
    kapasiteKg: 35000, aciklikS: 25000, yukseklikH: 7500, holBoyuL: 30000, 
    kopruTipi: 'Çift Kiriş Kutu Tipi',
    kutuAltUstGenislik: 390, kutuAltUstKalinlik: 6, kutuYanYukseklik: 800, kutuYanKalinlik: 6,
    kareGenislikb: 40, kareYukseklikh: 30, dikPayandaAraligi: 1000, payandaKalinligi: 5, kosebent: '30x30x3 mm',
    rayAltiGenislik: 120, rayAltiYukseklik: 10,
    makineAgirligi: 960, baslikTekerSayisi: 4, tamburCapi: 300, halatSayisi: 6, tamburaGelenHalatSayisi: 1,
    kaldirmaHizi: 3, yurutmeHizi: 20, ivmelenmeSuresi: 5,
    
    guseYapilacak: 'YAPILMAYACAK', // TYPE HATASI BURADAN KAYNAKLANIYORDU, EKLENDİ!
    platformYapilacak: 'YAPILACAK', cRayKopru: 'YAPILACAK', cRayYurumeYolu: 'YOK', 
    uzaktanKumanda: 'YAPILACAK', boyaKumlama: 'YAPILACAK', montajYapilacak: 'YAPILACAK', 
    montajSuresiGun: 3, montajElemaniSayisi: 3,
    
    fiyatIscilikKg: 75, fiyatMakineListe: 277900, fiyatPlatformMetre: 2000, fiyatCRayKopru: 30000, 
    fiyatCRayYurume: 45000, fiyatUzaktanKumanda: 15000, fiyatBoyaKumlama: 37500, fiyatMontajYevmiye: 6000,
    
    paraBirimi: 'USD',
  } as OfferInputs);

  const [firmaBilgileri, setFirmaBilgileri] = useState({
     firmaAdi: 'ECOILS', yetkili: 'Angelo Aulicino', telefon: '+39 345 0694833', 
     email: 'angelo.aulicino@ecoils.it', adres: 'Via E. Mattei 25 84035 Polla (SA) - Italy'
  });

  const [activeTab, setActiveTab] = useState('genel');
  const [hesaplamaSonucu, setHesaplamaSonucu] = useState<any>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  useEffect(() => {
    if (dovizKurlari.USD > 0) {
      handleHesapla();
    }
  }, [formData.paraBirimi, dovizKurlari, formData.fiyatMakineListe, formData.fiyatIscilikKg, formData.fiyatMontajYevmiye]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if(Object.keys(firmaBilgileri).includes(name)) {
        setFirmaBilgileri(prev => ({ ...prev, [name]: value }));
    } else {
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
    }
  };

  const handleHesapla = () => {
    const kurCarpani = dovizKurlari[formData.paraBirimi] || 1; 
    const result = calculateCraneProject(formData, kurCarpani);
    setHesaplamaSonucu(result);
  };

  const handleKaydet = async () => {
    if (!hesaplamaSonucu) return;
    setKaydediliyor(true);
    const teklifNoStr = "2610-" + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    try {
      const { error } = await supabase.from('sc_offers').insert([{
          offer_no: teklifNoStr, customer_name: firmaBilgileri.firmaAdi || 'İsimsiz Müşteri',
          capacity_ton: formData.kapasiteKg / 1000, span_m: formData.aciklikS,
          status: hesaplamaSonucu.isEngineeringValid ? 'TASLAK' : 'MÜHENDİSLİK ONAYI BEKLİYOR', 
          total_price_eur: hesaplamaSonucu.tahminiToplamSatis,
          currency: formData.paraBirimi, 
          form_data: { inputs: formData, results: hesaplamaSonucu, customer: firmaBilgileri, kur: dovizKurlari[formData.paraBirimi] }
      }]);
      if (error) throw error;
      router.push('/dashboard/offers');
    } catch (error) {
      alert("Kayıt Hatası: Lütfen Supabase 'currency' ve 'form_data' (JSONB) sütunlarını doğrulayın.");
      setKaydediliyor(false);
    }
  };

  const generateNativePDF = () => {
    if (!teklifCiktisiRef.current) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute'; iframe.style.width = '0px'; iframe.style.height = '0px'; iframe.style.border = 'none';
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) return;

    const teklifNoStr = "261006-" + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const sembol = formData.paraBirimi === 'USD' ? '$' : formData.paraBirimi === 'EUR' ? '€' : formData.paraBirimi === 'GBP' ? '£' : '₺';
    const kapasiteTon = formData.kapasiteKg / 1000;
    const tarih = new Date().toLocaleDateString('tr-TR');
    
    // Güvenli PDF String Şablonu
    const pdfContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Teklif-${firmaBilgileri.firmaAdi}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 15mm; }
            body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; margin: 0; padding: 0; font-size: 13px; line-height: 1.4; }
            .page-break { page-break-before: always; margin-top: 20px; }
            .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #ea580c; padding-bottom: 15px; margin-bottom: 25px; }
            .logo-text { font-size: 42px; font-weight: 900; color: #1e3a8a; letter-spacing: -1px; margin: 0; line-height: 1; }
            .logo-sub { font-size: 13px; font-weight: bold; color: #ea580c; letter-spacing: 3px; margin: 5px 0 0 0; }
            .offer-meta { text-align: right; font-size: 13px; }
            .offer-meta table { border-collapse: collapse; margin-left: auto; }
            .offer-meta td { padding: 3px 8px; border: 1px solid #cbd5e1; }
            .offer-meta td.label { font-weight: bold; background: #f1f5f9; color: #1e3a8a; }
            h2.main-title { font-size: 18px; color: #1e3a8a; text-align: center; text-transform: uppercase; margin-bottom: 20px; text-decoration: underline; }
            h3.section-title { font-size: 16px; color: #ea580c; border-bottom: 2px solid #cbd5e1; padding-bottom: 5px; margin-bottom: 15px; margin-top: 25px;}
            table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
            table.data-table th, table.data-table td { border: 1px solid #cbd5e1; padding: 8px 12px; }
            table.data-table td.label-col { background-color: #f8fafc; font-weight: bold; width: 40%; color: #334155; }
            .price-box { font-size: 24px; font-weight: 900; color: #1e3a8a; text-align: right; margin-top: 30px; padding: 15px; border-top: 2px dashed #cbd5e1; }
            .contact-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 15px; margin-bottom: 20px; background: #f8fafc; }
            .contact-box table { width: 100%; border-collapse: collapse; }
            .contact-box td { padding: 4px 0; }
            .contact-box td.label { font-weight: bold; width: 120px; color: #334155; }
            p.intro { margin-bottom: 20px; font-size: 13px; color: #475569; }
            .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; background: #fff;}
          </style>
        </head>
        <body>
          
          <div class="header-container">
              <div><h1 class="logo-text">BUVİSAN</h1><p class="logo-sub">VİNÇ SİSTEMLERİ</p></div>
              <div class="offer-meta">
                <table><tr><td class="label">Offer No</td><td>${teklifNoStr}</td></tr><tr><td class="label">Offer Date</td><td>${tarih}</td></tr></table>
              </div>
          </div>

          <h2 class="main-title">Offer And Contract Form</h2>
          <div class="contact-box">
             <h3 style="margin-top:0; margin-bottom: 10px; font-size: 14px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; color:#1e3a8a;">Customer Contact</h3>
             <table>
                <tr><td class="label">Company Name</td><td>: ${firmaBilgileri.firmaAdi}</td></tr>
                <tr><td class="label">Authorized</td><td>: ${firmaBilgileri.yetkili}</td></tr>
                <tr><td class="label">Telephone</td><td>: ${firmaBilgileri.telefon}</td></tr>
                <tr><td class="label">E-Mail</td><td>: ${firmaBilgileri.email}</td></tr>
                <tr><td class="label">Address</td><td>: ${firmaBilgileri.adres}</td></tr>
             </table>
          </div>

          <p class="intro">Dear Customer;<br>First of all, thank you for your interest in our company. The price offer and technical details of the cranes you are planning to purchase are given below. You can contact the marketing and technical team for your questions and comments about the offer. We hope that our offer will be approved by you, and we wish the continuity of your investments.</p>

          <h3 class="section-title" style="text-align: center; color: #1e3a8a; border: none;">${kapasiteTon} TON SYSTEM</h3>
          
          <table class="data-table">
            <tr><th colspan="2" style="background: #ea580c; color: white; text-align: left;">Offer Details</th></tr>
            <tr><td class="label-col">Lifting Machine</td><td>${kapasiteTon} TON Hoist</td></tr>
            <tr><td class="label-col">Crane Type</td><td>${formData.kopruTipi}</td></tr>
            <tr><td class="label-col">Travelling Group</td><td>W300 P300</td></tr>
            <tr><td class="label-col">Girder Electrical Inst.</td><td>Standard</td></tr>
            <tr><td class="label-col">Cable Crane Control</td><td>Double Stage Six Movement</td></tr>
            <tr><td class="label-col">Remote Control</td><td>Double Stage Six Movement</td></tr>
            <tr><td class="label-col">Overload Switch</td><td>Electro-Mechanical</td></tr>
          </table>

          <div class="price-box">TOTAL PRICE: <span style="color: #047857;">${hesaplamaSonucu?.tahminiToplamSatis} ${sembol}</span></div>

          <div class="page-break"></div>
          <div class="header-container">
              <div><h1 class="logo-text">BUVİSAN</h1></div>
              <div class="offer-meta"><table><tr><td class="label">Offer No</td><td>${teklifNoStr}</td></tr></table></div>
          </div>
          <h2 class="main-title">Crane Technical Specifications</h2>
          <table class="data-table">
            <tr><th colspan="2" style="background: #1e3a8a; color: white; text-align: left;">1- General Properties</th></tr>
            <tr><td class="label-col">Crane Type</td><td>${formData.kopruTipi}</td></tr>
            <tr><td class="label-col">Load Capacity</td><td>${kapasiteTon} TON</td></tr>
            <tr><td class="label-col">Span</td><td>${formData.aciklikS} mm</td></tr>
            <tr><td class="label-col">Lifting Height</td><td>${formData.yukseklikH} mm</td></tr>
          </table>
          <table class="data-table">
            <tr><th colspan="2" style="background: #1e3a8a; color: white; text-align: left;">2- Lifting Group</th></tr>
            <tr><td class="label-col">Motor Power</td><td>${hesaplamaSonucu?.gerekliMotorGucu} kW</td></tr>
            <tr><td class="label-col">Lifting Speed</td><td>${formData.kaldirmaHizi} m/dk</td></tr>
            <tr><td class="label-col">Rope Reeving</td><td>${formData.halatSayisi} / ${formData.tamburaGelenHalatSayisi}</td></tr>
          </table>
          <table class="data-table">
            <tr><th colspan="2" style="background: #1e3a8a; color: white; text-align: left;">3- Trolley & Travel Group</th></tr>
            <tr><td class="label-col">Travel Motor Power</td><td>${hesaplamaSonucu?.yurutmeMotorGucu} kW</td></tr>
            <tr><td class="label-col">Trolley Speed</td><td>0 - ${formData.yurutmeHizi} m/dk</td></tr>
            <tr><td class="label-col">Max Wheel Load</td><td>${hesaplamaSonucu?.maxTekerYuku} kg</td></tr>
          </table>

          <div class="page-break"></div>
          <div class="header-container">
              <div><h1 class="logo-text">BUVİSAN</h1></div>
              <div class="offer-meta"><table><tr><td class="label">Offer No</td><td>${teklifNoStr}</td></tr></table></div>
          </div>
          <h2 class="main-title">Responsibilities & Obligations</h2>
          <table class="data-table">
             <tr><td class="label-col">Manufacturing Process</td><td>The production will be made by Buvisan. Buvisan can make necessary revisions.</td></tr>
             <tr><td class="label-col">Transport & Crane</td><td>Will be borne by the customer.</td></tr>
             <tr><td class="label-col">Delivery Time</td><td>50 Work Days (Starts after advance payment)</td></tr>
             <tr><td class="label-col">Delivery Term</td><td>Ex-Works Bursa</td></tr>
             <tr><td class="label-col">Payment</td><td>%50 will be paid when the contract is signed. %50 will be paid on delivery.</td></tr>
          </table>

          <div style="margin-top: 50px; display: flex; justify-content: space-between; padding: 0 40px;">
             <div style="text-align: center;"><p style="font-weight: bold; margin-bottom: 60px;">The Bidder</p><p>Project Manager<br>BUVISAN CRANE SYSTEMS</p></div>
             <div style="text-align: center;"><p style="font-weight: bold; margin-bottom: 60px;">Customer Sign.</p><p>${firmaBilgileri.firmaAdi}<br>${firmaBilgileri.yetkili}</p></div>
          </div>
          <div class="footer">
            BUVİSAN BİR ZM METAL MAK. İML. SAN. VE TİC. LTD. ŞTİ. MARKASIDIR<br>
            Demirci Mah. Doğan Cad. No:40 Nilüfer/BURSA | +90 224 374 00 01 | www.buvisan.com.tr
          </div>
        </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(pdfContent);
    iframeDoc.close();

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 3000);
    };
  };

const InputRow = ({ label, name, type = 'number' }: { label: string, name: string, type?: string }) => (
    <div>
      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">{label}</label>
      <input 
        type={type} 
        name={name} 
        value={Object.keys(firmaBilgileri).includes(name) ? (firmaBilgileri as any)[name] : (formData as any)[name]} 
        onChange={handleInputChange} 
        className="w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-600 outline-none" 
      />
    </div>
  );
  
  const SelectRow = ({ label, name, options }: { label: string, name: string, options: string[] }) => (
    <div>
      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">{label}</label>
      <select name={name} value={formData[name as keyof typeof formData] as any} onChange={handleInputChange} 
              className="w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-600 outline-none">
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );

  const semboller: any = { TRY: '₺', USD: '$', EUR: '€', GBP: '£' };
  const sembol = semboller[formData.paraBirimi];

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

      {hesaplamaSonucu && hesaplamaSonucu.isEngineeringValid === false && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
           <h3 className="text-red-800 font-bold">Mühendislik Sınır Uyarısı!</h3>
           <ul className="list-disc ml-5 text-sm text-red-700 mt-2">
              {hesaplamaSonucu.engineeringWarnings.map((warn: string, i: number) => <li key={i}>{warn}</li>)}
           </ul>
           <p className="text-xs text-red-600 mt-2 font-semibold">Bu teklif 'Mühendislik Onayı Bekliyor' statüsünde kaydedilecektir.</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
            {[
              { id: 'genel', title: 'Genel & Müşteri' }, 
              { id: 'kopru', title: 'Statik & Köprü' }, 
              { id: 'mekanik', title: 'Mekanik Motor' }, 
              { id: 'opsiyon', title: 'Donanım & Opsiyon' },
              { id: 'fiyatlar', title: 'Birim Fiyatlar (Admin)' }
            ].map(sekme => (
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 border-b">
                  <InputRow label="Firma Adı" name="firmaAdi" type="text" />
                  <InputRow label="Yetkili Kişi" name="yetkili" type="text" />
                  <InputRow label="E-Mail" name="email" type="text" />
                  <InputRow label="Telefon" name="telefon" type="text" />
                  <div className="md:col-span-2"><InputRow label="Firma Adresi" name="adres" type="text" /></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <InputRow label="Kapasite (Q) kg" name="kapasiteKg" />
                  <InputRow label="Açıklık (S) mm" name="aciklikS" />
                  <InputRow label="Kaldırma Yüksekliği (H)" name="yukseklikH" />
                  <InputRow label="Hol Boyu (L)" name="holBoyuL" />
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
                <SelectRow label="Aşırı Yük Sivici (Loadcell)" name="asiriYukSivici" options={['CWL-3T', 'CWL-5T', 'CWL-10T', 'CWL-16T', 'CWL-32T', 'CWL-35T']} />
                <SelectRow label="Montaj Hizmeti" name="montajYapilacak" options={['YAPILACAK', 'YOK']} />
                <div className="col-span-2 grid grid-cols-2 gap-4 border-t pt-4">
                   <InputRow label="Montaj Süresi (Gün)" name="montajSuresiGun" />
                   <InputRow label="Montaj Elemanı Sayısı" name="montajElemaniSayisi" />
                </div>
              </div>
            )}

            {activeTab === 'fiyatlar' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-lg">
                  <h3 className="font-bold text-emerald-800 mb-4">Temel Maliyet Çarpanları (TL)</h3>
                  <div className="grid grid-cols-2 gap-5 mb-6">
                    <InputRow label="Sac İşçilik Fiyatı (TL/kg)" name="fiyatIscilikKg" />
                    <InputRow label="Makine Liste Fiyatı (TL)" name="fiyatMakineListe" />
                  </div>
                  <h3 className="font-bold text-emerald-800 mb-4 border-t border-emerald-200 pt-4">Opsiyon Birim Fiyatları (TL)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                    <InputRow label="Platform (TL/metre)" name="fiyatPlatformMetre" />
                    <InputRow label="C-Ray Köprü (Set TL)" name="fiyatCRayKopru" />
                    <InputRow label="C-Ray Yürüme (Set TL)" name="fiyatCRayYurume" />
                    <InputRow label="Uzaktan Kumanda (Set TL)" name="fiyatUzaktanKumanda" />
                    <InputRow label="Boya & Kumlama (Set TL)" name="fiyatBoyaKumlama" />
                    <InputRow label="Montaj Günlük Yevmiye (TL)" name="fiyatMontajYevmiye" />
                  </div>
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
                   <p className="text-[10px] font-bold text-emerald-400 mb-1.5 tracking-widest uppercase">Maliyet Dağılımı ({sembol})</p>
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
                   <span className="text-3xl font-black text-emerald-400">{hesaplamaSonucu.tahminiToplamSatis} {sembol}</span>
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

          <button onClick={handleHesapla} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl mt-4 font-bold text-lg tracking-wide shadow-lg transition-all">
            MALİYETLERİ HESAPLA
          </button>
        </div>
      </div>
      
      <div ref={teklifCiktisiRef} style={{display:'none'}}></div>

    </div>
  );
}