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
