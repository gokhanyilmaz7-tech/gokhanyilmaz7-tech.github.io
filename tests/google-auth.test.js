import {test} from 'node:test';
import assert from 'node:assert/strict';
import {googleAuth, safeReturn, verifyGoogleToken} from '../worker/google-auth.js';
import worker from '../worker/index.js';
const origin = 'https://www.isg-mevzuat-rehberi.com.tr';
const env = {GOOGLE_CLIENT_ID: 'test', GOOGLE_CLIENT_SECRET: 'gizli', GOOGLE_REDIRECT_URI: `${origin}/api/auth/google/callback`};
const helpers = {randomId: () => crypto.randomUUID()};
test('Dış adrese yönlendirmeler engellenir', () => {
  for (const value of ['//example.com', '/\\example.com', 'https://example.com', '/\n/example.com']) assert.equal(safeReturn(value, origin), '/');
  assert.equal(safeReturn('/hukumler.html?q=test', origin), '/hukumler.html?q=test');
});
test('Eksik yapılandırma anlaşılır hata döndürür', async () => {
  const response = await googleAuth(new Request(`${origin}/api/auth/google/start`), {}, helpers);
  assert.equal(response.status, 503);
});
test('Giriş başlangıcı state ve nonce çerezlerini üretir', async () => {
  const response = await googleAuth(new Request(`${origin}/api/auth/google/start?format=json&returnTo=/hukumler.html`), env, helpers);
  const url = new URL((await response.json()).url);
  assert.equal(url.origin, 'https://accounts.google.com');
  assert.equal(url.searchParams.get('scope'), 'openid email');
  assert.ok(url.searchParams.get('nonce'));
  assert.match(response.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Lax/);
});
test('Hatalı state oturum oluşturamaz ve çerezler temizlenir', async () => {
  const response = await googleAuth(new Request(`${origin}/api/auth/google/callback?state=yanlis&code=kod`), env, helpers);
  assert.equal(response.headers.get('location'), `${origin}/?auth_error=google`);
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
});
test('Eski kayıt ve şifreyle giriş uçları kapalıdır', async () => {
  for (const path of ['login', 'register']) assert.equal((await worker.fetch(new Request(`${origin}/api/auth/${path}`, {method: 'POST'}), {})).status, 410);
});
test('Google belirtecinin imzası ve kimlik alanları doğrulanır', async () => {
  const pair = await crypto.subtle.generateKey({name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256'}, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({keys: [{...jwk, kid: 'test', alg: 'RS256'}]});
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const claims = {iss: 'https://accounts.google.com', aud: 'test', sub: '123', nonce: 'nonce', email: 'test@gmail.com', email_verified: true, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+600};
  const token = async payload => {
    const input = `${encode({alg: 'RS256', kid: 'test'})}.${encode(payload)}`;
    return `${input}.${Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(input))).toString('base64url')}`;
  };
  try {
    assert.equal((await verifyGoogleToken(await token(claims), 'test', 'nonce')).sub, '123');
    for (const changes of [{aud: 'baska'}, {nonce: 'baska'}, {exp: 0}, {email_verified: false}, {iss: 'https://example.com'}]) await assert.rejects(verifyGoogleToken(await token({...claims, ...changes}), 'test', 'nonce'));
    const valid = await token(claims);
    await assert.rejects(verifyGoogleToken(valid.slice(0, valid.lastIndexOf('.')+1)+'AAAA', 'test', 'nonce'));
  } finally { globalThis.fetch = originalFetch; }
});
