/**
 * Robust Persistent Storage Utility
 * Uses IndexedDB for large data (trips, reports) with seamless fallback and safe LocalStorage handling.
 * Prevents QuotaExceededError crashes completely.
 */

const DB_NAME = 'TransportBillingDB_v1';
const STORE_NAME = 'app_keyval_store';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.warn('IndexedDB failed to open:', request.error);
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Save an item to IndexedDB (virtually unlimited quota for modern web apps)
 */
export async function idbSet<T = any>(key: string, value: T): Promise<boolean> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);

      req.onsuccess = () => resolve(true);
      req.onerror = (e) => {
        console.warn(`[IndexedDB] Error setting key ${key}:`, e);
        resolve(false);
      };
    });
  } catch (err) {
    console.warn(`[IndexedDB] idbSet failed for ${key}:`, err);
    return false;
  }
}

/**
 * Retrieve an item from IndexedDB
 */
export async function idbGet<T = any>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => {
        resolve(req.result !== undefined ? req.result : null);
      };
      req.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.warn(`[IndexedDB] idbGet failed for ${key}:`, err);
    return null;
  }
}

/**
 * Remove an item from IndexedDB
 */
export async function idbRemove(key: string): Promise<boolean> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    return false;
  }
}

/**
 * Clear all items from IndexedDB store
 */
export async function idbClear(): Promise<boolean> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    return false;
  }
}

/**
 * Safe LocalStorage setter that NEVER throws QuotaExceededError or crashes the app.
 * Automatically catches quota errors, suppresses them, and frees space if needed.
 */
export function safeLocalStorageSet(key: string, value: any, maxSizeBytes = 1.5 * 1024 * 1024): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  try {
    const stringified = typeof value === 'string' ? value : JSON.stringify(value);

    // If payload is very large (> 1.5MB), don't risk overflowing the 5MB browser LocalStorage quota
    if (stringified.length * 2 > maxSizeBytes) {
      // Remove any existing oversized entry to free up room for other settings
      try {
        localStorage.removeItem(key);
      } catch (_) {}
      return false;
    }

    localStorage.setItem(key, stringified);
    return true;
  } catch (e: any) {
    // Check if QuotaExceededError
    const isQuotaError =
      e?.name === 'QuotaExceededError' ||
      e?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      e?.code === 22 ||
      e?.code === 1014 ||
      (e?.message && e.message.toLowerCase().includes('quota'));

    if (isQuotaError) {
      console.warn(`[Storage] LocalStorage quota exceeded when writing "${key}". Safely skipping LocalStorage write.`);
      // Try to remove this key to prevent perpetual quota overflow
      try {
        localStorage.removeItem(key);
      } catch (_) {}
    } else {
      console.warn(`[Storage] Failed to write "${key}" to LocalStorage:`, e);
    }
    return false;
  }
}

/**
 * Safe LocalStorage getter
 */
export function safeLocalStorageGet<T = any>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`[Storage] Failed to read or parse "${key}" from LocalStorage:`, e);
    return fallback;
  }
}

/**
 * Safe LocalStorage remover
 */
export function safeLocalStorageRemove(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`[Storage] Failed to remove "${key}" from LocalStorage:`, e);
  }
}

/**
 * Emergency purge for bloated LocalStorage items
 */
export function pruneOversizedLocalStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      try {
        const val = localStorage.getItem(k);
        // If an item alone takes > 1.5MB characters, remove it from localStorage
        if (val && val.length > 750000) {
          console.warn(`[Storage] Pruned oversized item from LocalStorage: ${k} (${val.length} chars)`);
          localStorage.removeItem(k);
        }
      } catch (_) {}
    }
  } catch (_) {}
}
