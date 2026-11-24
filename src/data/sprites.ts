import { RAW_IMG, type SpriteKey } from './assets';

const SPRITES: Record<SpriteKey, string> = { ...RAW_IMG };
let initialized = false;

export function getSprites(): Record<SpriteKey, string> {
  if (!initialized) {
    initialized = true;
    try {
      (Object.keys(RAW_IMG) as SpriteKey[]).forEach((k) => {
        const b64 = RAW_IMG[k].split(',')[1];
        if (!b64) return;
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
          bytes[i] = bin.charCodeAt(i);
        }
        SPRITES[k] = URL.createObjectURL(new Blob([bytes], { type: 'image/webp' }));
      });
    } catch {
      // Fall back to inline data URIs if Blob creation fails
    }

    try {
      (Object.keys(SPRITES) as SpriteKey[]).forEach((k) => {
        const img = new Image();
        img.src = SPRITES[k];
        if (img.decode) {
          img.decode().catch(() => {});
        }
      });
    } catch {
      // Ignore preload errors
    }
  }

  return SPRITES;
}
