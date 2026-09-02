import './styles.css';
protectPage();
import { NOKSANLIK_CATEGORIES, NOKSANLIK_ITEMS } from './noksanliklarData.js';
import { persistFavorites , protectPage} from './auth.js';

let searchQuery = '';
let rawSaved = JSON.parse(localStorage.getItem('isg-selected-noksanliklar') || '[]');
let selectedIds = new Set(rawSaved.map(id => String(id)));
let customTexts = JSON.parse(localStorage.getItem('isg-custom-noksanliklar') || '{}');
let openCategories = new Set();

function initNoksanlar() {
  renderAccordions();
  updateExportBadge();

  // Search event
  const searchInput = document.getElementById('noksan-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderAccordions();
    });
  }

  // Export Menu Toggle
  const exportBtn = document.getElementById('btn-export-dropdown');
  const exportMenu = document.getElementById('export-menu');

  if (exportBtn && exportMenu) {
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportMenu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      exportMenu.classList.remove('show');
    });
  }

  // Floating Badge Click to Open Preview Modal
  document.getElementById('floating-selected-badge')?.addEventListener('click', openPreviewModal);

  // Close Preview Modal Events
  document.getElementById('btn-close-preview')?.addEventListener('click', closePreviewModal);
  document.getElementById('preview-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'preview-modal') closePreviewModal();
  });

  // Main Export Events
  document.getElementById('btn-export-word')?.addEventListener('click', exportToWord);
  document.getElementById('btn-export-pdf')?.addEventListener('click', exportToPdf);
  document.getElementById('btn-export-csv')?.addEventListener('click', exportToCsv);
  document.getElementById('btn-copy-clipboard')?.addEventListener('click', copyToClipboard);
  document.getElementById('btn-export-tedbirler')?.addEventListener('click', exportToTedbirler);
  document.getElementById('btn-export-tedbirler-main')?.addEventListener('click', exportToTedbirler);
  document.getElementById('btn-clear-basket')?.addEventListener('click', clearBasket);

  // Modal Footer Export Events
  document.getElementById('modal-export-word')?.addEventListener('click', exportToWord);
  document.getElementById('modal-export-pdf')?.addEventListener('click', exportToPdf);
  document.getElementById('modal-export-csv')?.addEventListener('click', exportToCsv);
  document.getElementById('modal-copy-clipboard')?.addEventListener('click', copyToClipboard);
  document.getElementById('modal-export-tedbirler')?.addEventListener('click', exportToTedbirler);
  document.getElementById('modal-clear-all')?.addEventListener('click', clearBasket);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNoksanlar);
} else {
  initNoksanlar();
}

function renderAccordions() {
  const container = document.getElementById('category-accordion-list');
  if (!container) return;

  container.innerHTML = '';

  NOKSANLIK_CATEGORIES.forEach((cat) => {
    const items = NOKSANLIK_ITEMS.filter(item => item.category === cat);
    
    // Filter items by search query if exists
    const matchingItems = items.filter(item => {
      if (!searchQuery) return true;
      return item.text.toLowerCase().includes(searchQuery) || cat.toLowerCase().includes(searchQuery);
    });

    if (searchQuery && matchingItems.length === 0) return;

    const isExplicitOpen = openCategories.has(cat);
    const isOpen = isExplicitOpen || (searchQuery.length > 0 && matchingItems.length > 0);

    const accordionItem = document.createElement('div');
    accordionItem.className = `cat-accordion-item ${isOpen ? 'open' : ''}`;

    accordionItem.innerHTML = `
      <div class="cat-accordion-header">
        <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
          📁 ${escapeHtml(cat)}
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="cat-badge-count">${matchingItems.length} Noksanlık</span>
          <span class="accordion-arrow">▼</span>
        </div>
      </div>
      <div class="cat-accordion-body">
        <table class="inner-table">
          <thead>
            <tr>
              <th style="width: 65px; text-align: center;">Sıra No</th>
              <th>Noksanlık Açıklaması / Maddesi</th>
            </tr>
          </thead>
          <tbody>
            ${matchingItems.map((item, idx) => {
              const strId = String(item.id);
              const isSelected = selectedIds.has(strId);
              return `
                <tr class="noksan-row ${isSelected ? 'selected' : ''}" data-id="${strId}">
                  <td class="sira-no">${idx + 1}</td>
                  <td>
                    <div class="noksan-text">${escapeHtml(item.text)}</div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Toggle Accordion Click
    const header = accordionItem.querySelector('.cat-accordion-header');
    header.addEventListener('click', () => {
      if (openCategories.has(cat)) {
        openCategories.delete(cat);
      } else {
        openCategories.add(cat);
      }
      accordionItem.classList.toggle('open');
    });

    // Row Click & Double Click Events to Toggle Selection
    const rows = accordionItem.querySelectorAll('.noksan-row');
    rows.forEach(tr => {
      const strId = tr.getAttribute('data-id');
      tr.addEventListener('dblclick', () => {
        toggleSelection(strId);
      });
      tr.addEventListener('click', (e) => {
        toggleSelection(strId);
      });
    });

    container.appendChild(accordionItem);
  });
}

function toggleSelection(strId) {
  const sId = String(strId);
  if (selectedIds.has(sId)) {
    selectedIds.delete(sId);
    delete customTexts[sId];
  } else {
    selectedIds.add(sId);
  }
  localStorage.setItem('isg-selected-noksanliklar', JSON.stringify(Array.from(selectedIds)));
  localStorage.setItem('isg-custom-noksanliklar', JSON.stringify(customTexts));
  
  // Re-render matching row states across DOM
  document.querySelectorAll(`.noksan-row[data-id="${sId}"]`).forEach(tr => {
    if (selectedIds.has(sId)) {
      tr.classList.add('selected');
    } else {
      tr.classList.remove('selected');
    }
  });

  updateExportBadge();

  // If preview modal is open, re-render modal list
  const modal = document.getElementById('preview-modal');
  if (modal && !modal.classList.contains('hidden')) {
    renderPreviewModalList();
  }
}

function getSelectedItemList() {
  return NOKSANLIK_ITEMS.filter(item => selectedIds.has(String(item.id)))
    .map(item => {
      const sId = String(item.id);
      if (customTexts[sId]) {
        return { ...item, text: customTexts[sId] };
      }
      return item;
    })
    .sort((a, b) => {
      if (a.categoryId !== b.categoryId) return a.categoryId - b.categoryId;
      return a.id - b.id;
    });
}

function updateExportBadge() {
  const count = selectedIds.size;
  const badge = document.getElementById('export-count-badge');
  const floatingBadge = document.getElementById('floating-selected-badge');
  const floatingCount = document.getElementById('floating-count');

  if (badge) badge.innerText = count;
  if (floatingCount) floatingCount.innerText = count;

  if (floatingBadge) {
    if (count > 0) {
      floatingBadge.classList.remove('hidden');
    } else {
      floatingBadge.classList.add('hidden');
    }
  }
}

// Preview Modal Functions
function openPreviewModal() {
  const modal = document.getElementById('preview-modal');
  if (!modal) return;
  renderPreviewModalList();
  modal.classList.remove('hidden');
}

function closePreviewModal() {
  const modal = document.getElementById('preview-modal');
  if (modal) modal.classList.add('hidden');
}

function renderPreviewModalList() {
  const listEl = document.getElementById('preview-modal-body');
  const countEl = document.getElementById('modal-selected-count');
  if (!listEl) return;

  const selectedItems = getSelectedItemList();
  if (countEl) countEl.innerText = selectedItems.length;

  listEl.innerHTML = '';

  if (selectedItems.length === 0) {
    listEl.innerHTML = '<p style="color: #64748b; text-align: center; padding: 30px; font-weight: 600;">Henüz hiç noksanlık seçilmedi.</p>';
    return;
  }

  selectedItems.forEach((item, idx) => {
    const strId = String(item.id);
    const div = document.createElement('div');
    div.className = 'preview-item-row';
    div.innerHTML = `
      <div style="display: flex; gap: 10px; align-items: flex-start; flex: 1;">
        <span style="font-weight: 800; color: #64748b; font-size: 0.9rem;">${idx + 1}.</span>
        <div class="preview-item-text" contenteditable="true" spellcheck="false" title="Üzerine tıklayarak metni düzenleyebilirsiniz">${escapeHtml(item.text)}</div>
      </div>
      <button class="btn-remove-item" title="Listeden Çıkar" type="button">✕ Çıkar</button>
    `;

    const editableText = div.querySelector('.preview-item-text');
    editableText.addEventListener('input', (e) => {
      customTexts[strId] = e.target.innerText.trim();
      localStorage.setItem('isg-custom-noksanliklar', JSON.stringify(customTexts));
    });

    div.querySelector('.btn-remove-item').onclick = () => {
      toggleSelection(strId);
    };

    listEl.appendChild(div);
  });
}

function clearBasket() {
  if (selectedIds.size === 0) return;
  if (confirm('Seçtiğiniz tüm noksanlık maddelerini temizlemek istediğinize emin misiniz?')) {
    selectedIds.clear();
  customTexts = {};
  localStorage.removeItem('isg-custom-noksanliklar');
    localStorage.removeItem('isg-selected-noksanliklar');
    renderAccordions();
    updateExportBadge();
    closePreviewModal();
  }
}

// Export to Word (.doc / .docx HTML Blob) - No numbers, blank line between items, justified
function exportToWord() {
  const selectedItems = getSelectedItemList();
  if (selectedItems.length === 0) return alert('Lütfen önce en az bir noksanlık maddesini seçiniz.');

  const dateStr = new Date().toLocaleDateString('tr-TR');
  let content = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>İSG Noksanlık Listesi</title>
    <style>
      body { font-family: 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #000000; padding: 20px; }
      .header-title { font-size: 13pt; font-weight: bold; color: #000000; margin-bottom: 4px; }
      .header-divider { border-bottom: 1.5px dashed #000000; margin-bottom: 20px; width: 100%; display: block; }
      .item-paragraph { text-align: justify; color: #000000; margin-bottom: 18px; margin-top: 0; }
    </style>
    </head>
    <body>
      <div class="header-title">📋 İSG NOKSANLIK LİSTESİ (${dateStr})</div>
      <div class="header-divider">--------------------------------------------------</div>
      ${selectedItems.map((item) => `
        <p class="item-paragraph">${escapeHtml(item.text)}</p>
      `).join('')}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ISG_Noksanlik_Listesi_${dateStr.replace(/\./g, '-')}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

// Export to PDF / Print Window - No numbers, blank line between items, justified
function exportToPdf() {
  const selectedItems = getSelectedItemList();
  if (selectedItems.length === 0) return alert('Lütfen önce en az bir noksanlık maddesini seçiniz.');

  const dateStr = new Date().toLocaleDateString('tr-TR');
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>İSG NOKSANLIK LİSTESİ (${dateStr})</title>
      <style>
        body { font-family: 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #000000; padding: 30px; }
        .header-title { font-size: 13pt; font-weight: bold; color: #000000; margin-bottom: 4px; }
        .header-divider { border-bottom: 1.5px dashed #000000; margin-bottom: 20px; }
        .item-paragraph { text-align: justify; color: #000000; margin-bottom: 18px; margin-top: 0; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header-title">📋 İSG NOKSANLIK LİSTESİ (${dateStr})</div>
      <div class="header-divider">--------------------------------------------------</div>
      ${selectedItems.map((item) => `
        <p class="item-paragraph">${escapeHtml(item.text)}</p>
      `).join('')}
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// Export to CSV (UTF-8 BOM) - No numbers
function exportToCsv() {
  const selectedItems = getSelectedItemList();
  if (selectedItems.length === 0) return alert('Lütfen önce en az bir noksanlık maddesini seçiniz.');

  let csv = 'Noksanlik Maddesi\n';
  selectedItems.forEach((item) => {
    const cleanText = item.text.replace(/;/g, ',').replace(/\n/g, ' ');
    csv += `"${cleanText}"\n\n`;
  });

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ISG_Noksanliklar_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Copy Plain Text to Clipboard - No numbers, blank line between items
function copyToClipboard() {
  const selectedItems = getSelectedItemList();
  if (selectedItems.length === 0) return alert('Lütfen önce en az bir noksanlık maddesini seçiniz.');

  let text = `📋 İSG NOKSANLIK LİSTESİ (${new Date().toLocaleDateString('tr-TR')})\n`;
  text += `--------------------------------------------------\n\n`;
  selectedItems.forEach((item) => {
    text += `${item.text}\n\n`;
  });

  navigator.clipboard.writeText(text).then(() => {
    alert('✅ Seçilen ' + selectedItems.length + ' adet noksanlık maddesi panoya kopyalandı!');
  }).catch(err => {
    console.error('Clipboard copy failed:', err);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
async function exportToTedbirler() {
  const selectedItems = getSelectedItemList();
  if (selectedItems.length === 0) {
    alert('Lütfen en az bir noksanlık seçin.');
    return;
  }
  
  const KEY = 'mevzuat-local-favorites';
  let data = { lists: [], reports: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      data = JSON.parse(raw);
    }
    if (!Array.isArray(data.reports)) data.reports = [];
  } catch(e) {
    data.reports = [];
  }
  
  selectedItems.forEach((item, idx) => {
    const timestamp = Date.now();
    const sourceId = `manual-noksan-${timestamp}-${idx}`;
    const cleanTitle = item.category.replace(/^[0-9]+\.\s*/, '');
    
    data.reports.push({
      id: sourceId,
      sourceId: sourceId,
      title: item.text,
      text: '',
      html: '',
      savedAt: timestamp
    });
  });
  
  localStorage.setItem(KEY, JSON.stringify(data));
  await persistFavorites(data, KEY);
  alert('Seçili noksanlıklar Tedbirler sayfasına başarıyla aktarıldı!');
  window.location.href = '/tedbirler.html';
}
