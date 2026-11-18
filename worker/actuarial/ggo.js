// Direct port of GGOCalculatorSheet.buildGgoMonthData / calculateGrossFromNet.
import {r2,num,day,loadWages,wage} from './math.js';
function context(data,year) {
  const wages=loadWages(data),tax=data.gelirVergisiDilimleri.filter(r=>Number(r.yil)===year).map(r=>({limit:r.matrah==='∞'?Infinity:num(r.matrah),rate:num(r.oran)/100})).sort((a,b)=>a.limit-b.limit);
  if(!tax.length)throw new Error('Seçili yılın gelir vergisi dilimleri eksik.');
  const agi=data.agiTablosu.filter(r=>Number(r.yil)===year).sort((a,b)=>(a.donem.includes('Mayıs')?2:1)-(b.donem.includes('Mayıs')?2:1)).at(-1)||{};
  const stamp=data.damgaVergisi.find(r=>year>=Number(r.baslangic_yili) && year<=Number(r.bitis_yili));if(!stamp)throw new Error('Seçili yılın damga vergisi oranı eksik.');
  const meal=data.gelirVergisiYemekIstisnasi.map(r=>({start:day(r.baslangic),end:day(r.bitis),aylik:num(r.aylik)}));
  const minimums=Array.from({length:12},(_,m)=>{const at=day(`${year}-${String(m+1).padStart(2,'0')}-15`),b=wage(at,wages,true),n=wage(at,wages),mealGV=meal.find(r=>at>=r.start && at<=r.end)?.aylik??null,mealSGK=r2(b/30*(at<day('2022-12-01')?.06:.2365)*26);return {b,n,mealGV,mealSGK};});
  return {tax,agi,stamp:num(stamp.oran_binde)/1000,minimums};
}
function calculate(request,c,count=12) {
  const {year,brut,medeni,nakdi,yemek,ayni,minimum}=request,useExemption=year>=2022;
  const agiValue=status=>r2(num(c.agi[status==='bekar'?'bekar':status==='evli'?'evli_es_c_yok':'evli_es_c_yok_'+status.split('_')[1]]??c.agi.bekar));
  let cum=0,minimumCum=0;const rows=[];
  const taxOn=(amount,previous)=>{let remaining=amount,used=previous,total=0;for(const bracket of c.tax){if(remaining<=0)break;const space=bracket.limit-used;if(space<=0)continue;const taxable=Math.min(remaining,space);total+=taxable*bracket.rate;remaining-=taxable;used+=taxable;}return r2(total);};
  for(let m=0;m<count;m++) {
    const base=c.minimums[m],minGross=positive(r2(base.b)),singleNet=positive(r2(base.n)),familyDifference=useExemption?0:positive(r2(agiValue(medeni)-agiValue('bekar'))),targetNet=useExemption?singleNet:positive(r2(singleNet+familyDifference));
    const A=minimum?minGross:brut,B=minimum?0:(nakdi[m]??0),B1=minimum?0:(yemek[m]??0),C=minimum?0:(ayni[m]??0),D=A+B+B1+C;
    let E=A+B+B1;if(B1>0)E-=Math.min(B1,base.mealSGK);E=r2(E);
    const F=r2(E*.14),G=r2(E*.01);let H=D-(F+G);if(B1>0 && base.mealGV!==null)H-=Math.min(B1,base.mealGV);H=r2(H);
    cum+=H;const I=r2(cum),J=taxOn(H,I-H);let J1=J;
    if(useExemption){const minimumTaxable=r2(base.b-base.b*.14-base.b*.01),prev=minimumCum;minimumCum+=minimumTaxable;J1=positive(r2(J-taxOn(minimumTaxable,prev)));}
    let K=useExemption?positive(r2(D*c.stamp-base.b*c.stamp)):r2(D*c.stamp),LBase=useExemption?0:agiValue(medeni),LIlave=0,L=LBase,M=r2((D-C)-(F+G+J1+K)+L);
    if(minimum){if(useExemption){J1=0;K=0;LBase=0;LIlave=0;L=0;M=r2(positive(targetNet));}else{const target=r2(positive(targetNet));if(M<target)LIlave=r2(target-M);L=r2(LBase+LIlave);M=r2((D-C)-(F+G+J1+K)+L);if(Math.abs(M-target)>.01){LIlave=r2(positive(LIlave+(target-M)));L=r2(LBase+LIlave);M=r2((D-C)-(F+G+J1+K)+L);}M=r2(target);}}
    const N=minimum?r2(targetNet):base.n,O=N>0?M/N:0;
    rows.push({A:r2(A),B:r2(B),B1:r2(B1),C:r2(C),D:r2(D),E:r2(E),F:r2(F),G:r2(G),H:r2(H),I:r2(I),J:r2(J),J1:r2(J1),K:r2(K),L:r2(L),LBase:r2(LBase),LIlave:r2(LIlave),M:r2(M),N:r2(N),O,brutAsgari:r2(base.b),netAsgari:r2(N),minimumMode:minimum});
  }
  return rows;
}
const positive=x=>Math.max(0,x);
export function calculateGGO(request,data) {
  const c=context(data,request.year);
  if(request.targetNet==null)return calculate(request,c);
  const month=Math.max(0,Math.min(11,request.targetMonth??0)),target=request.targetNet;
  const netFromGross=brut=>calculate({...request,brut,minimum:false,nakdi:[],yemek:[],ayni:[]},c,month+1)[month].M;
  let lo=0,hi=Math.max(target*3,c.minimums[month].b*2,1000),hiNet=netFromGross(hi),count=0;
  while(hiNet<target && count<30){hi*=1.5;hiNet=netFromGross(hi);count++;}
  for(let step=0;step<120;step++){const mid=(lo+hi)/2,net=netFromGross(mid);if(Math.abs(net-target)<=.005)break;if(net<target)lo=mid;else hi=mid;}
  let gross=r2((lo+hi)/2),net=r2(netFromGross(gross));
  if(net!==r2(target)){let bestGross=gross,bestNet=net,bestDifference=Math.abs(net-r2(target));for(let step=1;step<=500;step++)for(const candidate of [r2(gross+step*.01),r2(positive(gross-step*.01))]){const candidateNet=r2(netFromGross(candidate)),difference=Math.abs(candidateNet-r2(target));if(difference<bestDifference){bestDifference=difference;bestGross=candidate;bestNet=candidateNet;}}gross=bestGross;net=bestNet;}
  return {brut:gross,net};
}
