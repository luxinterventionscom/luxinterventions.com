// Chiffrement côté navigateur — rien ne quitte l'appareil en clair.
//
// Clé d'accès ──PBKDF2-SHA256 (600 000 it.)──► secret maître ──HKDF──┬─► KEK (AES-256-GCM, protège la clé de données)
//                                                                    └─► jeton d'authentification (le serveur n'en garde que le SHA-256)
// Clé de données (DEK, aléatoire) ──AES-256-GCM──► base de données, documents

const enc = new TextEncoder();
const dec = new TextDecoder();
export const PBKDF2_ITER = 600000;
const FORMAT = 1;

export const b64 = {
  encode(bytes) {
    let s = '';
    const u = new Uint8Array(bytes);
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  },
  decode(str) {
    const s = atob(str);
    const u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return u;
  },
};

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
export const randomBytes = (n) => crypto.getRandomValues(new Uint8Array(n));

export async function deriveFromPassphrase(passphrase, saltB64, iter) {
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase.normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
  const master = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: b64.decode(saltB64), iterations: iter },
    base,
    256
  );
  const hk = await crypto.subtle.importKey('raw', master, 'HKDF', false, ['deriveKey', 'deriveBits']);
  const salt = new Uint8Array(0);
  const kek = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('ares-kek-v1') },
    hk,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  );
  const authBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('ares-auth-v1') }, hk, 256);
  const authToken = hex(authBits);
  const authHash = hex(await crypto.subtle.digest('SHA-256', enc.encode(authToken)));
  return { kek, authToken, authHash };
}

export async function newDataKey() {
  // Extractible uniquement pour être enveloppée par la KEK, puis réimportée non extractible.
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function wrapDataKey(dek, kek) {
  const iv = randomBytes(12);
  const wrapped = await crypto.subtle.wrapKey('raw', dek, kek, { name: 'AES-GCM', iv, additionalData: enc.encode('ares-dek') });
  const out = new Uint8Array(12 + wrapped.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(wrapped), 12);
  return b64.encode(out);
}

export async function unwrapDataKey(wrappedB64, kek, extractable = false) {
  const raw = b64.decode(wrappedB64);
  return crypto.subtle.unwrapKey(
    'raw',
    raw.slice(12),
    kek,
    { name: 'AES-GCM', iv: raw.slice(0, 12), additionalData: enc.encode('ares-dek') },
    { name: 'AES-GCM', length: 256 },
    extractable,
    ['encrypt', 'decrypt']
  );
}

async function gzip(bytes) {
  if (typeof CompressionStream === 'undefined') return { bytes, z: 0 };
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
  return { bytes: new Uint8Array(await new Response(stream).arrayBuffer()), z: 1 };
}

async function gunzip(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// Format : [version][compressé?][iv 12 octets][texte chiffré + tag]
export async function encryptBytes(dek, bytes, label) {
  const { bytes: payload, z } = await gzip(bytes);
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(label) }, dek, payload);
  const out = new Uint8Array(14 + ct.byteLength);
  out[0] = FORMAT;
  out[1] = z;
  out.set(iv, 2);
  out.set(new Uint8Array(ct), 14);
  return out;
}

export async function decryptBytes(dek, data, label) {
  const u = new Uint8Array(data);
  if (u[0] !== FORMAT) throw new Error('Format inconnu');
  const pt = new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(2, 14), additionalData: enc.encode(label) }, dek, u.slice(14))
  );
  return u[1] ? gunzip(pt) : pt;
}

export const encryptJson = (dek, obj, label) => encryptBytes(dek, enc.encode(JSON.stringify(obj)), label);
export const decryptJson = async (dek, data, label) => JSON.parse(dec.decode(await decryptBytes(dek, data, label)));

export function passphraseStrength(p) {
  if (!p) return 0;
  let classes = 0;
  if (/[a-z]/.test(p)) classes++;
  if (/[A-Z]/.test(p)) classes++;
  if (/[0-9]/.test(p)) classes++;
  if (/[^a-zA-Z0-9]/.test(p)) classes++;
  const words = p.trim().split(/[\s\-_.]+/).filter(Boolean).length;
  let score = 0;
  if (p.length >= 12) score++;
  if (p.length >= 16) score++;
  if (classes >= 3 || words >= 4) score++;
  if (p.length >= 20 && (classes >= 2 || words >= 4)) score++;
  return Math.min(score, 4);
}
