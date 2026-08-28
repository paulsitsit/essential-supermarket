import client from '../api/client';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat(
    (4 - (base64String.length % 4)) % 4
  );

  const base64 = (
    base64String + padding
  )
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map(character =>
      character.charCodeAt(0)
    )
  );
}

function isPushSupported() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

async function getServiceWorkerRegistration() {
  const existingRegistration =
    await navigator.serviceWorker.getRegistration();

  if (existingRegistration) {
    return existingRegistration;
  }

  return navigator.serviceWorker.register('/sw.js');
}

export async function getPushNotificationStatus() {
  if (!isPushSupported()) {
    return {
      supported: false,
      permission: 'unsupported',
      subscribed: false
    };
  }

  const registration =
    await getServiceWorkerRegistration();

  const subscription =
    await registration.pushManager.getSubscription();

  return {
    supported: true,
    permission: Notification.permission,
    subscribed: Boolean(subscription)
  };
}

export async function enablePushNotifications() {
  if (!isPushSupported()) {
    throw new Error(
      'Push notifications are not supported by this browser.'
    );
  }

  if (Notification.permission === 'denied') {
    throw new Error(
      'Notifications are blocked. Enable them in your browser or phone settings, then try again.'
    );
  }

  const permission =
    await Notification.requestPermission();

  if (permission !== 'granted') {
    throw new Error(
      'Notification permission was not granted.'
    );
  }

  const { data } = await client.get(
    '/push/public-key'
  );

  const publicKey = data?.publicKey;

  if (!publicKey) {
    throw new Error(
      'The server has not been configured for push notifications.'
    );
  }

  const registration =
    await getServiceWorkerRegistration();

  let subscription =
    await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription =
      await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey:
          urlBase64ToUint8Array(publicKey)
      });
  }

  await client.post(
    '/push/subscribe',
    subscription.toJSON()
  );

  return {
    permission,
    subscription
  };
}

export async function disablePushNotifications() {
  if (!isPushSupported()) {
    return;
  }

  const registration =
    await getServiceWorkerRegistration();

  const subscription =
    await registration.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  try {
    await client.post('/push/unsubscribe', {
      endpoint: subscription.endpoint
    });
  } finally {
    await subscription.unsubscribe();
  }
}

export async function sendTestPushNotification() {
  const { data } = await client.post('/push/test');

  return data;
}