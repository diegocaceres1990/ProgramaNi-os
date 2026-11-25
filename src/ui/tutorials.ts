// Guía con flechas sobre la interfaz real (usada por lecciones y tutoriales) y pantalla de tutoriales.
import type { GuideStep, Tutorial } from '../core/verify';
import { evaluate } from '../core/verify';
import { store } from '../core/state';
import type { BlockType } from '../core/state';
import * as audio from '../core/audio';
import { def } from '../core/blocks';
import { isTutorialSeen, markTutorialSeen } from '../core/progress';
import { TUTORIALS } from '../content/tutorials';
import { openEditor } from './toolbar';
import { showMessage, toast } from './dialog';

export interface GuideHandle { close(): void }

/**
 * Muestra los pasos de una guía señalando elementos reales con un aro, una flecha y una burbuja.
 * La interfaz sigue siendo usable mientras tanto (la capa no captura toques salvo la burbuja).
 */
export function runGuide(steps: GuideStep[], onFinish: (skipped: boolean) => void): GuideHandle {
  const layer = document.createElement('div');
  layer.className = 'guide-layer';
  const ring = document.createElement('div');
  ring.className = 'guide-ring';
  const arrow = document.createElement('div');
  arrow.className = 'guide-arrow';
  const bubble = document.createElement('div');
  bubble.className = 'guide-bubble';
  layer.append(ring, arrow, bubble);
  document.body.appendChild(layer);
  let i = 0;
  let closed = false;

  /** Abre la pestaña de la paleta que contiene lo que señala el paso. */
  const reveal = (sel: string) => {
    if (document.querySelector(sel)) return;
    const type = /\.palette-block\[data-type="(\w+)"\]/.exec(sel)?.[1];
    const cat = type ? def(type as BlockType).cat : sel === '#btn-record' ? 'sound' : null;
    if (cat) document.querySelector<HTMLElement>(`.palette-cat[data-cat="${cat}"]`)?.click();
  };

  const render = () => {
    const st = steps[i];
    reveal(st.sel);
    bubble.innerHTML = `<span class="gb-icon">${st.icon ?? '👉'}</span><span class="gb-text"></span>
      <span class="gb-step">${i + 1}/${steps.length}</span>`;
    (bubble.querySelector('.gb-text') as HTMLElement).textContent = st.text;
    const prev = document.createElement('button');
    prev.className = 'round-btn';
    prev.textContent = '◀';
    prev.setAttribute('aria-label', 'anterior');
    prev.disabled = i === 0;
    prev.addEventListener('click', () => { audio.tap(); i = Math.max(0, i - 1); render(); });
    const next = document.createElement('button');
    next.className = 'round-btn yes';
    next.textContent = i === steps.length - 1 ? '✓' : '▶';
    next.setAttribute('aria-label', 'siguiente');
    next.addEventListener('click', () => {
      audio.tap();
      if (i < steps.length - 1) { i++; render(); } else finish(false);
    });
    const say = document.createElement('button');
    say.className = 'round-btn';
    say.textContent = '🔊';
    say.setAttribute('aria-label', 'leer en voz alta');
    say.addEventListener('click', () => audio.speak(st.text));
    const skip = document.createElement('button');
    skip.className = 'round-btn no';
    skip.textContent = '✕';
    skip.setAttribute('aria-label', 'saltar guía');
    skip.addEventListener('click', () => { audio.tap(); finish(true); });
    bubble.append(say, prev, next, skip);
    place();
    audio.autoSpeak(st.text);
  };

  const place = () => {
    if (closed) return;
    const st = steps[i];
    const el = document.querySelector<HTMLElement>(st.sel);
    const vw = window.innerWidth, vh = window.innerHeight;
    const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    if (!el || el.getBoundingClientRect().width === 0) {
      ring.style.display = 'none';
      arrow.style.display = 'none';
      bubble.style.left = `${(vw - bw) / 2}px`;
      bubble.style.top = `${Math.max(60, (vh - bh) / 2)}px`;
      return;
    }
    const r = el.getBoundingClientRect();
    ring.style.display = 'block';
    arrow.style.display = 'block';
    ring.style.left = `${r.left - 6}px`;
    ring.style.top = `${r.top - 6}px`;
    ring.style.width = `${r.width + 12}px`;
    ring.style.height = `${r.height + 12}px`;
    const below = r.bottom + 70 + bh < vh;
    const above = r.top - 70 - bh > 0;
    let bx = Math.min(vw - bw - 8, Math.max(8, r.left + r.width / 2 - bw / 2));
    let by: number;
    if (below) {
      arrow.textContent = '⬆️'; arrow.className = 'guide-arrow up';
      arrow.style.left = `${r.left + r.width / 2 - 26}px`; arrow.style.top = `${r.bottom + 6}px`;
      by = r.bottom + 64;
    } else if (above) {
      arrow.textContent = '⬇️'; arrow.className = 'guide-arrow down';
      arrow.style.left = `${r.left + r.width / 2 - 26}px`; arrow.style.top = `${r.top - 62}px`;
      by = r.top - 66 - bh;
    } else {
      const right = r.right + 70 + bw < vw;
      arrow.textContent = right ? '⬅️' : '➡️';
      arrow.className = 'guide-arrow ' + (right ? 'left' : 'right');
      arrow.style.left = right ? `${r.right + 6}px` : `${r.left - 62}px`;
      arrow.style.top = `${r.top + r.height / 2 - 30}px`;
      bx = right ? r.right + 64 : r.left - 64 - bw;
      by = Math.min(vh - bh - 8, Math.max(8, r.top + r.height / 2 - bh / 2));
    }
    bubble.style.left = `${bx}px`;
    bubble.style.top = `${by}px`;
  };

  const timer = window.setInterval(place, 300);
  window.addEventListener('resize', place);
  const finish = (skipped: boolean) => {
    handle.close();
    onFinish(skipped);
  };
  const handle: GuideHandle = {
    close() {
      if (closed) return;
      closed = true;
      window.clearInterval(timer);
      window.removeEventListener('resize', place);
      layer.remove();
      audio.stopSpeaking();
    },
  };
  render();
  return handle;
}

/** Pantalla con la lista de tutoriales. */
export function showTutorials(app: HTMLElement, onBack: () => void): void {
  app.innerHTML = `
    <div class="screen tutorials">
      <div class="screen-head">
        <button class="round-btn" id="tuto-back" aria-label="volver">⬅️</button>
        <div class="screen-title">❓ tutoriales</div>
      </div>
      <div class="tuto-list"></div>
    </div>`;
  app.querySelector('#tuto-back')!.addEventListener('click', () => { audio.tap(); onBack(); });
  const list = app.querySelector<HTMLElement>('.tuto-list')!;
  for (const t of TUTORIALS) {
    const card = document.createElement('button');
    card.className = 'tuto-card';
    card.dataset.tuto = t.id;
    card.innerHTML = `<span class="tc-icon">${t.icon}</span><span class="tc-title">${t.title}</span>${isTutorialSeen(t.id) ? '<span class="tc-seen">✅</span>' : ''}`;
    card.addEventListener('click', () => { audio.tap(); startTutorial(app, t, () => showTutorials(app, onBack)); });
    list.appendChild(card);
  }
}

/** Abre un tutorial sobre un proyecto de práctica (no toca los proyectos de la niña). */
export function startTutorial(app: HTMLElement, t: Tutorial, onExit: () => void): void {
  const p = t.start();
  p.id = 'tuto-' + t.id;
  let guide: GuideHandle | null = null;
  let done = false;
  openEditor(app, p, {
    lockName: true,
    helpInPlace: true,
    onHome: () => { guide?.close(); onExit(); },
    onHelp: () => { guide?.close(); guide = runGuide(t.guide, () => undefined); },
    setup: (ctx) => {
      const bar = document.createElement('div');
      bar.className = 'lesson-bar';
      bar.innerHTML = `<span class="lb-icon">${t.icon}</span><span class="lb-text"></span>
        <button class="lb-btn" data-act="guide" aria-label="ver la guía">👣</button>
        <button class="lb-btn" data-act="skip" aria-label="saltar">⏭️</button>`;
      (bar.querySelector('.lb-text') as HTMLElement).textContent = t.title;
      ctx.slot.appendChild(bar);
      bar.querySelector('[data-act="guide"]')!.addEventListener('click', () => { audio.tap(); guide?.close(); guide = runGuide(t.guide, () => undefined); });
      bar.querySelector('[data-act="skip"]')!.addEventListener('click', () => {
        audio.tap();
        markTutorialSeen(t.id);
        guide?.close();
        ctx.close();
        onExit();
      });
      guide = runGuide(t.guide, () => { markTutorialSeen(t.id); });
      // cuando el estado del proyecto cumple el objetivo, se celebra una vez
      const unsub = store.subscribe(() => {
        if (done) return;
        if (evaluate(t, store.project).ok) {
          done = true;
          markTutorialSeen(t.id);
          audio.success();
          toast('🎉 ¡muy bien!', 2500);
          unsub();
        }
      });
      const origClose = ctx.close;
      ctx.close = () => { unsub(); origClose(); };
    },
  });
}

/** Aviso cuando no hay más tutoriales (reutilizable desde el editor). */
export async function tutorialsHint(): Promise<void> {
  await showMessage('❓ ➡️ 📚', '💡');
}
