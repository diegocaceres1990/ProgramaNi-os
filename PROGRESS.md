# PROGRESS

## Fase 0 — cerrada
- Archivos: SPEC.md, DECISIONES.md, package.json, tsconfig.json, vite.config.ts, .gitignore
- Funciona: npm install (vite + typescript). Node portable instalado.

## Fase 1 — cerrada
- Archivos: index.html, src/main.ts (arranque provisional), src/core/state.ts, engine.ts, stage.ts, sprites.ts, audio.ts, src/styles/base.css, layout.css
- Funciona: tipos, store con undo/redo y selección, rejilla 20x15, render del escenario en canvas con delta time, bandera/fin, 8 bloques azules interpolados.
- Prueba: script de prueba del motor (Node + ssrLoadModule de Vite) → el gato termina en la celda esperada. tsc y build limpios.

## Fase 2 — cerrada
- Archivos: src/core/blocks.ts, scripting.ts, src/ui/dialog.ts, src/ui/toolbar.ts, src/styles/blocks.css
- Funciona: paleta con 6 categorías (27 bloques, ver DECISIONES 2), arrastrar con imán, anidar en repetir/por siempre, borrar al soltar fuera, rueda numérica y selectores táctiles, disparadores, mensajes encadenados, colisiones, velocidad, ir a página.
- Prueba: 10/10 comprobaciones del motor (anidado, cadena de mensajes 2→3, choque, toque, por siempre + parar, página, resto de bloques). tsc y build limpios.
- Pendiente de prueba manual en navegador real (este entorno no tiene navegador): gestos de arrastre.

## Fase 3 — cerrada
- Archivos: src/core/sprites.ts (12 personajes y 8 fondos originales), src/core/paint.ts, src/core/audio.ts, src/styles/paint.css, grabadora en src/ui/toolbar.ts
- Funciona (compila; lógica revisada): editor de pintura con lápiz curvo, círculo, rectángulo, triángulo, 3 grosores, cubo, tijeras, sello, mover, girar, cámara, deshacer, rejilla, 24 colores, nombre, ✓. Grabación de hasta 10 s, 5 por personaje, reproducción con el bloque verde.
- Pendiente de prueba manual: micrófono y cámara (necesitan permisos del navegador).

## Fase 4 — cerrada
- Archivos: src/ui/gallery.ts, src/main.ts (router de la fase 4), src/core/db.ts, public/manifest.webmanifest, public/sw.js, public/icons/icon-192.png, icon-512.png, src/styles/adventures.css
- Funciona: galería (crear, abrir, renombrar y borrar con pulsación larga), IndexedDB, autoguardado cada 3 s y al cambiar de escena, PWA offline.
- Cambios hechos por el portón: `src/ui/toolbar.ts` (más alto para paleta+código: en iPad horizontal la paleta solo enseñaba 1,5 bloques) y `public/sw.js` (los recursos `crossorigin` no se encontraban en caché por `Vary`; ahora `ignoreVary`, versión de caché aj-v2).

## Portón F4
Ejecutado el 2026-11-25 en **Google Chrome real** (`C:\Program Files\Google\Chrome\Application\chrome.exe`, headless) controlado por el protocolo DevTools, el mismo que usa F12, con un driver en Node sin dependencias:
- Emulación iPad Air horizontal: 1180x820, DPR 2, `mobile: true`, táctil con 5 puntos, UA de iPad.
- Modo desarrollo con `npm run dev` (vite) para los puntos 1-13. Para el punto offline, `vite build` + `vite preview`, porque el service worker solo se registra en producción. Después se puso **Network offline** y además se apagó el servidor.
- Micrófono y cámara: dispositivos simulados de Chrome (`--use-fake-device-for-media-stream`: pitido y patrón de prueba). No se usaron un micrófono y una cámara físicos.
- Driver: `gate-f4.mjs` en el scratchpad de la sesión (temporal, fuera del repo por la lista cerrada de archivos).

Primera pasada: 5/8 y el driver se detuvo. Fallos encontrados y corregidos:
1. Imán: el bloque «arriba» quedaba fuera de la parte visible de la paleta (y=830 con un viewport de 820). Se amplió la zona inferior y el driver ahora desplaza la paleta como haría la niña.
2. Offline: `index-*.js` e `index-*.css` respondían con estado 0 sin red (el HTML sí salía de caché). Corregido en sw.js.

Resultado literal de la pasada final (15/15):
    PASA | carga en modo iPad (1180x820 horizontal, táctil, UA iPad) | maxTouchPoints=5; pantalla de inicio visible
    PASA | crear proyecto | editor abierto con "proyecto 1"; galería: ["proyecto 1"]
    PASA | renombrar (pulsación larga 600 ms → ✏️ → ✓) | menú por pulsación larga=true; galería: ["mi cohete"]
    PASA | recargar: el proyecto renombrado persiste | tras recargar: ["mi cohete"]
    PASA | arrastrar un bloque de la paleta al área de código (ratón) | bloques "derecha" en el área: 1
    PASA | imán: el segundo bloque encaja a continuación | {"scripts":1,"bloques":["right","up"]}
    PASA | arrastre con eventos táctiles reales: la bandera encaja al principio | [["onFlag","right","up"]]
    PASA | arrastrar fuera del área elimina | quedan: ["onFlag","right"] (x casa del gato=3)
    PASA | autoguardado (3 s) + recarga: el script persiste | ["onFlag","right"]
    PASA | editor de pintura: abre a pantalla completa y pinta (lápiz + círculo) | abierto=true; lienzo 729x729 px; píxeles con tinta=43660
    PASA | cámara: saca una foto y queda en el personaje | vídeo 640x480; svg con data-mano=true data-foto=true
    PASA | micrófono: graba y guarda el sonido en el personaje | grabando=true; nivel=2%; grabación: 31006 bytes, 2.40 s, audio/webm;codecs=opus
    PASA | borrar proyecto (pulsación larga → 🗑️ → ✓) y recargar | antes de recargar: []; después: []
    PASA | offline: Network offline + servidor apagado → la app carga | SW controlando=true; servidor apagado=true; caché=["/","/index.html","/manifest.webmanifest","/icons/icon-192.png","/icons/icon-512.png","/assets/index-BlsNzWKo.js","/assets/index-DUsSOo90.css"]; inicio offline con 1 proyecto(s); editor offline=true
    PASA | errores de consola durante todo el portón | ninguno
    RESUMEN 15/15

## Bloques extra
El SPEC dice "exactamente estos 22", pero la lista que escribe tiene **27 nombres** (amarillo 5, azul 8, morado 6, verde 2, naranja 3, rojo 3). El texto del SPEC no indica cuáles serían los 5 sobrantes, así que no hay forma objetiva de elegirlos: los 27 están en la lista. Abajo va la lección en la que se introduce cada bloque. Regla aplicada: si un bloque no se introduce en ninguna lección, se quita de la paleta.

Al revisar el plan de lecciones, 3 bloques se habían quedado sin lección: «mostrar», «tamaño normal» y «repetir por siempre». En lugar de quitarlos de la paleta, que contradiría la lista del SPEC, se les asigna una lección:
- **mostrar** y **tamaño normal** → Cuaderno 1º, lección 3 (tarjeta de cumpleaños: la sorpresa aparece y el personaje vuelve a su tamaño).
- **repetir por siempre** → Cuaderno 1º, lección 6 (lluvia que no para).

| bloque | primera lección que lo introduce |
|---|---|
| bandera verde | Aventura 1 · Escuela 1 · 1º-1 · 2º-1 |
| al tocar este personaje | Aventura 9 · Escuela 8 · 1º-8 · 2º-5 |
| al tocar a [personaje] | Aventura 11 · Escuela 8 · 1º-5 · 2º-2 |
| al recibir [mensaje] | Aventura 12 · Escuela 8 · 2º-1 |
| enviar [mensaje] | Aventura 12 · Escuela 8 · 2º-1 |
| mover derecha | Aventura 1 · Escuela 1 · 1º-1 · 2º-2 |
| mover izquierda / arriba / abajo | Aventura 2 · Escuela 1 · 1º-1 · 2º-3 (arriba/abajo) |
| girar ↻ / girar ↺ | Aventura 2 · Escuela 2 · 1º-4 (↺) |
| saltar | Aventura 6 · Escuela 3 · 1º-1 · 2º-10 |
| ir a casa | 1º-6 · 2º-3 |
| decir | Aventura 7 · Escuela 7 · 1º-2 · 2º-1 |
| crecer / encoger | 1º-3 |
| ocultar | 1º-8 |
| mostrar | 1º-3 |
| tamaño normal | 1º-3 |
| sonido pop | Aventura 10 · 1º-8 |
| reproducir sonido grabado | Aventura 8 · Escuela 7 · 1º-2 · 2º-6 |
| esperar | Aventura 7 · Escuela 7 · 1º-2 · 2º-1 |
| repetir [n] | Aventura 6 · Escuela 6 · 1º-3 · 2º-11 |
| velocidad | Aventura 5 · Escuela 5 · 1º-5 · 2º-4 |
| fin | Aventura 3 · Escuela 3 · 2º-2 |
| repetir por siempre | 1º-6 |
| ir a página | Aventura 9 · Escuela 7 · 1º-2 · 2º-1 |

Resultado: ningún bloque queda sin lección, así que no se quita ninguno de la paleta. La autoprueba de verify.ts (fase 5) comprobará que cada bloque se use solo después de su lección de introducción.

## Fase 5 — cerrada
- Archivos: src/core/verify.ts, src/content/adventures.ts (kit de estados iniciales + aventuras), src/content/tutorials.ts, src/ui/adventures.ts, src/ui/tutorials.ts, src/main.ts (router definitivo).
- verify.ts: solo evalúa el ESTADO del proyecto (bloques, valores, escenas, sprites, grabaciones, fondos, textos); las posiciones salen de una simulación determinista de los scripts de bandera con las mismas cajas de colisión que el motor. Nunca tiempo ni clics.
- Nota de alcance: adventures.ts se escribió con las 12 aventuras de una vez (no 4 + 5 + 3), para no reabrir un archivo de fase cerrada; las fases 6 y 7 cierran su parte con la verificación.
- Cierre: aventuras 1-4 y tutoriales 1-2 → cada reto rechaza su estado inicial y acepta su solución (ver autoprueba).

## Fase 6 — cerrada
- Aventuras 5-9 y tutoriales 3-4: autoprueba correcta (inicial rechazado / solución aceptada).

## Fase 7 — cerrada
- Archivos: src/content/school.ts.
- Aventuras 10-12 y Escuela 1-8 (3 módulos) con actividad desconectada previa visible en la pantalla de objetivo.

## Fase 8 — cerrada
- Archivos: src/content/grade1.ts (incluye fondo de laberinto original), src/content/grade2.ts, src/ui/parent.ts (adelantado: aloja el botón de autoprueba).
- Rúbrica común en verify.ts: funciona / usa los bloques del módulo / se entiende la idea (en proyectos libres: 3 colores + texto o burbujas).

### Autoprueba del temario (Node, código real cargado con vite ssrLoadModule) — resultado literal
- lecciones por itinerario {"aventuras":12,"escuela":8,"grado1":12,"grado2":12}
- autoprueba: 44/44 correctas (3 viñetas, texto de reto único, estado inicial rechazado, solución aceptada, solución ≤ 12 bloques, ningún bloque antes de su lección)
- tutoriales t1-t4: estado inicial rechazado
- choque reproducido en el motor real en todas las lecciones que lo exigen: a11, e8, g1-5, g1-11, g2-2, g2-3, g2-9 → sí
- motor real vs simulación: 77/79 personajes coinciden en la posición final. Las 2 diferencias (g2-7, niño y perro) son esperadas: la simulación solo recorre scripts de bandera y en los relevos esos movimientos llegan por mensajes. El reto de g2-7 no comprueba posiciones.

### Prueba de la interfaz de lecciones en Chrome (iPad emulado, gestos reales) — resultado literal
    PASA | mapa de aventuras: 12 lecciones, solo la 1 libre | ["a1:libre","a2:bloq","a3:bloq","a4:bloq","a5:bloq","a6:bloq","a7:bloq","a8:bloq","a9:bloq","a10:bloq","a11:bloq","a12:bloq"]
    PASA | una lección bloqueada no se abre | tras tocar a2 sigue el mapa: true
    PASA | pantalla de objetivo con 3 viñetas y reto | {"v":3,"reto":"lleva al gato de paseo hasta el árbol: tiene que llegar a la columna 15 o más."}
    PASA | práctica guiada: aro + flecha + burbuja sobre la interfaz real | {"bubble":"este programa ya empieza con la bandera","ring":true,"arrow":"⬇️"}
    PASA | reto incorrecto: se detecta y se da pista | "💡 ➡️ pon «mover derecha» y sube el número hasta que llegue a la columna 15"
    PASA | reto correcto con gestos reales → 3 estrellas | script=["onFlag","right"] valor=12 celebración=true
    PASA | estrellas guardadas y desbloqueo de la siguiente | ["a1:⭐⭐⭐:libre","a2:☆☆☆:libre","a3:☆☆☆:bloq"]
    PASA | el progreso persiste al recargar | ⭐⭐⭐
    PASA | escuela: 3 módulos y actividad desconectada visible | {"mods":["🎨 módulo collage","📖 módulo historia","🎮 módulo juego"],"unp":{"t":"🧍 sin pantalla: programador dice","pasos":5}}
    PASA | cuadernos de 1º y 2º: 12 + 12 lecciones; la primera abre el editor con su reto | [{"tr":"grado1","n":12,"abre":true,"reto":"collage: reúne 4 personajes en la escena y que cada uno se mueva a su manera al pulsar la bandera."},{"tr":"grado2","n":12,"abre":true,"reto":"historia de 4 páginas: cada página pasa a la siguiente y, en alguna, un personaje avisa a otro con un mensaje."}]
    PASA | tutoriales: 4, se pueden saltar y quedan como vistos | tarjetas=4 t1 visto=true
    PASA | panel de padres tras la puerta aritmética + autoprueba en el navegador | 8 × 9 = ? → ✅ 44/44 lecciones correctas.
    PASA | errores de consola | ninguno
    RESUMEN 13/13

## Fase 9 — cerrada
- Estrellas, desbloqueo secuencial, panel de padres con puerta aritmética (6-9 × 6-9, 4 respuestas), sonidos de interfaz (toque, clic de imán, borrar, éxito, error) y botón de silencio: hechos en fases anteriores y verificados en Chrome.
- Pulido táctil y revisión de tamaños: pestañas de la paleta en 3x2 (antes la 6ª quedaba cortada), zona de paleta+código de al menos 280 px, áreas táctiles ampliadas con pseudo-elementos invisibles donde el diseño fija medidas menores (barra superior de 48 px del SPEC, pastilla de valor de los bloques, botones de la barra de reto), colores y grosores del editor de pintura a 56 px.
- Archivos tocados: src/styles/*.css, src/ui/toolbar.ts (reparto de altura), src/core/paint.ts (ancho del panel lateral).

### Auditoría de tamaños en Chrome (iPad emulado): área táctil efectiva de cada elemento interactivo visible — resultado literal
    PASA | tamaños: inicio | todo ≥ 56 px
    PASA | tamaños: mapa de lecciones | todo ≥ 56 px
    PASA | tamaños: pantalla de objetivo | todo ≥ 56 px
    PASA | tamaños: práctica guiada (burbuja) | todo ≥ 56 px
    PASA | tamaños: editor con barra de reto | todo ≥ 56 px
    PASA | tamaños: paleta motion | todo ≥ 56 px
    PASA | tamaños: paleta looks | todo ≥ 56 px
    PASA | tamaños: paleta sound | todo ≥ 56 px
    PASA | tamaños: paleta control | todo ≥ 56 px
    PASA | tamaños: paleta end | todo ≥ 56 px
    PASA | tamaños: rueda numérica | todo ≥ 56 px
    PASA | tamaños: biblioteca de personajes | todo ≥ 56 px
    PASA | tamaños: editor de pintura | todo ≥ 56 px
    PASA | tamaños: grabadora | todo ≥ 56 px
    PASA | tamaños: tutoriales | todo ≥ 56 px
    PASA | tamaños: puerta de padres | todo ≥ 56 px
    PASA | errores de consola | ninguno
    RESUMEN 17/17

### Regresión tras el pulido
- Portón F4: 15/15 · Interfaz de lecciones: 13/13 · Autoprueba del temario: 44/44.

## Estado final
- Todo compila (`npx tsc --noEmit` y `npm run build` limpios).
- Sin probar con hardware real: micrófono y cámara físicos (se probaron con los dispositivos simulados de Chrome) y un iPad físico (se probó con emulación de Chrome).
- Scripts de prueba (Node + Chrome por DevTools Protocol, sin dependencias): `engine-test.mjs`, `gate-f4.mjs`, `lessons-gate.mjs`, `audit.mjs` y `selftest.mjs`, en el scratchpad temporal de la sesión. No están en el repo porque la lista de archivos del SPEC es cerrada.

## Revisión independiente (agente) y correcciones — sin commit todavía
Hallazgos verificados y corregidos:
- Motor: dos scripts que mueven a la vez al mismo personaje se pisaban. Ahora se suman incrementos, con ajuste exacto al final de cada movimiento, e «ir a casa» cancela los movimientos en curso (el reinicio de g2-3 ya se ve).
- Retos: se podían superar arrastrando al personaje. Ahora los personajes de partida de una lección no se arrastran y verify evalúa desde su posición inicial.
- Rúbrica: rechazaba soluciones válidas (g1-4 con ↻, g1-6 con «arriba»). Ahora acepta si el reto se cumple.
- g2-11: aceptaba solo un tipo de arreglo. Ahora solo exige que el gato salte después de llegar a x ≥ 16.
- a5, a11 y a12: las comprobaciones eran demasiado laxas. a3 rechaza «derecha 0». a7 y e6 dicen en la pista que tiene que ser con la bandera.
- Botón ❓: ahora cierra el editor (antes el motor y el autoguardado seguían vivos).
- Editor de pintura: ya no encoge los dibujos propios al reabrirlos; ✕ pide confirmación si hay trazos; ✓ sin cambios no marca el dibujo como hecho a mano.
- Guía: abre la pestaña de la paleta del bloque que señala.
- «Ir a página» a una página que no existe ya no reinicia la página en bucle.
- La reproducción de sonido tiene un tope de seguridad de 12 s.
- El arrastre solo responde al dedo que lo empezó.
- DECISIONES 19-21: límite de 12 bloques (se cuentan los añadidos), texto de 13 px en bloques con nombre largo, personajes de partida fijos.
Sin corregir (menores): tamaño de la pila de deshacer con fotos, versión fija de la caché del SW.
Regresión: motor 10/10 · autoprueba 44/44 · portón F4 15/15 · interfaz de lecciones 13/13.

## Uso diario en Windows
- Acceso directo en el escritorio «aprende jugando» → wscript lanzar.vbs. Arranca un servidor local oculto (Node, sin dependencias) en http://127.0.0.1:4747 y abre Chrome en modo app.
- Copia de la app en %LOCALAPPDATA%\aprende-jugando\app. Para actualizarla tras cambiar el código: `npm run build` y volver a copiar dist/ ahí.
- Prueba (Chrome headless contra el servidor instalado): 4/4 → responde, SW activo, contexto seguro (micro y cámara permitidos), y sigue abriendo con el servidor apagado.
