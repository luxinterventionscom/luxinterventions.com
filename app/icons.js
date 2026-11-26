// Icônes au trait (24×24), les mêmes sur tous les téléphones (à la place des émojis) — couleur = currentColor
const P = {
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  roof: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
  leaf: '<path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15"/><path d="M5 19l7-7"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  build: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/>',
  drop: '<path d="M12 3c4 5 6 8 6 11a6 6 0 01-12 0c0-3 2-6 6-11z"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  truck: '<path d="M2 6h12v10H2zM14 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  wrench: '<path d="M14 6a4 4 0 005 5l-9 9a2 2 0 01-3-3z"/>',
  broom: '<path d="M14 3l-4 9M6 13h8l2 8H4z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
  home: '<path d="M3 11l9-7 9 7v9H3z"/>',
  list: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  scale: '<path d="M12 3v18M6 21h12M4 7h16M7 7l-3 7h6zM17 7l-3 7h6z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  phone: '<path d="M5 3h4l2 5-3 2a11 11 0 006 6l2-3 5 2v4a2 2 0 01-2 2C10 21 3 14 3 5a2 2 0 012-2z"/>',
  camera: '<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 7l2-3h4l2 3"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
  palette: '<path d="M12 3a9 9 0 100 18c1.5 0 2-1 2-2s-1-1.5-1-2.5S14 15 15 15h2a4 4 0 004-4c0-4.5-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
};
export const ic = (k, s = 22) => `<svg class="ico" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[k] || P.plus}</svg>`;
// icône de chaque service (clé du service → icône)
export const SVC_IC = { rapport: 'chart', toiture: 'roof', jardin: 'leaf', etanch: 'shield', renov: 'build', serr: 'key', plomb: 'drop', elec: 'bolt', dechets: 'trash', demen: 'truck', brico: 'wrench', nett: 'broom', solaire: 'sun', autre: 'plus' };
