// public/sw.js — Service Worker for background push notifications
'use strict';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('push', function (event) {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Google Update', body: event.data.text() };
  }

  const options = {
    body: payload.body || 'A new Google update has been detected.',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    tag: payload.id || 'google-update',
    renotify: true,
    data: { url: payload.url || 'https://status.search.google.com' },
    actions: [
      { action: 'open', title: 'View update' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Google Update', options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
