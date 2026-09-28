// Chiffrement de l'espace locataire (partagé entre l'app Ares et la page du locataire).
// - Contenu de l'espace et documents : AES-256-GCM avec une clé qui n'existe que dans le lien du
//   locataire (après le #) → le serveur ne voit que des octets illisibles.
// - Signalements du locataire : chiffrés avec la clé publique du gestionnaire (ECDH P-256 éphémère
//   + AES-256-GCM) → seul le gestionnaire, dans Ares, peut les lire.
const te = new TextEncoder();
const td = new TextDecoder();

export const b64u = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const unb64u = (s) => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(s).length + 3) % 4)), (c) => c.charCodeAt(0));
const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };

export const newEspaceKey = () => b64u(crypto.getRandomValues(new Uint8Array(32)));
export const newEspaceId = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');

const aes = (raw) => crypto.subtle.importKey('raw', typeof raw === 'string' ? unb64u(raw) : raw, 'AES-GCM', false, ['encrypt', 'decrypt']);

export async function sealBytes(key, bytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return cat(iv, new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aes(key), bytes)));
}
export async function openBytes(key, data) {
  const u = new Uint8Array(data);
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, await aes(key), u.slice(12)));
}
export const sealJson = (key, obj) => sealBytes(key, te.encode(JSON.stringify(obj)));
export const openJson = async (key, data) => JSON.parse(td.decode(await openBytes(key, data)));

// Code d'accès court (ex. K7PM2-QXA4H) donné par le gestionnaire : l'app installée n'a pas le lien.
// Le serveur ne connaît que l'empreinte du code ; la clé de l'espace est enveloppée par une clé
// dérivée du code (PBKDF2), donc illisible sans le code (et les essais sont limités).
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newAccessCode = () => { const r = crypto.getRandomValues(new Uint8Array(10)); const s = [...r].map((b) => ALPHA[b % 32]).join(''); return s.slice(0, 5) + '-' + s.slice(5); };
export const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export async function codeHash(code) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', te.encode('ares-esp:' + normCode(code))))].map((b) => b.toString(16).padStart(2, '0')).join(''); }
async function codeKey(code, salt) {
  const base = await crypto.subtle.importKey('raw', te.encode(normCode(code)), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 150000 }, base, 256));
}
export async function wrapWithCode(code, espaceKey) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: b64u(salt), wk: b64u(await sealBytes(await codeKey(code, salt), te.encode(espaceKey))) };
}
export async function unwrapWithCode(code, salt, wk) { return td.decode(await openBytes(await codeKey(code, unb64u(salt)), unb64u(wk))); }

// Clés du gestionnaire pour les signalements
export async function newOwnerKeys() {
  const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  return { pub: b64u(await crypto.subtle.exportKey('raw', kp.publicKey)), priv: await crypto.subtle.exportKey('jwk', kp.privateKey) };
}
const sharedKey = async (priv, pub) => new Uint8Array(await crypto.subtle.digest('SHA-256', await crypto.subtle.deriveBits({ name: 'ECDH', public: pub }, priv, 256)));
export async function sealForOwner(ownerPub, obj) {
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const pub = await crypto.subtle.importKey('raw', unb64u(ownerPub), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const k = await sharedKey(eph.privateKey, pub);
  return cat(new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey)), await sealBytes(k, te.encode(JSON.stringify(obj))));
}
export async function openFromTenant(ownerPrivJwk, data) {
  const u = new Uint8Array(data);
  const priv = await crypto.subtle.importKey('jwk', ownerPrivJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const eph = await crypto.subtle.importKey('raw', u.slice(0, 65), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  return JSON.parse(td.decode(await openBytes(await sharedKey(priv, eph), u.slice(65))));
}
