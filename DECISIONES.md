# DECISIONES

Decisiones tomadas ante ambigüedades del encargo (sin preguntar, según el contrato de autonomía).

1. **Identidad propia.** La app se llama "aprende jugando". Usa la mecánica genérica de programación por bloques para niños, pero no copia nombre, código, arte, iconos, textos ni el currículo publicado de ninguna app existente. Personajes, fondos, iconos y textos de lecciones son originales (SVG/CSS/emoji del sistema).
2. **Número de bloques.** El encargo dice "22 bloques" pero la lista enumera 27 (5+8+6+2+3+3). Se implementan los 27 listados; el código se refiere a ellos como "la paleta".
3. **Escala lógica.** Escenario lógico de 480x360 (rejilla 20x15 de 24 px, que cuadra con "24 px por paso"). El canvas tiene una resolución interna mínima de 640 px de ancho y se escala al ancho disponible.
4. **Coordenadas.** `x`,`y` de un sprite son el centro en celdas (0..20, 0..15), se ajustan a enteros al arrastrar y se limitan a los bordes (no hay "vuelta" por el borde).
5. **Valores de bloques.** Movimiento: nº de pasos (1 paso = 1 celda). Giros: nº de giros de 30°. Saltar: altura en celdas. Crecer/encoger: nº de pasos de 10 %. Esperar: décimas de segundo. Repetir: n. Velocidad: lenta/normal/rápida. Mensajes: color 1-6. Ir a página: 1-4. Reproducir sonido: nº de grabación (1-5). Al tocar a: personaje concreto o "cualquiera".
6. **Texto de "decir".** No es un número: se elige con un selector de frases e iconos (sin teclado). Un botón opcional "✏️" permite a un adulto escribir una frase propia.
7. **Scripts sin coordenadas.** `Script` no tiene x/y en el modelo de datos; el área de código coloca los scripts en filas automáticas. Soltar un bloque en zona vacía crea un script nuevo.
8. **Imán.** Radio de encaje de 20 px medido desde los bordes del bloque arrastrado al punto de inserción (equivale a una distancia de ~40 px entre puntos de anclaje).
9. **Reglas de encaje.** Los bloques amarillos solo van al principio de un script. "Fin", "repetir por siempre" e "ir a página" solo van al final y nunca dentro de un bucle. "Repetir" sí puede anidarse.
10. **"Repetir por siempre"** es rojo (como pide la lista) pero se dibuja como corchete igual que "repetir".
11. **Persistencia.** IndexedDB con un almacén `projects` (proyecto completo con escenas, sprites y grabaciones como Blob) y otro `thumbs` (miniaturas). Las lecciones usan proyectos propios (`lesson-<id>`) para que nunca se pierda el trabajo.
12. **Editor de pintura raster.** Pinta sobre canvas y guarda el resultado como SVG que envuelve un PNG. Tijeras = recortar (borrar) un rectángulo; sello = copiar una zona y estamparla; mover/girar = mueven o giran todo el dibujo. Cámara: en fondos rellena todo el lienzo, en personajes rellena un círculo.
13. **Marcas de autoría.** El SVG generado por el editor lleva `data-mano="1"`, y `data-foto="1"` si se usó la cámara; los retos de los cuadernos las comprueban.
14. **Estrellas.** Superar un reto da siempre 3 estrellas. El desbloqueo es secuencial dentro de cada itinerario (aventuras, escuela, 1º, 2º). Los padres pueden desbloquear todo.
15. **Comprobación de retos.** Solo se evalúa el estado del proyecto (bloques, valores, escenas, sprites, sonidos, fondos). Las posiciones finales se obtienen simulando de forma determinista los scripts de bandera (sin tiempo ni clics ni registro de ejecución). Cada lección declara una solución de referencia (≤ 12 bloques) y los bloques que introduce; una autoprueba comprueba que la solución pasa, que el estado inicial no pasa, que no se exigen bloques aún no enseñados y que no hay textos de reto repetidos.
16. **Puerta de padres.** Multiplicación de dos cifras del 6 al 9 con respuesta elegida entre 4 botones grandes.
17. **Node.js.** No estaba instalado; se usó Node portable en `%LOCALAPPDATA%\node-portable` (añadido al PATH de usuario).
19. **Límite de 12 bloques.** Se cuenta lo que la niña tiene que añadir; los bloques que ya trae el estado inicial no cuentan.
20. **Texto de los bloques.** El SPEC pide 16 px; los nombres largos de los bloques sin valor usan 13 px para caber en 120x56.
21. **Personajes de partida en lecciones.** Se pueden tocar pero no arrastrar, y los retos se evalúan desde su posición inicial.
18. **Rúbrica de proyectos libres.** Se evalúa sobre el estado del proyecto: funciona (hay al menos un script que empieza con un bloque amarillo y tiene acciones), usa bloques del módulo (≥ 3 categorías distintas), se entiende la idea (hay texto en el escenario o bloques "decir").
