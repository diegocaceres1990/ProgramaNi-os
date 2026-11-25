// Los 4 tutoriales del botón de ayuda (❓). Se pueden saltar y se guardan como vistos.
import type { Tutorial } from '../core/verify';
import { cond, scriptsOf, has, findRepeat, simulate, allSprites, flat, num } from '../core/verify';
import { b, project, scene, spr, kind } from './adventures';

export const TUTORIALS: Tutorial[] = [
  {
    id: 't1', title: 'mover un personaje', icon: '➡️',
    start: () => project('tutorial: mover', [scene('parque', [spr('gato', 4, 10)])]),
    guide: [
      { sel: '.palette-cat[data-cat="start"]', text: 'los bloques amarillos ponen en marcha', icon: '🟡' },
      { sel: '.palette-block[data-type="onFlag"]', text: 'arrastra la bandera al área de código', icon: '🚩' },
      { sel: '.palette-cat[data-cat="motion"]', text: 'ahora los azules', icon: '🔵' },
      { sel: '.palette-block[data-type="right"]', text: 'pega la flecha a la bandera', icon: '🧲' },
      { sel: '#btn-flag', text: '¡pulsa la bandera!', icon: '🚩' },
    ],
    check: [
      cond('🚩➡️ bandera y un movimiento', (p) => kind(p, 'gato').some((s) => simulate(s).path.length > 1)),
    ],
  },
  {
    id: 't2', title: 'hacer que diga algo', icon: '💬',
    start: () => project('tutorial: decir', [scene('parque', [spr('nina', 8, 10, [[b('onFlag')]])])]),
    guide: [
      { sel: '.palette-cat[data-cat="looks"]', text: 'abre los bloques morados', icon: '🟣' },
      { sel: '.palette-block[data-type="say"]', text: 'arrastra «decir» detrás de la bandera', icon: '💬' },
      { sel: '#code-area .block[data-type="say"] .b-val', text: 'toca la burbuja y elige una frase', icon: '👆' },
      { sel: '#btn-flag', text: '¡a hablar!', icon: '🚩' },
    ],
    check: [cond('💬 añade «decir»', (p) => allSprites(p).some((s) => scriptsOf(s).some((sc) => has(sc, 'say'))))],
  },
  {
    id: 't3', title: 'repetir un salto 5 veces', icon: '🔁',
    start: () => project('tutorial: repetir', [scene('bosque', [spr('perro', 10, 11, [[b('onFlag')]])])]),
    guide: [
      { sel: '.palette-cat[data-cat="control"]', text: 'abre los bloques naranjas', icon: '🟠' },
      { sel: '.palette-block[data-type="repeat"]', text: 'engancha «repetir» a la bandera', icon: '🔁' },
      { sel: '.palette-cat[data-cat="motion"]', text: 'busca «saltar»', icon: '⤴️' },
      { sel: '#code-area .loop-body', text: 'mete «saltar» dentro del corchete', icon: '📥' },
      { sel: '#code-area .loop-cap .b-val', text: 'gira la rueda hasta el 5', icon: '5️⃣' },
    ],
    check: [cond('🔁 repetir 5 con saltar dentro', (p) => allSprites(p).some((s) => scriptsOf(s).some((sc) => findRepeat(sc, 5, 'hop'))))],
  },
  {
    id: 't4', title: 'dos personajes que se hablan', icon: '📨',
    start: () => project('tutorial: mensajes', [scene('parque', [
      spr('gato', 5, 10, [[b('onFlag'), b('say', '¡hola!')]]),
      spr('perro', 15, 10),
    ])]),
    guide: [
      { sel: '.palette-cat[data-cat="start"]', text: 'en los amarillos hay sobres de colores', icon: '✉️' },
      { sel: '.palette-block[data-type="send"]', text: 'el gato envía un mensaje después de saludar', icon: '📨' },
      { sel: '.sprite-thumb:nth-child(2)', text: 'elige al perro', icon: '🐶' },
      { sel: '.palette-block[data-type="onMessage"]', text: 'el perro empieza «al recibir» el mismo color y contesta', icon: '📩' },
      { sel: '#btn-flag', text: '¡escucha la conversación!', icon: '🚩' },
    ],
    check: [
      cond('📨📩 un personaje envía y otro recibe el mismo mensaje', (p) => {
        const sps = allSprites(p);
        return sps.some((a) => a.scripts.some((sc) => flat(sc.blocks).some((x) => x.type === 'send' &&
          sps.some((o) => o !== a && scriptsOf(o, 'onMessage').some((r) => num(r.blocks[0], 1) === num(x, 1))))));
      }),
    ],
  },
];
