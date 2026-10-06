/** Fallback ceiling grey when a photo has too little plaster to sample. */
export const CARD_CEILING_GREY = { r: 214, g: 214, b: 212 } as const;
export const CARD_CEILING_GREY_HEX = '#D6D6D4';

export type CeilingGrey = { r: number; g: number; b: number };

export type CatalogCardGreyBox = {
  /** Left edge of the original photo inside the 16:9 canvas. */
  dx: number;
  /** Width of the original photo inside the 16:9 canvas. */
  drawW: number;
  /** Pixels of blend at each join. Omit to size from the original width. */
  feather?: number;
};

export function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function chroma(r: number, g: number, b: number): number {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

/**
 * How strongly this pixel is a painted ceiling (not trim, lamp, or fixture).
 */
export function catalogCeilingBlend(r: number, g: number, b: number): number {
  const c = chroma(r, g, b);
  const y = luma(r, g, b);
  if (c > 22 || y > 242 || y < 145) return 0;
  let weight = 1;
  if (y < 165) weight *= (y - 145) / 20;
  if (y > 230) weight *= (242 - y) / 12;
  if (c > 10) weight *= (22 - c) / 12;
  return Math.max(0, Math.min(1, weight));
}

export function joinFeatherWidth(drawW: number, override?: number): number {
  const cap = Math.max(0, Math.floor(drawW / 3));
  if (override != null && override >= 0) return Math.min(override, cap);
  return Math.min(cap, Math.max(8, Math.round(drawW * 0.18)));
}

/** 0 at the original’s left/right edge, 1 in the middle. Cosine ease. */
export function originalJoinWeight(x: number, dx: number, drawW: number, feather: number): number {
  const fromLeft = x - dx;
  const fromRight = dx + drawW - 1 - x;
  if (fromLeft < 0 || fromRight < 0) return 0;
  if (feather <= 0) return 1;
  const edge = Math.min(fromLeft, fromRight);
  if (edge >= feather) return 1;
  const t = edge / feather;
  return 0.5 - 0.5 * Math.cos(Math.PI * t);
}

function pixelIndex(width: number, x: number, y: number): number {
  return (y * width + x) * 4;
}

function isSideFixtureLeak(r: number, g: number, b: number): boolean {
  return chroma(r, g, b) > 22 || luma(r, g, b) < 145;
}

function setRgb(data: Uint8ClampedArray, i: number, grey: CeilingGrey): void {
  data[i] = grey.r;
  data[i + 1] = grey.g;
  data[i + 2] = grey.b;
}

/** Match `grey`’s colour while keeping this pixel’s brightness (plaster grain, shadows). */
function recolorKeepLuma(
  data: Uint8ClampedArray,
  i: number,
  amount: number,
  grey: CeilingGrey
): void {
  if (amount <= 0) return;
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const y = luma(r, g, b);
  const targetY = luma(grey.r, grey.g, grey.b);
  const scale = targetY > 1 ? y / targetY : 1;
  const nr = grey.r * scale;
  const ng = grey.g * scale;
  const nb = grey.b * scale;
  data[i] = Math.round(r + (nr - r) * amount);
  data[i + 1] = Math.round(g + (ng - g) * amount);
  data[i + 2] = Math.round(b + (nb - b) * amount);
}

/**
 * Average ceiling colour from the original photo (top band, away from the fixture).
 * Falls back to `CARD_CEILING_GREY` when there is too little plaster to sample.
 */
export function sampleCeilingGrey(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  box?: CatalogCardGreyBox | null
): CeilingGrey {
  const dx = box ? Math.max(0, Math.round(box.dx)) : 0;
  const drawW = box ? Math.max(0, Math.round(box.drawW)) : width;
  const rightX = Math.min(width, dx + drawW);
  const topH = Math.max(1, Math.round(height * 0.22));
  const inset = Math.max(1, Math.round(drawW * 0.08));
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const x0 = Math.min(width, dx + inset);
  const x1 = Math.max(x0 + 1, rightX - inset);
  for (let y = 0; y < topH; y++) {
    for (let x = x0; x < x1; x++) {
      const i = pixelIndex(width, x, y);
      if (catalogCeilingBlend(data[i], data[i + 1], data[i + 2]) < 0.45) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n += 1;
    }
  }
  if (n < 12) return { ...CARD_CEILING_GREY };
  return {
    r: Math.round(r / n),
    g: Math.round(g / n),
    b: Math.round(b / n),
  };
}

/**
 * Copy each row’s side-strip colour into the original’s left/right feather zone.
 * Needed when the canvas already has a stamped original (boot unify). A fresh
 * outpaint already continues the ceiling there, so skip this on Extend.
 */
export function pullSideColourIntoJoin(
  dest: Uint8ClampedArray,
  width: number,
  height: number,
  box: CatalogCardGreyBox
): void {
  const dx = Math.max(0, Math.round(box.dx));
  const drawW = Math.max(0, Math.round(box.drawW));
  const feather = joinFeatherWidth(drawW, box.feather);
  if (feather <= 0 || drawW <= 0) return;
  const rightX = Math.min(width, dx + drawW);
  const leftX = Math.max(0, dx - 1);
  const rightSideX = Math.min(width - 1, rightX);
  for (let y = 0; y < height; y++) {
    const leftI = pixelIndex(width, leftX, y);
    const rightI = pixelIndex(width, rightSideX, y);
    const leftEnd = Math.min(rightX, dx + feather);
    for (let x = dx; x < leftEnd; x++) {
      const i = pixelIndex(width, x, y);
      dest[i] = dest[leftI];
      dest[i + 1] = dest[leftI + 1];
      dest[i + 2] = dest[leftI + 2];
    }
    const rightStart = Math.max(dx, rightX - feather);
    for (let x = rightStart; x < rightX; x++) {
      const i = pixelIndex(width, x, y);
      dest[i] = dest[rightI];
      dest[i + 1] = dest[rightI + 1];
      dest[i + 2] = dest[rightI + 2];
    }
  }
}

/** Blend the original photo into the extended canvas. Weight is 1 in the middle
 * (fixture stays) and 0 at the left/right join so the outpaint continues inward.
 * `original` is the same size as `dest`, with the source photo already in the box.
 */
export function featherOriginalInto(
  dest: Uint8ClampedArray,
  original: Uint8ClampedArray,
  width: number,
  height: number,
  box: CatalogCardGreyBox
): void {
  const dx = Math.max(0, Math.round(box.dx));
  const drawW = Math.max(0, Math.round(box.drawW));
  const feather = joinFeatherWidth(drawW, box.feather);
  const rightX = Math.min(width, dx + drawW);
  for (let y = 0; y < height; y++) {
    for (let x = dx; x < rightX; x++) {
      const w = originalJoinWeight(x, dx, drawW, feather);
      if (w <= 0) continue;
      const i = pixelIndex(width, x, y);
      dest[i] = Math.round(dest[i] * (1 - w) + original[i] * w);
      dest[i + 1] = Math.round(dest[i + 1] * (1 - w) + original[i + 1] * w);
      dest[i + 2] = Math.round(dest[i + 2] * (1 - w) + original[i + 2] * w);
    }
  }
}

/** Mean RGB distance between ceiling pixels just inside vs just outside a join. */
export function hardJoinDelta(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  box: CatalogCardGreyBox
): number {
  const dx = Math.max(0, Math.round(box.dx));
  const drawW = Math.max(0, Math.round(box.drawW));
  const rightX = Math.min(width, dx + drawW);
  const inset = Math.max(2, Math.min(8, Math.round(drawW * 0.08)));
  const left = columnDelta(data, width, height, dx - 2, dx + inset);
  const right = columnDelta(data, width, height, rightX + 1, rightX - 1 - inset);
  return Math.max(left, right);
}

function columnDelta(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  outsideX: number,
  insideX: number
): number {
  if (outsideX < 0 || outsideX >= width || insideX < 0 || insideX >= width) return 0;
  const a = columnCeilingMean(data, width, height, outsideX);
  const b = columnCeilingMean(data, width, height, insideX);
  if (!a || !b) return 0;
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

function columnCeilingMean(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number
): CeilingGrey | null {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = 0; y < height; y++) {
    const i = pixelIndex(width, x, y);
    if (catalogCeilingBlend(data[i], data[i + 1], data[i + 2]) < 0.4) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n += 1;
  }
  if (n < 4) return null;
  return { r: r / n, g: g / n, b: b / n };
}

/**
 * Tint toward this photo’s ceiling grey. Full strength on the side strips and
 * at the join (where the original is faded out); none in the middle of the original.
 * Blank white pads fill with `target`.
 */
export function unifyCatalogCardGrey(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  box?: CatalogCardGreyBox | null,
  target?: CeilingGrey | null
): void {
  const grey = target ?? CARD_CEILING_GREY;
  if (!box || box.drawW <= 0 || !(width > 0 && height > 0)) return;
  const dx = Math.max(0, Math.round(box.dx));
  const drawW = Math.max(0, Math.round(box.drawW));
  const feather = joinFeatherWidth(drawW, box.feather);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const amount = 1 - originalJoinWeight(x, dx, drawW, feather);
      if (amount <= 0) continue;
      tintTowardGrey(data, pixelIndex(width, x, y), amount, grey);
    }
  }
}

function tintTowardGrey(data: Uint8ClampedArray, i: number, amount: number, grey: CeilingGrey): void {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  if (isSideFixtureLeak(r, g, b)) return;
  if (luma(r, g, b) > 240 && amount >= 0.95) {
    setRgb(data, i, grey);
    return;
  }
  recolorKeepLuma(data, i, amount, grey);
}
