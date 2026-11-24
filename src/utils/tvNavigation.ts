export type NavDirection = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), .pc[tabindex="0"]';

function isVisibleAndInteractive(el: HTMLElement): boolean {
  if (el.closest('[inert]')) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export function getFocusableElements(): HTMLElement[] {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  );
  return nodes.filter(isVisibleAndInteractive);
}

export function focusDefaultSceneControl() {
  const prioritySelectors = [
    '.scene-active .setup-play-btn',
    '.scene-active .stage-btn-ready',
    '.scene-active .stage-btn-dance',
    '.scene-active .stage-btn-next',
    '.scene-active .final-btn-again',
  ];

  for (const sel of prioritySelectors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el && isVisibleAndInteractive(el)) {
      el.focus({ preventScroll: true });
      return;
    }
  }

  const all = getFocusableElements();
  if (all.length > 0) {
    all[0].focus({ preventScroll: true });
  }
}

export function moveSpatialFocus(direction: NavDirection): boolean {
  const candidates = getFocusableElements();
  if (candidates.length === 0) return false;

  const active = document.activeElement as HTMLElement | null;
  if (!active || !candidates.includes(active)) {
    focusDefaultSceneControl();
    return true;
  }

  // Allow Left/Right cursor editing inside text inputs unless at boundary
  if (active.tagName === 'INPUT') {
    const input = active as HTMLInputElement;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    if (direction === 'ArrowLeft' && (start > 0 || start !== end)) {
      return false;
    }
    if (direction === 'ArrowRight' && (end < input.value.length || start !== end)) {
      return false;
    }
  }

  const from = active.getBoundingClientRect();
  const fromCx = from.left + from.width / 2;
  const fromCy = from.top + from.height / 2;

  let best: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const el of candidates) {
    if (el === active) continue;
    const to = el.getBoundingClientRect();
    const toCx = to.left + to.width / 2;
    const toCy = to.top + to.height / 2;

    const dx = toCx - fromCx;
    const dy = toCy - fromCy;

    let primary = 0;
    let secondary = 0;

    if (direction === 'ArrowRight') {
      if (dx <= 6) continue;
      primary = dx;
      secondary = Math.abs(dy);
    } else if (direction === 'ArrowLeft') {
      if (dx >= -6) continue;
      primary = -dx;
      secondary = Math.abs(dy);
    } else if (direction === 'ArrowDown') {
      if (dy <= 6) continue;
      primary = dy;
      secondary = Math.abs(dx);
    } else if (direction === 'ArrowUp') {
      if (dy >= -6) continue;
      primary = -dy;
      secondary = Math.abs(dx);
    }

    // Weight perpendicular offset heavier so we strongly prefer aligned rows/columns
    const score = primary + secondary * 2.5;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }

  if (best) {
    best.focus({ preventScroll: true });
    return true;
  }

  return false;
}
