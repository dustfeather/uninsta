import type { IGMessage } from './types';

const DB_NAME = 'uninsta';
const DB_VERSION = 1;
const STORE_NAME = 'messages';
const CURSOR_STORE = 'cursors';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'message_id' });
      }
      if (!db.objectStoreNames.contains(CURSOR_STORE)) {
        db.createObjectStore(CURSOR_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Store a batch of messages for a thread. */
export async function storeMessages(threadFbid: string, messages: IGMessage[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  for (const msg of messages) {
    store.put({ ...msg, _threadFbid: threadFbid });
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Get the count of stored messages for a thread. */
export async function getMessageCount(threadFbid: string): Promise<number> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const req = store.getAll();
  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      const count = req.result.filter((m: any) => m._threadFbid === threadFbid).length;
      db.close();
      resolve(count);
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

/** Get the next message to unsend (oldest first by insertion order). Returns null when done. */
export async function getNextMessage(threadFbid: string): Promise<IGMessage | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const req = store.openCursor();
  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) { db.close(); resolve(null); return; }
      const val = cursor.value;
      if (val._threadFbid === threadFbid) {
        db.close();
        resolve(val as IGMessage);
      } else {
        cursor.continue();
      }
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

/** Remove a message after it's been unsent. */
export async function removeMessage(messageId: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(messageId);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Clear all stored messages for a thread. */
export async function clearMessages(threadFbid: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const req = store.openCursor();
  req.onsuccess = () => {
    const cursor = req.result;
    if (!cursor) return;
    if (cursor.value._threadFbid === threadFbid) cursor.delete();
    cursor.continue();
  };
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Save the pagination cursor for resume. */
export async function saveCursor(threadFbid: string, cursor: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(CURSOR_STORE, 'readwrite');
  tx.objectStore(CURSOR_STORE).put(cursor, threadFbid);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Load the saved cursor for resume. */
export async function loadCursor(threadFbid: string): Promise<string | null> {
  const db = await openDB();
  const tx = db.transaction(CURSOR_STORE, 'readonly');
  const req = tx.objectStore(CURSOR_STORE).get(threadFbid);
  return new Promise((resolve, reject) => {
    req.onsuccess = () => { db.close(); resolve(req.result ?? null); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

/** Clear the saved cursor. */
export async function clearCursor(threadFbid: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(CURSOR_STORE, 'readwrite');
  tx.objectStore(CURSOR_STORE).delete(threadFbid);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
