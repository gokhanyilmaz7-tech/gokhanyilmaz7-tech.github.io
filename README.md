# Mevzuat Rehberi

Dayanaklar (Genel) PDF'sindeki 35 mevzuatı tarayıcıda seçilebilir, aranabilir ve kopyalanabilir şekilde sunan yerel Vite uygulaması. Mevzuat içerikleri PDF görüntüsü olarak değil, ayrı sekmede okunabilir HTML metni olarak açılır.

## Çalıştırma

```bash
npm install
npm run dev
```

PDF ve `manifest.json`, uygulamayı hazırlarken `public/` klasörüne konur. PDF güncellenirse:

```bash
npm run extract:manifest
```

Ardından `npm run dev` ile uygulamayı açın.

## Yönetici girişi

Apple ile herkes hesap açıp giriş yapabilir. Yönetici paneli yalnızca Apple ile doğrulanmış `gokhanyilmaz7@icloud.com` hesabına açılır; normal kullanıcılar `/admin.html` sayfasını ve yönetici paneli bağlantısını göremez.

Apple Sign in with Apple yapılandırması için Cloudflare Worker ortam değişkenleri gerekir. Gerçek özel anahtarı kaynak koda veya sohbete eklemeyin; yerelde `.dev.vars`, Cloudflare'da ise gizli Worker değişkenleri olarak tanımlayın. Örnek değişkenler `.dev.vars.example` dosyasındadır. Apple Developer hesabındaki Services ID için callback adresi, kullandığınız HTTPS alan adıyla aynı olmalıdır.
