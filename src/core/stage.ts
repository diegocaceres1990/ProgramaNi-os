// Escenario: render en canvas 2D, bucle con delta time, rejilla, hit test y gestos sobre personajes.
import { store, CELL, STAGE_W, STAGE_H, GRID_W, GRID_H } from './state';
import type { Sprite } from './state';
import { Engine, SPRITE_BASE } from './engine';
import { svgImage } from './sprites';

const MIN_BACKING = 640;

export class Stage {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  showGrid = localStorage.getItem('aj-grid') === '1';
  private last = 0;
  private raf = 0;
  private cssW = STAGE_W;
  private dragging: { kind: 'sprite' | 'text'; id: string | number; moved: boolean; sx: number; sy: number; ox: number; oy: number } | null = null;
  /** Llamado en cada fotograma tras actualizar el motor. */
  onFrame: (() => void) | null = null;
  /** Se toca un texto del escenario (sin arrastrar). */
  onTextTap: ((index: number) => void) | null = null;
  /** Se ha soltado un personaje tras moverlo. */
  onSpriteMoved: ((sp: Sprite) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, readonly engine: Engine) {
    this.canvas = canvas;
    const c = canvas.getContext('2d');
    if (!c) throw new Error('canvas 2d no disponible');
    this.ctx = c;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    canvas.addEventListener('pointermove', (e) => this.move(e));
    canvas.addEventListener('pointerup', (e) => this.up(e));
    canvas.addEventListener('pointercancel', () => { this.dragging = null; });
    this.resize(STAGE_W);
  }

  setGrid(on: boolean): void {
    this.showGrid = on;
    localStorage.setItem('aj-grid', on ? '1' : '0');
  }

  /** Ajusta el tamaño visible (px CSS) manteniendo la proporción 4:3. */
  resize(cssW: number): void {
    this.cssW = Math.max(160, cssW);
    const cssH = (this.cssW * STAGE_H) / STAGE_W;
    this.canvas.style.width = `${this.cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    const dpr = window.devicePixelRatio || 1;
    const backW = Math.max(MIN_BACKING, Math.round(this.cssW * dpr));
    this.canvas.width = backW;
    this.canvas.height = Math.round((backW * STAGE_H) / STAGE_W);
  }

  start(): void {
    const loop = (t: number) => {
      const dt = this.last ? (t - this.last) / 1000 : 0;
      this.last = t;
      this.engine.tick(dt);
      this.draw();
      this.onFrame?.();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.last = 0;
  }

  // ---------- dibujo ----------

  draw(): void {
    const ctx = this.ctx;
    const k = this.canvas.width / STAGE_W;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.clearRect(0, 0, STAGE_W, STAGE_H);
    const scene = store.scene;
    const bg = svgImage(scene.bg);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
    if (bg.complete && bg.naturalWidth) ctx.drawImage(bg, 0, 0, STAGE_W, STAGE_H);
    if (this.showGrid) this.drawGrid();

    for (const t of scene.texts) {
      ctx.font = 'bold 22px ui-rounded, "Nunito", "Segoe UI Rounded", "Arial Rounded MT Bold", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#fff';
      ctx.strokeText(t.text, t.x * CELL, t.y * CELL);
      ctx.fillStyle = '#333';
      ctx.fillText(t.text, t.x * CELL, t.y * CELL);
    }

    const running = this.engine.isRunning();
    for (const sp of scene.sprites) this.drawSprite(sp, !running && sp.id === store.spriteId);
    for (const sp of scene.sprites) this.drawBubble(sp);
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(60,80,120,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < GRID_W; i++) { ctx.moveTo(i * CELL + 0.5, 0); ctx.lineTo(i * CELL + 0.5, STAGE_H); }
    for (let j = 1; j < GRID_H; j++) { ctx.moveTo(0, j * CELL + 0.5); ctx.lineTo(STAGE_W, j * CELL + 0.5); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(60,80,120,0.55)';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 1; i <= GRID_W; i++) ctx.fillText(String(i), i * CELL - CELL / 2, 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let j = 1; j <= GRID_H; j++) ctx.fillText(String(j), 2, j * CELL - CELL / 2);
    ctx.restore();
  }

  private drawSprite(sp: Sprite, active: boolean): void {
    const r = this.engine.get(sp);
    if (!r.visible && r.alpha <= 0) {
      if (active) this.drawGhostFrame(sp);
      return;
    }
    const ctx = this.ctx;
    const img = svgImage(sp.svg);
    const size = (SPRITE_BASE * CELL * r.size) / 100;
    const cx = r.x * CELL, cy = (r.y - r.hop) * CELL;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, r.alpha));
    ctx.translate(cx, cy);
    ctx.rotate((r.dir * Math.PI) / 180);
    if (img.complete && img.naturalWidth) ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
    if (active) {
      ctx.save();
      ctx.strokeStyle = 'rgba(76,151,255,0.9)';
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - size / 2 - 3, cy - size / 2 - 3, size + 6, size + 6);
      ctx.restore();
    }
  }

  private drawGhostFrame(sp: Sprite): void {
    const r = this.engine.get(sp);
    const size = (SPRITE_BASE * CELL * r.size) / 100;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.25;
    const img = svgImage(sp.svg);
    if (img.complete && img.naturalWidth) ctx.drawImage(img, r.x * CELL - size / 2, r.y * CELL - size / 2, size, size);
    ctx.restore();
  }

  private drawBubble(sp: Sprite): void {
    const r = this.engine.get(sp);
    if (!r.say || !r.visible) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.font = 'bold 15px ui-rounded, "Nunito", "Segoe UI Rounded", system-ui, sans-serif';
    const words = r.say.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > 140 && line) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line);
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20;
    const h = lines.length * 18 + 14;
    const size = (SPRITE_BASE * CELL * r.size) / 100;
    let bx = r.x * CELL - w / 2;
    let by = (r.y - r.hop) * CELL - size / 2 - h - 12;
    bx = Math.max(2, Math.min(STAGE_W - w - 2, bx));
    by = Math.max(2, by);
    const tipX = Math.max(bx + 12, Math.min(bx + w - 12, r.x * CELL));
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, w, h, 12);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tipX - 7, by + h - 1);
    ctx.lineTo(tipX, by + h + 10);
    ctx.lineTo(tipX + 7, by + h - 1);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#222';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, bx + w / 2, by + 16 + i * 18));
    ctx.restore();
  }

  // ---------- hit test y gestos ----------

  /** Convierte un evento a coordenadas lógicas (px del escenario 480x360). */
  toLogical(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const rc = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - rc.left) / rc.width) * STAGE_W, y: ((e.clientY - rc.top) / rc.height) * STAGE_H };
  }

  hitSprite(x: number, y: number): Sprite | null {
    const sps = store.scene.sprites;
    for (let i = sps.length - 1; i >= 0; i--) {
      const sp = sps[i];
      const r = this.engine.get(sp);
      if (!r.visible && sp.id !== store.spriteId) continue;
      const half = (SPRITE_BASE * CELL * r.size) / 100 / 2;
      const cy = (r.y - r.hop) * CELL;
      if (Math.abs(x - r.x * CELL) <= half && Math.abs(y - cy) <= half) return sp;
    }
    return null;
  }

  hitText(x: number, y: number): number {
    const texts = store.scene.texts;
    this.ctx.font = 'bold 22px system-ui, sans-serif';
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      const w = this.ctx.measureText(t.text).width / 2 + 8;
      if (Math.abs(x - t.x * CELL) <= w && Math.abs(y - t.y * CELL) <= 18) return i;
    }
    return -1;
  }

  private down(e: PointerEvent): void {
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);
    const p = this.toLogical(e);
    const sp = this.hitSprite(p.x, p.y);
    if (sp) {
      store.selectSprite(sp.id);
      const r = this.engine.get(sp);
      this.dragging = { kind: 'sprite', id: sp.id, moved: false, sx: e.clientX, sy: e.clientY, ox: r.x, oy: r.y };
      return;
    }
    const ti = this.hitText(p.x, p.y);
    if (ti >= 0) {
      const t = store.scene.texts[ti];
      this.dragging = { kind: 'text', id: ti, moved: false, sx: e.clientX, sy: e.clientY, ox: t.x, oy: t.y };
    }
  }

  private move(e: PointerEvent): void {
    const d = this.dragging;
    if (!d) return;
    const rc = this.canvas.getBoundingClientRect();
    const cellPx = rc.width / GRID_W;
    const dx = (e.clientX - d.sx) / cellPx, dy = (e.clientY - d.sy) / cellPx;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 8) return;
    d.moved = true;
    const nx = Math.max(0, Math.min(GRID_W, d.ox + dx));
    const ny = Math.max(0, Math.min(GRID_H, d.oy + dy));
    if (d.kind === 'sprite') {
      const sp = store.scene.sprites.find((s) => s.id === d.id);
      if (!sp) return;
      const r = this.engine.get(sp);
      r.x = nx; r.y = ny;
    } else {
      const t = store.scene.texts[d.id as number];
      if (t) { t.x = nx; t.y = ny; }
    }
  }

  private up(e: PointerEvent): void {
    const d = this.dragging;
    this.dragging = null;
    if (!d) return;
    if (d.kind === 'sprite') {
      const sp = store.scene.sprites.find((s) => s.id === d.id);
      if (!sp) return;
      if (d.moved) {
        const r = this.engine.get(sp);
        const nx = Math.round(r.x), ny = Math.round(r.y);
        r.x = nx; r.y = ny;
        store.mutate(() => { sp.x = nx; sp.y = ny; }, 'sprites');
        this.onSpriteMoved?.(sp);
      } else {
        this.engine.tap(sp);
      }
    } else {
      const i = d.id as number;
      const t = store.scene.texts[i];
      if (!t) return;
      if (d.moved) {
        const nx = Math.round(t.x * 2) / 2, ny = Math.round(t.y * 2) / 2;
        t.x = d.ox; t.y = d.oy;
        store.mutate(() => { t.x = nx; t.y = ny; }, 'sprites');
      } else {
        this.onTextTap?.(i);
      }
    }
    void e;
  }
}
