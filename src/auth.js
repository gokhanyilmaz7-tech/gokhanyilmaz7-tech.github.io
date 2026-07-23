import './auth.css';

let userPromise;

export async function currentUser() {
  if (!userPromise) userPromise = fetch('/api/auth/me', {credentials: 'same-origin', cache: 'no-store'}).then((response) => response.ok ? response.json() : {user: null}).then((result) => result.user || null).catch(() => null);
  return userPromise;
}

export async function hydrateFavorites(key = 'mevzuat-local-favorites') {
  const user = await currentUser();
  if (!user) return null;
  const response = await fetch('/api/favorites', {credentials: 'same-origin'});
  if (!response.ok) return null;
  const data = await response.json();
  localStorage.setItem(key, JSON.stringify(data));
  return data;
}

export async function persistFavorites(data, key = 'mevzuat-local-favorites') {
  if (!(await currentUser())) return false;
  localStorage.setItem(key, JSON.stringify(data));
  const response = await fetch('/api/favorites', {method: 'PUT', credentials: 'same-origin', headers: {'content-type': 'application/json'}, body: JSON.stringify(data)});
  return response.ok;
}

function openDialog() {
  document.querySelector('#account-dialog')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'account-dialog';
  overlay.className = 'account-overlay';
  overlay.innerHTML = `<section class="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title"><button class="account-close" type="button" aria-label="Kapat">×</button><p class="eyebrow">MEVZUAT REHBERİ</p><h2 id="account-title">Hesabınıza giriş yapın</h2><p class="account-help">Favori ve rapor kayıtlarınız için üye girişi gereklidir.</p><form id="account-form"><label>E-posta<input id="account-email" type="email" autocomplete="email" required></label><label>Şifre<input id="account-password" type="password" minlength="8" autocomplete="current-password" required></label><p id="account-message" class="account-message"></p><button class="account-submit" type="submit">Giriş yap</button></form><button id="apple-login" class="apple-login" type="button"> Apple ile kayıt ol / giriş yap</button><button id="account-switch" class="account-switch" type="button">Hesabınız yok mu? Kayıt olun</button></section>`;
  document.body.append(overlay);
  let mode = 'login';
  const title = overlay.querySelector('#account-title');
  const submit = overlay.querySelector('.account-submit');
  const switchButton = overlay.querySelector('#account-switch');
  const message = overlay.querySelector('#account-message');
  overlay.querySelector('.account-close').onclick = () => overlay.remove();
  overlay.onclick = (event) => { if (event.target === overlay) overlay.remove(); };
  overlay.querySelector('#apple-login').onclick = async () => {
    const appleButton = overlay.querySelector('#apple-login');
    message.textContent = 'Apple girişine bağlanılıyor…';
    appleButton.disabled = true;
    try {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      const response = await fetch(`/api/auth/apple/start?returnTo=${encodeURIComponent(returnTo || '/admin.html')}`, {credentials: 'same-origin', redirect: 'manual'});
      if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
        window.location.href = response.headers.get('location') || `/api/auth/apple/start?returnTo=${encodeURIComponent(returnTo || '/admin.html')}`;
        return;
      }
      const result = await response.json().catch(() => ({}));
      message.textContent = result.error || 'Apple girişi şu anda kullanılamıyor.';
    } catch {
      message.textContent = 'Apple girişi için yerel Worker bağlantısı kurulamadı.';
    } finally {
      appleButton.disabled = false;
    }
  };
  switchButton.onclick = () => { mode = mode === 'login' ? 'register' : 'login'; title.textContent = mode === 'login' ? 'Hesabınıza giriş yapın' : 'Ücretsiz hesap oluşturun'; submit.textContent = mode === 'login' ? 'Giriş yap' : 'Kayıt ol'; switchButton.textContent = mode === 'login' ? 'Hesabınız yok mu? Kayıt olun' : 'Zaten hesabınız var mı? Giriş yapın'; overlay.querySelector('#account-password').setAttribute('autocomplete', mode === 'login' ? 'current-password' : 'new-password'); };
  overlay.querySelector('#account-form').onsubmit = async (event) => {
    event.preventDefault();
    message.textContent = 'İşleniyor…';
    const response = await fetch(`/api/auth/${mode === 'login' ? 'login' : 'register'}`, {method: 'POST', credentials: 'same-origin', headers: {'content-type': 'application/json'}, body: JSON.stringify({email: overlay.querySelector('#account-email').value, password: overlay.querySelector('#account-password').value})});
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { message.textContent = result.error || 'İşlem tamamlanamadı.'; return; }
    userPromise = Promise.resolve(result.user);
    overlay.remove();
    await hydrateFavorites();
    window.location.reload();
  };
}

export async function requireAccount() {
  const user = await currentUser();
  if (user) return user;
  openDialog();
  return null;
}

function openAccountSettings(user) {
  document.querySelector('#account-dialog')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'account-dialog';
  overlay.className = 'account-overlay';
  overlay.innerHTML = `<section class="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title"><button class="account-close" type="button" aria-label="Kapat">×</button><p class="eyebrow">HESAP AYARLARI</p><h2 id="account-title">Hesabınızı yönetin</h2><p class="account-help">Mevcut şifreniz doğrulanmadan e-posta veya şifre değiştirilemez.</p><form id="account-settings-form"><label>Mevcut şifre<input id="account-current-password" type="password" autocomplete="current-password" required></label><label>Yeni e-posta<input id="account-new-email" type="email" value="${user.email}" autocomplete="email"></label><label>Yeni şifre <span>(değiştirmek istemezseniz boş bırakın)</span><input id="account-new-password" type="password" minlength="8" autocomplete="new-password"></label><p id="account-message" class="account-message"></p><button class="account-submit" type="submit">Bilgileri güncelle</button></form><div class="account-danger-zone"><button id="account-logout" class="account-switch" type="button">Çıkış yap</button><button id="account-delete" class="account-delete" type="button">Hesabımı sil</button></div></section>`;
  document.body.append(overlay);
  const message = overlay.querySelector('#account-message');
  overlay.querySelector('.account-close').onclick = () => overlay.remove();
  overlay.onclick = (event) => { if (event.target === overlay) overlay.remove(); };
  overlay.querySelector('#account-settings-form').onsubmit = async (event) => {
    event.preventDefault();
    message.textContent = 'Güncelleniyor…';
    const response = await fetch('/api/auth/account', {method: 'PATCH', credentials: 'same-origin', headers: {'content-type': 'application/json'}, body: JSON.stringify({currentPassword: overlay.querySelector('#account-current-password').value, email: overlay.querySelector('#account-new-email').value, newPassword: overlay.querySelector('#account-new-password').value})});
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { message.textContent = result.error || 'Güncelleme yapılamadı.'; return; }
    userPromise = Promise.resolve(result.user);
    message.textContent = 'Hesap bilgileriniz güncellendi.';
    setTimeout(() => window.location.reload(), 500);
  };
  overlay.querySelector('#account-logout').onclick = async () => { await fetch('/api/auth/logout', {method: 'POST', credentials: 'same-origin'}); userPromise = Promise.resolve(null); window.location.reload(); };
  overlay.querySelector('#account-delete').onclick = async () => {
    if (!window.confirm('Hesabınız ve tüm favorileriniz kalıcı olarak silinsin mi?')) return;
    message.textContent = 'Hesap siliniyor…';
    const response = await fetch('/api/auth/account', {method: 'DELETE', credentials: 'same-origin', headers: {'content-type': 'application/json'}, body: JSON.stringify({currentPassword: overlay.querySelector('#account-current-password').value})});
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { message.textContent = result.error || 'Hesap silinemedi.'; return; }
    localStorage.removeItem('mevzuat-local-favorites');
    window.location.href = '/';
  };
}

export async function setupAccountUI() {
  const button = document.querySelector('#account-button');
  if (!button) return currentUser();
  const logoutButton = document.querySelector('#logout-button');
  const user = await currentUser();
  button.textContent = user ? 'Hesap ayarları' : 'Giriş yap';
  button.title = user ? 'Hesap ayarlarını açın' : 'Ücretsiz hesapla giriş yapın';
  document.querySelector('#admin-panel-link')?.remove();
  if (user?.isAdmin) button.insertAdjacentHTML('afterend', '<a id="admin-panel-link" class="admin-panel-link" href="/admin.html">Yönetici paneli</a>');
  if (logoutButton) {
    logoutButton.hidden = !user;
    logoutButton.onclick = async () => {
      if (!window.confirm('Çıkış yapmak istiyor musunuz?')) return;
      await fetch('/api/auth/logout', {method: 'POST', credentials: 'same-origin'});
      userPromise = Promise.resolve(null);
      window.location.reload();
    };
  }
  button.onclick = async () => {
    if (!user) return openDialog();
    return openAccountSettings(user);
  };
  return user;
}
