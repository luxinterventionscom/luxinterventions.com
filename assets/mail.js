// Adresse email protégée contre les robots : elle n'apparaît pas en clair dans le HTML
// (écrite à l'envers dans data-m) et n'est reconstituée que dans le navigateur du visiteur.
(function () {
  var a = 'moc.snoitnevretnixul@ofni'.split('').reverse().join('');
  document.querySelectorAll('a[data-m]').forEach(function (el) {
    var s = el.getAttribute('data-s');
    el.href = 'mailto:' + a + (s ? '?subject=' + s : '');
  });
  document.querySelectorAll('.m-addr').forEach(function (t) { t.textContent = a; });
})();
