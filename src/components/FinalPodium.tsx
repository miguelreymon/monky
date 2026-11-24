import { memo } from 'react';
import type { SpriteKey } from '../data/assets';
import { AVS, TN } from '../data/challenges';
import type { GameMode, Player } from '../types/game';

interface FinalPodiumProps {
  players: Player[];
  mode: GameMode;
  sprites: Record<SpriteKey, string>;
  onPlayAgain: () => void;
}

interface PodiumEntry {
  n: string;
  a: string;
  s: number;
  m: string;
}

export const FinalPodium = memo(function FinalPodium({
  players,
  mode,
  sprites,
  onPlayAgain,
}: FinalPodiumProps) {
  const isTeams = mode === 'eq';
  const tot = (team: 0 | 1) =>
    players.filter((p) => p.t === team).reduce((sum, p) => sum + p.pts, 0);

  const list: PodiumEntry[] = isTeams
    ? ([0, 1] as const).map((team) => ({
        n: TN[team],
        a: '',
        s: tot(team),
        m: players
          .filter((p) => p.t === team)
          .map((p) => p.n)
          .join(', '),
      }))
    : players.map((p, i) => ({
        n: p.n,
        a: AVS[i],
        s: p.pts,
        m: '',
      }));

  list.sort((a, b) => b.s - a.s);
  const top = list.slice(0, 3);
  const order = top.length > 2 ? [1, 0, 2] : top.length > 1 ? [1, 0] : [0];
  const isTie = list.length > 1 && list[0].s === list[1].s;

  return (
    <>
      <div className="bub final-banner">
        {isTie
          ? '🤝 ¡Empate! Todos campeones'
          : `🏆 ¡Felicidades, ${top[0].n}!`}
      </div>

      <div className="pod final-pod">
        {order.map((idx) => (
          <div className="pcol" key={idx}>
            <div className={idx === 0 ? 'final-avatar-winner' : 'final-avatar'}>
              {top[idx].a || '🏅'}
            </div>
            <div className="final-name">{top[idx].n}</div>
            <div className="final-score">
              {top[idx].m ? (
                <>
                  {top[idx].m}
                  <br />
                </>
              ) : null}
              ⭐ {top[idx].s}
            </div>
            <div className={`blk blk-${idx + 1}`}>{idx + 1}</div>
          </div>
        ))}
      </div>

      <div className="final-trophy-col">
        <div className="dn final-monkey">
          <img src={sprites.c} alt="Mono Monkyplay" draggable={false} />
        </div>
        <div className="final-trophy">🏆</div>
      </div>

      <button type="button" className="btn final-btn-again" onClick={onPlayAgain}>
        🔄 OTRA PARTIDA
      </button>
      <button type="button" className="btn alt final-btn-players" onClick={onPlayAgain}>
        👥 Cambiar jugadores
      </button>
    </>
  );
});
