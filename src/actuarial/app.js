import './style.css';
import {protectPage,setupAccountUI} from '../auth.js';
import {defaults,groups,rowGroups} from './fields.js';
import {parseNumber} from '../../worker/actuarial/schema.js';
import {icon,decorateIcons} from './icons.js';

const $=s=>document.querySelector(s);
const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
const labels={igt:'İş göremezlik (İGT)',dykt:'Destekten yoksun kalma (DYKT)',yas:'Yaş',donemBaslangic:'Başlangıç',donemBitis:'Bitiş',gun:'Gün',ay:'Ay',netUcret:'Net ücret',ggo:'GGO',prArtis:'PR artışı',maluliyetYuzde:'Maluliyet %',aylikTazminat:'Aylık tazminat',iskontoKatsayi:'İskonto katsayısı',iskontoSonrasi:'İskonto sonrası',payOrani:'Pay oranı',evlenmeTenziliYuzde:'Evlenme tenzili %',donemTutar:'Dönem tutarı',infoText:'Açıklama',ad:'Ad',tip:'Yakınlık',tur:'Tür',kusur:'Kusur %',anaPara:'Ana para',faiz:'Faiz',toplam:'Toplam',net:'Net',sgk:'SGK',trafik:'Trafik',pesin:'Peşin',pesinFaiz:'Peşin faiz',trafikFaiz:'Trafik faiz',yetistirme:'Yetiştirme',kusurlu:'Kusur sonrası',destekBaslangic:'Destek başlangıcı',destekSonu:'Destek sonu',destektenCikis:'Destekten çıkış',aciklama:'Açıklama',sgkPSD:'SGK PSD',davalilaraDusenTazminat:'Davalılara düşen tazminat',isverenRucuTavani:'İşveren rücu tavanı',ucuncuKisiDisTavan:'Üçüncü kişi dış tavan',ucuncuKisiRucuTavani:'Üçüncü kişi rücu tavanı',pesinMahsupToplam:'Peşin mahsup toplamı',tenzilSonrasiToplam:'Tenzil sonrası toplam'};
const money=n=>new Intl.NumberFormat('tr-TR',{maximumFractionDigits:2,minimumFractionDigits:2}).format(n);
const date=s=>new Date(s).toLocaleDateString('tr-TR',{timeZone:'Europe/Istanbul'});
let dataset, draft, dirty=false, selected='asgariUcret', page=0, lastResult;
let model=structuredClone(defaults);
let legislation,legislationDirty=false;
Object.assign(labels,{kararTarihi:'Karar tarihi',tahkikatBaslangic:'Tahkikat başlangıcı',tbk55Uygulama:'TBK 55 uygulaması',tbk55BilinenAnaPara:'Bilinen dönem ana para',tbk55BilinmeyenAnaPara:'Bilinmeyen dönem ana para',tbk55BilinenFaiz:'Bilinen dönem faizi',tbk55BilinmeyenFaiz:'Bilinmeyen dönem faizi',tbk55MahsupToplam:'TBK 55 mahsup toplamı',kaynak:'Ödeme türü',tarih:'Tarih',davali:'Davalı',alici:'Alıcı',tutar:'Ödenen',yontem:'Mahsup yöntemi',odemeTarihiTazminati:'Ödeme günündeki tazminat',oran:'Oran',mahsup:'Mahsup',degerleme:'Değerleme',bilinenAnaPara:'Bilinen dönem ana para',bilinmeyenAnaPara:'Bilinmeyen dönem ana para',bilinenBaslangic:'Bilinen dönem faiz başlangıcı',bilinmeyenBaslangic:'Bilinmeyen dönem faiz başlangıcı',bilinenFaiz:'Bilinen dönem faizi',bilinmeyenFaiz:'Bilinmeyen dönem faizi'});
async function api(path,options={}) {
  const response=await fetch('/api/aktuerya'+path,{credentials:'same-origin',cache:'no-store',...options,headers:{'content-type':'application/json',...options.headers}});
  const body=await response.json().catch(()=>({error:'Sunucu yanıtı okunamadı.'}));
  if (!response.ok) throw new Error(body.error || 'İşlem tamamlanamadı.');
  return body;
}
function status(message,error=false,target='#act-status') {$(target).textContent=message;$(target).classList.toggle('error',error);}
function control(field,value,onchange) {
  const [key,label,type]=field;
  const wrap=el('label',label, type==='checkbox' ? 'check' : '');
  let input;
  if (Array.isArray(type) || type==='life') {
    input=el('select');
    const options=type==='life' ? [...new Set((dataset?.data.yasamTablolari||[]).map(r=>r.tablo))] : type;
    for(const v of options) {const opt=el('option',labels[v] || v);opt.value=v;input.append(opt);}
    if (!options.includes(value) && value) {const opt=el('option',value);opt.value=value;input.append(opt);}
    input.value=value || options[0] || '';
  } else {
    input=el('input');input.type=type;
    if(type==='checkbox') input.checked=key==='ifaAmacli'?value!==false:Boolean(value);
    else input.value=value ?? '';
    if(type==='number') {input.step='any';input.min='0';}
  }
  input.name=key;
  input.setAttribute('aria-label',label);
  input.addEventListener('change',()=>{
    let v=type==='checkbox' ? input.checked : input.value;
    if(type==='number') v=v==='' ? null : Number(v);
    if(type==='date' && !v) v=null;
    onchange(v);
    renderPreparation();
  });
  wrap.append(input);return wrap;
}
function renderForm() {
  const root=$('#fields');root.replaceChildren();
  for(const [index,[title,fields]] of groups.entries()) {
    const card=el('details',undefined,'act-card field-section');card.id='form-section-'+index;card.open=true;
    const heading=el('summary',undefined,'section-heading');heading.append(el('span',String(index+1).padStart(2,'0'),'section-number'),icon(['user','calculator','care','people','file'][index]),el('h2',title));card.append(heading);
    const grid=el('div',undefined,'act-grid');
    for(const field of fields) {const ctrl=control(field,model[field[0]],v=>model[field[0]]=v);if(['dogumTarihi','kazaTarihi','hesapTarihi'].includes(field[0])) ctrl.querySelector('input').required=true;grid.append(ctrl);}
    if(title==='Dosya ve kişi') {
      const profession=el('label','Meslek (dosya bilgisi)');const input=el('input');input.setAttribute('list','act-professions');input.value=model.meslek || '';input.onchange=()=>model.meslek=input.value;
      const list=el('datalist');list.id='act-professions';for(const row of dataset.data.meslekler) {const option=el('option');option.value=row.ad;list.append(option);}profession.append(input,list);grid.append(profession);
    }
    card.append(grid);root.append(card);
    if(index===4)card.append(el('p','31.07.2026 ve sonrasındaki olaylarda yeni TBK 55 uygulanır; önceki olaylar ve SGK rücu hesabı eski yöntemle devam eder. Karar yoksa bilinmeyen dönem faizi 0’dır. Ödeme günündeki tazminat otomatik hesaplanır; dosyada belirlenen sorumluluk tutarını ödeme satırında ayrıca girebilirsiniz.','law-note'));
  }
  renderRows();
}
function renderPreparation() {
  if(!dataset)return;
  const {checks,validationError,newLaw,decisionPending}=preparationChecks(model,dataset.data),active=checks.filter(c=>c.state!=='Pasif'),filled=active.filter(c=>c.state==='Dolu').length;
  $('#preparation-count').textContent=`${filled} / ${active.length} dolu · ${active.length-filled} eksik`;
  $('#preparation-progress').max=active.length;$('#preparation-progress').value=filled;
  const root=$('#preparation-items');root.replaceChildren();
  const fieldLabels=Object.fromEntries(groups.flatMap(([,fields])=>fields.map(([key,label])=>[key,label])));
  for(const c of checks){const button=el('button',undefined,'preparation-item '+(c.state==='Dolu'?'filled':c.state==='Pasif'?'passive':'missing'));button.type='button';button.append(el('span',c.title),el('b',c.state));if(c.missing.length&&c.state!=='Pasif')button.append(el('small',c.missing.map(k=>fieldLabels[k]||rowGroups[k]?.title||dataset.tables[k]?.title||k).join(', ')));
    button.onclick=()=>{if(c.target.data){$('#data-sidebar').showModal();return;}const section=c.target.rows?$('#rows-'+c.target.rows):$('#form-section-'+c.target.section);section.open=true;section.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});const field=c.missing[0]&&section.querySelector(`[name="${c.missing[0]}"]`);field?.focus({preventScroll:true});};root.append(button);
  }
  $('#preparation-message').textContent=validationError?'Hesap için kontrol: '+validationError:newLaw?(decisionPending?'Yeni TBK 55 aktif. Karar tarihi girilmediği için bilinmeyen döneme faiz işletilmeyecek.':'Yeni TBK 55 aktif. Bilinen ve bilinmeyen dönem faizleri ayrı hesaplanacak.'):model.davaKonusu==='Rücu'?'SGK rücu hesabı: rücu tavanı ve önceki mahsup yöntemi uygulanır.':'Önceki olay tarihi: eski faiz / mahsup yöntemi uygulanır.';
  $('#preparation-message').classList.toggle('error',Boolean(validationError));
}
function renderRows() {
  const root=$('#row-fields');root.replaceChildren();
  for(const [key,schema] of Object.entries(rowGroups)) {
    const card=el('details',undefined,'act-card');card.id='rows-'+key;card.open=key==='davalilar' || (key==='destekGorenler' && model.calculationMode==='dykt');card.append(el('summary',schema.title+` (${model[key].length})`));
    model[key].forEach((row,index)=>{
      const box=el('div',undefined,'row-entry');const grid=el('div',undefined,'act-grid');
      for(const field of schema.fields) grid.append(control(field,row[field[0]],v=>row[field[0]]=v));
      const remove=el('button','Satırı kaldır');remove.type='button';remove.onclick=()=>{model[key].splice(index,1);renderRows();};box.append(grid,remove);card.append(box);
    });
    const add=el('button','+ '+schema.title+' satırı');add.type='button';add.onclick=()=>{
      const row=Object.fromEntries(schema.fields.map(([name,,type])=>[name,type==='checkbox' ? true : Array.isArray(type) ? type[0] : type==='number' ? (['cikisYasi','odemeTarihiTazminati'].includes(name) ? null : 0) : type==='date' ? null : '']));
      model[key].push(row);renderRows();
    };card.append(add);root.append(card);
  }
  renderPreparation();
}
async function loadData() {
  dataset=await api('/data');draft=structuredClone(dataset.data);dirty=false;page=0;
  const select=$('#data-table');select.replaceChildren();for(const [key,schema] of Object.entries(dataset.tables)) {const option=el('option',schema.title);option.value=key;select.append(option);}select.value=selected;
  renderData();
}
function filteredRows() {
  const needle=$('#data-search').value.toLocaleLowerCase('tr-TR');
  return draft[selected].filter(row=>Object.entries(row).some(([key,value])=>key!=='_id' && String(value).toLocaleLowerCase('tr-TR').includes(needle)));
}
function renderData() {
  const rows=filteredRows();const pages=Math.max(1,Math.ceil(rows.length/30));page=Math.max(0,Math.min(page,pages-1));
  const table=el('table');const head=el('tr');const columns=dataset.tables[selected].columns;
  for(const col of [...columns,'İşlem']) head.append(el('th',labels[col] || col));table.append(head);
  for(const row of rows.slice(page*30,page*30+30)) {
    const tr=el('tr');for(const column of columns) {
      const td=el('td');const input=el('input');input.value=row[column]??'';input.dataset.column=column;input.setAttribute('aria-label',column);
      input.oninput=()=>{row[column]=input.value;dirty=true;status('Kaydedilmemiş değişiklikleriniz var.',false,'#data-status');};td.append(input);tr.append(td);
    }
    const td=el('td');const remove=el('button','Sil');remove.onclick=()=>{draft[selected]=draft[selected].filter(r=>r._id!==row._id);dirty=true;renderData();status('Satır kaldırıldı. Kaydedince uygulanır.',false,'#data-status');};td.append(remove);tr.append(td);table.append(tr);
  }
  if(!rows.length) table.append(el('caption','Satır bulunamadı. Satır ekleyebilirsiniz.'));
  $('#data-rows').replaceChildren(table);$('#page-label').textContent=`${page+1} / ${pages} · ${rows.length} satır`;
  $('#previous-page').disabled=page===0;$('#next-page').disabled=page===pages-1;
}
function switchTab(tab) {
  for(const key of ['calculation','ggo','archive','legislation']) $('#'+key+'-panel').hidden=key!==tab;
  document.querySelectorAll('[data-tab]').forEach(button=>{const active=button.dataset.tab===tab;button.classList.toggle('selected',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
  $('.act-section-nav').hidden=tab!=='calculation';
  if(tab==='archive') loadArchive().catch(e=>status(e.message,true));
  if(tab==='legislation'&&!legislation)loadLegislation().catch(e=>status(e.message,true,'#legislation-status'));
}
async function loadLegislation(){legislation=await api('/legislation');legislationDirty=false;renderLegislation();status('Kayıtlı mevzuat listeniz yüklendi.',false,'#legislation-status');}
function renderLegislation(){const root=$('#legislation-list');root.replaceChildren();if(!legislation.rows.length)root.append(el('p','Listeniz boş. Aşağıdan resmî bir mevzuat ekleyebilirsiniz.'));for(const row of legislation.rows){const box=el('div',undefined,'legislation-entry'),info=el('div'),link=el('a',(row.number?row.number+' · ':'')+row.title);link.href=row.url;link.target='_blank';link.rel='noopener noreferrer';info.append(link,el('p',row.note));const remove=el('button','Kaldır');remove.type='button';remove.onclick=()=>{legislation.rows=legislation.rows.filter(r=>r.id!==row.id);legislationDirty=true;renderLegislation();status('Listeden kaldırıldı. Kalıcı olması için listemi kaydet düğmesine basın.',false,'#legislation-status');};box.append(info,remove);root.append(box);}}
function displayValue(key,value) {
  if(value===null || value===undefined) return '—';
  if(typeof value==='number') return ['yas','gun'].includes(key) ? String(value) : /katsayi|payOrani/i.test(key) ? new Intl.NumberFormat('tr-TR',{maximumFractionDigits:8}).format(value) : money(value);
  if(typeof value==='boolean') return value ? 'Evet' : 'Hayır';
  if(typeof value==='string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return date(value);
  return String(value);
}
function resultTable(rows,columns) {
  const scroll=el('div',undefined,'table-scroll');const table=el('table');const header=el('tr');for(const key of columns) header.append(el('th',labels[key]||key));table.append(header);
  for(const row of rows) {const tr=el('tr');for(const key of columns) tr.append(el('td',displayValue(key,row[key])));table.append(tr);}
  scroll.append(table);return scroll;
}
function renderResult(record,target='#result') {
  lastResult=record;const result=record.result,root=$(target);root.replaceChildren();
  const card=el('section',undefined,'act-card result-card');card.append(el('h2','Hesap sonucu'));
  const summary=el('div',undefined,'summary-grid');
  for(const [key,title] of [['toplamTazminat','Toplam tazminat'],['netTazminat','Net tazminat'],['davalilardanTalepEdilecekToplam','Davalılardan talep']]) {const box=el('div',title);box.append(el('strong',money(result.summary[key]??result.summary.rucuEdilebilirTutar)+' TL'));summary.append(box);}
  card.append(summary);
  const actions=el('div',undefined,'act-actions report-actions');const print=el('button','Yazdır / PDF');print.onclick=()=>{root.querySelectorAll('details').forEach(d=>d.open=true);window.print();};const json=el('button','Hesap JSON');json.onclick=()=>download('aktuerya-'+record.id+'.json',JSON.stringify(record,null,2),'application/json');const csv=el('button','Tablolar CSV');csv.onclick=()=>downloadCSV(record);actions.append(print,csv,json);card.append(actions);
  const params=el('details');params.append(el('summary','Hesap parametreleri'));params.append(resultTable(Object.entries(result.parameters).filter(([,v])=>!Array.isArray(v)).map(([key,value])=>({alan:labels[key]||key,deger:displayValue(key,value)})),['alan','deger']));card.append(params);
  for(const table of result.tables) {const details=el('details');details.open=true;details.append(el('summary',`${table.title} · ${money(table.total)} TL`),el('p',table.formula));details.append(resultTable(table.rows,['yas','donemBaslangic','donemBitis','gun','ay','netUcret','ggo','prArtis','maluliyetYuzde','aylikTazminat','iskontoKatsayi','iskontoSonrasi','payOrani','evlenmeTenziliYuzde','donemTutar','infoText']));card.append(details);}
  const breakdowns=[['tbk55FaizDetay','TBK 55 — dönemlere göre faiz'],['tbk55MahsupDetay','TBK 55 — ödeme ve oransal mahsup'],['dyktDestekDagilimi','Destek görenlerin dağılımı'],['davaliDagilimi','Davalıların dağılımı'],['sgkRucuTavanDagilimi','Rücu tavanları']];
  for(const [key,title] of breakdowns) if(result.summary[key]?.length) {
    const rows=result.summary[key];const details=el('details');details.open=true;details.append(el('summary',title),resultTable(rows,[...new Set(rows.flatMap(Object.keys))].filter(k=>k!=='id' && !rows.some(r=>Array.isArray(r[k])))));
    for(const row of rows) for(const [subkey,value] of Object.entries(row)) if(Array.isArray(value) && value.length) details.append(el('p',(row.ad||'')+' · '+subkey),resultTable(value,Object.keys(value[0]).filter(k=>k!=='id')));
    card.append(details);
  }
  const totals=el('details');totals.append(el('summary','Tüm toplamlar ve mahsuplar'),resultTable(Object.entries(result.summary).filter(([,v])=>!Array.isArray(v)).map(([key,value])=>({alan:labels[key]||key,deger:displayValue(key,value)})),['alan','deger']));card.append(totals);
  card.append(el('p',`Hesap tarihi: ${date(result.createdAt)}`,'report-note'));
  root.append(card);
}
function download(name,text,mime) {const url=URL.createObjectURL(new Blob(['\uFEFF',text],{type:mime+';charset=utf-8'}));const link=el('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function downloadCSV(record) {
  const quote=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
  const lines=[];for(const table of record.result.tables) {lines.push(quote(table.title));const columns=Object.keys(table.rows[0]||{}).filter(k=>k!=='id');lines.push(columns.map(quote).join(';'));for(const row of table.rows)lines.push(columns.map(k=>quote(displayValue(k,row[k]))).join(';'));lines.push('');}
  download('aktuerya-'+record.id+'.csv',lines.join('\r\n'),'text/csv');
}
async function loadArchive() {
  const {calculations}=await api('/archive');const root=$('#archive-list');root.replaceChildren();if(!calculations.length)root.append(el('p','Henüz kayıtlı hesabınız yok.'));
  for(const item of calculations) {
    const row=el('div',undefined,'archive-entry');row.append(el('p',`${item.title} · ${new Date(item.created_at).toLocaleString('tr-TR')}`));const actions=el('div');const open=el('button','Görüntüle');open.onclick=async()=>{try{const record=await api('/archive/'+item.id);renderResult(record);switchTab('calculation');$('#result').scrollIntoView({behavior:'smooth'});}catch(e){status(e.message,true);}};
    const edit=el('button','Girdileri kullan');edit.onclick=async()=>{try{const record=await api('/archive/'+item.id);model={...structuredClone(defaults),...record.input};renderForm();switchTab('calculation');status('Girdiler yüklendi. Yeni hesap güncel kayıtlı teknik verilerinizi kullanacak.');}catch(e){status(e.message,true);}};
    const remove=el('button','Sil');remove.onclick=async()=>{if(!confirm('Bu hesabı arşivinizden silmek istiyor musunuz?'))return;try{await api('/archive/'+item.id,{method:'DELETE'});await loadArchive();}catch(e){status(e.message,true);}};actions.append(open,edit,remove);row.append(actions);root.append(row);
  }
}
async function start() {
  decorateIcons();
  if(!await protectPage())return;
  await setupAccountUI();await loadData();renderForm();
  $('#legislation-form').onsubmit=async event=>{event.preventDefault();try{if(!legislation)await loadLegislation();const fields=new FormData(event.target),row={id:crypto.randomUUID(),title:fields.get('title'),number:fields.get('number'),url:fields.get('url'),note:fields.get('note')};legislation.rows=validateLegislation([...legislation.rows,row]);legislationDirty=true;renderLegislation();event.target.reset();status('Mevzuat eklendi. Kalıcı olması için listemi kaydet düğmesine basın.',false,'#legislation-status');}catch(e){status(e.message,true,'#legislation-status');}};
  $('#save-legislation').onclick=async()=>{const button=$('#save-legislation');button.disabled=true;try{legislation=await api('/legislation',{method:'PUT',body:JSON.stringify(legislation)});legislationDirty=false;renderLegislation();status('Mevzuat listeniz yalnızca sizin hesabınıza kaydedildi.',false,'#legislation-status');}catch(e){status(e.message,true,'#legislation-status');}finally{button.disabled=false;}};
  $('#reload-legislation').onclick=async()=>{if(legislationDirty&&!confirm('Kaydedilmemiş mevzuat değişiklikleri bırakılsın mı?'))return;try{await loadLegislation();}catch(e){status(e.message,true,'#legislation-status');}};
  $('#reset-legislation').onclick=async()=>{if(!confirm('Kişisel mevzuat listeniz önerilen listeyle değiştirilsin mi?'))return;try{legislation=await api('/legislation',{method:'DELETE',body:JSON.stringify({revision:legislation.revision})});legislationDirty=false;renderLegislation();status('Önerilen mevzuat listesine dönüldü.',false,'#legislation-status');}catch(e){status(e.message,true,'#legislation-status');}};
  document.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>switchTab(button.dataset.tab));
  document.querySelectorAll('[data-section]').forEach(link=>link.onclick=()=>{switchTab('calculation');const section=$('#form-section-'+link.dataset.section);section.open=true;});
  $('#back-to-top').onclick=()=>window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  $('#calculation-form').addEventListener('invalid',event=>{const section=event.target.closest('details');if(section)section.open=true;},true);
  $('#open-data').onclick=()=>$('#data-sidebar').showModal();
  const closeData=()=>{if(dirty && !confirm('Kaydedilmemiş değişiklikler var. Sidebarı kapatmak istiyor musunuz?'))return;$('#data-sidebar').close();};
  $('#close-data').onclick=closeData;$('#data-sidebar').addEventListener('cancel',e=>{e.preventDefault();closeData();});
  $('#data-table').onchange=e=>{if(dirty){e.target.value=selected;status('Tabloyu değiştirmeden önce değişiklikleri kaydedin veya yeniden yükleyin.',true,'#data-status');return;}selected=e.target.value;page=0;$('#data-search').value='';renderData();};
  $('#data-search').oninput=()=>{page=0;renderData();};$('#previous-page').onclick=()=>{page--;renderData();};$('#next-page').onclick=()=>{page++;renderData();};
  $('#add-data').onclick=()=>{const row=Object.fromEntries(dataset.tables[selected].columns.map(key=>[key,'']));row._id=crypto.randomUUID();draft[selected].unshift(row);dirty=true;page=0;$('#data-search').value='';renderData();status('Yeni satır eklendi. Değerleri doldurup kaydedin.',false,'#data-status');};
  $('#reload-data').onclick=async()=>{if(dirty && !confirm('Kaydedilmemiş değişiklikleriniz bırakılsın mı?'))return;try{await loadData();status('Kayıtlı veriler yüklendi.',false,'#data-status');}catch(e){status(e.message,true,'#data-status');}};
  $('#save-data').onclick=async()=>{
    const button=$('#save-data');button.disabled=true;
    try{await api('/data/'+selected,{method:'PUT',body:JSON.stringify({rows:draft[selected],revision:dataset.revision,baselineVersion:dataset.baselineVersion})});await loadData();renderForm();status('Kaydedildi. Yalnızca sizin hesabınızda geçerli.',false,'#data-status');}catch(e){status(e.message,true,'#data-status');}finally{button.disabled=false;}
  };
  $('#reset-data').onclick=async()=>{if(!confirm('Seçili tablodaki kişisel değişiklikleriniz kaldırılsın mı?'))return;try{await api('/data/'+selected,{method:'DELETE',body:JSON.stringify({revision:dataset.revision,baselineVersion:dataset.baselineVersion})});await loadData();renderForm();status('Başlangıç tablosuna dönüldü.',false,'#data-status');}catch(e){status(e.message,true,'#data-status');}};
  $('#calculation-form').onsubmit=async event=>{
    event.preventDefault();if(dirty){status('Önce teknik veri değişikliklerinizi kaydedin.',true);return;}
    const button=event.submitter;button.disabled=true;status('Kayıtlı teknik verilerinizle hesaplanıyor…');
    try{const record=await api('/calculate',{method:'POST',body:JSON.stringify({input:model,revision:dataset.revision,baselineVersion:dataset.baselineVersion})});renderResult(record);status('Hesap kaydedildi.');$('#result').scrollIntoView({behavior:'smooth'});}catch(e){status(e.message,true);}finally{button.disabled=false;}
  };
  for(let month=0;month<12;month++){const option=el('option',new Date(2026,month,1).toLocaleString('tr-TR',{month:'long'}));option.value=month;$('#reverse-month').append(option);}
  $('#ggo-form').onsubmit=async event=>{
    event.preventDefault();if(dirty){status('Önce teknik veri değişikliklerinizi kaydedin.',true);return;}
    const button=event.submitter;button.disabled=true;const form=new FormData(event.target);const monthly=key=>Array.from({length:12},(_,i)=>parseNumber(String(form.get(key)||'').split(';')[i]||'0')??0);
    const ggo={year:Number(form.get('year')),brut:Number(form.get('brut')),medeni:form.get('medeni'),minimum:form.has('minimum'),nakdi:monthly('nakdi'),yemek:monthly('yemek'),ayni:monthly('ayni'),targetNet:form.get('targetNet') ? Number(form.get('targetNet')) : null,targetMonth:Number(form.get('targetMonth'))};
    try{const record=await api('/calculate',{method:'POST',body:JSON.stringify({ggo,revision:dataset.revision,baselineVersion:dataset.baselineVersion})});const root=$('#ggo-result');root.replaceChildren();const card=el('section',undefined,'act-card');
      if(Array.isArray(record.result)) {const rows=record.result.map((r,i)=>({ay:i+1,...r}));card.append(el('h2','Aylık GGO hesabı'),el('p','A: brüt, B: nakdi, B1: yemek, C: ayni, D: toplam, E: SGK matrahı, F: SGK, G: işsizlik, H: GV matrahı, I: kümülatif matrah, J: GV, J1: ödenecek GV, K: damga, L: AGİ, M: net, N: net asgari, O: GGO.'),resultTable(rows,['ay','A','B','B1','C','D','E','F','G','H','I','J','J1','K','L','M','N','O']));
        const select=el('select');const average=el('option','Yıllık ortalama');average.value='average';select.append(average);for(let i=0;i<12;i++){const option=el('option',`${i+1}. ay`);option.value=i;select.append(option);}const apply=el('button','GGO’yu tazminat hesabına aktar');apply.onclick=()=>{model.ggoDegeri=select.value==='average' ? rows.reduce((s,r)=>s+r.O,0)/12 : rows[Number(select.value)].O;renderForm();switchTab('calculation');status('GGO hesap girdisine aktarıldı.');};card.append(select,apply);
      } else {card.append(el('h2','Netten brüte sonuç'),el('p',`Brüt: ${money(record.result.brut)} TL · Net: ${money(record.result.net)} TL`));}
      root.append(card);status('GGO hesabı tamamlandı.');
    }catch(e){status(e.message,true);}finally{button.disabled=false;}
  };
}
start().catch(e=>status(e.message,true));
