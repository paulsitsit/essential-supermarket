import Dexie from 'dexie';
import client from '../api/client';

const db = new Dexie('essentialInventoryReadCache');

db.version(1).stores({
  responses: '&key, scope, savedAt'
});

export function getCacheScope() {
  try {
    const account = JSON.parse(
      localStorage.getItem('essential_account') || 'null'
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
      await db.responses.where('scope').equals(scope).delete();
    } else {
      await db.responses.clear();
    }
  } catch (error) {
    console.warn('Unable to clear offline cache:', error);
  }
}

export async function cachedGet(url) {
  const scope = getCacheScope();
  const key = JSON.stringify([scope, url]);

  async function readCached() {
    if (!scope) {
      return null;
    }

    try {
      return await db.responses.get(key);
    } catch (error) {
      console.warn('Unable to read offline cache:', error);
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
      timeout: 10000
    });

    const savedAt = new Date().toISOString();

    if (scope && scope === getCacheScope()) {
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
    const transportFailure =
      !error.response &&
      (
        error.code === 'ERR_NETWORK' ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT'
      );

    // Do not hide authorization or other HTTP errors.
    if (!transportFailure || scope !== getCacheScope()) {
      throw error;
    }

    const cached = await readCached();

    if (!cached) {
      throw error;
    }

    return {
      data: cached.data,
      cached: true,
      savedAt: cached.savedAt
    };
  }
}