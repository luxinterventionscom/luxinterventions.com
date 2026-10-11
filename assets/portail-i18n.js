// Section « Portail Syndic / Gérance » de la page d'accueil : le site reste en français ;
// seul le bouton « Guide (PDF) » ouvre le guide du portail (un seul PDF, 6 langues) à la page de la langue du navigateur.
(function () {
  const PAGE = { it: 2, fr: 5, de: 8, en: 11, pt: 14, es: 17 };
  const g = document.querySelector('#portail .ptl-guide');
  if (!g) return;
  const n = (navigator.language || '').slice(0, 2).toLowerCase();
  g.href = '/guides/portail-guide.pdf#page=' + (PAGE[n] || PAGE.fr);
})();
