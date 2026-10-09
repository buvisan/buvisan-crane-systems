// TCMB günlük kur (Excel'deki TCMB sayfası: "Döviz Satış" = ForexSelling)
// Excel: Dolar = TCMB!C2/10000, Euro = TCMB!C5/10000 → ikisi de Döviz Satış.
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml', { cache: 'no-store' });
    if (!res.ok) throw new Error('TCMB HTTP ' + res.status);
    const xml = await res.text();
    const pick = (code: string) => {
      const m = xml.match(new RegExp(`<Currency[^>]*CurrencyCode="${code}"[\\s\\S]*?<ForexSelling>([\\d.]+)</ForexSelling>`));
      return m ? parseFloat(m[1]) : null;
    };
    const tarih = (xml.match(/<Tarih_Date[^>]*Tarih="([^"]+)"/) || [])[1] ?? '';
    const usd = pick('USD'), eur = pick('EUR');
    if (!usd || !eur) throw new Error('Kur ayrıştırılamadı');
    return NextResponse.json({ usd, eur, tarih, kaynak: 'TCMB Döviz Satış' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
