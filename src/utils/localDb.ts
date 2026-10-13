/**
 * IndexedDB Local Database Layer for Rahula College LMS
 * High-capacity, persistent, structured local storage built into the browser.
 */

const DB_NAME = 'RahulaCollege_LMS_DB';
const DB_VERSION = 1;

export interface LocalLmsDatabase {
  books: any[];
  members: any[];
  circulation: any[];
  reservations: any[];
  fines: any[];
  categories: any[];
  settings: any;
  users: any[];
}

export function openLocalDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('store')) {
        db.createObjectStore('store', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onerror = (event: any) => {
      reject(event.target.error);
    };
  });
}

export async function saveLocalDbKey(key: string, value: any): Promise<void> {
  try {
    const db = await openLocalDb();
    const tx = db.transaction('store', 'readwrite');
    const store = tx.objectStore('store');
    store.put({ key, value });
  } catch (e) {
    console.warn(`LocalDB save failed for ${key}, falling back to localStorage:`, e);
  }
}

export async function getLocalDbKey<T = any>(key: string): Promise<T | null> {
  try {
    const db = await openLocalDb();
    return new Promise((resolve) => {
      const tx = db.transaction('store', 'readonly');
      const store = tx.objectStore('store');
      const request = store.get(key);
      request.onsuccess = () => {
        resolve(request.result ? request.result.value : null);
      };
      request.onerror = () => {
        resolve(null);
      };
    });
  } catch (e) {
    return null;
  }
}

export async function clearEntireLocalDb(): Promise<void> {
  try {
    const db = await openLocalDb();
    const tx = db.transaction('store', 'readwrite');
    const store = tx.objectStore('store');
    store.clear();
  } catch (e) {
    console.warn('Failed to clear LocalDB:', e);
  }
}
