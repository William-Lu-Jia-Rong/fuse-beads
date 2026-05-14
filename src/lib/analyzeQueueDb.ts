/** Persist home-page analyze queue across refresh (IndexedDB; large base64 safe vs localStorage). */

const DB_NAME = "fuse-beads";
const DB_VERSION = 1;
const STORE = "analyzeQueue";
const KEY = "jobs";

export type StoredAnalyzeJob = {
  id: string;
  title: string;
  preview: string;
  status: string;
  errorMessage?: string;
  patternId?: number;
  analysisJson?: string;
  beadVendor?: string | null;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

export async function loadAnalyzeQueue(): Promise<StoredAnalyzeJob[] | null> {
  try {
    const db = await openDb();
    if (!db.objectStoreNames.contains(STORE)) {
      db.close();
      return null;
    }
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const getReq = tx.objectStore(STORE).get(KEY);
      getReq.onsuccess = () => {
        db.close();
        const v = getReq.result;
        if (!v || typeof v !== "string") {
          resolve(null);
          return;
        }
        try {
          const parsed = JSON.parse(v) as StoredAnalyzeJob[];
          resolve(Array.isArray(parsed) ? parsed : null);
        } catch {
          resolve(null);
        }
      };
      getReq.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

export async function saveAnalyzeQueue(jobs: StoredAnalyzeJob[]): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
      tx.objectStore(STORE).put(JSON.stringify(jobs), KEY);
    });
  } catch {
    /* ignore quota / private mode */
  }
}

export async function clearAnalyzeQueue(): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
      tx.objectStore(STORE).delete(KEY);
    });
  } catch {
    /* noop */
  }
}
