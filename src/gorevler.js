import { protectPage } from './auth.js';
protectPage();
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJs(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

let tasks = [];
let schedule = {};
let archive = [];
let attachmentsMap = {}; // taskId -> array of attachments
let currentViewMode = localStorage.getItem('gorevler_view_mode') || 'table'; // default to table view

document.addEventListener('DOMContentLoaded', async () => {
  const isAuth = await checkAdminAuth();
  if (!isAuth) return;

  await loadProgramData();
  await loadAllAttachments();
  initEventListeners();
  renderTaskGrid();
});

async function checkAdminAuth() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (!data?.user?.isAdmin) {
      document.body.innerHTML = `
        <div style="padding: 100px 20px; text-align: center; font-family: sans-serif;">
          <h1 style="color: #dc2626; font-size: 2rem;">404 - Sayfa Bulunamadı</h1>
          <p style="color: #475569;">Aradığınız sayfaya erişim yetkiniz bulunmamaktadır.</p>
          <a href="/" style="color: #2563eb; font-weight: 600; text-decoration: none;">&larr; Ana Sayfaya Dön</a>
        </div>
      `;
      return false;
    }
    return true;
  } catch (err) {
    window.location.href = '/';
    return false;
  }
}

async function loadProgramData() {
  let userId = '1';
  try {
    const resAuth = await fetch('/api/auth/me');
    const authData = await resAuth.json();
    userId = authData?.user?.id || '1';
  } catch(e){}

  const tRaw = localStorage.getItem(`mevzuat-tasks-${userId}`) || localStorage.getItem('mevzuat-tasks-1') || localStorage.getItem('mevzuat-tasks');
  const sRaw = localStorage.getItem(`mevzuat-schedule-${userId}`) || localStorage.getItem('mevzuat-schedule-1') || localStorage.getItem('mevzuat-schedule');
  const aRaw = localStorage.getItem(`mevzuat-archive-${userId}`) || localStorage.getItem('mevzuat-archive-1') || localStorage.getItem('mevzuat-archive');

  let localT = [], localS = {}, localA = [];
  if (tRaw) { try { localT = JSON.parse(tRaw); } catch(e){} }
  if (sRaw) { try { localS = JSON.parse(sRaw); } catch(e){} }
  if (aRaw) { try { localA = JSON.parse(aRaw); } catch(e){} }

  tasks = localT;
  schedule = localS;
  archive = localA;

  try {
    const res = await fetch('/api/program');
    if (res.ok) {
      const data = await res.json();
      if (data.tasks && Array.isArray(data.tasks) && data.tasks.length > 0) {
        tasks = data.tasks;
      } else if (localT.length > 0) {
        await saveProgramData();
      }

      if (data.schedule && typeof data.schedule === 'object' && Object.keys(data.schedule).length > 0) {
        schedule = data.schedule;
      }
      if (data.archive && Array.isArray(data.archive) && data.archive.length > 0) {
        archive = data.archive;
      }
    }
  } catch (err) {
    console.error('Görev verisi yüklenirken hata:', err);
  }
}

async function saveProgramData() {
  let userId = '1';
  try {
    const resAuth = await fetch('/api/auth/me');
    const authData = await resAuth.json();
    userId = authData?.user?.id || '1';
  } catch(e){}

  localStorage.setItem(`mevzuat-tasks-${userId}`, JSON.stringify(tasks));
  localStorage.setItem(`mevzuat-schedule-${userId}`, JSON.stringify(schedule));
  localStorage.setItem(`mevzuat-archive-${userId}`, JSON.stringify(archive));

  try {
    await fetch('/api/program', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks, schedule, archive })
    });
  } catch (err) {
    console.error('Görev verisi kaydedilirken hata:', err);
  }
}

async function loadAllAttachments() {
  try {
    const res = await fetch('/api/admin/tasks/attachments');
    if (res.ok) {
      const data = await res.json();
      const list = data.attachments || [];
      attachmentsMap = {};
      list.forEach(att => {
        if (!attachmentsMap[att.task_id]) attachmentsMap[att.task_id] = [];
        attachmentsMap[att.task_id].push(att);
      });
    }
  } catch (err) {
    console.error('Eklentiler yüklenemedi:', err);
  }
}

function initEventListeners() {
  // Search filter
  const searchInput = document.getElementById('task-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => renderTaskGrid());
  }




  // Add new task button
  const btnAddNew = document.getElementById('btn-add-new-task');
  if (btnAddNew) {
    btnAddNew.addEventListener('click', () => openTaskModal());
  }

  // Close modals
  document.getElementById('close-task-modal')?.addEventListener('click', () => {
    document.getElementById('task-modal').classList.add('hidden');
  });
  document.getElementById('close-att-modal')?.addEventListener('click', () => {
    document.getElementById('att-modal').classList.add('hidden');
  });
  document.getElementById('close-preview-modal')?.addEventListener('click', () => {
    document.getElementById('preview-modal').classList.add('hidden');
  });

  // Task form submit
  document.getElementById('task-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveTaskFromModal();
  });

  // Attachment form submit
  document.getElementById('att-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await uploadAttachmentFromModal();
  });
}

function renderTaskGrid() {

  const listWrap = document.getElementById('modern-task-list');
  const query = (document.getElementById('task-search')?.value || '').toLowerCase().trim();

  const filtered = tasks.filter(t => {
    if (!query) return true;
    return (t.unvan || '').toLowerCase().includes(query) ||
           (t.sgk || '').toLowerCase().includes(query) ||
           (t.oto || '').toLowerCase().includes(query) ||
           (t.dosya || '').toLowerCase().includes(query) ||
           (t.adres || '').toLowerCase().includes(query);
  });

  document.getElementById('stat-total').innerText = tasks.length;
  document.getElementById('stat-active-workplaces').innerText = filtered.length;

  renderModernCards(filtered, listWrap);

}


function renderModernCards(filtered, listWrap) {
  if (!listWrap) return;
  listWrap.innerHTML = '';

  if (filtered.length === 0) {
    listWrap.innerHTML = `
      <div style="background: #ffffff; padding: 40px; border-radius: 12px; text-align: center; color: #64748b; border: 1px solid #e2e8f0;">
        <p style="font-size: 1.05rem; font-weight: 700; margin: 0;">Henüz kayıtlı görev bulunmuyor veya arama eşleşmedi.</p>
        <p style="font-size: 0.85rem; margin-top: 6px;">Yukarıdaki "+ Yeni Görev Oluştur" butonuna basarak yeni görev tanımı ekleyebilirsiniz.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(t => {
    let periodText = 'Tüm Dönemler';
    if (t.startYear !== undefined && t.endYear !== undefined) {
      periodText = `${monthNames[t.startMonth || 0]} ${t.startYear} - ${monthNames[t.endMonth || 11]} ${t.endYear}`;
    }

    const taskAtts = attachmentsMap[t.id] || [];
    const safeUnvan = escapeHtml(t.unvan);
    const safeJsUnvan = escapeJs(t.unvan);

    const card = document.createElement('div');
    card.className = 'modern-task-card';
    card.style.cssText = 'position: relative; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 22px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);';
    
    card.innerHTML = `
      <div style="position: absolute; top: 16px; right: 16px; display: flex; gap: 10px;">
        <button onclick="window.editTask('${t.id}')" style="background:transparent; border:none; cursor:pointer; font-size:1.15rem; padding:2px; transition:transform 0.15s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'" title="Düzenle">✏️</button>
        <button onclick="window.deleteTask('${t.id}')" style="background:transparent; border:none; cursor:pointer; font-size:1.15rem; padding:2px; transition:transform 0.15s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'" title="Sil">🗑️</button>
      </div>

      <h4 style="margin: 0 0 20px 0; font-size: 1.15rem; font-weight: 700; color: #1e293b; line-height: 1.4; padding-right: 70px;">${safeUnvan}</h4>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; align-items: start;">
          <div style="display: flex; flex-direction: column; gap: 14px;">
              <span style="display: inline-block; background: #f1f5f9; padding: 6px 12px; border-radius: 6px; font-size: 0.82rem; font-weight: 600; color: #475569; width: max-content; border: 1px solid #e2e8f0;">📅 ${escapeHtml(periodText)}</span>
              
              <div style="font-size: 0.85rem; color: #334155; line-height: 1.7; display:flex; flex-direction:column; gap:4px;">
                 ${t.sgk ? `<div><strong style="color:#64748b;font-weight:700;">SGK:</strong> ${escapeHtml(t.sgk)}</div>` : ''}
                 ${t.oto ? `<div><strong style="color:#64748b;font-weight:700;">Oto:</strong> ${escapeHtml(t.oto)}</div>` : ''}
                 ${t.dosya ? `<div><strong style="color:#64748b;font-weight:700;">Dosya:</strong> ${escapeHtml(t.dosya)}</div>` : ''}
              </div>

              ${t.adres ? `<div style="font-size: 0.82rem; color: #64748b; margin-top: 4px;">📍 ${escapeHtml(t.adres)}</div>` : ''}
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                  <span style="font-size: 0.78rem; font-weight: 700; color: #475569; letter-spacing: 0.05em; text-transform: uppercase;">📄 Belge Yönetimi</span>
                  <button onclick="window.openAttModal('${t.id}', '${safeJsUnvan}')" style="background:#0284c7; color:#fff; border:none; border-radius:6px; padding:5px 12px; font-size:0.75rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:4px; box-shadow:0 2px 4px rgba(2,132,199,0.2); transition:all 0.15s;" onmouseover="this.style.background='#0369a1'" onmouseout="this.style.background='#0284c7'">+ Yükle</button>
              </div>
              
              <div style="display: flex; flex-direction: column; gap: 10px;">
                 ${taskAtts.length === 0 ? '<div style="font-size: 0.8rem; color: #94a3b8;">Yüklü belge bulunmuyor.</div>' : ''}
                 ${taskAtts.map(att => `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:8px 12px; font-size:0.82rem; box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                       <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:600; color:#334155; margin-right:12px;" title="${escapeHtml(att.title)}"><span style="color:#64748b; font-weight:700; margin-right:6px;">${att.doc_type === 'tutanak'?'T':'R'}</span>${escapeHtml(att.title)}</span>
                       <div style="display:flex; gap:10px; flex-shrink: 0;">
                           <button onclick="window.previewAttachment('${att.id}', '${att.doc_type}')" title="Görüntüle" style="background:transparent; border:none; cursor:pointer; font-size:1.1rem; padding:0; line-height:1; transition:transform 0.1s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">👁️</button>
                           <button onclick="window.downloadAttachment('${att.id}')" title="İndir" style="background:transparent; border:none; cursor:pointer; font-size:1.1rem; padding:0; line-height:1; transition:transform 0.1s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">⬇️</button>
                           <button onclick="window.deleteAttachment('${att.id}')" title="Sil" style="background:transparent; border:none; cursor:pointer; font-size:1.1rem; padding:0; line-height:1; transition:transform 0.1s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">🗑️</button>
                       </div>
                    </div>
                 `).join('')}
              </div>
          </div>
      </div>
    `;
    listWrap.appendChild(card);
  });
}


function openTaskModal(taskId = null) {
  const modal = document.getElementById('task-modal');
  const titleEl = document.getElementById('task-modal-title');
  document.getElementById('modal-task-id').value = taskId || '';

  if (taskId) {
    const t = tasks.find(x => x.id === taskId);
    if (!t) return;
    titleEl.innerText = 'Görev Düzenle';
    document.getElementById('modal-t-unvan').value = t.unvan || '';
    document.getElementById('modal-t-oto').value = t.oto || '';
    document.getElementById('modal-t-sgk').value = t.sgk || '';
    document.getElementById('modal-t-dosya').value = t.dosya || '';
    document.getElementById('modal-t-adres').value = t.adres || '';
    document.getElementById('modal-t-start-month').value = t.startMonth !== undefined ? t.startMonth : 0;
    document.getElementById('modal-t-start-year').value = t.startYear !== undefined ? t.startYear : 2025;
    document.getElementById('modal-t-end-month').value = t.endMonth !== undefined ? t.endMonth : 11;
    document.getElementById('modal-t-end-year').value = t.endYear !== undefined ? t.endYear : 2026;
  } else {
    titleEl.innerText = 'Yeni Görev Oluştur';
    document.getElementById('task-form').reset();
    document.getElementById('modal-task-id').value = '';
  }

  modal.classList.remove('hidden');
}

async function saveTaskFromModal() {
  const taskId = document.getElementById('modal-task-id').value;
  const unvan = document.getElementById('modal-t-unvan').value.trim();
  const oto = document.getElementById('modal-t-oto').value.trim();
  const sgk = document.getElementById('modal-t-sgk').value.trim();
  const dosya = document.getElementById('modal-t-dosya').value.trim();
  const adres = document.getElementById('modal-t-adres').value.trim();

  const startMonth = parseInt(document.getElementById('modal-t-start-month').value);
  const startYear = parseInt(document.getElementById('modal-t-start-year').value);
  const endMonth = parseInt(document.getElementById('modal-t-end-month').value);
  const endYear = parseInt(document.getElementById('modal-t-end-year').value);

  if (!unvan) return alert('İşyeri ünvanı zorunludur.');

  if (taskId) {
    const t = tasks.find(x => x.id === taskId);
    if (t) {
      t.unvan = unvan; t.oto = oto; t.sgk = sgk; t.dosya = dosya; t.adres = adres;
      t.startMonth = startMonth; t.startYear = startYear; t.endMonth = endMonth; t.endYear = endYear;
    }
  } else {
    const newTask = {
      id: 'task_' + Date.now(),
      unvan, oto, sgk, dosya, adres,
      startMonth, startYear, endMonth, endYear
    };
    tasks.push(newTask);
  }

  await saveProgramData();
  document.getElementById('task-modal').classList.add('hidden');
  renderTaskGrid();
}

window.editTask = function(taskId) {
  openTaskModal(taskId);
};

window.deleteTask = async function(taskId) {
  if (!confirm('Bu görevi silmek istediğinize emin misiniz? Görev takvimden de kaldırılacaktır.')) return;
  tasks = tasks.filter(t => t.id !== taskId);
  await saveProgramData();
  renderTaskGrid();
};

window.openAttModal = function(taskId, taskUnvan) {
  document.getElementById('att-task-id').value = taskId;
  document.getElementById('att-task-name').value = taskUnvan;
  document.getElementById('att-title').value = '';
  document.getElementById('att-file').value = '';
  document.getElementById('att-modal').classList.remove('hidden');
};

async function uploadAttachmentFromModal() {
  const taskId = document.getElementById('att-task-id').value;
  const docType = document.getElementById('att-doc-type').value;
  const title = document.getElementById('att-title').value.trim();
  const fileInput = document.getElementById('att-file');
  const btnSave = document.getElementById('btn-save-att');

  if (!fileInput.files || fileInput.files.length === 0) {
    return alert('Lütfen bir dosya seçin.');
  }

  const file = fileInput.files[0];
  if (file.size > 15 * 1024 * 1024) {
    return alert('Dosya boyutu maksimum 15MB olabilir.');
  }

  btnSave.innerText = 'Yükleniyor...';
  btnSave.disabled = true;

  const reader = new FileReader();
  reader.onload = async function(e) {
    const fileData = e.target.result;
    try {
      const res = await fetch('/api/admin/tasks/attachment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          docType,
          title,
          fileName: file.name,
          mimeType: file.type,
          fileData
        })
      });

      if (res.ok) {
        alert('Belge güvenli bir şekilde yüklendi!');
        document.getElementById('att-modal').classList.add('hidden');
        await loadAllAttachments();
        renderTaskGrid();
      } else {
        const err = await res.json();
        alert('Yükleme hatası: ' + (err.error || 'Bilinmeyen hata'));
      }
    } catch (err) {
      alert('Yükleme sırasında bir ağ hatası oluştu.');
    } finally {
      btnSave.innerText = 'Belgeyi Güvenli Şekilde Yükle';
      btnSave.disabled = false;
    }
  };
  reader.readAsDataURL(file);
}

window.previewAttachment = async function(attId, docType) {
  try {
    const res = await fetch('/api/admin/tasks/attachment/' + attId);
    if (!res.ok) return alert('Belge bulunamadı veya erişim reddedildi.');

    const data = await res.json();
    const att = data.attachment;
    if (!att || !att.file_data) return alert('Belge verisi okunamadı.');

    document.getElementById('preview-title').innerText = `🔒 ${att.title} (${att.doc_type.toUpperCase()})`;
    const content = document.getElementById('preview-content');

    if (att.mime_type.startsWith('image/')) {
      content.innerHTML = `<img src="${att.file_data}" style="max-width: 100%; max-height: 70vh; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />`;
    } else if (att.mime_type === 'application/pdf') {
      content.innerHTML = `<iframe src="${att.file_data}" style="width: 100%; height: 70vh; border: none; border-radius: 8px;"></iframe>`;
    } else {
      content.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <p style="font-size: 1.1rem; font-weight: 700;">Önizleme bu dosya formatı için doğrudan gösterilemiyor (${att.file_name})</p>
          <button onclick="window.downloadAttachment('${att.id}')" class="save-task-btn-modern" style="width: auto; margin: 16px auto;">⬇️ Belgeyi İndir</button>
        </div>
      `;
    }

    document.getElementById('preview-modal').classList.remove('hidden');
  } catch (err) {
    alert('Önizleme hatası oluştu.');
  }
};

window.downloadAttachment = async function(attId) {
  try {
    const res = await fetch('/api/admin/tasks/attachment/' + attId);
    if (!res.ok) return alert('Belgeye erişim izniniz yok.');

    const data = await res.json();
    const att = data.attachment;
    if (!att || !att.file_data) return alert('Belge okunamadı.');

    const a = document.createElement('a');
    a.href = att.file_data;
    a.download = att.file_name || 'belge';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    alert('İndirme hatası oluştu.');
  }
};

window.deleteAttachment = async function(attId) {
  if (!confirm('Bu tutanak/rapor belgesini silmek istediğinize emin misiniz?')) return;
  try {
    const res = await fetch('/api/admin/tasks/attachment/' + attId, { method: 'DELETE' });
    if (res.ok) {
      await loadAllAttachments();
      renderTaskGrid();
    } else {
      alert('Silme işlemi başarısız.');
    }
  } catch (err) {
    alert('Silme sırasında hata oluştu.');
  }
};
