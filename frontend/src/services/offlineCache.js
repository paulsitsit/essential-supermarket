import Dexie from 'dexie';

import client from '../api/client';

const READ_TIMEOUT_MS = 30000;

const db = new Dexie(
  'essentialInventoryReadCache'
);

db.version(1).stores({
  responses: '&key, scope, savedAt'
});

export function getCacheScope() {
  try {
    const account = JSON.parse(
      localStorage.getItem(
        'essential_account'
      ) || 'null'
    );

    const id = account?._id || account?.id;

    if (!id) {
      return null;
    }

    return JSON.stringify([
      client.defaults.baseURL,
      String(id),
      String(account.role || ''),
      account.branch?._id ||
        account.branch?.id ||
        account.branch ||
        ''
    ]);
  } catch {
    return null;
  }
}

export async function clearOfflineCache(scope) {
  try {
    if (scope) {
      await db.responses
        .where('scope')
        .equals(scope)
        .delete();
    } else {
      await db.responses.clear();
    }
  } catch (error) {
    console.warn(
      'Unable to clear offline cache:',
      error
    );
  }
}

function isTransportFailure(error) {
  if (error?.response) {
    return false;
  }

  return [
    'ERR_NETWORK',
    'ECONNABORTED',
    'ETIMEDOUT',
    'ECONNRESET',
    'ERR_CONNECTION_RESET',
    'ERR_CONNECTION_TIMED_OUT',
    'ERR_INTERNET_DISCONNECTED',
    'ERR_SSL_PROTOCOL_ERROR'
  ].includes(error?.code);
}

export async function cachedGet(url) {
  const scope = getCacheScope();
  const key = JSON.stringify([
    scope,
    url
  ]);

  async function readCached() {
    if (!scope) {
      return null;
    }

    try {
      return await db.responses.get(key);
    } catch (error) {
      console.warn(
        'Unable to read offline cache:',
        error
      );

      return null;
    }
  }

  if (!navigator.onLine) {
    const cached = await readCached();

    if (!cached) {
      throw new Error(
        'This data has not been saved on this device. ' +
        'Connect to the internet and open this view first.'
      );
    }

    return {
      data: cached.data,
      cached: true,
      savedAt: cached.savedAt
    };
  }

  try {
    const response = await client.get(url, {
      timeout: READ_TIMEOUT_MS
    });

    const savedAt = new Date().toISOString();

    /*
     * Avoid writing data into a cache that belongs to
     * a user who has logged out or changed accounts
     * while this request was still loading.
     */
    if (
      scope &&
      scope === getCacheScope()
    ) {
      try {
        await db.responses.put({
          key,
          scope,
          savedAt,
          data: response.data
        });
      } catch (error) {
        console.warn(
          'Data loaded, but could not be cached:',
          error
        );
      }
    }

    return {
      data: response.data,
      cached: false,
      savedAt
    };
  } catch (error) {
    /*
     * Do not use a cached response to hide an actual
     * backend response such as 401, 403, 404, 409,
     * 422, or 500. Only fall back for a connection,
     * proxy, timeout, or TLS transport failure.
     */
    if (
      !isTransportFailure(error) ||
      scope !== getCacheScope()
    ) {
      throw error;
    }

    const cached = await readCached();

    if (!cached) {
      throw error;
    }

    console.warn(
      `Using saved offline response for ${url}.`,
      error
    );

    return {
      data: cached.data,
      cached: true,
      savedAt: cached.savedAt
    };
  }
}