import {hydrateFavorites, persistFavorites} from './auth.js';

const KEY = 'mevzuat-local-favorites';
const esc = (value) => String(value || '').replace(/[&<>"']/g, (c) => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'}[c]));

export const readWorkspace = () => {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '{"lists":[],"reports":[]}');
    data.lists = Array.isArray(data.lists) ? data.lists : [];
    data.reports = Array.isArray(data.reports) ? data.reports : [];
    return data;
  } catch { return {lists: [], order: [], reports: []}; }
};

const saveWorkspace = async (data) => {
  localStorage.setItem(KEY, JSON.stringify(data));
  await persistFavorites(data, KEY);
};

export const reportItems = (data = readWorkspace()) => data.reports || [];
export const allFavoriteItems = (data = readWorkspace()) => [...new Map(data.lists.flatMap((list) => list.items || []).map((item) => [item.id, item])).values()];
export const reportSourceId = (item) => item.sourceId || item.id;

function updateReportButtons(itemId, saved) {
  document.querySelectorAll(`[data-report-id="${CSS.escape(itemId)}"]`).forEach((button) => {
    button.classList.toggle('is-reported', saved);
    button.textContent = saved ? '✓' : '＋';
    button.setAttribute('aria-label', saved ? 'Raporunuzda' : 'Rapora ekle');
    button.title = saved ? 'Rapordan çıkar' : 'Rapora ekle';
  });
}

export async function toggleReport(item) {
  const data = readWorkspace();
  const index = data.reports.findIndex((entry) => reportSourceId(entry) === item.id);
  if (index >= 0) {
    data.reports.splice(index, 1);
    await saveWorkspace(data);
    updateReportButtons(item.id, data.reports.some((entry) => reportSourceId(entry) === item.id));
    return false;
  }
  data.reports.push({...item, sourceId: item.id, title: item.title || '', savedAt: item.savedAt || Date.now()});
  await saveWorkspace(data);
  updateReportButtons(item.id, true);
  return true;
}

export async function addReportCopy(item) {
  const data = readWorkspace();
  const sourceId = reportSourceId(item);
  data.reports.push({...item, id: `${sourceId}-report-${crypto.randomUUID()}`, sourceId, title: '', savedAt: Date.now()});
  await saveWorkspace(data);
  return true;
}

export async function setupSectionReports({sectionId, sectionTitle}) {
  await hydrateFavorites(KEY);
  const data = readWorkspace();
  document.querySelectorAll('.report-plus').forEach((button) => {
    const card = button.closest('.provision-card');
    const page = card?.closest('.article-page')?.dataset.page || '0';
    const item = {id: `${sectionId}-${page}-${button.dataset.reportId}`, sectionId, sectionTitle, location: `Sayfa ${page} · Hüküm ${button.dataset.reportId}`, text: card?.querySelector('.provision-content')?.innerText.trim() || '', html: card?.querySelector('.copy-html-source')?.innerHTML || '', title: ''};
    button.dataset.reportId = item.id;
    button.dataset.reportItem = JSON.stringify(item);
    const saved = data.reports.some((entry) => reportSourceId(entry) === item.id);
    updateReportButtons(item.id, saved);
    if (saved && !button.parentElement.querySelector('.report-repeat')) button.insertAdjacentHTML('afterend', reportRepeatButton(item, 'report-repeat'));
  });
  document.addEventListener('click', async (event) => {
    const repeat = event.target.closest('.report-repeat');
    if (repeat) {
      event.preventDefault();
      const item = JSON.parse(repeat.dataset.reportItem || '{}');
      if (item.id) await addReportCopy(item);
      return;
    }
    const button = event.target.closest('.report-plus');
    if (!button) return;
    event.preventDefault();
    const item = JSON.parse(button.dataset.reportItem || '{}');
    if (item.id) await toggleReport(item);
  });
}

export function bindFavoriteReportButtons() {
  document.addEventListener('click', async (event) => {
    const repeat = event.target.closest('.report-repeat');
    if (repeat) {
      event.preventDefault();
      const item = allFavoriteItems().find((entry) => entry.id === repeat.dataset.reportId);
      if (item) await addReportCopy(item);
      return;
    }
    const button = event.target.closest('.report-plus-card');
    if (!button) return;
    event.preventDefault();
    const item = allFavoriteItems().find((entry) => entry.id === button.dataset.reportId);
    if (item) await toggleReport(item);
  });
}

export const reportButton = (item, className = 'report-plus-card', reported = false) => `<button class="${className}${reported ? ' is-reported' : ''}" data-report-id="${esc(item.id)}" type="button" aria-label="${reported ? 'Raporunuzda' : 'Rapora ekle'}" title="${reported ? 'Rapordan çıkar' : 'Rapora ekle'}">${reported ? '✓' : '＋'}</button>`;
export const reportRepeatButton = (item, className = 'report-repeat') => `<button class="${className}" data-report-id="${esc(item.id)}" data-report-item="${esc(JSON.stringify(item))}" type="button" aria-label="Aynı hükmü rapora tekrar ekle" title="Aynı hükmü rapora tekrar ekle">＋</button>`;
