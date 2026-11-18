export const tables = {
  asgariUcret: {title:'Asgari ücret', columns:['baslangic','bitis','brut','net'], numbers:['brut','net'], dates:['baslangic','bitis']},
  yasalFaiz: {title:'Yasal faiz', columns:['baslangic','bitis','oran','dayanak'], numbers:['oran'], dates:['baslangic','bitis']},
  yasamTablolari: {title:'Yaşam tabloları', columns:['tablo','yas','lx','dx','qx','ex'], numbers:['yas','lx','dx','qx','ex'], required:['tablo','yas','ex']},
  dulEsEvlenme: {title:'Dul eş evlenme olasılığı', columns:['cocuk_18_alti','yas','oran'], numbers:['oran']},
  meslekler: {title:'Meslekler', columns:['kod','ad'], required:['ad']},
  tuikIlkEvlenmeYasi: {title:'TÜİK ilk evlenme yaşı', columns:['yil','erkek','kadin'], numbers:['yil','erkek','kadin']},
  agiTablosu: {title:'Asgari geçim indirimi', columns:['yil','donem','bekar','evli_es_c_yok','evli_es_c_yok_1','evli_es_c_yok_2','evli_es_c_yok_3','evli_es_c_yok_4','evli_es_c_yok_5','evli_es_c_var_0','evli_es_c_var_1','evli_es_c_var_2','evli_es_c_var_3','evli_es_c_var_4','evli_es_c_var_5'], numbers:['yil','bekar','evli_es_c_yok','evli_es_c_yok_1','evli_es_c_yok_2','evli_es_c_yok_3','evli_es_c_yok_4','evli_es_c_yok_5','evli_es_c_var_0','evli_es_c_var_1','evli_es_c_var_2','evli_es_c_var_3','evli_es_c_var_4','evli_es_c_var_5']},
  gelirVergisiDilimleri: {title:'Gelir vergisi dilimleri', columns:['yil','dilim','matrah','oran'], numbers:['yil','matrah','oran']},
  damgaVergisi: {title:'Damga vergisi', columns:['baslangic_yili','bitis_yili','oran_binde'], numbers:['baslangic_yili','bitis_yili','oran_binde']},
  gelirVergisiYemekIstisnasi: {title:'Yemek istisnası', columns:['yil_donem','baslangic','bitis','gunluk','aylik'], numbers:['gunluk','aylik'], dates:['baslangic','bitis']},
};
export function parseNumber(value) {
  let s = String(value).trim().replace(/[\s\u00a0]/g,'');
  if (!s) return null;
  if (s.includes(',')) s = s.replaceAll('.','').replace(',','.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replaceAll('.','');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function dateValue(s) {
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  let y,m,d;
  if (match) [,y,m,d] = match;
  else { match = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(s); if (!match) return null; [,d,m,y] = match; }
  const dt = new Date(Date.UTC(+y,+m-1,+d));
  return dt.getUTCFullYear()===+y && dt.getUTCMonth()===+m-1 && dt.getUTCDate()===+d ? dt.valueOf() : null;
}
export function validateRows(key, rows) {
  const schema = tables[key];
  if (!schema || !Array.isArray(rows) || rows.length>6000) throw new Error('Teknik tablo veya satır sayısı geçersiz.');
  const ids = new Set();
  const clean = rows.map((row,index) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Satır geçersiz.');
    const id = String(row._id || '');
    if (!/^[a-zA-Z0-9_-]{8,64}$/.test(id) || ids.has(id)) throw new Error('Satır kimliği geçersiz veya yinelenmiş.');
    ids.add(id);
    const out = {_id:id};
    for (const column of schema.columns) {
      const value = String(row[column] ?? '').trim();
      if (value.length>300) throw new Error(`${index+1}. satır: değer çok uzun.`);
      if ((schema.required||[]).includes(column) && !value) throw new Error(`${index+1}. satır: ${column} gerekli.`);
      if ((schema.numbers||[]).includes(column) && value && !(key==='gelirVergisiDilimleri' && column==='matrah' && value==='∞')) {
        const n = parseNumber(value);
        if (n===null || n<0 || n>1e13) throw new Error(`${index+1}. satır: ${column} geçersiz sayı.`);
        if (['oran','oran_binde'].includes(column) && n>100) throw new Error('Oran 0–100 arasında olmalı.');
        if (column==='qx' && n>1) throw new Error('qx 0–1 arasında olmalı.');
        if (column==='yas' && (!Number.isInteger(n) || n>130)) throw new Error('Yaş 0–130 arasında tam sayı olmalı.');
        if (column==='ex' && n>130) throw new Error('Bakiye ömür 0–130 arasında olmalı.');
        if (['yil','baslangic_yili','bitis_yili'].includes(column) && (!Number.isInteger(n) || n<1900 || n>2200)) throw new Error('Yıl 1900–2200 arasında olmalı.');
      }
      if ((schema.dates||[]).includes(column) && value && !['Günümüz','Gunumuz'].includes(value) && dateValue(value)===null) throw new Error(`${index+1}. satır: ${column} geçersiz tarih.`);
      out[column] = value;
    }
    if (out.baslangic && out.bitis && dateValue(out.bitis)!==null && dateValue(out.baslangic)>dateValue(out.bitis)) throw new Error('Başlangıç tarihi bitişten sonra olamaz.');
    return out;
  });
  if (key==='yasamTablolari') {
    const keys = clean.map(r=>r.tablo+'|'+r.yas);
    if (new Set(keys).size!==keys.length) throw new Error('Aynı yaşam tablosu ve yaş yinelenemez.');
  }
  if (['asgariUcret','yasalFaiz','gelirVergisiYemekIstisnasi'].includes(key)) {
    const periods=clean.map(r=>({start:dateValue(r.baslangic),end:dateValue(r.bitis)??Infinity})).sort((a,b)=>a.start-b.start);
    if (periods.some(r=>r.start===null) || periods.some((r,i)=>i && r.start<=periods[i-1].end)) throw new Error('Tarih dönemleri eksik veya birbiriyle çakışıyor.');
  }
  if (key==='gelirVergisiDilimleri') {
    const grouped=Object.groupBy(clean,r=>r.yil);
    for (const rows of Object.values(grouped)) {
      const limits=rows.map(r=>r.matrah==='∞' ? Infinity : parseNumber(r.matrah)).sort((a,b)=>a-b);
      if (limits.some((n,i)=>n===null || n<=0 || (i && n===limits[i-1]))) throw new Error('Vergi dilimi sınırları pozitif ve birbirinden farklı olmalı.');
      if (limits.at(-1)!==Infinity) throw new Error('Her yılın son vergi dilimi sınırı ∞ olmalı.');
    }
  }
  return clean;
}
