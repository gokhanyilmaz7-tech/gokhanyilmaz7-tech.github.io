import './styles.css';
import './legislation-links.css';

const laws = [
  ['6331 SAYILI İŞ SAĞLIĞI VE GÜVENLİĞİ KANUNU', '6331'],
  ['İŞYERİ BİNA VE EKLENTİLERİNDE ALINACAK SAĞLIK VE GÜVENLİK ÖNLEMLERİNE İLİŞKİN YÖNETMELİK'],
  ['İŞ EKİPMANLARININ KULLANIMINDA SAĞLIK VE GÜVENLİK ŞARTLARI YÖNETMELİĞİ'],
  ['ÇALIŞANLARIN PATLAYICI ORTAMLARIN TEHLİKELERİNDEN KORUNMASI HAKKINDA YÖNETMELİK'],
  ['KİMYASAL MADDELERLE ÇALIŞMALARDA SAĞLIK VE GÜVENLİK ÖNLEMLERİ HAKKINDA YÖNETMELİK'],
  ['YAPI İŞLERİNDE İŞ SAĞLIĞI VE GÜVENLİĞİ YÖNETMELİĞİ'],
  ['KİŞİSEL KORUYUCU DONANIMLARIN İŞYERLERİNDE KULLANILMASI HAKKINDA YÖNETMELİK'],
  ['İŞ SAĞLIĞI VE GÜVENLİĞİ RİSK DEĞERLENDİRMESİ YÖNETMELİĞİ'],
  ['İŞYERLERİNDE ACİL DURUMLAR HAKKINDA YÖNETMELİK'],
  ['SAĞLIK VE GÜVENLİK İŞARETLERİ YÖNETMELİĞİ'],
  ['İŞ SAĞLIĞI VE GÜVENLİĞİ HİZMETLERİ YÖNETMELİĞİ'],
  ['ÇALIŞANLARIN GÜRÜLTÜ İLE İLGİLİ RİSKLERDEN KORUNMALARINA DAİR YÖNETMELİK'],
  ['ÇALIŞANLARIN TİTREŞİMLE İLGİLİ RİSKLERDEN KORUNMALARINA DAİR YÖNETMELİK'],
  ['TOZLA MÜCADELE YÖNETMELİĞİ'],
  ['İŞYERİ HEKİMİ VE DİĞER SAĞLIK PERSONELİNİN GÖREV, YETKİ, SORUMLULUK VE EĞİTİMLERİ HAKKINDA YÖNETMELİK'],
  ['İŞ GÜVENLİĞİ UZMANLARININ GÖREV, YETKİ, SORUMLULUK VE EĞİTİMLERİ HAKKINDA YÖNETMELİK'],
  ['İŞYERLERİNDE İŞVEREN VEYA İŞVEREN VEKİLİ TARAFINDAN YÜRÜTÜLECEK İŞ SAĞLIĞI VE GÜVENLİĞİ HİZMETLERİNE İLİŞKİN YÖNETMELİK'],
  ['İŞ SAĞLIĞI VE GÜVENLİĞİ KURULLARI HAKKINDA YÖNETMELİK'],
  ['TEHLİKELİ VE ÇOK TEHLİKELİ SINIFTA YER ALAN İŞLERDE ÇALIŞTIRILACAKLARIN MESLEKİ EĞİTİMLERİNE DAİR YÖNETMELİK'],
  ['ÇALIŞANLARIN İŞ SAĞLIĞI VE GÜVENLİĞİ EĞİTİMLERİNİN USUL VE ESASLARI HAKKINDA YÖNETMELİK'],
  ['KANSEROJEN VEYA MUTAJEN MADDELERLE ÇALIŞMALARDA SAĞLIK VE GÜVENLİK ÖNLEMLERİ HAKKINDA YÖNETMELİK'],
  ['BİYOLOJİK ETKENLERE MARUZİYET RİSKLERİNİN ÖNLENMESİ HAKKINDA YÖNETMELİK'],
  ['GEBE VEYA EMZİREN KADINLARIN ÇALIŞTIRILMA ŞARTLARIYLA EMZİRME ODALARI VE ÇOCUK BAKIM YURTLARINA DAİR YÖNETMELİK'],
  ['ELLE TAŞIMA İŞLERİ YÖNETMELİĞİ'], ['EKRANLI ARAÇLARLA ÇALIŞMALARDA SAĞLIK VE GÜVENLİK ÖNLEMLERİ HAKKINDA YÖNETMELİK'],
  ['ASBESTLE ÇALIŞMALARDA SAĞLIK VE GÜVENLİK ÖNLEMLERİ HAKKINDA YÖNETMELİK'], ['İŞ HİJYENİ ÖLÇÜM, TEST VE ANALİZLERİ HAKKINDA YÖNETMELİK'],
  ['SAĞLIK KURALLARI BAKIMINDAN GÜNDE AZAMİ YEDİ BUÇUK SAAT VEYA DAHA AZ ÇALIŞILMASI GEREKEN İŞLER HAKKINDA YÖNETMELİK'],
  ['KADIN ÇALIŞANLARIN GECE POSTALARINDA ÇALIŞTIRILMA KOŞULLARI HAKKINDA YÖNETMELİK'], ['GEÇİCİ VEYA BELİRLİ SÜRELİ İŞLERDE İŞ SAĞLIĞI VE GÜVENLİĞİ HAKKINDA YÖNETMELİK'],
  ['İŞYERLERİNDE İŞİN DURDURULMASINA DAİR YÖNETMELİK'], ['BÜYÜK ENDÜSTRİYEL KAZALARIN ÖNLENMESİ VE ETKİLERİNİN AZALTILMASI HAKKINDA YÖNETMELİK'],
  ['BALIKÇI GEMİLERİNDE YAPILAN ÇALIŞMALARDA SAĞLIK VE GÜVENLİK ÖNLEMLERİ HAKKINDA YÖNETMELİK'], ['4857 SAYILI İŞ KANUNU', '4857'], ['6735 SAYILI ULUSLARARASI İŞGÜCÜ KANUNU', '6735'],
  ['MADEN İŞYERLERİNDE İŞ SAĞLIĞI VE GÜVENLİĞİ YÖNETMELİĞİ'],
];

const normalize = (value) => value.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const officialCodes = new Map([
  ['İŞ SAĞLIĞI VE GÜVENLİĞİ HİZMETLERİ YÖNETMELİĞİ', '7.5.16924'],
  ['İŞ SAĞLIĞI VE GÜVENLİĞİ KURULLARI HAKKINDA YÖNETMELİĞİ', '7.5.17031'],
  ['İŞ GÜVENLİĞİ UZMANLARININ GÖREV, YETKİ, SORUMLULUK VE EĞİTİMLERİ HAKKINDA YÖNETMELİĞİ', '7.5.16923'],
  ['İŞYERİ HEKİMİ VE DİĞER SAĞLIK PERSONELİNİN GÖREV, YETKİ, SORUMLULUK VE EĞİTİMLERİ HAKKINDA YÖNETMELİĞİ', '7.5.18615'],
  ['İŞ SAĞLIĞI VE GÜVENLİĞİ RİSK DEĞERLENDİRMESİ YÖNETMELİĞİ', '7.5.16925'],
  ['ÇALIŞANLARIN İŞ SAĞLIĞI VE GÜVENLİĞİ EĞİTİMLERİNİN USUL VE ESASLARI HAKKINDA YÖNETMELİĞİ', '7.5.18371'],
  ['İŞYERİ BİNA VE EKLENTİLERİNDE ALINACAK SAĞLIK VE GÜVENLİK ÖNLEMLERİNE İLİŞKİN YÖNETMELİK', '7.5.18592'],
  ['BİYOLOJİK ETKENLERE MARUZİYET RİSKLERİNİN ÖNLENMESİ HAKKINDA YÖNETMELİK', '7.5.18485'],
  ['SAĞLIK VE GÜVENLİK İŞARETLERİ YÖNETMELİĞİ', '7.5.18829'],
  ['İŞ EKİPMANLARININ KULLANIMINDA SAĞLIK VE GÜVENLİK ŞARTLARI YÖNETMELİĞİ', '7.5.18318'],
  ['KİŞİSEL KORUYUCU DONANIMLARIN İŞYERLERİNDE KULLANILMASI HAKKINDA YÖNETMELİK', '7.5.18540'],
  ['İŞYERLERİNDE ACİL DURUMLAR HAKKINDA YÖNETMELİK', '7.5.18493'],
  ['ÇALIŞANLARIN GÜRÜLTÜ İLE İLGİLİ RİSKLERDEN KORUNMALARINA DAİR YÖNETMELİK', '7.5.18647'],
]);
const officialUrl = ([title, number]) => {
  const code = number ? `1.5.${number}` : officialCodes.get(title);
  if (code?.startsWith('1.5.')) return `https://www.mevzuat.gov.tr/Metin1.Aspx?MevzuatKod=${code}&MevzuatIliski=0&sourceXmlSearch=&Tur=1&Tertip=5&No=${number}`;
  if (code) return `https://www.mevzuat.gov.tr/Metin.Aspx?MevzuatKod=${code}&MevzuatIliski=0&sourceXmlSearch=`;
  return `https://www.mevzuat.gov.tr/?sourceXmlSearch=${encodeURIComponent(title)}`;
};
const list = document.querySelector('#legislation-list');
const count = document.querySelector('#legislation-count');
function render(query = '') {
  const visible = laws.filter(([title]) => normalize(title).includes(normalize(query)));
  count.textContent = `${visible.length} bağlantı`;
  list.innerHTML = visible.map(([title], index) => `<a class="legislation-link" href="${officialUrl(laws.find((item) => item[0] === title))}" target="_blank" rel="noopener noreferrer"><span class="legislation-number">${String(laws.indexOf(laws.find((item) => item[0] === title)) + 1).padStart(2, '0')}</span><span class="legislation-title">${title}</span><span class="legislation-arrow">↗</span></a>`).join('');
}
document.querySelector('#legislation-filter').addEventListener('input', (event) => render(event.target.value));
render();
