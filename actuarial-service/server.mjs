import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {createHash,timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const secret=process.env.ACTUARIAL_ENGINE_TOKEN;
if (!secret || secret.length<32) throw new Error('ACTUARIAL_ENGINE_TOKEN en az 32 karakter olmalı.');
const hash=s=>createHash('sha256').update(s).digest();
let running=0;
const server=createServer(async (req,res)=>{
  const send=(status,body)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(body));};
  if (!timingSafeEqual(hash(req.headers.authorization || ''),hash('Bearer '+secret))) return send(401,{error:'Unauthorized'});
  if (req.method==='GET' && req.url==='/health') return send(200,{ok:true,engine:'native-swift'});
  if (req.method!=='POST' || req.url!=='/calculate') return send(404,{error:'Not Found'});
  if (running>=4) return send(503,{error:'Busy'});
  let size=0, chunks=[];
  try { for await (const chunk of req) { size+=chunk.length; if(size>2000000) return send(413,{error:'Payload too large'}); chunks.push(chunk); } } catch { return send(400,{error:'Invalid request'}); }
  const raw=Buffer.concat(chunks);
  let body;
  try { body=JSON.parse(raw); } catch { return send(422,{error:'Invalid input'}); }
  if (!body.data || (!body.input && !body.ggo)) return send(422,{error:'Missing input'});
  // Validate bounds before invoking Swift; calculations cannot loop over arbitrary centuries.
  if (body.input) {
    const input=body.input;
    const dates=['kazaTarihi','hesapTarihi','dogumTarihi'];
    if (dates.some(k=>!/^\d{4}-\d{2}-\d{2}$/.test(input[k]||'') || input[k]<'1900-01-01' || input[k]>'2100-12-31') || input.dogumTarihi>input.kazaTarihi || input.kazaTarihi>input.hesapTarihi) return send(422,{error:'Invalid dates'});
    if (!['igt','dykt'].includes(input.calculationMode) || !Number.isInteger(input.emeklilikYasi) || input.emeklilikYasi<18 || input.emeklilikYasi>100) return send(422,{error:'Invalid selection'});
    for (const key of ['davalilar','destekGorenler','pesinOdemeler','sgkOdemeler','trafikOdemeler','bordroluUcretler']) if (!Array.isArray(input[key]) || input[key].length>100) return send(422,{error:'Invalid rows'});
    for (const key of ['eksiltmeOrani','artisOrani','progresifRantIskontoOrani','surekliMaluliyetOrani','magdurKusur']) if (!Number.isFinite(input[key]) || input[key]<0 || input[key]>100) return send(422,{error:'Invalid percentage'});
    if (!Number.isFinite(input.ggoDegeri) || input.ggoDegeri<0 || input.ggoDegeri>1000) return send(422,{error:'Invalid GGO'});
  }
  if (body.ggo && (!Number.isInteger(body.ggo.year) || body.ggo.year<1996 || body.ggo.year>2100 || !Number.isFinite(body.ggo.brut) || body.ggo.brut<0 || body.ggo.brut>1e9)) return send(422,{error:'Invalid GGO input'});
  const child=spawn(fileURLToPath(new URL('./bin/actuarial-engine',import.meta.url)),[],{stdio:['pipe','pipe','ignore'],env:{...process.env,TZ:'Europe/Istanbul'}});
  running++;
  const timer=setTimeout(()=>child.kill(),20000);
  let output=[],bytes=0,finished=false;
  child.stdout.on('data',chunk=>{bytes+=chunk.length; if(bytes>5000000) child.kill(); else output.push(chunk);});
  const finish=(code)=>{if(finished)return;finished=true;clearTimeout(timer);running--;if(code!==0)return send(422,{error:'Calculation rejected'});try{send(200,JSON.parse(Buffer.concat(output)));}catch{send(503,{error:'Engine unavailable'});}};
  child.on('error',()=>finish(1));
  child.on('close',finish);
  child.stdin.on('error',()=>{});
  child.stdin.end(raw);
});
server.requestTimeout=30000;
server.listen(Number(process.env.PORT || 8790),process.env.HOST || '127.0.0.1',()=>console.log('Swift actuarial service ready'));
