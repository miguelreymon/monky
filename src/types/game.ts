export type GamePhase = 'setup' | 'ready' | 'dance' | 'statue' | 'judge' | 'final';

export type GameMode = 'ind' | 'eq';

export interface Player {
  n: string;
  t: 0 | 1;
  pts: number;
  mv: boolean;
}

export interface Challenge {
  e: string;
  t: string;
  i: number;
}

export interface GameState {
  players: Player[];
  mode: GameMode;
  rounds: number;
  autoNext: boolean;
  nx: number | null;
  ph: GamePhase;
  round: number;
  deck: Challenge[];
  ch: Challenge | null;
  hold: number;
}
