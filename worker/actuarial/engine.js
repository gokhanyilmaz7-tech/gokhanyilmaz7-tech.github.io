// Authoritative source: AktueryaCalculationCore.swift (see source-manifest.json).
// Monetary operation order and intermediate rounding deliberately follow Swift.
import {r2,num,norm,sum,day,iso,year,age,addYears,midDay,months,split,loadWages,wage,interest,life,military,addFraction} from './math.js';
import {usesTBK55,calculateTBK55} from './tbk55.js';

const positive=x=>Math.max(0,x);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const fmt=x=>new Intl.NumberFormat('tr-TR',{minimumFractionDigits:0,maximumFractionDigits:2}).format(x);
const eligible=raw=>{const s=String(raw??'').trim().toLowerCase();return !s || s.includes('mağdur') || s.includes('magdur');};
const third=type=>['3.','3 ','ucuncu','kisi'].some(s=>norm(type).includes(s));
const isParent=tip=>norm(tip).includes('anne') || norm(tip).includes('baba');
const gender=(raw,fallback)=>norm(raw).includes('kadin')?'Kadın':norm(raw).includes('erkek')?'Erkek':fallback;
const tableFor=(table,sex)=>sex==='Kadın'?table.replaceAll('Erkek','Kadın'):table.replaceAll('Kadın','Erkek');
function prepare(raw) {
  const i=structuredClone(raw);
  for(const key of ['kazaTarihi','hesapTarihi','dogumTarihi','geciciBaslangic','geciciBitis','surekliBaslangic','bakiciBaslangic','bakiciBitis'])i[key]=day(i[key]);
  for(const key of ['pesinOdemeler','sgkOdemeler','trafikOdemeler'])i[key]=i[key].map(r=>({...r,tarih:day(r.tarih)}));
  i.bordroluUcretler=i.bordroluUcretler.map(r=>({...r,baslangic:day(r.baslangic),bitis:day(r.bitis)}));
  i.destekGorenler=i.destekGorenler.map(r=>({...r,dogum:day(r.dogum),destekBaslangic:day(r.destekBaslangic),ozelDestektenCikisTarihi:day(r.ozelDestektenCikisTarihi)}));
  return i;
}
function payroll(i) {return i.bordroluUcretler.filter(r=>r.netUcret>0 && r.bitis>=r.baslangic).map(r=>({...r,baslangic:Math.max(r.baslangic,i.kazaTarihi),bitis:Math.min(r.bitis,i.hesapTarihi)})).filter(r=>r.bitis>=r.baslangic).sort((a,b)=>a.baslangic-b.baslangic || a.bitis-b.bitis);}
function infoRow(start,end,born){return {yas:age(born,start),donemBaslangic:iso(start),donemBitis:iso(end),gun:Math.max(1,end-start+1),ay:months(start,end),netUcret:0,maluliyetYuzde:0,aylikTazminat:0,donemTutar:0,infoText:'Askerlik tenzili'};}
function buildTable(ctx,o) {
  const {i,wages,net,brut}=ctx;
  if(!(o.to>o.from))return null;
  const dykt=Boolean(o.dykt),current=i.ucretTipi.toLowerCase().includes('güncel'),usePayroll=i.ucretTipi.toLowerCase().includes('bordrolu') && !o.future && (dykt || !o.bakici);
  const pays=usePayroll?payroll(i):[];
  let extra=[...(o.extra||[]),...(o.exclusions||[]).flatMap(r=>[r.start,r.end+1])];
  // The native DYKT method does not add payroll split dates. Preserve this behavior.
  if(usePayroll && !dykt)for(const row of pays){const start=Math.max(o.from,row.baslangic),end=Math.min(o.to,row.bitis);if(end>=start)extra.push(start,end+1);}
  const periods=split(o.from,o.to,wages,!o.future&&!current,extra),pr=i.eksiltmeYontemi==='Progresif Rant',growth=positive(i.artisOrani)/100,discount=positive(pr?i.progresifRantIskontoOrani:i.eksiltmeOrani)/100;
  const base=positive(o.override ?? (o.useBrut?brut:net)),rows=[];let total=0,n=0;
  for(const p of periods) {
    const exclusion=(o.exclusions||[]).find(r=>p.start<=r.end && p.end>=r.start);
    if(exclusion){rows.push(infoRow(Math.max(p.start,exclusion.start),Math.min(p.end,exclusion.end),o.born??i.dogumTarihi));continue;}
    const mid=midDay(p.start,p.end),pay=pays.findLast(r=>mid>=r.baslangic && mid<=r.bitis),monthly=pay?.netUcret ?? (o.future||current?base:wage(mid,wages,o.useBrut)),step=o.future&&pr?r2(base*Math.pow(1+growth,n)):undefined,calc=step??monthly;
    const ggo=o.active&&!o.bakici?(!dykt&&pay?1:Math.max(.01,i.ggoDegeri)):1;
    const ratio=dykt?positive(o.payFn(mid)):undefined;
    const loss=dykt?r2(calc*ggo*ratio*(1-o.marriage)):r2(calc*ggo*positive(o.disability)/100);
    const k=o.future?1/Math.pow(1+discount,n):1, discounted=r2(loss*k),ay=months(p.start,p.end),amount=r2((o.future?discounted:loss)*ay);
    total+=amount;
    rows.push({yas:age(o.born??i.dogumTarihi,p.start),donemBaslangic:iso(p.start),donemBitis:iso(p.end),gun:Math.max(1,p.end-p.start+1),ay,netUcret:r2(monthly),ggo:o.active&&!o.bakici?r2(ggo):undefined,prArtis:step,maluliyetYuzde:dykt?100:r2(o.disability),aylikTazminat:loss,iskontoKatsayi:o.future?k:undefined,iskontoSonrasi:o.future?discounted:undefined,payOrani:dykt?r2(ratio):undefined,evlenmeTenziliYuzde:dykt&&o.marriage>0?r2(o.marriage*100):undefined,donemTutar:amount});n++;
  }
  const formula=dykt ? (o.future?(pr?'Aylık Kayıp = (P.R. Artışlı Ücret × GGO × Pay × (1−Ev.T.)); İskonto = 1/(1+P.R. İskonto)^n; Dönem = İsk. Sonrası × Ay':'Aylık Kayıp = (Ücret × GGO × Pay × (1−Ev.T.)); İskonto = 1/(1+Teknik Faiz)^n; Dönem = İsk. Sonrası × Ay'):'Aylık Kayıp = Ücret × GGO × Pay × (1−Ev.T.); Dönem = Aylık Kayıp × Ay') : (o.future?(pr?'Aylık Taz. = (P.R. Artışlı Ücret × GGO × Mal.%); İskonto = 1/(1+P.R. İskonto)^n; Dönem = İsk. Sonrası × Ay':'Aylık Taz. = (Ücret × GGO × Mal.%); İskonto = 1/(1+Teknik Faiz)^n; Dönem = İsk. Sonrası × Ay'):(usePayroll?'Aylık Taz. = Ücret × GGO × Mal.% ; Dönem Tutar = Aylık Taz. × Ay (Bordrolu aralıklarda GGO=1)':'Aylık Taz. = Ücret × GGO × Mal.% ; Dönem Tutar = Aylık Taz. × Ay'));
  return {title:o.label,type:o.type,isAktif:o.active,isFuture:o.future,isPR:pr,isBakici:Boolean(o.bakici),rows,total:r2(total),formula};
}
function payment(rows,ctx,withInterest=true,dykt=false){let base=0,faiz=0;for(const row of rows){if(dykt?eligible(row.kime):!eligible(row.kime))continue;const value=positive(row.tutar);base+=value;if(withInterest && row.tarih!==null && row.tarih<ctx.i.hesapTarihi)faiz+=interest(value,row.tarih,ctx.i.hesapTarihi,ctx.rates);}base=r2(base);faiz=r2(faiz);return {base,faiz,total:r2(base+faiz)};}
function capComparison(ctx,paid,net) {
  const {i,rates}=ctx,cap=i.trafikSigortaTavani;
  net=r2(positive(net));paid=r2(positive(paid));
  if(!(cap>0))return {trafikKalanTavanAnaPara:0,trafikKalanTavanFaiz:0,trafikKalanTavanToplam:0,guncelNetTazminatFaiz:0,guncelNetTazminatToplam:net,davalilardanTalepEdilecekToplam:net,davaliTalepEsasi:'Tazminat'};
  const principal=r2(positive(cap-paid)),start=Math.min(...i.trafikOdemeler.map(r=>r.tarih).filter(d=>d!==null && d<i.hesapTarihi));
  const faiz=interest(principal,Number.isFinite(start)?start:i.kazaTarihi,i.hesapTarihi,rates),netFaiz=interest(net,i.kazaTarihi,i.hesapTarihi,rates),netTotal=r2(net+netFaiz),capTotal=r2(principal+faiz);
  return {trafikKalanTavanAnaPara:principal,trafikKalanTavanFaiz:faiz,trafikKalanTavanToplam:capTotal,guncelNetTazminatFaiz:netFaiz,guncelNetTazminatToplam:netTotal,davalilardanTalepEdilecekToplam:r2(Math.min(capTotal,netTotal)),davaliTalepEsasi:capTotal<netTotal?'Sigorta Tavanı':'Tazminat'};
}
function shares(ctx,summary,supports=[]) {
  const {i,rates}=ctx,kusur=clamp((100-clamp(i.magdurKusur,0,100)/(i.sgkSigortasiz5510_23&&norm(i.davaKonusu).includes('rucu')?2:1))/100,0,1),sgkCase=norm(i.davaKonusu).includes('rucu') && (summary.sgkTotal>0 || i.sgkOdemeler.some(r=>r.tutar>0)),alacak=norm(i.davaKonusu).includes('alacak') && i.yasalFaizUygula;
  summary.magdurKusur=r2(i.magdurKusur);summary.kusurOrani=kusur;summary.rucuEdilebilirTutar=r2((sgkCase?summary.toplamTazminat:summary.netTazminat)*kusur);
  const capRows=sgkCase?(supports.length?supports.map(s=>({ad:s.ad||s.tip,sgkPSD:r2(positive(s.sgk)),davalilaraDusenTazminat:r2(positive(s.toplam)*positive(kusur))})):[{ad:i.magdur.trim()||'Mağdur',sgkPSD:r2(positive(summary.sgkTotal)),davalilaraDusenTazminat:r2(positive(summary.toplamTazminat)*positive(kusur))}]):[];
  for(const row of capRows){row.isverenRucuTavani=r2(Math.min(row.sgkPSD,row.davalilaraDusenTazminat));row.ucuncuKisiDisTavan=r2(row.sgkPSD/2);row.ucuncuKisiRucuTavani=r2(Math.min(row.ucuncuKisiDisTavan,row.davalilaraDusenTazminat));}
  if(capRows.length)summary.sgkRucuTavanDagilimi=capRows;
  const faizPct=alacak?interest(100,i.kazaTarihi,i.hesapTarihi,rates):0;if(alacak)summary.alacakYasalFaizOraniYuzde=faizPct;
  const valid=i.davalilar.filter(d=>d.kusur>0),positiveSupports=supports.filter(s=>positive(s.net)>0),supportSum=r2(sum(positiveSupports.map(s=>positive(s.net)))),base=supportSum>0?supportSum:r2(summary.netTazminat),supportRucu=r2(sum(positiveSupports.map(s=>positive(s.kusurlu)))),rucu=supportRucu>0?supportRucu:r2(summary.rucuEdilebilirTutar),fault=Math.max(.0001,sum(valid.map(d=>positive(d.kusur)))),traffic=summary.davaliTalepEsasi==='Sigorta Tavanı' && summary.davalilardanTalepEdilecekToplam>0;
  let rows=valid.map(d=>{
    const isThird=third(d.type),tur=isThird?'3. Kişi':d.type.trim()||'İşveren',ratio=clamp(d.kusur/100,0,1);let pays=[],anaPara=0,faiz=0,aciklama;
    if(sgkCase){pays=capRows.map(s=>{const amount=r2((isThird?s.ucuncuKisiRucuTavani:s.isverenRucuTavani)*ratio);return {ad:s.ad,anaPara:amount,faiz:0,toplam:amount};});anaPara=r2(sum(pays.map(p=>p.anaPara)));aciklama=isThird?'Davalı kusur oranı × SGK Rücu Tavanı (3. Kişi)':'Davalı kusur oranı × SGK Rücu Tavanı (İşveren)';}
    else if(alacak){pays=positiveSupports.map(s=>{const value=r2(r2(positive(s.net)*(1+faizPct/100))*ratio);return {ad:s.ad||s.tip,anaPara:value,faiz:0,toplam:value};});anaPara=pays.length?r2(sum(pays.map(p=>p.anaPara))):r2(positive(summary.netTazminat)*(1+faizPct/100)*ratio);aciklama=`Hesap tarihinde talep edilebilecek toplam tazminat × %${fmt(r2(positive(d.kusur)))}`;}
    else {
      const proportion=traffic?clamp(r2(d.kusur)/100,0,1):base>0?clamp(r2(rucu*d.kusur/fault)/base,0,1):0;
      pays=positiveSupports.map(s=>{const payBase=traffic?r2(summary.davalilardanTalepEdilecekToplam*(s.net/base)):positive(s.net),value=r2(payBase*proportion),f=i.yasalFaizUygula?interest(value,i.kazaTarihi,i.hesapTarihi,rates):0;return {ad:s.ad||s.tip,anaPara:value,faiz:f,toplam:r2(value+f)};});
      anaPara=pays.length?r2(sum(pays.map(p=>p.anaPara))):r2((traffic?summary.davalilardanTalepEdilecekToplam:base)*proportion);
      faiz=pays.length?r2(sum(pays.map(p=>p.faiz))):i.yasalFaizUygula?interest(anaPara,i.kazaTarihi,i.hesapTarihi,rates):0;
      aciklama=traffic?`Hesaplama tarihindeki kalan tavan tutar × %${fmt(r2(d.kusur))}`:'Rücu edilebilir tutar içindeki payı';
    }
    return {ad:d.name||'Davalı',tur,kusur:r2(positive(d.kusur)),anaPara,faiz,toplam:r2(anaPara+faiz),aciklama,toplamBasitFaizOrani:!sgkCase&&!alacak&&anaPara>0&&faiz>0?r2(faiz/anaPara*100):undefined,destekPaylari:pays};
  });
  rows=applyAdvance(ctx,rows,supports);summary.davaliDagilimi=rows;
}
function applyAdvance(ctx,rows,supports) {
  const {i,rates}=ctx,map=new Map();
  for(const payment of i.pesinOdemeler) {
    const key=norm(payment.davali),principal=positive(payment.tutar);if(!key||!(principal>0))continue;
    const f=i.yasalFaizUygula && payment.tarih!==null?interest(principal,payment.tarih,i.hesapTarihi,rates):0,total=r2(principal+f);let recipient=payment.kime.trim();
    if(!supports.length)recipient=recipient||'Mağdur';else if(!recipient)recipient='Genel';else{const s=supports.find(s=>norm(s.ad.trim()||s.tip)===norm(recipient) || norm(s.tip)===norm(recipient));if(s)recipient=s.ad.trim()||s.tip;}
    const a=map.get(key)||{anaPara:0,faiz:0,toplam:0,recipients:{},labels:[]};a.anaPara=r2(a.anaPara+principal);a.faiz=r2(a.faiz+f);a.toplam=r2(a.toplam+total);a.recipients[recipient]=r2((a.recipients[recipient]||0)+total);if(!a.labels.includes(recipient))a.labels.push(recipient);map.set(key,a);
  }
  return rows.map(row=>{
    const a=map.get(norm(row.ad));if(!a || !(a.toplam>0))return row;
    const updated={...row,pesinMahsupAciklama:`Peşin ödeme (faiz dahil, %${fmt(a.anaPara>0?r2(a.faiz/a.anaPara*100):0)})${a.labels.length?' — '+a.labels.join(', '):''}`,pesinMahsupToplam:r2(a.toplam),tenzilSonrasiAciklama:'Ödenecek tazminat'};
    if(!row.destekPaylari.length)return {...updated,pesinMahsupDestekPaylari:[],tenzilSonrasiToplam:r2(positive(row.anaPara-a.toplam)),tenzilSonrasiDestekPaylari:[]};
    const gross=Math.max(.0001,sum(row.destekPaylari.map(p=>positive(p.anaPara)))),matched=Object.fromEntries(row.destekPaylari.map(p=>[p.ad,r2(a.recipients[p.ad]||0)])),unmatched=r2(positive(a.toplam-sum(Object.values(matched))));let distributed=0;
    const remaining=row.destekPaylari.map((p,index)=>{let share;if(index===row.destekPaylari.length-1)share=r2(positive(unmatched-distributed));else{share=r2(unmatched*(positive(p.anaPara)/gross));distributed=r2(distributed+share);}const amount=r2(positive(p.anaPara-Math.min(positive(p.anaPara),r2((matched[p.ad]||0)+share))));return {ad:p.ad,anaPara:amount,faiz:0,toplam:amount};});
    return {...updated,pesinMahsupDestekPaylari:row.destekPaylari.map(p=>({ad:p.ad,anaPara:matched[p.ad]||0,faiz:0,toplam:matched[p.ad]||0})),tenzilSonrasiToplam:r2(sum(remaining.map(p=>p.anaPara))),tenzilSonrasiDestekPaylari:remaining};
  });
}
function parameters(ctx,retirement,end,exclusions) {const {i,net,brut}=ctx,dykt=i.calculationMode==='dykt';return {kaza:iso(i.kazaTarihi),hesap:iso(i.hesapTarihi),dogum:iso(i.dogumTarihi),courtName:i.courtName,fileNumber:i.fileNumber,davaKonusu:i.davaKonusu,sgkSigortasiz5510_23:i.sgkSigortasiz5510_23,davaci:i.davaci,magdur:i.magdur,davaliAdlari:i.davalilar.map(d=>d.name),emeklilik:iso(retirement),omurSonu:iso(end),geciciBaslangic:dykt?undefined:iso(i.geciciBaslangic),geciciBitis:dykt?undefined:iso(i.geciciBitis),surekliBaslangic:dykt?iso(i.kazaTarihi):iso(i.surekliBaslangic),surekliMaluliyet:dykt?100:i.surekliMaluliyetOrani,eksiltme:i.eksiltmeYontemi,eksiltmeOrani:i.eksiltmeOrani,artisOrani:i.artisOrani,progresifRantIskontoOrani:i.progresifRantIskontoOrani,endeks:i.endeksSecimi,netAsgariHesap:r2(net),brutAsgariHesap:r2(brut),ggo:r2(i.ggoDegeri),trafikSigortaTavani:i.trafikSigortaTavani??undefined,askerlikTenzilBaslangic:iso(exclusions[0]?.start),askerlikTenzilBitis:iso(exclusions[0]?.end)};}
export function calculateActuarial(raw,data) {
  if(usesTBK55(raw))return calculateTBK55(raw,data,calculateLegacy);
  return calculateLegacy(raw,data);
}
function calculateLegacy(raw,data) {
  const i=prepare(raw),wages=loadWages(data);if(!wages.length)throw new Error('Asgari ücret tablosu boş.');
  const rates=data.yasalFaiz.map(r=>({start:day(r.baslangic),end:day(r.bitis),oran:positive(num(r.oran))})).filter(r=>r.start!==null).sort((a,b)=>a.start-b.start),net=wage(i.hesapTarihi,wages),brut=wage(i.hesapTarihi,wages,true),ctx={i,wages,rates,net,brut,data};
  let retirement=addYears(i.dogumTarihi,i.emeklilikYasi);if(i.calisma60Var)retirement=Math.max(retirement,addYears(i.dogumTarihi,65));if(i.calisma65Var)retirement=addYears(i.kazaTarihi,2);
  const accidentAge=age(i.dogumTarihi,i.kazaTarihi),ex=life(data,i.hayatTablosu,accidentAge),end=addYears(i.dogumTarihi,i.omurYontemi==='Tam Ömür'||ex===undefined?100:accidentAge+Math.ceil(positive(ex))),exclusions=military(i);
  if(i.calculationMode==='dykt')return calculateDYKT(ctx,retirement,end,exclusions);
  const tables=[],push=o=>{const table=buildTable(ctx,o);if(table)tables.push(table);},temporary=i.geciciBaslangic??i.kazaTarihi,permanent=i.surekliBaslangic??(i.geciciBitis!==null?i.geciciBitis+1:i.kazaTarihi+1),activeEnd=Math.min(retirement,end);
  if(i.geciciIGVar && i.geciciBitis!==null)push({label:'Geçici İş Göremezlik',type:'gecici_ig',from:temporary,to:i.geciciBitis,disability:100,active:true,future:false});
  if(i.bakiciVar)push({label:'Geçici Bakıcı Gideri',type:'bakici',from:i.bakiciBaslangic??temporary,to:i.bakiciBitis??i.geciciBitis??i.hesapTarihi,disability:100,active:true,future:false,bakici:true,useBrut:i.bakiciBelgeli,override:i.bakiciTutar>0?i.bakiciTutar:undefined});
  if(i.surekliIGVar && i.surekliMaluliyetOrani>0 && permanent<activeEnd) {
    const common={disability:i.surekliMaluliyetOrani};
    push({...common,label:'Sürekli İG — İşlemiş Aktif Dönem',type:'surekli_islemis_aktif',from:permanent,to:Math.min(i.hesapTarihi,activeEnd),active:true,future:false,exclusions});
    push({...common,label:'Sürekli İG — İşleyecek Aktif Dönem',type:'surekli_isleyecek_aktif',from:i.hesapTarihi>=permanent?i.hesapTarihi+1:permanent,to:activeEnd,active:true,future:true,exclusions});
    if(retirement<end){if(retirement<=i.hesapTarihi)push({...common,label:'Sürekli İG — İşlemiş Pasif Dönem',type:'surekli_islemis_pasif',from:retirement,to:Math.min(i.hesapTarihi,end),active:false,future:false});push({...common,label:'Sürekli İG — İşleyecek Pasif Dönem',type:'surekli_isleyecek_pasif',from:i.hesapTarihi>=retirement?i.hesapTarihi+1:retirement,to:end,active:false,future:true});}
  }
  const total=r2(sum(tables.map(t=>t.total))),advance=payment(i.pesinOdemeler,ctx,i.yasalFaizUygula),sgk=r2(sum(i.sgkOdemeler.filter(r=>eligible(r.kime)).map(r=>positive(r.tutar)))),traffic=payment(i.trafikOdemeler,ctx,true),trafficTotal=r2(Math.min(traffic.total,i.trafikSigortaTavani??Infinity)),netTotal=r2(positive(total-sgk-trafficTotal));
  const summary={toplamTazminat:total,pesinBaseTotal:advance.base,pesinFaizTotal:advance.faiz,pesinTotal:advance.total,sgkTotal:sgk,trafikBaseTotal:traffic.base,trafikFaizTotal:traffic.faiz,trafikTotal:trafficTotal,netTazminat:netTotal,...capComparison(ctx,traffic.base,netTotal)};shares(ctx,summary);
  return clean({createdAt:new Date().toISOString(),parameters:parameters(ctx,retirement,end,exclusions),tables,summary});
}
const clean=object=>JSON.parse(JSON.stringify(object));

function tuik(ctx,sex) {const rows=ctx.data.tuikIlkEvlenmeYasi.map(r=>({year:Number(r.yil),value:num(r[sex==='Kadın'?'kadin':'erkek'])})).filter(r=>Number.isInteger(r.year)).sort((a,b)=>a.year-b.year),selected=rows.findLast(r=>r.year<=year(ctx.i.kazaTarihi))||rows[0];return selected?.value>0?selected.value:rows.at(-1)?.value>0?rows.at(-1).value:sex==='Kadın'?25.5:28;}
function supportList(ctx) {
  const {i}=ctx,list=structuredClone(i.destekGorenler);if(norm(i.magdurMedeniHal)!=='bekar')return list;
  const sex=gender(i.magdurCinsiyet,'Erkek'),marriage=addFraction(i.dogumTarihi,tuik(ctx,sex)),child1=addYears(marriage,2),child2=addYears(child1,2);
  const assumed=[{tip:'Dul Eş',ad:'Farazi Dul Eş',dogum:i.dogumTarihi,cinsiyet:sex==='Kadın'?'Erkek':'Kadın',cikisYasi:null,destekBaslangic:Math.max(marriage,i.kazaTarihi)},{tip:'1. Çocuk',ad:'Farazi 1. Çocuk',dogum:child1,cinsiyet:'Erkek',cikisYasi:18,destekBaslangic:Math.max(child1,i.kazaTarihi)},{tip:'2. Çocuk',ad:'Farazi 2. Çocuk',dogum:child2,cinsiyet:'Kadın',cikisYasi:18,destekBaslangic:Math.max(child2,i.kazaTarihi)}];
  for(const item of assumed){item.aktif=true;const index=list.findIndex(s=>norm(s.tip)===norm(item.tip));if(index<0)list.push(item);else{const current=list[index];if(!current.aktif || current.dogum==null)list[index]={...current,aktif:true,tip:current.tip||item.tip,ad:current.ad||item.ad,dogum:item.dogum,cinsiyet:current.cinsiyet||item.cinsiyet,cikisYasi:current.cikisYasi??item.cikisYasi,destekBaslangic:current.destekBaslangic??item.destekBaslangic};}}
  return list;
}
function marriageProbability(rows,sex,at) {
  const entries=rows.filter(r=>norm(r.cocuk_18_alti).includes(sex==='Kadın'?'kadin':'erkek')).map(r=>{const text=norm(r.yas),range=/(\d+)\s*-\s*(\d+)/.exec(text),single=!range?/\d+/.exec(text):null;return {range:range&&+range[2]>=+range[1]?[+range[1],+range[2]]:null,age:single?+single[0]:null,rate:positive(num(r.oran))};});
  const maxAge=Math.max(...entries.map(r=>r.range?r.range[1]:r.age??-Infinity));if(at>maxAge)return 0;
  const range=entries.filter(r=>r.range && at>=r.range[0] && at<=r.range[1]).sort((a,b)=>(a.range[1]-a.range[0])-(b.range[1]-b.range[0]))[0];if(range)return range.rate;
  const exact=entries.find(r=>r.age===at);return exact?.rate??entries.filter(r=>r.age!==null && r.age<=at).sort((a,b)=>b.age-a.age)[0]?.rate??0;
}
function upbringing(ctx) {
  const end=addYears(ctx.i.dogumTarihi,18);if(!ctx.i.yetistirmeGideriVar || ctx.i.kazaTarihi>=end)return 0;
  const periods=split(ctx.i.kazaTarihi,end,ctx.wages,true);return r2(sum(periods.map((p,index)=>r2(r2(r2(wage(midDay(p.start,p.end),ctx.wages,true))*(periods.length>1?.05+.05*index/(periods.length-1):.05))*months(p.start,p.end)))));
}
function calculateDYKT(ctx,retirement,end,exclusions) {
  const {i,data}=ctx;
  const infos=supportList(ctx).filter(s=>s.aktif && norm(s.tip)!=='magdur' && norm(s.ad)!=='magdur' && s.dogum!=null).map(s=>{
    const sex=gender(s.cinsiyet,'Kadın'),at=age(s.dogum,i.kazaTarihi),ex=life(data,tableFor(i.hayatTablosu,sex),at),lifeEnd=addYears(s.dogum,ex===undefined?100:at+Math.ceil(positive(ex))),exit=s.ozelDestektenCikisTarihi??(s.tip.includes('Çocuk')?addYears(s.dogum,Math.max(18,s.cikisYasi??18)):null),start=Math.max(i.kazaTarihi,isParent(s.tip)?(i.yetistirmeGideriVar?Math.max(i.kazaTarihi,addYears(i.dogumTarihi,18)):i.kazaTarihi):(s.destekBaslangic??i.kazaTarihi)),last=Math.min(end,lifeEnd,exit??Infinity),widow=norm(s.tip)==='dul es',tip=widow?'Dul Eş':s.tip.includes('Çocuk')?s.tip:norm(s.tip).includes('anne')?'Anne':norm(s.tip).includes('baba')?'Baba':s.tip;
    return {...s,cinsiyet:sex,tipLabel:tip,ad:s.ad.trim()||s.tip,start,end:last,exit,pay:widow?2:1,widow,key:norm(tip)+'|'+norm(s.ad.trim()||s.tip)+'|'+iso(s.dogum)};
  });
  if(!infos.length)throw new Error('Aktif destek gören ve doğum tarihi gerekli.');
  const pay=(at,index)=>infos[index].pay/(2+sum(infos.filter(s=>s.start<=at && s.end>at).map(s=>s.pay))),tables=[],supportMap=new Map();let total=0;
  for(let index=0;index<infos.length;index++){
    const info=infos[index];if(!(info.end>info.start))continue;
    const minors=infos.filter(s=>norm(s.tip).includes('cocuk') && s.start<=info.start && s.end>info.start && (info.start-s.dogum)/365.25>=0 && (info.start-s.dogum)/365.25<18).length;
    const marriage=info.widow?positive(marriageProbability(data.dulEsEvlenme,info.cinsiyet,age(info.dogum,info.start))-minors*5)/100:0,extra=infos.filter((_,other)=>index!==other).flatMap(s=>[s.start,s.end,...(s.exit!==null?[s.exit]:[])]),common={dykt:true,born:info.dogum,payFn:at=>pay(at,index),marriage,extra,exclusions},activeEnd=Math.min(retirement,info.end);let supportTotal=0;
    const push=o=>{const t=buildTable(ctx,{...common,...o});if(t){tables.push(t);supportTotal+=t.total;}};
    if(info.start<i.hesapTarihi && info.start<activeEnd)push({label:info.ad+' — İşlemiş Aktif',type:'dykt_islemis_aktif',from:info.start,to:Math.min(i.hesapTarihi,activeEnd),active:true,future:false});
    push({label:info.ad+' — İşleyecek Aktif',type:'dykt_isleyecek_aktif',from:i.hesapTarihi>=info.start?i.hesapTarihi+1:info.start,to:activeEnd,active:true,future:true});
    const passiveStart=Math.max(retirement,info.start);
    if(passiveStart<=i.hesapTarihi && passiveStart<info.end)push({label:info.ad+' — İşlemiş Pasif',type:'dykt_islemis_pasif',from:passiveStart,to:Math.min(i.hesapTarihi,info.end),active:false,future:false});
    push({label:info.ad+' — İşleyecek Pasif',type:'dykt_isleyecek_pasif',from:i.hesapTarihi>=passiveStart?i.hesapTarihi+1:passiveStart,to:info.end,active:false,future:true});
    supportTotal=r2(supportTotal);total+=supportTotal;
    supportMap.set(info.key,{tip:info.tipLabel,ad:info.ad,destekBaslangic:iso(info.start),destekSonu:iso(info.end),destektenCikis:iso(info.exit),toplam:supportTotal,yetistirme:0,pesin:0,pesinFaiz:0,sgk:0,trafik:0,trafikFaiz:0,net:supportTotal,kusurlu:supportTotal});
  }
  total=r2(total);
  const upbringingTotal=upbringing(ctx),upbringingMap={};
  if(upbringingTotal>0){const mother=infos.find(s=>norm(s.tip).includes('anne')||norm(s.ad).includes('anne')),father=infos.find(s=>norm(s.tip).includes('baba')||norm(s.ad).includes('baba'));if(mother&&father){upbringingMap[mother.key]=r2(upbringingTotal/2);upbringingMap[father.key]=r2(upbringingTotal-upbringingMap[mother.key]);}else if(mother||father)upbringingMap[(mother||father).key]=r2(upbringingTotal);else upbringingMap.Genel=r2(upbringingTotal);}
  const maps={pesin:{},pesinFaiz:{},sgk:{},trafik:{},trafikFaiz:{}},paymentTotals={pesinBaseTotal:0,pesinFaizTotal:0,pesinTotal:0,sgkTotal:0,trafikBaseTotal:0,trafikFaizTotal:0,trafikTotal:0};
  for(const [key,rows] of [['pesin',i.pesinOdemeler],['sgk',i.sgkOdemeler],['trafik',i.trafikOdemeler]])for(const payment of rows){if(eligible(payment.kime) || !(payment.tutar>0))continue;const value=positive(payment.tutar),f=key!=='sgk'&&(key==='trafik'||i.yasalFaizUygula)&&payment.tarih!==null?interest(value,payment.tarih,i.hesapTarihi,ctx.rates):0,amount=key==='sgk'?value:r2(value+f),recipient=payment.kime.trim()||'Genel';maps[key][recipient]=(maps[key][recipient]||0)+amount;if(key!=='sgk'){maps[key+'Faiz'][recipient]=(maps[key+'Faiz'][recipient]||0)+f;paymentTotals[key+'BaseTotal']+=value;paymentTotals[key+'FaizTotal']+=f;}paymentTotals[key+'Total']+=amount;}
  for(const key of Object.keys(paymentTotals))paymentTotals[key]=r2(paymentTotals[key]);paymentTotals.trafikTotal=r2(Math.min(paymentTotals.trafikTotal,i.trafikSigortaTavani??Infinity));
  const deduction=(map,s)=>{const direct=Object.entries(map).find(([key])=>norm(key)===norm(s.tip)||norm(key)===norm(s.ad));return direct?r2(direct[1]):map.Genel&&total>0?r2(map.Genel*(s.toplam/total)):0;};
  const fault=clamp((100-clamp(i.magdurKusur,0,100)/(i.sgkSigortasiz5510_23&&norm(i.davaKonusu).includes('rucu')?2:1))/100,0,1);let net=0;
  for(const info of infos){const s=supportMap.get(info.key);if(!s)continue;s.yetistirme=upbringingMap[info.key]!==undefined?r2(upbringingMap[info.key]):upbringingMap.Genel&&total>0?r2(upbringingMap.Genel*(s.toplam/total)):0;for(const key of Object.keys(maps))s[key]=deduction(maps[key],s);s.net=positive(r2(s.toplam-s.yetistirme-s.sgk-s.trafik));s.kusurlu=r2(s.net*fault);net+=s.net;}
  net=r2(net);const supports=infos.map(s=>supportMap.get(s.key)).filter(Boolean),summary={toplamTazminat:total,...paymentTotals,netTazminat:net,yetistirmeTenziliTotal:r2(upbringingTotal),dyktDestekDagilimi:supports,...capComparison(ctx,paymentTotals.trafikBaseTotal,net)};shares(ctx,summary,supports);
  return clean({createdAt:new Date().toISOString(),parameters:parameters(ctx,retirement,end,exclusions),tables,summary});
}
