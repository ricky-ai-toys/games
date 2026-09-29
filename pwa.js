/* Amber's Games — PWA registration + service worker
 * Include once per page. Safe no-op if SW unsupported.
 */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;

  /* The service worker lives at the site root, but a folder game
   * (farm/index.html, shark/index.html, ...) resolves "./sw.js" against its own
   * directory and 404s. Try the root first so the common case never issues a
   * failing request, then fall back to a folder-local sw.js in case a game ever
   * ships its own. Root-level pages get the same single candidate as before. */
  function register() {
    var path = location.pathname;
    var inFolder = path.replace(/[^/]*$/, '');
    var root = inFolder.replace(/^(.*\/)[^/]+\/$/, '$1');
    var candidates = [];
    if (root) candidates.push(root + 'sw.js');
    if (inFolder && inFolder !== root) candidates.push(inFolder + 'sw.js');
    if (!candidates.length) candidates.push('./sw.js');

    var i = 0;
    (function next() {
      if (i >= candidates.length) return;
      var url = candidates[i++];
      navigator.serviceWorker.register(url, { scope: root || './' })['catch'](function () { next(); });
    })();
  }

  window.addEventListener('load', register);

  // expose install prompt handling for any page that wants it
  window.__amberBeforeInstall = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.__amberBeforeInstall = e;
  });
})();
