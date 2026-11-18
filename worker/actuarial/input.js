import {usesTBK55} from './tbk55.js';
import {norm} from './math.js';
export function validateInput(body,data) {
  const input=body.input,ggo=body.ggo;
  const validDate=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s||'') || s<'1900-01-01' || s>'2200-12-31')return false;const d=new Date(s+'T00:00:00Z');return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0,10)===s;};
  const finite=(v,max=1e9)=>Number.isFinite(v)&&v>=0&&v<=max;
  if(ggo){
    if(!Number.isInteger(ggo.year)||ggo.year<1996||ggo.year>2100||!finite(ggo.brut)||!['bekar','evli','evli_1','evli_2','evli_3','evli_4','evli_5'].includes(ggo.medeni))throw new Error('GGO girdisi geçersiz.');
    for(const key of ['nakdi','yemek','ayni'])if(!Array.isArray(ggo[key])||ggo[key].length>12||ggo[key].some(v=>!finite(v)))throw new Error('Aylık ek gelirler geçersiz.');
    if(ggo.targetNet!=null && (!finite(ggo.targetNet)||!Number.isInteger(ggo.targetMonth)||ggo.targetMonth<0||ggo.targetMonth>11))throw new Error('Netten brüte girdisi geçersiz.');
    return;
  }
  if(!input || !['igt','dykt'].includes(input.calculationMode))throw new Error('Hesap türü geçersiz.');
  for(const key of ['kazaTarihi','hesapTarihi','dogumTarihi'])if(!validDate(input[key]))throw new Error('Doğum, kaza ve hesap tarihlerini kontrol edin.');
  if(input.dogumTarihi>input.kazaTarihi||input.kazaTarihi>input.hesapTarihi)throw new Error('Tarih sıralaması geçersiz.');
  for(const key of ['geciciBaslangic','geciciBitis','surekliBaslangic','bakiciBaslangic','bakiciBitis'])if(input[key]!=null && !validDate(input[key]))throw new Error('Dönem tarihi geçersiz.');
  for(const key of ['eksiltmeOrani','artisOrani','progresifRantIskontoOrani','surekliMaluliyetOrani','magdurKusur'])if(!finite(input[key],100))throw new Error('Oranlar 0–100 arasında olmalı.');
  if(!finite(input.ggoDegeri,1000)||!finite(input.bakiciTutar)||!Number.isInteger(input.emeklilikYasi)||input.emeklilikYasi<18||input.emeklilikYasi>100)throw new Error('Ücret, GGO veya emeklilik yaşı geçersiz.');
  if(input.trafikSigortaTavani!=null && !finite(input.trafikSigortaTavani))throw new Error('Sigorta tavanı geçersiz.');
  if(!data.yasamTablolari.some(r=>r.tablo===input.hayatTablosu))throw new Error('Seçili yaşam tablosu teknik verilerinizde bulunamadı.');
  for(const key of ['courtName','fileNumber','davaKonusu','davaci','magdur','magdurMedeniHal','magdurCinsiyet','egitimDurumu','askerlikDurumu','askerlikKuralSecimi','hayatTablosu','omurYontemi','eksiltmeYontemi','endeksSecimi','ucretTipi'])if(typeof input[key]!=='string'||input[key].length>300)throw new Error('Metin girdisi geçersiz.');
  for(const key of ['sgkSigortasiz5510_23','yasalFaizUygula','geciciIGVar','surekliIGVar','bakiciVar','bakiciBelgeli','calisma60Var','calisma65Var','yetistirmeGideriVar'])if(typeof input[key]!=='boolean')throw new Error('Seçim girdisi geçersiz.');
  for(const key of ['davalilar','destekGorenler','pesinOdemeler','sgkOdemeler','trafikOdemeler','bordroluUcretler'])if(!Array.isArray(input[key])||input[key].length>50)throw new Error('Satır sayısı geçersiz.');
  const string=s=>typeof s==='string'&&s.length<=300;
  for(const row of input.davalilar)if(!string(row.name)||!string(row.type)||!finite(row.kusur,100))throw new Error('Davalı girdisi geçersiz.');
  for(const row of input.destekGorenler)if(!string(row.tip)||!string(row.ad)||typeof row.aktif!=='boolean'||(row.aktif&&!row.dogum && input.magdurMedeniHal!=='Bekâr')||(row.dogum && !validDate(row.dogum))||(row.destekBaslangic && !validDate(row.destekBaslangic))||(row.ozelDestektenCikisTarihi && !validDate(row.ozelDestektenCikisTarihi))||(row.cikisYasi!=null && (!Number.isInteger(row.cikisYasi)||row.cikisYasi<0||row.cikisYasi>100)))throw new Error('Destek gören girdisi geçersiz.');
  for(const key of ['pesinOdemeler','sgkOdemeler','trafikOdemeler'])for(const row of input[key])if(!string(row.davali)||!string(row.kime)||!finite(row.tutar)||(row.tarih&&!validDate(row.tarih)))throw new Error('Ödeme girdisi geçersiz.');
  for(const row of input.bordroluUcretler)if(!validDate(row.baslangic)||!validDate(row.bitis)||row.baslangic>row.bitis||!finite(row.netUcret))throw new Error('Bordro dönemi geçersiz.');
  for(const key of ['kararTarihi','tahkikatBaslangic'])if(input[key]!=null && input[key]!=='' && (!validDate(input[key])||input[key]<input.kazaTarihi))throw new Error('Karar ve tahkikat tarihleri olay tarihinden önce olamaz.');
  if(input.tahkikatBaslamadi!=null && typeof input.tahkikatBaslamadi!=='boolean')throw new Error('Tahkikat seçimi geçersiz.');
  for(const key of ['pesinOdemeler','trafikOdemeler'])for(const row of input[key])if((row.ifaAmacli!=null&&typeof row.ifaAmacli!=='boolean')||(row.odemeTarihiTazminati!=null&&(!finite(row.odemeTarihiTazminati)||row.odemeTarihiTazminati<=0)))throw new Error('İfa amacı veya ödeme tarihindeki tazminat geçersiz.');
  if(usesTBK55(input)) {
    if(input.tahkikatBaslamadi && input.tahkikatBaslangic)throw new Error('Tahkikat başlamadı seçimiyle başlangıç tarihi birlikte kullanılamaz.');
    const payments=[...input.pesinOdemeler,...input.trafikOdemeler].filter(p=>p.tutar>0&&p.ifaAmacli!==false);
    if(payments.length&&!input.tahkikatBaslamadi&&!input.tahkikatBaslangic)throw new Error('Ödemeler için tahkikat tarihini girin veya tahkikat henüz başlamadı seçimini işaretleyin.');
    if(payments.some(p=>!validDate(p.tarih)||p.tarih<input.kazaTarihi||p.tarih>input.hesapTarihi))throw new Error('İfa ödemeleri olay ve hesap tarihi arasında olmalı.');
    if(input.davalilar.some(d=>!d.name.trim())||new Set(input.davalilar.map(d=>norm(d.name))).size!==input.davalilar.length)throw new Error('Davalı adları dolu ve birbirinden farklı olmalı.');
    if(input.davalilar.reduce((s,d)=>s+d.kusur,0)>100-input.magdurKusur+.001)throw new Error('Davalı kusurları mağdur kusurundan kalan oranı aşamaz.');
    const supports=input.destekGorenler.filter(s=>s.aktif);
    if(input.calculationMode==='dykt'&&new Set(supports.map(s=>norm(s.ad.trim()||s.tip))).size!==supports.length)throw new Error('Aktif destek gören adları birbirinden farklı olmalı.');
    if((input.geciciIGVar&&input.geciciBitis>input.hesapTarihi)||(input.bakiciVar&&input.bakiciBitis>input.hesapTarihi))throw new Error('Bilinen geçici iş göremezlik/bakıcı dönemi hesap tarihini aşamaz.');
  }
}
