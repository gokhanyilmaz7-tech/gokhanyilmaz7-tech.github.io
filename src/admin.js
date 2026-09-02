import './admin.css';
import {setupAccountUI} from './auth.js';

const app = document.querySelector('#admin-app');

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'}[character]));
}

function formatDate(value) {
  return new Intl.DateTimeFormat('tr-TR', {dateStyle: 'medium'}).format(new Date(Number(value)));
}

function render(data) {
  app.innerHTML = `<header class="admin-topbar"><div><h1>Yönetici Paneli</h1></div><div class="admin-topbar-actions"><a href="/">Ana sayfa</a><button id="logout-button" type="button">Çıkış yap</button></div></header><main class="admin-layout"><section class="admin-summary"><article><span>Toplam kullanıcı</span><strong>${data.counts.users}</strong></article><article><span>Favori listesi</span><strong>${data.counts.lists}</strong></article><article><span>Rapor kaydı</span><strong>${data.counts.reports}</strong></article></section><section class="admin-card"><div class="admin-card-heading"><div><p class="eyebrow">HESAP YÖNETİMİ</p><h2>Kullanıcılar</h2></div><span>${data.users.length} kayıt</span></div><div class="admin-table-wrap"><table><thead><tr><th>E-posta</th><th>Giriş yöntemi</th><th>Kayıt tarihi</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>${data.users.map((user) => `<tr><td>${escapeHtml(user.email)}</td><td><span class="provider-badge">${escapeHtml(user.provider)}</span></td><td>${formatDate(user.createdAt)}</td><td>${user.isApproved ? '<span style="color:green; font-weight:bold;">Onaylı</span>' : '<span style="color:orange; font-weight:bold;">Bekliyor</span>'}</td><td>${!user.isApproved ? `<button class="approve-btn" data-id="${user.id}" style="background:#10b981; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-weight:bold; margin-right:5px;">Onayla</button><button class="delete-btn" data-id="${user.id}" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-weight:bold;">Sil</button>` : `<button class="delete-btn" data-id="${user.id}" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-weight:bold;">Sil</button>`}</td></tr>`).join('')}</tbody></table></div></section></main>`;
  document.querySelector('#logout-button').onclick = async () => {
    await fetch('/api/auth/logout', {method: 'POST', credentials: 'same-origin'});
    window.location.href = '/';
  };

  document.querySelectorAll('.approve-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Kullanıcıyı onaylamak istediğinize emin misiniz?')) {
        await fetch(`/api/admin/users/${id}`, {method: 'POST'});
        load();
      }
    };
  });
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Kullanıcıyı silmek (reddetmek) istediğinize emin misiniz?')) {
        await fetch(`/api/admin/users/${id}`, {method: 'DELETE'});
        load();
      }
    };
  });

}

async function load() {
  const response = await fetch('/api/admin/summary', {credentials: 'same-origin', cache: 'no-store'});
  if (response.status === 401 || response.status === 403 || response.status === 404) {
    app.innerHTML = '<main class="admin-denied"><h1>Bu sayfa bulunamadı</h1><p>Yönetici yetkisi olan Apple hesabıyla giriş yapmanız gerekir.</p><a href="/">Ana sayfaya dön</a></main>';
    return;
  }
  if (!response.ok) throw new Error('Yönetici verileri yüklenemedi.');
  render(await response.json());
}

await setupAccountUI();
load().catch((error) => { app.innerHTML = `<main class="admin-denied"><h1>Panel yüklenemedi</h1><p>${escapeHtml(error.message)}</p><a href="/">Ana sayfaya dön</a></main>`; });
