/**
 * Face outlines and glasses frames for FaceFigure, on its 120 x 120 canvas.
 * The face sits centred on x = 60, from the hairline (~y 30) to the chin (~y 94).
 */

export type FaceShape = 'oval' | 'round' | 'square' | 'heart' | 'oblong' | 'diamond';
export type Presentation = 'female' | 'male';

/** Outline per face shape. `male` squares the jaw slightly. */
export function faceOutline(shape: FaceShape, presentation: Presentation): string {
  const jawBoost = presentation === 'male' ? 2 : 0;
  switch (shape) {
    case 'round':
      return 'M60 30 C84 30 89 48 89 62 C89 80 76 94 60 94 C44 94 31 80 31 62 C31 48 36 30 60 30 Z';
    case 'square':
      return `M60 30 C82 30 87 42 87 56 L${86 + jawBoost / 2} 80 C85 90 72 94 60 94 C48 94 35 90 ${34 - jawBoost / 2} 80 L33 56 C33 42 38 30 60 30 Z`;
    case 'heart':
      return 'M60 30 C84 30 88 44 88 56 C88 72 72 90 60 95 C48 90 32 72 32 56 C32 44 36 30 60 30 Z';
    case 'oblong':
      return 'M60 26 C80 26 83 42 83 60 C83 82 74 97 60 97 C46 97 37 82 37 60 C37 42 40 26 60 26 Z';
    case 'diamond':
      return 'M60 30 C74 30 80 40 86 58 C82 76 72 92 60 95 C48 92 38 76 34 58 C40 40 46 30 60 30 Z';
    default:
      return presentation === 'male'
        ? 'M60 30 C82 30 86 46 86 60 C86 78 78 92 60 94 C42 92 34 78 34 60 C34 46 38 30 60 30 Z'
        : 'M60 30 C82 30 86 46 86 60 C86 78 74 94 60 94 C46 94 34 78 34 60 C34 46 38 30 60 30 Z';
  }
}

export type FrameStyle = 'round' | 'square' | 'rectangle' | 'cateye' | 'aviator' | 'oval' | 'browline' | 'geometric';

/** One lens outline centred on (cx, 62). `side` is -1 for the left eye, 1 for the right. */
export function lensPath(style: FrameStyle, cx: number, side: -1 | 1): string {
  const y = 62;
  switch (style) {
    case 'round':
      return `M${cx - 9} ${y} a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0 Z`;
    case 'square':
      return `M${cx - 9} ${y - 8} h18 v15 h-18 Z`;
    case 'rectangle':
      return `M${cx - 10} ${y - 6} h20 v12 h-20 Z`;
    case 'oval':
      return `M${cx - 10} ${y} a10 7 0 1 0 20 0 a10 7 0 1 0 -20 0 Z`;
    case 'aviator':
      return `M${cx - 10} ${y - 7} H${cx + 10} C${cx + 10} ${y + 11} ${cx - 10} ${y + 11} ${cx - 10} ${y - 7} Z`;
    case 'cateye':
      return `M${cx - 9 * side} ${y - 3} L${cx + 12 * side} ${y - 9} C${cx + 10 * side} ${y + 8} ${cx - 9 * side} ${y + 8} ${cx - 9 * side} ${y - 3} Z`;
    case 'browline':
      return `M${cx - 10} ${y - 5} C${cx - 10} ${y + 9} ${cx + 10} ${y + 9} ${cx + 10} ${y - 5} Z`;
    default:
      return `M${cx - 9} ${y - 4} L${cx - 4} ${y - 8} H${cx + 5} L${cx + 10} ${y - 2} L${cx + 5} ${y + 7} H${cx - 5} Z`;
  }
}

/** Pick a frame drawing from a name, so new catalogue entries still get a picture. */
export function frameStyleFor(name: string): FrameStyle {
  const n = name.toLowerCase();
  if (/cat/.test(n)) return 'cateye';
  if (/aviator|pilot|teardrop/.test(n)) return 'aviator';
  if (/brow|clubmaster/.test(n)) return 'browline';
  if (/round|circle|panto/.test(n)) return 'round';
  if (/oval/.test(n)) return 'oval';
  if (/geo|hex|octa/.test(n)) return 'geometric';
  if (/square|bold|oversized/.test(n)) return 'square';
  return 'rectangle';
}

/** Read a face shape out of free text such as "Oval" or "heart_shaped". */
export function faceShapeFor(value: string | null | undefined): FaceShape | null {
  const n = (value ?? '').toLowerCase();
  const shapes: FaceShape[] = ['oval', 'round', 'square', 'heart', 'oblong', 'diamond'];
  if (/rectang|long/.test(n)) return 'oblong';
  return shapes.find((s) => n.includes(s)) ?? null;
}
