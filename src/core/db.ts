// Persistencia en IndexedDB: proyectos completos (escenas, sprites, grabaciones como Blob) y miniaturas.
import type { Project } from './state';

const DB_NAME = 'aprende-jugando';
const DB_VERSION = 1;
const PROJECTS = 'projects';
const THUMBS = 'thumbs';

let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(PROJECTS)) db.createObjectStore(PROJECTS, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(THUMBS)) db.createObjectStore(THUMBS);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { dbp = null; reject(req.error); };
    });
  }
  return dbp;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return open().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const s = t.objectStore(store);
        const req = fn(s);
        let result: T | undefined;
        if (req) req.onsuccess = () => { result = req.result; };
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
  createdAt: number;
}

/** Proyectos de la galería (excluye los de lecciones y tutoriales). */
export async function listProjects(): Promise<ProjectSummary[]> {
  const all = (await tx<Project[]>(PROJECTS, 'readonly', (s) => s.getAll() as IDBRequest<Project[]>)) ?? [];
  return all
    .filter((p) => !p.id.startsWith('lesson-') && !p.id.startsWith('tuto-'))
    .map((p) => ({ id: p.id, name: p.name, updatedAt: p.updatedAt, createdAt: p.createdAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadProject(id: string): Promise<Project | null> {
  const p = await tx<Project>(PROJECTS, 'readonly', (s) => s.get(id) as IDBRequest<Project>);
  return p ?? null;
}

export async function saveProject(p: Project): Promise<void> {
  // structuredClone conserva los Blob de audio
  const copy = structuredClone(p);
  await tx(PROJECTS, 'readwrite', (s) => s.put(copy));
}

export async function deleteProject(id: string): Promise<void> {
  await tx(PROJECTS, 'readwrite', (s) => s.delete(id));
  await tx(THUMBS, 'readwrite', (s) => s.delete(id));
}

export async function saveThumb(id: string, dataUrl: string): Promise<void> {
  await tx(THUMBS, 'readwrite', (s) => s.put(dataUrl, id));
}

export async function loadThumb(id: string): Promise<string | null> {
  const t = await tx<string>(THUMBS, 'readonly', (s) => s.get(id) as IDBRequest<string>);
  return t ?? null;
}

/** Borra todos los datos (usado desde el panel de padres). */
export async function wipeAll(): Promise<void> {
  await tx(PROJECTS, 'readwrite', (s) => s.clear());
  await tx(THUMBS, 'readwrite', (s) => s.clear());
}

/** Estimación de espacio usado (si el navegador lo permite). */
export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null;
  const e = await navigator.storage.estimate();
  return { usage: e.usage ?? 0, quota: e.quota ?? 0 };
}

/** Pide almacenamiento persistente para que el navegador no borre los proyectos. */
export async function requestPersistence(): Promise<void> {
  try { await navigator.storage?.persist?.(); } catch { /* no disponible */ }
}
