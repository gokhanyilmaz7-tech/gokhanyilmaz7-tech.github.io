import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {actuarialAPI} from '../../worker/actuarial/api.js';
import {parseNumber,validateRows} from '../../worker/actuarial/schema.js';
import {defaults} from '../../src/actuarial/fields.js';
const origin='https://www.isg-mevzuat-rehberi.com.tr';
function db() {
  const sql=new DatabaseSync(':memory:');
  sql.exec('PRAGMA foreign_keys=ON; CREATE TABLE users(id TEXT PRIMARY KEY); INSERT INTO users VALUES (\'a\'),(\'b\');');
  sql.exec(readFileSync(new URL('../../worker/migrations/0011_actuarial_private_data.sql',import.meta.url),'utf8'));
  return {sql,prepare(query){return {bind(...args){const statement=sql.prepare(query);return {async first(){return statement.get(...args) || null;},async all(){return {results:statement.all(...args)};},async run(){return statement.run(...args);}};}};}};
}
const req=(path,method='GET',body)=>new Request(origin+'/api/aktuerya'+path,{method,headers:{origin,'content-type':'application/json'},body:body===undefined ? undefined : JSON.stringify(body)});
test('Türkçe sayılar native parser ile aynı biçimde okunur',()=>{assert.equal(parseNumber('190.000'),190000);assert.equal(parseNumber('33.030'),33030);assert.equal(parseNumber('1.953,31'),1953.31);assert.equal(parseNumber('0,019533'),.019533);assert.equal(parseNumber('NaN'),null);assert.equal(parseNumber('1e99'),null);});
test('Oturumsuz tüm teknik veri ve hesap uçları engellenir',async()=>{for(const path of ['/data','/calculate','/archive','/data/asgariUcret'])assert.equal((await actuarialAPI(req(path),{},null)).status,401);});
test('Kişisel ekleme düzenleme ve silme başka kullanıcıya yansımaz; boş tablo boş kalır',async()=>{
  const DB=db(),env={DB};const a={id:'a'},b={id:'b'};
  const original=await (await actuarialAPI(req('/data'),env,a)).json();
  const rows=structuredClone(original.data.asgariUcret);rows.at(-1).net='99.999,99';rows.shift();rows.push({_id:'new-row-12345',baslangic:'01/01/2027',bitis:'31/12/2027',brut:'100.000',net:'85.000'});
  const body={rows,revision:0,baselineVersion:original.baselineVersion,user_id:'b'};
  assert.equal((await actuarialAPI(req('/data/asgariUcret','PUT',body),env,a)).status,200);
  const privateA=await (await actuarialAPI(req('/data'),env,a)).json(), untouchedB=await (await actuarialAPI(req('/data'),env,b)).json();
  assert.deepEqual(privateA.data.asgariUcret,rows);assert.deepEqual(untouchedB.data.asgariUcret,original.data.asgariUcret);assert.equal(untouchedB.revision,0);
  assert.equal((await actuarialAPI(req('/data/asgariUcret','PUT',body),env,a)).status,409);
  assert.equal((await actuarialAPI(req('/data/asgariUcret','PUT',{...body,revision:1,rows:[]}),env,a)).status,200);
  assert.deepEqual((await (await actuarialAPI(req('/data'),env,a)).json()).data.asgariUcret,[]);
  assert.equal((await actuarialAPI(req('/calculate','POST',{revision:2,baselineVersion:original.baselineVersion,input:{}}),env,a)).status,422);
  assert.equal((await actuarialAPI(req('/data/asgariUcret','DELETE',{revision:2,baselineVersion:original.baselineVersion}),env,a)).status,200);
  assert.deepEqual((await (await actuarialAPI(req('/data'),env,a)).json()).data.asgariUcret,original.data.asgariUcret);
});
test('Aynı sürümle eşzamanlı kayıtlardan yalnızca biri başarılı olur',async()=>{
  const env={DB:db()},user={id:'a'};const data=await (await actuarialAPI(req('/data'),env,user)).json();
  const body={rows:data.data.meslekler,revision:0,baselineVersion:data.baselineVersion};
  const responses=await Promise.all([actuarialAPI(req('/data/meslekler','PUT',body),env,user),actuarialAPI(req('/data/meslekler','PUT',body),env,user)]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
});
test('Başka origin ve geçersiz satırlar veritabanına yazamaz',async()=>{
  const env={DB:db()},user={id:'a'};const data=await (await actuarialAPI(req('/data'),env,user)).json();
  const body={revision:0,baselineVersion:data.baselineVersion,rows:[{_id:'bad-row-12345',baslangic:'31/02/2026',bitis:'31/12/2026',brut:'NaN',net:'1'}]};
  assert.equal((await actuarialAPI(req('/data/asgariUcret','PUT',body),env,user)).status,400);
  const foreign=new Request(origin+'/api/aktuerya/data/meslekler',{method:'PUT',headers:{origin:'https://evil.example'},body:JSON.stringify(body)});
  assert.equal((await actuarialAPI(foreign,env,user)).status,403);
  assert.equal(env.DB.sql.prepare('SELECT COUNT(*) AS n FROM actuarial_user_data').get().n,0);
});
test('Hesap eski teknik veri sürümüyle çalışmaz; arşiv kullanıcıya aittir',async()=>{
  const env={DB:db()},a={id:'a'},b={id:'b'};const data=await (await actuarialAPI(req('/data'),env,a)).json();
  assert.equal((await actuarialAPI(req('/calculate','POST',{revision:1,baselineVersion:data.baselineVersion}),env,a)).status,409);
  env.DB.sql.prepare('INSERT INTO actuarial_calculations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run('test-id','a','Test','{}','{}','{}',data.baselineVersion,0,Date.now());
  assert.equal((await actuarialAPI(req('/archive/test-id'),env,b)).status,404);
  await actuarialAPI(req('/archive/test-id','DELETE',{}),env,b);
  assert.equal((await actuarialAPI(req('/archive/test-id'),env,a)).status,200);
  assert.equal((await (await actuarialAPI(req('/archive'),env,b)).json()).calculations.length,0);
  env.DB.sql.prepare('DELETE FROM users WHERE id = ?').run('a');
  assert.equal(env.DB.sql.prepare('SELECT COUNT(*) AS n FROM actuarial_calculations').get().n,0);
});
test('Teknik tablolarda yinelenen yaşam yaşı reddedilir',()=>{const row={_id:'life-row-123',tablo:'TRH-2010 Erkek',yas:'20',ex:'50'};assert.throws(()=>validateRows('yasamTablolari',[row,{...row,_id:'life-row-234'}]),/yinelenemez/);});
test('Hesap kişisel teknik veriyi kullanır ve arşiv anlık görüntüsü değişmez',async()=>{
  const env={DB:db()},a={id:'a'},b={id:'b'},input={...defaults,dogumTarihi:'1990-01-15',kazaTarihi:'2023-06-22',hesapTarihi:'2026-10-03'};
  const initial=await (await actuarialAPI(req('/data'),env,a)).json();
  const calculate=(user,revision)=>actuarialAPI(req('/calculate','POST',{input,revision,baselineVersion:initial.baselineVersion}),env,user);
  const initialResponse=await calculate(a,0);assert.equal(initialResponse.status,200);const initialResult=await initialResponse.json();
  const rows=structuredClone(initial.data.asgariUcret);rows.at(-1).net='99.999,99';
  assert.equal((await actuarialAPI(req('/data/asgariUcret','PUT',{rows,revision:0,baselineVersion:initial.baselineVersion}),env,a)).status,200);
  const changed=await (await calculate(a,1)).json(),untouched=await (await calculate(b,0)).json();
  assert.notEqual(changed.result.summary.netTazminat,initialResult.result.summary.netTazminat);
  assert.equal(untouched.result.summary.netTazminat,initialResult.result.summary.netTazminat);
  const archived=await (await actuarialAPI(req('/archive/'+initialResult.id),env,a)).json();
  assert.deepEqual(archived.data.asgariUcret,initial.data.asgariUcret);
  assert.equal(archived.result.summary.netTazminat,initialResult.result.summary.netTazminat);
  assert.equal((await actuarialAPI(req('/archive/'+initialResult.id),env,b)).status,404);
});
