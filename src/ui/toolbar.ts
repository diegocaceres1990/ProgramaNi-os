// Editor: barra superior, columna de personajes, columna de escenas, paleta, área de código,
// biblioteca de personajes/fondos, grabadora y autoguardado.
import { store, makeSprite, makeScene, MAX_SCENES, MAX_SOUNDS, MAX_SPRITES } from '../core/state';
import type { Project, Sprite } from '../core/state';
import { Engine } from '../core/engine';
import { Stage } from '../core/stage';
import { CodeArea } from '../core/scripting';
import { renderPalette, spriteThumb, escapeHtml } from '../core/blocks';
import type { Category } from '../core/blocks';
import { SPRITE_LIBRARY, BG_LIBRARY } from '../core/sprites';
import { openPaint } from '../core/paint';
import * as audio from '../core/audio';
import * as db from '../core/db';
import { pickChoice, askText, confirmBox, toast, fullscreenLayer } from './dialog';
import type { Choice } from './dialog';

export interface EditorCtx {
  root: HTMLElement;
  engine: Engine;
  stage: Stage;
  code: CodeArea;
  /** Hueco bajo la barra superior para la barra de lección o tutorial. */
  slot: HTMLElement;
  save(): Promise<void>;
  close(): void;
}

export interface EditorOpts {
  onHome(): void;
  onHelp(): void;
  /** Permite a lecciones y tutoriales añadir su interfaz. */
  setup?: (ctx: EditorCtx) => void;
  /** Ocultar el nombre editable (lecciones). */
  lockName?: boolean;
}

const LONG_PRESS = 600;

/** Pulsación larga con feedback visual. Devuelve una función para saber si el último toque fue largo. */
function longPress(el: HTMLElement, cb: () => void): () => boolean {
  let timer = 0;
  let fired = false;
  let sx = 0, sy = 0;
  el.addEventListener('pointerdown', (e) => {
    fired = false;
    sx = e.clientX; sy = e.clientY;
    el.classList.add('pressing');
    timer = window.setTimeout(() => {
      fired = true;
      el.classList.remove('pressing');
      if (navigator.vibrate) navigator.vibrate(30);
      cb();
    }, LONG_PRESS);
  });
  const cancel = () => { window.clearTimeout(timer); el.classList.remove('pressing'); };
  el.addEventListener('pointermove', (e) => { if (Math.hypot(e.clientX - sx, e.clientY - sy) > 10) cancel(); });
  el.addEventListener('pointerup', cancel);
  el.addEventListener('pointerleave', cancel);
  el.addEventListener('pointercancel', cancel);
  return () => fired;
}

function makeThumbnail(canvas: HTMLCanvasElement): string {
  const c = document.createElement('canvas');
  c.width = 160; c.height = 120;
  c.getContext('2d')!.drawImage(canvas, 0, 0, 160, 120);
  return c.toDataURL('image/jpeg', 0.7);
}

/** Monta el editor sobre `app` con el proyecto indicado. */
export function openEditor(app: HTMLElement, project: Project, opts: EditorOpts): EditorCtx {
  app.innerHTML = `
    <div class="editor">
      <header class="topbar">
        <button class="tb-btn flag" id="btn-flag" aria-label="empezar">🚩</button>
        <button class="tb-btn stop" id="btn-stop" aria-label="parar">⏹️</button>
        <button class="proj-name" id="proj-name" aria-label="nombre del proyecto"></button>
        <span class="tb-gap"></span>
        <button class="tb-btn" id="btn-bg" aria-label="fondo">🖼️</button>
        <button class="tb-btn" id="btn-text" aria-label="texto">🔤</button>
        <button class="tb-btn" id="btn-grid" aria-label="rejilla">#</button>
        <button class="tb-btn" id="btn-mute" aria-label="silencio"></button>
        <button class="tb-btn" id="btn-home" aria-label="inicio">🏠</button>
        <button class="tb-btn help" id="btn-help" aria-label="ayuda">❓</button>
      </header>
      <div class="lesson-slot"></div>
      <div class="mid">
        <aside class="sprite-col" id="sprite-col"></aside>
        <div class="stage-wrap" id="stage-wrap"><canvas id="stage"></canvas></div>
        <aside class="scene-col" id="scene-col"></aside>
      </div>
      <div class="bottom">
        <div class="palette" id="palette"></div>
        <div class="code-wrap">
          <div class="code-tools">
            <img class="code-sprite" id="code-sprite" alt="">
            <button class="ct-btn" id="btn-paint" aria-label="pintar personaje">🖌️</button>
            <span class="tb-gap"></span>
            <button class="ct-btn" id="btn-undo" aria-label="deshacer">↶</button>
            <button class="ct-btn" id="btn-redo" aria-label="rehacer">↷</button>
          </div>
          <div id="code-area"></div>
        </div>
      </div>
    </div>`;

  const root = app.querySelector<HTMLElement>('.editor')!;
  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>('#' + id)!;
  store.load(project);

  const engine = new Engine(() => store.scene, () => store.sceneIndex);
  const stage = new Stage($<HTMLCanvasElement>('stage'), engine);
  const code = new CodeArea($('code-area'));
  let paletteCat: Category = 'start';
  let deleteSprite: string | null = null;
  let deleteScene: number | null = null;
  let closed = false;

  // ---------- guardado ----------
  let saving = false;
  const save = async () => {
    if (saving) return;
    saving = true;
    try {
      store.dirty = false;
      await db.saveProject(store.project);
      if (store.sceneIndex === 0) await db.saveThumb(store.project.id, makeThumbnail(stage.canvas));
    } catch (err) {
      store.dirty = true;
      console.error('no se pudo guardar', err);
    } finally {
      saving = false;
    }
  };
  const autosave = window.setInterval(() => { if (store.dirty) void save(); }, 3000);
  const onHide = () => { if (document.visibilityState === 'hidden' && store.dirty) void save(); };
  document.addEventListener('visibilitychange', onHide);

  // ---------- render ----------
  const renderName = () => {
    const n = $('proj-name');
    n.textContent = store.project.name;
    n.classList.toggle('locked', !!opts.lockName);
  };

  const renderSprites = () => {
    const col = $('sprite-col');
    col.innerHTML = '';
    for (const sp of store.scene.sprites) {
      const item = document.createElement('div');
      item.className = 'sprite-thumb' + (sp.id === store.spriteId ? ' active' : '') + (deleteSprite === sp.id ? ' deleting' : '');
      item.dataset.sid = sp.id;
      item.innerHTML = `<img alt="" src="${spriteThumb(sp.svg)}"><span class="st-name">${escapeHtml(sp.name)}</span>`;
      const wasLong = longPress(item, () => { deleteSprite = sp.id; renderSprites(); });
      item.addEventListener('click', () => {
        if (wasLong()) return;
        if (deleteSprite && deleteSprite !== sp.id) deleteSprite = null;
        audio.tap();
        store.selectSprite(sp.id);
        renderSprites();
      });
      if (deleteSprite === sp.id) {
        const x = document.createElement('button');
        x.className = 'del-x';
        x.textContent = '✕';
        x.setAttribute('aria-label', 'borrar personaje');
        x.addEventListener('click', (e) => {
          e.stopPropagation();
          audio.trash();
          deleteSprite = null;
          store.mutate(() => {
            store.scene.sprites = store.scene.sprites.filter((s) => s.id !== sp.id);
            if (store.spriteId === sp.id) store.spriteId = store.scene.sprites[0]?.id ?? null;
          }, 'project');
        });
        item.appendChild(x);
      }
      col.appendChild(item);
    }
    const add = document.createElement('button');
    add.className = 'add-btn blue';
    add.id = 'sprite-add';
    add.textContent = '+';
    add.setAttribute('aria-label', 'añadir personaje');
    add.addEventListener('click', () => { audio.tap(); deleteSprite = null; void addSprite(); });
    col.appendChild(add);
    const sp = store.sprite;
    const img = $<HTMLImageElement>('code-sprite');
    img.src = sp ? spriteThumb(sp.svg) : '';
    img.style.visibility = sp ? 'visible' : 'hidden';
  };

  const renderScenes = () => {
    const col = $('scene-col');
    col.innerHTML = '';
    store.project.scenes.forEach((sc, i) => {
      const item = document.createElement('div');
      item.className = 'scene-thumb' + (i === store.sceneIndex ? ' active' : '');
      item.dataset.idx = String(i);
      item.innerHTML = `<img alt="" src="${spriteThumb(sc.bg)}"><span class="sc-num">${i + 1}</span>`;
      const wasLong = longPress(item, () => { if (store.project.scenes.length > 1) { deleteScene = i; renderScenes(); } });
      item.addEventListener('click', () => {
        if (wasLong()) return;
        deleteScene = null;
        audio.tap();
        if (i !== store.sceneIndex) { void save(); store.selectScene(i); } else renderScenes();
      });
      if (deleteScene === i) {
        const x = document.createElement('button');
        x.className = 'del-x';
        x.textContent = '✕';
        x.setAttribute('aria-label', 'borrar escena');
        x.addEventListener('click', (e) => {
          e.stopPropagation();
          audio.trash();
          deleteScene = null;
          store.mutate((p) => {
            p.scenes.splice(i, 1);
            if (store.sceneIndex >= p.scenes.length) store.sceneIndex = p.scenes.length - 1;
            store.spriteId = store.scene.sprites[0]?.id ?? null;
          }, 'project');
        });
        item.appendChild(x);
      }
      col.appendChild(item);
    });
    if (store.project.scenes.length < MAX_SCENES) {
      const add = document.createElement('button');
      add.className = 'add-btn';
      add.id = 'scene-add';
      add.textContent = '+';
      add.setAttribute('aria-label', 'añadir escena');
      add.addEventListener('click', () => {
        audio.tap();
        void save();
        store.mutate((p) => { p.scenes.push(makeScene(true)); }, 'project', true);
        store.selectScene(store.project.scenes.length - 1);
      });
      col.appendChild(add);
    }
  };

  const renderPal = () => {
    renderPalette($('palette'), paletteCat, (c) => { audio.tap(); paletteCat = c; renderPal(); },
      (type, ev, el) => code.startPaletteDrag(type, ev, el),
      (cat, list) => {
        if (cat !== 'sound') return;
        const rec = document.createElement('button');
        rec.className = 'rec-btn';
        rec.id = 'btn-record';
        rec.innerHTML = '🎤';
        rec.setAttribute('aria-label', 'grabar sonido');
        rec.addEventListener('click', () => { audio.tap(); const sp = store.sprite; if (sp) openRecorder(sp); else toast('👈 ➕'); });
        list.appendChild(rec);
      });
  };

  const renderMute = () => { $('btn-mute').textContent = audio.isMuted() ? '🔇' : '🔊'; };
  const renderGrid = () => { $('btn-grid').classList.toggle('sel', stage.showGrid); };
  const renderUndo = () => {
    ($('btn-undo') as HTMLButtonElement).disabled = !store.canUndo();
    ($('btn-redo') as HTMLButtonElement).disabled = !store.canRedo();
  };

  const renderAll = () => { renderName(); renderSprites(); renderScenes(); renderPal(); code.render(); renderMute(); renderGrid(); renderUndo(); };

  const unsub = store.subscribe((reason) => {
    if (closed) return;
    switch (reason) {
      case 'load':
        engine.stop(); engine.rt.clear(); renderAll(); break;
      case 'scene':
        engine.stop(); engine.resetScene(); deleteSprite = null; renderSprites(); renderScenes(); code.render(); break;
      case 'selection':
        renderSprites(); code.render(); break;
      case 'scripts':
        code.render(); renderUndo(); break;
      case 'sprites':
        renderSprites(); renderUndo(); break;
      case 'project':
        if (!engine.isRunning()) engine.resetScene();
        renderAll(); break;
    }
  });

  // ---------- acciones ----------
  const addSprite = async () => {
    if (store.scene.sprites.length >= MAX_SPRITES) { toast('✋ 12'); return; }
    const choices: Choice<string>[] = SPRITE_LIBRARY.map((s) => ({ value: s.key, html: `<img class="ci-img" alt="" src="${spriteThumb(s.svg)}"><span class="cl">${s.name}</span>` }));
    choices.unshift({ value: '__paint', html: '<span class="ci">🖌️</span><span class="cl">dibujar</span>' });
    const key = await pickChoice(choices, '➕', 'library');
    if (!key) return;
    let sp: Sprite;
    const n = store.scene.sprites.length;
    const x = 3 + ((n * 4) % 16), y = 9 - (n % 3) * 3;
    if (key === '__paint') {
      const res = await openPaint('sprite', null, '');
      if (!res) return;
      sp = makeSprite('gato', x, y, res.name);
      sp.svg = res.svg;
    } else {
      sp = makeSprite(key, x, y);
    }
    store.mutate(() => { store.scene.sprites.push(sp); store.spriteId = sp.id; }, 'project');
  };

  const paintSprite = async () => {
    const sp = store.sprite;
    if (!sp) { toast('👈 ➕'); return; }
    const res = await openPaint('sprite', sp.svg, sp.name);
    if (!res) return;
    store.mutate(() => { sp.svg = res.svg; sp.name = res.name; }, 'project');
  };

  const chooseBg = async () => {
    const choices: Choice<string>[] = BG_LIBRARY.map((b) => ({ value: b.key, html: `<img class="ci-bg" alt="" src="${spriteThumb(b.svg)}"><span class="cl">${b.name}</span>` }));
    choices.unshift(
      { value: '__paint', html: '<span class="ci">🖌️</span><span class="cl">dibujar</span>' },
      { value: '__edit', html: `<img class="ci-bg" alt="" src="${spriteThumb(store.scene.bg)}"><span class="cl">✏️</span>` },
    );
    const key = await pickChoice(choices, '🖼️', 'library');
    if (!key) return;
    let svg: string | null = null;
    if (key === '__paint' || key === '__edit') {
      const res = await openPaint('bg', key === '__edit' ? store.scene.bg : null);
      if (!res) return;
      svg = res.svg;
    } else {
      svg = BG_LIBRARY.find((b) => b.key === key)?.svg ?? null;
    }
    if (svg) { const s = svg; store.mutate(() => { store.scene.bg = s; }, 'project'); }
  };

  const addText = async () => {
    const t = await askText('🔤', '', 30);
    if (!t) return;
    store.mutate(() => { store.scene.texts.push({ x: 10, y: 2, text: t }); }, 'project');
  };

  stage.onTextTap = async (i) => {
    const t = store.scene.texts[i];
    if (!t) return;
    const act = await pickChoice<string>([{ value: 'edit', icon: '✏️' }, { value: 'del', icon: '🗑️' }], '🔤');
    if (act === 'edit') {
      const nt = await askText('🔤', t.text, 30);
      if (nt) store.mutate(() => { t.text = nt; }, 'project');
    } else if (act === 'del') {
      audio.trash();
      store.mutate(() => { store.scene.texts.splice(i, 1); }, 'project');
    }
  };

  stage.onSpriteMoved = () => renderUndo();

  code.onRunScript = (sp, sc) => { code.hideBulb(); engine.startScript(sp, sc); };

  engine.onPage = (idx) => {
    if (idx < store.project.scenes.length && idx !== store.sceneIndex) {
      store.sceneIndex = idx;
      store.spriteId = store.scene.sprites[0]?.id ?? null;
      renderSprites(); renderScenes(); code.render();
    }
  };

  $('btn-flag').addEventListener('click', () => {
    audio.tap();
    code.hideBulb();
    const idle = engine.greenFlag();
    const any = store.scene.sprites.some((s) => s.scripts.length > 0);
    if (idle.length > 0 || (any && !engine.isRunning())) code.showBulb();
  });
  $('btn-stop').addEventListener('click', () => { audio.tap(); engine.stop(); });
  $('btn-bg').addEventListener('click', () => { audio.tap(); void chooseBg(); });
  $('btn-text').addEventListener('click', () => { audio.tap(); void addText(); });
  $('btn-grid').addEventListener('click', () => { audio.tap(); stage.setGrid(!stage.showGrid); renderGrid(); });
  $('btn-mute').addEventListener('click', () => { audio.setMuted(!audio.isMuted()); audio.tap(); renderMute(); });
  $('btn-home').addEventListener('click', async () => { audio.tap(); await save(); ctx.close(); opts.onHome(); });
  $('btn-help').addEventListener('click', async () => { audio.tap(); await save(); opts.onHelp(); });
  $('btn-paint').addEventListener('click', () => { audio.tap(); void paintSprite(); });
  $('btn-undo').addEventListener('click', () => { audio.tap(); engine.stop(); store.undo(); });
  $('btn-redo').addEventListener('click', () => { audio.tap(); engine.stop(); store.redo(); });
  $('proj-name').addEventListener('click', async () => {
    if (opts.lockName) return;
    const n = await askText('📝', store.project.name, 30);
    if (n) store.mutate((p) => { p.name = n; }, 'project', false);
  });

  // ---------- tamaño ----------
  const layout = () => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const slotH = root.querySelector<HTMLElement>('.lesson-slot')!.offsetHeight;
    const availW = vw - 72 - 56 - 16;
    // la zona de paleta + código se queda con al menos 280 px (2 filas de pestañas + bloques visibles)
    const availH = vh - 48 - slotH - 280 - 12;
    const w = Math.max(240, Math.min(availW, (availH * 4) / 3));
    stage.resize(w);
  };
  window.addEventListener('resize', layout);

  let frame = 0;
  let wasRunning = false;
  stage.onFrame = () => {
    if (++frame % 6) return;
    const running = engine.isRunning();
    if (running || wasRunning) {
      const ids = new Set(engine.threads.filter((t) => t.sprite.id === store.spriteId).map((t) => t.script.id));
      code.setRunning(ids);
      $('btn-flag').classList.toggle('running', running);
    }
    wasRunning = running;
  };

  const ctx: EditorCtx = {
    root, engine, stage, code, slot: root.querySelector<HTMLElement>('.lesson-slot')!, save,
    close() {
      if (closed) return;
      closed = true;
      engine.stop();
      stage.stop();
      unsub();
      window.clearInterval(autosave);
      window.removeEventListener('resize', layout);
      document.removeEventListener('visibilitychange', onHide);
      document.querySelectorAll('.snap-marker').forEach((m) => m.remove());
      if (store.dirty) void db.saveProject(store.project);
    },
  };

  renderAll();
  engine.resetScene();
  opts.setup?.(ctx);
  layout();
  requestAnimationFrame(layout);
  stage.start();
  return ctx;
}

/** Grabadora de sonidos del personaje (máximo 5, 10 s cada uno). */
export function openRecorder(sp: Sprite): void {
  const { root, close } = fullscreenLayer('recorder');
  let rec: audio.Recording | null = null;
  let t0 = 0;
  let raf = 0;
  const render = () => {
    root.innerHTML = `
      <div class="rec-box">
        <div class="rec-head"><img alt="" src="${spriteThumb(sp.svg)}"> 🎤</div>
        <div class="rec-list"></div>
        <div class="rec-meter"><div class="rec-level"></div></div>
        <div class="rec-time"></div>
        <div class="dlg-foot">
          <button class="round-btn rec-main" aria-label="grabar"></button>
          <button class="round-btn yes" data-act="close" aria-label="listo">✓</button>
        </div>
      </div>`;
    const list = root.querySelector<HTMLElement>('.rec-list')!;
    sp.sounds.forEach((blob, i) => {
      const row = document.createElement('div');
      row.className = 'rec-item';
      row.innerHTML = `<button class="round-btn play" aria-label="escuchar">▶️ ${i + 1}</button><button class="round-btn no" aria-label="borrar">🗑️</button>`;
      row.querySelector('.play')!.addEventListener('click', () => { void audio.playBlob(blob); });
      row.querySelector('.no')!.addEventListener('click', async () => {
        if (!(await confirmBox('🗑️ 🎵 ' + (i + 1), '🗑️'))) return;
        audio.trash();
        store.mutate(() => { sp.sounds.splice(i, 1); }, 'scripts');
        render();
      });
      list.appendChild(row);
    });
    const main = root.querySelector<HTMLButtonElement>('.rec-main')!;
    const full = sp.sounds.length >= MAX_SOUNDS;
    main.textContent = rec ? '⏹️' : '⏺️';
    main.classList.toggle('recording', !!rec);
    main.disabled = full && !rec;
    main.addEventListener('click', () => { void toggle(); });
    root.querySelector('[data-act="close"]')!.addEventListener('click', async () => {
      if (rec) await finish();
      cancelAnimationFrame(raf);
      close();
    });
  };
  const finish = async () => {
    if (!rec) return;
    const r = rec;
    rec = null;
    cancelAnimationFrame(raf);
    const blob = await r.stop();
    if (blob.size > 0 && sp.sounds.length < MAX_SOUNDS) {
      store.mutate(() => { sp.sounds.push(blob); }, 'scripts');
      audio.success();
    }
    render();
  };
  const tickUI = () => {
    if (!rec) return;
    const el = (performance.now() - t0) / 1000;
    const lv = root.querySelector<HTMLElement>('.rec-level');
    const tm = root.querySelector<HTMLElement>('.rec-time');
    if (lv) lv.style.width = `${Math.round(rec.level() * 100)}%`;
    if (tm) tm.textContent = `${Math.min(10, el).toFixed(1)} / 10`;
    raf = requestAnimationFrame(tickUI);
  };
  const toggle = async () => {
    if (rec) { await finish(); return; }
    try {
      rec = await audio.startRecording(10);
    } catch {
      toast('🎤 🚫');
      return;
    }
    t0 = performance.now();
    const current = rec;
    void current.done.then(() => { if (rec === current) void finish(); });
    render();
    tickUI();
  };
  render();
}
