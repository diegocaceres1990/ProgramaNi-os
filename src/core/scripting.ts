// Área de código: render de scripts, arrastrar/soltar con imán, anidado en bucles,
// borrado al soltar fuera y edición de valores con selectores táctiles.
import { store, MAX_MESSAGES } from './state';
import type { Block, BlockType, Script, Sprite } from './state';
import { def, blockEl, newBlock, valueHtml, SPEEDS, SAY_PRESETS, MSG_COLORS, spriteThumb, escapeHtml } from './blocks';
import { TRIGGERS } from './engine';
import * as audio from './audio';
import { pickNumber, pickChoice, askText, toast } from '../ui/dialog';
import type { Choice } from '../ui/dialog';

/** Radio del imán (px de pantalla) desde el borde del bloque arrastrado. */
export const IMAN = 20;
const SNAP_DIST = IMAN * 2;
const DRAG_THRESHOLD = 6;

interface Target { sid: string; cont: string; before: string | null; x: number; y: number }

interface Loc { block: Block; list: Block[]; index: number; sid: string; cont: string }

interface Drag {
  chain: Block[];
  fromCode: boolean;
  ghost: HTMLElement;
  offX: number;
  offY: number;
  targets: Target[];
  current: Target | null;
  srcEls: HTMLElement[];
}

const isTrigger = (t: BlockType) => TRIGGERS.includes(t);
const isTerminal = (t: BlockType) => !!def(t).terminal;

export class CodeArea {
  readonly el: HTMLElement;
  private inner: HTMLElement;
  private marker: HTMLElement;
  private bulb: HTMLElement;
  private locs = new Map<string, Loc>();
  private drag: Drag | null = null;
  onRunScript: ((sp: Sprite, sc: Script) => void) | null = null;

  constructor(root: HTMLElement) {
    this.el = root;
    this.el.classList.add('code-area');
    this.inner = document.createElement('div');
    this.inner.className = 'code-inner';
    this.marker = document.createElement('div');
    this.marker.className = 'snap-marker';
    this.bulb = document.createElement('button');
    this.bulb.className = 'bulb';
    this.bulb.textContent = '💡';
    this.bulb.setAttribute('aria-label', 'pista');
    this.bulb.addEventListener('click', () => {
      toast('<span class="big">💡</span> ¿falta un bloque amarillo? <span class="mini-block cat-start">🚩</span>', 4000);
      this.bulb.classList.remove('show');
    });
    this.el.append(this.inner, this.bulb);
    document.body.appendChild(this.marker);
  }

  /** Muestra la bombilla de pista. */
  showBulb(): void {
    this.bulb.classList.add('show');
    toast('<span class="big">💡</span> ¿falta un bloque amarillo? <span class="mini-block cat-start">🚩</span>', 4000);
  }

  hideBulb(): void { this.bulb.classList.remove('show'); }

  /** Marca los scripts que se están ejecutando. */
  setRunning(ids: Set<string>): void {
    this.inner.querySelectorAll<HTMLElement>('.script').forEach((s) => {
      s.classList.toggle('running', ids.has(s.dataset.sid ?? ''));
    });
  }

  render(): void {
    this.locs.clear();
    this.inner.innerHTML = '';
    const sp = store.sprite;
    if (!sp) {
      this.inner.innerHTML = '<div class="code-empty">👈 ➕</div>';
      return;
    }
    if (!sp.scripts.length) {
      const hint = document.createElement('div');
      hint.className = 'code-empty';
      hint.innerHTML = '<span>🧩</span><span class="arrow-hint">⬅️</span>';
      this.inner.appendChild(hint);
    }
    for (const sc of sp.scripts) {
      const row = document.createElement('div');
      row.className = 'script';
      row.dataset.sid = sc.id;
      row.appendChild(this.renderChain(sc.blocks, sc.id, ''));
      this.inner.appendChild(row);
    }
  }

  private renderChain(blocks: Block[], sid: string, cont: string): HTMLElement {
    const chain = document.createElement('div');
    chain.className = 'chain';
    chain.dataset.sid = sid;
    chain.dataset.cont = cont;
    blocks.forEach((b, i) => {
      this.locs.set(b.id, { block: b, list: blocks, index: i, sid, cont });
      chain.appendChild(this.renderBlock(b, sid));
    });
    return chain;
  }

  private renderBlock(b: Block, sid: string): HTMLElement {
    const d = def(b.type);
    let el: HTMLElement;
    if (d.container) {
      el = document.createElement('div');
      el.className = `loop cat-${d.cat}`;
      const cap = document.createElement('div');
      cap.className = `loop-cap cat-${d.cat}`;
      cap.innerHTML = `<span class="b-icon">${d.icon}</span>` +
        (d.value ? `<span class="b-val" data-role="value">${valueHtml(b)}</span>` : '');
      const body = this.renderChain(b.children ?? (b.children = []), sid, b.id);
      body.classList.add('loop-body');
      el.append(cap, body);
      el.setAttribute('aria-label', d.label);
    } else {
      el = blockEl(b);
    }
    el.dataset.bid = b.id;
    el.addEventListener('pointerdown', (ev) => this.onBlockDown(ev, b.id, el));
    return el;
  }

  // ---------- gestos ----------

  private onBlockDown(ev: PointerEvent, bid: string, el: HTMLElement): void {
    if (ev.button !== 0 || this.drag) return;
    ev.stopPropagation();
    ev.preventDefault();
    const sx = ev.clientX, sy = ev.clientY;
    const valueHit = (ev.target as HTMLElement).closest('[data-role="value"]');
    const move = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - sx, e.clientY - sy) > DRAG_THRESHOLD) {
        cleanup();
        this.beginCodeDrag(bid, el, e, sx, sy);
      }
    };
    const up = () => {
      cleanup();
      const loc = this.locs.get(bid);
      if (!loc) return;
      if (valueHit) void this.editValue(loc.block);
      else this.runScriptOf(loc.sid);
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cleanup);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cleanup);
  }

  private runScriptOf(sid: string): void {
    const sp = store.sprite;
    const sc = sp?.scripts.find((s) => s.id === sid);
    if (sp && sc) this.onRunScript?.(sp, sc);
  }

  /** Arrastre que empieza en la paleta. */
  startPaletteDrag(type: BlockType, ev: PointerEvent, srcEl: HTMLElement): void {
    if (this.drag || !store.sprite) {
      if (!store.sprite) toast('👈 ➕');
      return;
    }
    const sx = ev.clientX, sy = ev.clientY;
    const r = srcEl.getBoundingClientRect();
    let started = false;
    const move = (e: PointerEvent) => {
      if (!started && Math.hypot(e.clientX - sx, e.clientY - sy) > DRAG_THRESHOLD) {
        started = true;
        cleanup();
        const ghost = srcEl.cloneNode(true) as HTMLElement;
        this.begin([newBlock(type)], false, ghost, sx - r.left, sy - r.top, [], e);
      }
    };
    const up = () => {
      cleanup();
      if (!started) {
        // toque simple en la paleta: añade el bloque al final del script del personaje
        this.appendByTap(type);
      }
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cleanup);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cleanup);
  }

  /** Un toque en un bloque de la paleta lo encaja donde tenga sentido. */
  private appendByTap(type: BlockType): void {
    const sp = store.sprite;
    if (!sp) return;
    const b = newBlock(type);
    audio.click();
    store.mutate(() => {
      if (isTrigger(type) || !sp.scripts.length) {
        sp.scripts.push({ id: 'sc' + b.id, blocks: [b] });
        return;
      }
      const last = sp.scripts[sp.scripts.length - 1];
      const tail = last.blocks[last.blocks.length - 1];
      if (tail && isTerminal(tail.type)) sp.scripts.push({ id: 'sc' + b.id, blocks: [b] });
      else last.blocks.push(b);
    }, 'scripts');
  }

  private beginCodeDrag(bid: string, el: HTMLElement, e: PointerEvent, sx: number, sy: number): void {
    const loc = this.locs.get(bid);
    if (!loc) return;
    const chain = loc.list.slice(loc.index);
    const ghost = document.createElement('div');
    ghost.className = 'chain ghost-chain';
    const srcEls: HTMLElement[] = [];
    let node: Element | null = el;
    while (node) {
      if (node instanceof HTMLElement && node.dataset.bid) {
        srcEls.push(node);
        ghost.appendChild(node.cloneNode(true));
      }
      node = node.nextElementSibling;
    }
    const r = el.getBoundingClientRect();
    this.begin(chain, true, ghost, sx - r.left, sy - r.top, srcEls, e);
  }

  private begin(chain: Block[], fromCode: boolean, ghostContent: HTMLElement, offX: number, offY: number, srcEls: HTMLElement[], e: PointerEvent): void {
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.appendChild(ghostContent);
    document.body.appendChild(ghost);
    srcEls.forEach((s) => s.classList.add('dragging-src'));
    const excluded = new Set<string>();
    const mark = (bs: Block[]) => bs.forEach((b) => { excluded.add(b.id); if (b.children) mark(b.children); });
    mark(chain);
    this.drag = { chain, fromCode, ghost, offX, offY, targets: this.collectTargets(chain, excluded), current: null, srcEls };
    document.body.classList.add('dragging');
    this.moveGhost(e.clientX, e.clientY);
    const move = (ev: PointerEvent) => this.moveGhost(ev.clientX, ev.clientY);
    const up = (ev: PointerEvent) => { cleanup(); this.drop(ev.clientX, ev.clientY); };
    const cancel = () => { cleanup(); this.endDrag(); };
    const cleanup = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  }

  private collectTargets(chain: Block[], excluded: Set<string>): Target[] {
    const head = chain[0].type;
    const tail = chain[chain.length - 1].type;
    const headTrig = isTrigger(head);
    const tailTerm = chain.some((b) => isTerminal(b.type)) || isTerminal(tail);
    const out: Target[] = [];
    this.inner.querySelectorAll<HTMLElement>('.chain').forEach((ch) => {
      const sid = ch.dataset.sid ?? '';
      const cont = ch.dataset.cont ?? '';
      if (cont && excluded.has(cont)) return;
      const isTop = cont === '';
      const kids = [...ch.children].filter((c): c is HTMLElement => c instanceof HTMLElement && !!c.dataset.bid && !excluded.has(c.dataset.bid));
      const types = kids.map((k) => this.locs.get(k.dataset.bid ?? '')?.block.type).filter((t): t is BlockType => !!t);
      const cr = ch.getBoundingClientRect();
      const cy = cr.top + Math.min(cr.height, 56) / 2;
      const lastTerm = types.length > 0 && isTerminal(types[types.length - 1]);
      for (let i = 0; i <= kids.length; i++) {
        // reglas de encaje
        if (headTrig && !(isTop && i === 0 && !(types[0] && isTrigger(types[0])))) continue;
        if (!headTrig && isTop && i === 0 && types[0] && isTrigger(types[0])) continue;
        if (!headTrig && isTop && i === 0 && types.length === 0) continue;
        if (lastTerm && i === kids.length) continue;
        if (tailTerm && (!isTop || i !== kids.length)) continue;
        const x = i < kids.length ? kids[i].getBoundingClientRect().left : kids.length ? kids[kids.length - 1].getBoundingClientRect().right : cr.left;
        const before = i < kids.length ? (kids[i].dataset.bid ?? null) : null;
        out.push({ sid, cont, before, x, y: cy });
      }
    });
    return out;
  }

  private moveGhost(x: number, y: number): void {
    const d = this.drag;
    if (!d) return;
    const gx = x - d.offX, gy = y - d.offY;
    d.ghost.style.transform = `translate(${gx}px, ${gy}px)`;
    const gr = d.ghost.getBoundingClientRect();
    const leftX = gx, rightX = gx + gr.width, midY = gy + 28;
    let best: Target | null = null;
    let bestD = Infinity;
    for (const t of d.targets) {
      // el borde izquierdo del bloque arrastrado contra el punto de inserción,
      // o el borde derecho si se acerca por la izquierda
      const dl = Math.hypot(leftX - t.x, midY - t.y);
      const dr = t.before ? Math.hypot(rightX - t.x, midY - t.y) : Infinity;
      const dist = Math.min(dl, dr);
      if (dist < SNAP_DIST && dist < bestD) { best = t; bestD = dist; }
    }
    if (best !== d.current) {
      d.current = best;
      if (best) audio.click();
    }
    if (best) {
      this.marker.style.display = 'block';
      this.marker.style.transform = `translate(${best.x - 4}px, ${best.y - 28}px)`;
    } else {
      this.marker.style.display = 'none';
    }
    const over = this.overCode(x, y);
    d.ghost.classList.toggle('will-delete', !over && d.fromCode);
  }

  private overCode(x: number, y: number): boolean {
    const r = this.el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  private drop(x: number, y: number): void {
    const d = this.drag;
    if (!d) return;
    const sp = store.sprite;
    const target = d.current;
    const over = this.overCode(x, y);
    this.endDrag();
    if (!sp) return;
    if (!target && !over) {
      if (d.fromCode) {
        audio.trash();
        store.mutate(() => this.removeChain(sp, d.chain), 'scripts');
      }
      return;
    }
    store.mutate(() => {
      if (d.fromCode) this.removeChain(sp, d.chain);
      if (target) {
        const list = this.findList(sp, target.sid, target.cont);
        if (list) {
          let idx = target.before ? list.findIndex((b) => b.id === target.before) : list.length;
          if (idx < 0) idx = list.length;
          list.splice(idx, 0, ...d.chain);
          return;
        }
      }
      sp.scripts.push({ id: 'sc' + d.chain[0].id, blocks: d.chain });
    }, 'scripts');
    if (target) audio.click();
  }

  private endDrag(): void {
    const d = this.drag;
    if (!d) return;
    d.ghost.remove();
    d.srcEls.forEach((s) => s.classList.remove('dragging-src'));
    this.marker.style.display = 'none';
    document.body.classList.remove('dragging');
    this.drag = null;
  }

  private findList(sp: Sprite, sid: string, cont: string): Block[] | null {
    const sc = sp.scripts.find((s) => s.id === sid);
    if (!sc) return null;
    if (!cont) return sc.blocks;
    let found: Block[] | null = null;
    const walk = (bs: Block[]) => {
      for (const b of bs) {
        if (found) return;
        if (b.id === cont) { found = b.children ?? (b.children = []); return; }
        if (b.children) walk(b.children);
      }
    };
    walk(sc.blocks);
    return found;
  }

  private removeChain(sp: Sprite, chain: Block[]): void {
    const ids = new Set(chain.map((b) => b.id));
    const strip = (bs: Block[]): Block[] => {
      const out = bs.filter((b) => !ids.has(b.id));
      for (const b of out) if (b.children) b.children = strip(b.children);
      return out;
    };
    for (const sc of sp.scripts) sc.blocks = strip(sc.blocks);
    sp.scripts = sp.scripts.filter((s) => s.blocks.length > 0);
  }

  // ---------- valores ----------

  async editValue(b: Block): Promise<void> {
    const d = def(b.type);
    if (!d.value) return;
    const cur = b.value ?? d.value.def;
    let res: number | string | null = null;
    switch (d.value.kind) {
      case 'num':
        res = await pickNumber(d.value.min ?? 0, d.value.max ?? 99, Number(cur) || 0, d.icon);
        break;
      case 'page': {
        const n = store.project.scenes.length;
        const ch: Choice<number>[] = Array.from({ length: n }, (_, i) => ({ value: i + 1, html: `<span class="page-num">${i + 1}</span>` }));
        res = await pickChoice(ch, '📄');
        break;
      }
      case 'speed':
        res = await pickChoice(SPEEDS.map((s) => ({ value: s.value, icon: s.icon, label: s.label })), '🏃');
        break;
      case 'msg':
        res = await pickChoice(
          Array.from({ length: MAX_MESSAGES }, (_, i) => ({ value: i + 1, color: MSG_COLORS[i], html: '<span class="ci">✉</span>' })),
          '✉',
        );
        break;
      case 'sprite': {
        const others = store.scene.sprites.filter((s) => s.id !== store.spriteId);
        const ch: Choice<string>[] = [{ value: '', icon: '❔', label: 'cualquiera' }];
        for (const o of others) ch.push({ value: o.id, html: `<img class="ci-img" alt="" src="${spriteThumb(o.svg)}"><span class="cl">${escapeHtml(o.name)}</span>` });
        res = await pickChoice(ch, '💥');
        break;
      }
      case 'sound': {
        const sp = store.sprite;
        const n = sp?.sounds.length ?? 0;
        if (!n) { toast('🎤 ➡️ 🎵'); return; }
        res = await pickChoice(Array.from({ length: n }, (_, i) => ({ value: i + 1, html: `<span class="ci">🎵</span><span class="cl">${i + 1}</span>` })), '🎵');
        break;
      }
      case 'text': {
        const ch: Choice<string>[] = SAY_PRESETS.map((t) => ({ value: t, label: t }));
        ch.push({ value: '__custom', icon: '✏️' });
        const pick = await pickChoice(ch, '💬', 'say-picker');
        if (pick === '__custom') res = (await askText('💬', String(cur), 30)) || null;
        else res = pick;
        break;
      }
    }
    if (res === null || res === cur) return;
    const val = res;
    store.mutate(() => { b.value = val; }, 'scripts');
  }
}
