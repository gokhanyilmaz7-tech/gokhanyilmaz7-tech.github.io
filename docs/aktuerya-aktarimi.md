# Aktüerya aktarımı — 3 Ekim 2026

## Kapsam ve kaynak

Yalnızca Aktüerya (İGT, DYKT, GGO) aktarılır. SGK ve İş Hukuku uygulama modülleri aktarılmaz; aktüerya hesabındaki SGK/PSD ödemeleri ve rücu hesapları kapsam içindedir.

Yetkili formül kaynağı `AKTUER` macOS deposu, commit `05c56d75eda1b485061878d44c0f8211cab663bd`. `actuarial-service/source-manifest.json` ana motor, GGO görünümü ve sayı biçimlendiricisinin SHA-256 değerlerini içerir. Bu klasör yalnızca karşılaştırma aracıdır; canlı sunucuda Swift servisi kullanılmaz. Eski `AKT ver 1.0` web projesinin formülleri kullanılmadı.

Ücretsiz mimari: mevcut Vite çok sayfalı site → mevcut Cloudflare Worker → mevcut D1. `/aktuerya.html` ve `/api/aktuerya/*` sunucuda onaylı kullanıcı oturumu ister. Statik HTML için `assets.run_worker_first` uygulanır; istemci tarafında da sayfa korunur. Yeni ücretli hizmet, abonelik veya konteyner yoktur. Mevcut ücretsiz hizmetlerin kullanım kotaları geçerlidir.

## Veri akışı ve kullanıcı ayrımı

Başlangıç teknik verileri `worker/actuarial/baseline.json` içinde sunucu tarafındadır. Açılır sidebarın 10 tablosunda 1.710 satır vardır. Yaşam tabloları 13 ayrı tablodur.

CloudKit `iCloud.com.sirket.aktuer` public veritabanı 3 Ekim 2026 11:52:53 Türkiye saatinde yalnızca okundu. Aktüerya alanındaki 1 RuleSet, 16 RuleParameter ve 2 Formula dışa aktarıldı. `cloudkit-export.json` ham aktarımı korur. Giriş bilgisi, oturum veya diğer kullanıcı verileri bu dışa aktarımda bulunmaz. CloudKit'e hiçbir kayıt yazılmadı veya silinmedi.

`scripts/export-cloudkit-readonly.swift` canlı salt okunur dışa aktarım aracıdır; CloudKit yetkileri olan, aynı uygulama kimliği ve geçerli provisioning profile ile imzalanmış macOS paketinde çalıştırılır. `scripts/import-actuarial-data.py` dışa aktarımı normalize eder, geçerli kural setini sürüm/tarih sırasıyla seçer ve veri sürümünün hash'ini üretir.

Kişisel düzenleme tüm kullanıcılar için açıktır. İstekten kullanıcı kimliği alınmaz: kimlik doğrulanmış oturumdan türetilir. `actuarial_user_data.user_id` kullanıcıya bağlı tek kaydı taşır. Yalnızca düzenlenen tablolar kişisel kopyaya alınır; ekleme, düzeltme ve satır silme başka hesapları etkilemez. Boş olarak kaydedilen tablo boş kalır; sessizce başlangıç verisine dönülmez. Gereken tablo boşsa hesap reddedilir.

Sidebar kaydetme işlemleri `revision` ile karşılaştırmalı güncelleme yapar. Aynı sürümü iki sekme kaydetmeye çalışırsa yalnızca biri başarılı olur; diğeri 409 alır. Başlangıç verisi değişmişse eski istemci sürümü de 409 alır. Kişisel kopyalar sonraki ortak veri aktarımında korunur; başlangıç verisine dönme kullanıcı tarafından seçili tablo için açıkça yapılır.

Hesap API'si tarayıcıdan teknik tablo kabul etmez. Sunucu kullanıcının kayıtlı teknik verisini okur ve beklenen sürümü doğrular. Sonuç, girdiler, kullanılan tabloların tamamı, başlangıç sürümü ve kişisel sürüm birlikte `actuarial_calculations` içinde kaydedilir. Önceki hesabın anlık görüntüsü sonraki teknik veri değişikliklerinden etkilenmez. Arşiv okuma ve silme sorguları hem hesap kimliği hem kullanıcı kimliğiyle sınırlandırılır. Kullanıcı silindiğinde kişisel veriler FK cascade ile silinir.

## Hesaplama sadakati

`worker/actuarial/engine.js` ana Swift motorunun JavaScript aktarımıdır. `math.js` tarih, ömür, asgari ücret, dönem bölme, ara yuvarlama ve faiz işlemlerini; `ggo.js` aylık ücret/istisna/vergi ve netten brüte işlemlerini içerir. Referans Swift motorunun hesap gövdesi kaynakla birebir aynı tutulmuştur.

İGT: geçici ve sürekli iş göremezlik, aktif/pasif işlemiş/işleyecek dönemler, belgeli/belgesiz bakıcı, bordro dönemleri, farklı PR artış/iskonto oranları, teknik faiz, askerlik tenzili, kusur, 5510/23 hakkaniyet, PSD/rücu tavanları, trafik tavanı karşılaştırması ve davalıya/alıcıya bağlı peşin mahsuplar aktarılmıştır.

DYKT: eş/çocuk/anne/baba payları, destek giriş-çıkış sınırları, özel çıkış, bekâr için farazi eş/çocuklar, TÜİK ilk evlenme yaşı, yetiştirme giderleri, dul eş yeniden evlenme tenzili, çocuk başına indirim, alıcıya bağlı ödemeler ve davalı dağılımları aktarılmıştır.

GGO: aylık kümülatif vergi, yemek SGK/GV istisnaları, nakdi/ayni ek gelir, AGİ, asgari ücret istisnası, aylık/yıllık GGO ve netten brüte arama aktarılmıştır. Kaynakta bulunmayan yılın vergi dilimleri sessizce başka yıldan alınmaz; kullanıcıya eksik tablo hatası verilir.

Ara tutarlar ve ay değerleri Swift'teki işlem sırasıyla iki basamağa yuvarlanır. Gün hesabı dahilidir. İstanbul tarihleri ve tarihsel saat dilimi değişimleri dönem ortası hesabında korunur. Para alanlarında tolerans kullanılmadan birebir karşılaştırma yapılır; yalnızca iskonto katsayısı ve ham GGO oranında 1e-12 tolerans kullanılır.

## Kaynakta tespit edilen uyuşmazlıklar

1. Canlı CloudKit gelir vergisi sınırlarında Türkçe binlik yazımı yanlış aktarılmış: örneğin 190.000 → 190; bazı büyük sınırlar → 0. Bu ham aktarım korunur, hesap tablosuna alınmaz. MacOS ortak teknik veri tablosunun sınırları kullanılır. Bu seçim resmi mevzuata uygunluk denetimi yerine geçmez.
2. CloudKit genel `damgaBinde=6` ile tarihli damga tablosundaki 7,59 farklıdır. GGO kullanıcıya ait tarihli damga tablosunu kullanır.
3. Yaşam/TÜİK/dul eş/gelir verileri artık kişisel kayıtlı tablolardan okunur. MacOS'ta bazıları doğrudan sabit seed'e bağlıydı; kullanıcının talebi doğrultusunda bu veri bağlantısı değiştirilmiştir.
4. Askerlik seçimleri kaynak motorun tanıdığı değerlerle gönderilir (`ÖğrenimDurumunaGöreTecil`, `KazaTarihinde20`); görünür metinler Türkçedir. Hesap formülünün kendisi değişmez.
5. CloudKit'teki iki genel ifade ana Swift motorunun güncel mahsup sırasıyla aynı değildir. Ana motor esas alındı; bu ifadeler değerlendirmede çalıştırılmaz, ham kaynak olarak saklanır.

## Kullanım

Ana sayfa Aktüerya → üye girişi → tazminat hesabı. Teknik veriler düğmesi sağdan açılır; tablo seçme, arama, sayfalama, satır ekleme/silme, kaydetme ve seçili tabloyu sıfırlama vardır. Kaydedilmemiş değişikliklerle hesap çalıştırılmaz. Arşivden eski sonucu görüntüleme ve girdileri yeni hesaba alma vardır. PDF/yazdırma, dönem tabloları CSV ve tüm hesap JSON dışa aktarımı bulunur.

## Doğrulama ve tekrar çalıştırma

```sh
sh actuarial-service/build.sh
node --test tests/actuarial/parity.test.js tests/actuarial/private-data.test.js tests/google-auth.test.js
npm run build
```

Swift karşılaştırması İGT, DYKT, GGO, netten brüte, 13 yaşam tablosu ve kişisel veri değişikliğini kapsar. Para alanlarının tamamı, her dönem satırı, destek/davalı payları, mahsuplar ve toplamlar karşılaştırılır. SQLite ile kullanıcı ayrımı, çakışan kaydetme, boş kişisel tablo, arşiv sahipliği ve hesap anlık görüntüsü test edilir.

Tarayıcı kontrolü mevcut Chrome + Playwright ile yapılmıştır; Browser eklentisi bu oturumda yoktur. Yerel gerçek Worker + D1 üzerinde 1440×1000 ve 390×844 boyutlarında iki bağımsız oturumla test edildi. Ekleme, düzeltme, silme, kaydetme, hesaplama, GGO, arşiv, oturumsuz erişim ve yatay taşma kontrol edildi. Üretimde Google/Apple oturum açma, kullanıcı kendi hesabıyla son kez kontrol etmelidir; OAuth yapılandırması değiştirilmedi.

## Yayınlama

Önce 0011 D1 migration (iki yeni tablo ve indeks), sonra mevcut Worker/statik site yayınlanır. Yeni bir hesaplama hizmeti veya gizli anahtar gerekmemektedir. Mevcut veritabanı tabloları değiştirilmez.

```sh
npx wrangler d1 migrations apply mevzuatrehberi --remote
npx wrangler deploy
```

Graphify kod grafiği ve semantik aktarım belgeleri korunur ve güncellenir; Graphify izleyicisi aktif proje için açık bırakılır.
