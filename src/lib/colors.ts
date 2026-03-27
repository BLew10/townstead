const PALETTE = [
  "hsl(210, 70%, 50%)",
  "hsl(340, 65%, 47%)",
  "hsl(160, 60%, 40%)",
  "hsl(30, 80%, 50%)",
  "hsl(270, 55%, 50%)",
  "hsl(190, 70%, 42%)",
  "hsl(50, 75%, 45%)",
  "hsl(0, 65%, 50%)",
  "hsl(130, 50%, 40%)",
  "hsl(300, 50%, 45%)",
  "hsl(220, 60%, 55%)",
  "hsl(15, 70%, 50%)",
  "hsl(180, 55%, 38%)",
  "hsl(90, 50%, 40%)",
  "hsl(250, 50%, 55%)",
  "hsl(350, 60%, 52%)",
  "hsl(170, 60%, 38%)",
  "hsl(40, 75%, 48%)",
  "hsl(280, 45%, 50%)",
  "hsl(200, 65%, 48%)",
];

/**
 * Deterministic color from an ID string. Uses a simple hash to pick
 * from a curated palette so colors are visually distinct and stable.
 */
export function getContactColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

/**
 * Returns a foreground color (white or dark) that contrasts well
 * against the given HSL background.
 */
export function getContrastText(hsl: string): string {
  const match = hsl.match(/hsl\(\s*(\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return "#fff";
  const lightness = parseInt(match[3], 10);
  return lightness > 55 ? "#1a1a1a" : "#ffffff";
}
