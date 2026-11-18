import {day,iso,interest,num,norm,r2,sum} from './math.js';
export const TBK55_EFFECTIVE_DATE='2026-07-31';
// 7589 geçici 1/9: the event date, not the calculation/decision date, selects the law.
export const usesTBK55=i=>i.kazaTarihi>=TBK55_EFFECTIVE_DATE && !norm(i.davaKonusu).includes('rucu');
const positive=v=>Math.max(0,v);
const general=v=>!String(v||'').trim()||['genel','magdur'].includes(norm(v));
const cleanInput=i=>({...structuredClone(i),yasalFaizUygula:false,pesinOdemeler:[],trafikOdemeler:[],trafikSigortaTavani:null});
function components(result) {
  const supports=result.summary.dyktDestekDagilimi;
  const people=supports?.length?supports.map(s=>({ad:s.ad,tip:s.tip,net:s.net,total:s.toplam})): [{ad:'Mağdur',tip:'Mağdur',net:result.summary.netTazminat,total:result.summary.toplamTazminat}];
  return people.map(p=>{
    const tables=result.tables.filter(t=>!supports?.length||t.title.slice(0,t.title.lastIndexOf(' — '))===p.ad);
    const knownGross=r2(sum(tables.filter(t=>!t.isFuture).map(t=>t.total)));
    const known=r2(p.total>0?p.net*knownGross/p.total:0);
    return {...p,known,unknown:r2(positive(p.net-known))};
  });
}
// Valuation remains the ported Swift method; this layer changes interest and payments only.
export function calculateTBK55(input,data,legacy) {
  const baseInput=cleanInput(input),result=legacy(baseInput,data),people=components(result);
  const rates=data.yasalFaiz.map(r=>({start:day(r.baslangic),end:day(r.bitis),oran:positive(num(r.oran))})).filter(r=>r.start!==null).sort((a,b)=>a.start-b.start);
  const defendants=input.davalilar.filter(d=>d.kusur>0);
  const pots=people.flatMap(p=>(defendants.length?defendants:[{name:'Tazminat alacağı',type:'Alacak',kusur:100-input.magdurKusur}]).map(d=>{
    const ratio=d.kusur/100;
    return {ad:p.ad,tip:p.tip,davali:d.name,tur:d.type,kusur:d.kusur,ratio,known:r2(p.known*ratio),unknown:r2(p.unknown*ratio),deduction:0};
  }));
  const valuations=new Map(),audits=[];
  const beforePayments=r2(sum(pots.map(p=>p.known+p.unknown)));
  const payments=[...input.pesinOdemeler.map(p=>({...p,source:'Peşin ödeme'})),...input.trafikOdemeler.map(p=>({...p,source:'Trafik ödemesi'}))].filter(p=>p.tutar>0).sort((a,b)=>String(a.tarih||'').localeCompare(String(b.tarih||'')));
  for(const payment of payments) {
    if(payment.ifaAmacli===false){audits.push({kaynak:payment.source,tarih:payment.tarih,davali:payment.davali,alici:payment.kime,tutar:payment.tutar,yontem:'İfa amacı taşımıyor — mahsup edilmedi',mahsup:0});continue;}
    const target=pots.filter(p=>(!payment.davali.trim()||norm(p.davali)===norm(payment.davali))&&(general(payment.kime)||norm(p.ad)===norm(payment.kime)||norm(p.tip)===norm(payment.kime)));
    if(!target.length)throw new Error('Ödeme yapan davalı ve alıcı hesap dağılımıyla eşleşmiyor.');
    const proportional=input.tahkikatBaslamadi===true||payment.tarih<input.tahkikatBaslangic;
    let denominator=null,ratio=null,deduction=0;
    if(proportional){
      if(payment.odemeTarihiTazminati==null&&!valuations.has(payment.tarih))valuations.set(payment.tarih,components(legacy({...baseInput,hesapTarihi:payment.tarih,sgkOdemeler:baseInput.sgkOdemeler.filter(p=>!p.tarih||p.tarih<=payment.tarih),geciciBitis:baseInput.geciciBitis&&baseInput.geciciBitis>payment.tarih?payment.tarih:baseInput.geciciBitis,bakiciBitis:baseInput.bakiciBitis&&baseInput.bakiciBitis>payment.tarih?payment.tarih:baseInput.bakiciBitis},data)));
      const historical=valuations.get(payment.tarih)||[];
      // An unnamed payer means payment against the whole victim/support claim.
      denominator=r2(payment.davali.trim()?sum(target.map(p=>(historical.find(h=>norm(h.ad)===norm(p.ad))?.net||0)*p.ratio)):sum(historical.filter(h=>general(payment.kime)||norm(h.ad)===norm(payment.kime)||norm(h.tip)===norm(payment.kime)).map(h=>h.net))*(100-input.magdurKusur)/100);
      if(payment.odemeTarihiTazminati!=null)denominator=payment.odemeTarihiTazminati;
      if(!(denominator>0))throw new Error('Ödeme tarihindeki tazminat sıfır. Ödeme tarihindeki sorumluluk tutarını kontrol edin.');
      ratio=payment.tutar/denominator;
      for(const p of target){
        // Sum paid fractions against the original valuation; cap at the still unpaid part.
        const original=r2((people.find(h=>h.ad===p.ad)?.net||0)*p.ratio),amount=r2(Math.min(p.known+p.unknown,original*ratio));
        const known=r2(p.known+p.unknown>0?amount*p.known/(p.known+p.unknown):0);
        p.known=r2(positive(p.known-known));p.unknown=r2(positive(p.unknown-(amount-known)));p.deduction=r2(p.deduction+amount);deduction=r2(deduction+amount);
      }
    }else{
      const available=r2(sum(target.map(p=>p.known+p.unknown))),amount=Math.min(payment.tutar,available);let distributed=0;
      target.forEach((p,index)=>{const part=index===target.length-1?r2(amount-distributed):r2(available>0?amount*(p.known+p.unknown)/available:0);distributed=r2(distributed+part);const k=r2(p.known+p.unknown>0?part*p.known/(p.known+p.unknown):0);p.known=r2(positive(p.known-k));p.unknown=r2(positive(p.unknown-(part-k)));p.deduction=r2(p.deduction+part);});deduction=r2(amount);
    }
    audits.push({kaynak:payment.source,tarih:payment.tarih,davali:payment.davali,alici:payment.kime,tutar:payment.tutar,yontem:proportional?'TBK 55 — oransal mahsup':'Tahkikat başladıktan sonra — nominal mahsup',odemeTarihiTazminati:denominator,oran:ratio,mahsup:deduction,degerleme:payment.odemeTarihiTazminati!=null?'Dosyada belirlenen sorumluluk tutarı':'Ödeme gününe göre yeniden hesaplanan sorumluluk tutarı'});
  }
  const endpoint=day(input.hesapTarihi),accident=day(input.kazaTarihi),decision=day(input.kararTarihi);
  for(const p of pots){p.knownInterest=input.yasalFaizUygula?interest(p.known,accident,endpoint,rates):0;p.unknownInterest=input.yasalFaizUygula&&decision!==null?interest(p.unknown,decision,endpoint,rates):0;}
  const rows=[...new Set(pots.map(p=>p.davali))].map(name=>{
    const group=pots.filter(p=>p.davali===name),principal=r2(sum(group.map(p=>p.known+p.unknown))),faiz=r2(sum(group.map(p=>p.knownInterest+p.unknownInterest)));
    return {ad:name,tur:group[0].tur,kusur:group[0].kusur,anaPara:principal,faiz,toplam:r2(principal+faiz),aciklama:'TBK 55: bilinen kazanca olay, bilinmeyen kazanca karar tarihinden faiz',tbk55MahsupToplam:r2(sum(group.map(p=>p.deduction))),destekPaylari:group.map(p=>({ad:p.ad,anaPara:r2(p.known+p.unknown),faiz:r2(p.knownInterest+p.unknownInterest),toplam:r2(p.known+p.unknown+p.knownInterest+p.unknownInterest)}))};
  });
  const principal=r2(sum(rows.map(r=>r.anaPara))),faiz=r2(sum(rows.map(r=>r.faiz))),due=r2(principal+faiz),cap=input.trafikSigortaTavani;
  const paidTraffic=sum(payments.filter(p=>p.source==='Trafik ödemesi'&&p.ifaAmacli!==false).map(p=>p.tutar));
  // Insurance limit is displayed independently; it does not inflate the damages principal.
  const remainingCap=cap>0?r2(positive(cap-paidTraffic)):null;
  const capKnown=r2(principal>0?(remainingCap??0)*sum(pots.map(p=>p.known))/principal:0),capUnknown=r2(positive((remainingCap??0)-capKnown));
  const capInterest=input.yasalFaizUygula&&remainingCap!==null?r2(interest(capKnown,accident,endpoint,rates)+(decision!==null?interest(capUnknown,decision,endpoint,rates):0)):0;
  const capTotal=remainingCap===null?null:r2(remainingCap+capInterest);
  const s=result.summary;
  s.tbk55MahsupOncesiAnaPara=beforePayments;
  for(const [source,key] of [['Peşin ödeme','pesin'],['Trafik ödemesi','trafik']]){s[key+'BaseTotal']=r2(sum(payments.filter(p=>p.source===source&&p.ifaAmacli!==false).map(p=>p.tutar)));s[key+'FaizTotal']=0;s[key+'Total']=r2(sum(audits.filter(a=>a.kaynak===source).map(a=>a.mahsup)));}
  Object.assign(s,{netTazminat:principal,rucuEdilebilirTutar:principal,davaliDagilimi:defendants.length?rows:[],guncelNetTazminatFaiz:faiz,guncelNetTazminatToplam:due,davalilardanTalepEdilecekToplam:capTotal===null?due:r2(Math.min(due,capTotal)),davaliTalepEsasi:capTotal!==null&&capTotal<due?'Sigorta Tavanı':'Tazminat',trafikKalanTavanAnaPara:remainingCap??0,trafikKalanTavanFaiz:capInterest,trafikKalanTavanToplam:capTotal??0,tbk55BilinenAnaPara:r2(sum(pots.map(p=>p.known))),tbk55BilinmeyenAnaPara:r2(sum(pots.map(p=>p.unknown))),tbk55BilinenFaiz:r2(sum(pots.map(p=>p.knownInterest))),tbk55BilinmeyenFaiz:r2(sum(pots.map(p=>p.unknownInterest))),tbk55MahsupToplam:r2(sum(pots.map(p=>p.deduction))),tbk55MahsupDetay:audits,tbk55FaizDetay:pots.map(p=>({ad:p.ad,davali:p.davali,bilinenAnaPara:p.known,bilinmeyenAnaPara:p.unknown,bilinenBaslangic:iso(accident),bilinmeyenBaslangic:iso(decision),bilinenFaiz:p.knownInterest,bilinmeyenFaiz:p.unknownInterest}))});
  if(s.dyktDestekDagilimi)for(const person of s.dyktDestekDagilimi){const group=pots.filter(p=>p.ad===person.ad);person.net=r2(sum(group.map(p=>p.known+p.unknown)));person.kusurlu=person.net;person.tbk55Mahsup=r2(sum(group.map(p=>p.deduction)));person.tbk55Faiz=r2(sum(group.map(p=>p.knownInterest+p.unknownInterest)));}
  result.parameters={...result.parameters,trafikSigortaTavani:cap,tbk55Uygulama:'7589 m.18 ve geçici 1/9 — yeni olay',kararTarihi:input.kararTarihi||null,tahkikatBaslangic:input.tahkikatBaslangic||null,tahkikatBaslamadi:input.tahkikatBaslamadi===true};
  return result;
}
