import { memo } from 'react';
import { AVS, TN } from '../data/challenges';
import type { GameMode, Player } from '../types/game';

interface PlayerRowProps {
  index: number;
  player: Player;
  isTeams: boolean;
  canRemove: boolean;
  onUpdateName: (index: number, name: string) => void;
  onToggleTeam: (index: number) => void;
  onRemovePlayer: (index: number) => void;
}

const PlayerRow = memo(function PlayerRow({
  index,
  player,
  isTeams,
  canRemove,
  onUpdateName,
  onToggleTeam,
  onRemovePlayer,
}: PlayerRowProps) {
  return (
    <div className="row">
      <span className="av">{AVS[index]}</span>
      <input
        value={player.n}
        maxLength={12}
        aria-label={`Nombre del jugador ${index + 1}`}
        onChange={(e) => onUpdateName(index, e.target.value)}
      />
      {isTeams && (
        <button
          type="button"
          className={`tag ${player.t === 0 ? 'tag-pink' : 'tag-blue'}`}
          onClick={() => onToggleTeam(index)}
        >
          {TN[player.t]}
        </button>
      )}
      <button
        type="button"
        className="x"
        onClick={() => onRemovePlayer(index)}
        disabled={!canRemove}
        aria-label={`Quitar jugador ${index + 1}`}
      >
        ✖
      </button>
    </div>
  );
});

interface SetupScreenProps {
  players: Player[];
  mode: GameMode;
  rounds: number;
  autoNext: boolean;
  onUpdateName: (index: number, name: string) => void;
  onToggleTeam: (index: number) => void;
  onRemovePlayer: (index: number) => void;
  onAddPlayer: () => void;
  onSetMode: (mode: GameMode) => void;
  onSetRounds: (rounds: number) => void;
  onSetAutoNext: (autoNext: boolean) => void;
  onStart: () => void;
}

export const SetupScreen = memo(function SetupScreen({
  players,
  mode,
  rounds,
  autoNext,
  onUpdateName,
  onToggleTeam,
  onRemovePlayer,
  onAddPlayer,
  onSetMode,
  onSetRounds,
  onSetAutoNext,
  onStart,
}: SetupScreenProps) {
  const isTeams = mode === 'eq';
  const canRemove = players.length > 2;

  return (
    <>
      <div className="card setup-players">
        <h2>👨‍👩‍👧 Jugadores ({players.length}/8)</h2>
        {players.map((p, i) => (
          <PlayerRow
            key={i}
            index={i}
            player={p}
            isTeams={isTeams}
            canRemove={canRemove}
            onUpdateName={onUpdateName}
            onToggleTeam={onToggleTeam}
            onRemovePlayer={onRemovePlayer}
          />
        ))}
        <button
          type="button"
          className="btn alt setup-add-btn"
          onClick={onAddPlayer}
          disabled={players.length >= 8}
        >
          ＋ Añadir jugador
        </button>
      </div>

      <div className="card setup-options">
        <h2>Modo</h2>
        <button
          type="button"
          className={`btn ${!isTeams ? 'sel' : ''}`}
          onClick={() => onSetMode('ind')}
        >
          🧍 Individual
        </button>{' '}
        <button
          type="button"
          className={`btn ${isTeams ? 'sel' : ''}`}
          onClick={() => onSetMode('eq')}
        >
          👥 Equipos
        </button>

        <h2 className="setup-h2-rounds">Rondas</h2>
        {[3, 5, 8].map((n) => (
          <span key={n}>
            <button
              type="button"
              className={`btn ${rounds === n ? 'sel' : ''}`}
              onClick={() => onSetRounds(n)}
            >
              {n}
            </button>{' '}
          </span>
        ))}

        <h2 className="setup-h2-next">Siguiente ronda</h2>
        <button
          type="button"
          className={`btn setup-next-btn ${autoNext ? 'sel' : ''}`}
          onClick={() => onSetAutoNext(true)}
        >
          🔁 Automática
        </button>{' '}
        <button
          type="button"
          className={`btn setup-next-btn ${!autoNext ? 'sel' : ''}`}
          onClick={() => onSetAutoNext(false)}
        >
          ✋ Manual
        </button>

        <p className="setup-desc">
          Los niños bailan por el salón sin móvil. <b>La familia es el jurado</b>: cuando pare la
          música, tocad a quien se mueva: ¡los puntos se suman solos!
        </p>
      </div>

      <button type="button" className="btn setup-play-btn" onClick={onStart}>
        ▶ ¡A JUGAR!
      </button>
    </>
  );
});
