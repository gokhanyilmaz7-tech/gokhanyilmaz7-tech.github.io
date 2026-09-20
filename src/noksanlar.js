import './styles.css';
protectPage();
import { NOKSANLIK_CATEGORIES, NOKSANLIK_ITEMS } from './noksanliklarData.js';
import { persistFavorites , protectPage} from './auth.js';

let searchQuery = '';
let rawSaved = JSON.parse(localStorage.getItem('isg-selected-noksanliklar') || '[]');
let selectedIds = new Set(rawSaved.map(id => String(id)));
let customTexts = JSON.parse(localStorage.getItem('isg-custom-noksanliklar') || '{}');
let openCategories = new Set();
let activeEditId = null;
const FAVORITE_NOKSAN_KEY = 'isg-favorite-noksan-lists';
let favoriteNoksanData = loadFavoriteNoksanData();
let activeFavoriteListId = favoriteNoksanData.activeListId || favoriteNoksanData.lists[0]?.id || null;
let pendingFavoriteNoksanId = null;

function initNoksanlar() {
  renderAccordions();
  updateExportBadge();
  renderFavoriteNoksanTools();

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

  // Single item edit modal events
  document.getElementById('btn-close-edit')?.addEventListener('click', closeEditModal);
  document.getElementById('btn-cancel-edit')?.addEventListener('click', closeEditModal);
  document.getElementById('btn-save-edit')?.addEventListener('click', saveEditedNoksan);
  document.getElementById('edit-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'edit-modal') closeEditModal();
  });

  // Main Export Events
  document.getElementById('btn-export-word')?.addEventListener('click', exportToWord);
  document.getElementById('btn-export-pdf')?.addEventListener('click', exportToPdf);
  document.getElementById('btn-export-csv')?.addEventListener('click', exportToCsv);
  document.getElementById('btn-copy-clipboard')?.addEventListener('click', copyToClipboard);
  document.getElementById('btn-export-tedbirler')?.addEventListener('click', exportToTedbirler);
  document.getElementById('btn-export-tedbirler-main')?.addEventListener('click', exportToTedbirler);
  document.getElementById('btn-clear-basket')?.addEventListener('click', clearBasket);
  document.getElementById('btn-reset-noksan-page')?.addEventListener('click', resetNoksanPage);
  document.getElementById('btn-create-favorite-noksan-list')?.addEventListener('click', createFavoriteNoksanList);
  document.getElementById('btn-save-selected-to-favorite-list')?.addEventListener('click', saveSelectedToActiveFavoriteList);
  document.getElementById('btn-close-favorite-picker')?.addEventListener('click', closeFavoritePicker);
  document.getElementById('favorite-picker-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'favorite-picker-modal') closeFavoritePicker();
  });

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
      const visibleText = customTexts[String(item.id)] || item.text;
      return visibleText.toLowerCase().includes(searchQuery) || cat.toLowerCase().includes(searchQuery);
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
              <th class="sira-no-header">Sıra No</th>
              <th>Noksanlık Açıklaması / Maddesi</th>
              <th class="noksan-action-header">İşlem</th>
            </tr>
          </thead>
          <tbody>
            ${matchingItems.map((item, idx) => {
              const strId = String(item.id);
              const isSelected = selectedIds.has(strId);
              const visibleText = customTexts[strId] || item.text;
              const favoriteActive = isItemInAnyFavoriteList(strId);
              return `
                <tr class="noksan-row ${isSelected ? 'selected' : ''}" data-id="${strId}">
                  <td class="sira-no">${idx + 1}</td>
                  <td>
                    <div class="noksan-text">${escapeHtml(visibleText)}</div>
                  </td>
                  <td class="noksan-action-cell">
                    <span class="noksan-row-actions" aria-label="Seçili noksanlık işlemleri">
                      <button class="btn-edit-noksan" type="button" data-edit-id="${strId}" title="Düzenle" aria-label="Düzenle">✏️</button>
                      <button class="btn-reset-noksan" type="button" data-reset-id="${strId}" title="Orijinale döndür" aria-label="Orijinale döndür">↩️</button>
                      <button class="btn-favorite-noksan ${favoriteActive ? 'active' : ''}" type="button" data-favorite-id="${strId}" title="Favori listeye ekle" aria-label="Favori listeye ekle">⭐</button>
                    </span>
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
        if (e.target.closest('.btn-edit-noksan, .btn-reset-noksan, .btn-favorite-noksan')) return;
        toggleSelection(strId);
      });
    });

    accordionItem.querySelectorAll('.btn-edit-noksan').forEach((button) => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditorForItem(button.dataset.editId);
      });
    });

    accordionItem.querySelectorAll('.btn-reset-noksan').forEach((button) => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        resetSingleNoksan(button.dataset.resetId);
      });
    });

    accordionItem.querySelectorAll('.btn-favorite-noksan').forEach((button) => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        openFavoritePicker(button.dataset.favoriteId);
      });
    });

    container.appendChild(accordionItem);
  });
}

function saveSelectionState() {
  localStorage.setItem('isg-selected-noksanliklar', JSON.stringify(Array.from(selectedIds)));
  localStorage.setItem('isg-custom-noksanliklar', JSON.stringify(customTexts));
}

function loadFavoriteNoksanData() {
  try {
    const raw = localStorage.getItem(FAVORITE_NOKSAN_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Array.isArray(parsed.lists)) {
      return {
        activeListId: parsed.activeListId || parsed.lists[0]?.id || null,
        lists: parsed.lists.map((list) => ({
          id: String(list.id || createLocalId()),
          name: String(list.name || 'Favori Noksan Listesi'),
          items: Array.isArray(list.items) ? list.items.map(normalizeFavoriteItem).filter(Boolean) : []
        }))
      };
    }
  } catch (error) {
    console.error('Favori noksan listeleri okunamadı:', error);
  }
  return { activeListId: null, lists: [] };
}

function normalizeFavoriteItem(item) {
  if (!item) return null;
  const id = typeof item === 'object' ? item.id : item;
  const strId = String(id || '');
  if (!strId) return null;
  const source = NOKSANLIK_ITEMS.find(noksan => String(noksan.id) === strId);
  if (!source) return null;
  const text = typeof item === 'object' && item.text && item.text !== source.text ? String(item.text) : undefined;
  return text ? { id: strId, text } : { id: strId };
}

function saveFavoriteNoksanData() {
  favoriteNoksanData.activeListId = activeFavoriteListId;
  localStorage.setItem(FAVORITE_NOKSAN_KEY, JSON.stringify(favoriteNoksanData));
}

function createLocalId() {
  return `liste-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function activeFavoriteList() {
  return favoriteNoksanData.lists.find(list => list.id === activeFavoriteListId) || null;
}

function favoriteListById(listId) {
  return favoriteNoksanData.lists.find(list => list.id === listId) || null;
}

function isItemInAnyFavoriteList(strId) {
  return favoriteNoksanData.lists.some(list => list.items.some(item => String(item.id) === String(strId)));
}

function isItemInFavoriteList(strId, listId) {
  const list = favoriteListById(listId);
  return Boolean(list && list.items.some(item => String(item.id) === String(strId)));
}

function currentItemForFavorite(strId) {
  const source = NOKSANLIK_ITEMS.find(noksan => String(noksan.id) === String(strId));
  if (!source) return null;
  const editedText = customTexts[String(strId)];
  return editedText && editedText !== source.text ? { id: String(strId), text: editedText } : { id: String(strId) };
}

function renderFavoriteNoksanTools(message = '') {
  const listEl = document.getElementById('favorite-noksan-list');
  const status = document.getElementById('favorite-noksan-status');
  if (!listEl) return;

  if (!activeFavoriteListId && favoriteNoksanData.lists.length) {
    activeFavoriteListId = favoriteNoksanData.lists[0].id;
  }

  if (!favoriteNoksanData.lists.length) {
    listEl.innerHTML = '<p class="noksan-favorite-status">Henüz favori liste yok.</p>';
  } else {
    listEl.innerHTML = favoriteNoksanData.lists.map((list) => `
      <div class="noksan-favorite-list-row ${list.id === activeFavoriteListId ? 'active' : ''}" data-list-id="${escapeHtml(list.id)}">
        <button class="noksan-favorite-list-name" type="button" data-select-favorite-list="${escapeHtml(list.id)}" title="Bu listeyi seç">
          ${escapeHtml(list.name)}
          <span class="noksan-favorite-list-count">${list.items.length} noksanlık</span>
        </button>
        <button class="noksan-favorite-list-icon" type="button" data-preview-favorite-list="${escapeHtml(list.id)}" title="Listeyi önizle" aria-label="Listeyi önizle">👁️</button>
        <button class="noksan-favorite-list-icon danger" type="button" data-delete-favorite-list="${escapeHtml(list.id)}" title="Listeyi sil" aria-label="Listeyi sil">🗑️</button>
      </div>
    `).join('');

    listEl.querySelectorAll('[data-select-favorite-list]').forEach((button) => {
      button.addEventListener('click', () => selectFavoriteList(button.dataset.selectFavoriteList));
    });
    listEl.querySelectorAll('[data-preview-favorite-list]').forEach((button) => {
      button.addEventListener('click', () => loadFavoriteNoksanList(button.dataset.previewFavoriteList));
    });
    listEl.querySelectorAll('[data-delete-favorite-list]').forEach((button) => {
      button.addEventListener('click', () => deleteFavoriteNoksanList(button.dataset.deleteFavoriteList));
    });
  }

  if (status) {
    const list = activeFavoriteList();
    status.textContent = message || (list ? `Seçili liste: ${list.name}` : 'Liste oluşturmak için “Liste oluştur” düğmesine basın.');
  }

  updatePreviewFavoriteName();
}

function updatePreviewFavoriteName() {
  const previewName = document.getElementById('preview-favorite-list-name');
  if (!previewName) return;
  const list = activeFavoriteList();
  previewName.textContent = list ? ` · ${list.name}` : '';
}

function selectFavoriteList(listId) {
  if (!favoriteListById(listId)) return;
  activeFavoriteListId = listId;
  saveFavoriteNoksanData();
  renderFavoriteNoksanTools('Favori liste seçildi.');
  renderAccordions();
}

function createFavoriteNoksanList() {
  const name = prompt('Favori noksan listesi adı:');
  if (name === null) return;
  const cleanedName = name.trim();
  if (!cleanedName) {
    renderFavoriteNoksanTools('Liste adı boş bırakılamaz.');
    return;
  }

  const newList = { id: createLocalId(), name: cleanedName, items: [] };
  favoriteNoksanData.lists.push(newList);
  activeFavoriteListId = newList.id;
  saveFavoriteNoksanData();
  renderFavoriteNoksanTools('Yeni favori noksan listesi oluşturuldu.');
  renderAccordions();
}

function deleteFavoriteNoksanList(listId) {
  const list = favoriteListById(listId);
  if (!list) return;
  if (!confirm(`${list.name} favori listesi silinsin mi?`)) return;
  favoriteNoksanData.lists = favoriteNoksanData.lists.filter(item => item.id !== list.id);
  if (activeFavoriteListId === list.id) {
    activeFavoriteListId = favoriteNoksanData.lists[0]?.id || null;
  }
  saveFavoriteNoksanData();
  renderFavoriteNoksanTools('Favori liste silindi.');
  renderAccordions();
}

function openFavoritePicker(strId) {
  const favoriteItem = currentItemForFavorite(strId);
  if (!favoriteItem) return;

  if (!favoriteNoksanData.lists.length) {
    const newList = { id: createLocalId(), name: 'Genel Favoriler', items: [] };
    favoriteNoksanData.lists.push(newList);
    activeFavoriteListId = newList.id;
    saveFavoriteNoksanData();
  }

  pendingFavoriteNoksanId = String(strId);
  renderFavoritePicker();
  document.getElementById('favorite-picker-modal')?.classList.remove('hidden');
}

function closeFavoritePicker() {
  document.getElementById('favorite-picker-modal')?.classList.add('hidden');
  pendingFavoriteNoksanId = null;
}

function renderFavoritePicker() {
  const body = document.getElementById('favorite-picker-body');
  if (!body || !pendingFavoriteNoksanId) return;

  body.innerHTML = `
    <div class="noksan-favorite-list">
      ${favoriteNoksanData.lists.map((list) => {
        const active = isItemInFavoriteList(pendingFavoriteNoksanId, list.id);
        return `
          <button class="noksan-favorite-btn ${active ? 'primary' : ''}" type="button" data-picker-list="${escapeHtml(list.id)}">
            ${active ? '⭐' : '☆'} ${escapeHtml(list.name)} (${list.items.length})
          </button>
        `;
      }).join('')}
    </div>
  `;

  body.querySelectorAll('[data-picker-list]').forEach((button) => {
    button.addEventListener('click', () => toggleNoksanFavoriteList(pendingFavoriteNoksanId, button.dataset.pickerList));
  });
}

function toggleNoksanFavoriteList(strId, listId) {
  const list = favoriteListById(listId);
  const favoriteItem = currentItemForFavorite(strId);
  if (!list || !favoriteItem) return;

  const existingIndex = list.items.findIndex(item => String(item.id) === String(strId));
  if (existingIndex >= 0) {
    list.items.splice(existingIndex, 1);
    activeFavoriteListId = list.id;
    saveFavoriteNoksanData();
    renderFavoriteNoksanTools('Noksanlık favori listeden çıkarıldı.');
  } else {
    list.items.push(favoriteItem);
    activeFavoriteListId = list.id;
    saveFavoriteNoksanData();
    renderFavoriteNoksanTools('Noksanlık favori listeye eklendi.');
  }

  renderAccordions();
  renderFavoritePicker();
}

function saveSelectedToActiveFavoriteList() {
  let list = activeFavoriteList();
  if (!list) {
    createFavoriteNoksanList();
    list = activeFavoriteList();
  }
  if (!list) return;

  list.items = getSelectedItemList().map((item) => {
    const source = NOKSANLIK_ITEMS.find(noksan => String(noksan.id) === String(item.id));
    return source && item.text !== source.text ? { id: String(item.id), text: item.text } : { id: String(item.id) };
  });
  saveFavoriteNoksanData();
  renderFavoriteNoksanTools('Seçili ve düzenlenmiş noksanlıklar favori listeye kaydedildi.');
  renderAccordions();
}

function loadFavoriteNoksanList(listId) {
  const list = favoriteListById(listId);
  if (!list) {
    renderFavoriteNoksanTools('Önce bir favori liste oluşturun.');
    return;
  }

  activeFavoriteListId = list.id;
  selectedIds = new Set(list.items.map(item => String(item.id)));
  customTexts = {};
  list.items.forEach((favoriteItem) => {
    const source = NOKSANLIK_ITEMS.find(noksan => String(noksan.id) === String(favoriteItem.id));
    if (source && favoriteItem.text && favoriteItem.text !== source.text) {
      customTexts[String(favoriteItem.id)] = favoriteItem.text;
    }
  });
  saveFavoriteNoksanData();
  saveSelectionState();
  renderAccordions();
  updateExportBadge();
  renderFavoriteNoksanTools(`${list.name} önizlemeye yüklendi.`);
  openPreviewModal();
}

function openEditorForItem(strId) {
  const sId = String(strId);
  if (!selectedIds.has(sId)) return;

  const item = NOKSANLIK_ITEMS.find(noksan => String(noksan.id) === sId);
  if (!item) return;

  activeEditId = sId;
  const modal = document.getElementById('edit-modal');
  const textarea = document.getElementById('edit-noksan-text');
  const categoryEl = document.getElementById('edit-noksan-category');
  if (!modal || !textarea) return;

  textarea.value = customTexts[sId] || item.text;
  if (categoryEl) categoryEl.textContent = item.category || 'Seçili noksanlık';
  modal.classList.remove('hidden');
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

function closeEditModal() {
  const modal = document.getElementById('edit-modal');
  if (modal) modal.classList.add('hidden');
  activeEditId = null;
}

function saveEditedNoksan() {
  if (!activeEditId) return;

  const item = NOKSANLIK_ITEMS.find(noksan => String(noksan.id) === activeEditId);
  const textarea = document.getElementById('edit-noksan-text');
  if (!item || !textarea) return;

  const nextText = textarea.value.trim();
  if (nextText && nextText !== item.text) {
    customTexts[activeEditId] = nextText;
  } else {
    delete customTexts[activeEditId];
  }

  saveSelectionState();
  renderAccordions();

  const previewModal = document.getElementById('preview-modal');
  if (previewModal && !previewModal.classList.contains('hidden')) {
    renderPreviewModalList();
  }

  closeEditModal();
}

function resetSingleNoksan(strId) {
  const sId = String(strId);
  if (!selectedIds.has(sId)) return;

  delete customTexts[sId];
  saveSelectionState();
  renderAccordions();

  const previewModal = document.getElementById('preview-modal');
  if (previewModal && !previewModal.classList.contains('hidden')) {
    renderPreviewModalList();
  }
}

function resetNoksanPage() {
  if (selectedIds.size === 0 && Object.keys(customTexts).length === 0 && !searchQuery) {
    renderAccordions();
    updateExportBadge();
    closePreviewModal();
    closeEditModal();
    return;
  }

  selectedIds.clear();
  customTexts = {};
  searchQuery = '';
  localStorage.removeItem('isg-selected-noksanliklar');
  localStorage.removeItem('isg-custom-noksanliklar');

  const searchInput = document.getElementById('noksan-search');
  if (searchInput) searchInput.value = '';

  closePreviewModal();
  closeEditModal();
  renderAccordions();
  updateExportBadge();
  renderFavoriteNoksanTools();
}

function toggleSelection(strId) {
  const sId = String(strId);
  if (selectedIds.has(sId)) {
    selectedIds.delete(sId);
  } else {
    selectedIds.add(sId);
  }
  saveSelectionState();
  
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
  renderFavoriteNoksanTools();

  listEl.innerHTML = '';

  if (selectedItems.length === 0) {
    listEl.innerHTML = '<p class="preview-empty-state">Henüz hiç noksanlık seçilmedi.</p>';
    return;
  }

  selectedItems.forEach((item, idx) => {
    const strId = String(item.id);
    const div = document.createElement('div');
    div.className = 'preview-item-row';
    div.innerHTML = `
      <div class="preview-item-main">
        <span class="preview-item-number">${idx + 1}.</span>
        <div class="preview-item-text" data-preview-id="${strId}" contenteditable="true" spellcheck="false" title="Üzerine tıklayarak metni düzenleyebilirsiniz">${escapeHtml(item.text)}</div>
      </div>
      <button class="btn-remove-item" title="Listeden Çıkar" type="button">✕ Çıkar</button>
    `;

    const editableText = div.querySelector('.preview-item-text');
    editableText.addEventListener('input', (e) => {
      const nextText = e.target.innerText.trim();
      customTexts[strId] = nextText;
      saveSelectionState();
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
