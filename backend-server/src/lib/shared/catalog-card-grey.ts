/** Shared ceiling grey for every 16:9 catalog card. Measured from a clean LEVO ceiling. */
export const CARD_CEILING_GREY = { r: 214, g: 214, b: 212 } as const;
export const CARD_CEILING_GREY_HEX = '#D6D6D4';

/** How far the original photo’s ceiling may move toward the catalogue grey. Grain and fixture light stay. */
export const INTERIOR_GREY_AMOUNT = 0.22;

export type CatalogCardGreyBox = {
  /** Left edge of the original photo inside the 16:9 canvas. */
  dx: number;
  /** Width of the original photo inside the 16:9 canvas. */
  drawW: number;
  /** Pixels of blend at each join. Default 18. */
  feather?: number;
};

export function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function chroma(r: number, g: number, b: number): number {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

const TARGET_Y = luma(CARD_CEILING_GREY.r, CARD_CEILING_GREY.g, CARD_CEILING_GREY.b);

/**
 * How strongly this pixel is a painted ceiling (not trim, lamp, or fixture).
 * 1 = a ceiling pixel that may take a grey-tone shift.
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

function setGrey(data: Uint8ClampedArray, i: number): void {
  data[i] = CARD_CEILING_GREY.r;
  data[i + 1] = CARD_CEILING_GREY.g;
  data[i + 2] = CARD_CEILING_GREY.b;
}

/** Match the catalogue grey’s colour while keeping this pixel’s brightness (plaster grain, shadows). */
function recolorKeepLuma(data: Uint8ClampedArray, i: number, amount: number): void {
  if (amount <= 0) return;
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const y = luma(r, g, b);
  const scale = TARGET_Y > 1 ? y / TARGET_Y : 1;
  const nr = CARD_CEILING_GREY.r * scale;
  const ng = CARD_CEILING_GREY.g * scale;
  const nb = CARD_CEILING_GREY.b * scale;
  data[i] = Math.round(r + (nr - r) * amount);
  data[i + 1] = Math.round(g + (ng - g) * amount);
  data[i + 2] = Math.round(b + (nb - b) * amount);
}

function pixelIndex(width: number, x: number, y: number): number {
  return (y * width + x) * 4;
}

function isSideFixtureLeak(r: number, g: number, b: number): boolean {
  return chroma(r, g, b) > 22 || luma(r, g, b) < 145;
}

/**
 * Paint side strips toward the shared catalogue grey and give the original
 * ceiling a light chroma match. Luma (grain, plaster, fixture light) stays.
 * White trim, warm lamps, and dark fixture holes are left alone.
 */
export function unifyCatalogCardGrey(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  box?: CatalogCardGreyBox | null
): void {
  const hasBox = Boolean(box && box.drawW > 0 && width > 0 && height > 0);
  const dx = hasBox ? Math.max(0, Math.round(box!.dx)) : 0;
  const drawW = hasBox ? Math.max(0, Math.round(box!.drawW)) : width;
  const rightX = Math.min(width, dx + drawW);
  const feather = Math.max(0, Math.round(box?.feather ?? 18));

  if (hasBox) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < dx; x++) tintSidePixel(data, pixelIndex(width, x, y));
      for (let x = rightX; x < width; x++) tintSidePixel(data, pixelIndex(width, x, y));
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = dx; x < rightX; x++) {
      const i = pixelIndex(width, x, y);
      const blend = catalogCeilingBlend(data[i], data[i + 1], data[i + 2]);
      if (blend <= 0) continue;
      let amount = blend * INTERIOR_GREY_AMOUNT;
      if (hasBox && feather > 0) {
        const fromLeft = x - dx;
        const fromRight = rightX - 1 - x;
        const edge = Math.min(fromLeft, fromRight);
        if (edge < feather) {
          const t = edge / feather;
          amount = blend * (1 - t * (1 - INTERIOR_GREY_AMOUNT));
        }
      }
      recolorKeepLuma(data, i, amount);
    }
  }
}

function tintSidePixel(data: Uint8ClampedArray, i: number): void {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  if (isSideFixtureLeak(r, g, b)) return;
  if (luma(r, g, b) > 240) {
    setGrey(data, i);
    return;
  }
  recolorKeepLuma(data, i, 1);
}
