// Itinerarios (aventuras, escuela, cuadernos): mapa de lecciones, pantalla de objetivo,
// práctica guiada sobre el editor real, comprobación del reto y estrellas.
import type { Lesson } from '../core/verify';
import { evaluate } from '../core/verify';
import { store } from '../core/state';
import * as db from '../core/db';
import * as audio from '../core/audio';
import { TRACKS, starsOf, setStars, isUnlocked } from '../core/progress';
import type { TrackId } from '../core/progress';
import { ADVENTURES } from '../content/adventures';
import { SCHOOL } from '../content/school';
import { GRADE1 } from '../content/grade1';
import { GRADE2 } from '../content/grade2';
import { openEditor } from './toolbar';
import { runGuide } from './tutorials';
import type { GuideHandle } from './tutorials';
import { toast, confirmBox, fullscreenLayer } from './dialog';

export const ALL_LESSONS: Lesson[] = [...ADVENTURES, ...SCHOOL, ...GRADE1, ...GRADE2];

export function lessonsOf(track: TrackId): Lesson[] {
  return ALL_LESSONS.filter((l) => l.track === track).sort((a, b) => a.num - b.num);
}

export interface TrackNav {
  home(): void;
  tutorials(): void;
}

const stars = (n: number) => '⭐'.repeat(n) + '☆'.repeat(3 - n);

/** Mapa de lecciones de un itinerario. */
export function showTrack(app: HTMLElement, track: TrackId, nav: TrackNav): void {
  const info = TRACKS.find((t) => t.id === track)!;
  const lessons = lessonsOf(track);
  const ids = lessons.map((l) => l.id);
  app.innerHTML = `
    <div class="screen track-screen" style="--track:${info.color}">
      <div class="screen-head">
        <button class="round-btn" id="track-back" aria-label="volver">🏠</button>
        <div class="screen-title"><span>${info.icon}</span><span>${info.name}</span></div>
      </div>
      <div class="lesson-map"></div>
    </div>`;
  app.querySelector('#track-back')!.addEventListener('click', () => { audio.tap(); nav.home(); });
  const map = app.querySelector<HTMLElement>('.lesson-map')!;
  let lastModule = '';
  let nextMarked = false;
  lessons.forEach((l, i) => {
    if (l.module && l.module !== lastModule) {
      lastModule = l.module;
      const mt = document.createElement('div');
      mt.className = 'module-title';
      mt.textContent = l.module;
      map.appendChild(mt);
    }
    const unlocked = isUnlocked(ids, i);
    const st = starsOf(l.id);
    const node = document.createElement('button');
    node.className = 'lesson-node' + (unlocked ? '' : ' locked') + (st ? ' done' : '');
    if (unlocked && !st && !nextMarked) { node.classList.add('next'); nextMarked = true; }
    node.dataset.lesson = l.id;
    node.innerHTML = `<span class="ln-num">${l.num}</span><span class="ln-icon">${l.icon}</span>
      <span class="ln-title"></span><span class="ln-stars">${stars(st)}</span>`;
    (node.querySelector('.ln-title') as HTMLElement).textContent = l.title;
    node.setAttribute('aria-label', `${l.num}. ${l.title}`);
    node.addEventListener('click', () => {
      if (!unlocked) { audio.oops(); toast(`🔒 ⬅️ ${l.num - 1}`); return; }
      audio.tap();
      showIntro(app, l, nav);
    });
    map.appendChild(node);
  });
}

/** Pantalla de objetivo: 3 viñetas, actividad desconectada (escuela) y el reto. */
export function showIntro(app: HTMLElement, l: Lesson, nav: TrackNav): void {
  app.innerHTML = `
    <div class="screen">
      <div class="screen-head">
        <button class="round-btn" id="intro-back" aria-label="volver">⬅️</button>
        <span class="tb-gap"></span>
        <button class="round-btn" id="intro-reset" aria-label="empezar de cero" style="display:none">🔄</button>
      </div>
      <div class="intro">
        <div class="intro-title"></div>
        <div class="vignettes"></div>
        <div class="unplugged-slot"></div>
        <div class="challenge-card"><span class="cc-icon">🎯</span><span class="cc-text"></span></div>
        <button class="go-btn" id="intro-go" aria-label="empezar">▶️ ¡vamos!</button>
      </div>
    </div>`;
  (app.querySelector('.intro-title') as HTMLElement).textContent = `${l.icon} ${l.num}. ${l.title}`;
  const vg = app.querySelector<HTMLElement>('.vignettes')!;
  l.goals.forEach((g, i) => {
    const v = document.createElement('div');
    v.className = 'vignette';
    v.innerHTML = `<div class="vg-num">${i + 1}</div><div class="vg-pic">${g.pic}</div><div class="vg-text"></div>`;
    (v.querySelector('.vg-text') as HTMLElement).textContent = g.text;
    vg.appendChild(v);
  });
  if (l.unplugged) {
    const u = document.createElement('div');
    u.className = 'unplugged';
    u.innerHTML = `<h3>🧍 sin pantalla: </h3><ol></ol>`;
    u.querySelector('h3')!.textContent = `🧍 sin pantalla: ${l.unplugged.title}`;
    const ol = u.querySelector('ol')!;
    for (const s of l.unplugged.steps) { const li = document.createElement('li'); li.textContent = s; ol.appendChild(li); }
    app.querySelector('.unplugged-slot')!.appendChild(u);
  }
  (app.querySelector('.cc-text') as HTMLElement).textContent = l.challenge;
  app.querySelector('#intro-back')!.addEventListener('click', () => { audio.tap(); showTrack(app, l.track, nav); });
  app.querySelector('#intro-go')!.addEventListener('click', () => { audio.tap(); void startLesson(app, l, nav); });
  const reset = app.querySelector<HTMLElement>('#intro-reset')!;
  void db.loadProject('lesson-' + l.id).then((saved) => {
    if (!saved) return;
    reset.style.display = '';
    reset.addEventListener('click', async () => {
      if (!(await confirmBox('🔄 🧩', '🔄'))) return;
      await db.deleteProject('lesson-' + l.id);
      reset.style.display = 'none';
      audio.trash();
    });
  });
}

/** Abre el editor real con el estado inicial de la lección (o lo guardado) y la barra del reto. */
export async function startLesson(app: HTMLElement, l: Lesson, nav: TrackNav): Promise<void> {
  const id = 'lesson-' + l.id;
  let p = await db.loadProject(id);
  const fresh = !p;
  if (!p) {
    p = l.start();
    p.id = id;
    await db.saveProject(p);
  }
  let guide: GuideHandle | null = null;
  const lessons = lessonsOf(l.track);
  openEditor(app, p, {
    lockName: true,
    onHome: () => { guide?.close(); showTrack(app, l.track, nav); },
    onHelp: () => { guide?.close(); nav.tutorials(); },
    setup: (ctx) => {
      const bar = document.createElement('div');
      bar.className = 'lesson-bar';
      bar.innerHTML = `<span class="lb-icon">🎯</span><span class="lb-text"></span>
        <button class="lb-btn" data-act="guide" aria-label="ver la guía">👣</button>
        <button class="lb-btn lb-check" data-act="check" aria-label="comprobar">✓</button>`;
      (bar.querySelector('.lb-text') as HTMLElement).textContent = l.challenge;
      ctx.slot.appendChild(bar);
      bar.querySelector('[data-act="guide"]')!.addEventListener('click', () => { audio.tap(); guide?.close(); guide = runGuide(l.guide, () => undefined); });
      bar.querySelector('[data-act="check"]')!.addEventListener('click', async () => {
        await ctx.save();
        const res = evaluate(l, store.project);
        if (!res.ok) {
          audio.oops();
          toast(`<span class="big">💡</span> ${res.hint}`, 5000);
          return;
        }
        guide?.close();
        setStars(l.id, 3);
        audio.success();
        confetti();
        const idx = lessons.findIndex((x) => x.id === l.id);
        const next = lessons[idx + 1];
        celebrate(l, res.rubric, !!next, (goNext) => {
          ctx.close();
          if (goNext && next) showIntro(app, next, nav);
          else showTrack(app, l.track, nav);
        });
      });
      if (fresh) guide = runGuide(l.guide, () => undefined);
      const origClose = ctx.close;
      ctx.close = () => { guide?.close(); origClose(); };
    },
  });
}

function celebrate(l: Lesson, rubric: { label: string; ok: boolean }[] | undefined, hasNext: boolean, done: (next: boolean) => void): void {
  const { root, close } = fullscreenLayer('dlg-overlay open celebrate');
  root.innerHTML = `<div class="dlg-box">
      <div class="dlg-icon">🎉</div>
      <div class="big-stars"><span>⭐</span><span>⭐</span><span>⭐</span></div>
      <div class="dlg-msg"></div>
      <div class="rubric"></div>
      <div class="dlg-foot">
        <button class="round-btn" data-act="map" aria-label="mapa">🗺️</button>
        ${hasNext ? '<button class="round-btn yes" data-act="next" aria-label="siguiente">▶️</button>' : ''}
      </div>
    </div>`;
  (root.querySelector('.dlg-msg') as HTMLElement).textContent = `¡reto superado! ${l.icon} ${l.title}`;
  const rb = root.querySelector<HTMLElement>('.rubric')!;
  for (const r of rubric ?? []) {
    const d = document.createElement('div');
    d.className = r.ok ? 'ok' : 'ko';
    d.textContent = `${r.ok ? '✅' : '❌'} ${r.label}`;
    rb.appendChild(d);
  }
  root.querySelector('[data-act="map"]')!.addEventListener('click', () => { audio.tap(); close(); done(false); });
  root.querySelector('[data-act="next"]')?.addEventListener('click', () => { audio.tap(); close(); done(true); });
}

function confetti(): void {
  const colors = ['#FFD23F', '#4C97FF', '#9966FF', '#4CBF56', '#FFAB19', '#FF4C4C'];
  for (let i = 0; i < 60; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = `${Math.random() * 100}vw`;
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = `${1.6 + Math.random() * 1.6}s`;
    c.style.animationDelay = `${Math.random() * 0.5}s`;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4000);
  }
}
