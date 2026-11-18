"""Normalize read-only CloudKit export + authoritative native seed. Never writes CloudKit."""
import hashlib, json, sys
from pathlib import Path

seed_path, cloud_path = map(Path, sys.argv[1:3])
seed = json.loads(seed_path.read_text())
cloud = json.loads(cloud_path.read_text())
params = {row['key']: json.loads(row['value']) for row in cloud['parameters']}
data = seed['data']
def text(v):
    if v is None: return ''
    if isinstance(v, (float, int)): return str(v).replace('.', ',')
    return str(v)
def mapped(key, mapping):
    return [{out: text(row.get(inp,'')) for out,inp in mapping.items()} for row in params[key]]
data['asgariUcret'] = mapped('asgariSeed', {'baslangic':'s','bitis':'e','brut':'b','net':'n'})
data['yasalFaiz'] = mapped('yasalFaizSeed', {'baslangic':'s','bitis':'e','oran':'oran','dayanak':'dayanak'})
for table,key in [('yasamTablolari','hayatTablolariSeed'),('dulEsEvlenme','dulEsEvlenmeSeed'),('meslekler','mesleklerSeed'),('tuikIlkEvlenmeYasi','tuikIlkEvlenmeYasiSeed'),('damgaVergisi','damgaVergisiSeed')]:
    data[table] = [{k:text(v) for k,v in row.items()} for row in params[key]]
data['gelirVergisiYemekIstisnasi'] = mapped('yemekIstisnaSeed', {'baslangic':'s','bitis':'e','gunluk':'gunluk','aylik':'aylik','yil_donem':'yil_donem'})
agi = {'yil':'year','donem':'period','bekar':'bekar','evli_es_c_yok':'ec0'}
for i in range(1,6): agi['evli_es_c_yok_'+str(i)]='ec'+str(min(i,4))
for i in range(6): agi['evli_es_c_var_'+str(i)]='ew'+str(i)
data['agiTablosu'] = mapped('agiTablosuSeed', agi)
# CloudKit tax export contains 190 where the native editable table has 190.000,
# and zero upper limits. Quarantine the export; never guess a multiplier.
warnings = [{'table':'gelirVergisiDilimleri','reason':'CloudKit sınırları macOS teknik tablosuyla uyuşmuyor; 190.000 → 190 ve bazı sınırlar → 0. macOS teknik tablosu korundu.'}, {'table':'damgaVergisi','reason':'CloudKit genel damgaBinde=6; tarihli macOS/CloudKit tablosu 1998–2099 için 7,59. GGO tarihli tabloyu kullanır.'}]
for table,rows in data.items():
    for index,row in enumerate(rows): row['_id']=hashlib.sha256((table+':'+str(index)+':'+json.dumps(row,sort_keys=True)).encode()).hexdigest()[:24]
payload={'data':data,'source':{'kind':'cloudkit-synced-cache','container':'iCloud.com.sirket.aktuer','database':'public','cloudSyncedAt':cloud['generatedAt'],'nativeCommit':seed['source_commit'],'warnings':warnings,'liveVerified':False}}
payload['version']=hashlib.sha256(json.dumps(payload,sort_keys=True).encode()).hexdigest()
dest=Path(__file__).resolve().parents[1]/'worker/actuarial/baseline.json'
dest.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
archive=dest.parent/'cloudkit-export.json'
archive.write_text(json.dumps(cloud,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'tables':len(data),'rows':sum(map(len,data.values())),'version':payload['version'],'warnings':warnings},ensure_ascii=False))
