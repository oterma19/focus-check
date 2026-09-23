// ============================================================
// pwa.js — «установка» на телефон (иконка на главном экране,
// отдельное окно, работа без интернета).
//
// Включается ТОЛЬКО по адресу http(s)://. При открытии файла
// двойным кликом (file://) браузер всё равно не позволил бы это,
// поэтому здесь просто ничего не делаем — без ошибок в консоли.
// ============================================================

(function setupPwa() {
  if (!/^https?:$/.test(location.protocol)) return;

  const manifest = document.createElement('link');
  manifest.rel = 'manifest';
  manifest.href = 'manifest.webmanifest';
  document.head.appendChild(manifest);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Офлайн-режим недоступен:', err));
    });
  }
})();
