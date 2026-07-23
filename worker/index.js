const SESSION_COOKIE = 'mevzuat_session';
const APPLE_STATE_COOKIE = 'mevzuat_apple_state';
const APPLE_NONCE_COOKIE = 'mevzuat_apple_nonce';
const APPLE_RETURN_COOKIE = 'mevzuat_apple_return';
const ADMIN_EMAIL = 'gokhanyilmaz7@icloud.com';
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
  const row = await env.DB.prepare('SELECT users.id, users.email, users.apple_sub FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?').bind(tokenHash, Date.now()).first();
  return row ? {...row, isAdmin: isAdmin(row)} : null;
}

function isAdmin(user) {
  return Boolean(user?.apple_sub) && String(user.email).toLowerCase() === ADMIN_EMAIL;
}

function cookieHeader(name, value, maxAge = 600, sameSite = 'Lax') {
  return `${name}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=${sameSite}; Path=/; Max-Age=${maxAge}`;
}

function clearCookieHeader(name, sameSite = 'Lax') {
  return cookieHeader(name, '', 0, sameSite);
}

function base64UrlText(value) {
  return base64Url(encoder.encode(value));
}

function decodeText(value) {
  return new TextDecoder().decode(fromBase64Url(value));
}

function decodeJson(value) {
  return JSON.parse(decodeText(value));
}

function pemToBytes(pem) {
  const base64 = String(pem || '').replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function appleClientSecret(env) {
  if (!env.APPLE_TEAM_ID || !env.APPLE_KEY_ID || !env.APPLE_PRIVATE_KEY || !env.APPLE_CLIENT_ID) throw new Error('Apple giriş yapılandırması eksik.');
  const header = base64UrlText(JSON.stringify({alg: 'ES256', kid: env.APPLE_KEY_ID, typ: 'JWT'}));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlText(JSON.stringify({iss: env.APPLE_TEAM_ID, iat: now, exp: now + 86400 * 180, aud: 'https://appleid.apple.com', sub: env.APPLE_CLIENT_ID}));
  const signingInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey('pkcs8', pemToBytes(env.APPLE_PRIVATE_KEY), {name: 'ECDSA', namedCurve: 'P-256'}, false, ['sign']);
  const signature = await crypto.subtle.sign({name: 'ECDSA', hash: 'SHA-256'}, key, encoder.encode(signingInput));
  return `${signingInput}.${base64Url(new Uint8Array(signature))}`;
}

async function verifyAppleIdentityToken(idToken, env, nonce) {
  const [headerText, payloadText, signatureText] = String(idToken || '').split('.');
  if (!headerText || !payloadText || !signatureText) throw new Error('Apple kimlik belirteci geçersiz.');
  const header = decodeJson(headerText);
  const payload = decodeJson(payloadText);
  const keys = await fetch('https://appleid.apple.com/auth/keys').then((response) => response.json());
  const jwk = keys.keys?.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error('Apple doğrulama anahtarı bulunamadı.');
  const key = await crypto.subtle.importKey('jwk', jwk, {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256'}, false, ['verify']);
  const valid = await crypto.subtle.verify({name: 'RSASSA-PKCS1-v1_5'}, key, fromBase64Url(signatureText), encoder.encode(`${headerText}.${payloadText}`));
  const now = Math.floor(Date.now() / 1000);
  if (!valid || payload.iss !== 'https://appleid.apple.com' || payload.aud !== env.APPLE_CLIENT_ID || Number(payload.exp) <= now || payload.nonce !== nonce) throw new Error('Apple hesabı doğrulanamadı.');
  return payload;
}

async function appleAuth(request, env, pathname) {
  if (pathname === '/api/auth/apple/start' && request.method === 'GET') {
    if (!env.APPLE_CLIENT_ID || !env.APPLE_REDIRECT_URI) return error('Apple girişi henüz yapılandırılmadı.', 503);
    const state = randomId(24);
    const nonce = randomId(24);
    const returnTo = new URL(request.url).searchParams.get('returnTo') || '/admin.html';
    const safeReturnTo = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/admin.html';
    const params = new URLSearchParams({response_type: 'code', response_mode: 'form_post', client_id: env.APPLE_CLIENT_ID, redirect_uri: env.APPLE_REDIRECT_URI, scope: 'name email', state, nonce});
    const response = new Response(null, {status: 302, headers: {location: `https://appleid.apple.com/auth/authorize?${params}`}});
    response.headers.append('set-cookie', cookieHeader(APPLE_STATE_COOKIE, state, 600, 'None'));
    response.headers.append('set-cookie', cookieHeader(APPLE_NONCE_COOKIE, nonce, 600, 'None'));
    response.headers.append('set-cookie', cookieHeader(APPLE_RETURN_COOKIE, safeReturnTo, 600, 'None'));
    return response;
  }
  if (pathname === '/api/auth/apple/callback' && (request.method === 'POST' || request.method === 'GET')) {
    const input = request.method === 'POST' ? await request.formData() : new URL(request.url).searchParams;
    const state = String(input.get('state') || '');
    const code = String(input.get('code') || '');
    if (!state || state !== decodeURIComponent(cookie(request, APPLE_STATE_COOKIE))) return error('Apple oturum doğrulaması geçersiz.', 400);
    if (!code) return error('Apple yetkilendirme kodu alınamadı.', 400);
    try {
      const clientSecret = await appleClientSecret(env);
      const body = new URLSearchParams({client_id: env.APPLE_CLIENT_ID, client_secret: clientSecret, code, grant_type: 'authorization_code', redirect_uri: env.APPLE_REDIRECT_URI});
      const tokenResponse = await fetch('https://appleid.apple.com/auth/token', {method: 'POST', headers: {'content-type': 'application/x-www-form-urlencoded'}, body});
      const tokens = await tokenResponse.json();
      if (!tokenResponse.ok || !tokens.id_token) throw new Error('Apple token doğrulaması başarısız.');
      const identity = await verifyAppleIdentityToken(tokens.id_token, env, decodeURIComponent(cookie(request, APPLE_NONCE_COOKIE)));
      const email = String(identity.email || '').trim().toLowerCase();
      if (!email) throw new Error('Apple hesabından e-posta alınamadı.');
      let user = await env.DB.prepare('SELECT id, email, apple_sub FROM users WHERE apple_sub = ? OR email = ?').bind(identity.sub, email).first();
      if (!user) {
        user = {id: randomId(), email};
        await env.DB.prepare('INSERT INTO users (id, email, password_hash, apple_sub, created_at) VALUES (?, ?, ?, ?, ?)').bind(user.id, user.email, await passwordHash(randomId(32)), identity.sub, Date.now()).run();
      } else {
        await env.DB.prepare('UPDATE users SET email = ?, apple_sub = ? WHERE id = ?').bind(email, identity.sub, user.id).run();
      }
      const redirect = new URL(decodeURIComponent(cookie(request, APPLE_RETURN_COOKIE) || '/admin.html'), new URL(request.url).origin);
      const response = new Response(null, {status: 302, headers: {location: redirect.toString()}});
      response.headers.append('set-cookie', await createSession(user.id, env));
      response.headers.append('set-cookie', clearCookieHeader(APPLE_STATE_COOKIE, 'None'));
      response.headers.append('set-cookie', clearCookieHeader(APPLE_NONCE_COOKIE, 'None'));
      response.headers.append('set-cookie', clearCookieHeader(APPLE_RETURN_COOKIE, 'None'));
      return response;
    } catch (authError) {
      return error(authError.message || 'Apple ile giriş yapılamadı.', 401);
    }
  }
  return null;
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
    return user ? json({user: {id: user.id, email: user.email, isAdmin: user.isAdmin}}) : json({user: null});
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
        env.DB.prepare('DELETE FROM report_items WHERE user_id = ?').bind(user.id),
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

async function adminSummary(request, env) {
  const user = await currentUser(request, env);
  if (!user?.isAdmin) return error('Yönetici yetkisi gerekiyor.', 403);
  const [users, lists, reports] = await Promise.all([
    env.DB.prepare('SELECT id, email, apple_sub, created_at FROM users ORDER BY created_at DESC').all(),
    env.DB.prepare('SELECT COUNT(*) AS count FROM favorite_lists').first(),
    env.DB.prepare('SELECT COUNT(*) AS count FROM report_items').first(),
  ]);
  return json({user: {id: user.id, email: user.email, isAdmin: true}, counts: {users: Number(users.results.length), lists: Number(lists?.count || 0), reports: Number(reports?.count || 0)}, users: users.results.map((entry) => ({id: entry.id, email: entry.email, provider: entry.apple_sub ? 'Apple' : 'E-posta', createdAt: entry.created_at}))});
}

async function favorites(request, env) {
  const user = await currentUser(request, env);
  if (!user) return error('Oturum açmanız gerekiyor.', 401);
  if (request.method === 'GET') {
    const lists = await env.DB.prepare('SELECT id, name, position FROM favorite_lists WHERE user_id = ? ORDER BY position, created_at').bind(user.id).all();
    const items = await env.DB.prepare('SELECT favorite_items.* FROM favorite_items JOIN favorite_lists ON favorite_lists.id = favorite_items.list_id WHERE favorite_lists.user_id = ? ORDER BY favorite_items.position, favorite_items.saved_at').bind(user.id).all();
    const order = await env.DB.prepare('SELECT item_id FROM favorite_order WHERE user_id = ? ORDER BY position').bind(user.id).all();
    const reports = await env.DB.prepare('SELECT item_id, source_id, section_id, section_title, location, title, text, html, saved_at, position FROM report_items WHERE user_id = ? ORDER BY position, saved_at').bind(user.id).all();
    const formatItem = ({list_id, item_id, source_id, section_id, section_title, saved_at, ...item}) => ({...item, id: item_id, sourceId: source_id || item_id, sectionId: section_id, sectionTitle: section_title, savedAt: saved_at});
    return json({lists: lists.results.map((list) => ({id: list.id, name: list.name, items: items.results.filter((item) => item.list_id === list.id).map(formatItem)})), order: order.results.map((item) => item.item_id), reports: reports.results.map(formatItem)});
  }
  if (request.method === 'PUT') {
    const body = await request.json().catch(() => null);
    if (!Array.isArray(body?.lists) || !Array.isArray(body?.order)) return error('Favori verisi geçersiz.');
    const statements = [
      env.DB.prepare('DELETE FROM favorite_items WHERE list_id IN (SELECT id FROM favorite_lists WHERE user_id = ?)').bind(user.id),
      env.DB.prepare('DELETE FROM favorite_lists WHERE user_id = ?').bind(user.id),
      env.DB.prepare('DELETE FROM favorite_order WHERE user_id = ?').bind(user.id),
      env.DB.prepare('DELETE FROM report_items WHERE user_id = ?').bind(user.id),
    ];
    body.lists.slice(0, 100).forEach((list, listIndex) => {
      const listId = String(list.id || randomId());
      statements.push(env.DB.prepare('INSERT INTO favorite_lists (id, user_id, name, position, created_at) VALUES (?, ?, ?, ?, ?)').bind(listId, user.id, String(list.name || 'Favorilerim').slice(0, 120), listIndex, Date.now()));
      (Array.isArray(list.items) ? list.items : []).slice(0, 1000).forEach((item, itemIndex) => {
        statements.push(env.DB.prepare('INSERT INTO favorite_items (list_id, item_id, section_id, section_title, location, title, text, html, saved_at, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(listId, String(item.id || randomId()), String(item.sectionId || ''), String(item.sectionTitle || ''), String(item.location || ''), String(item.title || ''), String(item.text || ''), String(item.html || ''), Number(item.savedAt || Date.now()), itemIndex));
      });
    });
    body.order.slice(0, 5000).forEach((itemId, position) => statements.push(env.DB.prepare('INSERT INTO favorite_order (user_id, item_id, position) VALUES (?, ?, ?)').bind(user.id, String(itemId), position)));
    (Array.isArray(body.reports) ? body.reports : []).slice(0, 5000).forEach((item, position) => statements.push(env.DB.prepare('INSERT INTO report_items (user_id, item_id, source_id, section_id, section_title, location, title, text, html, saved_at, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(user.id, String(item.id || randomId()), String(item.sourceId || item.id || ''), String(item.sectionId || ''), String(item.sectionTitle || ''), String(item.location || ''), String(item.title || ''), String(item.text || ''), String(item.html || ''), Number(item.savedAt || Date.now()), position)));
    await env.DB.batch(statements);
    return json({ok: true});
  }
  return error('İstek desteklenmiyor.', 405);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/auth/apple/')) return (await appleAuth(request, env, url.pathname)) || error('İstek bulunamadı.', 404);
    if (url.pathname.startsWith('/api/auth/')) return (await auth(request, env, url.pathname)) || error('İstek bulunamadı.', 404);
    if (url.pathname === '/api/admin/summary' && request.method === 'GET') return adminSummary(request, env);
    if (url.pathname === '/api/favorites') return favorites(request, env);
    if (url.pathname === '/api/health') return json({ok: true});
    if (url.pathname === '/noksanlik-raporu.html') return new Response('Not Found', {status: 404});
    if (url.pathname === '/admin.html' || url.pathname === '/admin' || url.pathname === '/admin/') {
      const user = await currentUser(request, env);
      if (!user?.isAdmin) return new Response('Not Found', {status: 404});
    }
    return env.ASSETS.fetch(request);
  },
};
