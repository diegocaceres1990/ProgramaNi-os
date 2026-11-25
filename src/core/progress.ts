// Progreso del niño: estrellas por lección, desbloqueo secuencial y tutoriales vistos (localStorage).

export type TrackId = 'aventuras' | 'escuela' | 'grado1' | 'grado2';

export const TRACKS: { id: TrackId; name: string; icon: string; color: string }[] = [
  { id: 'aventuras', name: 'aventuras', icon: '🗺️', color: '#4C97FF' },
  { id: 'escuela', name: 'escuela', icon: '🏫', color: '#4CBF56' },
  { id: 'grado1', name: 'cuaderno de 1º', icon: '📒', color: '#FFAB19' },
  { id: 'grado2', name: 'cuaderno de 2º', icon: '📗', color: '#9966FF' },
];

interface ProgressData {
  stars: Record<string, number>;
  seenTutorials: string[];
  unlockAll: boolean;
}

const KEY = 'aj-progress';

function read(): ProgressData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<ProgressData>;
      return { stars: p.stars ?? {}, seenTutorials: p.seenTutorials ?? [], unlockAll: !!p.unlockAll };
    }
  } catch { /* datos corruptos: se empieza de cero */ }
  return { stars: {}, seenTutorials: [], unlockAll: false };
}

function write(p: ProgressData): void {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function starsOf(lessonId: string): number {
  return read().stars[lessonId] ?? 0;
}

export function setStars(lessonId: string, n: number): void {
  const p = read();
  p.stars[lessonId] = Math.max(p.stars[lessonId] ?? 0, Math.max(0, Math.min(3, n)));
  write(p);
}

/** Desbloqueo secuencial: la primera siempre; las demás si la anterior tiene estrellas. */
export function isUnlocked(ids: string[], index: number): boolean {
  const p = read();
  if (p.unlockAll || index === 0) return true;
  return (p.stars[ids[index - 1]] ?? 0) > 0;
}

export function totalStars(ids?: string[]): number {
  const p = read();
  return Object.entries(p.stars)
    .filter(([id]) => !ids || ids.includes(id))
    .reduce((a, [, n]) => a + n, 0);
}

export function isTutorialSeen(id: string): boolean {
  return read().seenTutorials.includes(id);
}

export function markTutorialSeen(id: string): void {
  const p = read();
  if (!p.seenTutorials.includes(id)) p.seenTutorials.push(id);
  write(p);
}

export function getUnlockAll(): boolean {
  return read().unlockAll;
}

export function setUnlockAll(on: boolean): void {
  const p = read();
  p.unlockAll = on;
  write(p);
}

export function resetProgress(): void {
  const p = read();
  write({ stars: {}, seenTutorials: [], unlockAll: p.unlockAll });
}
