// Escuela: 8 lecciones en 3 módulos (collage, historia, juego), cada una con actividad desconectada previa.
import type { Lesson } from '../core/verify';
import { cond, allSprites, scriptsOf, actions, has, inOrder, findRepeat, speedOf, simulate, pathTouches, bgChanged, num, flat } from '../core/verify';
import { bgByKey } from '../core/sprites';
import { b, project, scene, spr, kind, first, append, insert, addScript, addSprite, fakeSound, squareChecks } from './adventures';

const MOVES = ['right', 'left', 'up', 'down'];

export const SCHOOL: Lesson[] = [
  {
    id: 'e1', track: 'escuela', num: 1, module: '🎨 módulo collage', title: 'instrucciones y secuencias', icon: '📋',
    goals: [
      { pic: '📋', text: 'un programa es una lista de instrucciones' },
      { pic: '1️⃣2️⃣3️⃣', text: 'el ordenador las hace en orden, de izquierda a derecha' },
      { pic: '🔀', text: 'si cambias el orden, cambia lo que pasa' },
    ],
    unplugged: {
      title: 'programador dice',
      steps: [
        'una persona hace de programadora y otra de robot',
        'la programadora enseña tarjetas con flechas: ➡️ ⬆️ ⬇️ ⬅️',
        'el robot solo obedece si la orden empieza por «programador dice»',
        'ahora ordenad 3 tarjetas en la mesa antes de empezar y el robot las hace seguidas',
        'cambiad los papeles',
      ],
    },
    challenge: 'ordena 3 bloques: el gato va a la derecha, después sube y después vuelve a ir a la derecha.',
    introduces: ['onFlag', 'right', 'up', 'down', 'left'],
    guide: [
      { sel: '#code-area .block[data-type="onFlag"]', text: 'la bandera ya está puesta', icon: '🚩' },
      { sel: '.palette-cat[data-cat="motion"]', text: 'coge los bloques azules en el orden de las tarjetas', icon: '🔵' },
      { sel: '#btn-flag', text: '¿hace el gato lo que pensabas?', icon: '🚩' },
    ],
    start: () => project('instrucciones', [scene('parque', [spr('gato', 4, 10, [[b('onFlag')]])])]),
    solution: (p) => append(first(p, 'gato'), [b('right', 3), b('up', 3), b('right', 3)]),
    check: [
      cond('🧩 después de la bandera pon al menos 3 bloques de mover', (p) =>
        kind(p, 'gato').some((s) => scriptsOf(s, 'onFlag').some((sc) => actions(sc).filter((x) => MOVES.includes(x.type)).length >= 3))),
      cond('🔢 el orden importa: derecha, luego arriba y luego derecha', (p) =>
        kind(p, 'gato').some((s) => scriptsOf(s, 'onFlag').some((sc) => inOrder(sc, ['right', 'up', 'right'])))),
      cond('↗️ al final el gato tiene que estar más a la derecha y más arriba que al principio', (p) =>
        kind(p, 'gato').some((s) => { const r = simulate(s); return r.x > s.x && r.y < s.y; })),
    ],
  },
  {
    id: 'e2', track: 'escuela', num: 2, module: '🎨 módulo collage', title: 'secuencias repetidas y movimiento', icon: '🔄',
    goals: [
      { pic: '↻', text: 'girar cambia hacia dónde mira el personaje' },
      { pic: '➡️↻➡️↻', text: 'un cuadrado repite «moverse y girar» 4 veces' },
      { pic: '🏁', text: 'si todo está bien, se vuelve al punto de salida' },
    ],
    unplugged: {
      title: 'simón dice con bloques',
      steps: [
        'Simón enseña un bloque de papel: ➡️, ⬆️, ↻…',
        'todos hacen el movimiento solo si Simón dice «Simón dice»',
        'haced juntos un cuadrado en el suelo: paso, giro, paso, giro…',
        'contad cuántos bloques hacen falta para volver al principio',
      ],
    },
    challenge: 'dibuja con el cohete un cuadrado de 8 bloques, 4 de mover y 4 de girar, que acabe en su punto de partida.',
    introduces: ['turnR', 'turnL'],
    guide: [
      { sel: '.palette-cat[data-cat="motion"]', text: 'necesitas 4 flechas y 4 giros', icon: '🔵' },
      { sel: '.palette-block[data-type="turnR"]', text: 'con un 3, el giro hace una esquina', icon: '↻' },
      { sel: '#btn-grid', text: 'cuenta los pasos con la rejilla', icon: '#' },
    ],
    start: () => project('cuadrado del cohete', [scene('espacio', [spr('cohete', 6, 10, [[b('onFlag')]])])]),
    solution: (p) => append(first(p, 'cohete'), [
      b('up', 3), b('turnR', 3), b('right', 3), b('turnR', 3), b('down', 3), b('turnR', 3), b('left', 3), b('turnR', 3),
    ]),
    check: squareChecks('cohete', 'el cohete'),
  },
  {
    id: 'e3', track: 'escuela', num: 3, module: '🎨 módulo collage', title: 'bandera, fin y elegir personajes', icon: '🚦',
    goals: [
      { pic: '🚩', text: 'la bandera es la señal de salida' },
      { pic: '⏹️', text: '«fin» es la señal de llegada' },
      { pic: '➕🦋', text: 'puedes elegir otros personajes de la biblioteca' },
    ],
    unplugged: {
      title: 'el semáforo',
      steps: [
        'una persona tiene una cartulina verde y otra roja',
        'con la verde todos empiezan a hacer una acción (saltar, aplaudir…)',
        'con la roja todos paran',
        'pensad: ¿qué pasa si nadie enseña la verde?',
      ],
    },
    challenge: 'elige un personaje nuevo de la biblioteca y dale un programa que empiece con la bandera y acabe con fin.',
    introduces: ['end', 'hop'],
    guide: [
      { sel: '#sprite-add', text: 'elige un personaje nuevo', icon: '➕' },
      { sel: '.palette-cat[data-cat="start"]', text: 'principio: bandera', icon: '🚩' },
      { sel: '.palette-cat[data-cat="end"]', text: 'final: fin', icon: '⏹️' },
    ],
    start: () => project('bandera y fin', [scene('granja', [spr('gato', 4, 10)])]),
    solution: (p) => { addSprite(p, 0, 'mariposa', 12, 6, [[b('onFlag'), b('hop', 2), b('end')]]); },
    check: [
      cond('➕ añade un personaje distinto del gato', (p) => allSprites(p).some((s) => !kind(p, 'gato').includes(s))),
      cond('🚩…⏹️ su programa empieza con la bandera, hace algo y termina con fin', (p) =>
        allSprites(p).filter((s) => !kind(p, 'gato').includes(s)).some((s) => s.scripts.some((sc) =>
          sc.blocks.length >= 3 && sc.blocks[0].type === 'onFlag' && sc.blocks[sc.blocks.length - 1].type === 'end'))),
    ],
  },
  {
    id: 'e4', track: 'escuela', num: 4, module: '🎨 módulo collage', title: 'fondos y varios personajes', icon: '🖼️',
    goals: [
      { pic: '🖼️', text: 'el fondo es el decorado de la escena' },
      { pic: '🐱🐶', text: 'en una escena caben varios personajes' },
      { pic: '🚩🚩', text: 'con una sola bandera se mueven todos a la vez' },
    ],
    unplugged: {
      title: 'teatro de papel',
      steps: [
        'dibujad un decorado en un folio grande',
        'recortad dos personajes de papel',
        'cada uno tiene una tarjeta con lo que hace cuando suena una palmada',
        'una palmada = bandera verde: ¡se mueven los dos a la vez!',
      ],
    },
    challenge: 'monta una escena con un fondo de la biblioteca y dos personajes que se muevan al pulsar la bandera.',
    introduces: [],
    guide: [
      { sel: '#btn-bg', text: 'elige un fondo', icon: '🖼️' },
      { sel: '#sprite-add', text: 'añade un segundo personaje', icon: '➕' },
      { sel: '.sprite-thumb:nth-child(1)', text: 'cada personaje necesita su programa', icon: '🧩' },
    ],
    start: () => project('escena', [scene(null, [spr('gato', 4, 10)])]),
    solution: (p) => {
      p.scenes[0].bg = bgByKey('granja').svg;
      addScript(first(p, 'gato'), [b('onFlag'), b('right', 2)]);
      addSprite(p, 0, 'perro', 15, 10, [[b('onFlag'), b('left', 2)]]);
    },
    check: [
      cond('🖼️ cambia el fondo con el botón de arriba', (p) => bgChanged(p.scenes[0])),
      cond('🐱🐶 hacen falta al menos dos personajes en la escena', (p) => p.scenes[0].sprites.length >= 2),
      cond('🚩 los dos necesitan un programa de bandera que los mueva', (p) =>
        p.scenes[0].sprites.filter((s) => scriptsOf(s, 'onFlag').some((sc) => actions(sc).some((x) => MOVES.includes(x.type) || x.type === 'hop'))).length >= 2),
    ],
  },
  {
    id: 'e5', track: 'escuela', num: 5, module: '📖 módulo historia', title: 'velocidad', icon: '🏃',
    goals: [
      { pic: '🐌', text: 'lenta: pasos tranquilos' },
      { pic: '🚶', text: 'normal: como siempre' },
      { pic: '🚀', text: 'rápida: ¡a toda prisa!' },
    ],
    unplugged: {
      title: 'tortugas y liebres',
      steps: [
        'marcad una línea de salida y otra de llegada',
        'cada uno saca una tarjeta: 🐌, 🚶 o 🚀',
        'al oír «¡ya!» cada uno camina a su velocidad',
        '¿quién llega primero? ¿por qué?',
      ],
    },
    challenge: 'tres corredores con tres velocidades distintas: uno lento, otro normal y otro rápido.',
    introduces: ['speed'],
    guide: [
      { sel: '.palette-cat[data-cat="control"]', text: '«velocidad» está en los naranjas', icon: '🏃' },
      { sel: '.sprite-thumb:nth-child(1)', text: 'ponla a cada corredor justo tras la bandera', icon: '🧩' },
      { sel: '#btn-flag', text: '¡carrera!', icon: '🏁' },
    ],
    start: () => project('velocidades', [scene('parque', [
      spr('caracol', 2, 4, [[b('onFlag'), b('right', 14)]]),
      spr('perro', 2, 8, [[b('onFlag'), b('right', 14)]]),
      spr('cohete', 2, 12, [[b('onFlag'), b('right', 14)]]),
    ])]),
    solution: (p) => {
      insert(first(p, 'caracol'), 1, b('speed', 'lenta'));
      insert(first(p, 'perro'), 1, b('speed', 'normal'));
      insert(first(p, 'cohete'), 1, b('speed', 'rapida'));
    },
    check: [
      cond('🏃 los tres corredores necesitan su bloque de velocidad antes de moverse', (p) => allSprites(p).filter((s) => speedOf(s) !== null).length >= 3),
      cond('🐌🚶🚀 las tres velocidades tienen que ser distintas', (p) => new Set(allSprites(p).map(speedOf).filter((x) => x !== null)).size === 3),
    ],
  },
  {
    id: 'e6', track: 'escuela', num: 6, module: '📖 módulo historia', title: 'números y repetición', icon: '6️⃣',
    goals: [
      { pic: '🔢', text: 'los números dicen cuánto o cuántas veces' },
      { pic: '🔁', text: '«repetir» ahorra bloques' },
      { pic: '🐟➡️×6', text: 'repetir 6 veces un paso = 6 pasos' },
    ],
    unplugged: {
      title: 'palmas que se repiten',
      steps: [
        'una persona da una palmada y un paso',
        'los demás lo repiten las veces que diga una tarjeta con un número',
        'probad con 2, con 4 y con 6',
        '¿cuántas tarjetas de «paso» ahorramos con la tarjeta del número?',
      ],
    },
    challenge: 'el pez avanza nadando 6 veces hacia la derecha con un bucle de repetir que tenga el número 6.',
    introduces: ['repeat'],
    guide: [
      { sel: '.palette-block[data-type="repeat"]', text: 'engancha «repetir» a la bandera', icon: '🔁' },
      { sel: '#code-area .loop-body', text: 'mete una flecha ➡️ dentro', icon: '📥' },
      { sel: '#code-area .loop-cap .b-val', text: 'pon el 6', icon: '6️⃣' },
    ],
    start: () => project('el pez', [scene('mar', [spr('pez', 3, 7, [[b('onFlag')]])])]),
    solution: (p) => append(first(p, 'pez'), [b('repeat', 6, [b('right', 1)])]),
    check: [
      cond('🔁 usa «repetir» con el número 6', (p) => kind(p, 'pez').some((s) => scriptsOf(s).some((sc) => findRepeat(sc, 6)))),
      cond('➡️ dentro del bucle tiene que haber una flecha a la derecha', (p) => kind(p, 'pez').some((s) => scriptsOf(s).some((sc) => findRepeat(sc, 6, 'right')))),
      cond('🐟 al pulsar la bandera, el pez tiene que acabar al menos 6 casillas más a la derecha', (p) => kind(p, 'pez').some((s) => simulate(s).x >= s.x + 6)),
    ],
  },
  {
    id: 'e7', track: 'escuela', num: 7, module: '📖 módulo historia', title: 'burbujas, sonidos, páginas y esperar', icon: '📚',
    goals: [
      { pic: '💬⏳', text: 'burbujas y pausas cuentan la historia' },
      { pic: '🎤', text: 'tu voz grabada hace hablar a un personaje' },
      { pic: '1️⃣➡️2️⃣', text: '«ir a página» pasa a la siguiente escena' },
    ],
    unplugged: {
      title: 'cómic en dos viñetas',
      steps: [
        'doblad un folio en dos: viñeta 1 y viñeta 2',
        'en la 1, un personaje dice algo en un bocadillo',
        'en la 2, otro personaje contesta… ¡en voz alta, leído por vosotros!',
        'pensad qué tiene que pasar para cambiar de viñeta',
      ],
    },
    challenge: 'diálogo en dos páginas: en la página 1 la niña habla, espera y pasa a la 2; allí el niño contesta con tu voz grabada.',
    introduces: ['say', 'wait', 'playSound', 'goPage'],
    guide: [
      { sel: '.palette-cat[data-cat="looks"]', text: 'la niña habla con «decir»', icon: '💬' },
      { sel: '.palette-cat[data-cat="end"]', text: '«ir a página 2» al final', icon: '📄' },
      { sel: '.scene-thumb[data-idx="1"]', text: 'en la página 2, elige al niño', icon: '2️⃣' },
      { sel: '.palette-cat[data-cat="sound"]', text: 'graba la voz con el micrófono', icon: '🎤' },
    ],
    start: () => project('diálogo', [
      scene('parque', [spr('nina', 6, 10, [[b('onFlag')]])]),
      scene('habitacion', [spr('nino', 8, 10, [[b('onFlag')]])]),
    ]),
    solution: (p) => {
      append(p.scenes[0].sprites[0], [b('say', '¡hola!'), b('wait', 10), b('goPage', 2)]);
      const boy = p.scenes[1].sprites[0];
      boy.sounds.push(fakeSound());
      append(boy, [b('playSound', 1)]);
    },
    check: [
      cond('📄 el proyecto necesita 2 páginas', (p) => p.scenes.length >= 2),
      cond('💬 en la página 1 alguien dice algo y después espera', (p) => p.scenes[0].sprites.some((s) => scriptsOf(s).some((sc) => inOrder(sc, ['say', 'wait'])))),
      cond('📄 y luego va a la página 2', (p) => p.scenes[0].sprites.some((s) => scriptsOf(s).some((sc) => inOrder(sc, ['say', 'wait', 'goPage']) && has(sc, 'goPage', (x) => num(x, 1) === 2)))),
      cond('🎤 en la página 2 un personaje reproduce una grabación tuya', (p) =>
        !!p.scenes[1] && p.scenes[1].sprites.some((s) => s.sounds.length > 0 && scriptsOf(s).some((sc) => has(sc, 'playSound')))),
    ],
  },
  {
    id: 'e8', track: 'escuela', num: 8, module: '🎮 módulo juego', title: 'tocar, chocar, mensajes y detener', icon: '🎮',
    goals: [
      { pic: '👆💥', text: 'los programas pueden empezar al tocar o al chocar' },
      { pic: '📨📩', text: 'los mensajes avisan a otro personaje' },
      { pic: '🏁⏹️', text: 'un juego termina cuando se llega a la meta' },
    ],
    unplugged: {
      title: 'pilla-pilla con mensajes',
      steps: [
        'una persona corre hacia la meta (una silla)',
        'al tocar la silla levanta una tarjeta de color: ¡es un mensaje!',
        'quien tenga la tarjeta del mismo color grita «¡ganaste!»',
        'y todos se quedan quietos: ¡fin del juego!',
      ],
    },
    challenge: 'juego con meta: cuando el gato choque con la estrella, envía un mensaje y la estrella responde «¡ganaste!» y termina.',
    introduces: ['onTap', 'onBump', 'send', 'onMessage'],
    guide: [
      { sel: '#btn-flag', text: 'el gato ya corre hacia la estrella', icon: '🐱' },
      { sel: '.palette-block[data-type="onBump"]', text: 'el gato: «al chocar» + «enviar»', icon: '💥' },
      { sel: '.sprite-thumb:nth-child(2)', text: 'la estrella: «al recibir» + «decir» + «fin»', icon: '⭐' },
    ],
    start: () => project('la meta', [scene('parque', [
      spr('gato', 2, 10, [[b('onFlag'), b('right', 15)]]),
      spr('estrella', 18, 10),
    ])]),
    solution: (p) => {
      addScript(first(p, 'gato'), [b('onBump', ''), b('send', 1)]);
      addScript(first(p, 'estrella'), [b('onMessage', 1), b('say', '¡ganaste!'), b('end')]);
    },
    check: [
      cond('💥 un personaje necesita «al chocar» y dentro «enviar mensaje»', (p) => allSprites(p).some((s) => scriptsOf(s, 'onBump').some((sc) => has(sc, 'send')))),
      cond('📩 la meta recibe ese mismo mensaje, dice algo y acaba con fin', (p) => {
        const sent = new Set(allSprites(p).flatMap((s) => scriptsOf(s, 'onBump').flatMap((sc) => flat(sc.blocks).filter((x) => x.type === 'send').map((x) => num(x, 1)))));
        return allSprites(p).some((s) => scriptsOf(s, 'onMessage').some((sc) => sent.has(num(sc.blocks[0], 1)) && has(sc, 'say') && sc.blocks[sc.blocks.length - 1].type === 'end'));
      }),
      cond('🏁 el corredor tiene que llegar a tocar la meta', (p) => {
        const runners = allSprites(p).filter((s) => scriptsOf(s, 'onBump').some((sc) => has(sc, 'send')));
        const goals = allSprites(p).filter((s) => scriptsOf(s, 'onMessage').length > 0);
        return runners.some((r) => goals.some((g) => g !== r && pathTouches(r, g)));
      }),
    ],
  },
];
