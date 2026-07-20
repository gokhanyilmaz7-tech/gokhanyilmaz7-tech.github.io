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
  localStorage.setItem(key, JSON.stringify(data));
  if (!(await currentUser())) return;
  await fetch('/api/favorites', {method: 'PUT', credentials: 'same-origin', headers: {'content-type': 'application/json'}, body: JSON.stringify(data)});
}

function openDialog() {
  document.querySelector('#account-dialog')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'account-dialog';
  overlay.className = 'account-overlay';
  overlay.innerHTML = `<section class="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title"><button class="account-close" type="button" aria-label="Kapat">×</button><p class="eyebrow">MEVZUAT REHBERİ</p><h2 id="account-title">Hesabınıza giriş yapın</h2><p class="account-help">Favorileriniz hesabınıza kaydedilir ve farklı cihazlardan erişilebilir.</p><form id="account-form"><label>E-posta<input id="account-email" type="email" autocomplete="email" required></label><label>Şifre<input id="account-password" type="password" minlength="8" autocomplete="current-password" required></label><p id="account-message" class="account-message"></p><button class="account-submit" type="submit">Giriş yap</button></form><button id="account-switch" class="account-switch" type="button">Hesabınız yok mu? Kayıt olun</button></section>`;
  document.body.append(overlay);
  let mode = 'login';
  const title = overlay.querySelector('#account-title');
  const submit = overlay.querySelector('.account-submit');
  const switchButton = overlay.querySelector('#account-switch');
  const message = overlay.querySelector('#account-message');
  overlay.querySelector('.account-close').onclick = () => overlay.remove();
  overlay.onclick = (event) => { if (event.target === overlay) overlay.remove(); };
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

export async function setupAccountUI() {
  const button = document.querySelector('#account-button');
  if (!button) return currentUser();
  const user = await currentUser();
  button.textContent = user ? `Çıkış (${user.email})` : 'Giriş yap';
  button.title = user ? 'Hesabınızdan çıkış yapın' : 'Ücretsiz hesapla giriş yapın';
  button.onclick = async () => {
    if (!user) return openDialog();
    await fetch('/api/auth/logout', {method: 'POST', credentials: 'same-origin'});
    userPromise = Promise.resolve(null);
    window.location.reload();
  };
  return user;
}
