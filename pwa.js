/* Amber's Games — PWA registration + service worker
 * Include once per page. Safe no-op if SW unsupported.
 */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(function () {});
  });
  // expose install prompt handling for any page that wants it
  window.__amberBeforeInstall = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.__amberBeforeInstall = e;
  });
})();
