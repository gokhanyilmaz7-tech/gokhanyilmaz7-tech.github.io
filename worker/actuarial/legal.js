// Preferences only. Adding a reference never changes calculation rules.
const official = no => `https://www.mevzuat.gov.tr/MevzuatMetin/1.5.${no}.pdf`;
export const defaultLegislation = [
  ['6098','Türk Borçlar Kanunu','49–55: bedensel zarar, destek kaybı, faiz ve mahsup'],
  ['3095','Kanuni Faiz ve Temerrüt Faizine İlişkin Kanun','Kanuni faiz oranı'],
  ['7589','Yargının Etkin ve Verimli İşlemesine Yönelik Bazı Kanunlarda Değişiklik Yapılmasına Dair Kanun','18. madde ve geçici 1/9: TBK 55 ve geçiş kuralı'],
  ['5510','Sosyal Sigortalar ve Genel Sağlık Sigortası Kanunu','21 ve 23: rücu, PSD ve sigortasız çalışma'],
  ['2918','Karayolları Trafik Kanunu','Trafik sorumluluğu ve zorunlu sigorta'],
  ['4721','Türk Medenî Kanunu','Aile ve destek ilişkileri'],
  ['6100','Hukuk Muhakemeleri Kanunu','Tahkikat ve yargılama'],
  ['193','Gelir Vergisi Kanunu','GGO vergi hesabı'],
  ['488','Damga Vergisi Kanunu','GGO damga vergisi hesabı'],
].map(([number,title,note])=>({id:'law-'+number,number,title,note,url:official(number)}));
export function validateLegislation(rows) {
  if(!Array.isArray(rows)||rows.length>100)throw new Error('En fazla 100 mevzuat kaydedebilirsiniz.');
  const ids=new Set();
  return rows.map(row=>{
    if(!row||typeof row!=='object')throw new Error('Mevzuat satırı geçersiz.');
    const text=(key,max,required=false)=>{const value=row[key];if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw new Error('Mevzuat bilgilerini kontrol edin.');return value.trim();};
    const id=text('id',100,true),title=text('title',300,true),number=text('number',40),note=text('note',1000),url=text('url',2000,true);
    let parsed;try{parsed=new URL(url);}catch{throw new Error('Resmî mevzuat bağlantısı geçersiz.');}
    if(parsed.protocol!=='https:'||!['mevzuat.gov.tr','www.mevzuat.gov.tr'].includes(parsed.hostname)||parsed.port||parsed.username||parsed.password)throw new Error('Bağlantı https://www.mevzuat.gov.tr adresinde olmalı.');
    if(ids.has(id))throw new Error('Mevzuat satırı yinelenemez.');ids.add(id);
    return {id,title,number,note,url:parsed.href};
  });
}
