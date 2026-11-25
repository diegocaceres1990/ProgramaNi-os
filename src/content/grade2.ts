// Cuaderno de 2º: 12 proyectos guiados. Rúbrica común: funciona, usa los bloques del módulo, se entiende la idea.
import type { Lesson } from '../core/verify';
import { cond, allSprites, scriptsOf, actions, has, speedOf, simulate, pathTouches, isPainted, hasPhoto, flat, num, trigger } from '../core/verify';
import type { Project, Sprite, Script } from '../core/state';
import { b, project, scene, spr, kind, first, append, insert, addScript, addSprite, fakeSound, busySprites, PAINTED_BG, PHOTO_SPRITE } from './adventures';

const MOVES = ['right', 'left', 'up', 'down'];

const sends = (sc: Script) => flat(sc.blocks).filter((x) => x.type === 'send').map((x) => num(x, 1));
const recv = (sc: Script) => (sc.blocks[0]?.type === 'onMessage' ? num(sc.blocks[0], 1) : null);
const moves = (sc: Script) => actions(sc).some((x) => MOVES.includes(x.type) && num(x, 1) > 0);

/** ¿La página i (0..) tiene algún programa que vaya a la página n? */
const pageGoes = (p: Project, i: number, n: number) =>
  !!p.scenes[i] && p.scenes[i].sprites.some((s) => scriptsOf(s).some((sc) => has(sc, 'goPage', (x) => num(x, 1) === n)));

/** ¿Algún personaje de la escena i llega a tocar a otro que tiene «al chocar»? */
const reachesInScene = (p: Project, i: number) => {
  const sps = p.scenes[i]?.sprites ?? [];
  const goals = sps.filter((s) => scriptsOf(s, 'onBump').length > 0);
  return sps.some((r) => goals.some((g) => g !== r && pathTouches(r, g)));
};

/** Índice del primer movimiento y de la primera espera en un script. */
const waitsBeforeMoving = (sc: Script) => {
  const a = actions(sc);
  const w = a.findIndex((x) => x.type === 'wait');
  const m = a.findIndex((x) => MOVES.includes(x.type));
  return w >= 0 && m > w;
};

export const GRADE2: Lesson[] = [
  {
    id: 'g2-1', track: 'grado2', num: 1, title: 'historia de 4 páginas con mensajes', icon: '📚', rubric: true,
    goals: [
      { pic: '📄📄📄📄', text: 'una historia larga se reparte en 4 páginas' },
      { pic: '📨📩', text: 'con mensajes, un personaje avisa a otro de la misma página' },
      { pic: '⏳➡️📄', text: 'esperar un poco antes de pasar de página deja leer' },
    ],
    challenge: 'historia de 4 páginas: cada página pasa a la siguiente y, en alguna, un personaje avisa a otro con un mensaje.',
    introduces: ['onFlag', 'say', 'goPage', 'send', 'onMessage', 'wait'],
    guide: [
      { sel: '.scene-thumb[data-idx="0"]', text: 'en la página 1, la niña avisa al gato con «enviar»', icon: '📨' },
      { sel: '.sprite-thumb:nth-child(2)', text: 'el gato contesta «al recibir»', icon: '📩' },
      { sel: '.palette-cat[data-cat="end"]', text: 'cada página termina con «ir a página»', icon: '📄' },
    ],
    start: () => project('historia larga', [
      scene('parque', [spr('nina', 5, 10, [[b('onFlag'), b('say', 'había una vez…')]]), spr('gato', 14, 10)]),
      scene('bosque', [spr('perro', 8, 10, [[b('onFlag'), b('say', 'en el bosque…')]])]),
      scene('playa', [spr('nino', 10, 10, [[b('onFlag'), b('say', 'en la playa…')]])]),
      scene('espacio', [spr('cohete', 10, 8, [[b('onFlag'), b('say', '¡y al espacio!')]])]),
    ]),
    solution: (p) => {
      append(p.scenes[0].sprites[0], [b('send', 1), b('wait', 20), b('goPage', 2)]);
      addScript(p.scenes[0].sprites[1], [b('onMessage', 1), b('say', '¡voy!')]);
      append(p.scenes[1].sprites[0], [b('goPage', 3)]);
      append(p.scenes[2].sprites[0], [b('goPage', 4)]);
    },
    check: [
      cond('📄 la historia necesita 4 páginas', (p) => p.scenes.length >= 4),
      cond('💬 en las 4 páginas alguien tiene que hablar', (p) => p.scenes.slice(0, 4).every((s) => s.sprites.some((sp) => scriptsOf(sp).some((sc) => has(sc, 'say'))))),
      cond('➡️ la página 1 va a la 2, la 2 a la 3 y la 3 a la 4', (p) => pageGoes(p, 0, 2) && pageGoes(p, 1, 3) && pageGoes(p, 2, 4)),
      cond('📨📩 en alguna página un personaje envía un mensaje y otro de esa página lo recibe', (p) => p.scenes.some((s) => s.sprites.some((a) =>
        a.scripts.some((sc) => sends(sc).some((n) => s.sprites.some((o) => o !== a && o.scripts.some((r) => recv(r) === n))))))),
    ],
  },
  {
    id: 'g2-2', track: 'grado2', num: 2, title: 'pilla-pilla', icon: '🏃', rubric: true,
    goals: [
      { pic: '🐶➡️🐱', text: 'el que persigue corre hacia el otro' },
      { pic: '💥', text: '«al chocar» detecta que lo ha pillado' },
      { pic: '⏹️', text: '«fin» acaba el juego' },
    ],
    challenge: 'pilla-pilla: el perro corre hasta alcanzar al gato y, cuando lo pilla, el gato dice algo y su programa termina.',
    introduces: ['onBump', 'right', 'end'],
    guide: [
      { sel: '.sprite-thumb:nth-child(1)', text: 'el perro corre hacia el gato', icon: '🐶' },
      { sel: '.sprite-thumb:nth-child(2)', text: 'el gato: «al chocar», «decir» y «fin»', icon: '🐱' },
      { sel: '#btn-flag', text: '¡a pillar!', icon: '🚩' },
    ],
    start: () => project('pilla-pilla', [scene('parque', [
      spr('perro', 2, 10, [[b('onFlag')]]),
      spr('gato', 15, 10, [[b('onFlag'), b('say', '¡no me pillas!')]]),
    ])]),
    solution: (p) => {
      append(first(p, 'perro'), [b('right', 12)]);
      addScript(first(p, 'gato'), [b('onBump', ''), b('say', '¡me pillaste!'), b('end')]);
    },
    check: [
      cond('💥 el que es pillado necesita «al chocar», decir algo y terminar con fin', (p) => allSprites(p).some((s) => scriptsOf(s, 'onBump').some((sc) => has(sc, 'say') && sc.blocks[sc.blocks.length - 1].type === 'end'))),
      cond('🐶 el perseguidor tiene que llegar a tocarlo', (p) => p.scenes.some((_, i) => reachesInScene(p, i))),
    ],
  },
  {
    id: 'g2-3', track: 'grado2', num: 3, title: 'laberinto con muro y reinicio', icon: '🧱', rubric: true,
    goals: [
      { pic: '🌳🧱', text: 'el árbol hace de muro' },
      { pic: '💥🏠', text: 'si chocas con el muro, «ir a casa» te devuelve a la salida' },
      { pic: '⬆️➡️⬇️⭐', text: 'hay que rodear el muro para llegar' },
    ],
    challenge: 'laberinto con muro: si el gato choca con el árbol vuelve a casa; si lo rodea y llega a la estrella, ella lo celebra.',
    introduces: ['home', 'up', 'down'],
    guide: [
      { sel: '#btn-flag', text: 'prueba: ¿por dónde hay que ir?', icon: '🤔' },
      { sel: '.palette-block[data-type="onBump"]', text: 'el gato: «al chocar con el árbol» + «ir a casa»', icon: '💥' },
      { sel: '.sprite-thumb:nth-child(3)', text: 'la estrella celebra «al chocar»', icon: '⭐' },
    ],
    start: () => project('muro', [scene('bosque', [
      spr('gato', 2, 7, [[b('onFlag')]]),
      spr('arbol', 10, 7),
      spr('estrella', 18, 7),
    ])]),
    solution: (p) => {
      const cat = first(p, 'gato');
      append(cat, [b('up', 3), b('right', 16), b('down', 3)]);
      addScript(cat, [b('onBump', first(p, 'arbol').id), b('home')]);
      addScript(first(p, 'estrella'), [b('onBump', ''), b('say', '¡bravo!')]);
    },
    check: [
      cond('🏠 si el gato choca con el árbol tiene que volver a casa', (p) => {
        const tree = kind(p, 'arbol')[0];
        return kind(p, 'gato').some((s) => scriptsOf(s, 'onBump').some((sc) => (!sc.blocks[0].value || sc.blocks[0].value === tree?.id) && has(sc, 'home')));
      }),
      cond('⭐ el gato tiene que llegar a la estrella sin tocar el árbol', (p) => {
        const tree = kind(p, 'arbol')[0], star = kind(p, 'estrella')[0];
        return !!tree && !!star && kind(p, 'gato').some((s) => pathTouches(s, star) && !pathTouches(s, tree));
      }),
      cond('💬 la estrella celebra la llegada al chocar', (p) => kind(p, 'estrella').some((s) => scriptsOf(s, 'onBump').some((sc) => has(sc, 'say')))),
    ],
  },
  {
    id: 'g2-4', track: 'grado2', num: 4, title: 'tres velocidades y esperas', icon: '⏱️', rubric: true,
    goals: [
      { pic: '🐌🚶🚀', text: 'cada personaje con su velocidad' },
      { pic: '⏳', text: '«esperar» retrasa la salida' },
      { pic: '🎬', text: 'combinando las dos cosas sale una animación' },
    ],
    challenge: 'animación: tres personajes con velocidades distintas y cada uno espera un rato antes de echar a andar.',
    introduces: ['speed'],
    guide: [
      { sel: '.palette-cat[data-cat="control"]', text: 'velocidad y esperar son naranjas', icon: '🟠' },
      { sel: '.sprite-thumb:nth-child(1)', text: 'ponlos detrás de la bandera, antes de moverse', icon: '🧩' },
    ],
    start: () => project('animación', [scene('parque', [
      spr('mariposa', 2, 4, [[b('onFlag'), b('right', 14)]]),
      spr('perro', 2, 8, [[b('onFlag'), b('right', 14)]]),
      spr('caracol', 2, 12, [[b('onFlag'), b('right', 14)]]),
    ])]),
    solution: (p) => {
      const plan: [string, string, number][] = [['mariposa', 'rapida', 20], ['perro', 'normal', 10], ['caracol', 'lenta', 5]];
      for (const [k, v, w] of plan) { const s = first(p, k); insert(s, 1, b('speed', v)); insert(s, 2, b('wait', w)); }
    },
    check: [
      cond('🐌🚶🚀 los tres necesitan velocidades distintas', (p) => new Set(allSprites(p).map(speedOf).filter((x) => x !== null)).size >= 3),
      cond('⏳ cada uno de los tres espera antes de su primer movimiento', (p) => allSprites(p).filter((s) => scriptsOf(s, 'onFlag').some(waitsBeforeMoving)).length >= 3),
    ],
  },
  {
    id: 'g2-5', track: 'grado2', num: 5, title: 'acierto o error', icon: '❓', rubric: true,
    goals: [
      { pic: '❓', text: 'un personaje hace una pregunta' },
      { pic: '👆4️⃣ 👆2️⃣', text: 'cada respuesta es un personaje que se puede tocar' },
      { pic: '✅❌', text: 'la correcta felicita y la otra anima a probar otra vez' },
    ],
    challenge: 'pregunta con dos respuestas: al tocar la correcta dice que has acertado y al tocar la otra te anima a intentarlo de nuevo.',
    introduces: ['onTap'],
    guide: [
      { sel: '#btn-flag', text: 'escucha la pregunta', icon: '❓' },
      { sel: '.sprite-thumb:nth-child(2)', text: 'la pelota (4): «al tocarme» + «¡bien!»', icon: '✅' },
      { sel: '.sprite-thumb:nth-child(3)', text: 'la estrella (2): «al tocarme» + «inténtalo otra vez»', icon: '❌' },
    ],
    start: () => project('pregunta', [scene('habitacion', [
      spr('nina', 4, 10, [[b('onFlag'), b('say', '¿cuántas patas tiene un gato?')]]),
      spr('pelota', 12, 6),
      spr('estrella', 17, 6),
    ], [{ x: 12, y: 9, text: '4' }, { x: 17, y: 9, text: '2' }])]),
    solution: (p) => {
      addScript(first(p, 'pelota'), [b('onTap'), b('say', '¡bien!')]);
      addScript(first(p, 'estrella'), [b('onTap'), b('say', 'inténtalo otra vez')]);
    },
    check: [
      cond('👆 las dos respuestas necesitan «al tocarme»', (p) => allSprites(p).filter((s) => scriptsOf(s, 'onTap').length > 0).length >= 2),
      cond('✅❌ cada respuesta tiene que decir algo distinto: una acierto y otra error', (p) => {
        const texts = allSprites(p).map((s) => scriptsOf(s, 'onTap').flatMap((sc) => flat(sc.blocks).filter((x) => x.type === 'say').map((x) => String(x.value)))[0]).filter((x): x is string => !!x);
        return new Set(texts).size >= 2;
      }),
      cond('❓ alguien hace la pregunta al pulsar la bandera', (p) => allSprites(p).some((s) => scriptsOf(s, 'onFlag').some((sc) => has(sc, 'say')))),
    ],
  },
  {
    id: 'g2-6', track: 'grado2', num: 6, title: 'museo interactivo', icon: '🏛️', rubric: true,
    goals: [
      { pic: '🖼️🖼️🖼️', text: 'cada personaje es una obra del museo' },
      { pic: '👆', text: 'al tocar una obra, se explica' },
      { pic: '💬🎤', text: 'con una burbuja o con tu voz grabada' },
    ],
    challenge: 'museo: al tocar cada una de las 3 obras, se explica con una burbuja o con tu voz; al menos una con tu voz grabada.',
    introduces: ['playSound'],
    guide: [
      { sel: '.sprite-thumb:nth-child(1)', text: 'el árbol: «al tocarme» + «decir»', icon: '🌳' },
      { sel: '#btn-record', text: 'graba una explicación para la mariposa', icon: '🎤' },
      { sel: '#stage', text: 'visita el museo tocando las obras', icon: '👆' },
    ],
    start: () => project('museo', [scene('habitacion', [spr('arbol', 4, 9), spr('pez', 10, 9), spr('mariposa', 16, 9)])]),
    solution: (p) => {
      addScript(first(p, 'arbol'), [b('onTap'), b('say', 'me plantó la abuela')]);
      addScript(first(p, 'pez'), [b('onTap'), b('say', 'vivo en el mar')]);
      const m = first(p, 'mariposa');
      m.sounds.push(fakeSound());
      addScript(m, [b('onTap'), b('playSound', 1)]);
    },
    check: [
      cond('👆 las 3 obras necesitan «al tocarme»', (p) => allSprites(p).filter((s) => scriptsOf(s, 'onTap').length > 0).length >= 3),
      cond('🗣️ cada obra explica algo con «decir» o con «reproducir sonido»', (p) =>
        allSprites(p).filter((s) => scriptsOf(s, 'onTap').some((sc) => has(sc, 'say') || (has(sc, 'playSound') && s.sounds.length > 0))).length >= 3),
      cond('🎤 al menos una obra se explica con tu voz grabada', (p) => allSprites(p).some((s) => s.sounds.length > 0 && scriptsOf(s, 'onTap').some((sc) => has(sc, 'playSound')))),
    ],
  },
  {
    id: 'g2-7', track: 'grado2', num: 7, title: 'carrera de relevos', icon: '🏃‍♀️', rubric: true,
    goals: [
      { pic: '🏃‍♀️📨', text: 'el primero corre y pasa el relevo con un mensaje' },
      { pic: '📩🏃📨', text: 'el segundo lo recibe, corre y avisa con otro color' },
      { pic: '📩🐶', text: 'el tercero termina la carrera' },
    ],
    challenge: 'relevos: el primero corre y avisa al segundo con un mensaje; el segundo corre y avisa al tercero con un mensaje de otro color.',
    introduces: [],
    guide: [
      { sel: '.sprite-thumb:nth-child(1)', text: 'la niña: correr + «enviar» 🔴', icon: '📨' },
      { sel: '.sprite-thumb:nth-child(2)', text: 'el niño: «al recibir» 🔴, correr, «enviar» 🟠', icon: '📩' },
      { sel: '.sprite-thumb:nth-child(3)', text: 'el perro: «al recibir» 🟠 y correr', icon: '🐶' },
    ],
    start: () => project('relevos', [scene('parque', [
      spr('nina', 2, 4, [[b('onFlag')]]),
      spr('nino', 8, 8),
      spr('perro', 14, 12),
    ])]),
    solution: (p) => {
      append(first(p, 'nina'), [b('right', 5), b('send', 1)]);
      addScript(first(p, 'nino'), [b('onMessage', 1), b('right', 5), b('send', 2)]);
      addScript(first(p, 'perro'), [b('onMessage', 2), b('right', 4)]);
    },
    check: [
      cond('🏃‍♀️ el primero corre al pulsar la bandera y después envía un mensaje', (p) => allSprites(p).some((s) => scriptsOf(s, 'onFlag').some((sc) => moves(sc) && sends(sc).length > 0))),
      cond('📩📨 el segundo recibe ese mensaje, corre y envía otro de distinto color', (p) => relay(p, 2)),
      cond('📩 el tercero recibe el segundo mensaje y corre', (p) => relay(p, 3)),
    ],
  },
  {
    id: 'g2-8', track: 'grado2', num: 8, title: 'mi escena con foto', icon: '🤳', rubric: true,
    goals: [
      { pic: '🖌️🖼️', text: 'el fondo lo pintas tú' },
      { pic: '📷🙂', text: 'tu foto puede ser un personaje' },
      { pic: '💬', text: 'tu personaje-foto se presenta' },
    ],
    challenge: 'escena propia: pinta tú el fondo y añade un personaje con tu foto que se presente diciendo algo.',
    introduces: [],
    guide: [
      { sel: '#btn-bg', text: 'pinta el fondo con 🖌️', icon: '🖼️' },
      { sel: '#sprite-add', text: 'nuevo personaje 🖌️ y usa 📷 dentro', icon: '📷' },
      { sel: '.palette-cat[data-cat="looks"]', text: 'que se presente con «decir»', icon: '💬' },
    ],
    start: () => project('mi escena', [scene(null, [spr('gato', 4, 10)])]),
    solution: (p) => {
      p.scenes[0].bg = PAINTED_BG;
      const me = addSprite(p, 0, 'gato', 12, 9, [[b('onFlag'), b('say', '¡hola, soy yo!')]]);
      me.svg = PHOTO_SPRITE;
      me.name = 'yo';
    },
    check: [
      cond('🖌️ pinta tú el fondo con el editor de pintura', (p) => p.scenes.some((s) => isPainted(s.bg))),
      cond('📷 añade un personaje con una foto de la cámara', (p) => allSprites(p).some((s) => hasPhoto(s.svg))),
      cond('💬 el personaje de la foto se presenta con «decir» al pulsar la bandera', (p) => allSprites(p).some((s) => hasPhoto(s.svg) && scriptsOf(s, 'onFlag').some((sc) => has(sc, 'say')))),
    ],
  },
  {
    id: 'g2-9', track: 'grado2', num: 9, title: 'juego de 3 niveles', icon: '🎮', rubric: true,
    goals: [
      { pic: '1️⃣2️⃣3️⃣', text: 'cada página es un nivel del juego' },
      { pic: '⭐💥📄', text: 'al llegar a la estrella se pasa de nivel' },
      { pic: '🏆', text: 'en el último nivel se gana' },
    ],
    challenge: 'juego de 3 niveles: en los niveles 1 y 2, al llegar a la estrella se pasa al siguiente; en el 3 la estrella da la enhorabuena.',
    introduces: [],
    guide: [
      { sel: '.sprite-thumb:nth-child(2)', text: 'nivel 1: la estrella, «al chocar» + «ir a página 2»', icon: '⭐' },
      { sel: '.scene-thumb[data-idx="1"]', text: 'nivel 2: lo mismo hacia la página 3', icon: '2️⃣' },
      { sel: '.scene-thumb[data-idx="2"]', text: 'nivel 3: la estrella felicita', icon: '🏆' },
    ],
    start: () => project('tres niveles', ['parque', 'bosque', 'espacio'].map((bg) => scene(bg, [
      spr('gato', 2, 8, [[b('onFlag'), b('right', 15)]]),
      spr('estrella', 18, 8),
    ]))),
    solution: (p) => {
      addScript(p.scenes[0].sprites[1], [b('onBump', ''), b('goPage', 2)]);
      addScript(p.scenes[1].sprites[1], [b('onBump', ''), b('goPage', 3)]);
      addScript(p.scenes[2].sprites[1], [b('onBump', ''), b('say', '¡campeón!')]);
    },
    check: [
      cond('📄 el juego necesita 3 páginas (niveles)', (p) => p.scenes.length >= 3),
      cond('⭐ en el nivel 1, al chocar se va al nivel 2', (p) => p.scenes[0].sprites.some((s) => scriptsOf(s, 'onBump').some((sc) => has(sc, 'goPage', (x) => num(x, 1) === 2)))),
      cond('⭐ en el nivel 2, al chocar se va al nivel 3', (p) => !!p.scenes[1] && p.scenes[1].sprites.some((s) => scriptsOf(s, 'onBump').some((sc) => has(sc, 'goPage', (x) => num(x, 1) === 3)))),
      cond('🏆 en el nivel 3 la estrella felicita al chocar', (p) => !!p.scenes[2] && p.scenes[2].sprites.some((s) => scriptsOf(s, 'onBump').some((sc) => has(sc, 'say')))),
      cond('🐱 en cada nivel el gato tiene que llegar a la estrella', (p) => [0, 1, 2].every((i) => reachesInScene(p, i))),
    ],
  },
  {
    id: 'g2-10', track: 'grado2', num: 10, title: 'cadena de 6 mensajes', icon: '🔗', rubric: true,
    goals: [
      { pic: '🔴🟠🟡🟢🔵🟣', text: 'hay 6 colores de mensaje' },
      { pic: '📩⤴️📨', text: 'cada personaje recibe uno, salta y envía el siguiente' },
      { pic: '🔗', text: 'si un eslabón falta, la cadena se para' },
    ],
    challenge: 'cadena de 6 mensajes: cada personaje recibe un mensaje, salta y envía el siguiente color, del 1 al 6, y el último dice algo.',
    introduces: ['hop'],
    guide: [
      { sel: '#btn-flag', text: 'mira: la cadena llega hasta el pez y se para', icon: '🔗' },
      { sel: '.sprite-thumb:nth-child(4)', text: 'la mariposa recibe el 3, salta y envía el 4', icon: '🦋' },
      { sel: '.sprite-thumb:nth-child(7)', text: 'la estrella recibe el 6 y dice algo', icon: '⭐' },
    ],
    start: () => project('cadena', [scene('parque', [
      spr('gato', 2, 11, [[b('onFlag'), b('send', 1)]]),
      spr('perro', 5, 8, [[b('onMessage', 1), b('hop', 2), b('send', 2)]]),
      spr('pez', 8, 11, [[b('onMessage', 2), b('hop', 2), b('send', 3)]]),
      spr('mariposa', 11, 8),
      spr('nube', 14, 4),
      spr('cohete', 16, 10),
      spr('estrella', 18, 4),
    ])]),
    solution: (p) => {
      addScript(first(p, 'mariposa'), [b('onMessage', 3), b('hop', 2), b('send', 4)]);
      addScript(first(p, 'nube'), [b('onMessage', 4), b('hop', 2), b('send', 5)]);
      addScript(first(p, 'cohete'), [b('onMessage', 5), b('hop', 2), b('send', 6)]);
      addScript(first(p, 'estrella'), [b('onMessage', 6), b('say', '¡fin de la cadena!')]);
    },
    check: [
      cond('✉️ se usan los 6 mensajes: cada color se envía y alguien lo recibe', (p) => [1, 2, 3, 4, 5, 6].every((n) =>
        allSprites(p).some((s) => s.scripts.some((sc) => sends(sc).includes(n))) && allSprites(p).some((s) => s.scripts.some((sc) => recv(sc) === n)))),
      cond('🔗 la cadena no se corta: quien recibe un mensaje salta y envía el siguiente', (p) => [1, 2, 3, 4, 5].every((n) =>
        allSprites(p).some((s) => s.scripts.some((sc) => recv(sc) === n && has(sc, 'hop') && sends(sc).includes(n + 1))))),
      cond('💬 el que recibe el último mensaje dice algo', (p) => allSprites(p).some((s) => s.scripts.some((sc) => recv(sc) === 6 && has(sc, 'say')))),
    ],
  },
  {
    id: 'g2-11', track: 'grado2', num: 11, title: 'depurar un proyecto roto', icon: '🐞', rubric: true,
    goals: [
      { pic: '🐞', text: 'un error en el programa se llama «bicho»' },
      { pic: '🔍', text: 'para encontrarlo, prueba y mira bloque a bloque' },
      { pic: '🧹', text: 'quita lo que sobra y corrige los números' },
    ],
    challenge: 'arregla el proyecto roto: al pulsar la bandera el gato debe llegar a la columna 16 o más y saltar al final, sin bloques sueltos.',
    introduces: ['repeat', 'left'],
    guide: [
      { sel: '#btn-flag', text: 'prueba: ¿qué hace mal?', icon: '🔍' },
      { sel: '#code-area .block[data-type="end"]', text: '¿por qué se para tan pronto?', icon: '⏹️' },
      { sel: '#code-area .loop-cap .b-val', text: '¿cuántas veces hay que repetir para llegar?', icon: '🔢' },
      { sel: '#code-area', text: 'los bloques sin amarillo no hacen nada: arrástralos fuera', icon: '🧹' },
    ],
    start: () => project('proyecto roto', [scene('parque', [
      spr('gato', 2, 9, [[b('onFlag'), b('end'), b('repeat', 2, [b('right', 2)]), b('hop', 2)], [b('left', 5)]]),
    ])]),
    solution: (p) => {
      const cat = first(p, 'gato');
      const main = cat.scripts[0];
      main.blocks = main.blocks.filter((x) => x.type !== 'end');
      const loop = main.blocks.find((x) => x.type === 'repeat')!;
      loop.value = 7;
      cat.scripts = [main];
    },
    check: [
      cond('➡️ al pulsar la bandera el gato tiene que llegar a la columna 16 o más', (p) => kind(p, 'gato').some((s) => simulate(s).x >= 16)),
      cond('⤴️ después de llegar, el gato tiene que saltar', (p) => kind(p, 'gato').some((s) => simulate(s).hopXs.some((x) => x >= 16))),
      cond('🧹 no puede quedar ningún programa sin bloque amarillo', (p) => allSprites(p).every((s) => s.scripts.every((sc) => trigger(sc) !== null))),
    ],
  },
  {
    id: 'g2-12', track: 'grado2', num: 12, title: 'proyecto libre y presentación', icon: '🎤', rubric: true, free: true,
    goals: [
      { pic: '🔤📄', text: 'la página 1 es la portada con el título' },
      { pic: '➡️📄', text: 'después viene tu proyecto' },
      { pic: '✅✅✅', text: 'la rúbrica revisa que funcione, los bloques y la idea' },
    ],
    challenge: 'proyecto final con presentación: una portada con el título escrito que pasa a otra página donde está tu proyecto.',
    introduces: [],
    guide: [
      { sel: '#btn-text', text: 'escribe el título en la portada', icon: '🔤' },
      { sel: '#scene-add', text: 'añade la página de tu proyecto', icon: '➕' },
      { sel: '.palette-cat[data-cat="end"]', text: 'la portada pasa a la página 2', icon: '📄' },
    ],
    start: () => project('mi presentación', [scene('parque', [spr('gato', 5, 10)])]),
    solution: (p) => {
      p.scenes[0].texts.push({ x: 10, y: 3, text: 'mi proyecto' });
      addScript(first(p, 'gato'), [b('onFlag'), b('say', 'te presento mi proyecto'), b('goPage', 2)]);
      p.scenes.push(scene('playa', [spr('perro', 10, 10, [[b('onFlag'), b('hop', 2)]])]));
    },
    check: [
      cond('📄 la presentación necesita al menos 2 páginas', (p) => p.scenes.length >= 2),
      cond('🔤 en la portada (página 1) escribe el título con el botón de texto', (p) => p.scenes[0].texts.length > 0),
      cond('➡️ la portada tiene que pasar a la página 2', (p) => pageGoes(p, 0, 2)),
      cond('🧩 en la página 2 tiene que pasar algo al empezar', (p) => !!p.scenes[1] && busySprites(p.scenes[1]) > 0),
    ],
  },
];

/** Cadena de relevos de longitud n: A (bandera) → B (recibe m1, se mueve, envía m2 ≠ m1) → C (recibe m2, se mueve). */
function relay(p: Project, n: 2 | 3): boolean {
  const sps = allSprites(p);
  for (const a of sps) {
    for (const sa of scriptsOf(a, 'onFlag')) {
      if (!moves(sa)) continue;
      for (const m1 of sends(sa)) {
        for (const bS of sps) {
          if (bS === a) continue;
          for (const sb of bS.scripts) {
            if (recv(sb) !== m1 || !moves(sb)) continue;
            const m2s = sends(sb).filter((m) => m !== m1);
            if (!m2s.length) continue;
            if (n === 2) return true;
            if (sps.some((c: Sprite) => c !== a && c !== bS && c.scripts.some((sc) => m2s.includes(recv(sc) ?? -1) && moves(sc)))) return true;
          }
        }
      }
    }
  }
  return false;
}
