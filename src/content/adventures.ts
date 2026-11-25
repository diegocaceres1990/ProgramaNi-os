// Kit para construir estados iniciales y soluciones + las 12 aventuras públicas.
import { makeProject, makeScene, makeSprite, uid } from '../core/state';
import type { Block, BlockType, Project, Scene, Sprite } from '../core/state';
import { newBlock } from '../core/blocks';
import { bgByKey, spriteByKey, EMPTY_BG } from '../core/sprites';
import {
  cond, allSprites, scriptsOf, actions, has, inOrder, findRepeat, speedOf, simulate, pathTouches,
  bgChanged, num, flat,
} from '../core/verify';
import type { Lesson } from '../core/verify';

// ================================================================= kit

/** Crea un bloque con valor e hijos. */
export function b(type: BlockType, value?: number | string, children?: Block[]): Block {
  const x = newBlock(type);
  if (value !== undefined) x.value = value;
  if (children) x.children = children;
  return x;
}

export interface SprSpec {
  key: string; x: number; y: number; name?: string; scripts?: Block[][]; size?: number; visible?: boolean;
}

export const spr = (key: string, x: number, y: number, scripts: Block[][] = [], extra: Partial<SprSpec> = {}): SprSpec =>
  ({ key, x, y, scripts, ...extra });

function buildSprite(s: SprSpec): Sprite {
  const sp = makeSprite(s.key, s.x, s.y, s.name);
  if (s.size) sp.size = s.size;
  if (s.visible === false) sp.visible = false;
  sp.scripts = (s.scripts ?? []).map((blocks) => ({ id: uid('sc'), blocks }));
  return sp;
}

/** Escena con fondo de la biblioteca (o null = fondo blanco), personajes y textos. */
export function scene(bg: string | null, sprites: SprSpec[], texts: { x: number; y: number; text: string }[] = []): Scene {
  const sc = makeScene(false);
  sc.bg = bg ? (bg.startsWith('<svg') ? bg : bgByKey(bg).svg) : EMPTY_BG;
  sc.sprites = sprites.map(buildSprite);
  sc.texts = texts;
  return sc;
}

export function project(name: string, scenes: Scene[]): Project {
  const p = makeProject(name);
  p.scenes = scenes;
  return p;
}

/** Personajes de un tipo de la biblioteca (por su dibujo; si se repintó, por su nombre). */
export function kind(p: Project, key: string): Sprite[] {
  const lib = spriteByKey(key);
  return allSprites(p).filter((s) => s.svg === lib.svg || s.name === lib.name || s.name.startsWith(lib.name + ' '));
}

export function first(p: Project, key: string): Sprite {
  const s = kind(p, key)[0];
  if (!s) throw new Error('no existe ' + key);
  return s;
}

/** Añade bloques al final del primer script (o crea uno) del personaje. */
export function append(sp: Sprite, blocks: Block[], scriptIdx = 0): void {
  if (!sp.scripts[scriptIdx]) sp.scripts.push({ id: uid('sc'), blocks: [] });
  sp.scripts[scriptIdx].blocks.push(...blocks);
}

/** Inserta un bloque en una posición del script del personaje. */
export function insert(sp: Sprite, index: number, block: Block, scriptIdx = 0): void {
  sp.scripts[scriptIdx].blocks.splice(index, 0, block);
}

/** Crea un script nuevo en el personaje. */
export function addScript(sp: Sprite, blocks: Block[]): void {
  sp.scripts.push({ id: uid('sc'), blocks });
}

/** Añade un personaje de la biblioteca a una escena. */
export function addSprite(p: Project, sceneIdx: number, key: string, x: number, y: number, scripts: Block[][] = []): Sprite {
  const sp = buildSprite(spr(key, x, y, scripts));
  p.scenes[sceneIdx].sprites.push(sp);
  return sp;
}

/** Grabación de relleno para las soluciones de referencia (en la app la graba la niña). */
export function fakeSound(): Blob {
  return new Blob([new Uint8Array([26, 69, 223, 163])], { type: 'audio/webm' });
}

/** Dibujos "hechos a mano" para las soluciones de referencia (en la app los hace el editor de pintura). */
export const PAINTED_SPRITE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" data-mano="1"><circle cx="50" cy="50" r="30" fill="#FF7BAC"/></svg>';
export const PHOTO_SPRITE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" data-mano="1" data-foto="1"><circle cx="50" cy="50" r="30" fill="#D9A066"/></svg>';
export const PAINTED_BG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360" data-mano="1"><rect width="480" height="360" fill="#9CC5FF"/></svg>';
export const PHOTO_BG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360" data-mano="1" data-foto="1"><rect width="480" height="360" fill="#9BE29F"/></svg>';

const MOVES: BlockType[] = ['right', 'left', 'up', 'down'];
const TURNS: BlockType[] = ['turnR', 'turnL'];

// ---------- condiciones reutilizables ----------

/** Algún script con disparador cumple el predicado. */
export const anyScript = (p: Project, pred: (sp: Sprite, sc: Sprite['scripts'][number]) => boolean, trig?: BlockType) =>
  allSprites(p).some((sp) => scriptsOf(sp, trig).some((sc) => pred(sp, sc)));

/** Número de personajes de una escena con un programa con disparador y al menos una acción. */
export const busySprites = (s: Scene, trig?: BlockType) =>
  s.sprites.filter((sp) => scriptsOf(sp, trig).some((sc) => actions(sc).length > 0)).length;

/** ¿Hay un script de bandera que dibuja un cuadrado (4 movimientos en 4 direcciones, 4 giros) y vuelve al inicio? */
export function squareChecks(key: string, who: string): Lesson['check'] {
  const target = (p: Project) => kind(p, key)[0];
  return [
    cond(`🟦 ${who} necesita justo 8 bloques después de la bandera: 4 de mover y 4 de girar`, (p) => {
      const sp = target(p);
      return !!sp && scriptsOf(sp, 'onFlag').some((sc) => {
        const a = actions(sc);
        return a.length === 8 && a.filter((x) => MOVES.includes(x.type)).length === 4 && a.filter((x) => TURNS.includes(x.type)).length === 4;
      });
    }),
    cond('📏 un cuadrado tiene los 4 lados iguales: pon el mismo número en las 4 flechas', (p) => {
      const sp = target(p);
      return !!sp && scriptsOf(sp, 'onFlag').some((sc) => {
        const sides = actions(sc).filter((x) => MOVES.includes(x.type)).map((x) => num(x, 1));
        return sides.length === 4 && sides[0] > 0 && sides.every((n) => n === sides[0]);
      });
    }),
    cond('↗️ los 4 movimientos van en las 4 direcciones: derecha, arriba, izquierda y abajo', (p) => {
      const sp = target(p);
      return !!sp && scriptsOf(sp, 'onFlag').some((sc) => new Set(actions(sc).filter((x) => MOVES.includes(x.type) && num(x, 1) > 0).map((x) => x.type)).size === 4);
    }),
    cond(`🏠 ${who} tiene que terminar justo donde empezó`, (p) => {
      const sp = target(p);
      if (!sp) return false;
      const r = simulate(sp);
      return r.path.length > 4 && r.x === sp.x && r.y === sp.y;
    }),
  ];
}

// ================================================================= aventuras

export const ADVENTURES: Lesson[] = [
  {
    id: 'a1', track: 'aventuras', num: 1, title: 'el paseo', icon: '🚶',
    goals: [
      { pic: '🚩▶️', text: 'la bandera verde pone en marcha el programa' },
      { pic: '🐱➡️🌳', text: '«mover derecha» lleva al gato hacia la derecha' },
      { pic: '🔢', text: 'el número del bloque dice cuántos pasos da' },
    ],
    challenge: 'lleva al gato de paseo hasta el árbol: tiene que llegar a la columna 15 o más.',
    introduces: ['onFlag', 'right'],
    guide: [
      { sel: '#code-area .block[data-type="onFlag"]', text: 'este programa ya empieza con la bandera', icon: '🚩' },
      { sel: '.palette-cat[data-cat="motion"]', text: 'abre los bloques azules', icon: '🔵' },
      { sel: '.palette-block[data-type="right"]', text: 'arrastra la flecha ➡️ y suéltala pegada a la bandera', icon: '🧲' },
      { sel: '#code-area .block[data-type="right"] .b-val', text: 'toca el número y gira la rueda hasta uno grande', icon: '🔢' },
      { sel: '#btn-flag', text: '¡pulsa la bandera y mira!', icon: '🚩' },
    ],
    start: () => project('el paseo', [scene('parque', [spr('gato', 3, 9, [[b('onFlag')]]), spr('arbol', 17, 8)])]),
    solution: (p) => append(first(p, 'gato'), [b('right', 12)]),
    check: [
      cond('🚩 el gato necesita un programa que empiece con la bandera', (p) => kind(p, 'gato').some((s) => scriptsOf(s, 'onFlag').length > 0)),
      cond('➡️ pon «mover derecha» y sube el número hasta que llegue a la columna 15', (p) => kind(p, 'gato').some((s) => simulate(s).x >= 15)),
    ],
  },
  {
    id: 'a2', track: 'aventuras', num: 2, title: 'el cuadrado', icon: '🟦',
    goals: [
      { pic: '⬆️⬇️⬅️➡️', text: 'hay flechas para las 4 direcciones' },
      { pic: '↻', text: '«girar» da vueltas al personaje: 3 giros son una esquina' },
      { pic: '🟦', text: 'un cuadrado son 4 lados y 4 esquinas' },
    ],
    challenge: 'haz que el gato recorra un cuadrado con 4 movimientos y 4 giros, y que vuelva a su sitio.',
    introduces: ['up', 'down', 'left', 'turnR', 'turnL'],
    guide: [
      { sel: '.palette-cat[data-cat="motion"]', text: 'abre los bloques azules', icon: '🔵' },
      { sel: '.palette-block[data-type="right"]', text: 'primer lado: derecha. luego un giro ↻', icon: '➡️' },
      { sel: '.palette-block[data-type="turnR"]', text: 'pon el número 3 en el giro para hacer una esquina', icon: '↻' },
      { sel: '#btn-grid', text: 'la rejilla te ayuda a contar los pasos', icon: '#' },
      { sel: '#btn-flag', text: 'prueba: ¿vuelve el gato a su sitio?', icon: '🚩' },
    ],
    start: () => project('el cuadrado', [scene('parque', [spr('gato', 6, 10, [[b('onFlag')]])])]),
    solution: (p) => append(first(p, 'gato'), [
      b('right', 4), b('turnR', 3), b('up', 4), b('turnR', 3), b('left', 4), b('turnR', 3), b('down', 4), b('turnR', 3),
    ]),
    check: squareChecks('gato', 'el gato'),
  },
  {
    id: 'a3', track: 'aventuras', num: 3, title: 'empieza y para', icon: '⏹️',
    goals: [
      { pic: '🚩', text: 'todo programa empieza con un bloque amarillo' },
      { pic: '⏹️', text: '«fin» cierra el programa' },
      { pic: '🚩➡️⏹️', text: 'principio, algo que hacer y final' },
    ],
    challenge: 'escribe para la pelota un programa de exactamente 3 bloques: bandera, un movimiento y fin.',
    introduces: ['end'],
    guide: [
      { sel: '.palette-cat[data-cat="start"]', text: 'el principio está en los bloques amarillos', icon: '🟡' },
      { sel: '.palette-cat[data-cat="motion"]', text: 'el movimiento, en los azules', icon: '🔵' },
      { sel: '.palette-cat[data-cat="end"]', text: 'y el final, en los rojos', icon: '🔴' },
      { sel: '#btn-flag', text: '¡pruébalo!', icon: '🚩' },
    ],
    start: () => project('empieza y para', [scene('playa', [spr('pelota', 4, 10)])]),
    solution: (p) => addScript(first(p, 'pelota'), [b('onFlag'), b('right', 6), b('end')]),
    check: [
      cond('🧩 la pelota necesita un programa de 3 bloques: 🚩, un movimiento y ⏹️', (p) =>
        kind(p, 'pelota').some((sp) => sp.scripts.some((sc) => sc.blocks.length === 3 && sc.blocks[0].type === 'onFlag' &&
          [...MOVES, ...TURNS, 'hop', 'home'].includes(sc.blocks[1].type) && (!MOVES.includes(sc.blocks[1].type) || num(sc.blocks[1], 1) > 0) && sc.blocks[2].type === 'end'))),
    ],
  },
  {
    id: 'a4', track: 'aventuras', num: 4, title: 'dos amigos', icon: '👫',
    goals: [
      { pic: '🖼️', text: 'el botón de fondo cambia el decorado' },
      { pic: '➕🐶', text: 'el «+» azul añade otro personaje' },
      { pic: '🐱🧩 🐶🧩', text: 'cada personaje tiene su propio programa' },
    ],
    challenge: 'pon un fondo y añade un amigo para el gato que tenga su propio programa de bandera.',
    introduces: [],
    guide: [
      { sel: '#btn-bg', text: 'elige un fondo', icon: '🖼️' },
      { sel: '#sprite-add', text: 'añade un amigo', icon: '➕' },
      { sel: '.palette-cat[data-cat="start"]', text: 'con el amigo elegido, dale su bandera y un movimiento', icon: '🚩' },
      { sel: '#btn-flag', text: '¡los dos a la vez!', icon: '🚩' },
    ],
    start: () => project('dos amigos', [scene(null, [spr('gato', 4, 10, [[b('onFlag'), b('right', 3)]])])]),
    solution: (p) => {
      p.scenes[0].bg = bgByKey('parque').svg;
      addSprite(p, 0, 'perro', 15, 10, [[b('onFlag'), b('left', 3)]]);
    },
    check: [
      cond('🖼️ elige un fondo con el botón de fondo de arriba', (p) => bgChanged(p.scenes[0])),
      cond('➕ añade un segundo personaje con el «+» azul', (p) => p.scenes[0].sprites.length >= 2),
      cond('🧩 los dos personajes necesitan su propio programa con un bloque amarillo', (p) => busySprites(p.scenes[0]) >= 2),
    ],
  },
  {
    id: 'a5', track: 'aventuras', num: 5, title: 'caracol y cohete', icon: '🐌',
    goals: [
      { pic: '🏃', text: '«velocidad» cambia lo rápido que se mueve' },
      { pic: '🐌🚶🚀', text: 'hay velocidad lenta, normal y rápida' },
      { pic: '🧩', text: 'se pone antes de los movimientos' },
    ],
    challenge: 'en la carrera, el caracol tiene que ir lento y el cohete rápido.',
    introduces: ['speed'],
    guide: [
      { sel: '.palette-cat[data-cat="control"]', text: 'abre los bloques naranjas', icon: '🟠' },
      { sel: '.palette-block[data-type="speed"]', text: 'pon «velocidad» justo después de la bandera', icon: '🏃' },
      { sel: '#code-area .block[data-type="speed"] .b-val', text: 'tócalo y elige 🐌 o 🚀', icon: '👆' },
      { sel: '.sprite-thumb:nth-child(2)', text: 'ahora el cohete', icon: '🚀' },
    ],
    start: () => project('caracol y cohete', [scene('parque', [
      spr('caracol', 2, 11, [[b('onFlag'), b('right', 14)]]),
      spr('cohete', 2, 5, [[b('onFlag'), b('right', 14)]]),
    ])]),
    solution: (p) => {
      insert(first(p, 'caracol'), 1, b('speed', 'lenta'));
      insert(first(p, 'cohete'), 1, b('speed', 'rapida'));
    },
    check: [
      cond('🐌 pon «velocidad lenta» antes de los movimientos del caracol', (p) => kind(p, 'caracol').some((s) => speedOf(s) === 'lenta')),
      cond('🚀 y «velocidad rápida» en el cohete', (p) => kind(p, 'cohete').some((s) => speedOf(s) === 'rapida')),
    ],
  },
  {
    id: 'a6', track: 'aventuras', num: 6, title: 'ocho saltos', icon: '⤴️',
    goals: [
      { pic: '⤴️', text: '«saltar» hace que el personaje dé un brinco' },
      { pic: '🔁', text: '«repetir» hace varias veces lo que lleva dentro' },
      { pic: '8️⃣', text: 'el número de repetir dice cuántas veces' },
    ],
    challenge: 'el gato salta 8 veces seguidas usando un solo bloque de repetir.',
    introduces: ['hop', 'repeat'],
    guide: [
      { sel: '.palette-cat[data-cat="control"]', text: 'en los naranjas está «repetir»', icon: '🔁' },
      { sel: '.palette-block[data-type="repeat"]', text: 'engánchalo a la bandera', icon: '🧲' },
      { sel: '.palette-cat[data-cat="motion"]', text: 'busca «saltar» en los azules', icon: '⤴️' },
      { sel: '#code-area .loop-body', text: 'mete «saltar» dentro del corchete de repetir', icon: '📥' },
      { sel: '#code-area .loop-cap .b-val', text: 'pon un 8 en repetir', icon: '8️⃣' },
    ],
    start: () => project('ocho saltos', [scene('bosque', [spr('gato', 10, 11, [[b('onFlag')]])])]),
    solution: (p) => append(first(p, 'gato'), [b('repeat', 8, [b('hop', 2)])]),
    check: [
      cond('🔁 usa un bloque «repetir» con el número 8', (p) => anyScript(p, (_, sc) => findRepeat(sc, 8))),
      cond('⤴️ «saltar» tiene que ir dentro de repetir', (p) => anyScript(p, (_, sc) => findRepeat(sc, 8, 'hop'))),
      cond('🚩 el gato tiene que saltar 8 veces al pulsar la bandera', (p) => kind(p, 'gato').some((s) => simulate(s).hops === 8)),
    ],
  },
  {
    id: 'a7', track: 'aventuras', num: 7, title: 'conversación', icon: '💬',
    goals: [
      { pic: '💬', text: '«decir» saca una burbuja con palabras' },
      { pic: '⏳', text: '«esperar» hace una pausa' },
      { pic: '💬⏳💬', text: 'con pausas, la conversación se entiende' },
    ],
    challenge: 'la niña dice dos frases distintas y espera un rato entre la primera y la segunda.',
    introduces: ['say', 'wait'],
    guide: [
      { sel: '.palette-cat[data-cat="looks"]', text: 'en los morados está «decir»', icon: '🟣' },
      { sel: '#code-area .block[data-type="say"] .b-val', text: 'toca la burbuja para elegir la frase', icon: '💬' },
      { sel: '.palette-cat[data-cat="control"]', text: '«esperar» está en los naranjas', icon: '⏳' },
      { sel: '#btn-flag', text: '¡escucha la conversación!', icon: '🚩' },
    ],
    start: () => project('conversación', [scene('parque', [
      spr('nina', 5, 10, [[b('onFlag')]]),
      spr('nino', 15, 10, [[b('onFlag')]]),
    ])]),
    solution: (p) => append(first(p, 'nina'), [b('say', '¡hola!'), b('wait', 10), b('say', '¿jugamos?')]),
    check: [
      cond('💬 la niña necesita dos bloques «decir»', (p) => kind(p, 'nina').some((s) => scriptsOf(s).some((sc) => flat(sc.blocks).filter((x) => x.type === 'say').length >= 2))),
      cond('⏳ pon «esperar» entre las dos burbujas', (p) => kind(p, 'nina').some((s) => scriptsOf(s).some((sc) => inOrder(sc, ['say', 'wait', 'say'])))),
      cond('🗨️ al pulsar la bandera tienen que oírse dos frases distintas', (p) => kind(p, 'nina').some((s) => new Set(simulate(s).says).size >= 2)),
    ],
  },
  {
    id: 'a8', track: 'aventuras', num: 8, title: 'mi voz', icon: '🎤',
    goals: [
      { pic: '🎤', text: 'el micrófono de los bloques verdes graba tu voz' },
      { pic: '🎵1️⃣', text: 'cada grabación tiene un número' },
      { pic: '🎵', text: '«reproducir sonido» la hace sonar' },
    ],
    challenge: 'graba tu voz en el perro y haz que suene al pulsar la bandera.',
    introduces: ['playSound'],
    guide: [
      { sel: '.palette-cat[data-cat="sound"]', text: 'abre los bloques verdes', icon: '🟢' },
      { sel: '#btn-record', text: 'toca el micrófono y graba', icon: '🎤' },
      { sel: '.palette-block[data-type="playSound"]', text: 'engancha «reproducir sonido» a la bandera', icon: '🎵' },
      { sel: '#btn-flag', text: '¡escúchate!', icon: '🚩' },
    ],
    start: () => project('mi voz', [scene('habitacion', [spr('perro', 10, 10, [[b('onFlag')]])])]),
    solution: (p) => {
      const d = first(p, 'perro');
      d.sounds.push(fakeSound());
      append(d, [b('playSound', 1)]);
    },
    check: [
      cond('🎤 graba tu voz con el micrófono de los bloques verdes', (p) => allSprites(p).some((s) => s.sounds.length > 0)),
      cond('🎵 pon «reproducir sonido» en el programa de bandera del personaje que tiene la grabación', (p) =>
        allSprites(p).some((s) => s.sounds.length > 0 && scriptsOf(s, 'onFlag').some((sc) => has(sc, 'playSound', (x) => num(x, 1) >= 1 && num(x, 1) <= s.sounds.length)))),
    ],
  },
  {
    id: 'a9', track: 'aventuras', num: 9, title: 'dos páginas', icon: '📄',
    goals: [
      { pic: '1️⃣2️⃣', text: 'un proyecto puede tener varias páginas' },
      { pic: '👆', text: '«al tocarme» empieza cuando tocas al personaje' },
      { pic: '📄', text: '«ir a página» salta a otra escena' },
    ],
    challenge: 'cuando toques al gato de la página 1, la historia tiene que pasar a la página 2.',
    introduces: ['onTap', 'goPage'],
    guide: [
      { sel: '.scene-thumb[data-idx="1"]', text: 'mira: ya hay una página 2', icon: '2️⃣' },
      { sel: '.scene-thumb[data-idx="0"]', text: 'vuelve a la página 1', icon: '1️⃣' },
      { sel: '.palette-block[data-type="onTap"]', text: 'empieza el programa con «al tocarme»', icon: '👆' },
      { sel: '.palette-cat[data-cat="end"]', text: '«ir a página» está en los rojos', icon: '📄' },
      { sel: '#stage', text: 'toca al gato en el escenario', icon: '🐱' },
    ],
    start: () => project('dos páginas', [
      scene('parque', [spr('gato', 5, 10)]),
      scene('playa', [spr('gato', 5, 10, [[b('onFlag'), b('say', '¡qué playa!')]])]),
    ]),
    solution: (p) => addScript(p.scenes[0].sprites[0], [b('onTap'), b('goPage', 2)]),
    check: [
      cond('📄 el proyecto necesita al menos 2 páginas', (p) => p.scenes.length >= 2),
      cond('👆 en la página 1, un programa que empiece con «al tocarme» y lleve «ir a página 2»', (p) =>
        p.scenes[0].sprites.some((s) => scriptsOf(s, 'onTap').some((sc) => has(sc, 'goPage', (x) => num(x, 1) === 2)))),
    ],
  },
  {
    id: 'a10', track: 'aventuras', num: 10, title: 'toca y salta', icon: '👆',
    goals: [
      { pic: '👆⚽', text: 'cada personaje puede reaccionar cuando lo tocas' },
      { pic: '⤴️', text: 'al tocarlo puede saltar' },
      { pic: '🫧', text: '«pop» hace un sonido divertido' },
    ],
    challenge: 'al tocar la pelota, tiene que dar un salto y hacer «pop».',
    introduces: ['pop'],
    guide: [
      { sel: '.sprite-thumb:nth-child(1)', text: 'elige la pelota', icon: '⚽' },
      { sel: '.palette-block[data-type="onTap"]', text: '«al tocarme» va al principio', icon: '👆' },
      { sel: '.palette-cat[data-cat="sound"]', text: 'el «pop» está en los verdes', icon: '🫧' },
      { sel: '#stage', text: 'toca la pelota en el escenario', icon: '👆' },
    ],
    start: () => project('toca y salta', [scene('parque', [
      spr('pelota', 10, 10),
      spr('gato', 4, 10, [[b('onFlag'), b('say', '¡toca la pelota!')]]),
    ])]),
    solution: (p) => addScript(first(p, 'pelota'), [b('onTap'), b('hop', 3), b('pop')]),
    check: [
      cond('👆 la pelota necesita un programa que empiece con «al tocarme»', (p) => kind(p, 'pelota').some((s) => scriptsOf(s, 'onTap').length > 0)),
      cond('⤴️ dentro tiene que haber un «saltar»', (p) => kind(p, 'pelota').some((s) => scriptsOf(s, 'onTap').some((sc) => has(sc, 'hop')))),
      cond('🫧 y un «pop» para que suene', (p) => kind(p, 'pelota').some((s) => scriptsOf(s, 'onTap').some((sc) => has(sc, 'hop') && has(sc, 'pop')))),
    ],
  },
  {
    id: 'a11', track: 'aventuras', num: 11, title: 'choque', icon: '💥',
    goals: [
      { pic: '🐱💥🐶', text: '«al chocar» empieza cuando dos personajes se tocan' },
      { pic: '💬', text: 'el que recibe el choque puede decir algo' },
      { pic: '⏹️', text: '«fin» termina su programa' },
    ],
    challenge: 'cuando el gato choque con el perro, el perro dice algo y su programa termina con fin.',
    introduces: ['onBump'],
    guide: [
      { sel: '#btn-flag', text: 'mira: el gato ya corre hacia el perro', icon: '🐱' },
      { sel: '.sprite-thumb:nth-child(2)', text: 'elige al perro', icon: '🐶' },
      { sel: '.palette-block[data-type="onBump"]', text: '«al chocar» va al principio', icon: '💥' },
      { sel: '.palette-cat[data-cat="end"]', text: 'cierra con «fin»', icon: '⏹️' },
    ],
    start: () => project('choque', [scene('parque', [
      spr('gato', 2, 10, [[b('onFlag'), b('right', 13)]]),
      spr('perro', 16, 10),
    ])]),
    solution: (p) => addScript(first(p, 'perro'), [b('onBump', ''), b('say', '¡ay!'), b('end')]),
    check: [
      cond('💥 el perro necesita un programa que empiece con «al chocar»', (p) => kind(p, 'perro').some((s) => scriptsOf(s, 'onBump').some((sc) => sc.blocks[0].value !== s.id))),
      cond('💬 en ese programa el perro dice algo y acaba con ⏹️ fin', (p) =>
        kind(p, 'perro').some((s) => scriptsOf(s, 'onBump').some((sc) => has(sc, 'say') && sc.blocks[sc.blocks.length - 1].type === 'end'))),
      cond('🐱 el gato tiene que llegar a tocar al perro', (p) => {
        const dog = kind(p, 'perro')[0];
        return !!dog && kind(p, 'gato').some((c) => pathTouches(c, dog));
      }),
    ],
  },
  {
    id: 'a12', track: 'aventuras', num: 12, title: 'el juego', icon: '⭐',
    goals: [
      { pic: '📨', text: '«enviar» manda un mensaje de color' },
      { pic: '📩', text: '«al recibir» empieza cuando llega ese mensaje' },
      { pic: '⭐👆→🐱💬', text: 'así un personaje avisa a otro' },
    ],
    challenge: 'juego: al tocar la estrella, envía un mensaje; el gato lo recibe, dice que ha ganado y termina con fin.',
    introduces: ['send', 'onMessage'],
    guide: [
      { sel: '.sprite-thumb:nth-child(2)', text: 'elige la estrella', icon: '⭐' },
      { sel: '.palette-block[data-type="send"]', text: '«al tocarme» + «enviar mensaje»', icon: '📨' },
      { sel: '.sprite-thumb:nth-child(1)', text: 'ahora el gato', icon: '🐱' },
      { sel: '.palette-block[data-type="onMessage"]', text: '«al recibir» con el mismo color, decir y fin', icon: '📩' },
      { sel: '#stage', text: 'pulsa la bandera y toca la estrella', icon: '👆' },
    ],
    start: () => project('el juego', [scene('parque', [
      spr('gato', 4, 10, [[b('onFlag'), b('say', '¡busca la estrella!')]]),
      spr('estrella', 15, 4),
    ])]),
    solution: (p) => {
      addScript(first(p, 'estrella'), [b('onTap'), b('send', 1)]);
      addScript(first(p, 'gato'), [b('onMessage', 1), b('say', '¡gané!'), b('end')]);
    },
    check: [
      cond('👆 la estrella necesita «al tocarme» y «enviar mensaje»', (p) => kind(p, 'estrella').some((s) => scriptsOf(s, 'onTap').some((sc) => has(sc, 'send')))),
      cond('📩 otro personaje tiene que recibir ese mismo mensaje y decir algo', (p) => {
        const sent = new Set(kind(p, 'estrella').flatMap((s) => scriptsOf(s, 'onTap').flatMap((sc) => flat(sc.blocks).filter((x) => x.type === 'send').map((x) => num(x, 1)))));
        return allSprites(p).some((s) => !kind(p, 'estrella').includes(s) && scriptsOf(s, 'onMessage').some((sc) => sent.has(num(sc.blocks[0], 1)) && has(sc, 'say')));
      }),
      cond('⏹️ la respuesta tiene que terminar con fin', (p) => {
        const sent = new Set(kind(p, 'estrella').flatMap((s) => scriptsOf(s, 'onTap').flatMap((sc) => flat(sc.blocks).filter((x) => x.type === 'send').map((x) => num(x, 1)))));
        return allSprites(p).some((s) => !kind(p, 'estrella').includes(s) && scriptsOf(s, 'onMessage').some((sc) => sent.has(num(sc.blocks[0], 1)) && has(sc, 'say') && sc.blocks[sc.blocks.length - 1].type === 'end'));
      }),
    ],
  },
];
