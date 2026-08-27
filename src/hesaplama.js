import './styles.css';

const app = document.querySelector('#hesaplama-app');
app.innerHTML = `
  <header class="article-topbar">
    <a class="back-link" href="/">← Ana sayfaya dön</a>
    <span class="topbar-label">İSG SÜRE HESAPLAMA</span>
  </header>
  <main class="favorites-layout" style="display: flex; justify-content: center; padding: 2rem;">
    <section class="favorites-card" style="max-width: 600px; width: 100%;">
      <div class="article-heading">
        <p class="eyebrow report-context">İSG UZMANI, HEKİMİ & DSP</p>
        <h2 style="font-size: 1.5rem; margin-bottom: 2rem; color: #1a2b4b;">Zorunlu Çalışma Süresi Hesaplama</h2>
      </div>
      
      <div style="display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 2rem;">
        <div>
          <label style="display: block; font-weight: 600; color: #334e68; margin-bottom: 0.5rem;">İşyeri Tehlike Sınıfı</label>
          <select id="calc-hazard" style="width: 100%; padding: 0.8rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; color: #1a2b4b; background: white; outline: none;">
            <option value="az">Az Tehlikeli</option>
            <option value="tehlikeli">Tehlikeli</option>
            <option value="cok">Çok Tehlikeli</option>
          </select>
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334e68; margin-bottom: 0.5rem;">Çalışan Sayısı</label>
          <input type="number" id="calc-count" min="1" placeholder="Örn: 250" style="width: 100%; padding: 0.8rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; color: #1a2b4b; outline: none;" />
        </div>
        <button id="calc-btn" style="padding: 1rem; background: #2e67d2; color: white; border: none; border-radius: 8px; font-size: 1.05rem; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(46,103,210,0.2); transition: background 0.2s;">Hesapla</button>
      </div>

      <div id="calc-results" style="display: none; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem;"></div>
    </section>
  </main>
`;

document.getElementById('calc-btn').addEventListener('click', () => {
  const hazard = document.getElementById('calc-hazard').value;
  const count = parseInt(document.getElementById('calc-count').value, 10);
  const resultsDiv = document.getElementById('calc-results');

  if (isNaN(count) || count < 1) {
    alert('Lütfen geçerli bir çalışan sayısı girin.');
    return;
  }

  // --- İŞ GÜVENLİĞİ UZMANI ---
  // Az Tehlikeli: 10 dk / tehlikeli: 20 dk / çok tehlikeli: 40 dk
  // Tam zamanlı sınır: az: 1000, tehlikeli: 500, cok: 250
  
  let uzmanDakika = 10;
  let uzmanTamSiniri = 1000;
  
  // --- İŞYERİ HEKİMİ ---
  // Az: 5 dk / tehlikeli: 10 dk / cok: 15 dk
  // Tam zamanlı: az: 2000, tehlikeli: 1000, cok: 750
  let hekimDakika = 5;
  let hekimTamSiniri = 2000;

  // --- DİĞER SAĞLIK PERSONELİ (DSP) ---
  let dspDakika = 0;

  if (hazard === 'tehlikeli') {
    uzmanDakika = 20; uzmanTamSiniri = 500;
    hekimDakika = 10; hekimTamSiniri = 1000;
  } else if (hazard === 'cok') {
    uzmanDakika = 40; uzmanTamSiniri = 250;
    hekimDakika = 15; hekimTamSiniri = 750;
    
    // Sadece cok tehlikeli ve 10 veya daha fazla calisan
    if (count >= 10 && count <= 49) dspDakika = 10;
    else if (count >= 50 && count <= 249) dspDakika = 15;
    else if (count >= 250) dspDakika = 20;
  }

  // Formatter functions
  function formatTime(totalMinutes, fullTimeLimit) {
    const fullTimeCount = Math.floor(count / fullTimeLimit);
    const remainingWorkers = count % fullTimeLimit;
    const remainingMinutes = remainingWorkers * totalMinutes;

    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;

    let res = '';
    if (fullTimeCount > 0) {
      res += `<strong>${fullTimeCount} adet Tam Zamanlı</strong> `;
      if (remainingWorkers > 0) res += ' + ';
    }
    
    if (remainingWorkers > 0 || fullTimeCount === 0) {
      res += `${hours} saat ${minutes} dakika`;
    }
    
    return res;
  }

  let dspText = "Gerekmiyor (Sadece Çok Tehlikeli sınıfta 10 ve üzeri çalışanda zorunludur)";
  if (dspDakika > 0) {
    // DSP için tam zamanlı bir sınır direkt yönetmelikte uzman ve hekim gibi bölünmez, fakat tam günden fazla çıkarsa hesaplanır
    // Genel olarak dakika hesabı verilir. 1 tam zamanlı = haftalık 45 saat = ayda min 11700 dk'dır (aylık ort. 195 saat)
    // Ama genelde DSP'de tam zamanlı hesap aranmayabilir. Biz yine standart hesabı verelim.
    let totalDsp = count * dspDakika;
    const dspHours = Math.floor(totalDsp / 60);
    const dspMins = totalDsp % 60;
    // DSP için tam zamanlılık sınırı yönetmelikte ayrıntılı belirtilir fakat genelde direkt saat verilir.
    dspText = `${dspHours} saat ${dspMins} dakika`;
  }

  resultsDiv.style.display = 'block';
  resultsDiv.innerHTML = `
    <h3 style="margin-top: 0; color: #1a2b4b; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; margin-bottom: 1rem;">Hesaplama Sonuçları</h3>
    
    <div style="margin-bottom: 1rem;">
      <div style="font-weight: 600; color: #4a5568; margin-bottom: 0.25rem;">👷 İş Güvenliği Uzmanı:</div>
      <div style="color: #2b6cb0; font-size: 1.1rem;">${formatTime(uzmanDakika, uzmanTamSiniri)}</div>
      <div style="font-size: 0.85rem; color: #718096; margin-top: 0.25rem;">(Çalışan başına ayda ${uzmanDakika} dakika)</div>
    </div>
    
    <div style="margin-bottom: 1rem;">
      <div style="font-weight: 600; color: #4a5568; margin-bottom: 0.25rem;">🩺 İşyeri Hekimi:</div>
      <div style="color: #2b6cb0; font-size: 1.1rem;">${formatTime(hekimDakika, hekimTamSiniri)}</div>
      <div style="font-size: 0.85rem; color: #718096; margin-top: 0.25rem;">(Çalışan başına ayda ${hekimDakika} dakika)</div>
    </div>
    
    <div>
      <div style="font-weight: 600; color: #4a5568; margin-bottom: 0.25rem;">💉 Diğer Sağlık Personeli (DSP):</div>
      <div style="color: #2b6cb0; font-size: 1.1rem;">${dspText}</div>
      ${dspDakika > 0 ? `<div style="font-size: 0.85rem; color: #718096; margin-top: 0.25rem;">(Çalışan başına ayda ${dspDakika} dakika)</div>` : ''}
    </div>
  `;
});
