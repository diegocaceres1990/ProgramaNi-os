// Motor de ejecución: hilos en paralelo (generadores), acciones interpoladas,
// disparadores (bandera, toque, choque, mensajes), cambio de página y registro de eventos.
import { GRID_W, GRID_H } from './state';
import type { Block, BlockType, Scene, Script, Sprite } from './state';
import * as audio from './audio';

/** Tamaño base de un personaje en celdas (64 px lógicos) a tamaño 100. */
export const SPRITE_BASE = 64 / 24;

export interface Runtime {
  x: number; y: number; dir: number; size: number; visible: boolean;
  alpha: number; hop: number; speed: number; say: string | null;
}

export type EventKind =
  | 'flag' | 'tap' | 'move' | 'turn' | 'hop' | 'home' | 'say' | 'wait' | 'send' | 'receive'
  | 'bump' | 'sound' | 'pop' | 'page' | 'end' | 'speed' | 'grow' | 'shrink' | 'hide' | 'show'
  | 'resetSize' | 'repeat' | 'forever' | 'stop';

export interface RunEvent {
  t: number; kind: EventKind; sprite?: string; value?: number | string; other?: string; scene?: number;
}

interface Wait { dur: number; el: number; fn?: (p: number) => void; cond?: () => boolean }

interface Thread {
  sprite: Sprite; script: Script; gen: Generator<Wait, boolean, void>; wait: Wait | null; done: boolean;
}

export const TRIGGERS: BlockType[] = ['onFlag', 'onTap', 'onBump', 'onMessage'];
// "enviar" es amarillo pero es una acción, no un disparador.

const STEP_TIME = [0.5, 0.25, 0.1]; // segundos por celda (lenta, normal, rápida)
const SAY_TIME = 2;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const num = (v: unknown, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export class Engine {
  rt = new Map<string, Runtime>();
  threads: Thread[] = [];
  log: RunEvent[] = [];
  time = 0;
  active = false;
  private touching = new Set<string>();
  private pendingPage: number | null = null;
  /** Se llama al cambiar de página con "ir a página". */
  onPage: ((index: number) => void) | null = null;
  /** Se llama cuando un script termina o el motor se detiene. */
  onIdle: (() => void) | null = null;

  constructor(private getScene: () => Scene, private getSceneIndex: () => number) {}

  // ---------- estado de los personajes ----------

  get(sp: Sprite): Runtime {
    let r = this.rt.get(sp.id);
    if (!r) {
      r = this.fresh(sp);
      this.rt.set(sp.id, r);
    }
    return r;
  }

  private fresh(sp: Sprite): Runtime {
    return {
      x: sp.x, y: sp.y, dir: sp.dir, size: sp.size, visible: sp.visible,
      alpha: sp.visible ? 1 : 0, hop: 0, speed: 1, say: null,
    };
  }

  /** Vuelve a colocar un personaje en su casa (tras arrastrarlo o al pulsar la bandera). */
  resetSprite(sp: Sprite): void {
    this.rt.set(sp.id, this.fresh(sp));
  }

  resetScene(): void {
    for (const sp of this.getScene().sprites) this.resetSprite(sp);
  }

  /** Caja de colisión en celdas: [x0, y0, x1, y1]. */
  box(sp: Sprite, shrink = 0.72): [number, number, number, number] {
    const r = this.get(sp);
    const h = (SPRITE_BASE * r.size) / 100 / 2 * shrink;
    const cy = r.y - r.hop;
    return [r.x - h, cy - h, r.x + h, cy + h];
  }

  // ---------- control ----------

  private emit(kind: EventKind, sp?: Sprite, value?: number | string, other?: string): void {
    this.log.push({ t: this.time, kind, sprite: sp?.id, value, other, scene: this.getSceneIndex() });
    if (this.log.length > 3000) this.log.splice(0, 1000);
  }

  isRunning(): boolean {
    return this.threads.length > 0;
  }

  stop(): void {
    const was = this.threads.length > 0;
    this.threads = [];
    this.active = false;
    this.pendingPage = null;
    for (const r of this.rt.values()) { r.say = null; r.hop = 0; }
    audio.stopAllSounds();
    if (was) this.emit('stop');
    this.onIdle?.();
  }

  /** Bandera verde: reinicia posiciones, vacía el registro y arranca los scripts de bandera. */
  greenFlag(): Sprite[] {
    this.stop();
    this.log = [];
    this.time = 0;
    this.resetScene();
    this.emit('flag');
    this.active = true;
    this.primeTouching();
    return this.startFlagScripts();
  }

  private startFlagScripts(): Sprite[] {
    const idle: Sprite[] = [];
    for (const sp of this.getScene().sprites) {
      let started = false;
      for (const sc of sp.scripts) {
        if (sc.blocks[0]?.type === 'onFlag') { this.startScript(sp, sc); started = true; }
      }
      const hasTrigger = sp.scripts.some((s) => TRIGGERS.includes(s.blocks[0]?.type));
      if (!started && sp.scripts.length > 0 && !hasTrigger) idle.push(sp);
    }
    return idle;
  }

  /** Arranca (o reinicia) un script concreto. */
  startScript(sp: Sprite, sc: Script): void {
    this.threads = this.threads.filter((t) => t.script.id !== sc.id);
    const blocks = sc.blocks;
    const body = blocks.length && TRIGGERS.includes(blocks[0].type) ? blocks.slice(1) : blocks;
    this.threads.push({ sprite: sp, script: sc, gen: this.run(sp, body), wait: null, done: false });
    this.active = true;
  }

  /** El niño ha tocado un personaje en el escenario. */
  tap(sp: Sprite): boolean {
    let any = false;
    for (const sc of sp.scripts) {
      if (sc.blocks[0]?.type === 'onTap') {
        if (!any) this.emit('tap', sp);
        any = true;
        this.startScript(sp, sc);
      }
    }
    if (any && !this.active) this.primeTouching();
    return any;
  }

  broadcast(n: number, from?: Sprite): void {
    for (const sp of this.getScene().sprites) {
      for (const sc of sp.scripts) {
        const b = sc.blocks[0];
        if (b?.type === 'onMessage' && num(b.value, 1) === n) {
          this.emit('receive', sp, n, from?.id);
          this.startScript(sp, sc);
        }
      }
    }
  }

  private primeTouching(): void {
    this.touching.clear();
    const sps = this.getScene().sprites;
    for (let i = 0; i < sps.length; i++) {
      for (let j = i + 1; j < sps.length; j++) {
        if (this.overlap(sps[i], sps[j])) this.touching.add(sps[i].id + '|' + sps[j].id);
      }
    }
  }

  private overlap(a: Sprite, b: Sprite): boolean {
    const ra = this.get(a);
    const rb = this.get(b);
    if (!ra.visible || !rb.visible) return false;
    const A = this.box(a);
    const B = this.box(b);
    return A[0] < B[2] && A[2] > B[0] && A[1] < B[3] && A[3] > B[1];
  }

  private checkBumps(): void {
    const sps = this.getScene().sprites;
    for (let i = 0; i < sps.length; i++) {
      for (let j = i + 1; j < sps.length; j++) {
        const key = sps[i].id + '|' + sps[j].id;
        const now = this.overlap(sps[i], sps[j]);
        const before = this.touching.has(key);
        if (now && !before) {
          this.touching.add(key);
          this.fireBump(sps[i], sps[j]);
          this.fireBump(sps[j], sps[i]);
        } else if (!now && before) {
          this.touching.delete(key);
        }
      }
    }
  }

  private fireBump(sp: Sprite, other: Sprite): void {
    for (const sc of sp.scripts) {
      const b = sc.blocks[0];
      if (b?.type === 'onBump' && (!b.value || b.value === other.id)) {
        this.emit('bump', sp, undefined, other.id);
        this.startScript(sp, sc);
      }
    }
  }

  // ---------- bucle ----------

  tick(dt: number): void {
    dt = Math.min(dt, 0.1);
    this.time += dt;
    if (!this.threads.length) {
      if (this.active) this.checkBumps();
      return;
    }
    const list = [...this.threads];
    for (const th of list) {
      if (th.done) continue;
      let guard = 0;
      let first = true;
      while (!th.done && guard++ < 500) {
        const w = th.wait;
        if (w) {
          if (w.cond) {
            if (!w.cond()) break;
          } else {
            if (first) w.el += dt;
            const p = w.dur > 0 ? Math.min(1, w.el / w.dur) : 1;
            w.fn?.(p);
            if (w.el < w.dur) break;
          }
          th.wait = null;
        }
        first = false;
        const r = th.gen.next();
        if (r.done) { th.done = true; break; }
        th.wait = r.value;
        r.value.fn?.(0);
        if (r.value.dur > 0 || r.value.cond) break;
        // espera de un fotograma: se reanuda en el siguiente tick
        break;
      }
      if (this.pendingPage !== null) break;
    }
    this.threads = this.threads.filter((t) => !t.done);
    this.checkBumps();
    if (this.pendingPage !== null) {
      const idx = this.pendingPage;
      this.pendingPage = null;
      this.threads = [];
      for (const r of this.rt.values()) r.say = null;
      this.onPage?.(idx);
      this.emit('page', undefined, idx + 1);
      this.resetScene();
      this.primeTouching();
      this.startFlagScripts();
    }
    if (!this.threads.length) this.onIdle?.();
  }

  // ---------- ejecución de bloques ----------

  private tween(dur: number, fn: (p: number) => void): Wait {
    return { dur, el: 0, fn };
  }

  private frame(): Wait {
    return { dur: 0, el: 0 };
  }

  /** Devuelve true si el script debe terminar (fin / ir a página). */
  private *run(sp: Sprite, blocks: Block[]): Generator<Wait, boolean, void> {
    for (const b of blocks) {
      const stop = yield* this.exec(sp, b);
      if (stop) return true;
    }
    return false;
  }

  private *exec(sp: Sprite, b: Block): Generator<Wait, boolean, void> {
    const r = this.get(sp);
    const step = STEP_TIME[r.speed] ?? STEP_TIME[1];
    switch (b.type) {
      case 'onFlag': case 'onTap': case 'onBump': case 'onMessage':
        return false;
      case 'send': {
        const n = clamp(num(b.value, 1), 1, 6);
        this.emit('send', sp, n);
        this.broadcast(n, sp);
        yield this.frame();
        return false;
      }
      case 'right': case 'left': case 'up': case 'down': {
        const n = clamp(Math.round(num(b.value, 1)), -50, 50);
        const dx = b.type === 'right' ? n : b.type === 'left' ? -n : 0;
        const dy = b.type === 'down' ? n : b.type === 'up' ? -n : 0;
        const x0 = r.x, y0 = r.y;
        const x1 = clamp(x0 + dx, 0, GRID_W), y1 = clamp(y0 + dy, 0, GRID_H);
        const dist = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 0.2);
        yield this.tween(dist * step, (p) => { r.x = x0 + (x1 - x0) * p; r.y = y0 + (y1 - y0) * p; });
        this.emit('move', sp, `${r.x},${r.y}`, b.type);
        return false;
      }
      case 'turnR': case 'turnL': {
        const n = clamp(num(b.value, 1), -24, 24);
        const d0 = r.dir;
        const d1 = d0 + (b.type === 'turnR' ? 30 : -30) * n;
        yield this.tween(Math.max(0.15, Math.abs(n) * step * 0.6), (p) => { r.dir = d0 + (d1 - d0) * p; });
        r.dir = ((d1 % 360) + 360) % 360;
        this.emit('turn', sp, r.dir);
        return false;
      }
      case 'hop': {
        const h = clamp(num(b.value, 2), 0, 15);
        yield this.tween(step * 3, (p) => { r.hop = h * Math.sin(Math.PI * p); });
        r.hop = 0;
        this.emit('hop', sp, h);
        return false;
      }
      case 'home': {
        const x0 = r.x, y0 = r.y, d0 = r.dir;
        yield this.tween(0.3, (p) => {
          r.x = x0 + (sp.x - x0) * p; r.y = y0 + (sp.y - y0) * p; r.dir = d0 + (sp.dir - d0) * p;
        });
        r.hop = 0;
        this.emit('home', sp);
        return false;
      }
      case 'say': {
        const text = String(b.value ?? '¡hola!');
        r.say = text;
        this.emit('say', sp, text);
        yield this.tween(SAY_TIME, () => { r.say = text; });
        if (r.say === text) r.say = null;
        return false;
      }
      case 'grow': case 'shrink': case 'resetSize': {
        const n = num(b.value, 2);
        const s0 = r.size;
        const s1 = b.type === 'resetSize' ? 100 : clamp(s0 + (b.type === 'grow' ? 10 : -10) * n, 20, 400);
        yield this.tween(0.25, (p) => { r.size = s0 + (s1 - s0) * p; });
        this.emit(b.type, sp, s1);
        return false;
      }
      case 'hide': case 'show': {
        const a0 = r.alpha, a1 = b.type === 'show' ? 1 : 0;
        if (b.type === 'show') r.visible = true;
        yield this.tween(0.3, (p) => { r.alpha = a0 + (a1 - a0) * p; });
        r.visible = b.type === 'show';
        this.emit(b.type, sp);
        return false;
      }
      case 'pop': {
        audio.pop();
        this.emit('pop', sp);
        yield this.tween(0.25, () => undefined);
        return false;
      }
      case 'playSound': {
        const idx = clamp(Math.round(num(b.value, 1)), 1, 5) - 1;
        const blob = sp.sounds[idx];
        this.emit('sound', sp, idx + 1, blob ? 'grabado' : 'vacío');
        if (!blob) { yield this.tween(0.2, () => undefined); return false; }
        let finished = false;
        void audio.playBlob(blob).then(() => { finished = true; });
        yield { dur: 0, el: 0, cond: () => finished };
        return false;
      }
      case 'wait': {
        const t = clamp(num(b.value, 10), 0, 600) / 10;
        this.emit('wait', sp, t);
        yield this.tween(t, () => undefined);
        return false;
      }
      case 'speed': {
        const v = String(b.value ?? 'normal');
        r.speed = v === 'lenta' ? 0 : v === 'rapida' ? 2 : 1;
        this.emit('speed', sp, v);
        return false;
      }
      case 'repeat': {
        const n = clamp(Math.round(num(b.value, 4)), 0, 99);
        this.emit('repeat', sp, n);
        for (let i = 0; i < n; i++) {
          const stop = yield* this.run(sp, b.children ?? []);
          if (stop) return true;
          yield this.frame();
        }
        return false;
      }
      case 'forever': {
        this.emit('forever', sp);
        for (;;) {
          const stop = yield* this.run(sp, b.children ?? []);
          if (stop) return true;
          yield this.frame();
        }
      }
      case 'end':
        this.emit('end', sp);
        return true;
      case 'goPage': {
        const n = clamp(Math.round(num(b.value, 1)), 1, 4) - 1;
        this.pendingPage = n;
        yield this.frame();
        return true;
      }
    }
    return false;
  }
}
