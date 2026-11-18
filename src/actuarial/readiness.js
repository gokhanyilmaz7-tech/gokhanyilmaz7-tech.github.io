import {validateInput} from '../../worker/actuarial/input.js';
import {usesTBK55} from '../../worker/actuarial/tbk55.js';
export function preparationChecks(i,data) {
  const checks=[],add=(title,active,missing,target)=>checks.push({title,state:!active?'Pasif':missing.length?'Eksik':'Dolu',missing,target});
  const missing=(keys)=>keys.filter(k=>i[k]==null||i[k]==='');
  add('Dosya ve kişi',true,missing(['courtName','fileNumber','davaci','magdur','dogumTarihi','kazaTarihi','hesapTarihi']),{section:0});
  add('Yöntem ve gelir',true,missing(['hayatTablosu','emeklilikYasi','ggoDegeri','ucretTipi','eksiltmeYontemi']),{section:1});
  add('Davalılar',true,i.davalilar.length&&i.davalilar.every(d=>d.name.trim()&&d.kusur>0)?[]:['davalilar'],{rows:'davalilar'});
  add('Geçici iş göremezlik',i.calculationMode==='igt'&&i.geciciIGVar,missing(['geciciBaslangic','geciciBitis']),{section:2});
  add('Sürekli iş göremezlik',i.calculationMode==='igt'&&i.surekliIGVar,i.surekliMaluliyetOrani>0?[]:['surekliMaluliyetOrani'],{section:2});
  add('Bakıcı gideri',i.calculationMode==='igt'&&i.bakiciVar,missing(['bakiciBaslangic','bakiciBitis']).concat(i.bakiciBelgeli&&!(i.bakiciTutar>0)?['bakiciTutar']:[]),{section:2});
  const active=i.destekGorenler.filter(s=>s.aktif);
  add('Destek görenler',i.calculationMode==='dykt',active.length&&active.every(s=>s.ad.trim()&&(s.dogum||i.magdurMedeniHal==='Bekâr'))?[]:['destekGorenler'],{rows:'destekGorenler'});
  for(const [key,title] of [['pesinOdemeler','Peşin ödemeler'],['sgkOdemeler','SGK / PSD'],['trafikOdemeler','Trafik ödemeleri'],['bordroluUcretler','Bordro dönemleri']]) {
    const rows=i[key],enabled=key==='bordroluUcretler'?i.ucretTipi==='Bordrolu Ücret':rows.length>0;
    const complete=rows.length&&rows.every(r=>key==='bordroluUcretler'?r.baslangic&&r.bitis&&r.netUcret>0:r.tutar>0&&(key==='sgkOdemeler'||r.tarih));
    add(title,enabled,complete?[]:[key],{rows:key});
  }
  const newLaw=usesTBK55(i),payments=[...i.pesinOdemeler,...i.trafikOdemeler].some(p=>p.tutar>0&&p.ifaAmacli!==false);
  add('TBK 55 tarihleri',newLaw,newLaw&&payments&&!i.tahkikatBaslamadi&&!i.tahkikatBaslangic?['tahkikatBaslangic']:[],{section:4});
  add('Teknik veriler',true,['asgariUcret','yasamTablolari','yasalFaiz'].filter(k=>!data[k]?.length),{data:true});
  let validationError='';try{validateInput({input:i},data);}catch(e){validationError=e.message;}
  return {checks,validationError,newLaw,decisionPending:newLaw&&!i.kararTarihi};
}
