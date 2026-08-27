import { currentUser } from './auth';

let user = null;
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0-11
let tasks = [];
let schedule = {}; 

const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const dayNames = ["P", "S", "Ç", "P", "C", "C", "P"];

async function init() {
  user = await currentUser();
  if (!user) {
    window.location.href = '/'; 
    return;
  }
  
  loadData();
  renderTasks();
  renderCalendar();
  
  document.getElementById('btn-prev-month').addEventListener('click', () => changeMonth(-1));
  document.getElementById('btn-next-month').addEventListener('click', () => changeMonth(1));
  
      document.getElementById('save-task-btn').addEventListener('click', saveTask);
  
  document.getElementById('close-assign-modal').addEventListener('click', closeAssignModal);
  document.getElementById('save-assign-btn').addEventListener('click', saveAssign);
  
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', (e) => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(x => x.style.display = 'none');
    e.target.classList.add('active');
    document.getElementById(`tab-${e.target.dataset.tab}`).style.display = 'block';
  }));
}

function loadData() {
  const t = localStorage.getItem(`mevzuat-tasks-${user.id}`);
  if (t) tasks = JSON.parse(t);
  const s = localStorage.getItem(`mevzuat-schedule-${user.id}`);
  if (s) schedule = JSON.parse(s);
}

function saveData() {
  localStorage.setItem(`mevzuat-tasks-${user.id}`, JSON.stringify(tasks));
  localStorage.setItem(`mevzuat-schedule-${user.id}`, JSON.stringify(schedule));
}

function saveTask() {
  const unvan = document.getElementById('t-unvan').value.trim();
  const oto = document.getElementById('t-otomasyon').value.trim();
  const sgk = document.getElementById('t-sgk').value.trim();
  const dosya = document.getElementById('t-dosya').value.trim();
  const adres = document.getElementById('t-adres').value.trim();
  
  if (!unvan) return alert("İşyeri ünvanı zorunludur.");
  
  const newTask = { id: 'task_' + Date.now(), unvan, oto, sgk, dosya, adres };
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
  // Optional: remove from schedule? Keeping it simple.
  saveData();
  renderTasks();
}

function renderTasks() {
  const list = document.getElementById('task-list');
  list.innerHTML = '';
  tasks.forEach(t => {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.innerHTML = `
      <h4>${t.unvan}</h4>
      <p>SGK: ${t.sgk || '-'}</p>
      <button class="task-del" onclick="window.deleteTask('${t.id}')">×</button>
    `;
    list.appendChild(card);
  });
}
window.deleteTask = deleteTask; 

function changeMonth(delta) {
  currentMonth += delta;
  if(currentMonth > 11) { currentMonth = 0; currentYear++; }
  if(currentMonth < 0) { currentMonth = 11; currentYear--; }
  renderCalendar();
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
        } else {
          bdgClass += ' task-tag';
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
  tasks.forEach(t => sel.innerHTML += `<option value="${t.id}">${t.unvan}</option>`);
  
  document.getElementById('assign-manual-text').value = '';
  
  // Render multiple day selector
  const mds = document.getElementById('multi-day-selector');
  mds.innerHTML = '';
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  for(let i=1; i<=daysInMonth; i++) {
    const iterDateStr = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
    const span = document.createElement('span');
    span.className = 'md-day';
    if(iterDateStr === dateStr) span.classList.add('selected');
    
    const mDayOfWeek = new Date(currentYear, currentMonth, i).getDay();
    if(mDayOfWeek === 0 || mDayOfWeek === 6) span.classList.add('md-weekend');
    
    const dayNamesFull = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
    const dName = dayNamesFull[mDayOfWeek];
    span.innerText = `${i} ${monthNames[currentMonth]} ${dName}`;
    span.dataset.date = iterDateStr;
    span.addEventListener('click', () => span.classList.toggle('selected'));
    mds.appendChild(span);
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

init();
