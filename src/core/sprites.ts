// Biblioteca de personajes y fondos originales, dibujados con SVG.
// Personajes: viewBox 0 0 100 100. Fondos: viewBox 0 0 480 360.

export interface LibraryItem {
  key: string;
  name: string;
  svg: string;
}

const S = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;
const B = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360">${body}</svg>`;

const EYES = (x1: number, x2: number, y: number, r = 5) =>
  `<circle cx="${x1}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${x2}" cy="${y}" r="${r}" fill="#fff"/>` +
  `<circle cx="${x1 + 1}" cy="${y + 1}" r="${r * 0.55}" fill="#222"/><circle cx="${x2 + 1}" cy="${y + 1}" r="${r * 0.55}" fill="#222"/>`;

export const SPRITE_LIBRARY: LibraryItem[] = [
  {
    key: 'gato',
    name: 'gato',
    svg: S(
      `<path d="M78 70 Q96 60 90 40" stroke="#7A7FA8" stroke-width="7" fill="none" stroke-linecap="round"/>` +
        `<ellipse cx="52" cy="72" rx="26" ry="20" fill="#9CA3D4" stroke="#5D628C" stroke-width="2.5"/>` +
        `<path d="M24 22 L30 46 L44 34 Z" fill="#9CA3D4" stroke="#5D628C" stroke-width="2.5" stroke-linejoin="round"/>` +
        `<path d="M76 22 L70 46 L56 34 Z" fill="#9CA3D4" stroke="#5D628C" stroke-width="2.5" stroke-linejoin="round"/>` +
        `<circle cx="50" cy="44" r="22" fill="#B4BAE6" stroke="#5D628C" stroke-width="2.5"/>` +
        EYES(42, 58, 41, 5.5) +
        `<path d="M47 50 L53 50 L50 54 Z" fill="#F28CB1"/>` +
        `<path d="M44 57 Q50 61 56 57" stroke="#5D628C" stroke-width="2" fill="none" stroke-linecap="round"/>` +
        `<path d="M30 50 L40 52 M30 56 L40 55 M70 50 L60 52 M70 56 L60 55" stroke="#5D628C" stroke-width="1.6" stroke-linecap="round"/>` +
        `<ellipse cx="40" cy="90" rx="8" ry="5" fill="#B4BAE6" stroke="#5D628C" stroke-width="2"/>` +
        `<ellipse cx="62" cy="90" rx="8" ry="5" fill="#B4BAE6" stroke="#5D628C" stroke-width="2"/>`,
    ),
  },
  {
    key: 'nina',
    name: 'niña',
    svg: S(
      `<path d="M30 30 Q24 64 30 70 L70 70 Q76 64 70 30 Z" fill="#6B3E26"/>` +
        `<path d="M36 64 L64 64 L74 94 L26 94 Z" fill="#FF7BAC" stroke="#C2457A" stroke-width="2.5" stroke-linejoin="round"/>` +
        `<circle cx="50" cy="40" r="20" fill="#F7C9A0" stroke="#B9835A" stroke-width="2.5"/>` +
        `<path d="M30 38 Q34 16 50 18 Q68 16 70 38 Q60 26 50 30 Q40 26 30 38 Z" fill="#7B4A2E"/>` +
        `<circle cx="28" cy="30" r="7" fill="#7B4A2E"/><circle cx="72" cy="30" r="7" fill="#7B4A2E"/>` +
        `<circle cx="28" cy="30" r="3" fill="#FFD23F"/><circle cx="72" cy="30" r="3" fill="#FFD23F"/>` +
        EYES(43, 57, 41, 4) +
        `<circle cx="38" cy="49" r="3" fill="#FF9DB8" opacity=".7"/><circle cx="62" cy="49" r="3" fill="#FF9DB8" opacity=".7"/>` +
        `<path d="M44 50 Q50 55 56 50" stroke="#8A4B2C" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    ),
  },
  {
    key: 'nino',
    name: 'niño',
    svg: S(
      `<rect x="34" y="62" width="32" height="30" rx="8" fill="#4C97FF" stroke="#2E6BC2" stroke-width="2.5"/>` +
        `<circle cx="50" cy="40" r="20" fill="#E8B48A" stroke="#A9744C" stroke-width="2.5"/>` +
        `<path d="M30 36 Q32 18 50 18 Q70 18 70 36 Q62 28 54 30 Q46 24 30 36 Z" fill="#2B2B2B"/>` +
        EYES(43, 57, 41, 4) +
        `<path d="M43 51 Q50 57 57 51" stroke="#7A4A2A" stroke-width="2" fill="none" stroke-linecap="round"/>` +
        `<rect x="38" y="88" width="9" height="8" rx="3" fill="#333"/><rect x="53" y="88" width="9" height="8" rx="3" fill="#333"/>`,
    ),
  },
  {
    key: 'perro',
    name: 'perro',
    svg: S(
      `<ellipse cx="52" cy="72" rx="26" ry="18" fill="#E0A866" stroke="#9A6A32" stroke-width="2.5"/>` +
        `<path d="M76 66 Q92 58 88 48" stroke="#9A6A32" stroke-width="6" fill="none" stroke-linecap="round"/>` +
        `<circle cx="48" cy="42" r="21" fill="#F0BE7E" stroke="#9A6A32" stroke-width="2.5"/>` +
        `<ellipse cx="27" cy="44" rx="8" ry="15" fill="#8B5A2B"/><ellipse cx="69" cy="44" rx="8" ry="15" fill="#8B5A2B"/>` +
        EYES(41, 55, 38, 4.5) +
        `<ellipse cx="48" cy="51" rx="6" ry="4.5" fill="#333"/>` +
        `<path d="M44 57 Q48 62 52 57" stroke="#333" stroke-width="2" fill="none"/>` +
        `<path d="M46 60 Q48 68 50 60" fill="#FF6F8F"/>`,
    ),
  },
  {
    key: 'caracol',
    name: 'caracol',
    svg: S(
      `<path d="M10 80 Q20 70 60 72 L86 72 Q94 80 86 86 L14 86 Q6 84 10 80 Z" fill="#B6E388" stroke="#6E9F45" stroke-width="2.5"/>` +
        `<path d="M76 72 L82 46 M84 72 L92 48" stroke="#6E9F45" stroke-width="3" stroke-linecap="round"/>` +
        `<circle cx="82" cy="44" r="4" fill="#333"/><circle cx="92" cy="46" r="4" fill="#333"/>` +
        `<circle cx="42" cy="56" r="26" fill="#F4A259" stroke="#B5652A" stroke-width="2.5"/>` +
        `<path d="M42 56 m-4 0 a4 4 0 1 1 8 0 a9 9 0 1 1 -18 0 a14 14 0 1 1 28 0 a19 19 0 1 1 -38 0" fill="none" stroke="#B5652A" stroke-width="3"/>`,
    ),
  },
  {
    key: 'cohete',
    name: 'cohete',
    svg: S(
      `<path d="M50 6 Q72 26 68 66 L32 66 Q28 26 50 6 Z" fill="#EEF2F7" stroke="#6B7A8F" stroke-width="2.5"/>` +
        `<path d="M50 6 Q62 16 65 28 L35 28 Q38 16 50 6 Z" fill="#FF4C4C"/>` +
        `<circle cx="50" cy="42" r="8" fill="#7FD3FF" stroke="#6B7A8F" stroke-width="2.5"/>` +
        `<path d="M32 52 L18 72 L32 68 Z M68 52 L82 72 L68 68 Z" fill="#FF4C4C" stroke="#B22" stroke-width="2"/>` +
        `<path d="M38 66 Q50 98 62 66 Z" fill="#FFAB19"/><path d="M43 66 Q50 86 57 66 Z" fill="#FFD23F"/>`,
    ),
  },
  {
    key: 'estrella',
    name: 'estrella',
    svg: S(
      `<path d="M50 6 L62 36 L94 38 L69 58 L78 90 L50 72 L22 90 L31 58 L6 38 L38 36 Z" fill="#FFD23F" stroke="#D49B00" stroke-width="3" stroke-linejoin="round"/>` +
        EYES(42, 58, 48, 4) +
        `<path d="M43 58 Q50 64 57 58" stroke="#8A6200" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    ),
  },
  {
    key: 'arbol',
    name: 'árbol',
    svg: S(
      `<rect x="42" y="58" width="16" height="36" rx="4" fill="#8B5A2B" stroke="#5E3A17" stroke-width="2.5"/>` +
        `<circle cx="50" cy="36" r="24" fill="#4CBF56" stroke="#2F8A38" stroke-width="2.5"/>` +
        `<circle cx="30" cy="50" r="16" fill="#4CBF56" stroke="#2F8A38" stroke-width="2.5"/>` +
        `<circle cx="70" cy="50" r="16" fill="#4CBF56" stroke="#2F8A38" stroke-width="2.5"/>` +
        `<circle cx="40" cy="30" r="4" fill="#FF4C4C"/><circle cx="62" cy="42" r="4" fill="#FF4C4C"/><circle cx="32" cy="52" r="4" fill="#FF4C4C"/>`,
    ),
  },
  {
    key: 'pelota',
    name: 'pelota',
    svg: S(
      `<circle cx="50" cy="50" r="38" fill="#FF6B6B" stroke="#B33A3A" stroke-width="3"/>` +
        `<path d="M14 42 Q50 60 86 42" stroke="#fff" stroke-width="8" fill="none"/>` +
        `<path d="M50 12 Q36 50 50 88" stroke="#FFD23F" stroke-width="6" fill="none"/>` +
        `<circle cx="36" cy="32" r="6" fill="#fff" opacity=".6"/>`,
    ),
  },
  {
    key: 'nube',
    name: 'nube',
    svg: S(
      `<path d="M22 72 Q6 70 10 54 Q12 40 28 42 Q30 22 50 24 Q66 18 72 36 Q92 34 92 54 Q94 72 76 72 Z" fill="#FFFFFF" stroke="#9AB3CC" stroke-width="3" stroke-linejoin="round"/>` +
        EYES(40, 60, 50, 3.5) +
        `<path d="M44 58 Q50 62 56 58" stroke="#5C7A99" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    ),
  },
  {
    key: 'mariposa',
    name: 'mariposa',
    svg: S(
      `<ellipse cx="30" cy="36" rx="20" ry="18" fill="#9966FF" stroke="#6233C4" stroke-width="2.5"/>` +
        `<ellipse cx="70" cy="36" rx="20" ry="18" fill="#9966FF" stroke="#6233C4" stroke-width="2.5"/>` +
        `<ellipse cx="32" cy="66" rx="14" ry="13" fill="#FF7BAC" stroke="#C2457A" stroke-width="2.5"/>` +
        `<ellipse cx="68" cy="66" rx="14" ry="13" fill="#FF7BAC" stroke="#C2457A" stroke-width="2.5"/>` +
        `<circle cx="30" cy="36" r="6" fill="#FFD23F"/><circle cx="70" cy="36" r="6" fill="#FFD23F"/>` +
        `<rect x="45" y="24" width="10" height="56" rx="5" fill="#333"/>` +
        `<path d="M48 25 Q40 10 34 10 M52 25 Q60 10 66 10" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    ),
  },
  {
    key: 'pez',
    name: 'pez',
    svg: S(
      `<path d="M74 50 L94 32 L94 68 Z" fill="#FFAB19" stroke="#C47A00" stroke-width="2.5" stroke-linejoin="round"/>` +
        `<ellipse cx="46" cy="50" rx="34" ry="24" fill="#FFC94D" stroke="#C47A00" stroke-width="2.5"/>` +
        `<path d="M40 30 Q50 18 60 28" fill="#FFAB19" stroke="#C47A00" stroke-width="2"/>` +
        `<circle cx="28" cy="44" r="6" fill="#fff"/><circle cx="27" cy="45" r="3.2" fill="#222"/>` +
        `<path d="M14 56 Q20 60 24 56" stroke="#C47A00" stroke-width="2" fill="none"/>` +
        `<path d="M50 38 Q56 50 50 62 M60 38 Q66 50 60 62" stroke="#E89A1A" stroke-width="2" fill="none"/>`,
    ),
  },
];

export const BG_LIBRARY: LibraryItem[] = [
  {
    key: 'parque',
    name: 'parque',
    svg: B(
      `<rect width="480" height="360" fill="#BDE7FF"/><circle cx="410" cy="60" r="34" fill="#FFE66B"/>` +
        `<path d="M0 240 Q120 200 240 236 Q360 270 480 226 L480 360 L0 360 Z" fill="#7ED36A"/>` +
        `<path d="M0 290 Q160 260 300 292 Q400 312 480 290 L480 360 L0 360 Z" fill="#5BBE4B"/>` +
        `<circle cx="80" cy="300" r="6" fill="#FF7BAC"/><circle cx="140" cy="320" r="6" fill="#FFD23F"/><circle cx="360" cy="320" r="6" fill="#fff"/>`,
    ),
  },
  {
    key: 'playa',
    name: 'playa',
    svg: B(
      `<rect width="480" height="360" fill="#9FDCFF"/><circle cx="80" cy="70" r="36" fill="#FFD23F"/>` +
        `<rect y="170" width="480" height="90" fill="#3BA8E0"/>` +
        `<path d="M0 182 Q30 172 60 182 T120 182 T180 182 T240 182 T300 182 T360 182 T420 182 T480 182" stroke="#fff" stroke-width="4" fill="none"/>` +
        `<path d="M0 250 Q240 226 480 252 L480 360 L0 360 Z" fill="#F6DC9B"/>`,
    ),
  },
  {
    key: 'espacio',
    name: 'espacio',
    svg: B(
      `<rect width="480" height="360" fill="#1B1442"/>` +
        Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 97) % 480}" cy="${(i * 53) % 360}" r="${1 + (i % 3)}" fill="#fff" opacity="${0.5 + (i % 5) / 10}"/>`).join('') +
        `<circle cx="380" cy="90" r="44" fill="#FF9F5A"/><ellipse cx="380" cy="90" rx="70" ry="12" fill="none" stroke="#FFD23F" stroke-width="5"/>` +
        `<circle cx="80" cy="300" r="90" fill="#7C6CC4"/><circle cx="60" cy="270" r="14" fill="#6556A8"/><circle cx="110" cy="300" r="10" fill="#6556A8"/>`,
    ),
  },
  {
    key: 'ciudad',
    name: 'ciudad',
    svg: B(
      `<rect width="480" height="360" fill="#FFD9A8"/>` +
        `<rect x="20" y="120" width="80" height="200" fill="#6C8EBF"/><rect x="110" y="80" width="70" height="240" fill="#8E7CC3"/>` +
        `<rect x="190" y="150" width="90" height="170" fill="#E06666"/><rect x="290" y="100" width="70" height="220" fill="#76A5AF"/>` +
        `<rect x="370" y="140" width="90" height="180" fill="#F6B26B"/>` +
        Array.from({ length: 24 }, (_, i) => `<rect x="${32 + (i % 12) * 37}" y="${150 + Math.floor(i / 12) * 60}" width="14" height="18" fill="#FFF2B3"/>`).join('') +
        `<rect y="310" width="480" height="50" fill="#555"/><path d="M0 335 H480" stroke="#fff" stroke-width="4" stroke-dasharray="24 18"/>`,
    ),
  },
  {
    key: 'bosque',
    name: 'bosque',
    svg: B(
      `<rect width="480" height="360" fill="#D7F5D0"/><rect y="270" width="480" height="90" fill="#7BB661"/>` +
        [30, 120, 210, 300, 390].map((x, i) => `<rect x="${x + 28}" y="${210 + (i % 2) * 10}" width="16" height="70" fill="#8B5A2B"/><path d="M${x} ${230 + (i % 2) * 10} L${x + 36} ${110 + (i % 2) * 20} L${x + 72} ${230 + (i % 2) * 10} Z" fill="#2F8A38"/>`).join(''),
    ),
  },
  {
    key: 'mar',
    name: 'fondo del mar',
    svg: B(
      `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4FC3F7"/><stop offset="1" stop-color="#0D47A1"/></linearGradient></defs>` +
        `<rect width="480" height="360" fill="url(#g)"/><path d="M0 320 Q120 300 240 322 Q360 340 480 318 L480 360 L0 360 Z" fill="#F2D49B"/>` +
        `<path d="M60 330 Q50 280 70 250 Q60 290 80 330 Z M400 330 Q420 270 390 240 Q430 280 420 330 Z" fill="#2E9E5B"/>` +
        `<circle cx="200" cy="120" r="8" fill="none" stroke="#fff" opacity=".6" stroke-width="2"/><circle cx="214" cy="90" r="5" fill="none" stroke="#fff" opacity=".6" stroke-width="2"/>`,
    ),
  },
  {
    key: 'granja',
    name: 'granja',
    svg: B(
      `<rect width="480" height="360" fill="#CFEFFF"/><rect y="230" width="480" height="130" fill="#9BD16B"/>` +
        `<rect x="300" y="130" width="140" height="110" fill="#D64545"/><path d="M290 135 L370 70 L450 135 Z" fill="#8E2C2C"/>` +
        `<rect x="350" y="180" width="40" height="60" fill="#fff"/><path d="M350 180 L390 240 M390 180 L350 240" stroke="#D64545" stroke-width="4"/>` +
        `<path d="M0 260 H260" stroke="#C49A6C" stroke-width="6"/><path d="M0 285 H260" stroke="#C49A6C" stroke-width="6"/>` +
        [20, 70, 120, 170, 220].map((x) => `<rect x="${x}" y="245" width="8" height="55" fill="#C49A6C"/>`).join(''),
    ),
  },
  {
    key: 'habitacion',
    name: 'habitación',
    svg: B(
      `<rect width="480" height="360" fill="#FFF0D6"/><rect y="270" width="480" height="90" fill="#C98B5A"/>` +
        `<rect x="60" y="60" width="120" height="90" fill="#9FDCFF" stroke="#fff" stroke-width="8"/><path d="M120 60 V150 M60 105 H180" stroke="#fff" stroke-width="6"/>` +
        `<rect x="280" y="190" width="160" height="80" rx="10" fill="#9966FF"/><rect x="280" y="170" width="40" height="40" rx="8" fill="#FFD23F"/>` +
        `<circle cx="380" cy="80" r="26" fill="#FFAB19"/><path d="M380 106 V130" stroke="#555" stroke-width="3"/>`,
    ),
  },
];

export const EMPTY_BG = B(`<rect width="480" height="360" fill="#FFFFFF"/>`);

export function spriteByKey(key: string): LibraryItem {
  return SPRITE_LIBRARY.find((s) => s.key === key) ?? SPRITE_LIBRARY[0];
}

export function bgByKey(key: string): LibraryItem {
  return BG_LIBRARY.find((s) => s.key === key) ?? BG_LIBRARY[0];
}

export function svgToDataUrl(svg: string): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

const imageCache = new Map<string, HTMLImageElement>();

/** Devuelve una imagen (cacheada) para un SVG. Puede no estar cargada todavía. */
export function svgImage(svg: string): HTMLImageElement {
  let img = imageCache.get(svg);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.src = svgToDataUrl(svg);
    imageCache.set(svg, img);
    if (imageCache.size > 200) {
      const first = imageCache.keys().next().value;
      if (first !== undefined) imageCache.delete(first);
    }
  }
  return img;
}
