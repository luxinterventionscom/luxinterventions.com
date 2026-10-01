// Section « Portail Syndic / Gérance » de la page d'accueil : le site reste en français ;
// seul le bouton « Guide (PDF) » ouvre le guide du portail dans la langue du navigateur.
(function () {
  const GUIDES = { fr: 'portail-guide-fr.pdf', de: 'portail-anleitung-de.pdf', en: 'portail-guide-en.pdf', pt: 'portail-guia-pt.pdf', es: 'portail-guia-es.pdf', it: 'portail-guida-it.pdf' };
  const g = document.querySelector('#portail .ptl-guide');
  if (!g) return;
  const n = (navigator.language || '').slice(0, 2).toLowerCase();
  if (GUIDES[n]) g.href = '/guides/' + GUIDES[n];
})();
