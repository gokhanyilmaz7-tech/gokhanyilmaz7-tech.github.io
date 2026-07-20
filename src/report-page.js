import './favorites-page.css';
import './report-page.css';
import {hydrateFavorites, persistFavorites, setupAccountUI} from './auth.js';
import {readWorkspace, reportItems, reportButton} from './report.js';

const KEY = 'mevzuat-local-favorites';
const esc = (value) => String(value || '').replace(/[&<>"']/g, (c) => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'}[c]));
const uid = () => crypto.randomUUID();
const normalizeHtml = (html) => String(html || '').replaceAll('white-space:pre', 'white-space:normal');
let data = readWorkspace();
let sortMode = 'manual';

const save = async () => { localStorage.setItem(KEY, JSON.stringify(data)); await persistFavorites(data, KEY); };
const items = () => reportItems(data);
const sortedItems = () => [...items()].sort((a, b) => sortMode === 'title' ? String(a.title || a.location).localeCompare(String(b.title || b.location), 'tr') : sortMode === 'oldest' ? (a.savedAt || 0) - (b.savedAt || 0) : sortMode === 'latest' ? (b.savedAt || 0) - (a.savedAt || 0) : 0);

function renderTools() {
  const tools = document.querySelector('#report-side-tools');
  tools.innerHTML = `<div class="side-tools-heading"><span>RAPOR ARAÇLARI</span><strong>${items().length} hüküm</strong></div><a class="side-tool-button report-back-favorites" href="/favoriler.html">☆ Favorilerim</a><button id="report-sort" class="side-tool-button">↕ Sıralama: ${sortMode === 'manual' ? 'özel sıra' : sortMode === 'latest' ? 'yeniden eskiye' : sortMode === 'oldest' ? 'eskiden yeniye' : 'başlığa göre'}</button><button id="report-word" class="primary-tool">▣ Word'e aktar</button>`;
  tools.querySelector('#report-sort').onclick = () => { sortMode = sortMode === 'manual' ? 'latest' : sortMode === 'latest' ? 'oldest' : sortMode === 'oldest' ? 'title' : 'manual'; render(); };
  tools.querySelector('#report-word').onclick = exportWord;
}

function move(itemId, direction) {
  const index = data.reports.findIndex((item) => item.id === itemId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= data.reports.length) return;
  [data.reports[index], data.reports[target]] = [data.reports[target], data.reports[index]];
  sortMode = 'manual'; save(); render();
}

function moveTo(itemId, requested) {
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
    return `<div class="favorite-provision-shell report-provision-shell"><button class="favorite-card-position" data-report-position="${esc(item.id)}" type="button" aria-label="Rapor sıra numarasını değiştir" title="Bu hükmü doğrudan başka sıraya taşı">${index + 1}</button>${reportButton(item, 'report-plus-card', true)}<article class="favorite-provision-card report-provision-card"><div class="favorite-card-main">${item.title ? `<h2>${esc(item.title)}</h2>` : ''}<div class="favorite-provision-rich-text">${item.html ? normalizeHtml(item.html) : `<p>${esc(item.text)}</p>`}</div><a class="favorite-source-link" href="/mevzuat.html?id=${encodeURIComponent(item.sectionId)}">Seçili mevzuatta aç →</a></div><div class="favorite-card-actions"><button data-report-edit="${esc(item.id)}">Başlığı değiştir</button><button data-report-remove="${esc(item.id)}">Rapordan çıkar</button><div class="favorite-card-reorder"><button data-report-move="up" data-item="${esc(item.id)}" ${index <= 0 ? 'disabled' : ''} aria-label="Yukarı taşı" title="Yukarı taşı">↑</button><button data-report-move="down" data-item="${esc(item.id)}" ${index >= data.reports.length - 1 ? 'disabled' : ''} aria-label="Aşağı taşı" title="Aşağı taşı">↓</button></div></div></article></div>`;
  }).join('') : '<div class="favorite-empty"><span>＋</span><h2>Raporunuz boş</h2><p>Seçili mevzuat veya favoriler sayfasında mavi artı simgesine tıklayarak hüküm ekleyebilirsiniz.</p></div>';
  stream.querySelectorAll('[data-report-position]').forEach((button) => { button.onclick = () => { const position = prompt(`Yeni sıra numarası (1-${data.reports.length}):`, button.textContent.trim()); if (position !== null) moveTo(button.dataset.reportPosition, position); }; });
  stream.querySelectorAll('[data-report-move]').forEach((button) => { button.onclick = () => move(button.dataset.item, button.dataset.reportMove === 'up' ? -1 : 1); });
  stream.querySelectorAll('[data-report-edit]').forEach((button) => { button.onclick = () => { const item = data.reports.find((entry) => entry.id === button.dataset.reportEdit); const title = prompt('Rapor başlığı:', item?.title || ''); if (title === null || !item) return; item.title = title.trim(); save(); render(); }; });
  stream.querySelectorAll('[data-report-remove]').forEach((button) => { button.onclick = () => { data.reports = data.reports.filter((item) => item.id !== button.dataset.reportRemove); save(); render(); }; });
}

function exportWord() {
  const reportHtml = items().map((item, index) => `${item.title ? `<h2>${index + 1}. ${esc(item.title)}</h2>` : ''}${item.html || `<p>${esc(item.text)}</p>`}`).join('<hr>');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.35}h1{font-size:20pt;color:#1a2b4b}h2{font-size:14pt;color:#1a2b4b;margin-bottom:4pt}.meta{color:#4285be;font-size:10pt}.reference{color:red}.info{color:#1db500}p{margin:0 0 7pt;text-align:justify}</style></head><body><h1>Mevzuat Rehberi - Raporum</h1>${reportHtml}</body></html>`;
  const blob = new Blob([html], {type: 'application/msword'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mevzuat-raporu-${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function render() { renderTools(); renderStream(); }

document.querySelector('#report-search').addEventListener('input', renderStream);
await setupAccountUI();
const remote = await hydrateFavorites(KEY);
if (remote) data = remote;
data.reports = Array.isArray(data.reports) ? data.reports : [];
render();
