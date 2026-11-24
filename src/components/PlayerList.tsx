import { memo } from 'react';
import { AVS } from '../data/challenges';
import type { GameMode, GamePhase, Player } from '../types/game';

interface PlayerListProps {
  players: Player[];
  mode: GameMode;
  phase: GamePhase;
  onToggleMoved: (index: number) => void;
}

export const PlayerList = memo(function PlayerList({
  players,
  mode,
  phase,
  onToggleMoved,
}: PlayerListProps) {
  const isJudging = phase === 'statue' || phase === 'judge';
  const isTeams = mode === 'eq';

  return (
    <div className={`col ${players.length > 6 ? 'col-dense' : ''}`}>
      {players.map((p, i) => (
        <div
          key={i}
          tabIndex={0}
          role="button"
          className={`pc ${p.mv && isJudging ? 'mv' : ''} ${
            isTeams ? (p.t === 0 ? 'team-pink' : 'team-blue') : ''
          }`}
          onClick={() => onToggleMoved(i)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleMoved(i);
            }
          }}
        >
          <span className="av av-sm">{AVS[i]}</span>
          <div>
            <b>{p.n}</b>
            <small>
              ⭐ {p.pts} punto{p.pts === 1 ? '' : 's'}
              {isJudging ? (p.mv ? ' · 😅 se movió: sin punto' : ' · ✅ +1') : ''}
            </small>
          </div>
          <span className="k">{i + 1}</span>
        </div>
      ))}
    </div>
  );
});
