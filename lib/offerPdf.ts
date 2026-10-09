// TEKLİF FORMU (TR) ve TEKLİF FORMU-ENG sayfalarının HTML/PDF karşılığı.
// Sabit metinler Excel'den birebir alınmıştır (Excel'deki TR/EN farkları dahil).
import type { CraneResult, OfferInputs } from './craneCalculator';

export interface FirmaBilgileri { firmaAdi: string; yetkili: string; telefon: string; email: string; adres: string }
export interface PdfParams {
  lang: 'tr' | 'en'; teklifNo: string; tarih: string;
  firma: FirmaBilgileri; inputs: OfferInputs; sonuc: CraneResult;
  hazirlayan?: string;
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const nl = (s: string) => esc(s).replace(/\n/g, '<br>');
const fmt = (n: number, cur: string) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n) + ' ' + cur;

const TR = {
  title: 'TEKLİF VE SÖZLEŞME FORMU', contact: 'Müşteri İletişim Bilgileri',
  labels: ['Firma Adı', 'Yetkili', 'Telefon', 'E-Mail', 'Adres'],
  intro: 'Sayın Yetkili\nÖncelikle firmamıza göstermiş olduğunuz ilgi için teşekkür ederiz. Satın almayı planladığınız vinç ile ilgili fiyat teklifimiz ve teknik özellikler aşağıdaki gibidir. Teklif ile her türlü soru ve görüşleriniz için firmamızın pazarlama ve teknik ekibi ile iletişime geçebilirsiniz.\nTeklifimizin tarafınızdan uygun bulunacağını ümit eder, yatırımlarınızın devamını dileriz.',
  offerNo: 'TEKLİF NO', offerDate: 'TEKLİF TARİHİ', content: 'Teklif İçeriği', total: 'TOPLAM FİYAT',
  tech: 'Vinç Teknik Özellikleri', resp: 'Sorumluluk ve Yükümlülükler', pay: 'Ödeme Şekli',
  preparedBy: 'TEKLİFİ HAZIRLAYAN', customerSign: 'MÜŞTERİ KAŞE-İMZA',
};
const EN = {
  title: 'OFFER AND CONTRACT FORM', contact: 'Customer Contact Info',
  labels: ['Company Name', 'Authorized', 'Telephone', 'E-Mail', 'Address'],
  intro: 'Dear Customer;\nFirst of all, thank you for your interest in our company.\nThe price offer and technical details of the cranes you are planning to purchase are given below. You can contact the marketing and technical team for your questions and comments about the offer. We hope that our offer will be approved by you, and we wish the continuity of your investments.',
  offerNo: 'Offer No', offerDate: 'Offer Date', content: 'Offer Details', total: 'TOTAL PRICE',
  tech: 'Crane Technical Specifications', resp: 'Responsibilities & Obligations', pay: 'Payment Term',
  preparedBy: 'The Bidder', customerSign: 'Customer Sign.',
};

const CSS = `
@page { size: A4 portrait; margin: 12mm 14mm; }
*{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#222;font-size:11.5px;line-height:1.35;margin:0}
.pb{page-break-before:always}
.hd{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #ea580c;padding-bottom:10px;margin-bottom:14px}
.logo{font-size:34px;font-weight:900;color:#1e3a8a;letter-spacing:-1px;line-height:1}.sub{font-size:11px;font-weight:700;color:#ea580c;letter-spacing:3px}
.meta td{border:1px solid #cbd5e1;padding:3px 8px}.meta td.l{background:#f1f5f9;font-weight:700;color:#1e3a8a}
h2{font-size:15px;color:#1e3a8a;text-align:center;text-transform:uppercase;margin:8px 0 12px}
h3{font-size:12.5px;color:#fff;background:#1e3a8a;margin:10px 0 0;padding:4px 8px}
table.t{width:100%;border-collapse:collapse;margin-bottom:6px}
table.t td{border:1px solid #cbd5e1;padding:4px 8px;vertical-align:top}table.t td.k{background:#f8fafc;font-weight:700;width:38%;color:#334155}
.box{border:1px solid #cbd5e1;border-radius:6px;padding:8px 12px;background:#f8fafc;margin-bottom:10px}.box td{padding:2px 0}.box td.k{font-weight:700;width:110px}
.price td.p{text-align:right;font-weight:700;white-space:nowrap;width:130px}
.tot{font-size:19px;font-weight:900;color:#1e3a8a;text-align:right;margin-top:10px;padding:8px;border-top:2px dashed #cbd5e1}
.sign{display:flex;justify-content:space-between;margin-top:40px;padding:0 40px;text-align:center}.sign p{margin:0 0 50px;font-weight:700}
.ft{margin-top:14px;text-align:center;font-size:9.5px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:6px}
`;

function header(lang: 'tr' | 'en', p: PdfParams, full: boolean) {
  const L = lang === 'tr' ? TR : EN;
  return `<div class="hd"><div><div class="logo">BUVİSAN</div>${full ? `<div class="sub">${lang === 'tr' ? 'VİNÇ SİSTEMLERİ' : 'CRANE SYSTEMS'}</div>` : ''}</div>
  <table class="meta"><tr><td class="l">${L.offerNo}</td><td>${esc(p.teklifNo)}</td></tr><tr><td class="l">${L.offerDate}</td><td>${esc(p.tarih)}</td></tr></table></div>`;
}
const row = (k: string, v: unknown) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`;
const sec = (t: string, rows: string) => `<h3>${esc(t)}</h3><table class="t">${rows}</table>`;

export function buildOfferHtml(p: PdfParams): string {
  const { lang, firma, inputs: i, sonuc: r } = p;
  const L = lang === 'tr' ? TR : EN;
  const f = r.form as Record<string, any>;
  const tr = lang === 'tr';
  const cap = f.capTon;
  const girder = tr ? f.girderTR : f.girderEN;
  const gt = tr ? f.girderType : f.girderTypeEN;
  const prep = p.hazirlayan ?? 'Proje Sorumlusu Muhammed Emin Beyazkaya';

  const contact = `<div class="box"><b style="color:#1e3a8a">${L.contact}</b><table style="width:100%;margin-top:4px">` +
    [firma.firmaAdi, firma.yetkili, firma.telefon, firma.email, firma.adres].map((v, k) => `<tr><td class="k">${L.labels[k]}</td><td>: ${esc(v)}</td></tr>`).join('') + '</table></div>';

  const title = tr
    ? `${cap} TON ${i.kopruTipi.startsWith('Çift') ? 'ÇİFT KİRİŞ' : 'TEK KİRİŞ'} GEZER KÖPRÜLÜ VİNÇ SİSTEMİ`
    : `${cap} TON ${i.kopruTipi.startsWith('Çift') ? 'DOUBLE GIRDER' : 'SINGLE GIRDER'} OVERHEAD CRANE SYSTEM`;

  // ---- Sayfa 1
  let p1: string;
  if (tr) {
    p1 = sec(L.content, [
      row('Kaldırma Makinası', `${cap} Ton - ${f.girderTR} Kaldırma Makinası`),
      row('Vinç Köprü', `${f.girderTR} Gezer Köprü`),
      row('Köprü Yürüyüş Grubu', f.travelGroup),
      row('Köprü Üzeri Elektrik Tesisatı', 'C-Ray Elektrik Tesisatı'),
      row('Pendant Kablolu Vinç Kumandası', 'Çift Kademeli 6 Hareket'),
      row('Radyo Frekanslı Uzaktan Kumanda', 'Elfatek Marka - Çift Kademeli 6 Hareket'),
      row('Frekans İnvertörü', 'Lenze Marka -Aşağı-Yukarı , Sağ-Sol , İleri-Geri(Tüm Yönlerde)'),
      row('Aşırı Yük Limit Switch', 'Electro-Mekanik'),
      row('Kaldırma Limit Switch', 'Çift Kademeli Rotary Limit Switch(Tur Sivici)'),
      row('Yürüyüş Limit Switch', 'Çift Kademeli - Çapraz Limit Switch'),
      row('Sesli Işıklı İkaz Lambası', 'SIREX'),
      row('Hol Boyu Elektrik Sistemi', f.busbarTR),
      row('Vinç Yürüme Yolu', 'Çelik Hadde Profil'),
      row('Vinç Yürüme Yolu Rayı', 'Dikdörtgen Ray'),
      row('Kolon', 'Kutu Profil'),
    ].join(''))
      + `<h3>Fiyat (EUR)</h3><table class="t price">` + r.trSatirlar.map(s => `<tr><td>${esc(s.ad)}</td><td class="p">${fmt(s.eur, '€')}</td></tr>`).join('') + '</table>'
      + `<div class="tot">${L.total}: ${fmt(r.trToplamEUR, '€')}</div>`;
  } else {
    p1 = sec(L.content, [
      row('Lifting Machine', `${cap} - ${f.girderEN} Hoist`),
      row('Crane Type', `${f.girderEN} Overhead Crane`),
      row('Travelling Group', f.travelGroup),
      row('Girder Electrical Installation', 'C-Rail Electrical Installation'),
      row('Cable Crane Control', 'Double Stage Six Movement'),
      row('Ratio Frequency Remote Control', 'Double Stage Six Movement- Elfatek Brand'),
      row('Frequency Inverter', 'Lenze Brand/To&Fro,Right&Left,Back&Forth'),
      row('Overload Switch', 'Electro-Mechanical'),
      row('Hook Limit Switch', 'Double Stage Rotary Limit Switch'),
      row('Cross Travel Limit Switch', 'Double Stage -Travel Limit Switch'),
      row('Audible Warning Lamp', 'SIREX'),
      row('Cross Electrical Installation', f.busbarEN),
      row('Crane Walking Way', 'IPE Profile'),
      row('Crane Walking Rail', 'Rectangle Rail'),
    ].join('')) + `<div class="tot">${L.total}: ${fmt(r.enToplamUSD, '$')}</div>`;
  }

  // ---- Sayfa 2 – Teknik özellikler
  const kw = (v: unknown, q?: unknown) => `${v} kW ${f ? '' : ''}/ 1500 rpm${q ? '  x ' + q : ''}`;
  let p2: string;
  if (tr) {
    p2 = sec('1-Vinç Genel Özellikler', [row('FEM / ISO', '2m/M5'), row('Vinç Tipi', `${f.girderTR} Gezer Köprülü Vinç`), row('Kaldırma Kapasitesi', `${cap} Ton`),
      row('Köprü Aks Açıklığı', `${i.aciklikS} mm`), row('Kaldırma Yüksekliği', `${i.yukseklikH} mm`), row('Hol Uzunluğu', `${f.holM} m`),
      row('Çalışma Sahası', 'Kapalı Alan'), row('Çalışma Sıcaklığı', '-15/+40 °C')].join(''))
    + sec('2-Kaldırma Grubu', [row('Kapasite / Makine Tipi', `${cap} Ton - ${f.girderTR} Kaldırma Makinası`), row('Kaldırma Yüksekliği', `${i.yukseklikH} mm`),
      row('Kaldırma Makinası Modeli', `${f.hoistModel}${f.hoistCode}`), row('Kaldırma Motor Gücü ve Devri', kw(f.hoistKw)), row('Kaldırma Hızı', `${f.hoistSpeed} m/dk`),
      row('Kaldırma Kontrol Tipi', 'İnvertör Kontrollü'), row('Kaldırma Redüktörü Tipi', 'Yılmaz Redüktör (V Serisi)'),
      row('Halat Çapı ve Tipi', `${f.ropeDia} mm - Warrington Seal Çelik Halat`), row('Halat Donanımı', f.reeving), row('Kanca Tipi', '15401 - Tek Ağızlı Kanca'),
      row('Kaldırma Aşırı Yük Kesici', 'Electro-Mekanik'), row('Kaldırma Limitleme Sistemi', 'Çift Kademeli Rotary Limit Switch(Tur Sivici)')].join(''))
    + sec('3-Araba Yürütme Grubu', [row('Kaldırma Arabası Tipi', `${f.girderTR} Arabalı Vinç - Merkezden Tahrik`), row('Araba Yürütme Motor Gücü ve Devri', kw(f.trolleyKw, f.trolleyQty)),
      row('Araba Yürütme Hızı', `0-${i.kediYurutmeHizi} m/dk`), row('Araba Yürütme Kontrol Tipi', 'İnvertör Kontrollü'), row('Araba Redüktörü Tipi', 'Yılmaz Redüktör (DR Serisi)'),
      row('Araba Teker Çapı', `${f.trolleyWheel} mm`), row('Kaldırma Makinası Rengi', 'RAL 7016')].join(''))
    + sec('4-Köprü Yürütme Grubu', [row('Köprü Yürüş Tipi', `${f.girderTR} Başlık`), row('Köprü Yürütme Motor Gücü ve Devri', kw(f.endKw, f.endQty)),
      row('Köprü Yürütme Hızı', `0-${i.kopruYurutmeHizi} m/dk`), row('Köprü Yürütme Kontrol Tipi', 'İnvertör Kontrollü'), row('Köprü Yürütme Tipi', 'Yılmaz Redüktör (DR Serisi)'),
      row('Köprü Yürütme Teker Çapı', `${f.endWheel} mm`), row('Köprü Yürütme Rengi', 'RAL 1028')].join(''))
    + sec('5-Çelik Konstrüksiyon / Köprü', [row('Açıklık', `${i.aciklikS} mm`), row('Kapasite', `${cap} Ton`),
      row('Servis Platformu', i.platform === 'YAPILACAK' ? 'Tek Taraflı Servis Platformu' : 'Yok'), row('Vinç Kirişi Tipi', `${f.girderTR} Gezer Köprü - ${f.girderType}`), row('Çelik Konstrüksiyon Rengi', 'RAL 1028')].join(''))
    + sec('6-Vinç Yürüme Yolu ve Kolonları', [row('Vinç Yürüme Yolları', f.walkwayTR), row('Vinç Kolonları / Adet', `${f.columnType} / ${f.columnQty}`), row('Çelik Konstrüksiyon Rengi', 'RAL 7016')].join(''))
    + sec('7-Elektrik Sistemi', [row('Besleme Gerilimi / Frekansı', '380V / 50Hz'), row('Kumanda Voltajı', '24V'), row('Kumanda Şekli', 'Bağımsız Pendant Kumanda + RF Uzaktan Kumanda'),
      row('Köprü Üzeri Elektrik Tesisatı', `${f.bridgeM} m - C-Ray Elektrik Tesisatı`), row('Hol Boyu Elektrik Tesisatı', `${f.holM} m - ${f.busbarTR}`)].join(''));
  } else {
    p2 = sec('1-General Properties', [row('FEM / ISO', '2m/M5'), row('Crane Type', `${f.girderEN} Overhead Crane`), row('Load Capacity', `${cap} Ton`), row('Span', `${i.aciklikS} mm`),
      row('Lifting Height', `${i.yukseklikH} mm`), row('Hole Length', `${f.holM} m`), row('Working Area', 'Outdoor Area'), row('Working Temperature', '-15/+55 °C')].join(''))
    + sec('2-Lifting Group', [row('Capacity / Machine Type', `${cap} - ${f.girderEN} Hoist`), row('Lifting Height', `${i.yukseklikH} mm`), row('Lifting Machine Model', `${f.hoistModel}${f.hoistCode}`),
      row('Lifting Motor Power & r.p.m', kw(f.hoistKw)), row('Lifting Speed', `${f.hoistSpeed} m/min`), row('Lifting Control Type', 'Inverter Controlled'), row('Lifting Gearbox Type', 'Yılmaz Brand (V Series)'),
      row('Rope Diameter & Type', `${f.ropeDia} mm - Warrington Seal Wire Rope`), row('Rope Reeving', f.reeving), row('Hook Type', '15401- Simple Shank Hook'),
      row('Overload Switch', 'Electro-Mechanical'), row('Rotary Limit Switch', 'Double Stage Rotary Limit Switch')].join(''))
    + sec('3-Trolley Group', [row('Lifting Trolley Type', `${f.girderEN} Cross Travel`), row('Trolley Motor Power & r.p.m.', kw(f.trolleyKw, f.trolleyQty)), row('Trolley Speed', `0-${i.kediYurutmeHizi} m/min`),
      row('Control Type', 'Inverter Controlled'), row('Trolley Gearbox Type', 'Yılmaz Brand (D Series)'), row('Trolley Wheel Diameter', `${f.trolleyWheel} mm`), row('Color', 'RAL 7016')].join(''))
    + sec('4-Endcarriage Group', [row('Travel Cross Type', f.travelGroup), row('Cross Trolley Motor Power & r.p.m.', kw(f.endKw, f.endQty)), row('Cross Trolley Speed', `0-${i.kopruYurutmeHizi} m/min`),
      row('Control Type', 'Inverter Controlled'), row('Cross Trolley Gearbox Type', 'Yılmaz Brand (D Series)'), row('Cross Trolley Wheel Diameter', `${f.endWheel} mm`), row('Color', 'RAL 1028')].join(''))
    + sec('5-Steel Construction/Bridge', [row('Span', `${i.aciklikS} mm`), row('Capacity', `${cap} Ton`), row('Maintenance Platform', i.platform === 'YAPILACAK' ? 'Single Side Care Platform' : 'None'),
      row('Crane Bridge Type', `${f.girderEN} Overhead Crane - ${gt}`), row('Color', 'RAL 1028')].join(''))
    + sec('6-Runway', [row('Crane Runways', f.walkwayEN), row('Crane Columns / Qty', `${f.columnType === 'Kare Kutu Profil' ? 'Rectangle Profile' : f.columnType} / ${f.columnQty}`), row('Steel Construction Color', 'RAL 7016')].join(''))
    + sec('7-Electricity', [row('Feed Voltage & Frequency', '380V / 50Hz'), row('Remote Voltage', '24V'), row('Remote Type', 'Cable Remote (Standalone) + R.F. Remote Control'),
      row('Bridge Electricity', `${f.bridgeM} m - C-Rail Electrical Installation`), row('Runway Electricity', `${f.holM} m - ${f.busbarEN}`)].join(''));
  }

  // ---- Sayfa 3 – Sorumluluk / ödeme
  let p3: string;
  if (tr) {
    p3 = sec(L.resp, [
      row('Sistemin Üretimi', 'Yukarı teklifte belirtilen sistemin imalatı Buvisan tarafından yapılacaktır. Buvisan Müşteri tarafından gönderilen proje veya Buvisan personeli tarafından yapılan keşife göre imalat yapacaktır.\nBuvisan gerekli gördüğü takdirde müşteriyi bilgilendirerek imalat aşamasında proje üzerinde değişiklik yapabilecektir.'),
      row('Nakliye', 'Müşteri tarafından karşılanacaktır.'), row('Mobil Vinç / Manlif', 'Müşteri tarafından karşılanacaktır.'),
      row('Sistemin Kurulumu', 'Sistemin imalatı sözleşmeye uygun olarak yapılacaktır. Buvisan gerekli gördüğü takdirde müşteriyi bilgilendirerek imalat ve montaj sırasında gerekli revizyonları yapacaktır.\nMontaj yapılacak sahanın vinç kurulumuna uygun hale getirilmesi ve İSG için gerekli güvenlik önlemleri müşteri tarafından sağlanacaktır.\nHol boyunun uygun bir köşesine boy seviyesine kadar enerjinin getirilmesi ve bu noktaya bir pako şalter ile otomatik sigorta ve kaçak akım rölesi getirilmesi müşteri firmaya aittir.'),
      row('Test Yükü', 'Statik Test Yükü=Kapasitex1,25\nDinamik Test Yükü =Kapasitex1,1\nTest yükünün temini müşteriye, testin uygulanması Buvisan\'a aittir.'),
      row('Teslim Yeri', 'Müşteri Adresi'), row('Termin Süresi', '30 İş Günü'),
      row('Garanti', 'Vinç sistemi mekanik arızalara karşı 2 yıl garanti kapsamındadır. Montajı tarafımızdan yapılmayan ekipmanlar, elektrik şebekesinden veya kullanıcı hatasından kaynaklanan arızalar garanti kapsamı dışındadır.'),
    ].map(x => x.replace(/<td>([^<]*)<\/td>/, (_m, t) => `<td>${t.replace(/&#10;/g, '<br>')}</td>`)).join(''))
    + `<p>Teslim süresi avans ödemesine müteakip başlar.</p>`
    + sec(L.pay, [row('Peşinat', 'Sözleşmeye müteakip %50 Banka Havalesi ile'), row('Kalan Bakiye', 'İş teslimine müteakip %50 Banka Havalesi ile')].join(''))
    + `<p>( T.C. Merkez Bankası Satış kuru baz alınacak.)</p>`
    + sec('ZM METAL', [row('Firma Adı', 'ZM METAL MAK. İML. SAN. TİC. LTD. ŞTİ.'), row('Adres', 'Demirci Mah. Doğan Cd. No:40 Nilüfer/BURSA'), row('Vergi Dairesi / No', 'Çekirge Vergi Dairesi / 999 089 8517'),
      row('Tel', '+90 224 374 00 01'), row('Mail', 'info@buvisan.com   muhasebe@zmmetal.com.tr'),
      row('Halk Bankası / Mudanya Şubesi', 'TR19 0001 2009 2840 0010 2607 51'), row('Garanti Bankası / Üçevler Şubesi', 'TR73 0006 2001 5900 0006 2959 72'), row('KUVEYT TÜRK', 'TR95 0020 5000 0979 1812 2000 01')].join(''))
    + `<p>Teklif geçerlilik süresi 7 iş günüdür. Kabul edilmesi durumunda sözleşme yerine geçecektir. Ödemelerin tamamı yapılana kadar mal sahibi ZM Metal Mak. İml. San. ve Tic. Ltd. Şti'dir. Anlaşmazlık durumunda Bursa mahkemeleri ve İcra daireleri yetkilidir.</p>`;
  } else {
    p3 = sec(L.resp, [
      row('Manufacturing Process', 'The production of the system specified in the above offer will be made by Buvisan. Buvisan will manufacture according to the project sent by the customer or the discovery made by Buvisan personnel. If Buvisan deems it necessary, it will be able to make changes on the project during the manufacturing phase.'),
      row('Transport', 'Will be borne by the customer.'), row('Mobile Crane / Manlift', 'To be done by the customer.'),
      row('Setting Up The System', 'The production of the system will be made in accordance with the contract. Buvisan will make the necessary revisions during the manufacturing and assembly if it deems necessary.\nMaking the site to be assembled suitable for crane installation will be provided by the customer.\nIt is the customer\'s responsibility to bring the electricity supply line to the site where the crane will be installed.\nFlights, accommodations and lunches of craftsman and supervisors will be covered by customer.'),
      row('Test Load', 'Static Test Load=Capacityx1,25\nDynamic Test Load =Capacityx1,1\nThe provision of the test load belongs to the customer.\nThe implementation of the test belongs to BUVİSAN'),
      row('Delivery Time', '50 Work Days'), row('Delivery Location', 'Customer Address'), row('Delivery Term', 'Ex-Works Bursa'),
      row('Warranty', 'Crane system is under warranty for two years against mechanical failures. Electrical system failures are out of warranty.'),
    ].join(''))
    + `<p>Delivery time starts after advance payment.</p>`
    + sec(L.pay, [row('Payment', '%50 will be paid when the contract is signed. %50 will be paid on delivery'), row('Bank Name', 'Kuveyt Türk Katılım Bankası A.Ş.'),
      row('Branch', 'Kuveyt Türk Katılım Bankası A.Ş. DİKKALDIRIM ŞUBESİ'), row('SWIFT Code', 'KTEFTRİS'),
      row('Account Holder', 'ZM METAL MAKİNA İMALAT SANAYİ VE TİCARET LİMİTED ŞİRKETİ'), row('Account Number', '97918122-101'),
      row('IBAN', 'TR140020500009791812200101'), row('Bank Address', 'Hüdavendigar Mah., Dikkaldırım Cd. No: 91, 16090 Osmangazi/Bursa')].join(''))
    + `<p>Offer validity period is 7 working days. If accepted, it will replace the contract.</p>`;
  }
  // satır içi \n → <br> (esc sonrası)
  const fixBr = (h: string) => h.replace(/\n/g, '<br>');

  const sign = `<div class="sign"><div><p>${L.preparedBy}</p>${esc(prep)}<br>BUVİSAN</div><div><p>${L.customerSign}</p>${esc(firma.firmaAdi)}<br>${esc(firma.yetkili)}</div></div>
  <div class="ft">BUVİSAN BİR ZM METAL MAK. İML. SAN. VE TİC. LTD. ŞTİ. MARKASIDIR — Demirci Mah. Doğan Cd. No:40 Nilüfer/BURSA — +90 224 374 00 01 — www.buvisan.com</div>`;

  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc(tr ? 'Teklif' : 'Offer')}-${esc(p.teklifNo)}-${esc(firma.firmaAdi)}</title><style>${CSS}</style></head><body>
  ${header(lang, p, true)}<h2>${L.title}</h2>${contact}<p>${nl(L.intro)}</p><h2 style="margin-top:14px">${esc(title)}</h2>${fixBr(p1)}
  <div class="pb"></div>${header(lang, p, false)}<h2>${L.tech}</h2>${fixBr(p2)}
  <div class="pb"></div>${header(lang, p, false)}${fixBr(p3)}${sign}</body></html>`;
}

export function printHtml(html: string) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) { iframe.remove(); return; }
  doc.open(); doc.write(html); doc.close();
  // onload bazı tarayıcılarda document.write sonrası tetiklenmez → zamanlayıcı kullanılır
  setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); setTimeout(() => iframe.remove(), 60000); }, 400);
}
