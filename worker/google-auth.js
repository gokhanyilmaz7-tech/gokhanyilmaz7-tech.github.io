const PREFIX = 'mevzuat_google_';
const encoder = new TextEncoder();
const base64 = (value) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const decode = (value) => JSON.parse(new TextDecoder().decode(base64(value)));
const json = (body, status = 200) => new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'}});
function readCookie(request, name) {
  const value = (request.headers.get('cookie') || '').split(';').map(p => p.trim()).find(p => p.startsWith(`${PREFIX}${name}=`));
  try { return decodeURIComponent(value?.slice(value.indexOf('=') + 1) || ''); } catch { return ''; }
}
function setCookie(response, name, value, age = 600) {
  response.headers.append('set-cookie', `${PREFIX}${name}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${age}`);
}
export function safeReturn(value, origin) {
  try {
    if (!value?.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/';
    const url = new URL(value, origin);
    return url.origin === origin ? url.pathname + url.search : '/';
  } catch { return '/'; }
}
export async function verifyGoogleToken(token, clientId, nonce) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3 || !nonce) throw new Error('Google kimliği doğrulanamadı.');
  const header = decode(parts[0]);
  const payload = decode(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  if (header.alg !== 'RS256' || !header.kid || !['https://accounts.google.com', 'accounts.google.com'].includes(payload.iss) || payload.aud !== clientId || (payload.azp && payload.azp !== clientId) || !Number.isFinite(payload.exp) || payload.exp <= now || !Number.isFinite(payload.iat) || payload.iat > now + 60 || payload.nonce !== nonce || typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 255 || payload.email_verified !== true || typeof payload.email !== 'string' || !payload.email.includes('@')) throw new Error('Google kimliği doğrulanamadı.');
  const response = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if (!response.ok) throw new Error('Google doğrulama servisine ulaşılamadı.');
  const keys = await response.json();
  const jwk = keys.keys?.find(key => key.kid === header.kid && key.kty === 'RSA' && key.alg === 'RS256');
  if (!jwk) throw new Error('Google doğrulama anahtarı bulunamadı.');
  const key = await crypto.subtle.importKey('jwk', jwk, {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256'}, false, ['verify']);
  if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, base64(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`))) throw new Error('Google kimliği doğrulanamadı.');
  return payload;
}
export async function googleAuth(request, env, {createSession, passwordHash, randomId}) {
  const url = new URL(request.url);
  if (request.method !== 'GET' || !['/api/auth/google/start', '/api/auth/google/callback'].includes(url.pathname)) return json({error: 'İstek bulunamadı.'}, 404);
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) return json({error: 'Google girişi henüz yapılandırılmadı.'}, 503);
  const origin = new URL(env.GOOGLE_REDIRECT_URI).origin;
  if (url.pathname.endsWith('/start')) {
    const returnTo = safeReturn(url.searchParams.get('returnTo'), origin);
    if (url.origin !== origin) {
      const target = new URL('/api/auth/google/start', origin);
      target.searchParams.set('returnTo', returnTo);
      return url.searchParams.get('format') === 'json' ? json({url: target.href}) : Response.redirect(target.href, 302);
    }
    const state = randomId(24), nonce = randomId(24);
    const params = new URLSearchParams({client_id: env.GOOGLE_CLIENT_ID, redirect_uri: env.GOOGLE_REDIRECT_URI, response_type: 'code', scope: 'openid email', state, nonce, prompt: 'select_account'});
    const target = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    const response = url.searchParams.get('format') === 'json' ? json({url: target}) : new Response(null, {status: 302, headers: {location: target, 'cache-control': 'no-store'}});
    for (const [name, value] of Object.entries({state, nonce, return: returnTo})) setCookie(response, name, value);
    return response;
  }
  const finish = (path, session) => {
    const response = new Response(null, {status: 302, headers: {location: new URL(path, origin).href, 'cache-control': 'no-store'}});
    for (const name of ['state', 'nonce', 'return']) setCookie(response, name, '', 0);
    if (session) response.headers.append('set-cookie', session);
    return response;
  };
  if (url.origin !== origin || !url.searchParams.get('state') || url.searchParams.get('state') !== readCookie(request, 'state') || !readCookie(request, 'nonce')) return finish('/?auth_error=google');
  if (url.searchParams.get('error')) return finish('/?auth_error=google_cancelled');
  if (!url.searchParams.get('code')) return finish('/?auth_error=google');
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {method: 'POST', headers: {'content-type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams({client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: env.GOOGLE_REDIRECT_URI, grant_type: 'authorization_code', code: url.searchParams.get('code')})});
    const tokens = await response.json();
    if (!response.ok) throw new Error('Google yetkilendirmesi başarısız.');
    const identity = await verifyGoogleToken(tokens.id_token, env.GOOGLE_CLIENT_ID, readCookie(request, 'nonce'));
    const email = identity.email.trim().toLowerCase();
    let user = await env.DB.prepare('SELECT id, email, google_sub, apple_sub, is_approved FROM users WHERE google_sub = ?').bind(identity.sub).first();
    if (!user) {
      const existing = await env.DB.prepare('SELECT id, email, google_sub, apple_sub, is_approved FROM users WHERE email = ?').bind(email).first();
      // Apple hesapları ve Google'ın sahipliğini doğrulamadığı harici adresler otomatik birleştirilmez.
      if (existing && (existing.apple_sub || existing.google_sub || !(email.endsWith('@gmail.com') || identity.hd))) return finish('/?auth_error=google_link');
      if (existing) {
        const linked = await env.DB.prepare('UPDATE users SET google_sub = ? WHERE id = ? AND google_sub IS NULL AND apple_sub IS NULL').bind(identity.sub, existing.id).run();
        if (linked.meta?.changes !== 1) return finish('/?auth_error=google_link');
        user = existing;
      } else {
        user = {id: randomId(), email, is_approved: 0};
        await env.DB.prepare('INSERT INTO users (id, email, password_hash, google_sub, created_at, is_approved) VALUES (?, ?, ?, ?, ?, 0)').bind(user.id, email, await passwordHash(randomId(32)), identity.sub, Date.now()).run();
      }
    }
    if (!user.is_approved) return finish('/?auth_error=pending');
    return finish(safeReturn(readCookie(request, 'return'), origin), await createSession(user.id, env, request));
  } catch {
    return finish('/?auth_error=google');
  }
}
