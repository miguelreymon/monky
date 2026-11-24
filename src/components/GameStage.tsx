import { memo } from 'react';
import type { SpriteKey } from '../data/assets';
import type { Challenge, GameMode, GamePhase, Player } from '../types/game';
import { PlayerList } from './PlayerList';

interface GameStageProps {
  phase: GamePhase;
  mode: GameMode;
  round: number;
  rounds: number;
  hold: number;
  nx: number | null;
  autoNext: boolean;
  challenge: Challenge | null;
  players: Player[];
  sprites: Record<SpriteKey, string>;
  isLite: boolean;
  onStartDance: () => void;
  onFreeze: () => void;
  onNext: () => void;
  onCancelAutoNext: () => void;
  onToggleMoved: (index: number) => void;
}

const NOTES = ['♪', '♫', '🎵', '🎶', '♬'] as const;

export const GameStage = memo(function GameStage({
  phase,
  mode,
  round,
  rounds,
  hold,
  nx,
  autoNext,
  challenge,
  players,
  sprites,
  isLite,
  onStartDance,
  onFreeze,
  onNext,
  onCancelAutoNext,
  onToggleMoved,
}: GameStageProps) {
  const tot = (team: 0 | 1) =>
    players.filter((p) => p.t === team).reduce((sum, p) => sum + p.pts, 0);

  const isFreezePhase = phase === 'statue' || phase === 'judge';
  const noteIndices = isLite ? [0, 1, 2] : [0, 1, 2, 3, 4];

  return (
    <>
      {mode === 'eq' ? (
        <div className="card rp rp-eq">
          🩷 {tot(0)} · 💙 {tot(1)}
        </div>
      ) : (
        <div className="card rp">
          Ronda {round}/{rounds}
        </div>
      )}

      {/* Keep both character sprites mounted so Smart TVs never re-decode WebP on freeze */}
      <div
        className={`stage-monkey ${phase === 'dance' ? 'dn' : ''} ${
          !isFreezePhase ? 'sprite-visible' : 'sprite-hidden'
        }`}
      >
        <img src={sprites.t} alt="Mono Monkyplay" draggable={false} />
      </div>

      <div
        className={`stage-ice ${isFreezePhase ? 'ice sprite-visible' : 'sprite-hidden'}`}
      >
        <img src={sprites.i} alt="Mono Monkyplay" draggable={false} />
      </div>

      {isFreezePhase && challenge ? (
        <>
          <div id="sk" className="sticker stage-sticker">
            {hold >= 8 && phase === 'statue' ? '¡STOP!' : '¡ESTATUA!'}
          </div>
          <div className="fl stage-flake-1">❄️</div>
          <div className="fl stage-flake-2">❄️</div>
          <div className="card stage-challenge">
            <div className="stage-challenge-emoji">{challenge.e}</div>
            <div className="stage-challenge-text">{challenge.t}</div>
          </div>
          <div
            id="cd"
            className={`card stage-cd ${
              phase === 'statue' || nx !== null ? 'stage-cd-big' : ''
            } ${hold <= 3 && phase === 'statue' ? 'stage-cd-red' : ''}`}
          >
            {phase === 'statue'
              ? hold
              : nx !== null
                ? `🎵 ${nx}`
                : '¡Podéis moveros!'}
          </div>
        </>
      ) : (
        <>
          {phase === 'dance' &&
            noteIndices.map((idx) => (
              <div
                key={idx}
                className={`nt ${isLite ? `nt-lite-${idx}` : `nt-${idx}`}`}
              >
                {NOTES[idx]}
              </div>
            ))}
          <div className="bub stage-bub">
            {phase === 'ready'
              ? 'Cuando todos estén listos… ¡música!'
              : '¡Baila! Nadie sabe cuándo parará…'}
          </div>
        </>
      )}

      <PlayerList
        players={players}
        mode={mode}
        phase={phase}
        onToggleMoved={onToggleMoved}
      />

      {phase === 'ready' && (
        <button
          type="button"
          className="btn stage-btn-ready"
          onClick={onStartDance}
        >
          🎵 EMPEZAR BAILE
        </button>
      )}

      {phase === 'dance' && (
        <button
          type="button"
          className="btn alt stage-btn-dance"
          onClick={onFreeze}
        >
          ✋ Parar ya
        </button>
      )}

      {isFreezePhase && (
        <>
          <button
            type="button"
            className="btn stage-btn-next"
            onClick={onNext}
          >
            {round >= rounds ? '🏆 VER PODIO' : '➡ SIGUIENTE RONDA'}
          </button>
          {phase === 'judge' && nx !== null && (
            <button
              type="button"
              className="btn alt stage-btn-wait"
              onClick={onCancelAutoNext}
            >
              ⏸ Esperar
            </button>
          )}
          <div className="stage-hint">
            Al parar, todos suman +1. Si alguien se mueve, tocadle (o pulsad su número 1-
            {players.length}) y no suma esta ronda. ¡Sin castigos!
            {autoNext ? ' La música vuelve sola.' : ''}
          </div>
        </>
      )}
    </>
  );
});
