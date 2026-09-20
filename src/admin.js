import './admin.css';
import {setupAccountUI} from './auth.js';

const app = document.querySelector('#admin-app');

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'}[character]));
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('tr-TR', {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(Number(value)));
}

function statusLabel(status) {
  return {approved: 'Onaylı', pending: 'Bekliyor', rejected: 'Reddedildi', blocked: 'Kara listede'}[status] || 'Bekliyor';
}

function userRow(user) {
  const reason = user.rejectionReason ? `<p class="user-reason"><strong>Açıklama:</strong> ${escapeHtml(user.rejectionReason)}</p>` : '';
  const notice = user.notificationStatus ? `<span class="notify-badge ${user.notificationStatus === 'sent' ? 'notify-sent' : 'notify-failed'}">${user.notificationStatus === 'sent' ? 'Bildirim gönderildi' : 'Bildirim bekliyor'}</span>` : '<span class="notify-badge">Manuel takip</span>';
  return `<tr>
    <td>
      <strong>${escapeHtml(user.email)}</strong>
      <div class="user-links">
        <a href="${escapeHtml(user.mailto)}">E-posta yaz</a>
        <a href="${escapeHtml(user.whatsapp)}" target="_blank" rel="noopener noreferrer">WhatsApp metni</a>
      </div>
      ${reason}
    </td>
    <td><span class="provider-badge">${escapeHtml(user.provider)}</span></td>
    <td>${formatDate(user.createdAt)}</td>
    <td><span class="status-pill status-${escapeHtml(user.status)}">${statusLabel(user.status)}</span>${notice}</td>
    <td>
      <div class="admin-actions">
        ${user.status !== 'approved' ? `<button class="approve-btn" data-id="${escapeHtml(user.id)}" type="button">Onayla</button>` : ''}
        ${user.status !== 'blocked' ? `<button class="reject-btn" data-id="${escapeHtml(user.id)}" type="button">Red ver</button>` : ''}
        <button class="blacklist-btn" data-id="${escapeHtml(user.id)}" type="button">Kara liste</button>
        <button class="delete-btn" data-id="${escapeHtml(user.id)}" type="button">Sil</button>
      </div>
    </td>
  </tr>`;
}

async function postUserAction(id, action, reason = '') {
  const response = await fetch(`/api/admin/users/${encodeURIComponent(id)}/${action}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({reason})
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'İşlem tamamlanamadı.');
}

async function deleteUser(id) {
  const response = await fetch(`/api/admin/users/${encodeURIComponent(id)}/delete`, {method: 'DELETE', credentials: 'same-origin'});
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Kullanıcı silinemedi.');
}

function bindActions() {
  document.querySelector('#logout-button').onclick = async () => {
    await fetch('/api/auth/logout', {method: 'POST', credentials: 'same-origin'});
    window.location.href = '/';
  };

  document.querySelectorAll('.approve-btn').forEach((button) => {
    button.onclick = async () => {
      button.disabled = true;
      try {
        await postUserAction(button.dataset.id, 'approve');
        await load();
      } catch (error) {
        alert(error.message);
        button.disabled = false;
      }
    };
  });

  document.querySelectorAll('.reject-btn').forEach((button) => {
    button.onclick = async () => {
      const reason = prompt('Kullanıcıya iletilecek red açıklamasını yazın:');
      if (!reason?.trim()) return;
      button.disabled = true;
      try {
        await postUserAction(button.dataset.id, 'reject', reason);
        await load();
      } catch (error) {
        alert(error.message);
        button.disabled = false;
      }
    };
  });

  document.querySelectorAll('.blacklist-btn').forEach((button) => {
    button.onclick = async () => {
      const reason = prompt('Kara liste açıklamasını yazın:');
      if (!reason?.trim()) return;
      if (!confirm('Bu kullanıcı kara listeye alınsın ve mevcut oturumları kapatılsın mı?')) return;
      button.disabled = true;
      try {
        await postUserAction(button.dataset.id, 'blacklist', reason);
        await load();
      } catch (error) {
        alert(error.message);
        button.disabled = false;
      }
    };
  });

  document.querySelectorAll('.delete-btn').forEach((button) => {
    button.onclick = async () => {
      if (!confirm('Kullanıcı kaydı kalıcı olarak silinsin mi?')) return;
      button.disabled = true;
      try {
        await deleteUser(button.dataset.id);
        await load();
      } catch (error) {
        alert(error.message);
        button.disabled = false;
      }
    };
  });
}

function render(data) {
  const pendingUsers = data.users.filter((user) => user.status === 'pending');
  const otherUsers = data.users.filter((user) => user.status !== 'pending');
  app.innerHTML = `<header class="admin-topbar"><div><h1>Yönetici Paneli</h1></div><div class="admin-topbar-actions"><a href="/">Ana sayfa</a><button id="logout-button" type="button">Çıkış yap</button></div></header>
  <main class="admin-layout">
    <section class="admin-summary">
      <article><span>Toplam kullanıcı</span><strong>${data.counts.users}</strong></article>
      <article><span>Onay bekleyen</span><strong>${data.counts.pending}</strong></article>
      <article><span>Kara listede</span><strong>${data.counts.blocked}</strong></article>
      <article><span>Favori listesi</span><strong>${data.counts.lists}</strong></article>
    </section>
    <section class="admin-card pending-card">
      <div class="admin-card-heading"><div><p class="eyebrow">ONAY KUYRUĞU</p><h2>Bekleyen başvurular</h2></div><span>${pendingUsers.length} başvuru</span></div>
      <div class="admin-table-wrap">${pendingUsers.length ? `<table><thead><tr><th>E-posta</th><th>Giriş yöntemi</th><th>Kayıt tarihi</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>${pendingUsers.map(userRow).join('')}</tbody></table>` : '<p class="empty-admin">Bekleyen başvuru yok.</p>'}</div>
    </section>
    <section class="admin-card">
      <div class="admin-card-heading"><div><p class="eyebrow">HESAP YÖNETİMİ</p><h2>Tüm kullanıcılar</h2></div><span>${data.users.length} kayıt</span></div>
      <div class="admin-table-wrap"><table><thead><tr><th>E-posta</th><th>Giriş yöntemi</th><th>Kayıt tarihi</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>${otherUsers.map(userRow).join('')}</tbody></table></div>
    </section>
  </main>`;
  bindActions();
}

async function load() {
  const response = await fetch('/api/admin/summary', {credentials: 'same-origin', cache: 'no-store'});
  if (response.status === 401 || response.status === 403 || response.status === 404) {
    app.innerHTML = '<main class="admin-denied"><h1>Bu sayfa bulunamadı</h1><p>Yönetici yetkisi olan hesapla giriş yapmanız gerekir.</p><a href="/">Ana sayfaya dön</a></main>';
    return;
  }
  if (!response.ok) throw new Error('Yönetici verileri yüklenemedi.');
  render(await response.json());
}

await setupAccountUI();
load().catch((error) => { app.innerHTML = `<main class="admin-denied"><h1>Panel yüklenemedi</h1><p>${escapeHtml(error.message)}</p><a href="/">Ana sayfaya dön</a></main>`; });
