// Pantalla de inicio: itinerarios de aprendizaje y galería de proyectos (crear, abrir, renombrar, borrar).
import * as db from '../core/db';
import * as audio from '../core/audio';
import { TRACKS, totalStars } from '../core/progress';
import type { TrackId } from '../core/progress';
import { escapeHtml } from '../core/blocks';
import { askText, confirmBox } from './dialog';

export interface GalleryNav {
  openProject(id: string): void;
  newProject(): void;
  track(id: TrackId): void;
  tutorials(): void;
  parents(): void;
}

export async function showGallery(app: HTMLElement, nav: GalleryNav): Promise<void> {
  app.innerHTML = `
    <div class="screen home">
      <div class="screen-head">
        <div class="logo">🧩 <span>aprende jugando</span></div>
        <span class="tb-gap"></span>
        <div class="star-count" aria-label="estrellas">⭐ ${totalStars()}</div>
        <button class="round-btn" id="home-mute" aria-label="silencio">${audio.isMuted() ? '🔇' : '🔊'}</button>
        <button class="round-btn" id="home-help" aria-label="tutoriales">❓</button>
        <button class="round-btn" id="home-parents" aria-label="padres">🔒</button>
      </div>
      <div class="tracks"></div>
      <div class="section-title">🎨 mis proyectos</div>
      <div class="projects"></div>
    </div>`;

  const tracks = app.querySelector<HTMLElement>('.tracks')!;
  for (const t of TRACKS) {
    const b = document.createElement('button');
    b.className = 'track-btn';
    b.dataset.track = t.id;
    b.style.background = t.color;
    b.innerHTML = `<span class="tr-icon">${t.icon}</span><span class="tr-name">${t.name}</span>`;
    b.addEventListener('click', () => { audio.tap(); nav.track(t.id); });
    tracks.appendChild(b);
  }

  app.querySelector('#home-mute')!.addEventListener('click', (e) => {
    audio.setMuted(!audio.isMuted());
    audio.tap();
    (e.currentTarget as HTMLElement).textContent = audio.isMuted() ? '🔇' : '🔊';
  });
  app.querySelector('#home-help')!.addEventListener('click', () => { audio.tap(); nav.tutorials(); });
  app.querySelector('#home-parents')!.addEventListener('click', () => { audio.tap(); nav.parents(); });

  const grid = app.querySelector<HTMLElement>('.projects')!;
  const render = async () => {
    const list = await db.listProjects();
    grid.innerHTML = '';
    const add = document.createElement('button');
    add.className = 'proj-tile new';
    add.id = 'proj-new';
    add.innerHTML = '<span class="pt-plus">+</span>';
    add.setAttribute('aria-label', 'proyecto nuevo');
    add.addEventListener('click', () => { audio.tap(); nav.newProject(); });
    grid.appendChild(add);
    for (const p of list) {
      const tile = document.createElement('div');
      tile.className = 'proj-tile';
      tile.innerHTML = `<div class="pt-img"></div><div class="pt-name">${escapeHtml(p.name)}</div>`;
      const thumb = await db.loadThumb(p.id);
      const imgBox = tile.querySelector<HTMLElement>('.pt-img')!;
      if (thumb) imgBox.style.backgroundImage = `url("${thumb}")`;
      else imgBox.textContent = '🎨';

      // pulsación larga: muestra los botones de renombrar y borrar
      let timer = 0, long = false;
      tile.addEventListener('pointerdown', () => {
        long = false;
        tile.classList.add('pressing');
        timer = window.setTimeout(() => {
          long = true;
          tile.classList.remove('pressing');
          grid.querySelectorAll('.proj-tile.editing').forEach((t) => t.classList.remove('editing'));
          tile.classList.add('editing');
          if (navigator.vibrate) navigator.vibrate(30);
        }, 600);
      });
      const cancel = () => { window.clearTimeout(timer); tile.classList.remove('pressing'); };
      tile.addEventListener('pointerup', cancel);
      tile.addEventListener('pointerleave', cancel);
      tile.addEventListener('pointercancel', cancel);
      tile.addEventListener('click', () => {
        if (long || tile.classList.contains('editing')) return;
        audio.tap();
        nav.openProject(p.id);
      });

      const tools = document.createElement('div');
      tools.className = 'pt-tools';
      const ren = document.createElement('button');
      ren.className = 'round-btn';
      ren.textContent = '✏️';
      ren.setAttribute('aria-label', 'renombrar');
      ren.addEventListener('click', async (e) => {
        e.stopPropagation();
        audio.tap();
        const n = await askText('📝', p.name, 30);
        if (n) {
          const full = await db.loadProject(p.id);
          if (full) { full.name = n; await db.saveProject(full); }
        }
        void render();
      });
      const del = document.createElement('button');
      del.className = 'round-btn no';
      del.textContent = '🗑️';
      del.setAttribute('aria-label', 'borrar');
      del.addEventListener('click', async (e) => {
        e.stopPropagation();
        audio.tap();
        if (await confirmBox(p.name, '🗑️')) {
          audio.trash();
          await db.deleteProject(p.id);
        }
        void render();
      });
      const ok = document.createElement('button');
      ok.className = 'round-btn yes';
      ok.textContent = '✓';
      ok.setAttribute('aria-label', 'listo');
      ok.addEventListener('click', (e) => { e.stopPropagation(); tile.classList.remove('editing'); });
      tools.append(ren, del, ok);
      tile.appendChild(tools);
      grid.appendChild(tile);
    }
  };
  await render();
}
