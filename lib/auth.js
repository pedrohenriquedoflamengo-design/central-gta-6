import { createRemoteJWKSet, jwtVerify } from 'jose';

const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
export const SESSION_COOKIE = '__Host-gta_session';
export const NONCE_COOKIE = '__Host-gta_login_nonce';
export const now = () => Math.floor(Date.now() / 1000);
export function cookies(request) {
  const result = {};
  for (const part of (request.headers.get('Cookie') || '').split(';')) {
    const at = part.indexOf('=');
    if (at > 0) result[part.slice(0, at).trim()] = part.slice(at + 1).trim();
  }
  return result;
}
export function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function hashToken(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
}
export function cookie(name, value, maxAge, sameSite = 'Lax') {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=${sameSite}; Max-Age=${maxAge}`;
}
export async function verifyGoogle(token, audience, nonce, keys = googleKeys) {
  if (!audience || !nonce || typeof token !== 'string' || token.length > 12000) throw new Error('Invalid credentials');
  const { payload } = await jwtVerify(token, keys, {
    algorithms: ['RS256'], audience,
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    requiredClaims: ['sub', 'iat', 'exp', 'nonce'], maxTokenAge: '1h',
  });
  if (payload.nonce !== nonce || typeof payload.sub !== 'string' || payload.sub.length > 255) throw new Error('Invalid identity');
  return payload;
}
export async function isAdmin(user, env) {
  if (!user) return false;
  // Compare only the server-verified identity, never nickname or client input.
  if (env.ADMIN_GOOGLE_SUB_SHA256) {
    return /^[a-f0-9]{64}$/.test(env.ADMIN_GOOGLE_SUB_SHA256) &&
      await hashToken(`central-gta6:admin:${user.google_sub}`) === env.ADMIN_GOOGLE_SUB_SHA256;
  }
  return !!env.ADMIN_GOOGLE_SUB && user.google_sub === env.ADMIN_GOOGLE_SUB;
}
export async function publicUser(user, env) {
  return { id: user.id, nickname: user.nickname, admin: await isAdmin(user, env), accountId: user.google_sub };
}
