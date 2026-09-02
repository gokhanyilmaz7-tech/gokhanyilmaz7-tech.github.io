import { protectPage } from './auth.js';
protectPage();

function isTaskValidForPeriod(t, year, month) {
  if (t.startYear !== undefined && t.startMonth !== undefined && t.endYear !== undefined && t.endMonth !== undefined) {
    const taskStart = t.startYear * 12 + t.startMonth;
    const taskEnd = t.endYear * 12 + t.endMonth;
    const currentPos = year * 12 + month;
    return currentPos >= taskStart && currentPos <= taskEnd;
  }
  if (t.validMonths) {
    return t.validMonths.includes(month);
  }
  return true;
}

import { currentUser } from './auth';

let user = null;
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0-11
let tasks = [];
let schedule = {}; 
let archiveList = [];

const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const dayNames = ["P", "S", "Ç", "P", "C", "C", "P"];

async function init() {
  user = await currentUser();
  if (!user) {
    window.location.href = '/'; 
    return;
  }
  
  await loadData();
  renderTasks();
  renderCalendar();
  
  document.getElementById('btn-prev-month').addEventListener('click', () => changeMonth(-1));
  document.getElementById('btn-next-month').addEventListener('click', () => changeMonth(1));
  document.getElementById('save-task-btn').addEventListener('click', saveTask);

  // Topbar Save & Archive Event Listeners
  const topbarSaveBtn = document.getElementById('btn-topbar-save');
  if (topbarSaveBtn) topbarSaveBtn.addEventListener('click', saveProgramToArchive);

  const topbarArchiveBtn = document.getElementById('btn-topbar-archive');
  if (topbarArchiveBtn) topbarArchiveBtn.addEventListener('click', openArchiveModal);

  const closeArchiveBtn = document.getElementById('close-archive-btn');
  if (closeArchiveBtn) closeArchiveBtn.addEventListener('click', closeArchiveModal);

  const closeArchiveX = document.getElementById('close-archive-x');
  if (closeArchiveX) closeArchiveX.addEventListener('click', closeArchiveModal);
  
  const closeAssignX = document.getElementById('close-assign-x');
  if (closeAssignX) closeAssignX.addEventListener('click', closeAssignModal);
  document.getElementById('close-assign-modal').addEventListener('click', closeAssignModal);

  // Multi-day selector preset buttons
  const btnMdAll = document.getElementById('btn-md-all');
  if (btnMdAll) btnMdAll.addEventListener('click', () => {
    document.querySelectorAll('.md-day').forEach(el => el.classList.add('selected'));
  });

  const btnMdWeekdays = document.getElementById('btn-md-weekdays');
  if (btnMdWeekdays) btnMdWeekdays.addEventListener('click', () => {
    document.querySelectorAll('.md-day').forEach(el => {
      if (el.dataset.isWeekend === 'false') el.classList.add('selected');
      else el.classList.remove('selected');
    });
  });

  const btnMdWeekends = document.getElementById('btn-md-weekends');
  if (btnMdWeekends) btnMdWeekends.addEventListener('click', () => {
    document.querySelectorAll('.md-day').forEach(el => {
      if (el.dataset.isWeekend === 'true') el.classList.add('selected');
      else el.classList.remove('selected');
    });
  });

  const btnMdClear = document.getElementById('btn-md-clear');
  if (btnMdClear) btnMdClear.addEventListener('click', () => {
    document.querySelectorAll('.md-day').forEach(el => el.classList.remove('selected'));
  });
  document.getElementById('save-assign-btn').addEventListener('click', saveAssign);
  
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', (e) => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(x => x.style.display = 'none');
    e.target.classList.add('active');
    document.getElementById(`tab-${e.target.dataset.tab}`).style.display = 'block';
  }));
}

async function loadData() {
  const t = localStorage.getItem(`mevzuat-tasks-${user.id}`);
  if (t) tasks = JSON.parse(t);
  const s = localStorage.getItem(`mevzuat-schedule-${user.id}`);
  if (s) schedule = JSON.parse(s);
  const a = localStorage.getItem(`mevzuat-archive-${user.id}`);
  if (a) archiveList = JSON.parse(a);

  try {
    const res = await fetch('/api/program');
    if (res.ok) {
      const data = await res.json();
      if (data.tasks && Array.isArray(data.tasks)) tasks = data.tasks;
      if (data.schedule && typeof data.schedule === 'object') schedule = data.schedule;
      if (data.archive && Array.isArray(data.archive)) archiveList = data.archive;
    }
  } catch (err) {
    console.warn('Backend sync unavailable, using local cache.');
  }
}

async function saveData() {
  localStorage.setItem(`mevzuat-tasks-${user.id}`, JSON.stringify(tasks));
  localStorage.setItem(`mevzuat-schedule-${user.id}`, JSON.stringify(schedule));
  localStorage.setItem(`mevzuat-archive-${user.id}`, JSON.stringify(archiveList));

  try {
    await fetch('/api/program', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks, schedule, archive: archiveList })
    });
  } catch (err) {
    console.warn('Backend save failed:', err);
  }
}

function saveTask() {
  const unvan = document.getElementById('t-unvan').value.trim();
  const oto = document.getElementById('t-otomasyon').value.trim();
  const sgk = document.getElementById('t-sgk').value.trim();
  const dosya = document.getElementById('t-dosya').value.trim();
  const adres = document.getElementById('t-adres').value.trim();
  
  const startMonthEl = document.getElementById('t-start-month');
  const startYearEl = document.getElementById('t-start-year');
  const endMonthEl = document.getElementById('t-end-month');
  const endYearEl = document.getElementById('t-end-year');

  const startMonth = startMonthEl ? parseInt(startMonthEl.value) : 0;
  const startYear = startYearEl ? parseInt(startYearEl.value) : currentYear;
  const endMonth = endMonthEl ? parseInt(endMonthEl.value) : 11;
  const endYear = endYearEl ? parseInt(endYearEl.value) : currentYear;
  
  if (!unvan) return alert("İşyeri ünvanı zorunludur.");
  
  const newTask = { 
    id: 'task_' + Date.now(), 
    unvan, 
    oto, 
    sgk, 
    dosya, 
    adres, 
    startMonth, 
    startYear, 
    endMonth, 
    endYear 
  };
  tasks.push(newTask);
  saveData();
  
  document.getElementById('t-unvan').value = '';
  document.getElementById('t-otomasyon').value = '';
  document.getElementById('t-sgk').value = '';
  document.getElementById('t-dosya').value = '';
  document.getElementById('t-adres').value = '';
    
  renderTasks();
}

function deleteTask(id) {
  if(!confirm("Bu görevi silmek istediğinize emin misiniz?")) return;
  tasks = tasks.filter(t => t.id !== id);
  saveData();
  renderTasks();
}

function renderTasks() {
  const list = document.getElementById('task-list');
  list.innerHTML = '';
  tasks.filter(t => isTaskValidForPeriod(t, currentYear, currentMonth)).forEach(t => {
    const card = document.createElement('div');
    card.className = 'task-card';
    
    let periodText = '';
    if (t.startYear !== undefined && t.endYear !== undefined) {
      periodText = `${monthNames[t.startMonth]} ${t.startYear} - ${monthNames[t.endMonth]} ${t.endYear}`;
    }
    
    card.innerHTML = `
      <h4 style="padding-right: 16px;">${t.unvan}</h4>
      ${periodText ? `<p class="task-period-preview">📅 ${periodText}</p>` : ''}
      <p class="task-sgk-preview">SGK: ${t.sgk || '-'}</p>
      <div class="task-details">
        ${periodText ? `<p><span>Dönem:</span> ${periodText}</p>` : ''}
        <p><span>SGK:</span> ${t.sgk || '-'}</p>
        <p><span>Oto Kodu:</span> ${t.oto || '-'}</p>
        <p><span>Dosya No:</span> ${t.dosya || '-'}</p>
        <p><span>Adres:</span> ${t.adres || '-'}</p>
      </div>
      <button class="task-del" onclick="event.stopPropagation(); window.deleteTask('${t.id}')">×</button>
    `;
    card.addEventListener('click', () => card.classList.toggle('expanded'));
    list.appendChild(card);
  });
}
window.deleteTask = deleteTask; 

function changeMonth(delta) {
  currentMonth += delta;
  if(currentMonth > 11) { currentMonth = 0; currentYear++; }
  if(currentMonth < 0) { currentMonth = 11; currentYear--; }
  renderCalendar();
  renderTasks();
}

function renderMiniCal(elId, y, m) {
  const el = document.getElementById(elId);
  el.innerHTML = `<span class="mini-cal-title">${monthNames[m]}</span>`;
  const grid = document.createElement('div');
  grid.className = 'mini-cal-grid';
  dayNames.forEach(d => grid.innerHTML += `<div class="m-day-header">${d}</div>`);
  
  const firstDay = new Date(y, m, 1).getDay();
  const firstDayAdjusted = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const prevDays = new Date(y, m, 0).getDate();
  
  for(let i=0; i<firstDayAdjusted; i++) {
    grid.innerHTML += `<div class="m-day m-day-other">${prevDays - firstDayAdjusted + 1 + i}</div>`;
  }
  for(let i=1; i<=daysInMonth; i++) {
    grid.innerHTML += `<div class="m-day">${i}</div>`;
  }
  let extra = 42 - (firstDayAdjusted + daysInMonth);
  for(let i=1; i<=extra; i++){
    grid.innerHTML += `<div class="m-day m-day-other">${i}</div>`;
  }
  el.appendChild(grid);
}

function renderCalendar() {
  document.getElementById('current-month-name').innerText = monthNames[currentMonth];
  document.getElementById('current-year-name').innerText = currentYear;
  
  let pM = currentMonth - 1, pY = currentYear;
  if(pM < 0){ pM = 11; pY--; }
  renderMiniCal('prev-month-cal', pY, pM);
  
  let nM = currentMonth + 1, nY = currentYear;
  if(nM > 11){ nM = 0; nY++; }
  renderMiniCal('next-month-cal', nY, nM);
  
  const grid = document.getElementById('main-calendar-grid');
  grid.innerHTML = '';
  ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"].forEach(d => {
    grid.innerHTML += `<div class="mc-header">${d}</div>`;
  });
  
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const firstDayAdj = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  const today = new Date();
  const isThisMonth = (today.getFullYear() === currentYear && today.getMonth() === currentMonth);
  
  for(let i=0; i<firstDayAdj; i++) {
    const d = document.createElement('div'); d.className = 'mc-day other-month';
    d.innerHTML = `<span class="mc-date"></span>`; grid.appendChild(d);
  }
  
  for(let day=1; day<=daysInMonth; day++) {
    const isWeekend = new Date(currentYear, currentMonth, day).getDay() === 0 || new Date(currentYear, currentMonth, day).getDay() === 6;
    const d = document.createElement('div');
    d.className = 'mc-day';
    if(isThisMonth && day === today.getDate()) d.classList.add('today');
    if(isWeekend) d.classList.add('weekend');
    
    // Build date string YYYY-MM-DD
    const dateStr = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    
    let evHtml = '';
    let dayEvs = schedule[dateStr];
    let isWeekendCleared = schedule[dateStr] && schedule[dateStr].some(e => e.action === 'clear-weekend');
    if (!dayEvs) dayEvs = [];
    if (isWeekend && !isWeekendCleared && dayEvs.length === 0) {
      dayEvs = [{ id: 'virtual-we', text: 'Hafta Sonu', isVirtual: true }];
    }
    
    // Filter out the placeholder used for clearing
    dayEvs = dayEvs.filter(e => e.action !== 'clear-weekend');
    dayEvs.forEach(ev => {
      let tName = '';
      if (ev.taskId) {
        const t = tasks.find(x => x.id === ev.taskId);
        tName = t ? t.unvan : '';
      } else {
        tName = ev.text || '';
      }
      
      if (!tName && !ev.isVirtual) return; // safeguard
      
      let bdgClass = 'event-badge';
      if (ev.isVirtual) {
        bdgClass += ' weekend-tag';
      } else {
        const lowerName = tName.toLocaleLowerCase('tr-TR');
        if (lowerName.includes('izin')) {
          bdgClass += ' leave-tag';
        } else if (ev.taskId) {
          bdgClass += ' task-tag';
        } else {
          bdgClass += ' manual-tag';
        }
      }
      
      evHtml += `<div class="${bdgClass}">${tName} <button class="del-ev" onclick="event.stopPropagation(); window.delEvent('${dateStr}','${ev.id}')">×</button></div>`;
    });
    
    d.innerHTML = `<span class="mc-date">${day}</span><div class="mc-events">${evHtml}</div>`;
    d.addEventListener('click', () => openAssignModal(dateStr, day));
    grid.appendChild(d);
  }
  
  let extra = 42 - (firstDayAdj + daysInMonth);
  if(extra === 7 && firstDayAdj + daysInMonth <= 35) extra = 0; // standard 5 weeks fit
  for(let i=1; i<=extra; i++){
    const d = document.createElement('div'); d.className = 'mc-day other-month';
    d.innerHTML = `<span class="mc-date"></span>`; grid.appendChild(d);
  }
}

let activeDateStr = null;
function openAssignModal(dateStr, day) {
  activeDateStr = dateStr;
  
  const sel = document.getElementById('assign-task-select');
  sel.innerHTML = '<option value="">-- Görev Seçin --</option>';
  tasks.filter(t => isTaskValidForPeriod(t, currentYear, currentMonth))
       .forEach(t => sel.innerHTML += `<option value="${t.id}">${t.unvan}</option>`);
  
  document.getElementById('assign-manual-text').value = '';
  
  // Render 7-column calendar week selector grid (Pazartesi -> Pazar)
  const mds = document.getElementById('multi-day-selector');
  if (mds) {
    mds.innerHTML = '';
    
    // 1. Column Headers (Mon -> Sun)
    const headers = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
    headers.forEach((h, idx) => {
      const hCell = document.createElement('div');
      hCell.className = 'md-header-cell';
      if (idx >= 5) hCell.classList.add('md-header-weekend');
      hCell.innerText = h;
      mds.appendChild(hCell);
    });
    
    // 2. Month Offset (Mon=0, Tue=1, ..., Sun=6)
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const firstDayAdj = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    for (let i = 0; i < firstDayAdj; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'md-empty-cell';
      mds.appendChild(emptyCell);
    }
    
    // 3. Render Day Cells
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const iterDateStr = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
      const item = document.createElement('div');
      item.className = 'md-day md-day-cell';
      if (iterDateStr === dateStr) item.classList.add('selected');
      
      const dayObj = new Date(currentYear, currentMonth, dayNum);
      const mDayOfWeek = dayObj.getDay(); // 0 = Sun, 6 = Sat
      const isWeekend = (mDayOfWeek === 0 || mDayOfWeek === 6);
      
      if (isWeekend) item.classList.add('md-weekend');
      item.dataset.isWeekend = isWeekend ? 'true' : 'false';
      item.dataset.date = iterDateStr;
      
      item.innerText = dayNum;
      item.title = `${dayNum} ${monthNames[currentMonth]} ${currentYear}`;
      item.addEventListener('click', () => item.classList.toggle('selected'));
      mds.appendChild(item);
    }
  }

  document.getElementById('assign-modal').classList.remove('hidden');
}

function closeAssignModal() {
  document.getElementById('assign-modal').classList.add('hidden');
}

function saveAssign() {
  const t = document.querySelector('.tab.active').dataset.tab;
  let taskId = null;
  let textVal = null;
  
  if (t === 'from-tasks') {
    const val = document.getElementById('assign-task-select').value;
    if(!val) return;
    taskId = val;
  } else {
    const val = document.getElementById('assign-manual-text').value.trim();
    if(!val) return;
    textVal = val;
  }
  
  const selectedDays = Array.from(document.querySelectorAll('.md-day.selected')).map(el => el.dataset.date);
  if(selectedDays.length === 0) return; // Fallback
  
  selectedDays.forEach((dStr, idx) => {
    const newEv = { id: 'ev_' + Date.now() + '_' + idx };
    if(taskId) newEv.taskId = taskId;
    if(textVal) newEv.text = textVal;
    
    if(!schedule[dStr]) schedule[dStr] = [];
    schedule[dStr].push(newEv);
  });
  
  saveData();
  
  closeAssignModal();
  renderCalendar();
}

window.delEvent = function(dateStr, evId) {
  if(!confirm("Bu girişi silmek istediğinize emin misiniz?")) return;
  if (evId === 'virtual-we') {
    if(!schedule[dateStr]) schedule[dateStr] = [];
    schedule[dateStr].push({ id: 'we_' + Date.now(), action: 'clear-weekend' });
    saveData();
    renderCalendar();
    return;
  }
  
  if(schedule[dateStr]) {
    schedule[dateStr] = schedule[dateStr].filter(e => e.id !== evId);
    if(schedule[dateStr].length === 0) delete schedule[dateStr];
    saveData();
    renderCalendar();
  }
}

// Program Archive Functions
function saveProgramToArchive() {
  const currentEventsCount = Object.values(schedule).reduce((acc, evs) => acc + evs.length, 0);
  const now = new Date();
  const dateLabel = `${now.toLocaleDateString('tr-TR')} ${now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
  
  const archiveItem = {
    id: 'arch_' + Date.now(),
    dateLabel,
    month: currentMonth,
    year: currentYear,
    monthName: monthNames[currentMonth],
    taskCount: tasks.length,
    eventCount: currentEventsCount,
    schedule: JSON.parse(JSON.stringify(schedule)),
    tasks: JSON.parse(JSON.stringify(tasks))
  };

  archiveList.unshift(archiveItem);
  saveData();
  alert(`"${monthNames[currentMonth]} ${currentYear}" görev programı arşive başarıyla kaydedildi!`);
}

function openArchiveModal() {
  renderArchiveList();
  document.getElementById('archive-modal').classList.remove('hidden');
}

function closeArchiveModal() {
  document.getElementById('archive-modal').classList.add('hidden');
}

function renderArchiveList() {
  const container = document.getElementById('archive-list');
  if (!container) return;

  if (archiveList.length === 0) {
    container.innerHTML = `<div class="archive-empty">Henüz kaydedilmiş bir görev programı arşivi bulunmuyor.</div>`;
    return;
  }

  container.innerHTML = archiveList.map((item, index) => {
    const isCurrent = (index === 0);
    return `
      <div class="archive-card ${isCurrent ? 'active-archive' : ''}">
        <div class="archive-info">
          <h4>${item.monthName} ${item.year} Programı ${isCurrent ? '<span style="font-size:0.75rem; color:#10b981; margin-left:6px;">(Son Kayıt)</span>' : ''}</h4>
          <div class="archive-meta">
            <span>🕒 ${item.dateLabel}</span>
            <span>🏢 ${item.taskCount || 0} Görev</span>
            <span>📌 ${item.eventCount || 0} Etkinlik</span>
          </div>
        </div>
        <div class="archive-card-actions">
          <button onclick="loadArchiveItem('${item.id}')" class="btn-sm btn-success">📂 Yükle / Çağır</button>
          <button onclick="deleteArchiveItem('${item.id}')" class="btn-sm btn-danger">🗑️ Sil</button>
        </div>
      </div>
    `;
  }).join('');
}

function loadArchiveItem(id) {
  const item = archiveList.find(a => a.id === id);
  if (!item) return;

  if (!confirm(`"${item.monthName} ${item.year}" arşivini takvime yüklemek istediğinize emin misiniz?`)) return;

  if (item.schedule) schedule = JSON.parse(JSON.stringify(item.schedule));
  if (item.tasks) tasks = JSON.parse(JSON.stringify(item.tasks));
  if (item.month !== undefined) currentMonth = item.month;
  if (item.year !== undefined) currentYear = item.year;

  saveData();
  renderTasks();
  renderCalendar();
  closeArchiveModal();
  alert(`"${item.monthName} ${item.year}" görev programı takvime yüklendi!`);
}
window.loadArchiveItem = loadArchiveItem;

function deleteArchiveItem(id) {
  if (!confirm("Bu arşiv kaydını silmek istediğinize emin misiniz?")) return;
  archiveList = archiveList.filter(a => a.id !== id);
  saveData();
  renderArchiveList();
}
window.deleteArchiveItem = deleteArchiveItem;

init();
