import { VOX } from '../data/assets';

interface MusicStyle {
  n: string;
  bpm: [number, number];
  sc: number[];
  ch: number[];
  ld: OscillatorType;
  bs: OscillatorType;
  k: number[];
  s: number[];
  h: number[];
  b: number[];
  op: number;
  pr: number;
}

type DestinationNode = AudioNode & { _f?: Record<number, BiquadFilterNode> };

const STY: MusicStyle[] = [
  { n: 'pop', bpm: [118, 128], sc: [0, 2, 4, 7, 9], ch: [0, 5, 7, 5], ld: 'square', bs: 'triangle', k: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], s: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], h: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], b: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0], op: 0, pr: 1 },
  { n: 'funk', bpm: [98, 108], sc: [0, 3, 5, 7, 10], ch: [0, 0, 5, 7], ld: 'sawtooth', bs: 'sawtooth', k: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0], s: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], h: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], b: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0], op: 0, pr: 0.75 },
  { n: 'latino', bpm: [104, 116], sc: [0, 2, 4, 7, 9], ch: [0, 7, 5, 7], ld: 'triangle', bs: 'triangle', k: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0], s: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0], h: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], b: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0], op: 0, pr: 0.9 },
  { n: 'disco', bpm: [120, 128], sc: [0, 2, 3, 7, 9], ch: [0, 3, 5, 7], ld: 'sawtooth', bs: 'triangle', k: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], s: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], h: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], b: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], op: 1, pr: 0.85 },
  { n: 'surf', bpm: [132, 146], sc: [0, 3, 5, 7, 10], ch: [0, 3, 5, 7], ld: 'square', bs: 'sawtooth', k: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0], s: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], h: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], b: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], op: 0, pr: 0.9 },
];

const SIL = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

let AC: AudioContext | null = null;
let MG: GainNode | null = null;
let bus: GainNode | null = null;
let tmr: ReturnType<typeof setInterval> | null = null;
let NB: AudioBuffer | null = null;
let UA: HTMLAudioElement | null = null;
let VO: SpeechSynthesisVoice[] = [];
let lastSty = -1;
let muted = false;
let webAudioUnlocked = false;

const VB: Record<string, AudioBuffer> = {};
const VS: AudioBufferSourceNode[] = [];
let VL = 0;

function loadVoices() {
  try {
    VO = window.speechSynthesis ? window.speechSynthesis.getVoices() || [] : [];
  } catch {
    VO = [];
  }
}
loadVoices();
try {
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
} catch {
  // Ignore
}

export function ac(): AudioContext {
  if (!AC) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    try {
      AC = new AudioCtx({ latencyHint: 'playback' });
    } catch {
      AC = new AudioCtx();
    }
    MG = AC.createGain();
    MG.connect(AC.destination);
  }
  if (AC.state === 'suspended') {
    AC.resume().catch(() => {});
  }
  if (MG) {
    MG.gain.value = muted ? 0 : 1;
  }
  return AC;
}

export function ensureAudioRunning() {
  try {
    const ctx = ac();
    if (!webAudioUnlocked && ctx.state === 'running') {
      webAudioUnlocked = true;
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    }
  } catch {
    // Ignore
  }
}

function tn(
  f: number,
  d: number,
  ty: OscillatorType = 'sine',
  v = 0.15,
  at = 0,
  b?: AudioNode | null
) {
  try {
    const c = ac();
    const o = c.createOscillator();
    const g = c.createGain();
    const s = c.currentTime + at;
    o.type = ty;
    o.frequency.setValueAtTime(f, s);
    g.gain.setValueAtTime(v, s);
    g.gain.exponentialRampToValueAtTime(0.001, s + d);
    o.connect(g);
    if (b || MG) {
      g.connect((b || MG)!);
    }
    o.start(s);
    o.stop(s + d + 0.02);
  } catch {
    // Ignore audio context errors
  }
}

function nz(d: number, v: number, at: number, hp: number, b?: AudioNode | null) {
  try {
    const c = ac();
    const dst = (b || MG) as DestinationNode | null;
    if (!dst) return;
    if (!NB) {
      NB = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const a = NB.getChannelData(0);
      for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
    }
    dst._f = dst._f || {};
    let f = dst._f[hp];
    if (!f) {
      f = c.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = hp;
      f.connect(dst);
      dst._f[hp] = f;
    }
    const s = c.createBufferSource();
    const g = c.createGain();
    const t = c.currentTime + at;
    s.buffer = NB;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    s.connect(g);
    g.connect(f);
    s.start(t);
    s.stop(t + d + 0.05);
  } catch {
    // Ignore
  }
}

export function musicStart(isLite = false) {
  musicStop();
  const c = ac();
  bus = c.createGain();
  if (MG) bus.connect(MG);
  let x: number;
  do {
    x = Math.floor(Math.random() * STY.length);
  } while (x === lastSty);
  lastSty = x;

  const S = STY[x];
  const key = Math.floor(Math.random() * 7);
  const bpm = S.bpm[0] + Math.random() * (S.bpm[1] - S.bpm[0]);
  const sd = 60 / bpm / 4;
  const mel = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10));
  let s = 0;
  let nx = c.currentTime + 0.05;
  const lookAhead = isLite ? 0.75 : 0.9;
  const tickMs = isLite ? 220 : 120;

  tmr = setInterval(() => {
    if (nx < c.currentTime) {
      nx = c.currentTime + 0.02;
    }
    while (nx < c.currentTime + lookAhead) {
      const at = nx - c.currentTime;
      const b = s % 16;
      const r = S.ch[(s >> 4) % 4];
      const f0 = 65.4 * Math.pow(2, (key + r) / 12);

      if (S.k[b]) tn(120, 0.16, 'sine', 0.5, at, bus);
      if (S.s[b]) {
        nz(0.12, 0.28, at, 1500, bus);
        tn(190, 0.08, 'triangle', 0.18, at, bus);
      }
      if (S.h[b] && (!isLite || b % 4 === 2 || S.op)) {
        nz(S.op && b % 4 === 2 ? 0.14 : 0.04, 0.1, at, 7500, bus);
      }
      if (S.b[b]) tn(f0, 0.22, S.bs, 0.36, at, bus);
      if (b % 2 === 0) {
        const k = (b / 2) % 8;
        if (Math.random() < 0.15) mel[k] = Math.floor(Math.random() * 10);
        if (Math.random() < S.pr) {
          const i = mel[k];
          tn(
            261.6 * Math.pow(2, (key + S.sc[i % 5] + (i > 4 ? 12 : 0) + r) / 12),
            sd * 3,
            S.ld,
            0.07,
            at,
            bus
          );
        }
      }
      if (b === 15) {
        for (let m = 0; m < 2; m++) mel[Math.floor(Math.random() * 8)] = Math.floor(Math.random() * 10);
      }
      nx += sd;
      s++;
    }
  }, tickMs);
}

export function musicStop() {
  if (tmr !== null) {
    clearInterval(tmr);
    tmr = null;
  }
  if (bus) {
    try {
      bus.gain.cancelScheduledValues(0);
      bus.gain.value = 0;
      bus.disconnect();
    } catch {
      // Ignore
    }
    bus = null;
  }
}

export const SFX = {
  pop: () => tn(660, 0.1, 'triangle'),
  start: () => [523, 659, 784, 1047].forEach((f, i) => tn(f, 0.2, 'triangle', 0.15, i * 0.09)),
  stat: () => {
    nz(0.7, 0.5, 0, 2500);
    tn(900, 0.25, 'square', 0.12);
    tn(450, 0.4, 'square', 0.12, 0.12);
    tn(220, 0.5, 'sawtooth', 0.1, 0.3);
  },
  tick: () => tn(1000, 0.07, 'square', 0.07),
  out: () => [392, 330, 262].forEach((f, i) => tn(f, 0.25, 'sawtooth', 0.08, i * 0.15)),
  ok: () => {
    tn(523, 0.12, 'triangle');
    tn(784, 0.2, 'triangle', 0.15, 0.1);
  },
  win: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tn(f, 0.3, 'triangle', 0.15, i * 0.13)),
};

export function unlockAudio() {
  ensureAudioRunning();
  try {
    if (!UA) {
      UA = new Audio();
      UA.src = SIL;
      const p = UA.play();
      if (p && p.catch) p.catch(() => {});
    }
  } catch {
    // Ignore
  }
}

function webTts(t: string) {
  try {
    if (!UA) UA = new Audio();
    UA.src = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=es&q=' + encodeURIComponent(t);
    const p = UA.play();
    if (p && p.catch) p.catch(() => {});
  } catch {
    // Ignore
  }
}

export function say(t: string) {
  if (muted) return;
  let ok = false;
  try {
    if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      const v = VO.find((item) => /^es/i.test(item.lang)) || null;
      u.lang = 'es-ES';
      if (v) u.voice = v;
      u.rate = 1;
      u.pitch = 1.2;
      u.onstart = () => {
        ok = true;
      };
      u.onerror = () => {
        if (!ok) {
          ok = true;
          webTts(t);
        }
      };
      window.speechSynthesis.speak(u);
      setTimeout(() => {
        if (!ok) {
          ok = true;
          try {
            window.speechSynthesis.cancel();
          } catch {
            // Ignore
          }
          webTts(t);
        }
      }, 2500);
      return;
    }
  } catch {
    // Fall back to webTts
  }
  webTts(t);
}

export function toggleMute(): boolean {
  muted = !muted;
  if (MG) MG.gain.value = muted ? 0 : 1;
  return muted;
}

export function isMuted(): boolean {
  return muted;
}

function decodeBase64Sync(b64: string): ArrayBuffer {
  const b = atob(b64);
  const n = b.length;
  const u = new Uint8Array(n);
  for (let i = 0; i < n; i++) u[i] = b.charCodeAt(i);
  return u.buffer;
}

async function vdec(k: string): Promise<void> {
  if (VB[k]) return;
  try {
    const ctx = ac();
    let buf: ArrayBuffer;
    if (typeof fetch === 'function') {
      try {
        const resp = await fetch(`data:audio/mpeg;base64,${VOX[k]}`);
        buf = await resp.arrayBuffer();
      } catch {
        buf = decodeBase64Sync(VOX[k]);
      }
    } else {
      buf = decodeBase64Sync(VOX[k]);
    }
    await new Promise<void>((resolve) => {
      const ok = (decoded: AudioBuffer) => {
        VB[k] = decoded;
        resolve();
      };
      const ko = () => resolve();
      const p = ctx.decodeAudioData(buf, ok, ko);
      if (p && typeof p.catch === 'function') p.catch(ko);
    });
  } catch {
    // Ignore decode error and let fallback TTS handle it
  }
}

function scheduleNextDecode(fn: () => void) {
  const ric = (
    window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }
  ).requestIdleCallback;
  if (ric) {
    ric(fn, { timeout: 200 });
  } else {
    setTimeout(fn, 80);
  }
}

export function voxLoad() {
  if (VL) return;
  VL = 1;
  const priority = ['pr', 'mu', 'stop', 'ju', 'fe', 'em'];
  const ks = priority
    .filter((k) => Boolean(VOX[k]))
    .concat(Object.keys(VOX).filter((k) => !priority.includes(k)));
  let i = 0;

  function nx() {
    if (i >= ks.length) return;
    const k = ks[i++];
    vdec(k).finally(() => {
      scheduleNextDecode(nx);
    });
  }
  scheduleNextDecode(nx);
}

function vp(k: string, at = 0) {
  try {
    const c = ac();
    const s = c.createBufferSource();
    s.buffer = VB[k];
    if (MG) s.connect(MG);
    s.start(c.currentTime + at);
    VS.push(s);
    s.onended = () => {
      const j = VS.indexOf(s);
      if (j >= 0) VS.splice(j, 1);
    };
  } catch {
    // Ignore
  }
}

export function vstop() {
  while (VS.length) {
    try {
      VS.pop()?.stop(0);
    } catch {
      // Ignore
    }
  }
}

export function vsay(ks: string[], tx: string | null = null, dl = 0, re = false) {
  if (muted) return;
  let t = dl;
  for (let i = 0; i < ks.length; i++) {
    if (!VB[ks[i]]) {
      if (VL && !re && Object.keys(VB).length < Object.keys(VOX).length) {
        setTimeout(() => vsay(ks, tx, 0, true), 500 + dl * 1000);
      } else if (tx) {
        setTimeout(() => say(tx), dl * 1000 + 100);
      }
      return;
    }
  }
  for (let i = 0; i < ks.length; i++) {
    vp(ks[i], t);
    t += VB[ks[i]].duration + 0.12;
  }
}

export function refreshVoices() {
  try {
    window.speechSynthesis?.getVoices();
  } catch {
    // Ignore
  }
}
