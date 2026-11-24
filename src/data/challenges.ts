import type { Challenge } from '../types/game';

export const AVS = ['🐵', '🐼', '🦊', '🐸', '🦁', '🐯', '🐙', '🦄'] as const;

export const COL = ['#ff8fa3', '#9ad0ff'] as const;

export const TN = ['🩷 Equipo Rosa', '💙 Equipo Azul'] as const;

export const CH: Challenge[] = [
  ['🗿', 'Quieto como una estatua'],
  ['🦩', 'A la pata coja'],
  ['🙌', 'Brazos arriba'],
  ['🙀', 'Cara de mono asustado'],
  ['✈️', '¡Haz el avión!'],
  ['🐒', 'Mono rascándose la cabeza'],
  ['🩰', 'De puntillas'],
  ['⚽', 'Pose de portero'],
  ['🦸', 'Brazos de superhéroe'],
  ['😮', 'Cara de sorpresa'],
  ['🌳', 'Como un árbol con ramas'],
  ['🏆', 'Pose de campeón'],
  ['🐔', 'Como una gallina'],
  ['🤖', 'Robot congelado'],
].map(([e, t], i) => ({ e, t, i }));

export function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
