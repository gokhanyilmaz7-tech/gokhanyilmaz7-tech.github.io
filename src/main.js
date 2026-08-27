import './styles.css';
import {setupAccountUI} from './auth.js';

// Ana sayfanın sekmesini geri dönüşte yeniden bulabilmek için adlandırıyoruz.
window.name = 'mevzuat-home';

const app = document.querySelector('#app');
let sectionSearchTimer;
app.innerHTML = `
  <header class="topbar">
    <div class="brand-mark"><img src="/mevzuat-rehberi-icon.png" alt="" /></div>
    <div><h1>İSG Mevzuat Rehberi</h1></div>
    <div class="topbar-meta"><span class="status-dot"></span><button id="account-button" class="account-button" type="button">Giriş yap</button><button id="logout-button" class="logout-button" type="button" aria-label="Çıkış yap" title="Çıkış yap" hidden>×</button></div>
  </header>
  <main class="layout">
    <aside class="sidebar">
    <div class="sidebar-heading"><div><h2>Mevzuat Listesi</h2></div><div class="sidebar-actions">
        <div class="sidebar-row-1">
          <button id="report-open" class="ipc-open" type="button" title="Tespitler menüsünü aç">＋ Tespitler</button>
          <button id="favorites-open" class="ipc-open favorites-home-open" type="button" title="Favorilerimi aç">☆ Favorilerim</button>
        </div>
        <div class="sidebar-row-2">
          <button id="ipc-open" class="ipc-open favorites-home-open" type="button" title="İdari Para Cezaları (2026) tablosunu aç">İPC 2026</button>
          <button id="external-legislation-open" class="ipc-open favorites-home-open" type="button" title="Mevzuat bağlantıları sayfasını aç">↗ Mevzuat bağlantıları</button>
          <button id="calc-open" class="ipc-open favorites-home-open" type="button" title="İSG Süre Hesaplama sayfasını aç">⏱️ Süre Hesaplama</button>
        </div>
      </div></div>
      <div class="calendar-layout-wrapper" style="display: flex; gap: 30px; align-items: flex-start;">
        <div style="flex-shrink: 0; position: sticky; top: 120px; display: flex; flex-direction: column; gap: 20px;">
          <div id="live-calendar" class="live-calendar"></div>
          <div style="text-align: center; padding: 5px; margin-top: 5px;">
            <img src="/ataturk-icon.jpg" alt="Atatürk" style="width: 100%; max-width: 150px; mix-blend-mode: multiply; filter: contrast(1.1) brightness(1.05);" />
          </div>
        </div>
        
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; gap: 10px; margin-bottom: 24px; flex-direction: row; width: 100%;">
            <label class="search-field sidebar-search" style="flex: 1;"><span aria-hidden="true">⌕</span><input id="section-filter" type="search" placeholder="Mevzuat ara…" autocomplete="off" /></label>
            <label class="search-field sidebar-search" style="flex: 1;"><span aria-hidden="true">⌕</span><input id="global-search" type="search" placeholder="Hüküm ara…" autocomplete="off" /></label>
          </div>
          <nav id="section-list" class="section-list" aria-label="Mevzuat listesi"></nav>
        </div>
      </div>
      <div class="sidebar-contact-links" style="margin-top: 3.5rem; padding-top: 1.5rem; border-top: 1px solid rgba(0,0,0,0.05); display: flex; flex-direction: row; flex-wrap: wrap; gap: 0.75rem;">
        <a href="mailto:gokhanyilmaz7@icloud.com?subject=İSG%20Mevzuat%20Rehberi%20-%20İletişim" class="contact-admin-btn mail-btn">
          ✉️ E-Posta
        </a>
        <a href="https://wa.me/gokhanyilmaz7" class="contact-admin-btn whatsapp-btn" target="_blank" rel="noopener noreferrer">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" style="margin-right:2px; padding-bottom:1px;"><path d="M12.01 0C5.38 0 0 5.38 0 12.01c0 2.12.55 4.18 1.59 6L.18 23.18l5.31-1.39c1.78 1 3.79 1.53 5.86 1.53C18.01 23.32 24 17.96 24 11.3v-.06A11.97 11.97 0 0 0 12.01 0zm6.9 16.32c-.37 1.05-2 1.94-2.8 2.08-.6.1-1.39.17-2.88-.3-1.8-.57-3.9-2.02-5.46-3.58C6.2 12.95 5.2 11.2 5.2 9.38c0-1.84.95-2.73 1.3-3.12.33-.36.72-.45.96-.45.24 0 .48 0 .69.01.25.01.58-.09.9.68.32.78 1.1 2.68 1.2 2.89.1.21.16.45.03.71-.12.26-.19.42-.39.66-.21.23-.44.5-.63.69-.21.21-.43.43-.18.86.25.43 1.11 1.83 2.37 2.95 1.63 1.45 3.01 1.9 3.44 2.1.43.2.68.17.94-.12.25-.29 1.08-1.26 1.37-1.69.29-.43.58-.36 1.01-.2.43.16 2.7 1.28 3.16 1.5.47.23.77.35.88.54.11.19.11 1.1-.26 2.15z"/></svg> WhatsApp
        </a>
      </div>
    </aside>
    <section class="content">
      <div class="welcome"><div class="welcome-icon">§</div><p class="eyebrow">DAYANAKLAR (GENEL)</p><h2>Bir mevzuat seçin</h2><p>Soldaki listeden bir kanun veya yönetmelik seçin. İçerik, okunabilir ve kolay kopyalanabilir ayrı bir sekmede açılır.</p></div>
    </section>
  </main>
  `;

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
      // Many PDFs use newlines for visual wrapping. Replace them with spaces to get full sentences.
      const cleanText = page.text.replace(/[\u0000-\u001F\u007F-\u009F]+/g, ' ').replace(/\s+/g, ' ');
      const normalizedText = normalize(cleanText);
      let idx = normalizedText.indexOf(needle);
      let searchPos = 0;
      while (idx !== -1 && legMatches.length < 50 && totalMatches < 200) {
        // Dynamically locate the boundaries of the specific provision (Hüküm) block
        // Provisions end with a trailing (Dayanak Mevzuat) block. 
        const dayanakRegex = /\([^)]*(?:madde\s?[0-9]|genelgesi|yönetmelik|sayılı kanun)[^)]*\)\s*/gi;
        let dayanakMatches = [];
        let rMatch;
        while ((rMatch = dayanakRegex.exec(cleanText)) !== null) {
            dayanakMatches.push({ start: rMatch.index, end: rMatch.index + rMatch[0].length });
        }
        
        let blockStart = 0;
        let blockEnd = cleanText.length;
        for (let i = 0; i < dayanakMatches.length; i++) {
            // A dayanak belongs to the provision BEFORE it.
            // If the search match is anywhere before the end of this dayanak...
            if (dayanakMatches[i].end > idx) {
                blockEnd = dayanakMatches[i].start; // Stop BEFORE the dayanak text starts
                if (i > 0) blockStart = dayanakMatches[i - 1].end; // Start AFTER the previous dayanak ends
                break;
            }
        }
        
        // In case the match was actually INSIDE the dayanak text itself, 
        // idx might now be > blockEnd. If so, localIdx will be negative, 
        // which is perfectly fine (it will just show the explanatory part of that provision without highlighting).
        
        let snippet = cleanText.substring(blockStart, blockEnd).trim();
        
        // Strip out the red annotation texts (penalty clauses, custom notes) which the user doesn't want to see in the standard snippet.
        snippet = snippet.replace(/\(İlgili hüküm doğrultusunda[^)]*\)/gi, '')
                         .replace(/\(\*\*\*[^)]*\)/g, '')
                         .replace(/\*\*\*.*?(:?\n|$)/g, '')
                         .trim();
        
        // Truncate only if the explanatory text itself is insanely long
        let localIdxRelative = idx - blockStart;
        if (snippet.length > 500) {
            let s = Math.max(0, localIdxRelative - 150);
            let e = Math.min(snippet.length, localIdxRelative + 300);
            
            // Re-align to spaces safely
            if (s > 0) {
                let nextSpace = snippet.indexOf(' ', s);
                if (nextSpace !== -1 && nextSpace < localIdxRelative) s = nextSpace + 1;
            }
            if (e < snippet.length) {
                let lastSpace = snippet.lastIndexOf(' ', e);
                if (lastSpace > localIdxRelative) e = lastSpace;
            }
            
            snippet = snippet.substring(s, e);
            if (s > 0) snippet = '...' + snippet;
            if (e < snippet.length) snippet = snippet + '...';
        }
        
        let footerText = `Bağlantılı Hükme Git &rarr;`;
        
        // Re-calculate safely in the final snippet
        let normalizedSnippet = normalize(snippet);
        let localIdx = normalizedSnippet.indexOf(needle);
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
        legMatches.push(`<div class="global-provision-card" onclick="window.open('/mevzuat.html?id=${encodeURIComponent(leg.id)}&page=${page.page}&highlight=${encodeURIComponent(query)}', '_blank')">
          <div class="g-card-body">
            <p>${snippet}</p>
          </div>
          <div class="g-card-footer">
            <span class="g-card-title">${leg.title}</span>
            <span class="g-card-page">${footerText}</span>
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


let currentCalDate = new Date();
function renderCalendar(targetDate = currentCalDate) {
  const container = document.getElementById('live-calendar');
  if (!container) return;

  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  
  const now = new Date();
  const isCurrentMonth = (year === now.getFullYear() && month === now.getMonth());
  const todayDate = now.getDate();

  const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  
  let firstDay = new Date(year, month, 1).getDay();
  firstDay = (firstDay === 0) ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  let html = `<div class="glass-calendar-inner">
      <div class="cal-header">
        <span class="cal-nav" id="cal-prev" title="Önceki Ay">&lang;</span>
        <span class="cal-month">${months[month]} ${year}</span>
        <span class="cal-nav" id="cal-next" title="Sonraki Ay">&rang;</span>
      </div>
      <div class="cal-weekdays">
        <span>Pt</span><span>Sa</span><span>Ça</span><span>Pe</span><span>Cu</span><span>Ct</span><span>Pz</span>
      </div>
      <div class="cal-days">`;

  for (let i = 0; i < firstDay; i++) {
    const trailingDay = daysInPrevMonth - firstDay + i + 1;
    html += `<span class="cal-day prev-month">${trailingDay}</span>`;
  }
  for (let i = 1; i <= daysInMonth; i++) {
    if (isCurrentMonth && i === todayDate) {
      html += `<span class="cal-day current-day">${i}</span>`;
    } else {
      html += `<span class="cal-day">${i}</span>`;
    }
  }
  const remainingCells = 42 - (firstDay + daysInMonth);
  for (let i = 1; i <= remainingCells; i++) {
    html += `<span class="cal-day next-month">${i}</span>`;
  }
  html += `</div></div>`;
  container.innerHTML = html;

  document.getElementById('cal-prev').addEventListener('click', () => {
    currentCalDate = new Date(year, month - 1, 1);
    renderCalendar(currentCalDate);
  });
  
  document.getElementById('cal-next').addEventListener('click', () => {
    currentCalDate = new Date(year, month + 1, 1);
    renderCalendar(currentCalDate);
  });
  
  // Double click month title to reset to current month
  document.querySelector('.cal-month').addEventListener('dblclick', () => {
    currentCalDate = new Date();
    renderCalendar(currentCalDate);
  });
}

renderCalendar();
setInterval(() => {
    const cNow = new Date();
    if (cNow.getHours() === 0 && cNow.getMinutes() === 0 && cNow.getSeconds() < 10) {
        renderCalendar(currentCalDate);
    }
}, 10000);
