// Diálogos táctiles: rueda numérica, selector de opciones, confirmación, texto y avisos.
import * as audio from '../core/audio';

export interface Choice<T> {
  value: T;
  label?: string;
  icon?: string;
  html?: string;
  color?: string;
}

function overlay(cls = ''): { root: HTMLElement; box: HTMLElement; close: () => void } {
  const root = document.createElement('div');
  root.className = 'dlg-overlay ' + cls;
  const box = document.createElement('div');
  box.className = 'dlg-box';
  root.appendChild(box);
  document.body.appendChild(root);
  requestAnimationFrame(() => root.classList.add('open'));
  return { root, box, close: () => root.remove() };
}

function btn(html: string, cls: string, onClick: () => void, label?: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = cls;
  b.innerHTML = html;
  if (label) b.setAttribute('aria-label', label);
  b.addEventListener('click', (e) => { e.stopPropagation(); audio.tap(); onClick(); });
  return b;
}

/** Rueda numérica táctil. Devuelve null si se cancela. */
export function pickNumber(min: number, max: number, current: number, icon = '🔢'): Promise<number | null> {
  return new Promise((resolve) => {
    const { root, box, close } = overlay('dlg-wheel');
    const ITEM = 56;
    const head = document.createElement('div');
    head.className = 'dlg-head';
    head.textContent = icon;
    box.appendChild(head);

    const row = document.createElement('div');
    row.className = 'wheel-row';
    const wheel = document.createElement('div');
    wheel.className = 'wheel';
    const pad = () => { const d = document.createElement('div'); d.className = 'wheel-pad'; return d; };
    wheel.appendChild(pad());
    for (let v = min; v <= max; v++) {
      const it = document.createElement('div');
      it.className = 'wheel-item';
      it.textContent = String(v);
      it.dataset.v = String(v);
      it.addEventListener('click', () => scrollTo(v, true));
      wheel.appendChild(it);
    }
    wheel.appendChild(pad());
    let value = Math.max(min, Math.min(max, current));
    const mark = () => {
      wheel.querySelectorAll<HTMLElement>('.wheel-item').forEach((el) => {
        el.classList.toggle('sel', Number(el.dataset.v) === value);
      });
    };
    const scrollTo = (v: number, smooth: boolean) => {
      value = Math.max(min, Math.min(max, v));
      wheel.scrollTo({ top: (value - min) * ITEM, behavior: smooth ? 'smooth' : 'auto' });
      mark();
    };
    let last = value;
    wheel.addEventListener('scroll', () => {
      const v = min + Math.round(wheel.scrollTop / ITEM);
      if (v !== value) { value = Math.max(min, Math.min(max, v)); mark(); }
      if (value !== last) { last = value; audio.click(); }
    });
    const up = btn('▲', 'round-btn', () => scrollTo(value - 1, true), 'menos');
    const down = btn('▼', 'round-btn', () => scrollTo(value + 1, true), 'más');
    const arrows = document.createElement('div');
    arrows.className = 'wheel-arrows';
    arrows.append(up, down);
    row.append(wheel, arrows);
    box.appendChild(row);

    const foot = document.createElement('div');
    foot.className = 'dlg-foot';
    foot.append(
      btn('✕', 'round-btn no', () => { close(); resolve(null); }, 'cancelar'),
      btn('✓', 'round-btn yes', () => { close(); resolve(value); }, 'aceptar'),
    );
    box.appendChild(foot);
    root.addEventListener('click', (e) => { if (e.target === root) { close(); resolve(null); } });
    requestAnimationFrame(() => scrollTo(value, false));
  });
}

/** Rejilla de opciones grandes. Devuelve null si se cancela. */
export function pickChoice<T>(choices: Choice<T>[], title = '', cls = ''): Promise<T | null> {
  return new Promise((resolve) => {
    const { root, box, close } = overlay('dlg-choice ' + cls);
    if (title) {
      const head = document.createElement('div');
      head.className = 'dlg-head';
      head.textContent = title;
      box.appendChild(head);
    }
    const grid = document.createElement('div');
    grid.className = 'choice-grid';
    for (const c of choices) {
      const b = document.createElement('button');
      b.className = 'choice';
      if (c.color) b.style.background = c.color;
      b.innerHTML = c.html ?? `<span class="ci">${c.icon ?? ''}</span>${c.label ? `<span class="cl">${c.label}</span>` : ''}`;
      b.addEventListener('click', () => { audio.tap(); close(); resolve(c.value); });
      grid.appendChild(b);
    }
    box.appendChild(grid);
    const foot = document.createElement('div');
    foot.className = 'dlg-foot';
    foot.append(btn('✕', 'round-btn no', () => { close(); resolve(null); }, 'cancelar'));
    box.appendChild(foot);
    root.addEventListener('click', (e) => { if (e.target === root) { close(); resolve(null); } });
  });
}

/** Confirmación con iconos grandes. */
export function confirmBox(message: string, icon = '❓'): Promise<boolean> {
  return new Promise((resolve) => {
    const { box, close } = overlay('dlg-confirm');
    box.innerHTML = `<div class="dlg-icon">${icon}</div><div class="dlg-msg"></div>`;
    (box.querySelector('.dlg-msg') as HTMLElement).textContent = message;
    const foot = document.createElement('div');
    foot.className = 'dlg-foot';
    foot.append(
      btn('✕', 'round-btn no', () => { close(); resolve(false); }, 'no'),
      btn('✓', 'round-btn yes', () => { close(); resolve(true); }, 'sí'),
    );
    box.appendChild(foot);
  });
}

/** Entrada de texto (para adultos o nombres). */
export function askText(title: string, current = '', maxLen = 40): Promise<string | null> {
  return new Promise((resolve) => {
    const { box, close } = overlay('dlg-text');
    const head = document.createElement('div');
    head.className = 'dlg-head';
    head.textContent = title;
    const input = document.createElement('input');
    input.className = 'dlg-input';
    input.value = current;
    input.maxLength = maxLen;
    const foot = document.createElement('div');
    foot.className = 'dlg-foot';
    const ok = () => { close(); resolve(input.value.trim()); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
    foot.append(
      btn('✕', 'round-btn no', () => { close(); resolve(null); }, 'cancelar'),
      btn('✓', 'round-btn yes', ok, 'aceptar'),
    );
    box.append(head, input, foot);
    setTimeout(() => input.focus(), 50);
  });
}

/** Aviso con un solo botón. */
export function showMessage(html: string, icon = '💡', okIcon = '✓'): Promise<void> {
  return new Promise((resolve) => {
    const { box, close } = overlay('dlg-confirm');
    box.innerHTML = `<div class="dlg-icon">${icon}</div><div class="dlg-msg">${html}</div>`;
    const foot = document.createElement('div');
    foot.className = 'dlg-foot';
    foot.append(btn(okIcon, 'round-btn yes', () => { close(); resolve(); }, 'vale'));
    box.appendChild(foot);
  });
}

/** Burbuja breve no bloqueante (por ejemplo, la bombilla de pista). */
export function toast(html: string, ms = 3500, cls = ''): void {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = document.createElement('div');
  t.className = 'toast ' + cls;
  t.innerHTML = html;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('open'));
  setTimeout(() => { t.classList.remove('open'); setTimeout(() => t.remove(), 300); }, ms);
}

/** Capa a pantalla completa para editores y pantallas modales. */
export function fullscreenLayer(cls: string): { root: HTMLElement; close: () => void } {
  const root = document.createElement('div');
  root.className = 'fs-layer ' + cls;
  document.body.appendChild(root);
  return { root, close: () => root.remove() };
}
