// Evaluación de retos. Solo mira el ESTADO del proyecto (bloques, valores, escenas, sprites,
// sonidos, fondos). Las posiciones finales se calculan simulando de forma determinista los
// scripts de bandera: nunca se usa el tiempo, los clics ni el registro de ejecución.
import { walkBlocks, GRID_W, GRID_H, cloneBlocks } from './state';
import type { Block, BlockType, Project, Scene, Script, Sprite } from './state';
import { EMPTY_BG } from './sprites';
import type { TrackId } from './progress';
import { def } from './blocks';
import type { Category } from './blocks';

/** Mismas constantes de colisión que el motor (engine.ts): 64 px / 24 px por celda, caja al 72 %. */
const SPRITE_BASE = 64 / 24;
const BOX_SHRINK = 0.72;

// ---------------------------------------------------------------- tipos de contenido

export interface Vignette { pic: string; text: string }
export interface GuideStep { sel: string; text: string; icon?: string }
export interface Cond { hint: string; test: (p: Project) => boolean }

export interface Lesson {
  id: string;
  track: TrackId;
  num: number;
  module?: string;
  title: string;
  icon: string;
  goals: [Vignette, Vignette, Vignette];
  unplugged?: { title: string; steps: string[] };
  /** Texto del reto (único en todo el temario). */
  challenge: string;
  /** Bloques que se enseñan por primera vez en esta lección (dentro de su itinerario). */
  introduces: BlockType[];
  guide: GuideStep[];
  /** Estado inicial jugable. */
  start: () => Project;
  /** Aplica la solución de referencia sobre el estado inicial (≤ 12 bloques). */
  solution: (p: Project) => void;
  check: Cond[];
  /** Muestra la rúbrica común (proyectos de cuaderno). */
  rubric?: boolean;
  /** Proyecto libre: la rúbrica es más exigente (3 colores, idea contada con texto o burbujas). */
  free?: boolean;
}

export interface Tutorial {
  id: string;
  title: string;
  icon: string;
  start: () => Project;
  guide: GuideStep[];
  check: Cond[];


}

export interface RubricItem { label: string; ok: boolean }
export interface CheckResult { ok: boolean; hint: string; rubric?: RubricItem[] }

// ---------------------------------------------------------------- consultas

export const cond = (hint: string, test: (p: Project) => boolean): Cond => ({ hint, test });

export function allSprites(p: Project): Sprite[] {
  return p.scenes.flatMap((s) => s.sprites);
}

export function named(p: Project, name: string): Sprite | undefined {
  return allSprites(p).find((s) => s.name === name);
}

export function sceneOf(p: Project, sp: Sprite): number {
  return p.scenes.findIndex((s) => s.sprites.includes(sp));
}

export function trigger(sc: Script): BlockType | null {
  const t = sc.blocks[0]?.type;
  return t && def(t).trigger ? t : null;
}

/** Scripts que empiezan por un bloque amarillo (opcionalmente uno concreto). */
export function scriptsOf(sp: Sprite, trig?: BlockType): Script[] {
  return sp.scripts.filter((s) => (trig ? s.blocks[0]?.type === trig : trigger(s) !== null));
}

/** Bloques en orden de lectura, incluidos los anidados. */
export function flat(blocks: Block[]): Block[] {
  const out: Block[] = [];
  walkBlocks(blocks, (b) => out.push(b));
  return out;
}

/** Bloques de acción de un script (sin el disparador). */
export function actions(sc: Script): Block[] {
  return flat(trigger(sc) ? sc.blocks.slice(1) : sc.blocks);
}

export function has(sc: Script, type: BlockType, pred?: (b: Block) => boolean): boolean {
  return flat(sc.blocks).some((b) => b.type === type && (!pred || pred(b)));
}

/** ¿Aparecen esos tipos en ese orden (no necesariamente seguidos)? */
export function inOrder(sc: Script, types: BlockType[]): boolean {
  let i = 0;
  for (const b of flat(sc.blocks)) if (b.type === types[i] && ++i === types.length) return true;
  return types.length === 0;
}

export function countBlocks(p: Project): number {
  let n = 0;
  for (const sp of allSprites(p)) for (const sc of sp.scripts) walkBlocks(sc.blocks, () => n++);
  return n;
}

export function blockTypes(p: Project): Set<BlockType> {
  const s = new Set<BlockType>();
  for (const sp of allSprites(p)) for (const sc of sp.scripts) walkBlocks(sc.blocks, (b) => s.add(b.type));
  return s;
}

export const num = (b: Block | undefined, d = 0): number => {
  const n = Number(b?.value);
  return Number.isFinite(n) ? n : d;
};

export const isPainted = (svg: string) => svg.includes('data-mano="1"');
export const hasPhoto = (svg: string) => svg.includes('data-foto="1"');
export const bgChanged = (s: Scene) => s.bg !== EMPTY_BG;

/** Repeticiones (bloque repetir) con un valor y con un hijo de cierto tipo. */
export function findRepeat(sc: Script, n?: number, childType?: BlockType): boolean {
  return flat(sc.blocks).some(
    (b) => b.type === 'repeat' && (n === undefined || num(b) === n) &&
      (!childType || flat(b.children ?? []).some((c) => c.type === childType)),
  );
}

/** Velocidad fijada en scripts de bandera antes del primer movimiento. */
export function speedOf(sp: Sprite): string | null {
  for (const sc of scriptsOf(sp, 'onFlag')) {
    for (const b of flat(sc.blocks)) {
      if (b.type === 'speed') return String(b.value ?? 'normal');
      if (['right', 'left', 'up', 'down', 'hop'].includes(b.type)) break;
    }
  }
  return null;
}

// ---------------------------------------------------------------- simulación determinista

export interface SimResult {
  x: number; y: number; size: number; visible: boolean; dir: number;
  hops: number; path: { x: number; y: number; size: number }[]; says: string[];
}

/** Simula los scripts de bandera de un personaje, uno detrás de otro, sin tiempo. */
export function simulate(sp: Sprite): SimResult {
  const st: SimResult = { x: sp.x, y: sp.y, size: sp.size, visible: sp.visible, dir: sp.dir, hops: 0, path: [], says: [] };
  st.path.push({ x: st.x, y: st.y, size: st.size });
  let budget = 5000;
  const run = (blocks: Block[]): boolean => {
    for (const b of blocks) {
      if (--budget < 0) return true;
      switch (b.type) {
        case 'right': case 'left': case 'up': case 'down': {
          const n = Math.round(num(b, 1));
          const sx = b.type === 'right' ? 1 : b.type === 'left' ? -1 : 0;
          const sy = b.type === 'down' ? 1 : b.type === 'up' ? -1 : 0;
          const steps = Math.abs(n), sign = Math.sign(n);
          for (let i = 0; i < steps; i++) {
            st.x = Math.max(0, Math.min(GRID_W, st.x + sx * sign));
            st.y = Math.max(0, Math.min(GRID_H, st.y + sy * sign));
            st.path.push({ x: st.x, y: st.y, size: st.size });
          }
          break;
        }
        case 'home': st.x = sp.x; st.y = sp.y; st.dir = sp.dir; st.path.push({ x: st.x, y: st.y, size: st.size }); break;
        case 'turnR': st.dir += 30 * num(b, 1); break;
        case 'turnL': st.dir -= 30 * num(b, 1); break;
        case 'hop': st.hops++; break;
        case 'grow': st.size = Math.min(400, st.size + 10 * num(b, 2)); break;
        case 'shrink': st.size = Math.max(20, st.size - 10 * num(b, 2)); break;
        case 'resetSize': st.size = 100; break;
        case 'hide': st.visible = false; break;
        case 'show': st.visible = true; break;
        case 'say': st.says.push(String(b.value ?? '')); break;
        case 'repeat': {
          const n = Math.max(0, Math.min(99, Math.round(num(b, 4))));
          for (let i = 0; i < n; i++) if (run(b.children ?? [])) return true;
          break;
        }
        case 'forever': run(b.children ?? []); return true;
        case 'end': case 'goPage': return true;
        default: break;
      }
    }
    return false;
  };
  for (const sc of scriptsOf(sp, 'onFlag')) run(sc.blocks.slice(1));
  st.dir = ((st.dir % 360) + 360) % 360;
  return st;
}

/** ¿El recorrido de bandera de A llega a tocar a B (en su casa), con las cajas del motor? */
export function pathTouches(a: Sprite, b: Sprite): boolean {
  const hb = (SPRITE_BASE * b.size) / 100 / 2 * BOX_SHRINK;
  return simulate(a).path.some((pt) => {
    const ha = (SPRITE_BASE * pt.size) / 100 / 2 * BOX_SHRINK;
    return Math.abs(pt.x - b.x) < ha + hb && Math.abs(pt.y - b.y) < ha + hb;
  });
}

/** ¿Todo el recorrido de bandera de A queda dentro de los pasillos indicados? */
export function pathInside(a: Sprite, rects: [number, number, number, number][]): boolean {
  return simulate(a).path.every((pt) => rects.some(([x0, y0, x1, y1]) => pt.x >= x0 && pt.x <= x1 && pt.y >= y0 && pt.y <= y1));
}

// ---------------------------------------------------------------- rúbrica común

export function categoriesUsed(p: Project): Set<Category> {
  const cats = new Set<Category>();
  for (const sp of allSprites(p)) for (const sc of scriptsOf(sp)) walkBlocks(sc.blocks, (b) => cats.add(def(b.type).cat));
  return cats;
}

const safe = (c: Cond, p: Project): boolean => {
  try { return c.test(p); } catch { return false; }
};

/**
 * Rúbrica común (funciona, usa los bloques del módulo, se entiende la idea).
 * - Proyecto libre: al menos 3 colores de bloques y texto o burbujas que cuenten la idea.
 * - Resto: usa algún bloque que la lección introduce (o 2 colores si no introduce ninguno)
 *   y la idea se entiende si se cumplen las comprobaciones del reto.
 */
export interface EvalTarget { check: Cond[]; rubric?: boolean; introduces?: BlockType[]; free?: boolean }

export function rubric(p: Project, lesson: EvalTarget): RubricItem[] {
  const works = allSprites(p).some((sp) => scriptsOf(sp).some((sc) => actions(sc).length > 0));
  if (lesson.free) {
    const idea = p.scenes.some((s) => s.texts.length > 0) || allSprites(p).some((sp) => sp.scripts.some((sc) => has(sc, 'say')));
    return [
      { label: '⚙️ funciona: hay un programa que empieza con un bloque amarillo', ok: works },
      { label: '🧩 usa bloques de al menos 3 colores', ok: categoriesUsed(p).size >= 3 },
      { label: '💡 se entiende la idea: hay texto o burbujas que la cuentan', ok: idea },
    ];
  }
  const used = blockTypes(p);
  const intro = lesson.introduces ?? [];
  const blocksOk = intro.length ? intro.some((t) => used.has(t)) : categoriesUsed(p).size >= 2;
  return [
    { label: '⚙️ funciona: hay un programa que empieza con un bloque amarillo', ok: works },
    { label: intro.length ? '🧩 usa los bloques nuevos de esta lección' : '🧩 usa bloques de al menos 2 colores', ok: blocksOk },
    { label: '💡 se entiende la idea: el reto se cumple', ok: lesson.check.every((c) => safe(c, p)) },
  ];
}

// ---------------------------------------------------------------- evaluación

export function evaluate(lesson: EvalTarget, p: Project): CheckResult {
  const rb = lesson.rubric ? rubric(p, lesson) : undefined;
  for (const c of lesson.check) {
    let ok = false;
    try { ok = c.test(p); } catch { ok = false; }
    if (!ok) return { ok: false, hint: c.hint, rubric: rb };
  }
  if (rb && rb.some((r) => !r.ok)) return { ok: false, hint: rb.find((r) => !r.ok)!.label, rubric: rb };
  return { ok: true, hint: '', rubric: rb };
}

// ---------------------------------------------------------------- autoprueba del temario

/**
 * Comprueba todo el temario: 3 viñetas, retos con texto único, el estado inicial NO supera el reto,
 * la solución de referencia SÍ lo supera, la solución usa ≤ 12 bloques nuevos y solo bloques ya
 * introducidos en su itinerario.
 */
export function selfTest(lessons: Lesson[]): { passed: number; errors: string[] } {
  const errors: string[] = [];
  const seen = new Map<string, string>();
  const taught = new Map<TrackId, Set<BlockType>>();
  let passed = 0;
  const sorted = [...lessons].sort((a, b) => (a.track === b.track ? a.num - b.num : 0));
  for (const l of sorted) {
    const errs: string[] = [];
    const known = taught.get(l.track) ?? new Set<BlockType>();
    l.introduces.forEach((t) => known.add(t));
    taught.set(l.track, known);
    if (l.goals.length !== 3) errs.push('no tiene 3 viñetas');
    const prev = seen.get(l.challenge);
    if (prev) errs.push(`texto de reto repetido con ${prev}`);
    seen.set(l.challenge, l.id);
    const start = l.start();
    const startTypes = blockTypes(start);
    if (evaluate(l, start).ok) errs.push('el estado inicial ya supera el reto');
    const solved = structuredClone(start);
    // los bloques del estado inicial se clonan con ids nuevos para no compartir referencias
    for (const sp of allSprites(solved)) for (const sc of sp.scripts) sc.blocks = cloneBlocks(sc.blocks);
    l.solution(solved);
    const added = countBlocks(solved) - countBlocks(start);
    if (added > 12) errs.push(`la solución usa ${added} bloques (> 12)`);
    const r = evaluate(l, solved);
    if (!r.ok) errs.push(`la solución no supera el reto: ${r.hint}`);
    for (const t of blockTypes(solved)) if (!known.has(t)) errs.push(`usa "${t}" antes de enseñarlo`);
    for (const t of startTypes) if (!known.has(t)) errs.push(`el estado inicial trae "${t}" sin enseñarlo`);
    if (errs.length) errors.push(...errs.map((e) => `${l.id}: ${e}`));
    else passed++;
  }
  return { passed, errors };
}
