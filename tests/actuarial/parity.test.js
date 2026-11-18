import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {calculateActuarial} from '../../worker/actuarial/engine.js';
import {calculateGGO} from '../../worker/actuarial/ggo.js';
import {defaults} from '../../src/actuarial/fields.js';
import baseline from '../../worker/actuarial/baseline.json' with {type:'json'};
const data=baseline.data;
const reference=body=>JSON.parse(execFileSync(new URL('../../actuarial-service/bin/actuarial-engine',import.meta.url),{input:JSON.stringify({...body,data}),timeout:60000,maxBuffer:5000000}));
const dateFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'});
function normalize(value){if(Array.isArray(value))return value.map(normalize);if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!['id','createdAt'].includes(k)).map(([k,v])=>[k,normalize(v)]));if(typeof value==='string' && /^\d{4}-\d{2}-\d{2}T/.test(value)){const p=Object.fromEntries(dateFormatter.formatToParts(new Date(value)).map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}`;}return value;}
function compare(actual,expected,path='root') {
  if(typeof actual==='number' && typeof expected==='number' && /(?:iskontoKatsayi|\.O)$/.test(path)){assert.ok(Math.abs(actual-expected)<1e-12,`${path}: ${actual} != ${expected}`);return;}
  if(actual && expected && typeof actual==='object' && typeof expected==='object'){
    assert.deepEqual(Object.keys(actual).sort(),Object.keys(expected).sort(),path+' keys');
    for(const key of Object.keys(expected))compare(actual[key],expected[key],path+'.'+key);return;
  }
  assert.equal(actual,expected,path);
}
const base={...defaults,dogumTarihi:'1990-05-17',kazaTarihi:'2021-07-22',hesapTarihi:'2026-10-03',magdur:'Referans kişi',ggoDegeri:1.75,magdurKusur:25,davalilar:[{name:'İşveren A',type:'İşveren',kusur:50},{name:'Kişi B',type:'3. Kişi',kusur:25}]};
const support=(tip,ad,dogum,cinsiyet='Kadın',extra={})=>({tip,ad,dogum,cinsiyet,aktif:true,cikisYasi:null,destekBaslangic:null,...extra});
const payment=(tutar,kime='Mağdur',davali='İşveren A',tarih='2023-06-17')=>({tutar,kime,davali,tarih});
const married={calculationMode:'dykt',destekGorenler:[support('Dul Eş','Eş','1991-06-21'),support('1. Çocuk','Çocuk','2015-12-28','Erkek',{cikisYasi:25}),support('Anne','Anne','1965-04-16'),support('Baba','Baba','1963-09-27','Erkek')]};
const cases=[
 ['İGT progresif rant',{}],
 ['İGT teknik faiz',{eksiltmeYontemi:'Teknik Faiz',eksiltmeOrani:1.65}],
 ['Farklı PR artış ve iskonto',{artisOrani:7.5,progresifRantIskontoOrani:4.75}],
 ['Geçici IG ve belgeli bakıcı',{geciciIGVar:true,geciciBaslangic:'2021-07-22',geciciBitis:'2022-02-28',bakiciVar:true,bakiciBelgeli:true,bakiciBaslangic:'2021-07-22',bakiciBitis:'2022-02-28',bakiciTutar:15000}],
 ['Peşin ödeme ve trafik tavanı',{pesinOdemeler:[payment(50000)],sgkOdemeler:[payment(80000)],trafikOdemeler:[payment(100000)],trafikSigortaTavani:250000,davaKonusu:'Trafik'}],
 ['Faiz kapalı trafik ödemesi',{yasalFaizUygula:false,trafikOdemeler:[payment(100000)],trafikSigortaTavani:500000}],
 ['SGK rücu ve hakkaniyet',{davaKonusu:'Rücu',sgkSigortasiz5510_23:true,magdurKusur:60,sgkOdemeler:[payment(1200000)],pesinOdemeler:[payment(50000)]}],
 ['Bordro dönemleri',{ucretTipi:'Bordrolu Ücret',bordroluUcretler:[{baslangic:'2021-08-01',bitis:'2022-04-15',netUcret:12500},{baslangic:'2022-04-10',bitis:'2025-03-12',netUcret:39000}]}],
 ['Güncel gelir ve tam ömür',{ucretTipi:'Güncel Ücret',omurYontemi:'Tam Ömür',calisma60Var:true}],
 ['İşlemiş pasif dönem',{dogumTarihi:'1950-02-28',kazaTarihi:'2009-08-27',emeklilikYasi:60}],
 ['Artık yıl',{dogumTarihi:'1988-02-29',kazaTarihi:'2020-02-29',hesapTarihi:'2024-02-29',calisma65Var:true}],
 ['Askerlik tenzili',{dogumTarihi:'2005-10-04',askerlikDurumu:'Askere Gidecek'}],
 ['DYKT evli',married],
 ['DYKT teknik faiz',{...married,eksiltmeYontemi:'Teknik Faiz'}],
 ['DYKT özel çıkış',{...married,destekGorenler:[support('Dul Eş','Eş','1991-06-21',{},{ozelDestektenCikisTarihi:'2028-01-03',ozelDestektenCikisNedeni:'Evlenme'})]}],
 ['DYKT bekâr farazi destek',{calculationMode:'dykt',magdurMedeniHal:'Bekâr',dogumTarihi:'2000-02-29',kazaTarihi:'2018-09-21',destekGorenler:[support('Anne','Anne','1978-11-06'),support('Baba','Baba','1970-08-29','Erkek')]}],
 ['DYKT yetiştirme',{calculationMode:'dykt',magdurMedeniHal:'Bekâr',dogumTarihi:'2005-08-15',kazaTarihi:'2021-07-22',yetistirmeGideriVar:true,destekGorenler:[support('Anne','Anne','1978-11-06'),support('Baba','Baba','1970-08-29','Erkek')]}],
 ['DYKT kişiye ödeme',{...married,pesinOdemeler:[payment(20000,'Eş'),payment(10000,'Genel')],sgkOdemeler:[payment(35000,'Anne'),payment(22000,'Genel')],trafikOdemeler:[payment(100000,'Eş'),payment(15000,'Genel')],trafikSigortaTavani:500000,davaKonusu:'Trafik'}],
 ['DYKT SGK rücu',{...married,davaKonusu:'Rücu',sgkSigortasiz5510_23:true,sgkOdemeler:[payment(150000,'Eş'),payment(100000,'Çocuk')],pesinOdemeler:[payment(10000,'Eş')]}],
 ['DYKT bordro',{...married,ucretTipi:'Bordrolu Ücret',bordroluUcretler:[{baslangic:'2021-08-01',bitis:'2025-06-30',netUcret:39000}]}],
];
for(const [name,changes] of cases)test('Swift parity: '+name,()=>{const input={...structuredClone(base),...changes};compare(normalize(calculateActuarial(input,data)),normalize(reference({input})));});
for(const hayatTablosu of [...new Set(data.yasamTablolari.map(row=>row.tablo))])test('Swift yaşam tablosu parity: '+hayatTablosu,()=>{const input={...structuredClone(base),hayatTablosu};compare(normalize(calculateActuarial(input,data)),normalize(reference({input})));});
test('Swift kişisel yaşam/ücret tablosu ve PR yuvarlama parity',()=>{
  const personal=structuredClone(data);personal.yasamTablolari.find(r=>r.tablo===base.hayatTablosu && Number(r.yas)===31).ex='15,5';personal.asgariUcret.at(-1).net='31.234,5678';
  const input={...base,artisOrani:8.125,progresifRantIskontoOrani:2.333,ggoDegeri:1.23456,surekliMaluliyetOrani:17.35};
  const expected=JSON.parse(execFileSync(fileURLToPath(new URL('../../actuarial-service/bin/actuarial-engine',import.meta.url)),{input:JSON.stringify({input,data:personal}),timeout:60000,maxBuffer:5000000}));
  compare(normalize(calculateActuarial(input,personal)),normalize(expected));
});
for(const year of [2008,2016,2021,2022,2024,2026])for(const minimum of [false,true])test(`Swift GGO parity: ${year} minimum=${minimum}`,()=>{const ggo={year,brut:year<2020?5000:50000,medeni:'evli_2',nakdi:[1000,2000],yemek:[1000,2500],ayni:[500,600],minimum};compare(calculateGGO(ggo,data),reference({ggo}));});
test('Swift netten brüte parity',()=>{const ggo={year:2026,brut:0,medeni:'bekar',nakdi:[],yemek:[],ayni:[],minimum:false,targetNet:33000,targetMonth:0};compare(calculateGGO(ggo,data),reference({ggo}));});
