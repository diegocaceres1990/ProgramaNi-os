// Arranque: estilos, navegación entre pantallas y service worker.
import './styles/base.css';
import './styles/layout.css';
import './styles/blocks.css';
import './styles/paint.css';
import './styles/adventures.css';
import { makeProject } from './core/state';
import * as db from './core/db';
import { openEditor } from './ui/toolbar';
import { showGallery } from './ui/gallery';
import { showTrack } from './ui/adventures';
import { showTutorials } from './ui/tutorials';
import { openParents } from './ui/parent';
import type { TrackId } from './core/progress';

const app = document.getElementById('app')!;

const nav = {
  home(): void {
    void showGallery(app, nav);
  },
  async openProject(id: string): Promise<void> {
    const p = await db.loadProject(id);
    if (!p) { nav.home(); return; }
    openEditor(app, p, { onHome: nav.home, onHelp: () => showTutorials(app, () => void nav.openProject(id)) });
  },
  async newProject(): Promise<void> {
    const list = await db.listProjects();
    const p = makeProject(`proyecto ${list.length + 1}`);
    await db.saveProject(p);
    void nav.openProject(p.id);
  },
  track(id: TrackId): void {
    showTrack(app, id, { home: nav.home, tutorials: () => showTutorials(app, () => nav.track(id)) });
  },
  tutorials(): void {
    showTutorials(app, nav.home);
  },
  parents(): void {
    void openParents(app, nav.home);
  },
};

nav.home();
void db.requestPersistence();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('./sw.js'); });
}
