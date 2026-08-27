import './styles.css';

// Kendi özel stillerimizi CSS modeline ekleyelim
const style = document.createElement('style');
style.textContent = `
.calc-container { max-width: 900px; margin: 0 auto; padding: 2rem 1rem; }
.hazard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem; margin-bottom: 2.5rem; }
.hazard-card { 
  background: white; border: 2px solid #e2e8f0; border-radius: 16px; padding: 1.5rem 1rem; text-align: center; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); 
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}
.hazard-card:hover { border-color: #cbd5e1; transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
.hazard-card.active-az { border-color: #10b981; background: #ecfdf5; box-shadow: 0 10px 20px -5px rgba(16,185,129,0.25); transform: translateY(-3px); }
.hazard-card.active-tehlikeli { border-color: #f59e0b; background: #fffbeb; box-shadow: 0 10px 20px -5px rgba(245,158,11,0.25); transform: translateY(-3px); }
.hazard-card.active-cok { border-color: #ef4444; background: #fef2f2; box-shadow: 0 10px 20px -5px rgba(239,68,68,0.25); transform: translateY(-3px); }

.hazard-title { font-weight: 700; font-size: 1.15rem; color: #1e293b; pointer-events: none; letter-spacing: -0.01em;}
.hazard-icon { font-size: 2.5rem; pointer-events: none; margin-bottom: 0.5rem;}
.hazard-card.active-az .hazard-title { color: #047857; }
.hazard-card.active-tehlikeli .hazard-title { color: #b45309; }
.hazard-card.active-cok .hazard-title { color: #b91c1c; }

.input-group { margin-bottom: 3rem; animation: fade-in-up 0.5s ease backwards; }
.input-group label { display: block; font-weight: 700; color: #334155; margin-bottom: 1.25rem; font-size: 1.2rem; text-align: center; }
.count-input-wrapper { position: relative; max-width: 350px; margin: 0 auto; display: flex; align-items: center; }
.count-input { 
  width: 100%; padding: 1.25rem; font-size: 2rem; font-weight: 800; text-align: center; 
  border: 2px solid #cbd5e1; border-radius: 16px; color: #0f172a; outline: none; transition: all 0.25s;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); background: white;
}
.count-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59,130,246,0.15); transform: scale(1.02); }

.calc-btn-container { text-align: center; margin-bottom: 3.5rem; animation: fade-in-up 0.6s ease backwards; }
.calc-btn { 
  padding: 1.25rem 4rem; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; border: none; 
  border-radius: 100px; font-size: 1.25rem; font-weight: 700; cursor: pointer; letter-spacing: 0.02em;
  box-shadow: 0 10px 25px -5px rgba(37,99,235,0.4), 0 8px 10px -6px rgba(37,99,235,0.1); 
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); 
}
.calc-btn:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 15px 35px -5px rgba(37,99,235,0.5), 0 10px 15px -5px rgba(37,99,235,0.2); }
.calc-btn:active { transform: translateY(0) scale(0.98); }

.results-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; opacity: 0; transform: translateY(30px); transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1); display: none; }
.results-grid.visible { opacity: 1; transform: translateY(0); display: grid; }

.result-card { 
  background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 2rem 1.5rem; 
  box-shadow: 0 10px 30px -5px rgba(0,0,0,0.05), 0 4px 10px -5px rgba(0,0,0,0.02); 
  position: relative; overflow: hidden; display: flex; flex-direction: column;
}
.result-card::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 6px; }
.card-uzman::before { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
.card-hekim::before { background: linear-gradient(90deg, #10b981, #34d399); }
.card-dsp::before { background: linear-gradient(90deg, #8b5cf6, #a78bfa); }

.res-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 1.25rem; }
.res-icon { font-size: 2rem; background: #f8fafc; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 16px; border: 1px solid #e2e8f0; }
.res-title { font-weight: 800; color: #0f172a; font-size: 1.2rem; line-height: 1.3; }

.res-data { display: flex; flex-direction: column; gap: 1.5rem; flex-grow: 1; }
.data-row { display: flex; flex-direction: column; background: #f8fafc; padding: 1rem; border-radius: 12px; border: 1px solid #e2e8f0; }
.data-val { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin-top: 0.25rem; }
.data-sub { font-size: 0.95rem; color: #475569; margin-top: 0.5rem; font-weight: 500;}
.data-note { font-size: 0.85rem; color: #94a3b8; font-weight: 600; text-align: center; margin-top: auto; padding-top: 1.5rem; }

.badge-full { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.75rem; background: #dbf4ff; color: #0369a1; border-radius: 8px; font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; width: fit-content; }
.badge-part { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.75rem; background: #fef3c7; color: #b45309; border-radius: 8px; font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; width: fit-content; }

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .count-input { font-size: 1.75rem; padding: 1rem; }
  .calc-btn { width: 100%; padding: 1.25rem; }
}
`;
document.head.appendChild(style);

const app = document.querySelector('#hesaplama-app');
app.innerHTML = `
  <header class="article-topbar">
    <a class="back-link" href="/">← Ana sayfaya dön</a>
    <span class="topbar-label" style="text-transform: uppercase; font-weight: 700; color: #64748b;">İSG Uzmanı, Hekim & DSP</span>
  </header>
  <main class="layout" style="background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%); min-height: 100vh;">
    <div class="calc-container">
      <div style="text-align: center; margin-bottom: 3.5rem; animation: fade-in-up 0.4s ease backwards;">
        <h1 style="font-size: clamp(2rem, 5vw, 3rem); font-weight: 800; color: #0f172a; margin-bottom: 1rem; letter-spacing: -0.02em;">Zorunlu Çalışma Süresi Hesaplama</h1>
        <p style="color: #475569; font-size: 1.15rem; max-width: 650px; margin: 0 auto; line-height: 1.6;">İşletmenizdeki çalışan sayısı ve tehlike sınıfını girerek mevzuatta belirtilen minimum hizmet sürelerini otomatik hesaplayın.</p>
      </div>

      <div class="input-group">
        <label>1. İşyeri Tehlike Sınıfını Seçin</label>
        <div class="hazard-grid">
          <div class="hazard-card" data-hazard="az">
            <div class="hazard-icon">🔵</div>
            <div class="hazard-title">Az Tehlikeli</div>
          </div>
          <div class="hazard-card" data-hazard="tehlikeli">
            <div class="hazard-icon">🟡</div>
            <div class="hazard-title">Tehlikeli</div>
          </div>
          <div class="hazard-card" data-hazard="cok">
            <div class="hazard-icon">🔴</div>
            <div class="hazard-title">Çok Tehlikeli</div>
          </div>
        </div>
      </div>

      <div class="input-group" style="animation-delay: 0.1s;">
        <label>2. Toplam Çalışan Sayısını Girin</label>
        <div class="count-input-wrapper">
          <input type="number" id="calc-count" class="count-input" min="1" placeholder="Örn: 250" />
        </div>
      </div>

      <div class="calc-btn-container" style="animation-delay: 0.2s;">
        <button id="calc-btn" class="calc-btn">Süreleri Hesapla ✨</button>
      </div>

      
      <div id="results-container" class="results-grid"></div>
      
      <div style="margin-top: 4rem; text-align: left; background: white; border-radius: 16px; padding: 1.5rem; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); animation: fade-in-up 0.8s ease backwards;">
        <button id="legal-basis-toggle" style="width: 100%; display: flex; justify-content: space-between; align-items: center; background: none; border: none; cursor: pointer; font-size: 1.1rem; font-weight: 700; color: #334155; padding: 0;">
          <span>⚖️ Hesaplama Yasal Dayanakları</span>
          <span id="legal-arrow" style="transition: transform 0.3s;">▼</span>
        </button>
        <div id="legal-content" style="display: none; margin-top: 1.5rem; color: #475569; font-size: 0.95rem; line-height: 1.6;">
          <ul style="padding-left: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem;">
            <li><strong>İş Güvenliği Uzmanı:</strong> İŞ GÜVENLİĞİ UZMANLARININ GÖREV, YETKİ, SORUMLULUK VE EĞİTİMLERİ HAKKINDA YÖNETMELİK (Madde 12)</li>
            <li><strong>İşyeri Hekimi:</strong> İŞYERİ HEKİMİ VE DİĞER SAĞLIK PERSONELİNİN GÖREV, YETKİ, SORUMLULUK VE EĞİTİMLERİ HAKKINDA YÖNETMELİK (Madde 12)</li>
            <li><strong>Diğer Sağlık Personeli (DSP):</strong> İŞYERİ HEKİMİ VE DİĞER SAĞLIK PERSONELİNİN GÖREV, YETKİ, SORUMLULUK VE EĞİTİMLERİ HAKKINDA YÖNETMELİK (Madde 19)</li>
          </ul>
          <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #f1f5f9; font-size: 0.85rem; color: #94a3b8; font-weight: 600; text-align: right;">
            Son Güncelleme Tarihi: 27 Ağustos 2026
          </div>
        </div>
      </div>

    </div>
  </main>
`;

let currentHazard = '';
document.querySelectorAll('.hazard-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.hazard-card').forEach(c => {
      c.classList.remove('active-az', 'active-tehlikeli', 'active-cok');
    });
    currentHazard = card.dataset.hazard;
    card.classList.add('active-' + currentHazard);
  });
});

document.getElementById('calc-btn').addEventListener('click', () => {
  if (!currentHazard) {
    alert('Lütfen öncelikle bir tehlike sınıfı seçin.');
    return;
  }
  const count = parseInt(document.getElementById('calc-count').value, 10);
  if (isNaN(count) || count < 1) {
    alert('Lütfen geçerli bir çalışan sayısı girin.');
    return;
  }

  // Tanımlar
  let uzmanDakika = 10; let uzmanTamSiniri = 1000;
  let hekimDakika = 5; let hekimTamSiniri = 2000;
  let dspDakika = 0;

  if (currentHazard === 'tehlikeli') {
    uzmanDakika = 20; uzmanTamSiniri = 500;
    hekimDakika = 10; hekimTamSiniri = 1000;
  } else if (currentHazard === 'cok') {
    uzmanDakika = 40; uzmanTamSiniri = 250;
    hekimDakika = 15; hekimTamSiniri = 750;
    if (count >= 10 && count <= 49) dspDakika = 10;
    else if (count >= 50 && count <= 249) dspDakika = 15;
    else if (count >= 250) dspDakika = 20;
  }

  // İstenen formata çeviren yardımcı fonskiyon
  function formatComplexTime(totalMinutes, fullTimeLimit) {
    const fullTimeCount = Math.floor(count / fullTimeLimit);
    const remainingWorkers = count % fullTimeLimit;
    const remainingMinutes = remainingWorkers * totalMinutes;

    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;

    let resHtml = '';
    
    if (fullTimeCount > 0) {
      resHtml += `<div class="data-row"><span class="badge-full">☀️ Tam Zamanlı</span><span class="data-val">${fullTimeCount} Adet</span></div>`;
    }
    
    if (remainingWorkers > 0 || fullTimeCount === 0) {
      let timeText = '';
      if (hours > 0) timeText += `${hours} saat `;
      if (minutes > 0) timeText += `${minutes} dakika`;
      if (hours === 0 && minutes === 0) timeText = '0 dakika';

      resHtml += `<div class="data-row">
        <span class="badge-part">⏱️ Kısmi Zamanlı</span>
        <span class="data-val">1 Adet</span>
        <span class="data-sub">(Hizmet süresi: ${timeText})</span>
      </div>`;
    }
    return resHtml;
  }

  // DSP özel durumu
  let dspHtml = '';
  if (dspDakika === 0) {
    dspHtml = `<div class="data-row" style="background: transparent; border: 2px dashed #cbd5e1; align-items: center; text-align: center; padding: 2rem 1rem;">
      <span class="data-val" style="color: #64748b;">Zorunlu Değil</span>
      <span class="data-sub" style="font-size: 0.9rem;">(Sadece Çok Tehlikeli sınıfta 10 ve üzeri çalışanda aranır)</span>
    </div>`;
  } else {
    const totalDsp = count * dspDakika;
    const dspHours = Math.floor(totalDsp / 60);
    const dspMins = totalDsp % 60;
    
    let timeText = '';
    if (dspHours > 0) timeText += `${dspHours} saat `;
    if (dspMins > 0) timeText += `${dspMins} dakika`;

    dspHtml = `<div class="data-row">
        <span class="badge-part">⏱️ Kısmi Zamanlı</span>
        <span class="data-val">1 Adet</span>
        <span class="data-sub">(Hizmet süresi: ${timeText})</span>
      </div>`;
  }

  const resContainer = document.getElementById('results-container');
  resContainer.classList.remove('visible');
  
  // Animasyon için kısa gecikme
  setTimeout(() => {
    resContainer.innerHTML = `
      <div class="result-card card-uzman">
        <div class="res-header">
          <div class="res-icon">👷</div>
          <div class="res-title">İş Güvenliği Uzmanı</div>
        </div>
        <div class="res-data">
          ${formatComplexTime(uzmanDakika, uzmanTamSiniri)}
        </div>
        <div class="data-note">Çalışan başına ayda ${uzmanDakika} dakika</div>
      </div>

      <div class="result-card card-hekim">
        <div class="res-header">
          <div class="res-icon">🩺</div>
          <div class="res-title">İşyeri Hekimi</div>
        </div>
        <div class="res-data">
          ${formatComplexTime(hekimDakika, hekimTamSiniri)}
        </div>
        <div class="data-note">Çalışan başına ayda ${hekimDakika} dakika</div>
      </div>

      <div class="result-card card-dsp">
        <div class="res-header">
          <div class="res-icon">💉</div>
          <div class="res-title">Diğer Sağlık Personeli</div>
        </div>
        <div class="res-data">
          ${dspHtml}
        </div>
        <div class="data-note" style="visibility: ${dspDakika > 0 ? 'visible' : 'hidden'}">Çalışan başına ayda ${dspDakika} dakika</div>
      </div>
    `;
    resContainer.classList.add('visible');
    
    // Tıklandıktan sonra sonuçlara doğru yumuşak kaydırma
    setTimeout(() => {
      resContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 150);
  }, 100);
});


document.getElementById('legal-basis-toggle').addEventListener('click', () => {
  const content = document.getElementById('legal-content');
  const arrow = document.getElementById('legal-arrow');
  if (content.style.display === 'none') {
    content.style.display = 'block';
    arrow.style.transform = 'rotate(180deg)';
  } else {
    content.style.display = 'none';
    arrow.style.transform = 'rotate(0deg)';
  }
});
