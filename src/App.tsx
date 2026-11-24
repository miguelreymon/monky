import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ac,
  ensureAudioRunning,
  musicStart,
  musicStop,
  SFX,
  toggleMute,
  unlockAudio,
  voxLoad,
  vsay,
  vstop,
} from './audio/soundEngine';
import { FinalPodium } from './components/FinalPodium';
import { GameStage } from './components/GameStage';
import { SetupScreen } from './components/SetupScreen';
import { CH, shuffle } from './data/challenges';
import { getSprites } from './data/sprites';
import type { GameMode, GamePhase, GameState, Player } from './types/game';
import {
  focusDefaultSceneControl,
  moveSpatialFocus,
  type NavDirection,
} from './utils/tvNavigation';

const INITIAL_PLAYERS: Player[] = [
  { n: 'Jugador 1', t: 0, pts: 0, mv: false },
  { n: 'Jugador 2', t: 1, pts: 0, mv: false },
  { n: 'Jugador 3', t: 0, pts: 0, mv: false },
];

const INITIAL_STATE: GameState = {
  players: INITIAL_PLAYERS,
  mode: 'ind',
  rounds: 5,
  autoNext: true,
  nx: null,
  ph: 'setup',
  round: 0,
  deck: [],
  ch: null,
  hold: 0,
};

function detectInitialLite(): boolean {
  try {
    const q = window.location.search;
    return (
      /lite=1/.test(q) ||
      (!/lite=0/.test(q) &&
        (/smart-?tv|tizen|web0s|webos|netcast|hbbtv|vidaa|bravia|googletv|android tv|crkey|aft[a-z]|hisense|viera|sonydtv|roku/i.test(
          navigator.userAgent
        ) ||
          localStorage.getItem('ml') === '1'))
    );
  } catch {
    return false;
  }
}

function spawnConfetti(isLite: boolean) {
  const count = isLite ? 16 : 34;
  const colors = ['#ffd23f', '#c9b3ff', '#b8f0c0', '#ff8fa3', '#9ad0ff'];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('i');
    el.className = 'cf';
    el.style.cssText = `left:${Math.random() * 100}vw;background:${colors[i % 5]};animation-duration:${
      2 + Math.random() * 2.5
    }s;animation-delay:${Math.random()}s;border-radius:${i % 3 ? '3px' : '50%'}`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 6000);
  }
}

function padText(x: string | number, n: number): string {
  let s = String(x);
  while (s.length < n) s += ' ';
  return s;
}

function deferAudio(fn: () => void) {
  setTimeout(fn, 0);
}

export default function App() {
  const sprites = useMemo(() => getSprites(), []);
  const [game, setGame] = useState<GameState>(INITIAL_STATE);
  const [muted, setMuted] = useState(false);
  const [isLite, setIsLite] = useState<boolean>(detectInitialLite);
  const [showFps, setShowFps] = useState<boolean>(() =>
    /[?&]fps=1/.test(window.location.search)
  );
  const [fpsText, setFpsText] = useState('');

  const stageRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef(game);
  gameRef.current = game;
  const liteRef = useRef(isLite);
  liteRef.current = isLite;

  const danceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastDanceRef = useRef(0);
  const probedStartupRef = useRef(false);
  const probedDanceRef = useRef(false);
  const usedKeyboardNavRef = useRef(false);

  const applyLite = useCallback((v: boolean) => {
    setIsLite(v);
    document.documentElement.className = v ? 'lite' : '';
    try {
      localStorage.setItem('ml', v ? '1' : '0');
    } catch {
      // Ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (isLite) {
      document.documentElement.className = 'lite';
    }
  }, [isLite]);

  // Responsive 1920x1080 stage scaling
  useEffect(() => {
    function fit() {
      if (!stageRef.current) return;
      const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      stageRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
    }
    window.addEventListener('resize', fit);
    fit();
    return () => window.removeEventListener('resize', fit);
  }, []);

  // Pre-unlock Web Audio and start idle voice decoding on user interaction
  useEffect(() => {
    function preUnlock() {
      try {
        ac();
        ensureAudioRunning();
        voxLoad();
      } catch {
        // Ignore
      }
    }
    document.addEventListener('pointerdown', preUnlock, { passive: true });
    document.addEventListener('click', preUnlock, { passive: true });
    document.addEventListener('touchend', preUnlock, { passive: true });
    document.addEventListener('keydown', preUnlock);
    return () => {
      document.removeEventListener('pointerdown', preUnlock);
      document.removeEventListener('click', preUnlock);
      document.removeEventListener('touchend', preUnlock);
      document.removeEventListener('keydown', preUnlock);
    };
  }, []);

  // Performance probe (automatically activates LITE mode when FPS < 30 or frame delta > 26-33ms)
  const runProbe = useCallback(
    (thresholdMs: number, frames: number) => {
      if (
        liteRef.current ||
        !window.requestAnimationFrame ||
        /lite=0/.test(window.location.search)
      ) {
        return;
      }
      const diffs: number[] = [];
      let last = 0;
      let count = 0;
      function step(t: number) {
        if (last) diffs.push(t - last);
        last = t;
        if (++count < frames) {
          requestAnimationFrame(step);
        } else {
          diffs.sort((a, b) => a - b);
          if ((diffs[diffs.length >> 1] || 16) > thresholdMs) {
            applyLite(true);
          }
        }
      }
      requestAnimationFrame(step);
    },
    [applyLite]
  );

  // Startup probe to catch slow TV browsers right in the menu
  useEffect(() => {
    if (probedStartupRef.current) return;
    probedStartupRef.current = true;
    const t = setTimeout(() => runProbe(33, 45), 400);
    return () => clearTimeout(t);
  }, [runProbe]);

  // Clean up timers and audio on unmount
  useEffect(() => {
    return () => {
      if (danceTimerRef.current !== null) clearTimeout(danceTimerRef.current);
      if (countdownTimerRef.current !== null) clearInterval(countdownTimerRef.current);
      musicStop();
      vstop();
    };
  }, []);

  // Maintain valid focus for TV remote users when switching screens/phases
  useEffect(() => {
    const active = document.activeElement as HTMLElement | null;
    const lostInHiddenScene = Boolean(active && active.closest('[inert]'));
    if (usedKeyboardNavRef.current || lostInHiddenScene) {
      const raf = requestAnimationFrame(() => focusDefaultSceneControl());
      return () => cancelAnimationFrame(raf);
    }
  }, [game.ph]);

  const clearTimers = useCallback(() => {
    if (danceTimerRef.current !== null) {
      clearTimeout(danceTimerRef.current);
      danceTimerRef.current = null;
    }
    if (countdownTimerRef.current !== null) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const getDanceMs = useCallback(() => {
    let d: number;
    do {
      const r = Math.random();
      d =
        r < 0.25
          ? 3000 + Math.random() * 3000
          : r < 0.7
            ? 7000 + Math.random() * 5000
            : 13000 + Math.random() * 9000;
    } while (Math.abs(d - lastDanceRef.current) < 3000);
    lastDanceRef.current = d;
    return d;
  }, []);

  const tieNow = useCallback((state: GameState) => {
    const scores =
      state.mode === 'eq'
        ? [0, 1].map((t) =>
            state.players.filter((p) => p.t === t).reduce((a, p) => a + p.pts, 0)
          )
        : state.players.map((p) => p.pts);
    scores.sort((a, b) => b - a);
    return scores.length > 1 && scores[0] === scores[1];
  }, []);

  const startDanceRef = useRef<() => void>(() => {});

  const handleNext = useCallback(() => {
    const cur = gameRef.current;
    if (cur.ph !== 'judge' && cur.ph !== 'statue') return;
    if (countdownTimerRef.current !== null) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    vstop();
    if (cur.round >= cur.rounds) {
      const finalState: GameState = { ...cur, nx: null, ph: 'final' };
      setGame(finalState);
      deferAudio(() => {
        SFX.win();
        vsay([tieNow(finalState) ? 'em' : 'fe'], null, 0.8);
      });
      setTimeout(() => spawnConfetti(liteRef.current), 60);
    } else if (cur.autoNext) {
      setGame((prev) => ({ ...prev, round: prev.round + 1, nx: null }));
      setTimeout(() => startDanceRef.current(), 0);
    } else {
      setGame((prev) => ({
        ...prev,
        round: prev.round + 1,
        nx: null,
        ph: 'ready',
      }));
      deferAudio(() => {
        SFX.start();
        vsay(['pr'], null, 0.55);
      });
    }
  }, [tieNow]);

  const handleFreeze = useCallback(() => {
    clearTimers();
    musicStop();

    const cur = gameRef.current;
    const nextDeck = cur.deck.length ? [...cur.deck] : shuffle(CH);
    const ch = nextDeck.pop()!;

    setGame((prev) => ({
      ...prev,
      deck: nextDeck,
      ch,
      players: prev.players.map((p) => ({ ...p, mv: false, pts: p.pts + 1 })),
      ph: 'statue',
      hold: 8,
    }));

    vstop();
    deferAudio(() => {
      SFX.stat();
      vsay(['stop', `p${ch.i}`], `¡Stop! ${ch.t}`, 0.12);
    });

    countdownTimerRef.current = setInterval(() => {
      const latest = gameRef.current;
      if (latest.ph === 'statue') {
        const nextHold = latest.hold - 1;
        if (nextHold <= 3 && nextHold > 0) SFX.tick();
        if (nextHold <= 0) {
          setGame((prev) => ({
            ...prev,
            hold: 0,
            ph: 'judge',
            nx: prev.autoNext ? 7 : null,
          }));
          deferAudio(() => {
            SFX.ok();
            vsay(['ju'], null, 0.1);
          });
        } else {
          setGame((prev) => ({ ...prev, hold: nextHold }));
        }
      } else if (latest.nx !== null) {
        const nextNx = latest.nx - 1;
        if (nextNx <= 0) {
          handleNext();
          return;
        }
        if (nextNx <= 2) SFX.tick();
        setGame((prev) => ({ ...prev, nx: nextNx }));
      }
    }, 1000);
  }, [clearTimers, handleNext]);

  const handleStartDance = useCallback(() => {
    clearTimers();
    vstop();
    ac();
    setGame((prev) => ({
      ...prev,
      nx: null,
      ph: 'dance',
      players: prev.players.map((p) => ({ ...p, mv: false })),
    }));
    deferAudio(() => {
      musicStart(liteRef.current);
      SFX.pop();
      vsay(['mu'], null, 0.05);
    });
    if (!probedDanceRef.current) {
      probedDanceRef.current = true;
      runProbe(26, 90);
    }
    danceTimerRef.current = setTimeout(handleFreeze, getDanceMs());
  }, [clearTimers, getDanceMs, handleFreeze, runProbe]);

  startDanceRef.current = handleStartDance;

  const handleStartGame = useCallback(() => {
    ac();
    unlockAudio();
    voxLoad();
    setGame((prev) => ({
      ...prev,
      players: prev.players.map((p, i) => ({
        ...p,
        pts: 0,
        mv: false,
        n: p.n.trim() ? p.n : `Jugador ${i + 1}`,
      })),
      deck: shuffle(CH),
      round: 1,
      nx: null,
      ph: 'ready',
    }));
    deferAudio(() => {
      SFX.start();
      vsay(['pr'], null, 0.55);
    });
  }, []);

  const handleAgain = useCallback(() => {
    clearTimers();
    musicStop();
    vstop();
    setGame((prev) => ({ ...prev, ph: 'setup', nx: null }));
  }, [clearTimers]);

  const handleToggleMoved = useCallback((index: number) => {
    const cur = gameRef.current;
    if (cur.ph !== 'statue' && cur.ph !== 'judge') return;
    const target = cur.players[index];
    if (!target) return;
    const nextMv = !target.mv;
    setGame((prev) => ({
      ...prev,
      players: prev.players.map((p, i) =>
        i === index ? { ...p, mv: nextMv, pts: p.pts + (nextMv ? -1 : 1) } : p
      ),
    }));
    deferAudio(() => {
      if (nextMv) SFX.out();
      else SFX.ok();
    });
  }, []);

  const handleUpdateName = useCallback((idx: number, name: string) => {
    setGame((prev) => ({
      ...prev,
      players: prev.players.map((p, i) => (i === idx ? { ...p, n: name } : p)),
    }));
  }, []);

  const handleToggleTeam = useCallback((idx: number) => {
    setGame((prev) => ({
      ...prev,
      players: prev.players.map((p, i) =>
        i === idx ? { ...p, t: p.t === 0 ? 1 : 0 } : p
      ),
    }));
    deferAudio(() => SFX.pop());
  }, []);

  const handleRemovePlayer = useCallback((idx: number) => {
    setGame((prev) => {
      if (prev.players.length <= 2) return prev;
      return {
        ...prev,
        players: prev.players.filter((_, i) => i !== idx),
      };
    });
    deferAudio(() => SFX.pop());
  }, []);

  const handleAddPlayer = useCallback(() => {
    setGame((prev) => {
      if (prev.players.length >= 8) return prev;
      return {
        ...prev,
        players: [
          ...prev.players,
          {
            n: `Jugador ${prev.players.length + 1}`,
            t: (prev.players.length % 2) as 0 | 1,
            pts: 0,
            mv: false,
          },
        ],
      };
    });
    deferAudio(() => SFX.pop());
  }, []);

  const handleSetMode = useCallback((m: GameMode) => {
    setGame((prev) => ({ ...prev, mode: m }));
    deferAudio(() => SFX.pop());
  }, []);

  const handleSetRounds = useCallback((n: number) => {
    setGame((prev) => ({ ...prev, rounds: n }));
    deferAudio(() => SFX.pop());
  }, []);

  const handleSetAutoNext = useCallback((v: boolean) => {
    setGame((prev) => ({ ...prev, autoNext: v }));
    deferAudio(() => SFX.pop());
  }, []);

  const handleCancelAutoNext = useCallback(() => {
    setGame((prev) => ({ ...prev, nx: null }));
    deferAudio(() => SFX.pop());
  }, []);

  const handleMute = useCallback(() => {
    const nextMuted = toggleMute();
    setMuted(nextMuted);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  // Track pointer usage so mouse/touch clicks don't force D-pad focus rings unless keys are used
  useEffect(() => {
    function onPointerDown() {
      usedKeyboardNavRef.current = false;
    }
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, []);

  // Keyboard & TV remote shortcuts: D-pad arrows, Enter/Space, 1-8, M, F/405
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;

      if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        usedKeyboardNavRef.current = true;
        if (moveSpatialFocus(e.key as NavDirection)) {
          e.preventDefault();
        }
        return;
      }

      if (target && target.tagName === 'INPUT') {
        if (e.key === 'Enter') {
          usedKeyboardNavRef.current = true;
          e.preventDefault();
          if (!moveSpatialFocus('ArrowDown')) {
            target.blur();
          }
        }
        return;
      }

      if (e.keyCode === 405 || (e.key && /^f$/i.test(e.key))) {
        setShowFps((prev) => !prev);
        return;
      }

      if (target && target.classList && target.classList.contains('pc')) {
        if (e.key === 'Enter' || e.key === ' ') {
          usedKeyboardNavRef.current = true;
          e.preventDefault();
          target.click();
        }
        return;
      }

      if (target && target.tagName === 'BUTTON') {
        if (e.key === 'Enter' || e.key === ' ') {
          usedKeyboardNavRef.current = true;
        }
        return;
      }

      if (e.key === ' ' || e.key === 'Enter') {
        usedKeyboardNavRef.current = true;
        e.preventDefault();
        const ph = gameRef.current.ph;
        if (ph === 'setup') handleStartGame();
        else if (ph === 'ready') handleStartDance();
        else if (ph === 'dance') handleFreeze();
        else if (ph === 'statue' || ph === 'judge') handleNext();
        else if (ph === 'final') handleAgain();
      } else if (/^[1-8]$/.test(e.key)) {
        handleToggleMoved(Number(e.key) - 1);
      } else if (/^m$/i.test(e.key)) {
        handleMute();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleAgain,
    handleFreeze,
    handleMute,
    handleNext,
    handleStartDance,
    handleStartGame,
    handleToggleMoved,
  ]);

  // Hidden FPS diagnostic loop (throttled in LITE mode to minimize timer overhead)
  useEffect(() => {
    if (!showFps) {
      setFpsText('');
      return;
    }
    let active = true;
    const stats: Record<string, { n: number; t: number; m: number; s: number }> = {};
    let last = 0;
    let w0 = 0;
    let wn = 0;
    let wm = 0;

    function tick(t: number) {
      if (!active) return;
      if (last) {
        const d = t - last;
        if (d < 1000) {
          const p = gameRef.current.ph;
          const q = stats[p] || (stats[p] = { n: 0, t: 0, m: 0, s: 0 });
          q.n++;
          q.t += d;
          if (d > q.m) q.m = d;
          if (d > 50) q.s++;
          wn++;
          if (d > wm) wm = d;
        }
      }
      last = t;
      if (!w0) w0 = t;
      const reportInterval = liteRef.current ? 1000 : 500;
      if (t - w0 >= reportInterval) {
        let tx =
          `AHORA ${Math.round((wn * 1000) / (t - w0))} fps · peor ${Math.round(wm)} ms\n` +
          `${padText('fase', 8)}${padText('fps', 6)}${padText('peor', 8)}>50ms\n`;
        const order: GamePhase[] = ['setup', 'ready', 'dance', 'statue', 'judge', 'final'];
        for (const k of order) {
          const z = stats[k];
          if (z) {
            tx += `${padText(k, 8)}${padText(Math.round((z.n * 1000) / z.t), 6)}${padText(
              `${Math.round(z.m)}ms`,
              8
            )}${z.s}\n`;
          }
        }
        tx += `${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio || 1} lite:${
          liteRef.current ? 1 : 0
        }`;
        setFpsText(tx);
        w0 = t;
        wn = 0;
        wm = 0;
      }
      requestAnimationFrame(tick);
    }

    const rafId = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(rafId);
    };
  }, [showFps]);

  const headText =
    game.ph === 'setup'
      ? '¡Baila, congélate y no te muevas!'
      : game.ph === 'final'
        ? '¡Fin de la partida!'
        : {
            ready: `Ronda ${game.round} de ${game.rounds} · ¡Preparaos!`,
            dance: '🎶 ¡A bailar sin parar!',
            statue: '¡Congelados! +1 punto para todos',
            judge: '👀 Jurado: tocad a quien se movió',
          }[game.ph];

  const isSetup = game.ph === 'setup';
  const isFinal = game.ph === 'final';
  const isPlay = !isSetup && !isFinal;

  return (
    <>
      <div className="bg-backdrop" aria-hidden="true" />
      <div id="st" ref={stageRef}>
        <div className="lg">
          <img src={sprites.l} alt="monkyplay" draggable={false} />
        </div>
        <div className="bub tb">
          <img src={sprites.c} alt="Mono Monkyplay" draggable={false} />
          <div>
            <h1>Monky Estatuas</h1>
            <p id="ht">{headText}</p>
          </div>
        </div>
        <div id="bd">
          {/* Keep all 3 scenes persistently mounted for 0ms scene switches on Smart TVs */}
          <div
            className={`scene ${isSetup ? 'scene-active' : 'scene-hidden'}`}
            inert={!isSetup}
          >
            <SetupScreen
              players={game.players}
              mode={game.mode}
              rounds={game.rounds}
              autoNext={game.autoNext}
              onUpdateName={handleUpdateName}
              onToggleTeam={handleToggleTeam}
              onRemovePlayer={handleRemovePlayer}
              onAddPlayer={handleAddPlayer}
              onSetMode={handleSetMode}
              onSetRounds={handleSetRounds}
              onSetAutoNext={handleSetAutoNext}
              onStart={handleStartGame}
            />
          </div>

          <div
            className={`scene ${isPlay ? 'scene-active' : 'scene-hidden'}`}
            inert={!isPlay}
          >
            <GameStage
              phase={game.ph}
              mode={game.mode}
              round={game.round}
              rounds={game.rounds}
              hold={game.hold}
              nx={game.nx}
              autoNext={game.autoNext}
              challenge={game.ch}
              players={game.players}
              sprites={sprites}
              isLite={isLite}
              onStartDance={handleStartDance}
              onFreeze={handleFreeze}
              onNext={handleNext}
              onCancelAutoNext={handleCancelAutoNext}
              onToggleMoved={handleToggleMoved}
            />
          </div>

          <div
            className={`scene ${isFinal ? 'scene-active' : 'scene-hidden'}`}
            inert={!isFinal}
          >
            <FinalPodium
              players={game.players}
              mode={game.mode}
              sprites={sprites}
              onPlayAgain={handleAgain}
            />
          </div>
        </div>
      </div>

      <div id="wm" aria-hidden="true">
        🐵🐼🦊🐸🦁🐯🐙🦄🗿🦩🙌🙀✈️🐒🩰⚽🦸😮🌳🏆🐔🤖❄️🎵🎶♪♫♬🩷💙👀✋➡⏸🔁🧍👥🔊🔇🔄🤝😅✅⭐▶✖＋
      </div>

      <button
        type="button"
        className="btn"
        id="mu"
        onClick={handleMute}
        aria-label="Silenciar sonido"
      >
        {muted ? '🔇' : '🔊'}
      </button>

      {showFps && fpsText && <pre id="fps-overlay">{fpsText}</pre>}
    </>
  );
}
