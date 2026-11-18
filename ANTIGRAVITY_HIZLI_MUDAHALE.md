# İSG Mevzuat Rehberi (`isg-mevzuat-rehberi.com.tr`) — Antigravity Hızlı Müdahale Rehberi

> **Ajan Talimatı:** Kullanıcı bu dosyayı sohbete eklediğinde sıfırdan proje keşfi veya `find`/`grep` taraması yaparak vakit kaybetme. Aşağıdaki dosya yollarını, fonksiyon/değişken adlarını ve tek satırlık deploy/doğrulama komutlarını doğrudan kullan.

---

## 1. Genel Mimari ve Erişim Bilgileri

- **Canlı Site:** `https://www.isg-mevzuat-rehberi.com.tr` (Aktüerya: `/aktuerya`, Yönetici Paneli: `/admin.html`)
- **Cloudflare Worker Adı:** `mevzuatrehberi`
- **Cloudflare Account ID:** `08a4d0296335d4cc0d655dbd4d694988`
- **Cloudflare D1 Veritabanı:** `mevzuatrehberi` (ID: `f826a842-a4d9-4f51-a623-77913c985445`)
- **GitHub Deposu:** `https://github.com/gokhanyilmaz7-tech/gokhanyilmaz7-tech.github.io` (Branch: `main`)
- **Aktif Çalışma ve Dağıtım Dizini:** `/Users/gokhanyilmaz7/.gemini/antigravity/scratch/mevzuatrehberi`

---

## 2. Doğrudan Düzenlenecek Canlı Dosyalar

Canlı site **`wrangler-release.toml`** üzerinden doğrudan aşağıdaki derlenmiş/hazır varlıkları kullanır (`--no-bundle` ile saniyeler içinde yayınlanır):

| Bileşen | Dosya Yolu | İçerik / Sorumluluk |
| :--- | :--- | :--- |
| **Wrangler Config** | `/Users/gokhanyilmaz7/.gemini/antigravity/scratch/mevzuatrehberi/wrangler-release.toml` | Worker, Assets (`./release`) ve D1 (`DB`) bağlamaları |
| **Backend Worker** | `/Users/gokhanyilmaz7/.gemini/antigravity/scratch/mevzuatrehberi/live-worker/index.js` | Tüm `/api/*` endpointleri, auth, admin işlemleri, aktüerya motoru (`calculateActuarial`, `calculateLegacy`, `calculateDYKT`, `calculateTBK55`, `shares`, `parameters`, `validateInput`) |
| **Aktüerya HTML** | `/Users/gokhanyilmaz7/.gemini/antigravity/scratch/mevzuatrehberi/release/aktuerya.html` | Aktüerya sayfası iskeleti, alt çubuk butonları (`Yazdır`, `PDF`, `Hesapla ve kaydet`), `#data-sidebar` (Teknik Veriler) |
| **Aktüerya JS** | `/Users/gokhanyilmaz7/.gemini/antigravity/scratch/mevzuatrehberi/release/assets/aktuerya-BZoRjSaC.js` | Ön yüz mantığı: Form şemaları (`be`, `ve`, `xe`, `Da`, `Ze`, `Aa`), satır render (`me`), rapor render (`Ue`), meslek arama, teknik veriler tablosu, CSV/JSON/PDF/Yazdır butonları |
| **Aktüerya CSS** | `/Users/gokhanyilmaz7/.gemini/antigravity/scratch/mevzuatrehberi/release/assets/aktuerya-Dg0CDBci.css` | Açık/Koyu tema stilleri, teknik veriler tablo ve tam ekran stilleri, alt çubuk mavi butonlar |
| **Yönetici JS** | `/Users/gokhanyilmaz7/.gemini/antigravity/scratch/mevzuatrehberi/release/assets/admin-ctdYK6i8.js` | Yönetici paneli kullanıcı onay/red/silme arayüzü |
| **Site Logosu** | `/Users/gokhanyilmaz7/.gemini/antigravity/scratch/mevzuatrehberi/release/aktuer-logo.png` | Sol üst marka logosu ve favicon (`144×144` şeffaf köşeli PNG) |

---

## 3. Hızlı Arama Referansları (Kod İçi Çapalar)

### Backend (`live-worker/index.js`)
- **Aktüerya Hesaplama Motoru:** `calculateActuarial`, `calculateLegacy`, `calculateDYKT`, `calculateTBK55`
- **Kusur / Rücu / Paylaşım:** `shares(ctx, summary, supports)` (`sgkCase`, `isRucu`, `icTavanOrani`, `sgkRucuTavanDagilimi`)
- **Rapor Parametreleri:** `parameters(ctx, retirement, end, exclusions)`
- **Girdi Doğrulama:** `validateInput(body, data)`
- **Yönetici Kullanıcı İşlemleri:** `adminUserAction(request, env, url)` (`parts[3]` = `targetId`, `parts[4]` = `action`)

### Frontend (`release/assets/aktuerya-BZoRjSaC.js`)
- **Varsayılan Girdiler ve Alan Şeması:** `be`, `ve`, `xe` (`pesinOdemeler`, `sgkOdemeler`, `trafikOdemeler`), `Da` (bölüm grupları), `Ze` (yardım metinleri), `Aa` (koşullu görünürlük)
- **Rapor Çıktısı & Özet Tablosu:** `Ue(e)` (`Hesaplama Parametreleri`, `Tazminat Özeti`, `Dış Tavan (PSD) - İç Tavan (Tazminat)`, `Davalı Bazında Dağılım`)
- **Sonuç Butonları:** `aa(e)` (`#bottom-report-actions`, `Tablolar CSV`, `Hesap JSON`, `isAdm` kontrolü)
- **Meslek Arama:** `profession-control` / `profession-results`
- **Geçici / Sürekli İG Otomatik Tarih:** `geciciIGVar`, `geciciBitis`, `surekliIGVar`, `surekliBaslangic`
- **Teknik Veriler Paneli:** `#data-sidebar`, `#fullscreen-data`, `#data-search`

---

## 4. Doğrulama, Canlıya Alma (Deploy) ve Test Komutları

> **Önemli:** Non-interactive zsh kabuğunda `node` `/usr/local/bin` altındadır. Ağ ve Cloudflare erişimi için komutları `BypassSandbox: true` ile çalıştır.

### 1) Sözdizimi Kontrolü (Her düzenleme sonrası mutlaka çalıştır)
```bash
/usr/local/bin/node --check /Users/gokhanyilmaz7/.gemini/antigravity/scratch/mevzuatrehberi/release/assets/aktuerya-BZoRjSaC.js && \
/usr/local/bin/node --check /Users/gokhanyilmaz7/.gemini/antigravity/scratch/mevzuatrehberi/live-worker/index.js && \
echo "SYNTAX_OK"
```

### 2) Tek Komutta Cloudflare Canlıya Alma (Deploy) + Safari Yenileme
```bash
cd /Users/gokhanyilmaz7/.gemini/antigravity/scratch/mevzuatrehberi && \
PATH="/usr/local/bin:$PATH" /Users/gokhanyilmaz7/.npm/_npx/32026684e21afda6/node_modules/.bin/wrangler deploy --config wrangler-release.toml --no-bundle --keep-vars && \
osascript -e 'tell application "Safari" to set URL of tab 1 of window 1 to "https://www.isg-mevzuat-rehberi.com.tr/aktuerya"'
```

### 3) Uzak D1 Veritabanı Sorgulama
```bash
cd /Users/gokhanyilmaz7/.gemini/antigravity/scratch/mevzuatrehberi && \
PATH="/usr/local/bin:$PATH" /Users/gokhanyilmaz7/.npm/_npx/32026684e21afda6/node_modules/.bin/wrangler d1 execute mevzuatrehberi --remote --config wrangler-release.toml --command "SELECT id, email, approval_status FROM users;"
```

### 4) GitHub Yedekleme / Push (`repo/` dizini)
Canlıdaki son dosyaları `repo/live-deploy/` ve `repo/public/` içine kopyalayıp GitHub'a göndermek için:
```bash
rsync -a --delete /Users/gokhanyilmaz7/.gemini/antigravity/scratch/mevzuatrehberi/release/ /Users/gokhanyilmaz7/.gemini/antigravity/scratch/mevzuatrehberi/repo/live-deploy/release/ && \
rsync -a --delete /Users/gokhanyilmaz7/.gemini/antigravity/scratch/mevzuatrehberi/live-worker/ /Users/gokhanyilmaz7/.gemini/antigravity/scratch/mevzuatrehberi/repo/live-deploy/live-worker/ && \
cp /Users/gokhanyilmaz7/.gemini/antigravity/scratch/mevzuatrehberi/wrangler-release.toml /Users/gokhanyilmaz7/.gemini/antigravity/scratch/mevzuatrehberi/repo/live-deploy/ && \
cp /Users/gokhanyilmaz7/.gemini/antigravity/scratch/mevzuatrehberi/ANTIGRAVITY_HIZLI_MUDAHALE.md /Users/gokhanyilmaz7/.gemini/antigravity/scratch/mevzuatrehberi/repo/ && \
cd /Users/gokhanyilmaz7/.gemini/antigravity/scratch/mevzuatrehberi/repo && \
git add -A && git commit -m "Canlı sürüm güncellemesi" && git push origin main
```
