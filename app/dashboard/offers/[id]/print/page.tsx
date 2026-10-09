'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { calculateCraneProject, OfferInputs, CraneResult } from '@/lib/craneCalculator';
import { buildOfferHtml, printHtml, FirmaBilgileri } from '@/lib/offerPdf';
import { Loader2, Printer, ArrowLeft, Globe } from 'lucide-react';

export default function TeklifPrintPage({ params }: { params: { id: string } & Promise<{ id: string }> }) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState<any>(null);
  const [inputs, setInputs] = useState<OfferInputs | null>(null);
  const [firma, setFirma] = useState<FirmaBilgileri | null>(null);
  const [sonuc, setSonuc] = useState<CraneResult | null>(null);
  const [teklifNo, setTeklifNo] = useState('');
  const [tarih, setTarih] = useState('');

  useEffect(() => {
    Promise.resolve(params).then(p => {
      fetchOffer(p.id);
    });
  }, [params]);

  const fetchOffer = async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sc_offers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      alert('Teklif bulunamadı!');
      router.push('/dashboard/offers');
      return;
    }

    setOffer(data);
    setTeklifNo(data.offer_no);
    setTarih(new Date(data.created_at).toLocaleDateString('tr-TR'));

    if (data.form_data) {
      if (data.form_data.inputs) {
        setInputs(data.form_data.inputs);
        try {
          const res = calculateCraneProject(data.form_data.inputs);
          setSonuc(res);
        } catch (e) {
          console.error("Hesaplama hatası:", e);
        }
      }
      if (data.form_data.customer) {
        setFirma(data.form_data.customer);
      }
    }
    setLoading(false);
  };

  const handlePrint = (lang: 'tr' | 'en') => {
    if (!sonuc || !inputs || !firma) return;
    printHtml(buildOfferHtml({ lang, teklifNo, tarih, firma, inputs, sonuc }));
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto min-h-screen bg-slate-50 font-sans">
      {/* ÜST KONTROL BAR - Yazdırırken gizlenir */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/dashboard/offers')}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center gap-2 font-bold text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Geri Dön
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-800">Teklif Çıktısı & Önizleme</h1>
            <p className="text-xs text-slate-500 font-medium">Teklif No: <span className="font-bold text-slate-700">{teklifNo}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => handlePrint('tr')}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Türkçe PDF / Yazdır
          </button>
          <button 
            onClick={() => handlePrint('en')}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <Globe className="h-4 w-4" /> English PDF / Print
          </button>
        </div>
      </div>

      {/* ÖNİZLEME KARTI */}
      <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200 space-y-8">
        <div className="border-b pb-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black text-slate-900">{firma?.firmaAdi || 'Müşteri Adı Belirtilmemiş'}</h2>
            <p className="text-sm text-slate-600 mt-1">İlgili Kişi: <span className="font-bold text-slate-800">{firma?.yetkili || '-'}</span></p>
            <p className="text-sm text-slate-600">E-Posta: {firma?.email || '-'} | Telefon: {firma?.telefon || '-'}</p>
            <p className="text-sm text-slate-600 mt-1">Adres: {firma?.adres || '-'}</p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 font-black text-xs rounded-lg border border-blue-200 uppercase">
              {offer?.status || 'TASLAK'}
            </span>
            <p className="text-sm font-bold text-slate-700 mt-2">Tarih: {tarih}</p>
            <p className="text-xs text-slate-500 font-mono">No: {teklifNo}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Teknik Özellikler</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-600">Kapasite:</span><span className="font-bold text-slate-900">{inputs?.kapasiteKg ? inputs.kapasiteKg / 1000 : 0} Ton</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Açıklık (Span):</span><span className="font-bold text-slate-900">{inputs?.aciklikS || 0} mm</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Kaldırma Yüksekliği:</span><span className="font-bold text-slate-900">{inputs?.yukseklikH || 0} mm</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Köprü Tipi:</span><span className="font-bold text-slate-900">{inputs?.kopruTipi || '-'}</span></div>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Maliyet ve Tutar</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-600">Para Birimi:</span><span className="font-bold text-slate-900">{offer?.currency || 'EUR'}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Toplam Tutar:</span><span className="font-black text-emerald-600 text-lg">
                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: offer?.currency || 'EUR' }).format(offer?.total_price_eur || 0)}
              </span></div>
            </div>
          </div>
        </div>

        <div className="text-center pt-4 border-t text-xs text-slate-400">
          Bu belge Buvisan Vinç Sistemleri ERP Teklif Modülü üzerinden otomatik olarak oluşturulmuştur.
        </div>
      </div>
    </div>
  );
}