// Tipos del modelo, store global, undo/redo y selección.
import { spriteByKey, EMPTY_BG } from './sprites';

export type BlockType =
  // amarillo (inicio)
  | 'onFlag' | 'onTap' | 'onBump' | 'onMessage' | 'send'
  // azul (movimiento)
  | 'right' | 'left' | 'up' | 'down' | 'turnR' | 'turnL' | 'hop' | 'home'
  // morado (apariencia)
  | 'say' | 'grow' | 'shrink' | 'hide' | 'show' | 'resetSize'
  // verde (sonido)
  | 'pop' | 'playSound'
  // naranja (control)
  | 'wait' | 'repeat' | 'speed'
  // rojo (fin)
  | 'end' | 'forever' | 'goPage';

export type Block = { id: string; type: BlockType; value?: number | string; children?: Block[] };
export type Script = { id: string; blocks: Block[] };
export type Sprite = {
  id: string; name: string; svg: string; x: number; y: number; dir: number; size: number;
  visible: boolean; sounds: Blob[]; scripts: Script[];
};
export type StageText = { x: number; y: number; text: string };
export type Scene = { id: string; bg: string; sprites: Sprite[]; texts: StageText[] };
export type Project = { id: string; name: string; createdAt: number; updatedAt: number; scenes: Scene[] };

export const GRID_W = 20;
export const GRID_H = 15;
export const CELL = 24; // px lógicos por celda
export const STAGE_W = GRID_W * CELL; // 480
export const STAGE_H = GRID_H * CELL; // 360
export const MAX_SCENES = 4;
export const MAX_MESSAGES = 6;
export const MAX_SOUNDS = 5;
export const MAX_SPRITES = 12;

let counter = 0;
export function uid(prefix = 'i'): string {
  counter = (counter + 1) % 1e6;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function makeBlock(type: BlockType, value?: number | string, children?: Block[]): Block {
  const b: Block = { id: uid('b'), type };
  if (value !== undefined) b.value = value;
  if (children) b.children = children;
  return b;
}

export function makeSprite(key = 'gato', x = 3, y = 9, name?: string): Sprite {
  const lib = spriteByKey(key);
  return {
    id: uid('s'), name: name ?? lib.name, svg: lib.svg, x, y, dir: 0, size: 100,
    visible: true, sounds: [], scripts: [],
  };
}

export function makeScene(withCat = false): Scene {
  return { id: uid('e'), bg: EMPTY_BG, sprites: withCat ? [makeSprite('gato')] : [], texts: [] };
}

export function makeProject(name = 'mi proyecto', id?: string): Project {
  const now = Date.now();
  return { id: id ?? uid('p'), name, createdAt: now, updatedAt: now, scenes: [makeScene(true)] };
}

/** Recorre todos los bloques (incluidos los anidados). */
export function walkBlocks(blocks: Block[], fn: (b: Block, depth: number) => void, depth = 0): void {
  for (const b of blocks) {
    fn(b, depth);
    if (b.children) walkBlocks(b.children, fn, depth + 1);
  }
}

/** Clona bloques con ids nuevos. */
export function cloneBlocks(blocks: Block[]): Block[] {
  return blocks.map((b) => ({
    ...b, id: uid('b'), children: b.children ? cloneBlocks(b.children) : undefined,
  }));
}

export type ChangeReason = 'project' | 'selection' | 'scene' | 'scripts' | 'sprites' | 'load';
type Listener = (reason: ChangeReason) => void;

class Store {
  project: Project = makeProject();
  sceneIndex = 0;
  spriteId: string | null = null;
  dirty = false;
  private undoStack: Project[] = [];
  private redoStack: Project[] = [];
  private listeners = new Set<Listener>();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(reason: ChangeReason): void {
    for (const l of [...this.listeners]) l(reason);
  }

  load(p: Project): void {
    this.project = p;
    this.sceneIndex = 0;
    this.spriteId = p.scenes[0]?.sprites[0]?.id ?? null;
    this.undoStack = [];
    this.redoStack = [];
    this.dirty = false;
    this.emit('load');
  }

  get scene(): Scene {
    if (!this.project.scenes[this.sceneIndex]) this.sceneIndex = 0;
    return this.project.scenes[this.sceneIndex];
  }

  get sprite(): Sprite | null {
    const s = this.scene.sprites.find((sp) => sp.id === this.spriteId);
    return s ?? null;
  }

  findSprite(id: string): Sprite | null {
    for (const sc of this.project.scenes) {
      const s = sc.sprites.find((sp) => sp.id === id);
      if (s) return s;
    }
    return null;
  }

  /** Cambia el proyecto registrando un punto de deshacer. */
  mutate(fn: (p: Project) => void, reason: ChangeReason = 'project', undoable = true): void {
    if (undoable) {
      this.undoStack.push(structuredClone(this.project));
      if (this.undoStack.length > 60) this.undoStack.shift();
      this.redoStack = [];
    }
    fn(this.project);
    this.project.updatedAt = Date.now();
    this.dirty = true;
    this.emit(reason);
  }

  canUndo(): boolean { return this.undoStack.length > 0; }
  canRedo(): boolean { return this.redoStack.length > 0; }

  undo(): void {
    const prev = this.undoStack.pop();
    if (!prev) return;
    this.redoStack.push(structuredClone(this.project));
    this.restore(prev);
  }

  redo(): void {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(structuredClone(this.project));
    this.restore(next);
  }

  private restore(p: Project): void {
    this.project = p;
    if (this.sceneIndex >= p.scenes.length) this.sceneIndex = p.scenes.length - 1;
    if (!this.sprite) this.spriteId = this.scene.sprites[0]?.id ?? null;
    this.dirty = true;
    this.emit('project');
  }

  selectSprite(id: string | null): void {
    if (this.spriteId === id) return;
    this.spriteId = id;
    this.emit('selection');
  }

  selectScene(i: number): void {
    if (i < 0 || i >= this.project.scenes.length) return;
    this.sceneIndex = i;
    this.spriteId = this.scene.sprites[0]?.id ?? null;
    this.emit('scene');
  }
}

export const store = new Store();
