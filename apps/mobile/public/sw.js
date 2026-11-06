// Koach service worker: shows reminder pushes and opens the right screen on tap (NOTIF-01).
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Koach', body: '', url: '/today' };
  event.waitUntil(
    self.registration.showNotification(data.title, { body: data.body, data: { url: data.url }, tag: data.title }),
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/today';
  event.waitUntil(self.clients.openWindow(url));
});
