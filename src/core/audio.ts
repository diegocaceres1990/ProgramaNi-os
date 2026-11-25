// Sonidos sintetizados (pop, clic, éxito) y grabación con micrófono.

let ctx: AudioContext | null = null;
let muted = localStorage.getItem('aj-muted') === '1';
const playing = new Set<AudioBufferSourceNode>();
const bufferCache = new WeakMap<Blob, Promise<AudioBuffer>>();

function ac(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function isMuted(): boolean { return muted; }

export function setMuted(m: boolean): void {
  muted = m;
  localStorage.setItem('aj-muted', m ? '1' : '0');
  if (m) { stopAllSounds(); stopSpeaking(); }
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0): void {
  if (muted) return;
  const a = ac();
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** Sonido "pop" del bloque verde. */
export function pop(): void { tone(500, 0.14, 'sine', 0.5, 1400); }
/** Clic del imán al encajar bloques. */
export function click(): void { tone(1800, 0.04, 'square', 0.12, 900); }
/** Toque genérico de interfaz. */
export function tap(): void { tone(700, 0.06, 'triangle', 0.18, 900); }
/** Sonido de borrar. */
export function trash(): void { tone(400, 0.18, 'sawtooth', 0.12, 120); }
/** Fanfarria de éxito. */
export function success(): void {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.25, undefined, i * 0.12));
}
/** Error suave. */
export function oops(): void { tone(330, 0.2, 'triangle', 0.2, 220); }

async function decode(blob: Blob): Promise<AudioBuffer> {
  let p = bufferCache.get(blob);
  if (!p) {
    p = blob.arrayBuffer().then((buf) => ac().decodeAudioData(buf));
    bufferCache.set(blob, p);
  }
  return p;
}

/** Reproduce una grabación. Resuelve cuando termina (o enseguida si hay error/silencio). */
export async function playBlob(blob: Blob): Promise<void> {
  if (muted) return;
  try {
    const buf = await decode(blob);
    const a = ac();
    const src = a.createBufferSource();
    src.buffer = buf;
    src.connect(a.destination);
    playing.add(src);
    await new Promise<void>((resolve) => {
      src.onended = () => { playing.delete(src); resolve(); };
      src.start();
    });
  } catch {
    /* grabación ilegible: se ignora */
  }
}

export function stopAllSounds(): void {
  for (const s of playing) {
    try { s.stop(); } catch { /* ya parado */ }
  }
  playing.clear();
}

export interface Recording {
  /** Detiene la grabación y devuelve el audio. */
  stop(): Promise<Blob>;
  /** Nivel de entrada 0..1 para dibujar un vúmetro. */
  level(): number;
  /** Se resuelve cuando la grabación termina (manual o por tiempo). */
  done: Promise<Blob>;
}

/** Graba del micrófono hasta maxSec segundos. */
export async function startRecording(maxSec = 10): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const a = ac();
  const source = a.createMediaStreamSource(stream);
  const analyser = a.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);
  const rec = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise<Blob>((resolve) => {
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      source.disconnect();
      resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
    };
  });
  rec.start();
  const timer = window.setTimeout(() => { if (rec.state !== 'inactive') rec.stop(); }, maxSec * 1000);
  return {
    stop() {
      window.clearTimeout(timer);
      if (rec.state !== 'inactive') rec.stop();
      return done;
    },
    level() {
      analyser.getByteTimeDomainData(data);
      let max = 0;
      for (const v of data) max = Math.max(max, Math.abs(v - 128));
      return Math.min(1, max / 64);
    },
    done,
  };
}

// ---------------------------------------------------------------- lectura en voz alta

const synth: SpeechSynthesis | null = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
let readAloud = localStorage.getItem('aj-voz') !== '0';
let chosen: SpeechSynthesisVoice | null = null;

/** ¿Se leen los textos automáticamente al aparecer? (por defecto sí) */
export function isReadAloud(): boolean { return readAloud; }

export function setReadAloud(on: boolean): void {
  readAloud = on;
  localStorage.setItem('aj-voz', on ? '1' : '0');
  if (!on) stopSpeaking();
}

/**
 * Elige la voz en español más natural disponible:
 * 1) voces neuronales «Natural» (Edge), 2) voces de Google en línea (Chrome),
 * 3) otras voces en línea, 4) cualquier voz local en español (reserva sin internet).
 */
export function pickVoice(): SpeechSynthesisVoice | null {
  if (!synth) return null;
  const es = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith('es'));
  if (!es.length) return null;
  const score = (v: SpeechSynthesisVoice) => {
    const n = v.name.toLowerCase();
    let s = 0;
    if (n.includes('natural')) s += 100;
    if (n.includes('google')) s += 80;
    if (!v.localService) s += 30;
    if (n.includes('online')) s += 20;
    if (/es[-_](es|us|mx|419)/i.test(v.lang)) s += 5;
    if (/es[-_]es/i.test(v.lang)) s += 2;
    return s;
  };
  return [...es].sort((a, b) => score(b) - score(a))[0];
}

function refreshVoice(): void { chosen = pickVoice(); }
if (synth) {
  refreshVoice();
  synth.addEventListener?.('voiceschanged', refreshVoice);
}

/** Nombre de la voz que se está usando (para el panel de padres). */
export function voiceName(): string {
  refreshVoice();
  return chosen ? `${chosen.name} (${chosen.localService ? 'en este equipo' : 'por internet'})` : 'ninguna voz en español';
}

/** Quita emojis y símbolos para que la voz no los lea («flecha a la derecha», «estrella»…). */
export function speakable(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}\u{1F1E6}-\u{1F1FF}]/gu, ' ')
    .replace(/[↻↺◀▶✓✕✔✖#⏺⏹⏳♾]/g, ' ')
    .replace(/[«»"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Lee un texto en voz alta (corta lo que se estuviera diciendo). Respeta el botón de silencio. */
export function speak(text: string): void {
  if (!synth || muted) return;
  const clean = speakable(text);
  if (!clean) return;
  synth.cancel();
  if (!chosen) refreshVoice();
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = chosen?.lang ?? 'es-ES';
  if (chosen) u.voice = chosen;
  u.rate = 0.95;
  u.pitch = 1.05;
  // las voces en línea a veces fallan sin red: se reintenta una vez con una voz local
  u.onerror = (e) => {
    if (e.error === 'interrupted' || e.error === 'canceled' || !chosen || chosen.localService) return;
    const local = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('es') && v.localService);
    if (!local) return;
    const r = new SpeechSynthesisUtterance(clean);
    r.voice = local; r.lang = local.lang; r.rate = 0.95;
    synth.speak(r);
  };
  synth.speak(u);
}

/** Lee solo si la lectura automática está activada. */
export function autoSpeak(text: string): void {
  if (readAloud) speak(text);
}

export function stopSpeaking(): void {
  synth?.cancel();
}
