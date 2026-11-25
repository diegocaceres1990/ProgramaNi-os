// Definición de los bloques de la paleta y su representación visual.
import { makeBlock, store } from './state';
import type { Block, BlockType } from './state';

export type Category = 'start' | 'motion' | 'looks' | 'sound' | 'control' | 'end';
export type ValueKind = 'num' | 'speed' | 'msg' | 'sprite' | 'text' | 'page' | 'sound';

export interface BlockDef {
  type: BlockType;
  cat: Category;
  icon: string;
  label: string; // texto corto (accesibilidad y descripción)
  value?: { kind: ValueKind; def: number | string; min?: number; max?: number };
  container?: boolean;
  trigger?: boolean;
  terminal?: boolean;
}

export const CATEGORIES: { id: Category; color: string; dark: string; icon: string; name: string }[] = [
  { id: 'start', color: '#FFD23F', dark: '#C9A000', icon: '🚩', name: 'inicio' },
  { id: 'motion', color: '#4C97FF', dark: '#2F6FCC', icon: '➡️', name: 'movimiento' },
  { id: 'looks', color: '#9966FF', dark: '#6E3FD6', icon: '💬', name: 'apariencia' },
  { id: 'sound', color: '#4CBF56', dark: '#2E8C37', icon: '🔊', name: 'sonido' },
  { id: 'control', color: '#FFAB19', dark: '#C77F00', icon: '⏱️', name: 'control' },
  { id: 'end', color: '#FF4C4C', dark: '#C42525', icon: '⏹️', name: 'fin' },
];

export const MSG_COLORS = ['#FF4C4C', '#FF8C1A', '#FFD23F', '#4CBF56', '#4C97FF', '#9966FF'];

export const BLOCKS: BlockDef[] = [
  { type: 'onFlag', cat: 'start', icon: '🚩', label: 'bandera verde', trigger: true },
  { type: 'onTap', cat: 'start', icon: '👆', label: 'al tocarme', trigger: true },
  { type: 'onBump', cat: 'start', icon: '💥', label: 'al chocar con', trigger: true, value: { kind: 'sprite', def: '' } },
  { type: 'onMessage', cat: 'start', icon: '📩', label: 'al recibir', trigger: true, value: { kind: 'msg', def: 1 } },
  { type: 'send', cat: 'start', icon: '📨', label: 'enviar', value: { kind: 'msg', def: 1 } },

  { type: 'right', cat: 'motion', icon: '➡️', label: 'derecha', value: { kind: 'num', def: 1, min: 0, max: 20 } },
  { type: 'left', cat: 'motion', icon: '⬅️', label: 'izquierda', value: { kind: 'num', def: 1, min: 0, max: 20 } },
  { type: 'up', cat: 'motion', icon: '⬆️', label: 'arriba', value: { kind: 'num', def: 1, min: 0, max: 15 } },
  { type: 'down', cat: 'motion', icon: '⬇️', label: 'abajo', value: { kind: 'num', def: 1, min: 0, max: 15 } },
  { type: 'turnR', cat: 'motion', icon: '↻', label: 'girar', value: { kind: 'num', def: 1, min: 1, max: 12 } },
  { type: 'turnL', cat: 'motion', icon: '↺', label: 'girar', value: { kind: 'num', def: 1, min: 1, max: 12 } },
  { type: 'hop', cat: 'motion', icon: '⤴️', label: 'saltar', value: { kind: 'num', def: 2, min: 1, max: 10 } },
  { type: 'home', cat: 'motion', icon: '🏠', label: 'a casa' },

  { type: 'say', cat: 'looks', icon: '💬', label: 'decir', value: { kind: 'text', def: '¡hola!' } },
  { type: 'grow', cat: 'looks', icon: '🔼', label: 'crecer', value: { kind: 'num', def: 2, min: 1, max: 20 } },
  { type: 'shrink', cat: 'looks', icon: '🔽', label: 'encoger', value: { kind: 'num', def: 2, min: 1, max: 20 } },
  { type: 'hide', cat: 'looks', icon: '🙈', label: 'ocultar' },
  { type: 'show', cat: 'looks', icon: '👀', label: 'mostrar' },
  { type: 'resetSize', cat: 'looks', icon: '⏺️', label: 'tamaño normal' },

  { type: 'pop', cat: 'sound', icon: '🫧', label: 'pop' },
  { type: 'playSound', cat: 'sound', icon: '🎵', label: 'mi sonido', value: { kind: 'sound', def: 1 } },

  { type: 'wait', cat: 'control', icon: '⏳', label: 'esperar', value: { kind: 'num', def: 10, min: 1, max: 100 } },
  { type: 'repeat', cat: 'control', icon: '🔁', label: 'repetir', container: true, value: { kind: 'num', def: 4, min: 1, max: 99 } },
  { type: 'speed', cat: 'control', icon: '🏃', label: 'velocidad', value: { kind: 'speed', def: 'normal' } },

  { type: 'end', cat: 'end', icon: '⏹️', label: 'fin', terminal: true },
  { type: 'forever', cat: 'end', icon: '♾️', label: 'por siempre', container: true, terminal: true },
  { type: 'goPage', cat: 'end', icon: '📄', label: 'ir a página', terminal: true, value: { kind: 'page', def: 2 } },
];

const DEF_MAP = new Map(BLOCKS.map((d) => [d.type, d]));

export function def(type: BlockType): BlockDef {
  const d = DEF_MAP.get(type);
  if (!d) throw new Error('bloque desconocido ' + type);
  return d;
}

export function catInfo(cat: Category) {
  return CATEGORIES.find((c) => c.id === cat) ?? CATEGORIES[0];
}

export function newBlock(type: BlockType): Block {
  const d = def(type);
  return makeBlock(type, d.value?.def, d.container ? [] : undefined);
}

export const SPEEDS: { value: string; icon: string; label: string }[] = [
  { value: 'lenta', icon: '🐌', label: 'lenta' },
  { value: 'normal', icon: '🚶', label: 'normal' },
  { value: 'rapida', icon: '🚀', label: 'rápida' },
];

export const SAY_PRESETS = [
  '¡hola!', 'adiós', '¡sí!', 'no', '¡bien!', '¡ay!', '¿jugamos?', '¡gané!', 'te quiero',
  'tengo hambre', '¡qué divertido!', '¡vamos!', 'inténtalo otra vez', '¡feliz cumpleaños!', '¿quién eres?', 'zzz',
];

/** HTML del valor dentro del bloque. */
export function valueHtml(b: Block): string {
  const d = def(b.type);
  if (!d.value) return '';
  const v = b.value ?? d.value.def;
  switch (d.value.kind) {
    case 'num': case 'page':
      return `<span class="bv-num">${v}</span>`;
    case 'sound':
      return `<span class="bv-num">${v}</span>`;
    case 'speed': {
      const s = SPEEDS.find((x) => x.value === v) ?? SPEEDS[1];
      return `<span class="bv-icon">${s.icon}</span>`;
    }
    case 'msg': {
      const n = Math.max(1, Math.min(6, Number(v) || 1));
      return `<span class="bv-msg" style="background:${MSG_COLORS[n - 1]}">✉</span>`;
    }
    case 'sprite': {
      if (!v) return `<span class="bv-icon">❔</span>`;
      const sp = store.findSprite(String(v));
      return sp ? `<img class="bv-sprite" alt="" src="${spriteThumb(sp.svg)}">` : `<span class="bv-icon">❔</span>`;
    }
    case 'text': {
      const t = String(v);
      return `<span class="bv-text">${escapeHtml(t.length > 9 ? t.slice(0, 8) + '…' : t)}</span>`;
    }
  }
  return '';
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

const thumbCache = new Map<string, string>();
export function spriteThumb(svg: string): string {
  let u = thumbCache.get(svg);
  if (!u) {
    u = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    thumbCache.set(svg, u);
  }
  return u;
}

/** Crea el elemento visual de un bloque simple (sin hijos). */
export function blockEl(b: Block, inPalette = false): HTMLElement {
  const d = def(b.type);
  const el = document.createElement('div');
  el.className = `block cat-${d.cat}${d.trigger ? ' trigger' : ''}${d.terminal ? ' terminal' : ''}${inPalette ? ' in-palette' : ''}`;
  el.dataset.type = b.type;
  el.setAttribute('aria-label', d.label);
  el.title = d.label;
  const icon = `<span class="b-icon">${d.icon}</span>`;
  const val = d.value ? `<span class="b-val" data-role="value">${valueHtml(b)}</span>` : `<span class="b-label">${d.label}</span>`;
  el.innerHTML = icon + val;
  return el;
}

/** Pinta la paleta (pestañas de categoría + lista con scroll). */
export function renderPalette(
  root: HTMLElement,
  current: Category,
  onPick: (cat: Category) => void,
  onDragStart: (type: BlockType, ev: PointerEvent, el: HTMLElement) => void,
  extra?: (cat: Category, list: HTMLElement) => void,
): void {
  root.innerHTML = '';
  const tabs = document.createElement('div');
  tabs.className = 'palette-tabs';
  for (const c of CATEGORIES) {
    const t = document.createElement('button');
    t.className = 'palette-cat' + (c.id === current ? ' sel' : '');
    t.dataset.cat = c.id;
    t.style.background = c.color;
    t.style.borderBottomColor = c.dark;
    t.setAttribute('aria-label', c.name);
    t.textContent = c.icon;
    t.addEventListener('click', () => onPick(c.id));
    tabs.appendChild(t);
  }
  const list = document.createElement('div');
  list.className = 'palette-list';
  for (const d of BLOCKS.filter((x) => x.cat === current)) {
    const el = blockEl(newBlock(d.type), true);
    el.classList.add('palette-block');
    el.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      ev.preventDefault();
      onDragStart(d.type, ev, el);
    });
    list.appendChild(el);
  }
  extra?.(current, list);
  root.append(tabs, list);
}
