import {parseNumber} from './schema.js';
export const DAY=86400000;
export const r2=x=>Math.sign(x)*Math.floor(Math.abs(x*100)+.5)/100;
export const num=x=>parseNumber(x ?? '') ?? 0;
export const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replaceAll('ı','i').toLowerCase().trim();
export const sum=rows=>rows.reduce((a,b)=>a+b,0);
export function day(raw) {
  if (typeof raw==='number') return Math.floor(raw);
  if (!raw) return null;
  let s=String(raw).slice(0,10),m;
  if ((m=/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(s))) s=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  const value=Date.parse(s+'T00:00:00Z');return Number.isFinite(value) ? value/DAY : null;
}
export const iso=d=>d==null ? undefined : new Date(d*DAY).toISOString().slice(0,10);
export const year=d=>new Date(d*DAY).getUTCFullYear();
export const inclusive=(a,b)=>Math.floor(b)-Math.floor(a)+1;
export const age=(born,at)=>Math.max(0,Math.floor((at-born)/365.25));
export function addYears(d,n) {const dt=new Date(d*DAY),y=dt.getUTCFullYear()+n,m=dt.getUTCMonth(),date=Math.min(dt.getUTCDate(),new Date(Date.UTC(y,m+1,0)).getUTCDate());return Date.UTC(y,m,date)/DAY;}
export function addMonths(d,n) {const dt=new Date(d*DAY),y=dt.getUTCFullYear(),m=dt.getUTCMonth()+n,last=new Date(Date.UTC(y,m+1,0)).getUTCDate();return Date.UTC(y,m,Math.min(last,dt.getUTCDate()))/DAY;}
export function addFraction(d,n) {const full=Math.trunc(n),fraction=n-full;return addYears(d,full)+(Math.abs(fraction)>.0001 ? Math.sign(fraction)*Math.floor(Math.abs(fraction*365.25)+.5) : 0);}
const epochCache=new Map(),partsFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}), offsetFormatter=new Intl.DateTimeFormat('en',{timeZone:'Europe/Istanbul',timeZoneName:'longOffset'});
function epoch(d) {
  if(epochCache.has(d))return epochCache.get(d);
  const value=new Date(d*DAY);const tz=offsetFormatter.formatToParts(value).find(p=>p.type==='timeZoneName').value;
  const match=/GMT([+-])(\d{2}):(\d{2})/.exec(tz);const offset=match ? (match[1]==='+'?1:-1)*(+match[2]*60 + +match[3])*60000 : 0;
  const result=d*DAY-offset;epochCache.set(d,result);if(epochCache.size>10000)epochCache.clear();return result;
}
export function midDay(a,b) {
  const parts=Object.fromEntries(partsFormatter.formatToParts(new Date((epoch(a)+epoch(b))/2)).map(p=>[p.type,p.value]));
  return day(`${parts.year}-${parts.month}-${parts.day}`);
}
export const months=(a,b)=>r2(Math.min(12,inclusive(a,b)/(year(a)%4===0 && (year(a)%100!==0 || year(a)%400===0) ? 366 :365)*12));
export function split(a,b,wages,include=true,extra=[]) {
  const points=new Set([a,b]);for(let y=year(a);y<=year(b);y++){const p=day(y+'-01-01');if(p>a && p<=b)points.add(p);}
  if(include)for(const row of wages)if(row.start>a && row.start<b)points.add(row.start);
  for(const p of extra)if(p>a && p<=b)points.add(p);
  const sorted=[...points].sort((x,y)=>x-y);if(sorted.length<=1)return [{start:a,end:b}];
  const out=[];for(let i=0;i<sorted.length-1;i++){const end=i===sorted.length-2 ? b : sorted[i+1]-1;if(sorted[i]<=end)out.push({start:sorted[i],end});}return out.length?out:[{start:a,end:b}];
}
export function loadWages(data){return data.asgariUcret.map(row=>({start:day(row.baslangic),end:day(row.bitis),brut:Math.max(0,num(row.brut)),net:Math.max(0,num(row.net))})).filter(r=>r.start!==null && r.end!==null).sort((a,b)=>a.start-b.start);}
export function wage(at,rows,brut=false){const d=Math.floor(at),r=rows.find(r=>d>=r.start && d<=r.end)||rows.findLast(r=>d>=r.start)||rows[0];return r ? (brut?r.brut:r.net):0;}
export function interest(amount,a,b,rates) {if(!(amount>0 && a<b))return 0;let total=0;for(const row of rates){const start=Math.max(a,row.start),end=Math.min(b,row.end ?? b);if(start>=end)continue;total+=amount*(row.oran/100)*(Math.max(1,inclusive(start,end))/365);}return r2(total);}
export function life(data,table,at) {const rows=data.yasamTablolari.filter(r=>r.tablo===table).map(r=>({age:Number(r.yas),ex:num(r.ex)}));return rows.find(r=>r.age===at)?.ex ?? rows.filter(r=>r.age<at).sort((a,b)=>b.age-a.age)[0]?.ex;}
export function military(input) {
  if(!norm(input.askerlikDurumu).includes('askere gidecek') && !norm(input.askerlikDurumu).includes('askeregidecek'))return [];
  if(!norm(input.davaKonusu).includes('alacak') && !norm(input.davaKonusu).includes('rucu'))return [];
  let start=addYears(input.dogumTarihi,20);const rule=norm(input.askerlikKuralSecimi),education=norm(input.egitimDurumu);
  if(rule.includes('ogrenimdurumunagoretecil')){const years=education.includes('lise')?19:education.includes('universite')?23:education.includes('yukseklisans')||education.includes('yuksek lisans')?25:education.includes('doktora')?28:null;if(years!==null)start=addYears(input.dogumTarihi,years);}
  if(rule.includes('kazatarihinde20'))start=input.kazaTarihi;
  start=Math.max(start,input.kazaTarihi);return [{start,end:addMonths(start,6)}];
}
