import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';

let initialized = false;

function getServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    );
  }

  const currentFile = fileURLToPath(import.meta.url);
  const currentDirectory = path.dirname(currentFile);

  const localFile = path.resolve(
    currentDirectory,
    '../../firebase-service-account.json'
  );

  if (!fs.existsSync(localFile)) {
    return null;
  }

  return JSON.parse(
    fs.readFileSync(localFile, 'utf8')
  );
}

export function getFirebaseMessaging() {
  if (initialized) {
    return admin.messaging();
  }

  const serviceAccount = getServiceAccount();

  if (!serviceAccount) {
    console.warn(
      'Firebase Admin is disabled: service account is missing.'
    );

    return null;
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  initialized = true;

  return admin.messaging();
}