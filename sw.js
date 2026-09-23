// ============================================================
// sw.js — «сервис-воркер»: позволяет приложению открываться на
// телефоне даже без интернета. Работает только когда приложение
// открыто по адресу https:// (например, с GitHub Pages).
// При открытии файла с компьютера (file://) не используется.
//
// Схема «сначала сеть»: есть интернет — берём свежие файлы и
// обновляем копию; нет интернета — берём сохранённую копию.
// Ваши данные (задачи и т.д.) здесь НЕ хранятся — они в памяти браузера.
// ============================================================

const CACHE = 'focus-check-v3';

const FILES = [
  './',
  './focus-check.html',
  './styles.css',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/config.js',
  './js/utils.js',
  './js/content.js',
  './js/data.js',
  './js/auth.js',
  './js/store.js',
  './js/models.js',
  './js/ui.js',
  './js/reminders.js',
  './js/screens/today.js',
  './js/screens/elephant.js',
  './js/screens/focus.js',
  './js/screens/routine.js',
  './js/screens/progress.js',
  './js/screens/settings.js',
  './js/flows/rescue.js',
  './js/flows/onboarding.js',
  './js/pwa.js',
  './js/app.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  // Трогаем только свои файлы (не Supabase, не Google).
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }))
  );
});

// Нажатие на напоминание: открыть приложение и показать задачу.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const taskId = event.notification.data && event.notification.data.taskId;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      if (list.length) {
        list[0].postMessage({ type: 'open-task', taskId });
        return list[0].focus();
      }
      return self.clients.openWindow('./focus-check.html#today');
    })
  );
});
