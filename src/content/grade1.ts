// Cuaderno de 1º: 12 proyectos guiados. Rúbrica común: funciona, usa los bloques del módulo, se entiende la idea.
import type { Block, Project, Script } from '../core/state';
import type { Lesson } from '../core/verify';
import {
  cond, allSprites, scriptsOf, actions, has, inOrder, findRepeat, speedOf, simulate, pathTouches, pathInside,
  isPainted, hasPhoto, flat, num,
} from '../core/verify';
import {
  b, project, scene, spr, kind, first, append, insert, addScript, addSprite, fakeSound, busySprites,
  PAINTED_SPRITE, PHOTO_BG,
} from './adventures';

const MOVES = ['right', 'left', 'up', 'down'];

/** Pasillos del laberinto de 1º (en celdas): [x0, y0, x1, y1]. */
export const MAZE1_PATHS: [number, number, number, number][] = [[0, 1, 11, 3], [9, 1, 11, 13], [9, 11, 20, 13]];

/** Fondo original de laberinto: hierba oscura (muros) y camino de arena. */
export const MAZE1_BG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360">' +
  '<rect width="480" height="360" fill="#2F7A3A"/>' +
  '<g fill="#F2D49B"><rect x="0" y="12" width="276" height="72" rx="14"/><rect x="204" y="12" width="72" height="312" rx="14"/><rect x="204" y="252" width="276" height="72" rx="14"/></g>' +
  '<g fill="#3E9A4B">' + Array.from({ length: 18 }, (_, i) => `<circle cx="${(i * 71) % 480}" cy="${120 + ((i * 47) % 120)}" r="${10 + (i % 3) * 4}"/>`).join('') + '</g>' +
  '</svg>';

/** Bucle (repetir o por siempre) cuyos hijos cumplen el predicado. */
export function loopWith(sc: Script, pred: (children: Block[]) => boolean): boolean {
  return flat(sc.blocks).some((x) => (x.type === 'repeat' || x.type === 'forever') && pred(flat(x.children ?? [])));
}

/** Firma de los bucles de bandera de un personaje (para comparar bailes). */
function danceSignature(p: Project, spriteIdx: number): string | null {
  const sp = allSprites(p)[spriteIdx];
  const sc = sp && scriptsOf(sp, 'onFlag').find((s) => findRepeat(s));
  if (!sc) return null;
  return JSON.stringify(actions(sc).map((x) => `${x.type}:${x.value ?? ''}`));
}

export const GRADE1: Lesson[] = [
  {
    id: 'g1-1', track: 'grado1', num: 1, title: 'collage de 4 personajes', icon: '🎨', rubric: true,
    goals: [
      { pic: '🖼️', text: 'un collage junta muchos personajes en una escena' },
      { pic: '➕➕➕', text: 'el «+» azul añade personajes' },
      { pic: '🚩🧩', text: 'cada uno se mueve con su propio programa' },
    ],
    challenge: 'collage: reúne 4 personajes en la escena y que cada uno se mueva a su manera al pulsar la bandera.',
    introduces: ['onFlag', 'right', 'left', 'up', 'down', 'hop'],
    guide: [
      { sel: '#sprite-add', text: 'añade 3 personajes más', icon: '➕' },
      { sel: '.palette-cat[data-cat="start"]', text: 'a cada uno: bandera…', icon: '🚩' },
      { sel: '.palette-cat[data-cat="motion"]', text: '…y un movimiento distinto', icon: '🔵' },
    ],
    start: () => project('collage', [scene('parque', [spr('gato', 3, 10)])]),
    solution: (p) => {
      addScript(first(p, 'gato'), [b('onFlag'), b('hop', 2)]);
      addSprite(p, 0, 'perro', 8, 10, [[b('onFlag'), b('right', 3)]]);
      addSprite(p, 0, 'pez', 12, 6, [[b('onFlag'), b('up', 2)]]);
      addSprite(p, 0, 'mariposa', 16, 5, [[b('onFlag'), b('left', 2)]]);
    },
    check: [
      cond('➕ en la escena tiene que haber 4 personajes', (p) => p.scenes.some((s) => s.sprites.length >= 4)),
      cond('🚩 cada uno de los 4 necesita un programa de bandera que lo mueva', (p) =>
        p.scenes.some((s) => s.sprites.filter((sp) => scriptsOf(sp, 'onFlag').some((sc) => actions(sc).some((x) => MOVES.includes(x.type) || x.type === 'hop'))).length >= 4)),
    ],
  },
  {
    id: 'g1-2', track: 'grado1', num: 2, title: 'historia de 2 páginas con 2 voces', icon: '🎙️', rubric: true,
    goals: [
      { pic: '📄📄', text: 'la historia ocupa dos páginas' },
      { pic: '🎤🎤', text: 'cada personaje habla con una voz grabada' },
      { pic: '1️⃣➡️2️⃣', text: 'la página 1 salta a la 2' },
    ],
    challenge: 'historia en 2 páginas donde se oyen 2 voces grabadas: una en cada página.',
    introduces: ['say', 'goPage', 'playSound', 'wait'],
    guide: [
      { sel: '#btn-record', text: 'graba la voz de la niña', icon: '🎤' },
      { sel: '.palette-cat[data-cat="end"]', text: 'que salte a la página 2', icon: '📄' },
      { sel: '.scene-thumb[data-idx="1"]', text: 'en la página 2, graba otra voz para el perro', icon: '🐶' },
    ],
    start: () => project('dos voces', [
      scene('parque', [spr('nina', 6, 10, [[b('onFlag')]])]),
      scene('bosque', [spr('perro', 10, 10, [[b('onFlag')]])]),
    ]),
    solution: (p) => {
      const g = p.scenes[0].sprites[0];
      g.sounds.push(fakeSound());
      append(g, [b('playSound', 1), b('goPage', 2)]);
      const d = p.scenes[1].sprites[0];
      d.sounds.push(fakeSound());
      append(d, [b('playSound', 1)]);
    },
    check: [
      cond('📄 hacen falta 2 páginas', (p) => p.scenes.length >= 2),
      cond('🎤 en la página 1 un personaje reproduce su voz grabada', (p) => p.scenes[0].sprites.some((s) => s.sounds.length > 0 && scriptsOf(s).some((sc) => has(sc, 'playSound')))),
      cond('🎤 en la página 2 otro personaje reproduce otra voz', (p) => !!p.scenes[1] && p.scenes[1].sprites.some((s) => s.sounds.length > 0 && scriptsOf(s).some((sc) => has(sc, 'playSound')))),
      cond('➡️ la página 1 tiene que pasar a la página 2', (p) => p.scenes[0].sprites.some((s) => scriptsOf(s).some((sc) => has(sc, 'goPage', (x) => num(x, 1) === 2)))),
    ],
  },
  {
    id: 'g1-3', track: 'grado1', num: 3, title: 'tarjeta de cumpleaños animada', icon: '🎂', rubric: true,
    goals: [
      { pic: '🔤', text: 'el botón de texto escribe en la tarjeta' },
      { pic: '🔼🔽🔁', text: 'crecer y encoger dentro de repetir parece un latido' },
      { pic: '🎁👀⏺️', text: '«mostrar» saca una sorpresa y «tamaño normal» lo deja todo como estaba' },
    ],
    challenge: 'tarjeta de cumpleaños: escribe un texto, haz que alguien felicite, crezca y encoja varias veces y vuelva a su tamaño, y que aparezca la estrella sorpresa.',
    introduces: ['grow', 'shrink', 'repeat', 'show', 'resetSize'],
    guide: [
      { sel: '#btn-text', text: 'escribe la felicitación', icon: '🔤' },
      { sel: '.palette-cat[data-cat="looks"]', text: 'crecer, encoger, tamaño normal y mostrar son morados', icon: '🟣' },
      { sel: '.palette-block[data-type="repeat"]', text: 'mete crecer y encoger dentro de repetir', icon: '🔁' },
      { sel: '.sprite-thumb:nth-child(2)', text: 'la estrella está escondida: ¡muéstrala!', icon: '🎁' },
    ],
    start: () => project('cumpleaños', [scene('habitacion', [
      spr('gato', 8, 10, [[b('onFlag')]]),
      spr('estrella', 15, 4, [], { visible: false }),
    ])]),
    solution: (p) => {
      p.scenes[0].texts.push({ x: 10, y: 2, text: '¡feliz cumpleaños!' });
      append(first(p, 'gato'), [b('say', '¡feliz cumpleaños!'), b('repeat', 3, [b('grow', 2), b('shrink', 2)]), b('resetSize')]);
      addScript(first(p, 'estrella'), [b('onFlag'), b('show')]);
    },
    check: [
      cond('🔤 escribe un texto en la tarjeta con el botón de texto', (p) => p.scenes.some((s) => s.texts.length > 0)),
      cond('💬 alguien tiene que felicitar con «decir»', (p) => allSprites(p).some((s) => scriptsOf(s).some((sc) => has(sc, 'say')))),
      cond('🔁 alguien crece y encoge dentro de un «repetir»', (p) => allSprites(p).some((s) => scriptsOf(s).some((sc) => loopWith(sc, (c) => c.some((x) => x.type === 'grow') && c.some((x) => x.type === 'shrink'))))),
      cond('⏺️ después del bucle, «tamaño normal»', (p) => allSprites(p).some((s) => scriptsOf(s).some((sc) => inOrder(sc, ['repeat', 'resetSize'])))),
      cond('🎁 la estrella escondida tiene que aparecer con «mostrar» al pulsar la bandera', (p) => allSprites(p).some((s) => !s.visible && simulate(s).visible)),
    ],
  },
  {
    id: 'g1-4', track: 'grado1', num: 4, title: 'baile sincronizado', icon: '💃', rubric: true,
    goals: [
      { pic: '💃🕺🐱', text: 'sincronizado = todos hacen lo mismo a la vez' },
      { pic: '🔁', text: 'un bucle repite los pasos del baile' },
      { pic: '↺', text: 'girar a la izquierda también es un paso de baile' },
    ],
    challenge: 'baile sincronizado: los 3 bailarines repiten exactamente los mismos pasos, con algún giro, al pulsar la bandera.',
    introduces: ['turnL'],
    guide: [
      { sel: '.palette-block[data-type="repeat"]', text: 'primero el baile de la niña: repetir con pasos dentro', icon: '🔁' },
      { sel: '.palette-block[data-type="turnL"]', text: 'añade un giro ↺', icon: '↺' },
      { sel: '.sprite-thumb:nth-child(2)', text: 'copia los mismos pasos en los otros dos', icon: '📋' },
    ],
    start: () => project('baile', [scene('habitacion', [
      spr('nina', 4, 10, [[b('onFlag')]]),
      spr('nino', 10, 10, [[b('onFlag')]]),
      spr('gato', 16, 10, [[b('onFlag')]]),
    ])]),
    solution: (p) => {
      for (const sp of p.scenes[0].sprites) append(sp, [b('repeat', 2, [b('hop', 2), b('turnL', 3)])]);
    },
    check: [
      cond('🔁 los 3 bailarines necesitan un «repetir» en su programa de bandera', (p) =>
        allSprites(p).filter((s) => scriptsOf(s, 'onFlag').some((sc) => findRepeat(sc))).length >= 3),
      cond('↺ el baile tiene que llevar algún giro', (p) =>
        allSprites(p).filter((s) => scriptsOf(s, 'onFlag').some((sc) => loopWith(sc, (c) => c.some((x) => x.type === 'turnL' || x.type === 'turnR')))).length >= 3),
      cond('🎵 los 3 tienen que hacer exactamente los mismos pasos', (p) => {
        const sigs = allSprites(p).map((_, i) => danceSignature(p, i)).filter((x): x is string => !!x);
        const counts = new Map<string, number>();
        sigs.forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1));
        return [...counts.values()].some((n) => n >= 3);
      }),
    ],
  },
  {
    id: 'g1-5', track: 'grado1', num: 5, title: 'carrera con meta', icon: '🏁', rubric: true,
    goals: [
      { pic: '🐌🚀', text: 'cada corredor tiene su velocidad' },
      { pic: '⭐', text: 'la meta es un personaje más' },
      { pic: '💥💬', text: 'al chocar con ella, la meta avisa' },
    ],
    challenge: 'carrera: dos corredores con velocidades distintas y una meta que dice algo cuando alguien choca con ella.',
    introduces: ['speed', 'onBump'],
    guide: [
      { sel: '.palette-block[data-type="speed"]', text: 'dale una velocidad a cada corredor', icon: '🏃' },
      { sel: '.sprite-thumb:nth-child(3)', text: 'elige la meta', icon: '⭐' },
      { sel: '.palette-block[data-type="onBump"]', text: '«al chocar» + «decir»', icon: '💥' },
    ],
    start: () => project('carrera', [scene('parque', [
      spr('caracol', 2, 7, [[b('onFlag'), b('right', 15)]]),
      spr('cohete', 2, 9, [[b('onFlag'), b('right', 15)]]),
      spr('estrella', 18, 8),
    ])]),
    solution: (p) => {
      insert(first(p, 'caracol'), 1, b('speed', 'lenta'));
      insert(first(p, 'cohete'), 1, b('speed', 'rapida'));
      addScript(first(p, 'estrella'), [b('onBump', ''), b('say', '¡meta!')]);
    },
    check: [
      cond('🐌🚀 los corredores necesitan velocidades distintas', (p) => new Set(allSprites(p).map(speedOf).filter((x) => x !== null)).size >= 2),
      cond('💥 la meta necesita «al chocar» y decir algo', (p) => allSprites(p).some((s) => scriptsOf(s, 'onBump').some((sc) => has(sc, 'say')))),
      cond('🏁 algún corredor tiene que llegar a tocar la meta', (p) => {
        const goals = allSprites(p).filter((s) => scriptsOf(s, 'onBump').some((sc) => has(sc, 'say')));
        return allSprites(p).some((r) => goals.some((g) => g !== r && pathTouches(r, g)));
      }),
    ],
  },
  {
    id: 'g1-6', track: 'grado1', num: 6, title: 'lluvia', icon: '🌧️', rubric: true,
    goals: [
      { pic: '💧⬇️', text: 'una gota cae hacia abajo' },
      { pic: '🏠', text: '«ir a casa» la devuelve arriba' },
      { pic: '♾️', text: '«repetir por siempre» hace que no pare de llover' },
    ],
    challenge: 'lluvia: la gota cae, vuelve a la nube y vuelve a caer una y otra vez con un bucle.',
    introduces: ['home', 'forever'],
    guide: [
      { sel: '.palette-cat[data-cat="end"]', text: '«repetir por siempre» está en los rojos', icon: '♾️' },
      { sel: '#code-area .loop-body', text: 'dentro: bajar y volver a casa', icon: '📥' },
      { sel: '#btn-flag', text: '¡que llueva!', icon: '🌧️' },
    ],
    start: () => project('lluvia', [scene('ciudad', [
      spr('nube', 10, 2),
      spr('pelota', 10, 4, [[b('onFlag')]], { size: 40, name: 'gota' }),
    ])]),
    solution: (p) => append(p.scenes[0].sprites[1], [b('forever', undefined, [b('down', 9), b('home')])]),
    check: [
      cond('🔁 la gota necesita un bucle: «repetir» o «repetir por siempre»', (p) => allSprites(p).some((s) => scriptsOf(s).some((sc) => loopWith(sc, () => true)))),
      cond('⬇️ dentro del bucle la gota baja al menos 3 pasos', (p) => allSprites(p).some((s) => scriptsOf(s).some((sc) => loopWith(sc, (c) => c.some((x) => x.type === 'down' && num(x, 1) >= 3))))),
      cond('🏠 y después vuelve arriba para caer otra vez', (p) => allSprites(p).some((s) => scriptsOf(s).some((sc) => loopWith(sc, (c) => c.some((x) => x.type === 'home' || x.type === 'up'))))),
    ],
  },
  {
    id: 'g1-7', track: 'grado1', num: 7, title: 'cuento de 3 páginas', icon: '📖', rubric: true,
    goals: [
      { pic: '📄📄📄', text: 'un cuento tiene principio, medio y final' },
      { pic: '💬', text: 'en cada página alguien cuenta algo' },
      { pic: '➡️📄', text: '«ir a página» pasa a la siguiente' },
    ],
    challenge: 'cuento de 3 páginas: en cada página alguien habla, y las dos primeras pasan a la siguiente.',
    introduces: [],
    guide: [
      { sel: '.scene-thumb[data-idx="0"]', text: 'página 1: decir + ir a página 2', icon: '1️⃣' },
      { sel: '.scene-thumb[data-idx="1"]', text: 'página 2: decir + ir a página 3', icon: '2️⃣' },
      { sel: '.scene-thumb[data-idx="2"]', text: 'página 3: el final', icon: '3️⃣' },
    ],
    start: () => project('cuento', [
      scene('bosque', [spr('nina', 6, 10, [[b('onFlag')]])]),
      scene('parque', [spr('perro', 10, 10, [[b('onFlag')]])]),
      scene('espacio', [spr('cohete', 10, 8, [[b('onFlag')]])]),
    ]),
    solution: (p) => {
      append(p.scenes[0].sprites[0], [b('say', 'había una vez…'), b('goPage', 2)]);
      append(p.scenes[1].sprites[0], [b('say', '¡vamos!'), b('goPage', 3)]);
      append(p.scenes[2].sprites[0], [b('say', 'fin')]);
    },
    check: [
      cond('📄 el cuento necesita 3 páginas', (p) => p.scenes.length >= 3),
      cond('💬 en cada una de las 3 páginas alguien tiene que decir algo', (p) =>
        p.scenes.slice(0, 3).every((s) => s.sprites.some((sp) => scriptsOf(sp).some((sc) => has(sc, 'say'))))),
      cond('➡️ la página 1 va a la 2 y la 2 va a la 3', (p) =>
        p.scenes[0].sprites.some((s) => scriptsOf(s).some((sc) => has(sc, 'goPage', (x) => num(x, 1) === 2))) &&
        !!p.scenes[1] && p.scenes[1].sprites.some((s) => scriptsOf(s).some((sc) => has(sc, 'goPage', (x) => num(x, 1) === 3)))),
    ],
  },
  {
    id: 'g1-8', track: 'grado1', num: 8, title: 'tocar 3 estrellas', icon: '⭐', rubric: true,
    goals: [
      { pic: '👆⭐', text: 'cada estrella reacciona cuando la tocas' },
      { pic: '🫧', text: 'puede hacer un sonido' },
      { pic: '🙈', text: '«ocultar» la hace desaparecer' },
    ],
    challenge: 'juego de tocar: cada una de las 3 estrellas, al tocarla, hace algo y luego se esconde.',
    introduces: ['onTap', 'pop', 'hide'],
    guide: [
      { sel: '.sprite-thumb:nth-child(2)', text: 'primera estrella', icon: '⭐' },
      { sel: '.palette-block[data-type="onTap"]', text: '«al tocarme», algo divertido y «ocultar»', icon: '👆' },
      { sel: '#stage', text: '¡toca las estrellas!', icon: '👆' },
    ],
    start: () => project('tres estrellas', [scene('parque', [
      spr('gato', 3, 10, [[b('onFlag'), b('say', '¡toca las estrellas!')]]),
      spr('estrella', 8, 4, [], { name: 'estrella 1' }),
      spr('estrella', 13, 7, [], { name: 'estrella 2' }),
      spr('estrella', 17, 3, [], { name: 'estrella 3' }),
    ])]),
    solution: (p) => {
      for (const s of kind(p, 'estrella')) addScript(s, [b('onTap'), b('pop'), b('hide')]);
    },
    check: [
      cond('👆 hacen falta 3 personajes con «al tocarme»', (p) => allSprites(p).filter((s) => scriptsOf(s, 'onTap').length > 0).length >= 3),
      cond('🙈 al tocarlos, los 3 se esconden con «ocultar»', (p) => allSprites(p).filter((s) => scriptsOf(s, 'onTap').some((sc) => has(sc, 'hide'))).length >= 3),
      cond('🫧 antes de esconderse tienen que hacer algo', (p) => allSprites(p).filter((s) => scriptsOf(s, 'onTap').some((sc) => {
        const a = actions(sc);
        const hi = a.findIndex((x) => x.type === 'hide');
        return hi > 0;
      })).length >= 3),
    ],
  },
  {
    id: 'g1-9', track: 'grado1', num: 9, title: 'personaje dibujado a mano', icon: '🖌️', rubric: true,
    goals: [
      { pic: '🖌️', text: 'el pincel abre el editor de dibujo' },
      { pic: '✏️⚪🪣', text: 'lápiz, formas y cubo de pintura' },
      { pic: '✓', text: 'al guardar, tu dibujo ya es un personaje' },
    ],
    challenge: 'dibuja tu propio personaje con el editor de pintura y dale un programa de bandera.',
    introduces: [],
    guide: [
      { sel: '#sprite-add', text: 'en el «+», elige 🖌️ dibujar', icon: '➕' },
      { sel: '.palette-cat[data-cat="start"]', text: 'dale una bandera y algo que hacer', icon: '🚩' },
    ],
    start: () => project('mi personaje', [scene('parque', [spr('gato', 4, 10)])]),
    solution: (p) => {
      const s = addSprite(p, 0, 'gato', 12, 8, [[b('onFlag'), b('right', 3)]]);
      s.svg = PAINTED_SPRITE;
      s.name = 'mi dibujo';
    },
    check: [
      cond('🖌️ dibuja un personaje con el editor de pintura', (p) => allSprites(p).some((s) => isPainted(s.svg))),
      cond('🚩 tu dibujo necesita un programa de bandera que haga algo', (p) => allSprites(p).some((s) => isPainted(s.svg) && scriptsOf(s, 'onFlag').some((sc) => actions(sc).length > 0))),
    ],
  },
  {
    id: 'g1-10', track: 'grado1', num: 10, title: 'fondo dibujado con foto', icon: '📷', rubric: true,
    goals: [
      { pic: '🖼️🖌️', text: 'el editor también dibuja fondos' },
      { pic: '📷', text: 'la cámara pone una foto en el dibujo' },
      { pic: '🐱💬', text: 'el gato ya sabe decir dónde está' },
    ],
    challenge: 'dibuja un fondo nuevo y pon en él una foto hecha con la cámara.',
    introduces: [],
    guide: [
      { sel: '#btn-bg', text: 'en el fondo, elige 🖌️ dibujar', icon: '🖼️' },
      { sel: '#btn-flag', text: 'cuando guardes, pulsa la bandera', icon: '🚩' },
    ],
    start: () => project('mi fondo', [scene(null, [spr('gato', 5, 10, [[b('onFlag'), b('say', '¿dónde estoy?')]])])]),
    solution: (p) => { p.scenes[0].bg = PHOTO_BG; },
    check: [
      cond('🖌️ dibuja un fondo nuevo con el editor de pintura', (p) => p.scenes.some((s) => isPainted(s.bg))),
      cond('📷 usa la cámara dentro del editor para poner una foto en el fondo', (p) => p.scenes.some((s) => isPainted(s.bg) && hasPhoto(s.bg))),
    ],
  },
  {
    id: 'g1-11', track: 'grado1', num: 11, title: 'laberinto', icon: '🧭', rubric: true,
    goals: [
      { pic: '🧱', text: 'el camino es de arena: la hierba no se pisa' },
      { pic: '➡️⬇️➡️', text: 'cada flecha es un tramo del camino' },
      { pic: '⭐💬', text: 'la estrella celebra cuando llegas' },
    ],
    challenge: 'laberinto: lleva al gato por el camino de arena hasta la estrella sin pisar la hierba; la estrella lo celebra al chocar.',
    introduces: [],
    guide: [
      { sel: '#btn-grid', text: 'con la rejilla cuentas los pasos de cada tramo', icon: '#' },
      { sel: '.palette-cat[data-cat="motion"]', text: 'derecha, abajo, derecha…', icon: '🧭' },
      { sel: '.sprite-thumb:nth-child(2)', text: 'la estrella: «al chocar» + «decir»', icon: '⭐' },
    ],
    start: () => project('laberinto', [scene(MAZE1_BG, [
      spr('gato', 2, 2, [[b('onFlag')]]),
      spr('estrella', 17, 12),
    ])]),
    solution: (p) => {
      append(first(p, 'gato'), [b('right', 8), b('down', 10), b('right', 7)]);
      addScript(first(p, 'estrella'), [b('onBump', ''), b('say', '¡llegaste!')]);
    },
    check: [
      cond('🧭 usa flechas de al menos 2 direcciones', (p) => kind(p, 'gato').some((s) => scriptsOf(s, 'onFlag').some((sc) => new Set(actions(sc).filter((x) => MOVES.includes(x.type)).map((x) => x.type)).size >= 2))),
      cond('🧱 el gato no puede salirse del camino de arena', (p) => kind(p, 'gato').some((s) => simulate(s).path.length > 1 && pathInside(s, MAZE1_PATHS))),
      cond('⭐ el gato tiene que llegar a la estrella', (p) => { const st = kind(p, 'estrella')[0]; return !!st && kind(p, 'gato').some((s) => pathTouches(s, st)); }),
      cond('💬 la estrella dice algo cuando el gato choca con ella', (p) => kind(p, 'estrella').some((s) => scriptsOf(s, 'onBump').some((sc) => has(sc, 'say')))),
    ],
  },
  {
    id: 'g1-12', track: 'grado1', num: 12, title: 'proyecto libre', icon: '🌈', rubric: true, free: true,
    goals: [
      { pic: '💭', text: 'piensa una idea: un cuento, un juego, un baile…' },
      { pic: '🧩🧩🧩', text: 'usa bloques de al menos 3 colores' },
      { pic: '✅✅✅', text: 'la rúbrica mira si funciona, los bloques y la idea' },
    ],
    challenge: 'proyecto libre de 1º: crea lo que quieras; la rúbrica revisará que funcione, que use bloques de 3 colores y que se entienda la idea.',
    introduces: [],
    guide: [
      { sel: '#sprite-add', text: 'elige tus personajes', icon: '➕' },
      { sel: '#palette', text: 'usa bloques de 3 colores o más', icon: '🌈' },
      { sel: '#btn-text', text: 'un texto o una burbuja cuentan la idea', icon: '💬' },
    ],
    start: () => project('proyecto libre', [scene('parque', [spr('gato', 5, 10)])]),
    solution: (p) => addScript(first(p, 'gato'), [b('onFlag'), b('say', '¡mi proyecto!'), b('hop', 2)]),
    check: [
      cond('🧩 crea al menos un programa que empiece con un bloque amarillo', (p) => busySprites(p.scenes[0]) > 0 || allSprites(p).some((s) => scriptsOf(s).some((sc) => actions(sc).length > 0))),
    ],
  },
];
