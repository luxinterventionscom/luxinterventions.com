// Marque les champs des formulaires, dans toutes les apps :
//  * rouge  = champ obligatoire
//  « 123 » = seulement des chiffres
// Automatique : chaque fois qu'un formulaire apparaît, les étiquettes sont complétées (une seule fois).
const NUM = (el) => el.type === 'number' || ['numeric', 'decimal'].includes(el.getAttribute('inputmode')) || el.closest('.code6');
function mark(label) {
  if (label.dataset.rq) return;
  const ctl = label.control || label.querySelector('input:not([type=hidden]), select, textarea');
  if (!ctl || ctl.type === 'checkbox' || ctl.type === 'radio') return;
  const req = ctl.required, num = NUM(ctl);
  if (!req && !num) return;
  label.dataset.rq = '1';
  // juste après le texte de l'étiquette
  let txt = null;
  for (const n of label.childNodes) { if (n.nodeType === 3 && n.nodeValue.trim()) { txt = n; break; } if (n.nodeType === 1 && !n.matches('input, select, textarea, .code6') && n.textContent.trim()) { txt = n; break; } }
  const frag = document.createDocumentFragment();
  if (req) { const s = document.createElement('span'); s.className = 'rq-star'; s.textContent = ' *'; s.setAttribute('aria-hidden', 'true'); frag.appendChild(s); }
  if (num) { const s = document.createElement('span'); s.className = 'rq-num'; s.textContent = '123'; s.title = '0–9'; frag.appendChild(s); }
  // le texte et ses marques restent ensemble sur la même ligne (les étiquettes sont souvent en colonne)
  const w = document.createElement('span'); w.className = 'rq-lbl';
  if (txt) { txt.before(w); w.appendChild(txt); } else label.prepend(w);
  w.appendChild(frag);
}
function scan(root) { (root.querySelectorAll ? root : document).querySelectorAll('label').forEach(mark); }
const st = document.createElement('style');
st.textContent = '.rq-lbl{display:inline;align-self:flex-start}.rq-star{color:#dc2626;font-weight:800}.rq-num{display:inline-block;margin-left:6px;padding:0 5px;border-radius:5px;font:700 10px/16px ui-monospace,monospace;letter-spacing:.04em;color:#2563eb;background:rgba(37,99,235,.1);vertical-align:1px}';
document.head.appendChild(st);
let queued = false;
new MutationObserver(() => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; scan(document); }); }).observe(document.documentElement, { childList: true, subtree: true });
scan(document);
