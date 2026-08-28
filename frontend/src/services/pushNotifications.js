import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

let listenersAdded = false;
let registered = false;

function isNativeApp() {
  return Capacitor.isNativePlatform();
}

async function addPushListeners() {
  if (listenersAdded) return;

  await PushNotifications.addListener(
    'registration',
    async token => {
      console.log('FCM TOKEN:', token.value);

      const authToken = localStorage.getItem(
        'essential_token'
      );

      if (!authToken) {
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
          throw new Error(
            'Unable to save the Android notification device.'
          );
        }

        console.log(
          'Android notification device saved.'
        );
      } catch (error) {
        console.error(
          'Failed to register FCM device with backend:',
          error
        );
      }
    }
  );

  await PushNotifications.addListener(
    'registrationError',
    error => {
      console.error(
        'FCM registration error:',
        error
      );
    }
  );

  await PushNotifications.addListener(
    'pushNotificationReceived',
    notification => {
      console.log(
        'Push notification received:',
        notification
      );
    }
  );

  await PushNotifications.addListener(
    'pushNotificationActionPerformed',
    action => {
      console.log(
        'Notification opened:',
        action
      );
    }
  );

  listenersAdded = true;
}

export async function initializePushNotifications() {
  if (!isNativeApp()) {
    console.log(
      'Push notifications are skipped in the web browser.'
    );

    return {
      supported: false,
      granted: false
    };
  }

  try {
    await addPushListeners();

    let permission =
      await PushNotifications.checkPermissions();

    if (permission.receive === 'prompt') {
      permission =
        await PushNotifications.requestPermissions();
    }

    if (permission.receive !== 'granted') {
      console.warn(
        'Notification permission was not granted.'
      );

      return {
        supported: true,
        granted: false
      };
    }

    if (!registered) {
      await PushNotifications.register();
      registered = true;
    }

    return {
      supported: true,
      granted: true
    };
  } catch (error) {
    console.error(
      'Could not initialize push notifications:',
      error
    );

    return {
      supported: true,
      granted: false
    };
  }
}