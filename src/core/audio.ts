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
  if (m) stopAllSounds();
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
