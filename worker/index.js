const SESSION_COOKIE = 'mevzuat_session';
const SESSION_DAYS = 30;
const encoder = new TextEncoder();

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store, no-cache, must-revalidate', ...headers}
});

const error = (message, status = 400) => json({error: message}, status);

function randomId(bytes = 18) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return [...buffer].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function base64Url(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value) {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sha256(value) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

async function passwordHash(password, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256'}, key, 256);
  return `pbkdf2$100000$${base64Url(salt)}$${base64Url(new Uint8Array(bits))}`;
}

async function passwordMatches(password, encoded) {
  const [, iterations, saltText, expected] = String(encoded).split('$');
  if (!iterations || !saltText || !expected) return false;
  const salt = fromBase64Url(saltText);
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const matches = async (count) => {
    try {
      const bits = await crypto.subtle.deriveBits({name: 'PBKDF2', salt, iterations: count, hash: 'SHA-256'}, key, 256);
      return base64Url(new Uint8Array(bits)) === expected;
    } catch {
      return false;
    }
  };
  if (await matches(Math.min(Number(iterations), 100000))) return true;
  return Number(iterations) === 100000 && await matches(120000);
}

function cookie(request, name) {
  const header = request.headers.get('cookie') || '';
  return header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) || '';
}

async function currentUser(request, env) {
  const raw = cookie(request, SESSION_COOKIE);
  if (!raw) return null;
  const tokenHash = base64Url(await sha256(raw));
  const row = await env.DB.prepare('SELECT users.id, users.email FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?').bind(tokenHash, Date.now()).first();
  return row || null;
}

async function createSession(userId, env) {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = base64Url(tokenBytes);
  const tokenHash = base64Url(await sha256(token));
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').bind(tokenHash, userId, expiresAt).run();
  return `
${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 24 * 60 * 60}`.trim();
}

async function auth(request, env, pathname) {
  if (pathname === '/api/auth/me' && request.method === 'GET') {
    const user = await currentUser(request, env);
    return user ? json({user}) : json({user: null});
  }
  if (pathname === '/api/auth/register' && request.method === 'POST') {
    const body = await request.json().catch(() => null);
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error('Geçerli bir e-posta adresi girin.');
    if (password.length < 8) return error('Şifre en az 8 karakter olmalıdır.');
    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) return error('Bu e-posta ile zaten bir hesap var.', 409);
    const id = randomId();
    await env.DB.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').bind(id, email, await passwordHash(password), Date.now()).run();
    return json({user: {id, email}}, 201, {'set-cookie': await createSession(id, env)});
  }
  if (pathname === '/api/auth/login' && request.method === 'POST') {
    const body = await request.json().catch(() => null);
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const user = await env.DB.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').bind(email).first();
    if (!user || !(await passwordMatches(password, user.password_hash))) return error('E-posta veya şifre hatalı.', 401);
    return json({user: {id: user.id, email: user.email}}, 200, {'set-cookie': await createSession(user.id, env)});
  }
  if (pathname === '/api/auth/logout' && request.method === 'POST') {
    const raw = cookie(request, SESSION_COOKIE);
    if (raw) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(base64Url(await sha256(raw))).run();
    return json({ok: true}, 200, {'set-cookie': `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`});
  }
  if (pathname === '/api/auth/account' && (request.method === 'PATCH' || request.method === 'DELETE')) {
    const user = await currentUser(request, env);
    if (!user) return error('Oturum açmanız gerekiyor.', 401);
    const body = await request.json().catch(() => null);
    const currentPassword = String(body?.currentPassword || '');
    const stored = await env.DB.prepare('SELECT password_hash, email FROM users WHERE id = ?').bind(user.id).first();
    if (!stored || !(await passwordMatches(currentPassword, stored.password_hash))) return error('Mevcut şifre hatalı.', 401);
    if (request.method === 'DELETE') {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM favorite_items WHERE list_id IN (SELECT id FROM favorite_lists WHERE user_id = ?)').bind(user.id),
        env.DB.prepare('DELETE FROM favorite_lists WHERE user_id = ?').bind(user.id),
        env.DB.prepare('DELETE FROM favorite_order WHERE user_id = ?').bind(user.id),
        env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
        env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
      ]);
      return json({ok: true}, 200, {'set-cookie': `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`});
    }
    const email = String(body?.email || '').trim().toLowerCase();
    const newPassword = String(body?.newPassword || '');
    if (!email && !newPassword) return error('Yeni e-posta veya yeni şifre girin.');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error('Geçerli bir e-posta adresi girin.');
    if (newPassword && newPassword.length < 8) return error('Yeni şifre en az 8 karakter olmalıdır.');
    if (email && email !== stored.email) {
      const duplicate = await env.DB.prepare('SELECT id FROM users WHERE email = ? AND id != ?').bind(email, user.id).first();
      if (duplicate) return error('Bu e-posta başka bir hesapta kullanılıyor.', 409);
    }
    if (email) await env.DB.prepare('UPDATE users SET email = ? WHERE id = ?').bind(email, user.id).run();
    if (newPassword) await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(await passwordHash(newPassword), user.id).run();
    return json({user: {id: user.id, email: email || stored.email}});
  }
  return null;
}

async function favorites(request, env) {
  const user = await currentUser(request, env);
  if (!user) return error('Oturum açmanız gerekiyor.', 401);
  if (request.method === 'GET') {
    const lists = await env.DB.prepare('SELECT id, name, position FROM favorite_lists WHERE user_id = ? ORDER BY position, created_at').bind(user.id).all();
    const items = await env.DB.prepare('SELECT favorite_items.* FROM favorite_items JOIN favorite_lists ON favorite_lists.id = favorite_items.list_id WHERE favorite_lists.user_id = ? ORDER BY favorite_items.position, favorite_items.saved_at').bind(user.id).all();
    const order = await env.DB.prepare('SELECT item_id FROM favorite_order WHERE user_id = ? ORDER BY position').bind(user.id).all();
    return json({lists: lists.results.map((list) => ({id: list.id, name: list.name, items: items.results.filter((item) => item.list_id === list.id).map(({list_id, ...item}) => ({...item, id: item.item_id}))})), order: order.results.map((item) => item.item_id)});
  }
  if (request.method === 'PUT') {
    const body = await request.json().catch(() => null);
    if (!Array.isArray(body?.lists) || !Array.isArray(body?.order)) return error('Favori verisi geçersiz.');
    const statements = [
      env.DB.prepare('DELETE FROM favorite_items WHERE list_id IN (SELECT id FROM favorite_lists WHERE user_id = ?)').bind(user.id),
      env.DB.prepare('DELETE FROM favorite_lists WHERE user_id = ?').bind(user.id),
      env.DB.prepare('DELETE FROM favorite_order WHERE user_id = ?').bind(user.id),
    ];
    body.lists.slice(0, 100).forEach((list, listIndex) => {
      const listId = String(list.id || randomId());
      statements.push(env.DB.prepare('INSERT INTO favorite_lists (id, user_id, name, position, created_at) VALUES (?, ?, ?, ?, ?)').bind(listId, user.id, String(list.name || 'Favorilerim').slice(0, 120), listIndex, Date.now()));
      (Array.isArray(list.items) ? list.items : []).slice(0, 1000).forEach((item, itemIndex) => {
        statements.push(env.DB.prepare('INSERT INTO favorite_items (list_id, item_id, section_id, section_title, location, title, text, html, saved_at, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(listId, String(item.id || randomId()), String(item.sectionId || ''), String(item.sectionTitle || ''), String(item.location || ''), String(item.title || ''), String(item.text || ''), String(item.html || ''), Number(item.savedAt || Date.now()), itemIndex));
      });
    });
    body.order.slice(0, 5000).forEach((itemId, position) => statements.push(env.DB.prepare('INSERT INTO favorite_order (user_id, item_id, position) VALUES (?, ?, ?)').bind(user.id, String(itemId), position)));
    await env.DB.batch(statements);
    return json({ok: true});
  }
  return error('İstek desteklenmiyor.', 405);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/auth/')) return (await auth(request, env, url.pathname)) || error('İstek bulunamadı.', 404);
    if (url.pathname === '/api/favorites') return favorites(request, env);
    if (url.pathname === '/api/health') return json({ok: true});
    return env.ASSETS.fetch(request);
  },
};
