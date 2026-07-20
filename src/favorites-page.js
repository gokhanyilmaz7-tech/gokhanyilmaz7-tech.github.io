import './favorites-page.css';
import './report-link.css';
import {hydrateFavorites, persistFavorites, setupAccountUI} from './auth.js';
import {bindFavoriteReportButtons, reportButton, reportRepeatButton, reportItems} from './report.js';

const KEY = 'mevzuat-local-favorites';
const PENDING_KEY = 'mevzuat-pending-favorite';
const esc = (value) => String(value || '').replace(/[&<>"']/g, (c) => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'}[c]));
const sourceHref = (item) => { const match = String(item.id || '').match(/-(\d+)-(\d+)$/); const params = new URLSearchParams(); if (match) { params.set('page', match[1]); params.set('block', match[2]); } return `/mevzuat.html?id=${encodeURIComponent(item.sectionId)}${params.toString() ? `&${params}` : ''}`; };
const uid = () => crypto.randomUUID();
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{"lists":[]}'); } catch { return {lists: []}; } };
const save = (data) => { localStorage.setItem(KEY, JSON.stringify(data)); persistFavorites(data, KEY); };
const normalizeFavoriteHtml = (html) => {
  let normalized = String(html || '').replaceAll('white-space:pre', 'white-space:normal');
  let previous;
  do {
    previous = normalized;
    normalized = normalized.replace(/<p([^>]*color:\s*#1db500[^>]*)>([\s\S]*?)<\/p>\s*<p([^>]*color:\s*#1db500[^>]*)>([\s\S]*?)<\/p>/gi, '<p$1>$2 $4</p>');
  } while (normalized !== previous);
  return normalized;
};

let data = read();
let selectedList = 'all';
let sortMode = 'manual';
let pending = null;

const context = document.querySelector('.eyebrow');
if (context) {
  context.id = 'favorites-context';
  context.classList.add('favorites-context');
}
document.querySelector('#favorites-meta')?.remove();

const allItems = () => {
  const items = [...new Map(data.lists.flatMap((list) => list.items || []).map((item) => [item.id, item])).values()];
  const byId = new Map(items.map((item) => [item.id, item]));
  const order = Array.isArray(data.order) ? data.order : [];
  const ordered = order.map((id) => byId.get(id)).filter(Boolean);
  const known = new Set(order);
  return [...ordered, ...items.filter((item) => !known.has(item.id))];
};
const currentItems = () => selectedList === 'all' ? allItems() : data.lists.find((list) => list.id === selectedList)?.items || [];

function sortItems(items) {
  if (sortMode === 'manual') return [...items];
  return [...items].sort((a, b) => sortMode === 'title'
    ? String(a.title || a.location).localeCompare(String(b.title || b.location), 'tr')
    : sortMode === 'oldest'
      ? (a.savedAt || 0) - (b.savedAt || 0)
      : (b.savedAt || 0) - (a.savedAt || 0));
}

function moveItem(itemId, direction) {
  if (selectedList === 'all') {
    const items = allItems();
    const index = items.findIndex((item) => item.id === itemId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    data.order = items.map((item) => item.id);
    sortMode = 'manual';
    save(data);
    render();
    return;
  }
  const list = data.lists.find((entry) => entry.id === selectedList);
  if (!list) return;
  const index = list.items.findIndex((item) => item.id === itemId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= list.items.length) return;
  [list.items[index], list.items[target]] = [list.items[target], list.items[index]];
  sortMode = 'manual';
  save(data);
  render();
}

function moveItemTo(itemId, requestedPosition) {
  const items = selectedList === 'all'
    ? allItems()
    : data.lists.find((entry) => entry.id === selectedList)?.items || [];
  const index = items.findIndex((item) => item.id === itemId);
  const position = Number.parseInt(requestedPosition, 10);
  if (index < 0 || !Number.isInteger(position) || position < 1 || position > items.length) return;
  const [item] = items.splice(index, 1);
  items.splice(position - 1, 0, item);
  if (selectedList === 'all') data.order = items.map((entry) => entry.id);
  else data.lists.find((entry) => entry.id === selectedList).items = items;
  sortMode = 'manual';
  save(data);
  render();
}

function createList() {
  const name = prompt('Liste adı:');
  if (!name?.trim()) return;
  const list = {id: uid(), name: name.trim(), items: []};
  data.lists.push(list);
  selectedList = list.id;
  save(data);
  render();
}

function renderTools() {
  const tools = document.querySelector('#favorites-side-tools');
  tools.innerHTML = `<div class="side-tools-heading"><span>FAVORİ ARAÇLARI</span><strong>${allItems().length} hüküm</strong></div><div class="favorite-list-buttons"><button data-list="all" class="${selectedList === 'all' ? 'active' : ''}">☆ Tümü (${allItems().length})</button>${data.lists.map((list) => `<button data-list="${list.id}" class="${selectedList === list.id ? 'active' : ''}">▸ ${esc(list.name)} <small>${list.items.length}</small></button>`).join('')}</div><a class="side-tool-button report-link-button" href="/report.html">＋ Raporum</a><button id="new-favorite-list" class="side-tool-button">＋ Favori listesi oluştur</button><button id="rename-favorite-list" class="side-tool-button" ${selectedList === 'all' ? 'disabled' : ''}>✎ Liste başlığını değiştir</button><button id="sort-favorites" class="side-tool-button">↕ Sıralama: ${sortMode === 'manual' ? 'özel sıra' : sortMode === 'latest' ? 'yeniden eskiye' : sortMode === 'oldest' ? 'eskiden yeniye' : 'başlığa göre'}</button>`;
  tools.querySelectorAll('[data-list]').forEach((button) => { button.onclick = () => { selectedList = button.dataset.list; render(); }; });
  tools.querySelector('#new-favorite-list').onclick = createList;
  tools.querySelector('#rename-favorite-list').onclick = () => {
    const list = data.lists.find((item) => item.id === selectedList);
    const name = list && prompt('Yeni liste başlığı:', list.name);
    if (!name?.trim()) return;
    list.name = name.trim(); save(data); render();
  };
  tools.querySelector('#sort-favorites').onclick = () => { sortMode = sortMode === 'manual' ? 'latest' : sortMode === 'latest' ? 'oldest' : sortMode === 'oldest' ? 'title' : 'manual'; render(); };
}

function renderPending() {
  const existing = document.querySelector('#favorite-inline-editor');
  if (existing) existing.remove();
  if (!pending) return;
  const editor = document.createElement('section');
  editor.id = 'favorite-inline-editor';
  editor.innerHTML = `<div><p class="eyebrow">YENİ FAVORİ</p><h2>Hükmü favoriye al</h2><p>${esc(pending.location)} · ${esc(pending.sectionTitle)}</p></div><input id="pending-title" placeholder="Hatırlatıcı başlık (isteğe bağlı)" value="${esc(pending.title)}"><div class="pending-lists">${data.lists.map((list) => `<label><input type="checkbox" value="${list.id}" ${selectedList === list.id ? 'checked' : ''}> ${esc(list.name)}</label>`).join('') || '<small>Önce sağdan bir favori listesi oluşturun.</small>'}</div><div class="pending-actions"><button id="pending-save" class="primary-tool">Kaydet</button><button id="pending-cancel" class="side-tool-button">Vazgeç</button></div>`;
  document.querySelector('#favorites-stream').before(editor);
  editor.querySelector('#pending-save').onclick = () => {
    const listIds = [...editor.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
    if (!listIds.length) { alert('En az bir liste seçin.'); return; }
    const item = {...pending, title: editor.querySelector('#pending-title').value.trim(), savedAt: Date.now()};
    data.lists.forEach((list) => { if (listIds.includes(list.id) && !list.items.some((entry) => entry.id === item.id)) list.items.push(item); });
    save(data); localStorage.removeItem(PENDING_KEY); pending = null; render();
  };
  editor.querySelector('#pending-cancel').onclick = () => { localStorage.removeItem(PENDING_KEY); pending = null; render(); };
}

function renderStream() {
  const query = document.querySelector('#favorites-search').value.trim().toLocaleLowerCase('tr-TR');
  const visible = sortItems(currentItems()).filter((item) => !query || `${item.title} ${item.text} ${item.sectionTitle} ${item.location}`.toLocaleLowerCase('tr-TR').includes(query));
  document.querySelector('#favorites-result').textContent = query ? `${visible.length} sonuç` : '';
  const listName = selectedList === 'all' ? 'Tüm Favoriler' : data.lists.find((list) => list.id === selectedList)?.name || 'Favorilerim';
  document.querySelector('#favorites-context').textContent = listName;
  const stream = document.querySelector('#favorites-stream');
  stream.innerHTML = visible.length ? visible.map((item) => { const listItems = selectedList === 'all' ? allItems() : data.lists.find((list) => list.id === selectedList)?.items || []; const index = listItems.findIndex((entry) => entry.id === item.id); const moveButtons = `<div class="favorite-card-reorder" aria-label="Favori hükmü sırala"><button data-move="up" data-item="${item.id}" ${index <= 0 ? 'disabled' : ''} aria-label="Hükmü yukarı taşı" title="Yukarı taşı">↑</button><button data-move="down" data-item="${item.id}" ${index < 0 || index >= listItems.length - 1 ? 'disabled' : ''} aria-label="Hükmü aşağı taşı" title="Aşağı taşı">↓</button></div>`; const reported = reportItems(data).some((entry) => (entry.sourceId || entry.id) === item.id); return `<div class="favorite-provision-shell"><button class="favorite-card-position" data-position="${item.id}" type="button" aria-label="Sıra numarasını değiştir" title="Bu hükmü doğrudan başka sıraya taşı">${index + 1}</button>${reportButton(item, 'report-plus-card', reported)}${reported ? reportRepeatButton(item) : ''}<article class="favorite-provision-card"><div class="favorite-card-main"><div class="favorite-card-meta">${esc(item.sectionTitle)} · ${esc(item.location)}</div>${item.title ? `<h2>${esc(item.title)}</h2>` : ''}<div class="favorite-provision-rich-text">${item.html ? normalizeFavoriteHtml(item.html) : `<p>${esc(item.text)}</p>`}</div><a class="favorite-source-link" href="${sourceHref(item)}">Seçili mevzuatta aç →</a></div><div class="favorite-card-actions"><button data-edit="${item.id}">Başlığı değiştir</button><button data-remove="${item.id}">Listeden çıkar</button>${moveButtons}</div></article></div>`; }).join('') : '<div class="favorite-empty"><span>☆</span><h2>Henüz favori hüküm yok</h2><p>Seçili mevzuat sayfasında mavi yıldızlara tıklayarak hüküm ekleyebilirsiniz.</p></div>';
  stream.querySelectorAll('[data-position]').forEach((button) => { button.onclick = () => { const current = button.textContent.trim(); const position = prompt(`Yeni sıra numarası (1-${visible.length}):`, current); if (position === null) return; moveItemTo(button.dataset.position, position); }; });
  stream.querySelectorAll('[data-move]').forEach((button) => { button.onclick = () => moveItem(button.dataset.item, button.dataset.move === 'up' ? -1 : 1); });
  stream.querySelectorAll('[data-edit]').forEach((button) => { button.onclick = () => { const item = allItems().find((entry) => entry.id === button.dataset.edit); const title = prompt('Favori başlığı:', item?.title || ''); if (title === null) return; item.title = title.trim(); save(data); renderStream(); }; });
  stream.querySelectorAll('[data-remove]').forEach((button) => { button.onclick = () => { data.lists.forEach((list) => { list.items = list.items.filter((item) => item.id !== button.dataset.remove); }); save(data); render(); }; });
}

function render() { renderTools(); renderPending(); renderStream(); }

const pendingRaw = localStorage.getItem(PENDING_KEY);
const requestedId = new URLSearchParams(window.location.search).get('add');
if (pendingRaw && requestedId) { try { pending = JSON.parse(pendingRaw); } catch { localStorage.removeItem(PENDING_KEY); } }
document.querySelector('#favorites-search').addEventListener('input', renderStream);
await setupAccountUI();
const remoteFavorites = await hydrateFavorites(KEY);
if (remoteFavorites) data = remoteFavorites;
bindFavoriteReportButtons();
render();
