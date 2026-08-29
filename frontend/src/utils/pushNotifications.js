import client from '../api/client';

function urlBase64ToUint8Array(base64String) {
  if (typeof base64String !== 'string' || !base64String.trim()) {
    throw new Error('The VAPID public key is missing.');
  }

  const value = base64String.trim();

  const padding = '='.repeat(
    (4 - (value.length % 4)) % 4
  );

  const base64 = (value + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  let rawData;

  try {
    rawData = window.atob(base64);
  } catch {
    throw new Error(
      'The VAPID public key from the server is not valid Base64URL.'
    );
  }

  return Uint8Array.from(
    [...rawData].map(character => character.charCodeAt(0))
  );
}

function isPushSupported() {
  return (
    window.isSecureContext &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

async function getServiceWorkerRegistration() {
  const existingRegistration =
    await navigator.serviceWorker.getRegistration('/');

  if (existingRegistration) {
    await navigator.serviceWorker.ready;
    return existingRegistration;
  }

  const registration = await navigator.serviceWorker.register(
    '/sw.js',
    { scope: '/' }
  );

  await navigator.serviceWorker.ready;

  return registration;
}

function getErrorMessage(error) {
  if (error?.name === 'NotAllowedError') {
    return 'Notifications are blocked. Allow notifications for this website in Chrome or Edge, then try again.';
  }

  if (error?.name === 'InvalidStateError') {
    return 'The notification service worker is not ready. Refresh the page and try again.';
  }

  if (error?.name === 'InvalidAccessError') {
    return 'The VAPID public key is invalid. Generate a matching VAPID key pair, update Render, and redeploy.';
  }

  if (error?.name === 'AbortError') {
    return 'The browser push service rejected registration. Clear this site’s data and service worker, then retry in a normal Chrome or Edge window without VPN or proxy.';
  }

  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  return error?.message || 'Unable to enable browser notifications.';
}

export async function getPushNotificationStatus() {
  if (!isPushSupported()) {
    return {
      supported: false,
      permission: window.isSecureContext
        ? 'unsupported'
        : 'insecure-context',
      subscribed: false
    };
  }

  try {
    const registration = await getServiceWorkerRegistration();

    const subscription =
      await registration.pushManager.getSubscription();

    return {
      supported: true,
      permission: Notification.permission,
      subscribed: Boolean(subscription)
    };
  } catch (error) {
    console.error(
      'Unable to read web push notification status:',
      error
    );

    return {
      supported: true,
      permission: Notification.permission,
      subscribed: false,
      error: getErrorMessage(error)
    };
  }
}

export async function enablePushNotifications() {
  if (!isPushSupported()) {
    if (!window.isSecureContext) {
      throw new Error(
        'Notifications require the secure HTTPS version of the app.'
      );
    }

    throw new Error(
      'Push notifications are not supported by this browser. Use the latest Chrome or Microsoft Edge.'
    );
  }

  if (Notification.permission === 'denied') {
    throw new Error(
      'Notifications are blocked. Open browser site settings, set Notifications to Allow, refresh the app, and try again.'
    );
  }

  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    throw new Error(
      'Notification permission was not granted.'
    );
  }

  try {
    const { data } = await client.get('/push/public-key');

    const publicKey = data?.publicKey;

    if (!publicKey) {
      throw new Error(
        'The Render backend has not been configured with a VAPID public key.'
      );
    }

    const applicationServerKey =
      urlBase64ToUint8Array(publicKey);

    if (
      applicationServerKey.length !== 65 ||
      applicationServerKey[0] !== 4
    ) {
      throw new Error(
        `Invalid VAPID public key format. Expected 65 bytes beginning with 4, received ${applicationServerKey.length} bytes.`
      );
    }

    console.log(
      'VAPID public key validated:',
      `${publicKey.slice(0, 12)}...`,
      `(${applicationServerKey.length} bytes)`
    );

    const registration = await getServiceWorkerRegistration();

    let subscription =
      await registration.pushManager.getSubscription();

    if (!subscription) {
      console.log(
        'Creating a browser push subscription...'
      );

      subscription =
        await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });

      console.log(
        'Browser push subscription created successfully.'
      );
    } else {
      console.log(
        'An existing browser push subscription was found.'
      );
    }

    await client.post(
      '/push/subscribe',
      subscription.toJSON()
    );

    console.log(
      'Browser push subscription saved to Render.'
    );

    return {
      permission,
      subscription
    };
  } catch (error) {
    console.error(
      'Unable to enable web push notifications:',
      error
    );

    throw new Error(getErrorMessage(error));
  }
}

export async function disablePushNotifications() {
  if (!isPushSupported()) {
    return;
  }

  const registration = await getServiceWorkerRegistration();

  const subscription =
    await registration.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  try {
    await client.post('/push/unsubscribe', {
      endpoint: subscription.endpoint
    });
  } catch (error) {
    console.error(
      'Unable to remove subscription from backend:',
      error
    );
  } finally {
    await subscription.unsubscribe();
  }
}

export async function sendTestPushNotification() {
  const { data } = await client.post('/push/test');

  return data;
}