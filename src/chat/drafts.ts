import { draftPrefix } from "./model";
export type DraftFile = { id: string; type: string; file: File };
function openFiles(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("grindly-chat-drafts-v1", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function readDraftFiles(key: string): Promise<DraftFile[]> {
  try {
    const db = await openFiles();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readonly");
      const request = tx.objectStore("files").get(key);
      request.onsuccess = () => resolve(request.result ?? []);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return [];
  }
}
export async function writeDraftFiles(key: string, files: DraftFile[]) {
  try {
    const db = await openFiles();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      if (files.length) tx.objectStore("files").put(files, key);
      else tx.objectStore("files").delete(key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    /* Storage-disabled browsers retain the in-memory draft. */
  }
}
async function clearDraftFiles() {
  try {
    const db = await openFiles();
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").clear();
    tx.oncomplete = () => db.close();
  } catch {}
}
export function clearChatDrafts() {
  try {
    for (const key of Object.keys(localStorage))
      if (key.startsWith(draftPrefix)) localStorage.removeItem(key);
    localStorage.setItem("grindly:logout", String(Date.now()));
  } catch {}
  void clearDraftFiles();
  window.dispatchEvent(new Event("grindly:logout"));
}
