import baseline from './baseline.json' with {type:'json'};
import {tables, validateRows} from './schema.js';

const reply = (body,status=200) => new Response(JSON.stringify(body), {status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','vary':'Cookie','x-content-type-options':'nosniff'}});
const fail = (message,status=400) => reply({error:message},status);
async function state(env,userId) {
  const row = await env.DB.prepare('SELECT overrides_json, revision FROM actuarial_user_data WHERE user_id = ?').bind(userId).first();
  return {overrides:JSON.parse(row?.overrides_json || '{}'),revision:Number(row?.revision || 0)};
}
export function effectiveData(overrides) {
  return Object.fromEntries(Object.entries(baseline.data).map(([key,rows])=>[key, Object.hasOwn(overrides,key) ? overrides[key] : rows]));
}
export async function actuarialAPI(request,env,user) {
  if (!user) return fail('Oturum açmanız gerekiyor.',401);
  const url = new URL(request.url);
  if (!['GET','HEAD'].includes(request.method) && request.headers.get('origin')!==url.origin) return fail('İstek kaynağı doğrulanamadı.',403);
  const route = url.pathname.slice('/api/aktuerya'.length);
  if(route==='/legislation' && ['GET','PUT','DELETE'].includes(request.method)) {
    const existing=await env.DB.prepare('SELECT rows_json, revision FROM actuarial_user_legislation WHERE user_id = ?').bind(user.id).first();
    const revision=Number(existing?.revision||0);
    if(request.method==='GET')return reply({rows:existing?JSON.parse(existing.rows_json):defaultLegislation,revision});
    const raw=await request.text();if(raw.length>300000)return fail('Mevzuat listesi çok büyük.',413);
    let body,rows;try{body=JSON.parse(raw);rows=request.method==='DELETE'?defaultLegislation:validateLegislation(body.rows);}catch(e){return fail(e.message||'Mevzuat listesi geçersiz.');}
    if(!Number.isInteger(body.revision)||body.revision!==revision)return fail('Mevzuat listeniz başka bir sekmede değişti. Yeniden yükleyin.',409);
    const json=JSON.stringify(rows);let saved;
    if(revision===0)saved=await env.DB.prepare('INSERT INTO actuarial_user_legislation (user_id, rows_json, revision, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(user_id) DO NOTHING RETURNING revision').bind(user.id,json,Date.now()).first();
    else saved=await env.DB.prepare('UPDATE actuarial_user_legislation SET rows_json = ?, revision = revision + 1, updated_at = ? WHERE user_id = ? AND revision = ? RETURNING revision').bind(json,Date.now(),user.id,revision).first();
    if(!saved)return fail('Eşzamanlı değişiklik var; yeniden yükleyin.',409);
    return reply({rows,revision:Number(saved.revision)});
  }
  if (route==='/data' && request.method==='GET') {
    const s = await state(env,user.id);
    return reply({data:effectiveData(s.overrides),revision:s.revision,baselineVersion:baseline.version,privateTables:Object.keys(s.overrides),source:baseline.source,tables});
  }
  if (route.startsWith('/data/') && ['PUT','DELETE'].includes(request.method)) {
    const key = route.slice(6);
    if (!Object.hasOwn(tables,key)) return fail('Tablo bulunamadı.',404);
    const raw = await request.text();
    if (raw.length>1500000) return fail('Veri çok büyük.',413);
    let body;
    try { body=JSON.parse(raw); } catch { return fail('JSON geçersiz.'); }
    if (!Number.isInteger(body.revision) || body.revision<0 || body.baselineVersion!==baseline.version) return fail('Veri sürümü değişti; yeniden yükleyin.',409);
    const s = await state(env,user.id);
    if (s.revision!==body.revision) return fail('Başka bir sekmede veriler değişti. Yeniden yükleyin.',409);
    try {
      if (request.method==='DELETE') delete s.overrides[key];
      else s.overrides[key]=validateRows(key,body.rows);
    } catch (e) { return fail(e.message); }
    const json=JSON.stringify(s.overrides);
    let saved;
    if (s.revision===0) saved=await env.DB.prepare('INSERT INTO actuarial_user_data (user_id, overrides_json, revision, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(user_id) DO NOTHING RETURNING revision').bind(user.id,json,Date.now()).first();
    else saved=await env.DB.prepare('UPDATE actuarial_user_data SET overrides_json = ?, revision = revision + 1, updated_at = ? WHERE user_id = ? AND revision = ? RETURNING revision').bind(json,Date.now(),user.id,s.revision).first();
    if (!saved) return fail('Eşzamanlı değişiklik var; yeniden yükleyin.',409);
    return reply({ok:true,revision:Number(saved.revision),privateTables:Object.keys(s.overrides)});
  }
  if (route==='/calculate' && request.method==='POST') {
    const raw=await request.text();
    if (raw.length>100000) return fail('Hesap girdisi çok büyük.',413);
    let body;
    try { body=JSON.parse(raw); } catch { return fail('Hesap girdisi geçersiz.'); }
    const s=await state(env,user.id);
    if (body.revision!==s.revision || body.baselineVersion!==baseline.version) return fail('Teknik veriler değişti. Güncel verileri yükleyip tekrar hesaplayın.',409);
    const data=effectiveData(s.overrides);
    if (!data.asgariUcret.length || !data.yasamTablolari.length || !data.yasalFaiz.length) return fail('Asgari ücret, yaşam ve faiz tabloları boş olamaz.',422);
    if (!env.ACTUARIAL_ENGINE_URL || !env.ACTUARIAL_ENGINE_TOKEN) return fail('Swift hesaplama servisi henüz bağlanmadı.',503);
    let engine;
    try {
      const serviceURL=new URL(env.ACTUARIAL_ENGINE_URL);
      if (serviceURL.protocol!=='https:' && !['localhost','127.0.0.1'].includes(serviceURL.hostname)) return fail('Hesap servisi HTTPS kullanmalı.',503);
      const response=await fetch(serviceURL,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+env.ACTUARIAL_ENGINE_TOKEN},body:JSON.stringify({input:body.input,ggo:body.ggo,data}),signal:AbortSignal.timeout(25000)});
      if (!response.ok) return fail(response.status===422 ? 'Girdileri ve gerekli teknik tabloları kontrol edin.' : 'Hesaplama servisine erişilemiyor.',response.status===422 ? 422 : 503);
      engine=await response.json();
    } catch { return fail('Hesaplama servisine erişilemiyor.',503); }
    const id=crypto.randomUUID();
    if (!body.ggo) {
      await env.DB.prepare('INSERT INTO actuarial_calculations (id, user_id, title, input_json, data_json, result_json, baseline_version, data_revision, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id,user.id,String(body.input?.magdur || 'Aktüerya hesabı').slice(0,160),JSON.stringify(body.input),JSON.stringify(data),JSON.stringify(engine),baseline.version,s.revision,Date.now()).run();
    }
    return reply({id,result:engine,revision:s.revision,baselineVersion:baseline.version,source:baseline.source});
  }
  if (route==='/archive' && request.method==='GET') {
    const {results}=await env.DB.prepare('SELECT id, title, data_revision, baseline_version, created_at FROM actuarial_calculations WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').bind(user.id).all();
    return reply({calculations:results});
  }
  if (route.startsWith('/archive/') && ['GET','DELETE'].includes(request.method)) {
    const id=route.slice(9);
    if (request.method==='DELETE') { await env.DB.prepare('DELETE FROM actuarial_calculations WHERE id = ? AND user_id = ?').bind(id,user.id).run(); return reply({ok:true}); }
    const row=await env.DB.prepare('SELECT * FROM actuarial_calculations WHERE id = ? AND user_id = ?').bind(id,user.id).first();
    if (!row) return fail('Hesap bulunamadı.',404);
    return reply({id:row.id,input:JSON.parse(row.input_json),data:JSON.parse(row.data_json),result:JSON.parse(row.result_json),baselineVersion:row.baseline_version,revision:row.data_revision,createdAt:row.created_at});
  }
  return fail('İstek bulunamadı.',404);
}
