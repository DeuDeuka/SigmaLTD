self.addEventListener('push', (event) => {
    const data = event.data.json();
    const { title, body } = data;

    const options = {
        body,
        icon: '/icon.png',
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow('/'));
});