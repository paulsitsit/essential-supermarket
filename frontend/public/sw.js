self.addEventListener('push', event => {
  let payload = {
    title: 'Essential Supermarket',
    body: 'You have a new inventory alert.',
    url: '/alerts',
    tag: 'inventory-alert',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png'
  };

  try {
    if (event.data) {
      payload = {
        ...payload,
        ...event.data.json()
      };
    }
  } catch (error) {
    console.error(
      'Unable to read push notification payload:',
      error
    );
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      data: {
        url: payload.url || '/alerts'
      },
      vibrate: [150, 80, 150],
      requireInteraction: false
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || '/alerts',
    self.location.origin
  ).href;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate?.(targetUrl);
          return client.focus();
        }
      }

      return clients.openWindow(targetUrl);
    })
  );
});