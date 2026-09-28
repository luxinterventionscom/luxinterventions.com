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
