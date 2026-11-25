// Editor de pintura a pantalla completa (raster sobre canvas, exporta SVG que envuelve un PNG).
import { svgImage } from './sprites';
import * as audio from './audio';
import { fullscreenLayer, toast } from '../ui/dialog';

export type PaintKind = 'sprite' | 'bg';
type Tool = 'pencil' | 'circle' | 'rect' | 'triangle' | 'bucket' | 'scissors' | 'stamp' | 'move' | 'rotate';

export const PAINT_COLORS = [
  '#000000', '#555555', '#9E9E9E', '#FFFFFF', '#FF4C4C', '#FF8C8C', '#FF8C1A', '#FFC285',
  '#FFD23F', '#FFF08C', '#4CBF56', '#9BE29F', '#1E7B34', '#4C97FF', '#9CC5FF', '#1D4E9E',
  '#9966FF', '#CDB3FF', '#FF7BAC', '#FFC2D9', '#8B5A2B', '#D9A066', '#F7C9A0', '#00B8B8',
];
const WIDTHS = [4, 10, 20];

export interface PaintResult { svg: string; name: string }

const TOOLS: { id: Tool; icon: string; label: string }[] = [
  { id: 'pencil', icon: '✏️', label: 'lápiz' },
  { id: 'circle', icon: '⚪', label: 'círculo' },
  { id: 'rect', icon: '⬜', label: 'rectángulo' },
  { id: 'triangle', icon: '🔺', label: 'triángulo' },
  { id: 'bucket', icon: '🪣', label: 'cubo' },
  { id: 'scissors', icon: '✂️', label: 'tijeras' },
  { id: 'stamp', icon: '🖃', label: 'sello' },
  { id: 'move', icon: '✋', label: 'mover' },
  { id: 'rotate', icon: '🔄', label: 'girar' },
];

function loadImage(svg: string): Promise<HTMLImageElement> {
  const img = svgImage(svg);
  if (img.complete && img.naturalWidth) return Promise.resolve(img);
  return new Promise((resolve) => {
    img.addEventListener('load', () => resolve(img), { once: true });
    img.addEventListener('error', () => resolve(img), { once: true });
  });
}

function hexToRgba(hex: string): [number, number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

/** Abre el editor. Resuelve con el SVG resultante o null si se cancela. */
export function openPaint(kind: PaintKind, svg: string | null, name = ''): Promise<PaintResult | null> {
  return new Promise((resolve) => {
    const { root, close } = fullscreenLayer('paint');
    const W = kind === 'sprite' ? 400 : 960;
    const H = kind === 'sprite' ? 400 : 720;
    let tool: Tool = 'pencil';
    let color = PAINT_COLORS[4];
    let width = WIDTHS[1];
    let usedPhoto = svg?.includes('data-foto="1"') ?? false;
    let grid = false;
    const undo: ImageData[] = [];

    root.innerHTML = `
      <div class="paint-top">
        <button class="round-btn no" data-act="cancel" aria-label="cancelar">✕</button>
        ${kind === 'sprite' ? `<input class="paint-name" maxlength="20" aria-label="nombre" placeholder="nombre">` : '<div class="paint-title">🖼️</div>'}
        <button class="round-btn" data-act="undo" aria-label="deshacer">↶</button>
        <button class="round-btn" data-act="grid" aria-label="rejilla">#</button>
        <button class="round-btn" data-act="camera" aria-label="cámara">📷</button>
        <button class="round-btn yes" data-act="save" aria-label="guardar">✓</button>
      </div>
      <div class="paint-main">
        <div class="paint-tools"></div>
        <div class="paint-canvas-wrap ${kind}">
          <canvas class="paint-canvas"></canvas>
          <canvas class="paint-overlay"></canvas>
        </div>
        <div class="paint-side">
          <div class="paint-widths"></div>
          <div class="paint-colors"></div>
        </div>
      </div>`;

    const nameInput = root.querySelector<HTMLInputElement>('.paint-name');
    if (nameInput) nameInput.value = name;
    const wrap = root.querySelector<HTMLElement>('.paint-canvas-wrap')!;
    const cv = root.querySelector<HTMLCanvasElement>('.paint-canvas')!;
    const ov = root.querySelector<HTMLCanvasElement>('.paint-overlay')!;
    cv.width = ov.width = W;
    cv.height = ov.height = H;
    const ctx = cv.getContext('2d', { willReadFrequently: true })!;
    const octx = ov.getContext('2d')!;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const fit = () => {
      const avail = root.querySelector<HTMLElement>('.paint-main')!.getBoundingClientRect();
      const maxW = Math.max(200, avail.width - 96 - 244 - 24);
      const maxH = Math.max(200, avail.height - 16);
      const k = Math.min(maxW / W, maxH / H);
      wrap.style.width = `${W * k}px`;
      wrap.style.height = `${H * k}px`;
    };

    // ----- herramientas -----
    const toolsEl = root.querySelector<HTMLElement>('.paint-tools')!;
    for (const t of TOOLS) {
      const b = document.createElement('button');
      b.className = 'tool-btn' + (t.id === tool ? ' sel' : '');
      b.dataset.tool = t.id;
      b.textContent = t.icon;
      b.setAttribute('aria-label', t.label);
      b.title = t.label;
      b.addEventListener('click', () => {
        audio.tap();
        tool = t.id;
        stampSrc = null;
        octx.clearRect(0, 0, W, H);
        toolsEl.querySelectorAll('.tool-btn').forEach((x) => x.classList.toggle('sel', (x as HTMLElement).dataset.tool === tool));
      });
      toolsEl.appendChild(b);
    }
    const widthsEl = root.querySelector<HTMLElement>('.paint-widths')!;
    WIDTHS.forEach((w) => {
      const b = document.createElement('button');
      b.className = 'width-btn' + (w === width ? ' sel' : '');
      b.innerHTML = `<span style="width:${w + 4}px;height:${w + 4}px"></span>`;
      b.setAttribute('aria-label', `grosor ${w}`);
      b.addEventListener('click', () => {
        audio.tap();
        width = w;
        widthsEl.querySelectorAll('.width-btn').forEach((x, i) => x.classList.toggle('sel', WIDTHS[i] === w));
      });
      widthsEl.appendChild(b);
    });
    const colorsEl = root.querySelector<HTMLElement>('.paint-colors')!;
    PAINT_COLORS.forEach((c) => {
      const b = document.createElement('button');
      b.className = 'color-btn' + (c === color ? ' sel' : '');
      b.style.background = c;
      b.setAttribute('aria-label', c);
      b.addEventListener('click', () => {
        audio.tap();
        color = c;
        colorsEl.querySelectorAll<HTMLElement>('.color-btn').forEach((x) => x.classList.toggle('sel', x.style.background === b.style.background));
      });
      colorsEl.appendChild(b);
    });

    // ----- estado inicial -----
    const pushUndo = () => {
      undo.push(ctx.getImageData(0, 0, W, H));
      if (undo.length > 30) undo.shift();
    };
    const init = async () => {
      if (kind === 'bg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); }
      if (svg) {
        const img = await loadImage(svg);
        if (img.naturalWidth) {
          if (kind === 'sprite') ctx.drawImage(img, W * 0.1, H * 0.1, W * 0.8, H * 0.8);
          else ctx.drawImage(img, 0, 0, W, H);
        }
      }
    };
    void init();

    // ----- puntero -----
    const pos = (e: PointerEvent) => {
      const r = ov.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
    };
    let down = false;
    let start = { x: 0, y: 0 };
    let pts: { x: number; y: number }[] = [];
    let snapshot: HTMLCanvasElement | null = null;
    let stampSrc: HTMLCanvasElement | null = null;

    const copyCanvas = () => {
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      c.getContext('2d')!.drawImage(cv, 0, 0);
      return c;
    };

    const shapePath = (c: CanvasRenderingContext2D, t: Tool, a: { x: number; y: number }, b: { x: number; y: number }) => {
      c.beginPath();
      if (t === 'circle') {
        c.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2 || 1, Math.abs(b.y - a.y) / 2 || 1, 0, 0, Math.PI * 2);
      } else if (t === 'rect') {
        c.rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      } else {
        c.moveTo((a.x + b.x) / 2, Math.min(a.y, b.y));
        c.lineTo(Math.max(a.x, b.x), Math.max(a.y, b.y));
        c.lineTo(Math.min(a.x, b.x), Math.max(a.y, b.y));
        c.closePath();
      }
    };
    const drawShape = (c: CanvasRenderingContext2D, t: Tool, a: { x: number; y: number }, b: { x: number; y: number }) => {
      c.save();
      shapePath(c, t, a, b);
      c.fillStyle = color;
      c.fill();
      c.lineWidth = width / 2;
      c.strokeStyle = 'rgba(0,0,0,0.35)';
      c.stroke();
      c.restore();
    };
    const selRect = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
      x: Math.round(Math.min(a.x, b.x)), y: Math.round(Math.min(a.y, b.y)),
      w: Math.max(1, Math.round(Math.abs(b.x - a.x))), h: Math.max(1, Math.round(Math.abs(b.y - a.y))),
    });
    const drawSel = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      octx.clearRect(0, 0, W, H);
      const r = selRect(a, b);
      octx.save();
      octx.setLineDash([10, 8]);
      octx.lineWidth = 3;
      octx.strokeStyle = '#4C97FF';
      octx.strokeRect(r.x, r.y, r.w, r.h);
      octx.restore();
    };

    const smoothStroke = (c: CanvasRenderingContext2D, p: { x: number; y: number }[]) => {
      c.save();
      c.strokeStyle = color;
      c.lineWidth = width;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(p[0].x, p[0].y);
      if (p.length < 3) {
        const q = p[p.length - 1];
        c.lineTo(q.x + 0.01, q.y + 0.01);
      } else {
        for (let i = 1; i < p.length - 1; i++) {
          const mx = (p[i].x + p[i + 1].x) / 2, my = (p[i].y + p[i + 1].y) / 2;
          c.quadraticCurveTo(p[i].x, p[i].y, mx, my);
        }
        const l = p[p.length - 1];
        c.lineTo(l.x, l.y);
      }
      c.stroke();
      c.restore();
    };

    ov.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      ov.setPointerCapture(e.pointerId);
      const p = pos(e);
      down = true;
      start = p;
      if (tool === 'bucket') {
        pushUndo();
        floodFill(ctx, Math.floor(p.x), Math.floor(p.y), hexToRgba(color), W, H);
        audio.pop();
        down = false;
        return;
      }
      if (tool === 'stamp' && stampSrc) {
        pushUndo();
        ctx.drawImage(stampSrc, p.x - stampSrc.width / 2, p.y - stampSrc.height / 2);
        audio.pop();
        down = false;
        return;
      }
      if (tool === 'pencil' || tool === 'circle' || tool === 'rect' || tool === 'triangle' || tool === 'scissors') pushUndo();
      if (tool === 'move' || tool === 'rotate') { pushUndo(); snapshot = copyCanvas(); }
      pts = [p];
    });
    ov.addEventListener('pointermove', (e) => {
      if (!down) return;
      const p = pos(e);
      switch (tool) {
        case 'pencil':
          pts.push(p);
          octx.clearRect(0, 0, W, H);
          smoothStroke(octx, pts);
          break;
        case 'circle': case 'rect': case 'triangle':
          octx.clearRect(0, 0, W, H);
          drawShape(octx, tool, start, p);
          break;
        case 'scissors': case 'stamp':
          drawSel(start, p);
          break;
        case 'move':
          if (snapshot) {
            ctx.clearRect(0, 0, W, H);
            if (kind === 'bg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); }
            ctx.drawImage(snapshot, p.x - start.x, p.y - start.y);
          }
          break;
        case 'rotate':
          if (snapshot) {
            const ang = ((p.x - start.x) / W) * Math.PI * 2;
            ctx.save();
            ctx.clearRect(0, 0, W, H);
            if (kind === 'bg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); }
            ctx.translate(W / 2, H / 2);
            ctx.rotate(ang);
            ctx.drawImage(snapshot, -W / 2, -H / 2);
            ctx.restore();
          }
          break;
        default:
          break;
      }
    });
    const finish = (e: PointerEvent) => {
      if (!down) return;
      down = false;
      const p = pos(e);
      octx.clearRect(0, 0, W, H);
      switch (tool) {
        case 'pencil':
          pts.push(p);
          smoothStroke(ctx, pts);
          break;
        case 'circle': case 'rect': case 'triangle':
          if (Math.hypot(p.x - start.x, p.y - start.y) > 4) drawShape(ctx, tool, start, p);
          else undo.pop();
          break;
        case 'scissors': {
          const r = selRect(start, p);
          if (r.w > 4 && r.h > 4) {
            if (kind === 'bg') { ctx.fillStyle = '#fff'; ctx.fillRect(r.x, r.y, r.w, r.h); } else ctx.clearRect(r.x, r.y, r.w, r.h);
            audio.trash();
          } else undo.pop();
          break;
        }
        case 'stamp': {
          const r = selRect(start, p);
          if (r.w > 4 && r.h > 4) {
            stampSrc = document.createElement('canvas');
            stampSrc.width = r.w; stampSrc.height = r.h;
            stampSrc.getContext('2d')!.drawImage(cv, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
            toast('🖃 👆');
          }
          break;
        }
        default:
          snapshot = null;
      }
    };
    ov.addEventListener('pointerup', finish);
    ov.addEventListener('pointercancel', finish);

    // ----- cámara -----
    const camera = async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      } catch {
        toast('📷 🚫');
        return;
      }
      const cam = document.createElement('div');
      cam.className = 'camera-layer';
      cam.innerHTML = `<div class="camera-view ${kind}"><video autoplay playsinline muted></video></div>
        <div class="dlg-foot"><button class="round-btn no" aria-label="cancelar">✕</button><button class="round-btn yes shutter" aria-label="foto">📸</button></div>`;
      root.appendChild(cam);
      const video = cam.querySelector('video')!;
      video.srcObject = stream;
      const stop = () => { stream.getTracks().forEach((t) => t.stop()); cam.remove(); };
      cam.querySelector('.no')!.addEventListener('click', stop);
      cam.querySelector('.shutter')!.addEventListener('click', () => {
        const vw = video.videoWidth, vh = video.videoHeight;
        if (!vw || !vh) return;
        pushUndo();
        ctx.save();
        if (kind === 'sprite') {
          ctx.beginPath();
          ctx.arc(W / 2, H / 2, W * 0.38, 0, Math.PI * 2);
          ctx.clip();
          const s = Math.min(vw, vh);
          ctx.drawImage(video, (vw - s) / 2, (vh - s) / 2, s, s, W / 2 - W * 0.38, H / 2 - H * 0.38, W * 0.76, H * 0.76);
        } else {
          const k = Math.max(W / vw, H / vh);
          ctx.drawImage(video, (W - vw * k) / 2, (H - vh * k) / 2, vw * k, vh * k);
        }
        ctx.restore();
        usedPhoto = true;
        audio.success();
        stop();
      });
    };

    // ----- barra superior -----
    root.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((b) => {
      b.addEventListener('click', () => {
        audio.tap();
        switch (b.dataset.act) {
          case 'cancel': cleanup(); resolve(null); break;
          case 'undo': { const d = undo.pop(); if (d) ctx.putImageData(d, 0, 0); break; }
          case 'grid': grid = !grid; wrap.classList.toggle('grid', grid); b.classList.toggle('sel', grid); break;
          case 'camera': void camera(); break;
          case 'save': {
            const png = cv.toDataURL('image/png');
            const vb = kind === 'sprite' ? '0 0 100 100' : '0 0 480 360';
            const [vw, vh] = kind === 'sprite' ? [100, 100] : [480, 360];
            const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" data-mano="1"${usedPhoto ? ' data-foto="1"' : ''}><image href="${png}" width="${vw}" height="${vh}"/></svg>`;
            cleanup();
            resolve({ svg: out, name: (nameInput?.value.trim() || name || 'mi dibujo').slice(0, 20) });
            break;
          }
        }
      });
    });

    const onResize = () => fit();
    window.addEventListener('resize', onResize);
    const cleanup = () => { window.removeEventListener('resize', onResize); close(); };
    requestAnimationFrame(fit);
  });
}

/** Relleno por inundación con tolerancia (pila de tramos). */
function floodFill(ctx: CanvasRenderingContext2D, x0: number, y0: number, fill: [number, number, number, number], W: number, H: number): void {
  if (x0 < 0 || y0 < 0 || x0 >= W || y0 >= H) return;
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const i0 = (y0 * W + x0) * 4;
  const target = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]];
  const TOL = 48;
  const same = (i: number) =>
    Math.abs(d[i] - target[0]) <= TOL && Math.abs(d[i + 1] - target[1]) <= TOL &&
    Math.abs(d[i + 2] - target[2]) <= TOL && Math.abs(d[i + 3] - target[3]) <= TOL;
  if (target[0] === fill[0] && target[1] === fill[1] && target[2] === fill[2] && target[3] === fill[3]) return;
  const seen = new Uint8Array(W * H);
  const stack: number[] = [x0, y0];
  while (stack.length) {
    const y = stack.pop()!;
    let x = stack.pop()!;
    while (x >= 0 && !seen[y * W + x] && same((y * W + x) * 4)) x--;
    x++;
    let up = false, dn = false;
    while (x < W && !seen[y * W + x] && same((y * W + x) * 4)) {
      const p = y * W + x;
      seen[p] = 1;
      const i = p * 4;
      d[i] = fill[0]; d[i + 1] = fill[1]; d[i + 2] = fill[2]; d[i + 3] = fill[3];
      if (y > 0) {
        const a = !seen[p - W] && same((p - W) * 4);
        if (a && !up) { stack.push(x, y - 1); up = true; } else if (!a) up = false;
      }
      if (y < H - 1) {
        const b = !seen[p + W] && same((p + W) * 4);
        if (b && !dn) { stack.push(x, y + 1); dn = true; } else if (!b) dn = false;
      }
      x++;
    }
  }
  ctx.putImageData(img, 0, 0);
}
