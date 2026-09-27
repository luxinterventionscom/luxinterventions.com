// Adresse email protégée contre les robots.
// Elle n'est écrite nulle part en clair (ni dans le HTML, ni ici) : elle est chiffrée ci-dessous
// et n'est reconstituée qu'après un vrai clic d'un visiteur (event.isTrusted).
(function () {
  var ENC = '33343c351a362f2233342e3f282c3f342e3335342974393537';
  var decode = function () {
    var out = '';
    for (var i = 0; i < ENC.length; i += 2) out += String.fromCharCode(parseInt(ENC.substr(i, 2), 16) ^ 0x5a);
    return out;
  };
  var shown = false;
  function reveal() {
    var a = decode();
    document.querySelectorAll('.m-addr').forEach(function (t) { t.textContent = a; });
    document.querySelectorAll('a[data-m]').forEach(function (el) {
      var s = el.getAttribute('data-s');
      el.href = 'mailto:' + a + (s ? '?subject=' + s : '');
      el.removeAttribute('title');
    });
    shown = true;
  }
  document.querySelectorAll('a[data-m]').forEach(function (el) {
    el.title = 'Cliquez pour afficher l’adresse email';
    el.addEventListener('click', function (e) {
      if (shown) return; // 2e clic : ouvre la messagerie normalement
      e.preventDefault();
      if (e.isTrusted) reveal();
    });
  });
  // Formulaires : l'email est préparé seulement quand le visiteur envoie sa demande
  window.luxMailto = function (query) { window.location.href = 'mailto:' + decode() + query; };
})();
