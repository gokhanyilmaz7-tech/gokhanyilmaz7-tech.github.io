import './admin-provisions.css';
import './admin-provisions-visible.css';
import './admin-provisions-color.css';
import './admin-provisions-layout.css';

const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'}[character]));
let formatTemplate = null;

function provisionKey(page, block) {
  return `${page}:${block}`;
}

function applyOverride(card, override) {
  if (!override) return;
  card.classList.toggle('admin-deleted-provision', Boolean(override.deleted));
  if (override.html) {
    const content = card.querySelector('.provision-content');
    const source = card.querySelector('.copy-html-source');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = override.html;
    const storedWrapper = wrapper.firstElementChild?.classList.contains('admin-override-content') ? wrapper.firstElementChild : null;
    const html = storedWrapper ? storedWrapper.innerHTML : wrapper.innerHTML;
    if (content) content.innerHTML = `<div class="admin-override-content">${html}</div>`;
    if (source) source.innerHTML = html;
  }
}

function editorHtml(root) {
  const copy = root.cloneNode(true);
  copy.querySelectorAll('.admin-override-content').forEach((wrapper) => wrapper.replaceWith(...wrapper.childNodes));
  copy.querySelectorAll('.word').forEach((word) => {
    word.style.marginRight = '0';
    word.style.whiteSpace = 'normal';
    word.style.display = 'inline';
  });
  copy.querySelectorAll('font').forEach((font) => {
    const span = document.createElement('span');
    if (font.getAttribute('face')) span.style.fontFamily = font.getAttribute('face');
    if (font.getAttribute('color')) span.style.color = font.getAttribute('color');
    const sizes = {1: '11px', 2: '13px', 3: '16px', 4: '18px', 5: '22px', 6: '26px', 7: '30px'};
    if (font.getAttribute('size')) span.style.fontSize = sizes[font.getAttribute('size')] || '16px';
    span.innerHTML = font.innerHTML;
    font.replaceWith(span);
  });
  return copy.innerHTML;
}

function blockNodes(root) {
  return [...root.querySelectorAll('p,h2,h3,li,div,section')].filter((node) => node !== root && !node.classList.contains('admin-override-content'));
}

function normalizeWordFlow(root) {
  root.querySelectorAll('.word').forEach((word) => {
    word.style.display = 'inline';
    word.style.whiteSpace = 'normal';
    word.style.marginRight = '0';
    word.style.wordBreak = 'normal';
    word.style.overflowWrap = 'normal';
  });
  root.querySelectorAll('p,h2,h3,h4,h5,h6,li,div,section').forEach((block) => {
    block.style.wordBreak = 'normal';
    block.style.hyphens = 'none';
  });
}

function copyFormatTemplate(root) {
  formatTemplate = blockNodes(root).map((node) => ({tag: node.tagName.toLowerCase(), style: node.getAttribute('style') || '', list: node.closest('ol,ul')?.tagName.toLowerCase() || ''}));
  return formatTemplate.length;
}

function applyFormatTemplate(root) {
  if (!formatTemplate?.length) return false;
  const targets = blockNodes(root);
  targets.forEach((target, index) => {
    const format = formatTemplate[index % formatTemplate.length];
    if (!format) return;
    target.setAttribute('style', format.style);
    if (target.tagName.toLowerCase() !== format.tag) {
      const replacement = document.createElement(format.tag);
      replacement.innerHTML = target.innerHTML;
      replacement.setAttribute('style', format.style);
      target.replaceWith(replacement);
    }
  });
  return targets.length > 0;
}

function standardizeHtml(html) {
  const root = document.createElement('div');
  root.innerHTML = html || '';
  normalizeWordFlow(root);
  let blocks = [...root.querySelectorAll('p,h2,h3,li,div,section')].filter((node) => !node.classList.contains('admin-override-content'));
  if (!blocks.length && root.textContent.trim()) {
    const paragraph = document.createElement('p');
    paragraph.innerHTML = root.innerHTML;
    root.replaceChildren(paragraph);
    blocks = [paragraph];
  }
  blocks.forEach((block) => {
    const visualLine = block.classList.contains('pdf-line') || block.classList.contains('exact-line');
    const tag = block.tagName.toLowerCase();
    const text = block.textContent.trim();
    const compactHeading = /^(h[1-6])$/.test(tag) || (block.style.fontWeight && Number.parseInt(block.style.fontWeight, 10) >= 600 && text.length < 180);
    const reference = block.classList.contains('reference') || (/^\(/.test(text) && /(sayılı|madde|md\.)/i.test(text));
    block.style.textAlign = visualLine || compactHeading || reference ? 'left' : 'justify';
    block.style.textAlignLast = 'left';
    block.style.textIndent = visualLine ? '0' : '4em';
    block.style.margin = visualLine ? '0 8%' : '0 8% 7pt';
    block.style.paddingLeft = '0';
    block.style.paddingRight = '0';
    block.style.lineHeight = '2';
    block.style.fontFamily = "'Times New Roman', Times, serif";
    block.style.fontSize = '12pt';
    block.style.whiteSpace = 'normal';
    block.style.overflowWrap = 'normal';
    block.style.wordBreak = 'normal';
    block.style.hyphens = 'none';
  });
  return root.innerHTML;
}

function justifyHtml(html) {
  const root = document.createElement('div');
  root.innerHTML = html || '';
  normalizeWordFlow(root);
  blockNodes(root).forEach((block) => {
    block.style.textAlign = 'justify';
    block.style.textAlignLast = 'left';
    block.style.whiteSpace = 'normal';
    block.style.overflowWrap = 'normal';
    block.style.wordBreak = 'normal';
    block.style.hyphens = 'none';
  });
  return root.innerHTML;
}

function adjustFirstLineIndent(body, decrease = false) {
  let selected = window.getSelection()?.anchorNode?.parentElement?.closest('p,h2,h3,li,.pdf-line,.exact-line,div');
  if (selected && (selected === body || selected.classList.contains('admin-override-content'))) {
    const paragraph = document.createElement('p');
    paragraph.innerHTML = selected.innerHTML;
    selected.replaceWith(paragraph);
    selected = paragraph;
  }
  if (!selected || !body.contains(selected)) return;
  const fontSize = parseFloat(getComputedStyle(selected).fontSize) || 16;
  const computed = parseFloat(getComputedStyle(selected).textIndent) || 0;
  const current = selected.style.textIndent.match(/^(-?[\d.]+)em$/)?.[1];
  const currentEm = current === undefined ? computed / fontSize : Number(current);
  selected.style.textIndent = `${Math.max(0, currentEm + (decrease ? -2 : 2))}em`;
  selected.style.marginLeft = '8%';
  selected.style.marginRight = '8%';
  selected.style.paddingLeft = '0';
  selected.style.paddingRight = '0';
  selected.style.whiteSpace = 'normal';
  selected.style.overflowWrap = 'break-word';
}

function normalizeInlineVisualLines(body) {
  body.querySelectorAll('.exact-line').forEach((line) => {
    line.style.position = 'static';
    line.style.display = 'block';
    line.style.textIndent = '0';
    line.style.marginLeft = '8%';
    line.style.marginRight = '8%';
    line.style.width = 'auto';
    line.style.maxWidth = '100%';
    line.style.paddingLeft = '0';
    line.style.paddingRight = '0';
    line.style.textAlign = 'justify';
    line.style.textAlignLast = 'left';
    line.style.whiteSpace = 'normal';
    line.style.overflowWrap = 'normal';
    line.style.wordBreak = 'normal';
    line.style.hyphens = 'none';
  });
  body.querySelectorAll('p,h2,h3,h4,h5,h6,li').forEach((block) => {
    const text = block.textContent.trim();
    const compactHeading = /^h[2-6]$/.test(block.tagName.toLowerCase()) || (block.style.fontWeight && Number.parseInt(block.style.fontWeight, 10) >= 600 && text.length < 180);
    const reference = block.classList.contains('reference') || (/^\(/.test(text) && /(sayılı|madde|md\.)/i.test(text));
    block.style.textAlign = compactHeading || reference ? 'left' : 'justify';
    block.style.textAlignLast = 'left';
    block.style.textIndent = compactHeading || reference ? '0' : '4em';
    block.style.marginLeft = '8%';
    block.style.marginRight = '8%';
    block.style.lineHeight = '2';
    block.style.whiteSpace = 'normal';
    block.style.overflowWrap = 'normal';
    block.style.wordBreak = 'normal';
    block.style.hyphens = 'none';
  });
}

function caretAtBlockStart(block) {
  const selection = window.getSelection();
  if (!selection?.rangeCount || !selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  const before = document.createRange();
  before.selectNodeContents(block);
  before.setEnd(range.startContainer, range.startOffset);
  return before.toString().trim() === '';
}

function handleEditorKeydown(event, body) {
  if (event.key === 'Tab') {
    event.preventDefault();
    body.focus();
    adjustFirstLineIndent(body, event.shiftKey);
    return;
  }
  if (event.key === 'Backspace') {
    const selection = window.getSelection();
    const block = selection?.anchorNode?.parentElement?.closest('p,h2,h3,li,.pdf-line,.exact-line,div');
    if (block && block !== body && caretAtBlockStart(block) && parseFloat(block.style.textIndent || '0') > 0) {
      event.preventDefault();
      adjustFirstLineIndent(body, true);
    }
  }
}

function inlineToolbarMarkup() {
  return '<div class="inline-editor-toolbar" role="toolbar" aria-label="Hüküm düzenleme araçları"><button type="button" data-command="bold" title="Kalın yazı"><b>B</b></button><button type="button" data-command="italic" title="İtalik yazı"><i>İ</i></button><button type="button" data-command="underline" title="Altı çizili yazı"><u>Altı</u></button><button type="button" data-command="justifyLeft" title="Sola hizala">☰</button><button type="button" data-command="justifyCenter" title="Ortala">≡</button><button type="button" data-command="justifyRight" title="Sağa hizala">☷</button><button type="button" data-command="justifyFull" title="İki yana yasla">☷</button><button type="button" data-command="indent" title="Girintiyi artır">↦</button><button type="button" data-command="outdent" title="Girintiyi azalt">↤</button><button type="button" data-command="insertUnorderedList" title="Madde işaretli liste">•</button><button type="button" data-command="insertOrderedList" title="Numaralı liste">1.</button><label title="Yazı tipi">Yazı tipi<select data-command="fontName"><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="Times New Roman">Times New Roman</option><option value="Inter">Inter</option></select></label><label title="Satır aralığı">Satır<select data-style="lineHeight"><option value="1">1</option><option value="1.15">1,15</option><option value="1.5" selected>1,5</option><option value="2">2</option></select></label><label class="inline-editor-color" title="Yazı rengini değiştir">Renk<input type="color" value="#111111" data-command="foreColor"></label><button type="button" data-inline-standardize title="Ortak paragraf standardına getir">Standartlaştır</button><button type="button" data-inline-save title="Değişiklikleri kaydet">Kaydet</button><button type="button" data-inline-cancel title="Değişiklikleri iptal et">İptal</button><span data-inline-message></span></div>';
}

function installColorPalette(toolbar) {
  const input = toolbar.querySelector('[data-command="foreColor"]');
  if (!input) return;
  const palette = document.createElement('div');
  palette.className = 'provision-color-palette';
  palette.title = 'Yazı rengini seç';
  ['#111111','#555555','#999999','#ffffff','#e31b23','#f57c00','#f2c94c','#2e9b45','#13a8a8','#2679d0','#6c4ab6','#e85a9d'].forEach((color) => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.dataset.color = color;
    swatch.title = color;
    swatch.style.backgroundColor = color;
    if (color === '#ffffff') swatch.classList.add('is-light');
    palette.append(swatch);
  });
  input.closest('label')?.replaceWith(palette);
}

function bindInlineToolbar(toolbar, body) {
  toolbar.querySelectorAll('[data-command]').forEach((control) => {
    control.onmousedown = (event) => event.preventDefault();
    control.onclick = () => { body.focus(); if (control.dataset.command === 'indent' || control.dataset.command === 'outdent') { adjustFirstLineIndent(body, control.dataset.command === 'outdent'); return; } document.execCommand(control.dataset.command, false, control.value || null); };
  });
  toolbar.querySelectorAll('[data-style]').forEach((control) => {
    control.onchange = () => {
      const selected = window.getSelection()?.anchorNode?.parentElement?.closest('p,div,h2,h3,li,.pdf-line,.exact-line');
      if (!selected) return;
      if (control.dataset.style === 'lineHeight') selected.style.lineHeight = control.value;
    };
  });
  const color = toolbar.querySelector('[data-command="foreColor"]');
  if (color) color.onchange = () => { body.focus(); document.execCommand('foreColor', false, color.value); };
  toolbar.querySelectorAll('[data-color]').forEach((swatch) => {
    swatch.onmousedown = (event) => event.preventDefault();
    swatch.onclick = () => { body.focus(); document.execCommand('foreColor', false, swatch.dataset.color); };
  });
  body.addEventListener('keydown', (event) => handleEditorKeydown(event, body));
}

function startInlineEditor(card, context, existing, onSaved) {
  if (card.classList.contains('admin-inline-editing')) return;
  const body = card.querySelector('.provision-content');
  if (!body) return;
  const originalHtml = body.innerHTML;
  card.classList.add('admin-inline-editing');
  body.contentEditable = 'true';
  body.spellcheck = true;
  body.focus();
  const toolbar = document.createElement('div');
  toolbar.innerHTML = inlineToolbarMarkup();
  const editorToolbar = toolbar.firstElementChild;
  installColorPalette(editorToolbar);
  card.prepend(editorToolbar);
  const message = editorToolbar.querySelector('[data-inline-message]');
  bindInlineToolbar(editorToolbar, body);
  editorToolbar.querySelector('[data-inline-standardize]').onclick = () => { body.innerHTML = standardizeHtml(body.innerHTML); body.focus(); message.textContent = 'Standart görünüm uygulandı'; };
  editorToolbar.querySelector('[data-inline-cancel]').onclick = () => { body.innerHTML = originalHtml; body.contentEditable = 'false'; editorToolbar.remove(); card.classList.remove('admin-inline-editing'); card.querySelector('[data-admin-save]')?.setAttribute('disabled', ''); };
  editorToolbar.querySelector('[data-inline-save]').onclick = async () => {
    message.textContent = 'Kaydediliyor…';
    const response = await fetch('/api/admin/provisions', {method: 'PUT', credentials: 'same-origin', headers: {'content-type': 'application/json'}, body: JSON.stringify({sectionId: context.sectionId, page: context.page, block: context.block, html: editorHtml(body), deleted: false})});
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { message.textContent = result.error || 'Kaydedilemedi.'; return; }
    onSaved(result);
    body.contentEditable = 'false';
    editorToolbar.remove();
    card.classList.remove('admin-inline-editing');
  };
}

function openEditor(card, context, existing, onSaved) {
  document.querySelector('#provision-editor-overlay')?.remove();
  const initialHtml = existing?.html || card.querySelector('.copy-html-source')?.innerHTML || card.querySelector('.provision-content')?.innerHTML || '';
  const overlay = document.createElement('div');
  overlay.id = 'provision-editor-overlay';
  overlay.className = 'provision-editor-overlay';
  overlay.innerHTML = `<section class="provision-editor" role="dialog" aria-modal="true" aria-labelledby="provision-editor-title"><button class="provision-editor-close" type="button" aria-label="Kapat">×</button><p class="eyebrow">YÖNETİCİ DÜZENLEMESİ</p><h2 id="provision-editor-title">Hüküm kartını düzenle</h2><p class="provision-editor-location">${escapeHtml(context.sectionTitle)} · Sayfa ${context.page} · Hüküm ${context.block}</p><div class="provision-editor-toolbar" role="toolbar" aria-label="Metin ve paragraf biçimlendirme"><button type="button" data-command="bold"><b>B</b></button><button type="button" data-command="italic"><i>İ</i></button><button type="button" data-command="underline"><u>Altı</u></button><button type="button" data-command="justifyLeft" title="Sola hizala">☰</button><button type="button" data-command="justifyCenter" title="Ortala">≡</button><button type="button" data-command="justifyRight" title="Sağa hizala">☷</button><button type="button" data-command="justifyFull" title="İki yana yasla">☷</button><button type="button" data-command="indent" title="Girintiyi artır">↦</button><button type="button" data-command="outdent" title="Girintiyi azalt">↤</button><button type="button" data-command="insertUnorderedList" title="Madde işaretli liste">• Liste</button><button type="button" data-command="insertOrderedList" title="Numaralı liste">1. Liste</button><label>Paragraf<select data-command="formatBlock"><option value="p">Normal</option><option value="h2">Başlık</option><option value="h3">Alt başlık</option></select></label><label>Yazı tipi<select data-command="fontName"><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="Times New Roman">Times New Roman</option><option value="Inter">Inter</option></select></label><label>Boyut<select data-command="fontSize"><option value="2">Küçük</option><option value="3" selected>Normal</option><option value="4">Büyük</option><option value="5">Çok büyük</option></select></label><label>Satır aralığı<select data-style="lineHeight"><option value="1">Tek</option><option value="1.15">1,15</option><option value="1.5" selected>1,5</option><option value="2">Çift</option></select></label><label>Paragraf aralığı<select data-style="paragraphSpacing"><option value="0">Yok</option><option value="7px" selected>Normal</option><option value="14px">Geniş</option></select></label><label class="editor-color">Renk<input type="color" value="#111111" data-command="foreColor"></label></div><div class="provision-editor-body" contenteditable="true" spellcheck="true">${initialHtml}</div><p id="provision-editor-message" class="provision-editor-message"></p><div class="provision-editor-actions"><button class="editor-cancel" type="button">Vazgeç</button><button class="editor-save" type="button">Değişiklikleri kaydet</button></div></section>`;
  document.body.append(overlay);
  const body = overlay.querySelector('.provision-editor-body');
  const message = overlay.querySelector('#provision-editor-message');
  body.addEventListener('keydown', (event) => handleEditorKeydown(event, body));
  const toolbar = overlay.querySelector('.provision-editor-toolbar');
  installColorPalette(toolbar);
  toolbar.insertAdjacentHTML('beforeend', '<button type="button" data-format-copy title="Paragraf biçimini kopyala">Biçimi kopyala</button><button type="button" data-format-apply title="Kopyalanan paragraf biçimini uygula">Biçimi uygula</button>');
  const commandHints = {bold: 'Kalın yazı', italic: 'İtalik yazı', underline: 'Altı çizili yazı', fontName: 'Yazı tipini değiştir', fontSize: 'Yazı boyutunu değiştir', foreColor: 'Yazı rengini değiştir', formatBlock: 'Paragraf veya başlık türünü seç', insertUnorderedList: 'Madde işaretli liste', insertOrderedList: 'Numaralı liste', indent: 'Girintiyi artır', outdent: 'Girintiyi azalt', justifyLeft: 'Sola hizala', justifyCenter: 'Ortala', justifyRight: 'Sağa hizala', justifyFull: 'İki yana yasla'};
  overlay.querySelectorAll('[data-command]').forEach((control) => { if (!control.title) control.title = commandHints[control.dataset.command] || 'Metin biçimlendirme'; });
  overlay.querySelectorAll('[data-style]').forEach((control) => { control.title = control.dataset.style === 'lineHeight' ? 'Satır aralığını değiştir' : 'Paragraf aralığını değiştir'; });
  toolbar.querySelector('[data-format-copy]').onclick = () => { const count = copyFormatTemplate(body); message.textContent = count ? `${count} paragrafın biçimi kopyalandı. Başka bir hükümde “Biçimi uygula” seçeneğini kullanabilirsiniz.` : 'Kopyalanacak paragraf biçimi bulunamadı.'; };
  toolbar.querySelector('[data-format-apply]').onclick = () => { message.textContent = applyFormatTemplate(body) ? 'Kopyalanan paragraf biçimi uygulandı.' : 'Önce başka bir hükümden biçim kopyalayın.'; };
  overlay.querySelector('.provision-editor-close').onclick = () => overlay.remove();
  overlay.querySelector('.editor-cancel').onclick = () => overlay.remove();
  overlay.onclick = (event) => { if (event.target === overlay) overlay.remove(); };
  overlay.querySelectorAll('[data-command]').forEach((control) => {
    control.onmousedown = (event) => event.preventDefault();
    control.onclick = () => {
      body.focus();
      const command = control.dataset.command;
      if (command === 'indent' || command === 'outdent') { adjustFirstLineIndent(body, command === 'outdent'); return; }
      const value = control.value || null;
      document.execCommand(command, false, value);
    };
  });
  overlay.querySelectorAll('[data-style]').forEach((control) => {
    control.onchange = () => {
      const selected = window.getSelection()?.anchorNode?.parentElement?.closest('p,div,h2,h3,li');
      if (!selected) return;
      if (control.dataset.style === 'lineHeight') selected.style.lineHeight = control.value;
      if (control.dataset.style === 'paragraphSpacing') selected.style.marginBottom = control.value;
    };
  });
  overlay.querySelector('.editor-save').onclick = async () => {
    message.textContent = 'Kaydediliyor…';
    const response = await fetch('/api/admin/provisions', {method: 'PUT', credentials: 'same-origin', headers: {'content-type': 'application/json'}, body: JSON.stringify({sectionId: context.sectionId, page: context.page, block: context.block, html: editorHtml(body), deleted: false})});
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { message.textContent = result.error || 'Değişiklik kaydedilemedi.'; return; }
    onSaved(result);
    overlay.remove();
  };
}

export async function loadProvisionOverrides(sectionId) {
  const response = await fetch(`/api/admin/provisions?sectionId=${encodeURIComponent(sectionId)}`, {credentials: 'same-origin', cache: 'no-store'});
  if (!response.ok) return new Map();
  const result = await response.json();
  return new Map((result.provisions || []).map((item) => [provisionKey(item.page, item.block), item]));
}

export function applyProvisionOverrides(overrides, {showDeleted = false} = {}) {
  document.querySelectorAll('.provision-card').forEach((card) => {
    const page = Number(card.closest('.article-page')?.dataset.page || 0);
    const block = Number(card.dataset.block || 0);
    const key = provisionKey(page, block);
    const override = overrides.get(key);
    if (override?.deleted && !showDeleted) { card.remove(); return; }
    applyOverride(card, override);
  });
}

export function setupAdminProvisionEditor({sectionId, sectionTitle, overrides}) {
  if (!document.querySelector('.admin-editor-banner')) {
    const banner = document.createElement('div');
    banner.className = 'admin-editor-banner';
    banner.innerHTML = '<strong>Yönetici düzenleme modu</strong><span>Hüküm kartlarını düzenleyebilir ve ortak paragraf standardına getirebilirsiniz.</span><button type="button" data-admin-standardize-all title="Bu sayfadaki tüm hükümleri ortak standarda getir">Sayfadaki tüm hükümleri standartlaştır</button><button type="button" data-admin-undo-all title="Toplu standardizasyon öncesindeki hale dön" disabled>Toplu standardizasyonu geri al</button>';
    document.querySelector('#content')?.prepend(banner);
    banner.querySelector('[data-admin-standardize-all]').onclick = () => {
      if (!window.confirm('Bu sayfadaki tüm hükümlerin paragraf biçimi standartlaştırılsın mı? İşlem sonrasında üstteki geri alma düğmesini kullanabilirsiniz.')) return;
      const snapshot = new Map([...overrides.entries()].map(([key, value]) => [key, {...value}]));
      banner.dataset.standardizeSnapshot = JSON.stringify([...snapshot.entries()]);
      document.querySelectorAll('[data-admin-standardize]').forEach((button) => button.click());
      banner.querySelector('[data-admin-undo-all]').disabled = false;
    };
    banner.querySelector('[data-admin-undo-all]').onclick = async () => {
      const snapshot = new Map(JSON.parse(banner.dataset.standardizeSnapshot || '[]'));
      if (!snapshot.size || !window.confirm('Toplu standardizasyon öncesindeki hüküm biçimlerine dönülsün mü?')) return;
      const currentKeys = [...document.querySelectorAll('.provision-card')].map((card) => `${card.closest('.article-page')?.dataset.page || 0}:${card.dataset.block || 0}`);
      const keys = new Set([...snapshot.keys(), ...currentKeys]);
      await Promise.all([...keys].map(async (key) => {
        const [page, block] = key.split(':');
        const previous = snapshot.get(key);
        if (previous) {
          await fetch('/api/admin/provisions', {method: 'PUT', credentials: 'same-origin', headers: {'content-type': 'application/json'}, body: JSON.stringify({sectionId, page: Number(page), block: Number(block), html: previous.html, deleted: Boolean(previous.deleted)})});
        } else {
          await fetch(`/api/admin/provisions?sectionId=${encodeURIComponent(sectionId)}&page=${page}&block=${block}`, {method: 'DELETE', credentials: 'same-origin'});
        }
      }));
      window.location.reload();
    };
  }
  document.querySelectorAll('.provision-card').forEach((card) => {
    const page = Number(card.closest('.article-page')?.dataset.page || 0);
    const block = Number(card.dataset.block || 0);
    const context = {sectionId, sectionTitle, page, block};
    const key = provisionKey(page, block);
    let override = overrides.get(key);
    const actions = document.createElement('div');
    actions.className = 'admin-provision-actions';
    actions.innerHTML = `<button type="button" data-admin-edit title="Bu hükmün metnini ve biçimini düzenle">Düzenle</button><button type="button" data-admin-save title="Açık düzenlemedeki değişiklikleri kaydet" disabled>Kaydet</button><button type="button" data-admin-standardize title="Bu hükmü ortak paragraf standardına getir">Standart hale getir</button><button type="button" data-admin-justify title="Paragrafları iki yana yasla">İki yana yasla</button><button type="button" data-admin-copy-format title="Bu hükmün paragraf biçimini kopyala">Biçimi kopyala</button><button type="button" data-admin-apply-format title="Kopyalanan paragraf biçimini bu hükme uygula">Biçimi uygula</button><button type="button" data-admin-revert title="Kaydedilmiş değişikliği kaldır ve kaynak haline dön" ${override ? '' : 'disabled'}>Önceki haline dön</button><button type="button" data-admin-delete title="Bu hükmü gizle">${override?.deleted ? 'Geri al' : 'Sil'}</button>`;
    let actionCloseTimer;
    const keepActionsOpen = () => { clearTimeout(actionCloseTimer); card.classList.add('admin-actions-open'); };
    const delayActionsClose = () => { clearTimeout(actionCloseTimer); actionCloseTimer = setTimeout(() => card.classList.remove('admin-actions-open'), 800); };
    card.addEventListener('mouseenter', keepActionsOpen);
    card.addEventListener('mouseleave', delayActionsClose);
    card.addEventListener('focusin', keepActionsOpen);
    card.addEventListener('focusout', delayActionsClose);
    actions.addEventListener('mouseenter', keepActionsOpen);
    actions.addEventListener('mouseleave', delayActionsClose);
    const revertButton = actions.querySelector('[data-admin-revert]');
    const saveButton = actions.querySelector('[data-admin-save]');
    card.append(actions);
    actions.querySelector('[data-admin-edit]').onclick = () => { startInlineEditor(card, context, override, (saved) => { override = saved; overrides.set(key, saved); applyOverride(card, saved); revertButton.disabled = false; saveButton.disabled = true; actions.querySelector('[data-admin-delete]').textContent = 'Sil'; }); saveButton.disabled = false; };
    saveButton.onclick = () => {
      const inlineSave = card.querySelector('[data-inline-save]');
      if (!inlineSave || !card.classList.contains('admin-inline-editing')) {
        saveButton.disabled = true;
        return;
      }
      saveButton.textContent = 'Kaydediliyor…';
      inlineSave.click();
      setTimeout(() => { saveButton.textContent = 'Kaydet'; }, 1200);
    };
    actions.querySelector('[data-admin-standardize]').onclick = async () => {
      const sourceHtml = override?.html || card.querySelector('.copy-html-source')?.innerHTML || card.querySelector('.provision-content')?.innerHTML || '';
      const html = standardizeHtml(sourceHtml);
      const response = await fetch('/api/admin/provisions', {method: 'PUT', credentials: 'same-origin', headers: {'content-type': 'application/json'}, body: JSON.stringify({sectionId, page, block, html, deleted: false})});
      if (!response.ok) return;
      override = await response.json();
      overrides.set(key, override);
      applyOverride(card, override);
      revertButton.disabled = false;
      actions.querySelector('[data-admin-standardize]').textContent = 'Standart uygulandı';
      setTimeout(() => { actions.querySelector('[data-admin-standardize]').textContent = 'Standart hale getir'; }, 1500);
    };
    actions.querySelector('[data-admin-justify]').onclick = async () => {
      const sourceHtml = override?.html || card.querySelector('.copy-html-source')?.innerHTML || card.querySelector('.provision-content')?.innerHTML || '';
      const html = justifyHtml(sourceHtml);
      const response = await fetch('/api/admin/provisions', {method: 'PUT', credentials: 'same-origin', headers: {'content-type': 'application/json'}, body: JSON.stringify({sectionId, page, block, html, deleted: false})});
      if (!response.ok) return;
      override = await response.json();
      overrides.set(key, override);
      applyOverride(card, override);
      revertButton.disabled = false;
      actions.querySelector('[data-admin-justify]').textContent = 'Uygulandı';
      setTimeout(() => { actions.querySelector('[data-admin-justify]').textContent = 'İki yana yasla'; }, 1400);
    };
    actions.querySelector('[data-admin-copy-format]').onclick = () => {
      const source = document.createElement('div');
      source.innerHTML = card.querySelector('.provision-content')?.innerHTML || override?.html || '';
      const count = copyFormatTemplate(source);
      actions.querySelector('[data-admin-copy-format]').textContent = count ? 'Biçim kopyalandı' : 'Biçim yok';
      setTimeout(() => { actions.querySelector('[data-admin-copy-format]').textContent = 'Biçimi kopyala'; }, 1400);
    };
    actions.querySelector('[data-admin-apply-format]').onclick = async () => {
      const target = document.createElement('div');
      target.innerHTML = card.querySelector('.provision-content')?.innerHTML || override?.html || '';
      if (!applyFormatTemplate(target)) return;
      const response = await fetch('/api/admin/provisions', {method: 'PUT', credentials: 'same-origin', headers: {'content-type': 'application/json'}, body: JSON.stringify({sectionId, page, block, html: editorHtml(target), deleted: false})});
      if (!response.ok) return;
      override = await response.json();
      overrides.set(key, override);
      applyOverride(card, override);
      revertButton.disabled = false;
      actions.querySelector('[data-admin-apply-format]').textContent = 'Biçim uygulandı';
      setTimeout(() => { actions.querySelector('[data-admin-apply-format]').textContent = 'Biçimi uygula'; }, 1400);
    };
    revertButton.onclick = async () => {
      if (!override || !window.confirm('Bu hüküm kaydedilmeden önceki kaynak haline döndürülsün mü?')) return;
      const response = await fetch(`/api/admin/provisions?sectionId=${encodeURIComponent(sectionId)}&page=${page}&block=${block}`, {method: 'DELETE', credentials: 'same-origin'});
      if (response.ok) window.location.reload();
    };
    actions.querySelector('[data-admin-delete]').onclick = async () => {
      const deleting = !override?.deleted;
      if (deleting && !window.confirm('Bu hüküm kartı normal kullanıcılardan gizlensin mi?')) return;
      const response = await fetch('/api/admin/provisions', {method: 'PUT', credentials: 'same-origin', headers: {'content-type': 'application/json'}, body: JSON.stringify({sectionId, page, block, html: override?.html || card.querySelector('.copy-html-source')?.innerHTML || '', deleted: deleting})});
      if (!response.ok) return;
      override = await response.json();
      overrides.set(key, override);
      applyOverride(card, override);
      actions.querySelector('[data-admin-delete]').textContent = override.deleted ? 'Geri al' : 'Sil';
    };
  });
}
