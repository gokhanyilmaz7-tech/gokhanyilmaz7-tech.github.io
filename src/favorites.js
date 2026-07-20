import './favorites.css';

const FAVORITES_KEY = 'mevzuat-local-favorites';
const esc = (value) => String(value || '').replace(/[&<>"']/g, (c) => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'}[c]));
const uid = () => crypto.randomUUID();
const readFavorites = () => { try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '{"lists":[]}'); } catch { return {lists: []}; } };
const writeFavorites = (data) => localStorage.setItem(FAVORITES_KEY, JSON.stringify(data));

function favoriteIds() {
  const data = readFavorites();
  return new Set(data.lists.flatMap((list) => list.items || []).map((item) => item.id));
}

export function setupFavorites({sectionId, sectionTitle}) {
  const topbar = document.querySelector('.article-topbar');
  if (!topbar || document.querySelector('#favorites-open')) return;
  topbar.insertAdjacentHTML('beforeend', '<a id="favorites-open" class="favorites-open" href="/favoriler.html">☆ Favorilerim</a>');
  const savedIds = favoriteIds();
  document.querySelectorAll('.favorite-star').forEach((button) => {
    const page = button.closest('.article-page')?.dataset.page || '0';
    const favoriteId = `${sectionId}-${page}-${button.dataset.favoriteId}`;
    const saved = savedIds.has(favoriteId);
    button.classList.toggle('is-favorite', saved);
    button.textContent = saved ? '★' : '☆';
    button.setAttribute('aria-label', saved ? 'Bu hüküm favorilerde' : 'Bu hükmü favorilere ekle');
  });

  const closePanel = () => document.querySelector('#favorite-save-panel')?.remove();
  const openPanel = (button, item) => {
    closePanel();
    const data = readFavorites();
    const existingLists = data.lists.filter((list) => list.items?.some((entry) => entry.id === item.id)).map((list) => list.id);
    const panel = document.createElement('div');
    panel.id = 'favorite-save-panel';
    panel.className = 'favorite-save-overlay';
    panel.innerHTML = `<aside class="favorite-save-dialog" role="dialog" aria-modal="true" aria-labelledby="favorite-save-title"><button class="favorite-save-close" type="button" aria-label="Pencereyi kapat">×</button><p class="eyebrow">YENİ FAVORİ</p><h2 id="favorite-save-title">Favoriye al</h2><p class="favorite-save-location">${esc(item.location)} · ${esc(item.sectionTitle)}</p><label class="favorite-save-label" for="favorite-save-title-input">Hatırlatıcı başlık <span>(isteğe bağlı)</span></label><input id="favorite-save-title-input" class="favorite-save-title" type="text" placeholder="Örn. Sınav için tekrar" value="${esc(existingLists.length ? data.lists.find((list) => existingLists.includes(list.id))?.items.find((entry) => entry.id === item.id)?.title : '')}"><div class="favorite-save-list-heading"><strong>Favori listeleri</strong><button id="favorite-new-list" type="button">＋ Yeni liste</button></div><div id="favorite-save-lists" class="favorite-save-lists"></div><div class="favorite-save-new-list" hidden><input id="favorite-new-list-name" type="text" placeholder="Liste adı"><button id="favorite-create-list" type="button">Oluştur</button></div><button id="favorite-save-submit" class="favorite-save-submit" type="button">Favorilere kaydet</button></aside>`;
    document.body.append(panel);

    const renderLists = () => {
      const lists = panel.querySelector('#favorite-save-lists');
      lists.innerHTML = data.lists.length ? data.lists.map((list) => `<label><input type="checkbox" value="${list.id}" ${existingLists.includes(list.id) ? 'checked' : ''}> <span>${esc(list.name)}</span></label>`).join('') : '<p class="favorite-no-lists">Henüz listeniz yok. Yeni liste oluşturun.</p>';
    };
    renderLists();
    panel.querySelector('.favorite-save-close').onclick = closePanel;
    panel.addEventListener('click', (event) => { if (event.target === panel) closePanel(); });
    panel.querySelector('#favorite-new-list').onclick = () => { panel.querySelector('.favorite-save-new-list').hidden = false; panel.querySelector('#favorite-new-list-name').focus(); };
    panel.querySelector('#favorite-create-list').onclick = () => {
      const input = panel.querySelector('#favorite-new-list-name');
      if (!input.value.trim()) return;
      const list = {id: uid(), name: input.value.trim(), items: []};
      data.lists.push(list); existingLists.push(list.id); input.value = ''; panel.querySelector('.favorite-save-new-list').hidden = true; renderLists();
    };
    panel.querySelector('#favorite-save-submit').onclick = () => {
      const listIds = [...panel.querySelectorAll('#favorite-save-lists input:checked')].map((input) => input.value);
      if (!listIds.length) { alert('En az bir favori listesi seçin veya yeni liste oluşturun.'); return; }
      const savedItem = {...item, title: panel.querySelector('.favorite-save-title').value.trim(), savedAt: Date.now()};
      data.lists.forEach((list) => {
        list.items = list.items || [];
        list.items = list.items.filter((entry) => entry.id !== savedItem.id);
        if (listIds.includes(list.id)) list.items.push(savedItem);
      });
      writeFavorites(data);
      button.classList.add('is-favorite'); button.textContent = '★'; button.setAttribute('aria-label', 'Bu hüküm favorilerde');
      closePanel();
    };
    panel.querySelector('.favorite-save-title').focus();
  };

  document.addEventListener('click', (event) => {
    const button = event.target.closest('.favorite-star');
    if (!button) return;
    event.preventDefault();
    const card = button.closest('.provision-card');
    if (!card) return;
    const page = card.closest('.article-page')?.dataset.page || '0';
    openPanel(button, {id: `${sectionId}-${page}-${button.dataset.favoriteId}`, sectionId, sectionTitle, location: `Sayfa ${page} · Hüküm ${button.dataset.favoriteId}`, text: card.querySelector('.provision-content')?.innerText.trim() || '', html: card.querySelector('.copy-html-source')?.innerHTML || '', title: ''});
  });
}
