
function customManualPrompt() {
  return new Promise((resolve) => {
    const modalId = 'custom-manual-prompt-modal';
    if (document.getElementById(modalId)) document.getElementById(modalId).remove();

    const modalHTML = `
      <div id="${modalId}" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(16, 42, 67, 0.6); display: flex; align-items: center; justify-content: center; z-index: 99999; backdrop-filter: blur(4px);">
        <div style="background: white; border-radius: 12px; width: 90%; max-width: 800px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 12px 24px rgba(16, 42, 67, 0.3);">
          
          <div style="padding: 1.25rem; background: #f8fafc; border-bottom: 2px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="font-size: 1.25rem; margin: 0; color: #b91c1c; font-weight: bold;">✍️ MANUEL NOKSANLIK EKLE</h2>
            <button id="${modalId}-close" style="background: none; border: none; font-size: 1.75rem; line-height: 1; color: #627d98; cursor: pointer; padding: 0 0.5rem;">&times;</button>
          </div>
          
          <div style="padding: 1.25rem; background: #fff;">
            <p style="margin: 0 0 10px 0; font-weight: 600; color: #334e68;">Rapora eklemek istediğiniz noksanlığı aşağıya yazın:</p>
            <textarea id="${modalId}-input" rows="4" placeholder="Noksanlık buraya yazılacak..." style="width: 100%; padding: 1rem; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 1.05rem; color: #334e68; outline: none; resize: vertical; font-family: inherit;"></textarea>
          </div>
          
          <div style="padding: 1.25rem; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button id="${modalId}-cancel" style="padding: 0.75rem 1.75rem; background: white; border: 1px solid #cbd5e1; border-radius: 6px; color: #627d98; font-weight: 600; cursor: pointer;">Kapat</button>
            <button id="${modalId}-submit" style="padding: 0.75rem 2rem; background: #2e67d2; border: none; border-radius: 6px; color: white; font-weight: 600; cursor: pointer; box-shadow: 0 2px 4px rgba(46, 103, 210, 0.2);">Ekle</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalEl = document.getElementById(modalId);
    const inputEl = document.getElementById(modalId + '-input');
    const cancelBtn = document.getElementById(modalId + '-cancel');
    const submitBtn = document.getElementById(modalId + '-submit');
    const closeBtn = document.getElementById(modalId + '-close');

    setTimeout(() => inputEl.focus(), 50);

    const cleanup = () => modalEl.remove();

    cancelBtn.onclick = () => { cleanup(); resolve(null); };
    closeBtn.onclick = () => { cleanup(); resolve(null); };
    submitBtn.onclick = () => {
      const val = inputEl.value.trim();
      cleanup();
      resolve(val || null);
    };
  });
}

async function startAddingManualDeficiencies() {
  while (true) {
    const val = await customManualPrompt();
    if (!val) break; // User clicked "Kapat" or left it empty
    
    const newItem = {
      id: 'manual-' + Date.now() + Math.random(),
      title: val,
      text: '',
      html: '',
      savedAt: Date.now()
    };
    
    if (!data.reports) data.reports = [];
    data.reports.push(newItem);
    await save();
    render();
  }
}

function stripGreenText(htmlStr) {
  if (!htmlStr) return '';
  const wrapper = document.createElement('div');
  wrapper.innerHTML = htmlStr;
  [...wrapper.querySelectorAll('*')].forEach(node => {
    const style = `${node.getAttribute('style') || ''} ${node.style?.color || ''}`.toLowerCase();
    if (/color\s*:\s*(#1db500|rgb\(\s*29\s*,\s*181\s*,\s*0\s*\)|green)/i.test(style)) {
      node.closest('p')?.remove() || node.remove();
    }
  });
  return wrapper.innerHTML;
}

import './favorites-page.css';
import './report-page.css';
import {hydrateFavorites, persistFavorites, requireAccount, setupAccountUI} from './auth.js';
import {addReportCopy, readWorkspace, reportItems, reportRepeatButton, reportSourceId} from './report.js';

const KEY = 'mevzuat-local-favorites';
const esc = (value) => String(value || '').replace(/[&<>"']/g, (c) => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'}[c]));
const sourceHref = (item) => { const match = String(item.sourceId || item.id || '').match(/-(\d+)-(\d+)$/); const params = new URLSearchParams(); if (match) { params.set('page', match[1]); params.set('block', match[2]); } return `/mevzuat.html?id=${encodeURIComponent(item.sectionId)}${params.toString() ? `&${params}` : ''}`; };
const uid = () => crypto.randomUUID();
const normalizeHtml = (html) => String(html || '').replaceAll('white-space:pre', 'white-space:normal');
let data = readWorkspace();
let sortMode = 'manual';
let reportSearchTimer;

const save = async () => { localStorage.setItem(KEY, JSON.stringify(data)); await persistFavorites(data, KEY); };
const items = () => reportItems(data);
const sortedItems = () => [...items()].sort((a, b) => sortMode === 'title' ? String(a.title || a.location).localeCompare(String(b.title || b.location), 'tr') : sortMode === 'oldest' ? (a.savedAt || 0) - (b.savedAt || 0) : sortMode === 'latest' ? (b.savedAt || 0) - (a.savedAt || 0) : 0);

function renderTools() {
  const tools = document.querySelector('#report-side-tools');
  const archivesCount = JSON.parse(localStorage.getItem('noksanlik-archives') || '[]').length;
  tools.innerHTML = `<div class="side-tools-heading"><span>RAPOR ARAÇLARI</span></div><a class="side-tool-button report-back-favorites" href="/favoriler.html">☆ Favorilerim</a><button id="report-sort" class="side-tool-button">↕ Sıralama: ${sortMode === 'manual' ? 'özel sıra' : sortMode === 'latest' ? 'yeniden eskiye' : sortMode === 'oldest' ? 'eskiden yeniye' : 'başlığa göre'}</button><button id="report-word" class="primary-tool" style="font-size: 0.9rem;">▣ Alınması Gerekli Tedbirleri Word'e aktar</button><button id="report-word-titles" class="primary-tool" style="margin-top: 0.5rem; background-color: #3b5998; font-size: 0.95rem;">📝 Noksanları Word'e aktar</button><button id="report-add-manual-tool" class="side-tool-button" style="color: #b91c1c; margin-top: 0.5rem;">✍️ Manuel Noksanlık Ekle</button><button id="report-clear" class="side-tool-button report-clear-button" ${items().length ? '' : 'disabled'} style="margin-bottom: 2rem;">Tüm hükümleri çıkar</button>
  <div class="side-tools-heading"><span>ARŞİV</span></div>
  <button id="report-archive-save" class="side-tool-button" style="color: #2e67d2;">🖫 Mevcut Raporu Arşivle</button>
  <button id="report-archive-load" class="side-tool-button" ${archivesCount ? '' : 'disabled'}>📂 Arşivden Çağır</button>`;
  tools.querySelector('#report-archive-save').onclick = saveArchive;
  tools.querySelector('#report-archive-load').onclick = loadArchiveModal;
  tools.querySelector('#report-sort').onclick = () => { sortMode = sortMode === 'manual' ? 'latest' : sortMode === 'latest' ? 'oldest' : sortMode === 'oldest' ? 'title' : 'manual'; render(); };
  tools.querySelector('#report-word').onclick = exportWord;
  tools.querySelector('#report-word-titles').onclick = exportWordTitles;
  tools.querySelector('#report-add-manual-tool').onclick = startAddingManualDeficiencies;
  tools.querySelector('#report-clear').onclick = async () => { if (!(await requireAccount()) || !items().length || !window.confirm('Rapordaki tüm hükümler çıkarılsın mı?')) return; data.reports = []; await save(); render(); };
}

async function move(itemId, direction) {
  if (!(await requireAccount())) return;
  const index = data.reports.findIndex((item) => item.id === itemId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= data.reports.length) return;
  [data.reports[index], data.reports[target]] = [data.reports[target], data.reports[index]];
  sortMode = 'manual'; save(); render();
}

async function moveTo(itemId, requested) {
  if (!(await requireAccount())) return;
  const position = Number.parseInt(requested, 10);
  const index = data.reports.findIndex((item) => item.id === itemId);
  if (!Number.isInteger(position) || position < 1 || position > data.reports.length || index < 0) return;
  const [item] = data.reports.splice(index, 1);
  data.reports.splice(position - 1, 0, item);
  sortMode = 'manual'; save(); render();
}

function renderStream() {
  const query = document.querySelector('#report-search').value.trim().toLocaleLowerCase('tr-TR');
  const visible = sortedItems().filter((item) => !query || `${item.title} ${item.text} ${item.sectionTitle} ${item.location}`.toLocaleLowerCase('tr-TR').includes(query));
  document.querySelector('#report-result').textContent = query ? `${visible.length} sonuç` : '';
  const stream = document.querySelector('#report-stream');
  stream.innerHTML = visible.length ? visible.map((item) => {
    const index = data.reports.findIndex((entry) => entry.id === item.id);
    const otherPositions = data.reports.map((entry, position) => reportSourceId(entry) === reportSourceId(item) && entry.id !== item.id ? position + 1 : 0).filter(Boolean);
    const duplicateNote = otherPositions.length ? `<div class="report-duplicate-sequence">(${otherPositions.join(', ')})</div>` : '';
    return `<div class="favorite-provision-shell report-provision-shell"><button class="favorite-card-position" data-report-position="${esc(item.id)}" type="button" aria-label="Rapor sıra numarasını değiştir" title="Bu hükmü doğrudan başka sıraya taşı">${index + 1}</button>${reportRepeatButton(item, 'report-repeat report-plus-card')}${duplicateNote}<article class="favorite-provision-card report-provision-card"><div class="favorite-card-main">${item.title ? `<h2>${esc(item.title)}</h2>` : ''}${(item.html || item.text) ? `<div class="favorite-provision-rich-text">` + (item.html ? stripGreenText(normalizeHtml(item.html)) : `<p>${esc(item.text)}</p>`) + `</div>` : ''}${String(item.id).startsWith('manual-') ? '' : `<a class="favorite-source-link" href="${sourceHref(item)}">Seçili mevzuatta aç →</a>`}</div><div class="favorite-card-actions"><button data-report-edit="${esc(item.id)}">Başlığı değiştir</button><button data-report-remove="${esc(item.id)}">Rapordan çıkar</button><div class="favorite-card-reorder"><button data-report-move="up" data-item="${esc(item.id)}" ${index <= 0 ? 'disabled' : ''} aria-label="Yukarı taşı" title="Yukarı taşı">↑</button><button data-report-move="down" data-item="${esc(item.id)}" ${index >= data.reports.length - 1 ? 'disabled' : ''} aria-label="Aşağı taşı" title="Aşağı taşı">↓</button></div></div></article></div>`;
  }).join('') : '<div class="favorite-empty"> <div style="display: flex; gap: 4rem; justify-content: center; margin-bottom: 1rem;"> <div style="text-align: center;"><button type="button" id="open-legislation-modal" class="favorite-empty-star" aria-label="Mevzuat listesini aç" title="Mevzuattan Ekle" style="background:none; border:none; padding:0; cursor:pointer; outline:none;"><span style="transition: transform 0.2s; display:inline-block;" onmouseover="this.style.transform=\'scale(1.1)\'" onmouseout="this.style.transform=\'scale(1)\'">＋</span></button><p style="margin-top: 0.5rem; font-weight: bold; color: #2e67d2;">Mevzuattan Ekle</p></div> <div style="text-align: center;"><button type="button" id="add-manual-deficiency" class="favorite-empty-star" aria-label="Manuel Ekle" title="Manuel Noksanlık Ekle" style="background:none; border:none; padding:0; cursor:pointer; outline:none;"><span style="transition: transform 0.2s; display:inline-block; color: #b91c1c;" onmouseover="this.style.transform=\'scale(1.1)\'" onmouseout="this.style.transform=\'scale(1)\'">＋</span></button><p style="margin-top: 0.5rem; font-weight: bold; color: #b91c1c;">Kendin Yaz</p></div> </div> <h2>Raporunuz boş</h2><p>Yukarıdaki butonları kullanarak rapora noksanlık veya mevzuat maddesi ekleyebilirsiniz.</p></div>';
  const emptyButton = stream.querySelector('#open-legislation-modal'); if (emptyButton) { emptyButton.onclick = openLegislationModal; } const emptyManualButton = stream.querySelector('#add-manual-deficiency'); if (emptyManualButton) { emptyManualButton.onclick = startAddingManualDeficiencies; } stream.querySelectorAll('[data-report-position]').forEach((button) => { button.onclick = () => { const position = prompt(`Yeni sıra numarası (1-${data.reports.length}):`, button.textContent.trim()); if (position !== null) moveTo(button.dataset.reportPosition, position); }; });
  stream.querySelectorAll('[data-report-move]').forEach((button) => { button.onclick = () => move(button.dataset.item, button.dataset.reportMove === 'up' ? -1 : 1); });
  stream.querySelectorAll('[data-report-edit]').forEach((button) => { button.onclick = async () => { if (!(await requireAccount())) return; const item = data.reports.find((entry) => entry.id === button.dataset.reportEdit); const title = await customEditTitlePrompt(item?.title || '', item?.html || item?.text || ''); if (title === null || !item) return; item.title = title.trim(); await save(); render(); }; });
  stream.querySelectorAll('[data-report-remove]').forEach((button) => { button.onclick = async () => { if (!(await requireAccount())) return; data.reports = data.reports.filter((item) => item.id !== button.dataset.reportRemove); save(); render(); }; });
  stream.querySelectorAll('.report-repeat').forEach((button) => { button.onclick = async () => { const item = data.reports.find((entry) => entry.id === button.dataset.reportId); if (!item) return; await addReportCopy(item); data = readWorkspace(); render(); }; });
}

function exportWord() {
  const wordContent = (item, index) => {
    const number = `<span class="report-number">${index + 1}.</span>`;
    if (!item.html) return `<p>${number} ${esc(item.text)}</p>`;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = item.html;
    [...wrapper.querySelectorAll('*')].forEach((node) => {
      const style = `${node.getAttribute('style') || ''} ${node.style?.color || ''}`.toLowerCase();
      if (/color\s*:\s*(#1db500|rgb\(\s*29\s*,\s*181\s*,\s*0\s*\)|green)/i.test(style)) node.closest('p')?.remove() || node.remove();
    });
    wrapper.querySelectorAll('p').forEach((paragraph) => {
      const style = `${paragraph.getAttribute('style') || ''} ${paragraph.style?.color || ''}`.toLowerCase();
      if (/(#ff0000|red|rgb\(\s*255)/i.test(style)) {
        paragraph.setAttribute('align', 'justify');
        paragraph.style.textAlign = 'justify';
        paragraph.style.textAlignLast = 'justify';
      }
    });
    if (!item.title) {
      const firstBlock = wrapper.querySelector('p, div');
      if (firstBlock) firstBlock.insertAdjacentHTML('afterbegin', `${number} `);
      else wrapper.insertAdjacentHTML('afterbegin', `<p>${number}</p>`);
    }
    return wrapper.innerHTML;
  };
  const reportHtml = items().map((item, index) => `${item.title ? `<h2>${index + 1}. ${esc(item.title)}</h2>` : ''}${wordContent(item, index)}`).join('<hr>');
  const companyName = document.getElementById('report-company-name').value.trim() || '...................................................';
  const sgkNo = document.getElementById('report-sgk-no').value.trim() || '................................';
  const hazardClass = document.getElementById('report-hazard-class').value || '................................';
  const femaleCount = document.getElementById('report-female-count').value || '......';
  const maleCount = document.getElementById('report-male-count').value || '......';
  
  const headerHtml = `
    <h1 style="text-align: center; margin-bottom: 24pt;">NOKSANLIK RAPORU</h1>
    <table width="100%" style="margin-bottom: 24pt; border-collapse: collapse; font-size: 12pt;">
      <tr><td width="25%" style="padding: 4pt 0;"><strong>İşyeri Ünvanı:</strong></td><td style="padding: 4pt 0;">${esc(companyName)}</td></tr>
      <tr><td style="padding: 4pt 0;"><strong>SGK Numarası:</strong></td><td style="padding: 4pt 0;">${esc(sgkNo)}</td></tr>
      <tr><td style="padding: 4pt 0;"><strong>Tehlike Sınıfı:</strong></td><td style="padding: 4pt 0;">${esc(hazardClass)}</td></tr>
      <tr><td style="padding: 4pt 0;"><strong>Çalışan Sayısı:</strong></td><td style="padding: 4pt 0;">Kadın: ${femaleCount} &nbsp;&nbsp;&nbsp; Erkek: ${maleCount}</td></tr>
    </table>
  `;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.35}h1{font-size:18pt;color:#1a2b4b}h2{font-size:12pt;color:#1a2b4b;margin-bottom:4pt}.report-number{font-weight:700;display:inline-block;margin-right:6pt}.meta{color:#4285be;font-size:10pt}.reference{color:red}.info{color:#1db500}p{margin:0 0 7pt;text-align:justify;text-align-last:justify}</style></head><body>${headerHtml}${reportHtml}</body></html>`;
  const blob = new Blob([html], {type: 'application/msword'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mevzuat-raporu-${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function render() { renderTools(); renderStream(); }

document.querySelector('#report-search').addEventListener('input', () => {
  clearTimeout(reportSearchTimer);
  reportSearchTimer = setTimeout(renderStream, 100);
});

function saveInputs() {
  const meta = {
    company: document.getElementById('report-company-name').value,
    sgk: document.getElementById('report-sgk-no').value,
    hazard: document.getElementById('report-hazard-class').value,
    fCount: document.getElementById('report-female-count').value,
    mCount: document.getElementById('report-male-count').value
  };
  localStorage.setItem('noksanlik-meta', JSON.stringify(meta));
}

document.querySelectorAll('.report-company-input, .report-meta-input').forEach(el => {
  el.addEventListener('input', saveInputs);
  el.addEventListener('change', saveInputs);
});

try {
  const meta = JSON.parse(localStorage.getItem('noksanlik-meta'));
  if (meta) {
    if(meta.company) document.getElementById('report-company-name').value = meta.company;
    if(meta.sgk) document.getElementById('report-sgk-no').value = meta.sgk;
    if(meta.hazard) document.getElementById('report-hazard-class').value = meta.hazard;
    if(meta.fCount) document.getElementById('report-female-count').value = meta.fCount;
    if(meta.mCount) document.getElementById('report-male-count').value = meta.mCount;
  }
} catch(e) {}

await setupAccountUI();
const remote = await hydrateFavorites(KEY);
if (remote) data = remote;
data.reports = Array.isArray(data.reports) ? data.reports : [];
render();



async function openLegislationModal() {
  const modalId = 'legislation-selection-modal';
  if (document.getElementById(modalId)) return;
  const modalHTML = `
    <div id="${modalId}" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(16, 42, 67, 0.4); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(2px);">
      <div style="background: white; border-radius: 12px; width: 90%; max-width: 500px; height: 75vh; max-height: 600px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 12px 24px rgba(16, 42, 67, 0.2);">
        <div style="padding: 1.25rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
          <h2 style="font-size: 1.25rem; margin: 0; color: #102a43;">Mevzuat Seçin</h2>
          <button id="${modalId}-close" style="background: none; border: none; font-size: 1.75rem; line-height: 1; color: #627d98; cursor: pointer; padding: 0 0.5rem;">&times;</button>
        </div>
        <div style="padding: 1rem; border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
          <input type="text" id="${modalId}-search" placeholder="Mevzuat ara..." style="width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 1rem; color: #334e68; outline: none;" />
        </div>
        <div id="${modalId}-list" style="overflow-y: auto; flex: 1; padding: 0.5rem; background: #fff;">
          <div style="padding: 2rem; text-align: center; color: #627d98;">Mevzuat listesi yükleniyor...</div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const modalEl = document.getElementById(modalId);
  const closeBtn = document.getElementById(modalId + '-close');
  const searchInput = document.getElementById(modalId + '-search');
  const listContainer = document.getElementById(modalId + '-list');

  const closeModal = () => modalEl.remove();
  closeBtn.onclick = closeModal;
  modalEl.onclick = (e) => {
    if (e.target === modalEl) closeModal();
  };

  searchInput.addEventListener('focus', (e) => { e.target.style.borderColor = '#2e67d2'; });
  searchInput.addEventListener('blur', (e) => { e.target.style.borderColor = '#cbd5e1'; });

  try {
    const response = await fetch('/manifest.json');
    const data = await response.json();
    const sections = data.sections;

    const renderList = (filter = '') => {
      const query = filter.toLocaleLowerCase('tr-TR');
      const visible = sections.filter(s => s.title.toLocaleLowerCase('tr-TR').includes(query));
      
      listContainer.innerHTML = visible.length ? visible.map(section => `
        <button class="${modalId}-item" data-id="${section.id}" style="display: flex; align-items: center; width: 100%; text-align: left; padding: 1rem; margin-bottom: 0.25rem; border: none; border-radius: 8px; background: white; cursor: pointer; font-size: 0.95rem; font-weight: 500; color: #334e68; transition: background 0.15s; line-height: 1.4;">
          <span style="font-weight: bold; margin-right: 0.75rem; color: #2e67d2; font-size: 1.25rem;">⚏</span>
          ${section.title}
        </button>
      `).join('') : '<div style="padding: 2rem; text-align: center; color: #829ab1;">Aramanızla eşleşen mevzuat bulunamadı.</div>';

      listContainer.querySelectorAll('.' + modalId + '-item').forEach(btn => {
        btn.onmouseover = () => btn.style.background = '#f1f5f9';
        btn.onmouseout = () => btn.style.background = 'white';
        btn.onclick = () => {
          window.open('/mevzuat.html?id=' + encodeURIComponent(btn.dataset.id), '_blank');
          closeModal();
        };
      });
    };

    renderList();

    let typingTimer;
    searchInput.oninput = (e) => {
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => renderList(e.target.value.trim()), 150);
    };

  } catch (error) {
    listContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: #d64545;">Mevzuat listesi yüklenemedi.</div>';
  }
}



async function saveArchive() {
  const companyEl = document.getElementById('report-company-name');
  let company = companyEl.value.trim();
  if (!company) {
    company = prompt('Arşivlemek için İşyeri Ünvanı girin:');
    if (!company) return;
    companyEl.value = company;
  }
  
  const archiveData = {
    company,
    sgk: document.getElementById('report-sgk-no').value.trim(),
    hazard: document.getElementById('report-hazard-class').value,
    fCount: document.getElementById('report-female-count').value,
    mCount: document.getElementById('report-male-count').value,
    reports: JSON.parse(JSON.stringify(data.reports || [])),
    date: Date.now()
  };

  const archives = JSON.parse(localStorage.getItem('noksanlik-archives') || '[]');
  const existingIndex = archives.findIndex(a => a.company.toLocaleLowerCase('tr-TR') === company.toLocaleLowerCase('tr-TR'));
  
  if (existingIndex >= 0) {
    if (confirm('"' + company + '" için zaten bir arşiv var. Düzenlemeler mevcut arşivin üzerine kaydedilsin mi?')) {
      archives[existingIndex] = archiveData;
    } else {
      return;
    }
  } else {
    archives.push(archiveData);
  }
  
  localStorage.setItem('noksanlik-archives', JSON.stringify(archives));
  alert('"' + company + '" başarıyla arşivlendi!');
  renderTools();
}

function loadArchiveModal() {
  const archives = JSON.parse(localStorage.getItem('noksanlik-archives') || '[]');
  if (!archives.length) return alert('Arşivinizde kayıt bulunmuyor.');
  
  const modalId = 'archive-selection-modal';
  if (document.getElementById(modalId)) return;
  
  const modalHTML = `
    <div id="${modalId}" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(16, 42, 67, 0.4); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(2px);">
      <div style="background: white; border-radius: 12px; width: 90%; max-width: 500px; height: 75vh; max-height: 600px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 12px 24px rgba(16, 42, 67, 0.2);">
        <div style="padding: 1.25rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
          <h2 style="font-size: 1.25rem; margin: 0; color: #102a43;">Arşivi Yükle</h2>
          <button id="${modalId}-close" style="background: none; border: none; font-size: 1.75rem; line-height: 1; color: #627d98; cursor: pointer; padding: 0 0.5rem;">&times;</button>
        </div>
        <div id="${modalId}-list" style="overflow-y: auto; flex: 1; padding: 0.5rem; background: #f8fafc;">
          ${archives.map((a, i) => `
            <div class="${modalId}-item" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; margin-bottom: 0.5rem; border-radius: 8px; background: white; border: 1px solid #e2e8f0;">
              <div style="flex:1; cursor:pointer;" onclick="selectArchive(${i})">
                <div style="font-weight: bold; color: #2e67d2; font-size: 1.1rem; margin-bottom: 4px;">${esc(a.company)}</div>
                <div style="font-size: 0.85rem; color: #627d98;">${new Date(a.date).toLocaleDateString('tr-TR')} - ${a.reports.length} hüküm</div>
              </div>
              <button onclick="deleteArchive(${i})" style="background:none; border:none; color: #e12d39; cursor:pointer; padding: 0.5rem; font-size: 1.2rem;" title="Arşivi Sil">🗑️</button>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const modalEl = document.getElementById(modalId);
  window.selectArchive = async (index) => {
    if (!confirm('Ekranda görünen mevcut noksanlık raporu silinecek ve seçili arşiv yüklenecek. Devam etmek istiyor musunuz?')) return;
    const a = JSON.parse(localStorage.getItem('noksanlik-archives'))[index];
    document.getElementById('report-company-name').value = a.company || '';
    document.getElementById('report-sgk-no').value = a.sgk || '';
    document.getElementById('report-hazard-class').value = a.hazard || '';
    document.getElementById('report-female-count').value = a.fCount || '';
    document.getElementById('report-male-count').value = a.mCount || '';
    data.reports = a.reports; saveInputs();
    await save();
    render();
    modalEl.remove();
  };
  window.deleteArchive = (index) => {
    if (!confirm('Bu arşivi kalıcı olarak silmek istiyor musunuz?')) return;
    const archs = JSON.parse(localStorage.getItem('noksanlik-archives'));
    archs.splice(index, 1);
    localStorage.setItem('noksanlik-archives', JSON.stringify(archs));
    modalEl.remove();
    loadArchiveModal(); // re-render modal
  };

  document.getElementById(modalId + '-close').onclick = () => modalEl.remove();
  modalEl.onclick = (e) => { if (e.target === modalEl) modalEl.remove(); };
}


function bulkTitlePrompt(missingItems) {
  return new Promise((resolve) => {
    const modalId = 'bulk-title-prompt-modal';
    if (document.getElementById(modalId)) document.getElementById(modalId).remove();

    const itemsHTML = missingItems.map((m, i) => {
      const fullText = m.item.html || m.item.text || 'İçerik bulunamadı.';
      const escapedText = String(fullText).replace(/[&<>"']/g, function(ch) {
        return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'}[ch];
      });
      return `
        <div style="margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid #e2e8f0;">
          <h3 style="margin: 0 0 0.75rem 0; font-size: 1.15rem; color: #b91c1c;">Eksik Başlık - Madde ${m.index + 1}</h3>
          <div style="padding: 1rem; background: #f1f5f9; border-left: 4px solid #cbd5e1; color: #475f7b; font-size: 0.95rem; margin-bottom: 1rem; max-height: 250px; overflow-y: auto; white-space: pre-wrap; word-wrap: break-word;">${escapedText}</div>
          <textarea id="${modalId}-input-${i}" rows="3" placeholder="Madde ${m.index + 1} için başlık giriniz..." style="width: 100%; padding: 1rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1.05rem; outline: none; font-family: inherit; resize: vertical;"></textarea>
        </div>
      `;
    }).join('');

    const modalHTML = `
      <div id="${modalId}" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(16, 42, 67, 0.6); display: flex; align-items: center; justify-content: center; z-index: 99999; backdrop-filter: blur(4px);">
        <div style="background: white; border-radius: 12px; width: 90%; max-width: 900px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 12px 24px rgba(0,0,0,0.3);">
          
          <div style="padding: 1.25rem; background: #f8fafc; border-bottom: 2px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="font-size: 1.25rem; margin: 0; color: #102a43; font-weight: bold;">⚠️ Word'e Aktarım Öncesi Eksik Başlıkları Tamamlayın</h2>
            <button id="${modalId}-close" style="background: none; border: none; font-size: 1.75rem; cursor: pointer; color: #627d98;">&times;</button>
          </div>
          
          <div style="padding: 1.25rem; overflow-y: auto; flex: 1; background: #fff;">
            ${itemsHTML}
          </div>
          
          <div style="padding: 1.25rem; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button id="${modalId}-cancel" style="padding: 0.75rem 1.75rem; background: white; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; color: #627d98; font-weight: 600;">İptal ve Geri Dön</button>
            <button id="${modalId}-submit" style="padding: 0.75rem 2rem; background: #2e67d2; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600; box-shadow: 0 2px 4px rgba(46, 103, 210, 0.2);">Tümünü Kaydet ve Aktar</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalEl = document.getElementById(modalId);
    if(missingItems.length > 0) setTimeout(() => document.getElementById(`${modalId}-input-0`).focus(), 50);

    const cleanup = () => modalEl.remove();

    document.getElementById(modalId + '-cancel').onclick = () => { cleanup(); resolve(null); };
    document.getElementById(modalId + '-close').onclick = () => { cleanup(); resolve(null); };
    document.getElementById(modalId + '-submit').onclick = () => {
      const results = [];
      for(let i=0; i<missingItems.length; i++) {
         const inputEl = document.getElementById(`${modalId}-input-${i}`);
         const val = inputEl.value.trim();
         if(!val) {
            inputEl.style.borderColor = '#b91c1c';
            alert(`Lütfen Madde ${missingItems[i].index + 1} için başlık girin.`);
            inputEl.focus();
            return;
         }
         results.push(val);
      }
      cleanup();
      resolve(results);
    };
  });
}

function customEditTitlePrompt(currentTitle, fullText) {
  return new Promise((resolve) => {
    const modalId = 'custom-edit-title-modal';
    if (document.getElementById(modalId)) document.getElementById(modalId).remove();

    let previewHtml = '';
    if (fullText) {
      const escapedText = String(fullText).replace(/[&<>"']/g, function(m) {
        return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'}[m];
      });
      previewHtml = `<div style="padding: 1rem; background: #f1f5f9; border-left: 4px solid #cbd5e1; color: #475f7b; font-size: 0.95rem; line-height: 1.5; max-height: 30vh; overflow-y: auto; margin-bottom: 1rem; white-space: pre-wrap; word-wrap: break-word;">${escapedText}</div>`;
    }

    const modalHTML = `
      <div id="${modalId}" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(16, 42, 67, 0.6); display: flex; align-items: center; justify-content: center; z-index: 99999; backdrop-filter: blur(4px);">
        <div style="background: white; border-radius: 12px; width: 90%; max-width: 800px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 12px 24px rgba(16, 42, 67, 0.3);">
          
          <div style="padding: 1.25rem; background: #f8fafc; border-bottom: 2px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="font-size: 1.25rem; margin: 0; color: #102a43; font-weight: bold;">✏️ BAŞLIĞI DÜZENLE</h2>
            <button id="${modalId}-close" style="background: none; border: none; font-size: 1.75rem; cursor: pointer; color: #627d98;">&times;</button>
          </div>
          
          <div style="padding: 1.25rem; background: #fff;">
            ${previewHtml}
            <textarea id="${modalId}-input" rows="3" placeholder="Başlığı buraya yazın..." style="width: 100%; padding: 1rem; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 1.05rem; outline: none; font-family: inherit;">${currentTitle || ''}</textarea>
          </div>
          
          <div style="padding: 1.25rem; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button id="${modalId}-cancel" style="padding: 0.75rem 1.75rem; background: white; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; color: #627d98; font-weight: 600;">İptal</button>
            <button id="${modalId}-submit" style="padding: 0.75rem 2rem; background: #2e67d2; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600; box-shadow: 0 2px 4px rgba(46, 103, 210, 0.2);">Kaydet</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalEl = document.getElementById(modalId);
    const inputEl = document.getElementById(modalId + '-input');
    setTimeout(() => {
       inputEl.focus();
       inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
    }, 50);

    const cleanup = () => modalEl.remove();

    document.getElementById(modalId + '-cancel').onclick = () => { cleanup(); resolve(null); };
    document.getElementById(modalId + '-close').onclick = () => { cleanup(); resolve(null); };
    document.getElementById(modalId + '-submit').onclick = () => {
      cleanup();
      resolve(inputEl.value);
    };
  });
}

async function ensureTitles() {
  const missing = data.reports.map((item, i) => ({item, index: i})).filter(x => !x.item.title || !x.item.title.trim());
  if (!missing.length) return true;

  const results = await bulkTitlePrompt(missing);
  if (!results) {
    alert('Word\'e aktarım işlemi iptal edildi.\nTüm eksik maddelere birer başlık girmeden işlem yapılamaz.');
    return false;
  }

  for (let i = 0; i < missing.length; i++) {
    missing[i].item.title = results[i].trim();
  }
  await save();
  render();
  return true;
}

async function exportWordTitles() {
  if (!items().length) return alert('Raporunuzda hüküm bulunmuyor.');
  
  const ok = await ensureTitles();
  if (!ok) return;

  const companyName = document.getElementById('report-company-name').value.trim() || '...................................................';
  const sgkNo = document.getElementById('report-sgk-no').value.trim() || '................................';
  const hazardClass = document.getElementById('report-hazard-class').value || '................................';
  const femaleCount = document.getElementById('report-female-count').value || '......';
  const maleCount = document.getElementById('report-male-count').value || '......';
  
  const headerHtml = `
    <h1 style="text-align: center; margin-bottom: 24pt;">NOKSANLIKLAR</h1>
    <table width="100%" style="margin-bottom: 24pt; border-collapse: collapse; font-size: 12pt;">
      <tr><td width="25%" style="padding: 4pt 0;"><strong>İşyeri Ünvanı:</strong></td><td style="padding: 4pt 0;">${esc(companyName)}</td></tr>
      <tr><td style="padding: 4pt 0;"><strong>SGK Numarası:</strong></td><td style="padding: 4pt 0;">${esc(sgkNo)}</td></tr>
      <tr><td style="padding: 4pt 0;"><strong>Tehlike Sınıfı:</strong></td><td style="padding: 4pt 0;">${esc(hazardClass)}</td></tr>
      <tr><td style="padding: 4pt 0;"><strong>Çalışan Sayısı:</strong></td><td style="padding: 4pt 0;">Kadın: ${femaleCount} &nbsp;&nbsp;&nbsp; Erkek: ${maleCount}</td></tr>
    </table>
  `;
  
  const reportHtml = items().map((item, index) => {
    return `<p style="margin-bottom: 8pt; font-size: 12pt; text-align: left; text-align-last: left; margin: 0 0 10pt 0;"><strong>${index + 1}.</strong> ${esc(item.title)}</p>`;
  }).join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.35}h1{font-size:18pt;color:#1a2b4b}</style></head><body>${headerHtml}${reportHtml}</body></html>`;
  const blob = new Blob([html], {type: 'application/msword'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `noksanlik-basliklari-${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
