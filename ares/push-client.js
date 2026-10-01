// Notifications des apps (gestion, locataires, équipe) : abonnement push et numéro sur l'icône (badge).
// Le serveur ne reçoit que l'adresse d'abonnement du téléphone ; les notifications disent seulement « il y a du nouveau ».
const fromB64u = (b) => Uint8Array.from(atob(b.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b.length % 4)) % 4)), (c) => c.charCodeAt(0));
export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined' && window.isSecureContext;
export const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
// 'on' | 'off' | 'denied' | 'unsupported' | 'install' (iPhone : il faut d'abord l'icône sur l'écran d'accueil)
export async function pushStatus(scope) {
  if (isIos() && !isStandalone()) return 'install';
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const reg = await navigator.serviceWorker.getRegistration(scope);
    const sub = reg && (await reg.pushManager.getSubscription());
    return sub && Notification.permission === 'granted' ? 'on' : 'off';
  } catch { return 'off'; }
}
// Demande l'autorisation (à appeler après un toucher), s'abonne et envoie l'abonnement avec post()
export async function pushEnable({ api, swUrl, scope, post }) {
  if (!pushSupported()) throw new Error('unsupported');
  if (Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') return false;
  const reg = (await navigator.serviceWorker.getRegistration(scope)) || (await navigator.serviceWorker.register(swUrl, { scope }));
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const r = await fetch(api + '/api/esp-push/key', { cache: 'no-store' });
    if (!r.ok) throw new Error('push ' + r.status);
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64u((await r.json()).key) });
  }
  const j = sub.toJSON();
  await post({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth });
  return true;
}
// Abonnement déjà accepté : on le renvoie (langue, fil de discussion…) sans rien demander
export async function pushRefresh(scope, post) {
  try {
    if (!pushSupported() || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker.getRegistration(scope);
    const sub = reg && (await reg.pushManager.getSubscription());
    if (!sub) return;
    const j = sub.toJSON();
    await post({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth });
  } catch { /* hors ligne */ }
}
// Numéro sur l'icône : 0 l'efface (app ouverte = tout est vu)
export function setBadge(n, scope) {
  try { if (n > 0 && navigator.setAppBadge) navigator.setAppBadge(n).catch(() => {}); else if (navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {}); } catch { /* non pris en charge */ }
  try { if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistration(scope).then((r) => { if (r && r.active) r.active.postMessage({ badge: Math.max(0, n | 0) }); }).catch(() => {}); } catch { /* idem */ }
}
