# SPEC — aprende jugando (fuente de verdad, no se regenera)

## ARCHIVOS (nombres exactos)

    index.html
    package.json
    vite.config.ts
    tsconfig.json
    .gitignore
    public/manifest.webmanifest
    public/sw.js
    public/icons/icon-192.png
    public/icons/icon-512.png
    src/main.ts
    src/styles/base.css
    src/styles/layout.css
    src/styles/blocks.css
    src/styles/paint.css
    src/styles/adventures.css
    src/core/state.ts        (store, undo/redo, selección)
    src/core/db.ts           (IndexedDB)
    src/core/blocks.ts       (definición de los 22 bloques, render de paleta)
    src/core/scripting.ts    (arrastrar, encajar, anidar)
    src/core/engine.ts       (ejecución de scripts)
    src/core/stage.ts        (render, hit test, rejilla)
    src/core/sprites.ts      (biblioteca SVG)
    src/core/paint.ts        (editor de pintura)
    src/core/audio.ts        (pop, grabación)
    src/core/progress.ts     (aventuras, estrellas, desbloqueo)
    src/core/verify.ts       (evaluación de retos)
    src/ui/toolbar.ts
    src/ui/gallery.ts
    src/ui/tutorials.ts
    src/ui/adventures.ts
    src/ui/parent.ts
    src/ui/dialog.ts
    src/content/adventures.ts
    src/content/tutorials.ts
    src/content/school.ts
    src/content/grade1.ts
    src/content/grade2.ts

## DATOS

    type Block = { id: string; type: BlockType; value?: number | string; children?: Block[] };
    type Script = { id: string; blocks: Block[] };
    type Sprite = { id: string; name: string; svg: string; x: number; y: number; dir: number; size: number; visible: boolean; sounds: Blob[]; scripts: Script[] };
    type Scene = { id: string; bg: string; sprites: Sprite[]; texts: {x:number;y:number;text:string}[] };
    type Project = { id: string; name: string; createdAt: number; updatedAt: number; scenes: Scene[] };

Coordenadas en celdas de una rejilla de 20 x 15, origen arriba a la izquierda. Los scripts pertenecen al sprite. Máximo 4 escenas, 6 mensajes por escena, 5 sonidos por sprite.

## DISEÑO

Escenario: 20 x 15 celdas, escalado al ancho disponible, mínimo 640 px lógicos.

Zonas: barra superior 48 px con bandera verde (ejecutar todo), bandera roja (detener), icono de fondo, icono de texto, icono casa, icono de interrogación. Columna izquierda 72 px con miniaturas de personajes y botón "+" azul; pulsación larga 600 ms revela "x" de borrado; el personaje activo lleva marco. Columna derecha 56 px con miniaturas de escenas numeradas y botón "+". Abajo izquierda, paleta de 200 px con scroll. Abajo derecha, área de código horizontal. Editor de pintura a pantalla completa en modal.

Colores: inicio #FFD23F, movimiento #4C97FF, apariencia #9966FF, sonido #4CBF56, control #FFAB19, fin #FF4C4C. Bloques de 120x56, radio 12, borde inferior 4 px más oscuro, relieve de pieza de puzle, texto 16 px bold. Imán de 20 px con sonido de clic. Arrastrar fuera del área elimina.

Los bucles se dibujan como corchete por encima de los bloques que envuelven.

## BLOQUES

Amarillo: bandera verde · al tocar este personaje · al tocar a [personaje] · al recibir [mensaje 1-6] · enviar [mensaje 1-6]
Azul: mover derecha · mover izquierda · mover arriba · mover abajo (24 px por paso) · girar ↻ 30° · girar ↺ 30° · saltar · ir a casa
Morado: decir [texto] · crecer · encoger · ocultar · mostrar · tamaño normal
Verde: sonido pop · reproducir sonido grabado
Naranja: esperar [décimas] · repetir [n] · velocidad lenta/normal/rápida
Rojo: fin · repetir por siempre · ir a página [n]

Los valores se eligen con rueda numérica táctil, nunca con teclado.

## MOTOR

Scripts en paralelo. Cada script arranca por su bloque amarillo. "Esperar" y "Decir" bloquean solo su script. "Repetir" y "Repetir por siempre" repiten sus hijos. Las acciones son interpoladas, no instantáneas. "Al tocar a X" y "Al tocar este personaje" se disparan por cajas de colisión. Bandera verde reinicia posiciones antes de ejecutar. Bandera roja aborta todo.

## EDITOR

Lápiz curvo, círculo, rectángulo, triángulo, 3 grosores, cubo, tijeras, sello, mover, girar, cámara, deshacer, rejilla opcional, 24 colores, nombre del personaje, guardar con ✓. Para fondos, mismo editor sin campo de nombre.

## TEMARIO

Cada lección: pantalla de objetivo con 3 viñetas ilustradas, práctica guiada con flechas sobre la interfaz real, reto evaluado por verify.ts, y 3 estrellas al superarlo. Desbloqueo secuencial. Las lecciones de Escuela añaden actividad desconectada previa ("Programador dice").

### Aventuras (12, públicas)
1. El paseo — bandera, mover derecha. Éxito: el gato llega a x mayor o igual a 15.
2. El cuadrado — 4 movimientos y 4 giros. Éxito: 8 bloques y vuelve al inicio.
3. Empieza y para — bandera y fin. Éxito: script de 3 bloques cerrado con fin.
4. Dos amigos — fondo y segundo personaje. Éxito: 2 personajes con script propio.
5. Caracol y cohete — velocidad. Éxito: un sprite lento y otro rápido.
6. Ocho saltos — repetir 8 con saltar dentro. Éxito: bucle con n=8 y salto anidado.
7. Conversación — decir y esperar. Éxito: 2 burbujas separadas por esperar.
8. Mi voz — grabar y reproducir. Éxito: sonido grabado asignado y ejecutado.
9. Dos páginas — segunda escena e ir a página. Éxito: transición tras tocar.
10. Toca y salta — al tocar este personaje. Éxito: script con trigger de toque.
11. Choque — al tocar a otro personaje y fin. Éxito: colisión dispara decir y fin.
12. El juego — mensajes, bandera, fin. Éxito: tocar la estrella envía mensaje y el otro responde.

### Tutoriales (4, en la interrogación)
Mover un personaje · hacer que diga algo · repetir un salto 5 veces · dos personajes que se hablan con mensajes. Se pueden saltar; se guardan como vistos.

### Escuela, módulo collage (4)
E1 Instrucciones y secuencias. Desconectada: Programador dice. Reto: 3 bloques en orden.
E2 Secuencias repetidas y movimiento. Desconectada: Simon dice con bloques. Reto: cuadrado con 8 bloques.
E3 Bandera, fin y elegir personajes. Reto: inicio y cierre correctos.
E4 Fondos y varios personajes. Reto: 2 personajes, 2 scripts, 1 fondo.

### Escuela, módulo historia (3)
E5 Velocidad. Reto: 3 velocidades en 3 personajes.
E6 Números y repetición. Reto: bucle con n=6.
E7 Burbujas, sonidos, páginas, esperar. Reto: diálogo en 2 páginas con voz grabada.

### Escuela, módulo juego (1)
E8 Tocar, chocar, mensajes, detener. Reto: juego con meta y mensaje de victoria.

### Cuaderno de 1º (12)
Collage de 4 personajes · historia de 2 páginas con 2 voces · tarjeta de cumpleaños animada · baile sincronizado de 3 personajes · carrera con meta y mensaje · lluvia con repetir · cuento de 3 páginas · juego de tocar 3 estrellas · personaje dibujado a mano · fondo dibujado con foto · laberinto simple · proyecto libre con rúbrica de 3 criterios.

### Cuaderno de 2º (12)
Historia de 4 páginas con mensajes · juego de pillar con colisiones · laberinto con muros y reinicio · animación con 3 velocidades y esperas · diálogo condicional acierto/error · museo interactivo · carrera de relevos con mensajes · escena con fondo propio y foto · juego de 3 niveles con páginas · 6 mensajes encadenados · depurar un proyecto roto · proyecto libre y presentación.

Rúbrica común: funciona, usa los bloques del módulo, se entiende la idea.

## REGLAS VIVAS (añadidas durante el desarrollo; obligatorias en todas las fases)

- Cada lección lleva objetivo con 3 viñetas, reto y una comprobación real en verify.ts sobre el estado del proyecto (posición, bloques usados, número de escenas). Prohibido reutilizar el mismo texto de reto entre lecciones.
- Cada lección incluye un estado inicial jugable: escena, fondo, personajes ya colocados y, si aplica, bloques ya puestos. La lección debe poder empezarse sin montar nada antes.
- verify.ts evalúa estado del proyecto, nunca tiempo ni número de clics.
- Un reto solo puede exigir bloques ya introducidos hasta esa lección. Si necesita uno que no se ha enseñado, el orden está mal.
- Máximo 12 bloques en la solución de referencia de cualquier reto.
