'use client';
import React, { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
// Kendi Supabase client'ını buraya import et (Yolu kendi projene göre düzelt: örn '@/lib/supabase')
// import { supabase } from '@/lib/supabase'; 

export default function YeniTeklifSayfasi() {
  const teklifCiktisiRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    firmaAdi: '',
    yetkili: '',
    telefon: '',
    kapasiteKg: 10000,
    aciklikS: 15000,
    kopruTipi: 'Çift Kiriş Kutu Tipi',
    // Kutu Tipi Özel Girdiler (Excel: B, t1, H, t2)
    kutuAltUstGenislik: 390,
    kutuAltUstKalinlik: 6,
    kutuYanYukseklik: 800,
    kutuYanKalinlik: 6,
    // Hadde Tipi Özel Girdi
    calismaProfili: 'IPE400',
  });

  const [hesaplamaSonucu, setHesaplamaSonucu] = useState<any>(null);
  const [hesaplaniyor, setHesaplaniyor] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleHesapla = async () => {
    setHesaplaniyor(true);
    try {
      /* 
       * 1. SUPABASE'DEN CANLI VERİLERİ ÇEKME (Gerçek projede buradaki yorumları kaldırıp kullanacaksın)
       * 
       // İşçilik ve Kar Marjı Sabitleri
       const { data: sabitler } = await supabase.from('system_constants').select('*');
       const sacBirimIscilik = sabitler?.find(s => s.constant_key === 'sac_birim_iscilik')?.constant_value || 75;
       
       // Kaldırma Makinası (Hoist) Fiyatı
       const hoistTipi = formData.kopruTipi.includes('Çift') ? 'Çift Kiriş Kaldırma Makinası' : 'Tek Kiriş Kaldırma Makinası';
       const { data: makina } = await supabase
         .from('hoist_prices')
         .select('price')
         .eq('capacity_ton', formData.kapasiteKg / 1000)
         .eq('hoist_type', hoistTipi)
         .single();
       const makinaFiyati = makina?.price || 0;
      */

      // Şimdilik Test Değerleri (Supabase bağlanana kadar)
      const sacBirimIscilik = 75; 
      const makinaFiyati = formData.kopruTipi.includes('Çift') ? 277900 : 250110; 

      /* 2. STATİK AĞIRLIK HESAPLAMALARI (Excel Çelik Konstrüksiyon Sekmesi Formülleri) */
      const yogunluk = 7.85; // ton/m3
      let kopruAgirlik = 0;

      if (formData.kopruTipi === 'Çift Kiriş Kutu Tipi') {
        // Alt-Üst ve Yan Sac Ağırlıkları = Genişlik * Kalınlık * Uzunluk(Açıklık) * Özgül Ağırlık
        const altUstAgirlik = (formData.kutuAltUstGenislik * formData.kutuAltUstKalinlik * formData.aciklikS * yogunluk) / 1000000;
        const yanAgirlik = (formData.kutuYanYukseklik * formData.kutuYanKalinlik * formData.aciklikS * yogunluk) / 1000000;
        
        // %15 ekstra kaynak ve diyafram payı. Çift kiriş olduğu için x2
        kopruAgirlik = ((altUstAgirlik * 2) + (yanAgirlik * 2)) * 1.15 * 2; 
      } 
      else if (formData.kopruTipi === 'Çift Kiriş Hadde Profil') {
        /*
         * Eğer Hadde Profilse, Supabase'den steel_profiles tablosuna gidip IPE400'ün birim ağırlığını almalı
         // const { data: profil } = await supabase.from('steel_profiles').select('unit_weight').eq('profile_name', formData.calismaProfili).single();
         // const profilAgirlik = profil?.unit_weight || 66.3;
        */
        const profilBirimAgirlik = 66.3; // IPE400 örnek ağırlık
        const kareProfilAgirlik = (40 * 30 * 8 * formData.aciklikS) / 1000000; // Ray profili
        kopruAgirlik = ((profilBirimAgirlik * formData.aciklikS / 1000) + kareProfilAgirlik) * 2;
      }

      /* 3. FİYAT HESAPLAMA (Excel Maliyet Sayfası Formülleri) */
      const celikKopruMaliyeti = kopruAgirlik * sacBirimIscilik;
      const tahminiToplamSatis = celikKopruMaliyeti + makinaFiyati;

      // Sonuçları State'e Yazdır
      setHesaplamaSonucu({
        kopruToplamAgirlik: kopruAgirlik.toFixed(2),
        makinaFiyati: makinaFiyati.toFixed(2),
        celikKopruMaliyeti: celikKopruMaliyeti.toFixed(2),
        tahminiToplamSatis: tahminiToplamSatis.toFixed(2)
      });

    } catch (error) {
      console.error("Hesaplama Hatası:", error);
      alert("Hesaplama sırasında bir hata oluştu.");
    } finally {
      setHesaplaniyor(false);
    }
  };

  const generatePDF = async () => {
    // 1. Dinamik importu gerçekleştir
    const html2pdfModule = (await import('html2pdf.js')).default;
    
    if (teklifCiktisiRef.current) {
      const element = teklifCiktisiRef.current;
      const opt = {
        margin:       10,
        filename:     `Teklif-${formData.firmaAdi || 'Yeni'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      element.style.display = 'block';
      
      // 2. TYPESCRIPT HATASI ÇÖZÜMÜ: html2pdf modülünü "any" olarak cast ediyoruz.
      await (html2pdfModule() as any).from(element).set(opt).save();
      
      element.style.display = 'none'; 
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Yeni Vinç Teklifi (ERP)</h1>
        {hesaplamaSonucu && (
           <button onClick={generatePDF} className="px-4 py-2 bg-green-600 rounded-lg text-white font-medium hover:bg-green-700 transition-colors">
             PDF Oluştur & İndir
           </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Alanı (Sol Taraf) */}
        <div className="lg:col-span-8 space-y-6">
            
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 border-b pb-2">Proje Bilgileri</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                 <div>
                    <label className="block text-xs text-gray-500 font-medium mb-1">Firma Adı</label>
                    <input type="text" name="firmaAdi" onChange={handleInputChange} className="w-full p-2 border rounded outline-none focus:ring-1 focus:ring-blue-500" />
                 </div>
                 <div>
                    <label className="block text-xs text-gray-500 font-medium mb-1">Kapasite (kg)</label>
                    <input type="number" name="kapasiteKg" value={formData.kapasiteKg} onChange={handleInputChange} className="w-full p-2 border rounded outline-none focus:ring-1 focus:ring-blue-500" />
                 </div>
                 <div>
                    <label className="block text-xs text-gray-500 font-medium mb-1">Açıklık (S) mm</label>
                    <input type="number" name="aciklikS" value={formData.aciklikS} onChange={handleInputChange} className="w-full p-2 border rounded outline-none focus:ring-1 focus:ring-blue-500" />
                 </div>
                 <div className="col-span-3">
                    <label className="block text-xs text-gray-500 font-medium mb-1">Köprü Tipi Seçimi</label>
                    <select name="kopruTipi" value={formData.kopruTipi} onChange={handleInputChange} className="w-full p-2 border rounded outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50">
                      <option>Çift Kiriş Kutu Tipi</option>
                      <option>Çift Kiriş Hadde Profil</option>
                      <option>Tek Kiriş Kutu Profil</option>
                      <option>Tek Kiriş Hadde Profil</option>
                    </select>
                 </div>
              </div>
            </div>

            {/* DİNAMİK KÖPRÜ DETAY ALANI (Sadece Kutu Tipiyse Açılır) */}
            {formData.kopruTipi === 'Çift Kiriş Kutu Tipi' && (
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-orange-500">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Kutu Profil Ölçüleri</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 font-medium">Sac Genişlik (B)</label>
                    <input type="number" name="kutuAltUstGenislik" value={formData.kutuAltUstGenislik} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 font-medium">Sac Kalınlık (t1)</label>
                    <input type="number" name="kutuAltUstKalinlik" value={formData.kutuAltUstKalinlik} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 font-medium">Yan Yükseklik (H)</label>
                    <input type="number" name="kutuYanYukseklik" value={formData.kutuYanYukseklik} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 font-medium">Yan Kalınlık (t2)</label>
                    <input type="number" name="kutuYanKalinlik" value={formData.kutuYanKalinlik} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded outline-none" />
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* Sonuç Alanı (Sağ Taraf) */}
        <div className="lg:col-span-4">
          <div className="bg-gray-800 text-white p-6 rounded-xl shadow-lg sticky top-6">
            <h2 className="text-xl font-bold mb-6 border-b border-gray-600 pb-2">Maliyet ve Statik Özeti</h2>
            
            {hesaplamaSonucu ? (
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-gray-400">Köprü Ağırlığı</span>
                   <span className="font-semibold text-white">{hesaplamaSonucu.kopruToplamAgirlik} kg</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-gray-400">Çelik İşçilik ve Malzeme</span>
                   <span className="font-semibold text-white">{hesaplamaSonucu.celikKopruMaliyeti} TL</span>
                 </div>
                 <div className="flex justify-between items-center text-sm border-b border-gray-600 pb-4">
                   <span className="text-gray-400">Makina ({formData.kapasiteKg/1000}T)</span>
                   <span className="font-semibold text-white">{hesaplamaSonucu.makinaFiyati} TL</span>
                 </div>
                 
                 <div className="pt-2">
                   <span className="block text-xs text-gray-400 uppercase mb-1">Tahmini Toplam Tutar</span>
                   <span className="text-3xl font-bold text-green-400">{hesaplamaSonucu.tahminiToplamSatis} ₺</span>
                 </div>
              </div>
            ) : (
              <div className="text-gray-400 text-sm py-8 text-center">
                Sonuçları görmek için değerleri girip hesaplayın.
              </div>
            )}

            <button 
              onClick={handleHesapla} 
              disabled={hesaplaniyor}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg mt-6 font-bold transition-colors disabled:opacity-50">
              {hesaplaniyor ? 'Hesaplanıyor...' : 'Maliyetleri Hesapla'}
            </button>
          </div>
        </div>
      </div>

      {/* --- GİZLİ PDF ŞABLONU --- */}
      <div style={{ display: 'none' }}>
        <div ref={teklifCiktisiRef} className="bg-white text-black p-10 font-sans" style={{ width: '210mm', minHeight: '297mm' }}>
            
            <div className="border-b-2 border-orange-600 pb-4 mb-8 flex justify-between items-end">
                <div>
                  <h1 className="text-3xl font-black text-blue-900 tracking-tighter">BUVİSAN</h1>
                  <p className="text-sm font-semibold tracking-widest text-gray-600">VİNÇ SİSTEMLERİ</p>
                  <p className="text-sm mt-4 font-bold">TEKLİF VE SÖZLEŞME FORMU</p>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <p>Tarih: <strong>{new Date().toLocaleDateString('tr-TR')}</strong></p>
                  <p>Teklif No: <strong>2604-{Math.floor(Math.random() * 1000)}</strong></p>
                </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-4 rounded mb-8 text-sm">
                <table className="w-full">
                  <tbody>
                    <tr><td className="w-32 font-bold text-gray-700 py-1">Firma Adı</td><td>: {formData.firmaAdi || 'Müşteri Kaydı Girilmedi'}</td></tr>
                    <tr><td className="font-bold text-gray-700 py-1">Kapasite</td><td>: {formData.kapasiteKg / 1000} Ton</td></tr>
                    <tr><td className="font-bold text-gray-700 py-1">Açıklık (S)</td><td>: {formData.aciklikS} mm</td></tr>
                  </tbody>
                </table>
            </div>

            <h2 className="text-lg font-bold text-blue-900 border-b-2 border-blue-100 mb-4 pb-1">
              {formData.kapasiteKg / 1000} TON {formData.kopruTipi.toUpperCase()} SİSTEMİ İÇERİĞİ
            </h2>

            <table className="w-full border-collapse border border-gray-300 mb-8 text-sm">
                <thead>
                    <tr className="bg-blue-900 text-white">
                        <th className="border border-gray-300 p-2 text-left">Özellik</th>
                        <th className="border border-gray-300 p-2 text-left">Detay</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td className="border p-2 font-semibold">Kaldırma Makinası</td><td className="border p-2">{formData.kapasiteKg / 1000} Ton {formData.kopruTipi.includes('Çift') ? 'Çift Kiriş' : 'Monoray'} Kaldırma Makinası</td></tr>
                    <tr className="bg-gray-50"><td className="border p-2 font-semibold">Vinç Köprü</td><td className="border p-2">{formData.kopruTipi}</td></tr>
                    <tr><td className="border p-2 font-semibold">Boya (Standart)</td><td className="border p-2">RAL 1028 (Sarı) / RAL 7016 (Antrasit)</td></tr>
                    <tr className="bg-gray-50"><td className="border p-2 font-semibold">Frekans İnvertörü</td><td className="border p-2">Tüm yönlerde standart</td></tr>
                </tbody>
            </table>

            {hesaplamaSonucu && (
              <div className="mt-12 break-inside-avoid">
                  <h3 className="font-bold text-lg mb-2 text-orange-600">FİYATLANDIRMA</h3>
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                      <thead>
                          <tr className="bg-orange-600 text-white">
                              <th className="border border-orange-700 p-2 text-left">Açıklama</th>
                              <th className="border border-orange-700 p-2 text-right">Tutar (TL)</th>
                          </tr>
                      </thead>
                      <tbody>
                          <tr>
                              <td className="border p-2">{formData.kapasiteKg / 1000} Ton {formData.kopruTipi.includes('Çift') ? 'Çift Kiriş' : 'Tek Kiriş'} Makina</td>
                              <td className="border p-2 text-right">{hesaplamaSonucu.makinaFiyati}</td>
                          </tr>
                          <tr className="bg-gray-50">
                              <td className="border p-2">{formData.kapasiteKg / 1000} Ton Vinç Köprüsü</td>
                              <td className="border p-2 text-right">{hesaplamaSonucu.celikKopruMaliyeti}</td>
                          </tr>
                          <tr className="font-bold bg-gray-100 text-base">
                              <td className="border p-3 text-right text-gray-700">TOPLAM TUTAR</td>
                              <td className="border p-3 text-right text-green-700">{hesaplamaSonucu.tahminiToplamSatis} ₺ + KDV</td>
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