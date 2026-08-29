import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

import {
  enablePushNotifications,
  getPushNotificationStatus
} from '../utils/pushNotifications';

let listenersAdded = false;
let registered = false;

function isNativeApp() {
  return Capacitor.isNativePlatform();
}

async function addPushListeners() {
  if (listenersAdded) {
    return;
  }

  await PushNotifications.addListener(
    'registration',
    async token => {
      const authToken = localStorage.getItem(
        'essential_token'
      );

      if (!authToken) {
        console.warn(
          'Android notification token received without a logged-in account.'
        );

        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/push/fcm/register`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`
            },
            body: JSON.stringify({
              token: token.value
            })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();

          throw new Error(
            errorText ||
              'Unable to save the Android notification device.'
          );
        }

        console.log(
          'Android notification device saved.'
        );
      } catch (error) {
        console.error(
          'Failed to register Android FCM device with backend:',
          error
        );
      }
    }
  );

  await PushNotifications.addListener(
    'registrationError',
    error => {
      console.error(
        'Android FCM registration error:',
        error
      );
    }
  );

  await PushNotifications.addListener(
    'pushNotificationReceived',
    notification => {
      console.log(
        'Android push notification received:',
        notification
      );
    }
  );

  await PushNotifications.addListener(
    'pushNotificationActionPerformed',
    action => {
      console.log(
        'Android notification opened:',
        action
      );
    }
  );

  listenersAdded = true;
}

async function initializeNativePushNotifications() {
  await addPushListeners();

  let permission =
    await PushNotifications.checkPermissions();

  if (permission.receive === 'prompt') {
    permission =
      await PushNotifications.requestPermissions();
  }

  if (permission.receive !== 'granted') {
    console.warn(
      'Android notification permission was not granted.'
    );

    return {
      supported: true,
      granted: false,
      platform: 'android'
    };
  }

  if (!registered) {
    await PushNotifications.register();
    registered = true;
  }

  return {
    supported: true,
    granted: true,
    platform: 'android'
  };
}

async function initializeWebPushNotifications() {
  const status = await getPushNotificationStatus();

  if (!status.supported) {
    console.warn(
      'Web push notifications are not supported in this browser.'
    );

    return {
      supported: false,
      granted: false,
      platform: 'web'
    };
  }

  return {
    supported: true,
    granted:
      status.permission === 'granted' &&
      status.subscribed,
    platform: 'web'
  };
}

export async function initializePushNotifications() {
  try {
    if (isNativeApp()) {
      return await initializeNativePushNotifications();
    }

    return await initializeWebPushNotifications();
  } catch (error) {
    console.error(
      'Could not initialize push notifications:',
      error
    );

    return {
      supported: true,
      granted: false,
      platform: isNativeApp()
        ? 'android'
        : 'web'
    };
  }
}

export async function enableNotificationsForCurrentDevice() {
  if (isNativeApp()) {
    return await initializeNativePushNotifications();
  }

  const result = await enablePushNotifications();

  return {
    supported: true,
    granted: result.permission === 'granted',
    platform: 'web',
    subscription: result.subscription
  };
}