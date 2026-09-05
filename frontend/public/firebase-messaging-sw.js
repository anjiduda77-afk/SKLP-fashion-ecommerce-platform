// SKLP Fashion - Firebase Cloud Messaging Service Worker
// Handles background push notifications when the application is not focused or closed

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: 'AIzaSyDdfGd-OLpeZhRCm8uBlY9-xf_se_a8zUI',
  authDomain: 'sklp-fashion-store-9fa5d.firebaseapp.com',
  projectId: 'sklp-fashion-store-9fa5d',
  storageBucket: 'sklp-fashion-store-9fa5d.firebasestorage.app',
  messagingSenderId: '92351616723',
  appId: '1:92351616723:web:fc67b10a1db3ecd9e8a626'
};

firebase.initializeApp(firebaseConfig);

let messaging = null;
try {
  messaging = firebase.messaging();
} catch (e) {
  console.warn('[FCM SW] Messaging init note:', e.message);
}

if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('[FCM SW] Received background message:', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'SKLP Luxury Fashion';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'You have a new update from SKLP Fashion.',
      icon: payload.notification?.icon || payload.data?.icon || '/logo.png',
      badge: '/logo.png',
      image: payload.notification?.image || payload.data?.image || undefined,
      data: {
        url: payload.data?.actionUrl || payload.data?.url || '/',
        ...payload.data
      },
      tag: payload.data?.tag || 'sklp-notification',
      renotify: true
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
