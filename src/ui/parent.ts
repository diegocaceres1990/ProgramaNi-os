// Panel de padres: puerta aritmética, progreso por itinerario, desbloqueo, sonido, datos y autoprueba del temario.
import * as audio from '../core/audio';
import * as db from '../core/db';
import { TRACKS, starsOf, getUnlockAll, setUnlockAll, resetProgress } from '../core/progress';
import { selfTest } from '../core/verify';
import { ALL_LESSONS, lessonsOf } from './adventures';
import { confirmBox, showMessage } from './dialog';

/** Puerta: multiplicación de dos cifras del 6 al 9, respuesta entre 4 botones. */
export function parentGate(): Promise<boolean> {
  return new Promise((resolve) => {
    const a = 6 + Math.floor(Math.random() * 4);
    const c = 6 + Math.floor(Math.random() * 4);
    const right = a * c;
    const opts = new Set<number>([right]);
    while (opts.size < 4) {
      const delta = [-a, a, -c, c, -1, 1, 10, -10][Math.floor(Math.random() * 8)];
      const v = right + delta;
      if (v > 0) opts.add(v);
    }
    const list = [...opts].sort(() => Math.random() - 0.5);
    const root = document.createElement('div');
    root.className = 'dlg-overlay open';
    root.innerHTML = `<div class="dlg-box gate">
        <div class="dlg-icon">🔒</div>
        <div class="dlg-msg">para mayores</div>
        <div class="gate-q">${a} × ${c} = ?</div>
        <div class="gate-answers"></div>
        <div class="dlg-foot"><button class="round-btn no" aria-label="cancelar">✕</button></div>
      </div>`;
    const ans = root.querySelector<HTMLElement>('.gate-answers')!;
    for (const v of list) {
      const btn = document.createElement('button');
      btn.className = 'round-btn';
      btn.textContent = String(v);
      btn.addEventListener('click', () => {
        root.remove();
        if (v === right) { audio.tap(); resolve(true); } else { audio.oops(); resolve(false); }
      });
      ans.appendChild(btn);
    }
    root.querySelector('.no')!.addEventListener('click', () => { root.remove(); resolve(false); });
    document.body.appendChild(root);
  });
}

export async function openParents(app: HTMLElement, onBack: () => void): Promise<void> {
  if (!(await parentGate())) return;
  const render = async () => {
    const est = await db.storageEstimate();
    const projects = await db.listProjects();
    app.innerHTML = `
      <div class="screen parents">
        <div class="screen-head">
          <button class="round-btn" id="par-back" aria-label="volver">⬅️</button>
          <div class="screen-title">🔒 panel de padres</div>
        </div>
        <div class="panel"><h2>⭐ progreso</h2><table class="progress-table"></table></div>
        <div class="panel"><h2>⚙️ ajustes</h2><div class="row-actions">
          <button class="round-btn" id="par-unlock"></button>
          <button class="round-btn" id="par-mute"></button>
          <button class="round-btn" id="par-voice"></button>
          <button class="round-btn" id="par-voice-test">🗣️ probar la voz</button>
          <button class="round-btn no" id="par-reset">🔄 borrar estrellas</button>
          <button class="round-btn no" id="par-wipe">🗑️ borrar todos los datos</button>
        </div></div>
        <div class="panel"><h2>🗣️ lectura en voz alta</h2>
          <p>Lee la guía, los retos y las pistas. Cada texto tiene además un botón 🔊 para repetirlo.</p>
          <p>Voz en uso: <b id="par-voice-name"></b>. Las voces por internet suenan más naturales; sin conexión se usa la voz instalada en el equipo.</p>
        </div>
        <div class="panel"><h2>💾 datos</h2>
          <p>Proyectos guardados: <b>${projects.length}</b>. Todo se guarda solo en este dispositivo (IndexedDB), sin cuentas, sin nube y sin red.</p>
          <p>${est ? `Espacio usado: ${(est.usage / 1048576).toFixed(1)} MB de ${(est.quota / 1048576).toFixed(0)} MB.` : ''}</p>
        </div>
        <div class="panel"><h2>🧪 autoprueba del temario</h2>
          <p>Comprueba que cada uno de los ${ALL_LESSONS.length} retos rechaza su estado inicial, acepta su solución de referencia (≤ 12 bloques) y solo usa bloques ya enseñados.</p>
          <div class="row-actions"><button class="round-btn" id="par-test">▶️ ejecutar</button></div>
          <p id="par-test-out"></p>
        </div>
        <div class="panel"><h2>ℹ️ cómo funciona</h2>
          <p>Itinerarios: aventuras (12), escuela (8, con actividad sin pantalla antes de cada lección), cuaderno de 1º (12) y de 2º (12). Cada lección se desbloquea al superar la anterior.</p>
          <p>El autoguardado es cada 3 segundos y al cambiar de escena. El trabajo de cada lección se guarda aparte y se puede reiniciar con 🔄 en su pantalla de objetivo.</p>
        </div>
      </div>`;
    const table = app.querySelector<HTMLElement>('.progress-table')!;
    for (const t of TRACKS) {
      const ls = lessonsOf(t.id);
      const got = ls.reduce((s, l) => s + starsOf(l.id), 0);
      const done = ls.filter((l) => starsOf(l.id) > 0).length;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${t.icon} ${t.name}</td><td>${done} / ${ls.length} lecciones</td><td>⭐ ${got} / ${ls.length * 3}</td>`;
      table.appendChild(tr);
    }
    const unlock = app.querySelector<HTMLElement>('#par-unlock')!;
    unlock.textContent = getUnlockAll() ? '🔓 todo desbloqueado' : '🔒 desbloqueo paso a paso';
    unlock.addEventListener('click', () => { setUnlockAll(!getUnlockAll()); audio.tap(); void render(); });
    const mute = app.querySelector<HTMLElement>('#par-mute')!;
    mute.textContent = audio.isMuted() ? '🔇 sonido apagado' : '🔊 sonido encendido';
    mute.addEventListener('click', () => { audio.setMuted(!audio.isMuted()); audio.tap(); void render(); });
    const voice = app.querySelector<HTMLElement>('#par-voice')!;
    voice.textContent = audio.isReadAloud() ? '🗣️ lectura automática: sí' : '🤫 lectura automática: no';
    voice.addEventListener('click', () => { audio.setReadAloud(!audio.isReadAloud()); audio.tap(); void render(); });
    app.querySelector('#par-voice-test')!.addEventListener('click', () => audio.speak('¡Hola! Soy la voz que te ayudará a programar. ¿Empezamos?'));
    const vn = app.querySelector<HTMLElement>('#par-voice-name')!;
    vn.textContent = audio.voiceName();
    setTimeout(() => { vn.textContent = audio.voiceName(); }, 800);
    app.querySelector('#par-reset')!.addEventListener('click', async () => {
      if (await confirmBox('¿Borrar todas las estrellas y tutoriales vistos?', '🔄')) { resetProgress(); void render(); }
    });
    app.querySelector('#par-wipe')!.addEventListener('click', async () => {
      if (!(await confirmBox('¿Borrar TODOS los proyectos y el progreso? No se puede deshacer.', '⚠️'))) return;
      if (!(await confirmBox('¿Seguro del todo?', '⚠️'))) return;
      await db.wipeAll();
      resetProgress();
      await showMessage('Datos borrados.', '🗑️');
      void render();
    });
    app.querySelector('#par-test')!.addEventListener('click', () => {
      const r = selfTest(ALL_LESSONS);
      const out = app.querySelector<HTMLElement>('#par-test-out')!;
      out.textContent = r.errors.length ? `❌ ${r.passed}/${ALL_LESSONS.length} correctas. ${r.errors.join(' · ')}` : `✅ ${r.passed}/${ALL_LESSONS.length} lecciones correctas.`;
    });
    app.querySelector('#par-back')!.addEventListener('click', () => { audio.tap(); onBack(); });
  };
  await render();
}
