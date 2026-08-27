import './styles.css';
import {setupAccountUI} from './auth.js';

// Ana sayfanın sekmesini geri dönüşte yeniden bulabilmek için adlandırıyoruz.
window.name = 'mevzuat-home';

const app = document.querySelector('#app');
let sectionSearchTimer;
app.innerHTML = `
  <header class="topbar">
    <div class="brand-mark"><img src="/mevzuat-rehberi-icon.png" alt="" /></div>
    <div><p class="eyebrow">TEFTİŞ DAYANAKLARI</p><h1>Mevzuat Rehberi</h1></div>
    <div class="topbar-meta"><span class="status-dot"></span><button id="account-button" class="account-button" type="button">Giriş yap</button><button id="logout-button" class="logout-button" type="button" aria-label="Çıkış yap" title="Çıkış yap" hidden>×</button></div>
  </header>
  <main class="layout">
    <aside class="sidebar">
    <div class="sidebar-heading"><div><h2>Mevzuat Listesi</h2></div><div class="sidebar-actions"><button id="ipc-open" class="ipc-open" type="button" title="İdari Para Cezaları (2026) tablosunu aç">İPC 2026</button><button id="favorites-open" class="ipc-open favorites-home-open" type="button" title="Favorilerimi aç">☆ Favorilerim</button><button id="report-open" class="ipc-open favorites-home-open" type="button" title="Tespitler'nu aç">＋ Tespitler</button><button id="external-legislation-open" class="ipc-open favorites-home-open" type="button" title="Mevzuat bağlantıları sayfasını aç">↗ Mevzuat bağlantıları</button><button id="calc-open" class="ipc-open favorites-home-open" type="button" title="İSG Süre Hesaplama sayfasını aç">⏱️ Süre Hesaplama</button></div></div>
      <div style="display: flex; gap: 10px; margin-bottom: 30px; width: 100%;">
        <label class="search-field sidebar-search" style="flex: 1;"><span aria-hidden="true">⌕</span><input id="section-filter" type="search" placeholder="Mevzuat ara…" autocomplete="off" /></label>
        <label class="search-field sidebar-search" style="flex: 1;"><span aria-hidden="true">⌕</span><input id="global-search" type="search" placeholder="Hüküm ara…" autocomplete="off" /></label>
      </div>
      <nav id="section-list" class="section-list" aria-label="Mevzuat listesi"></nav>
    </aside>
    <section class="content">
      <div class="welcome"><div class="welcome-icon">§</div><p class="eyebrow">DAYANAKLAR (GENEL)</p><h2>Bir mevzuat seçin</h2><p>Soldaki listeden bir kanun veya yönetmelik seçin. İçerik, okunabilir ve kolay kopyalanabilir ayrı bir sekmede açılır.</p></div>
    </section>
  </main>`;

const state = {sections: []};
const $ = (selector) => document.querySelector(selector);
const normalize = (value) => value.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const topicVisuals = {
  'mevzuat-1': ['01-6331-law', 'Kanun ve mevzuat dosyası'],
  'mevzuat-2': ['02-building', 'İşyeri binası ve yapı ekipmanı'],
  'mevzuat-3': ['03-equipment', 'İş ekipmanı ve ayar simgesi'],
  'mevzuat-4': ['04-explosive', 'Patlama ve yangın tehlikesi'],
  'mevzuat-5': ['05-chemical', 'Kimyasal laboratuvar şişesi'],
  'mevzuat-6': ['06-construction', 'Yapı ve inşaat ekipmanı'],
  'mevzuat-7': ['07-ppe', 'Koruyucu eldiven'],
  'mevzuat-8': ['08-risk', 'Riskten korunma kalkanı'],
  'mevzuat-9': ['09-emergency', 'Acil durum bildirimi'],
  'mevzuat-10': ['10-signs', 'Güvenlik ve işaret bayrağı'],
  'mevzuat-11': ['11-health', 'İş sağlığı ve kalp sağlığı'],
  'mevzuat-12': ['12-noise', 'Gürültü ve işitme koruması'],
  'mevzuat-13': ['13-vibration', 'Titreşim ve bağlantı dalgaları'],
  'mevzuat-14': ['14-dust', 'Tozla mücadele ve temizlik'],
  'mevzuat-15': ['15-doctor', 'Çalışan sağlığı ve sağlık personeli'],
  'mevzuat-16': ['16-expert', 'Uzmanlık ve eğitim başlığı'],
  'mevzuat-17': ['17-employer', 'İşveren ve çalışma düzeni'],
  'mevzuat-18': ['18-board', 'Kurul ve toplantı notları'],
  'mevzuat-19': ['19-training', 'Mesleki eğitim ve başarı'],
  'mevzuat-20': ['20-education', 'Çalışan eğitimi ve öğrenme'],
  'mevzuat-21': ['21-carcinogen', 'Kanserojen madde laboratuvarı'],
  'mevzuat-22': ['22-biological', 'Biyolojik etken ve risk'],
  'mevzuat-23': ['23-pregnancy', 'Gebe çalışanların korunması'],
  'mevzuat-24': ['24-manual', 'Elle taşıma ve yük'],
  'mevzuat-25': ['25-screen', 'Ekranlı araç ve bilgisayar'],
  'mevzuat-26': ['26-asbestos', 'Asbest ve lifli malzeme'],
  'mevzuat-27': ['27-hygiene', 'İş hijyeni ve laboratuvar'],
  'mevzuat-28': ['28-hours', 'Çalışma süresi ve zaman'],
  'mevzuat-29': ['29-night', 'Gece postası ve çalışma'],
  'mevzuat-30': ['30-temporary', 'Geçici çalışma takvimi'],
  'mevzuat-31': ['31-stop', 'İşin durdurulması ve kilit'],
  'mevzuat-32': ['32-industry', 'Endüstriyel kaza ve grafik'],
  'mevzuat-33': ['33-fishing', 'Balıkçı gemisi ve açık hava'],
  'mevzuat-34': ['34-labour', 'İş Kanunu ve hedef adalet'],
  'mevzuat-35': ['35-international', 'Uluslararası işgücü ve konum'],
};

function visualFor(section) {
  const [name, label] = topicVisuals[section.id] || topicVisuals['mevzuat-1'];
  return {image: `/topic-icons/${name}.webp`, label};
}

function renderSections(filter = '') {
  document.querySelector('.content').style.display = 'none';
  document.querySelector('#section-list').style.display = 'grid';
  document.querySelector('#global-search').value = '';
  const needle = normalize(filter);
  const visible = state.sections.filter((section) => normalize(section.title).includes(needle));
  $('#section-list').innerHTML = visible.length ? visible.map((section) => `
    ${(() => { const visual = visualFor(section); return `<button class="section-item" data-id="${section.id}" type="button"><span class="section-visual"><img src="${visual.image}" alt="${visual.label}" loading="lazy" /></span><span class="section-number">${String(state.sections.indexOf(section) + 1).padStart(2, '0')}</span><span class="section-name">${section.title}</span><span class="section-arrow">›</span></button>`; })()}
    `).join('') : '<p class="empty-state">Aramanızla eşleşen mevzuat yok.</p>';
  $('#section-list').querySelectorAll('[data-id]').forEach((button) => {
    button.addEventListener('click', () => window.open(`/mevzuat.html?id=${encodeURIComponent(button.dataset.id)}`, '_blank'));
  });
}

async function loadManifest() {
  const response = await fetch('/manifest.json');
  if (!response.ok) throw new Error('Mevzuat listesi yüklenemedi.');
  const manifest = await response.json();
  state.sections = manifest.sections;
  renderSections();
}

$('#section-filter').addEventListener('input', (event) => {
  clearTimeout(sectionSearchTimer);
  sectionSearchTimer = setTimeout(() => renderSections(event.target.value), 80);
});
$('#ipc-open').addEventListener('click', () => window.open('/ipc.html', '_blank'));
$('#favorites-open').addEventListener('click', () => window.open('/favoriler.html', '_blank'));
$('#report-open').addEventListener('click', () => window.open('/tespitler.html', '_blank'));
$('#external-legislation-open').addEventListener('click', () => window.open('/mevzuat-baglantilari.html', '_blank'));
$('#calc-open').addEventListener('click', () => window.open('/isg-hesaplama.html', '_blank'));
loadManifest().catch((error) => { $('#section-list').innerHTML = `<p class="error-state">${error.message}</p>`; });

let globalSearchTimer;
let loadedLegislations = null;

async function executeGlobalSearch(query) {
  const contentArea = document.querySelector('.content');
  const sectionList = document.querySelector('#section-list');
  if (!query || query.length < 3) {
    contentArea.style.display = 'none';
    sectionList.style.display = 'grid';
    return;
  }
  
  if (!loadedLegislations || loadedLegislations.length === 0) {
    if (state.sections.length === 0) {
       // Data not loaded yet, wait.
       return;
    }
  }

  sectionList.style.display = 'none';
  document.querySelector('#section-filter').value = '';
  contentArea.style.display = 'block';
  
  contentArea.innerHTML = `<div class="welcome" style="margin-top: 50px;"><div class="spinner" style="font-size: 2rem; animation: spin 1s linear infinite;">⏳</div><p>Tüm mevzuatlar taranıyor...</p></div>
  <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>`;

  if (!loadedLegislations) {
    loadedLegislations = [];
    const promises = state.sections.map(sec => fetch(sec.path || `/sections/${sec.id}.json`).then(r => r.json()).catch(() => null));
    const results = await Promise.all(promises);
    results.forEach((res, idx) => {
      if (res) {
        loadedLegislations.push({
          id: state.sections[idx].id,
          title: res.title || state.sections[idx].title,
          pages: res.pages || []
        });
      }
    });
  }

  const needle = normalize(query);
  let totalMatches = 0;
  let html = `<div style="padding: 30px; max-width: 900px; margin: 0 auto; height: 100%; overflow-y: auto;">
    <h2 style="margin-top:0; color:#1a2b4b; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px;">
      "${query}" için arama sonuçları
    </h2>
    <div style="display:flex; flex-direction:column; gap: 20px;">`;
  
  for (const leg of loadedLegislations) {
    let legMatches = [];
    for (const page of leg.pages) {
      if (!page.text) continue;
      const normalizedText = normalize(page.text);
      let idx = normalizedText.indexOf(needle);
      let searchPos = 0;
      while (idx !== -1 && legMatches.length < 50 && totalMatches < 200) {
        // Find paragraph boundaries roughly
        let start = page.text.lastIndexOf('\n', idx) + 1;
        if (start === -1 || idx - start > 200) start = Math.max(0, idx - 100);
        let end = page.text.indexOf('\n', idx);
        if (end === -1 || end - idx > 200) end = Math.min(page.text.length, idx + 200);
        
        let snippet = page.text.substring(start, end);
        // Safe index-based highlighting directly using the match boundaries
        let localIdx = idx - start;
        let matchLength = needle.length;
        if (localIdx >= 0 && localIdx < snippet.length) {
            let escape = (s) => s.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#039;'}[c]));
            let before = escape(snippet.substring(0, localIdx));
            let matchText = escape(snippet.substring(localIdx, localIdx + matchLength));
            let after = escape(snippet.substring(localIdx + matchLength));
            snippet = before + `<strong style="background:#fef08a; padding: 2px 4px; border-radius: 4px; color: #854d0e;">` + matchText + `</strong>` + after;
        } else {
            let escape = (s) => s.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#039;'}[c]));
            snippet = escape(snippet);
        }
        legMatches.push(`<div style="background: white; border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onclick="window.open('/mevzuat.html?id=${encodeURIComponent(leg.id)}', '_blank')" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 10px 15px -3px rgba(0,0,0,0.1)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.05)';">
          <p style="margin: 0 0 10px 0; line-height: 1.6; color: #334155;">${snippet}</p>
          <div style="display:flex; justify-content: space-between; font-size: 0.85rem; color: #64748b; margin-top: 10px; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
            <span style="font-weight:600; color: #0284c7;">${leg.title}</span>
            <span>Sayfa ${page.page}</span>
          </div>
        </div>`);
        totalMatches++;
        searchPos = idx + needle.length;
        idx = normalizedText.indexOf(needle, searchPos);
      }
    }
    if (legMatches.length > 0) {
      html += legMatches.join('\n');
    }
  }

  if (totalMatches === 0) {
    html += `<div style="text-align:center; padding: 50px; color: #64748b; font-size: 1.1rem;">Eşleşen hüküm bulunamadı.</div>`;
  } else {
    html += `<div style="color: #64748b; text-align: center; font-size: 0.9rem; margin-top: 20px;">Bulunan eşleşme sayısı: ${totalMatches}${totalMatches === 200 ? '+' : ''}</div>`;
  }
  html += `</div></div>`;
  contentArea.innerHTML = html;
}

$('#global-search')?.addEventListener('input', (event) => {
  clearTimeout(globalSearchTimer);
  const q = event.target.value.trim();
  globalSearchTimer = setTimeout(() => executeGlobalSearch(q), 500);
});

setupAccountUI();
