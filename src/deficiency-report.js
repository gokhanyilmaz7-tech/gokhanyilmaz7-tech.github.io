import './styles.css';
import './section.css';
import './favorites-page.css';
import './auth.css';
import './deficiency-report.css';
import {setupAccountUI} from './auth.js';

const esc = (value) => String(value || '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const normalize = (value) => String(value || '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const STORAGE_KEY = 'mevzuat-noksanlik-raporu';
let manifest = [];
let deficiencies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let activeIndex = -1;
let selectedSections = new Set();
let provisionCache = new Map();

const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(deficiencies));
const parseDeficiencies = (value) => String(value || '').split(/\r?\n/).map((line) => line.replace(/^\s*(?:\d+\s*[.)-]|[-•])\s*/, '').trim()).filter(Boolean);
const input = document.querySelector('#deficiency-input');
const toolbar = document.createElement('div');
toolbar.className = 'deficiency-toolbar';
toolbar.innerHTML = '<button type="button" data-format-list="number">1. Numaralandır</button><button type="button" data-format-list="bullet">• Madde işareti</button><button type="button" data-format-list="plain">Numaraları kaldır</button>';
input.before(toolbar);
toolbar.querySelectorAll('[data-format-list]').forEach((button) => button.onclick = () => {
  const mode = button.dataset.formatList;
  const lines = input.value.split(/\r?\n/).map((line) => line.replace(/^\s*(?:\d+\s*[.)-]|[-•])\s*/, '').trim()).filter(Boolean);
  input.value = lines.map((line, index) => mode === 'number' ? `${index + 1}. ${line}` : mode === 'bullet' ? `• ${line}` : line).join('\n');
  input.focus();
});

function renderList() {
  const list = document.querySelector('#deficiency-list');
  list.innerHTML = deficiencies.length ? deficiencies.map((item, index) => `<article class="deficiency-item"><h2><span class="deficiency-item-number">${index + 1}</span>${esc(item.text)}</h2><button class="deficiency-add" data-add-provision="${index}" type="button">${item.provision ? 'Hükmü değiştir' : 'Hüküm ara ve ekle'}</button>${item.provision ? `<div class="attached-provision"><h3>${esc(item.provision.sectionTitle)} · ${esc(item.provision.location)}</h3>${item.provision.html ? `<div class="attached-provision-rich-text">${item.provision.html}</div>` : `<p>${esc(item.provision.text)}</p>`}<a class="attached-provision-source" href="/mevzuat.html?id=${encodeURIComponent(item.provision.sectionId)}&page=${encodeURIComponent(item.provision.page)}&block=${encodeURIComponent(item.provision.block)}" target="_blank" rel="noopener">Mevzuatta aç →</a></div>` : ''}</article>`).join('') : '<p class="dialog-empty">Henüz noksanlık eklenmedi.</p>';
  list.querySelectorAll('[data-add-provision]').forEach((button) => { button.onclick = () => openDialog(Number(button.dataset.addProvision)); });
}

function openDialog(index) {
  activeIndex = index;
  selectedSections = new Set(manifest.map((section) => section.id));
  document.querySelector('#provision-dialog').hidden = false;
  renderLawSelect();
  document.querySelector('#provision-query').focus();
}

function closeDialog() { document.querySelector('#provision-dialog').hidden = true; activeIndex = -1; }
function renderLawSelect() {
  document.querySelector('#law-select').innerHTML = manifest.map((section) => `<label><input type="checkbox" data-law="${section.id}" ${selectedSections.has(section.id) ? 'checked' : ''}> <span>${esc(section.title)}</span></label>`).join('');
  document.querySelectorAll('[data-law]').forEach((checkbox) => { checkbox.onchange = () => checkbox.checked ? selectedSections.add(checkbox.dataset.law) : selectedSections.delete(checkbox.dataset.law); });
}

async function loadProvisions(section) {
  if (provisionCache.has(section.id)) return provisionCache.get(section.id);
  const data = await fetch('/sections/' + section.id + '.json').then((response) => response.json());
  const provisions = data.pages.flatMap((page) => page.text.split(/\n\s*\n/).map((chunk, block) => ({text: chunk.replace(/\s+/g, ' ').trim(), block})).filter((item) => item.text && /(MADDE\s+\d+|EK\s+MADDE)/i.test(item.text)).map((item) => ({sectionId: section.id, sectionTitle: section.title, page: page.page, block: item.block, location: 'Sayfa ' + page.page, text: item.text})));
  provisionCache.set(section.id, provisions);
  return provisions;
}

function browseResults() {
  return manifest.filter((section) => selectedSections.has(section.id)).map((section) => `<button class="browse-law" data-browse-law="${section.id}" type="button"><strong>${esc(section.title)}</strong><span>Bu pencerenin içinde hükümleri görüntüle →</span></button>`).join('');
}

async function browseLaw(sectionId) {
  const section = manifest.find((item) => item.id === sectionId);
  const results = document.querySelector('#provision-results');
  if (!section) return;
  results.innerHTML = '<p class="dialog-empty">Mevzuat hükümleri yükleniyor…</p>';
  const provisions = await loadProvisions(section);
  results.innerHTML = `<p class="dialog-empty">${esc(section.title)} içinden bir hüküm seçin:</p>${provisions.map((item) => `<button class="provision-result" data-provision="${esc(JSON.stringify(item))}" type="button"><strong>${esc(item.location)}</strong><span>${esc(item.text.slice(0, 1200))}${item.text.length > 1200 ? '…' : ''}</span></button>`).join('')}`;
  results.querySelectorAll('[data-provision]').forEach((button) => { button.onclick = () => { deficiencies[activeIndex].provision = JSON.parse(button.dataset.provision); save(); renderList(); closeDialog(); }; });
}

async function searchProvisions() {
  const query = normalize(document.querySelector('#provision-query').value.trim());
  const results = document.querySelector('#provision-results');
  if (!query) { results.innerHTML = '<p class="dialog-empty">Arama yapmak için bir kelime yazın.</p>'; return; }
  if (!selectedSections.size) { results.innerHTML = '<p class="dialog-empty">En az bir mevzuat seçin.</p>'; return; }
  results.innerHTML = '<p class="dialog-empty">Hükümler aranıyor…</p>';
  const groups = await Promise.all(manifest.filter((section) => selectedSections.has(section.id)).map(loadProvisions));
  const found = groups.flat().filter((item) => normalize(item.text).includes(query)).slice(0, 100);
  results.innerHTML = found.length ? found.map((item) => `<button class="provision-result" data-provision="${esc(JSON.stringify(item))}" type="button"><strong>${esc(item.sectionTitle)} · ${esc(item.location)}</strong><span>${esc(item.text.slice(0, 900))}${item.text.length > 900 ? '…' : ''}</span></button>`).join('') : `<p class="dialog-empty">Arama sonucu bulunamadı. İsterseniz mevzuatı açıp hükmü doğrudan seçin:</p>${browseResults()}`;
  results.querySelectorAll('[data-provision]').forEach((button) => { button.onclick = () => { deficiencies[activeIndex].provision = JSON.parse(button.dataset.provision); save(); renderList(); closeDialog(); }; });
  results.querySelectorAll('[data-browse-law]').forEach((button) => { button.onclick = () => browseLaw(button.dataset.browseLaw); });
}

function attachProvision(provision) {
  if (activeIndex < 0 || !deficiencies[activeIndex]) return;
  deficiencies[activeIndex].provision = provision;
  save(); renderList(); closeDialog();
}
window.addEventListener('message', (event) => { if (event.origin !== window.location.origin || event.data?.type !== 'deficiency-provision') return; if (Number(event.data.index) !== activeIndex) return; attachProvision(event.data.provision); });

function exportWord() {
  if (!deficiencies.length) return;
  const body = deficiencies.map((item, index) => `<h2>${index + 1}. ${esc(item.text)}</h2>${item.provision ? `<div class="provision"><strong>${esc(item.provision.sectionTitle)} · ${esc(item.provision.location)}</strong>${item.provision.html || `<p>${esc(item.provision.text)}</p>`}</div>` : '<p class="missing">Bu noksanlık için hüküm eklenmedi.</p>'}`).join('<hr>');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.4}h1{color:#1a2b4b;font-size:20pt}h2{color:#d9468b;font-size:13pt;margin-bottom:7pt}.provision{border-left:3px solid #2679d0;padding-left:10pt}.provision strong{color:#2679d0;font-size:10pt}.provision p{text-align:justify}.missing{color:#a0a0a0;font-style:italic}hr{border:0;border-top:1px solid #ddd;margin:18pt 0}</style></head><body><h1>Noksanlık Raporu</h1>${body}</body></html>`;
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([html], {type: 'application/msword'})); link.download = 'noksanlik-raporu-' + new Date().toISOString().slice(0, 10) + '.doc'; document.body.append(link); link.click(); link.remove();
}

document.querySelector('#add-deficiencies').onclick = () => { deficiencies = parseDeficiencies(input.value).map((text) => ({text})); save(); renderList(); };
document.querySelector('#deficiency-word').onclick = exportWord;
document.querySelector('#provision-search').onclick = searchProvisions;
document.querySelector('#provision-query').addEventListener('keydown', (event) => { if (event.key === 'Enter') searchProvisions(); });
document.querySelectorAll('[data-close-dialog]').forEach((element) => element.onclick = closeDialog);
await setupAccountUI();
manifest = await fetch('/manifest.json').then((response) => response.json()).then((data) => data.sections || []);
renderList();
