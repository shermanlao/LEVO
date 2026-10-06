/** Shared ceiling grey for every 16:9 catalog card. Measured from a clean LEVO ceiling. */
export const CARD_CEILING_GREY = { r: 214, g: 214, b: 212 } as const;
export const CARD_CEILING_GREY_HEX = '#D6D6D4';

export type CatalogCardGreyBox = {
  /** Left edge of the original photo inside the 16:9 canvas. */
  dx: number;
  /** Width of the original photo inside the 16:9 canvas. */
  drawW: number;
  /** Pixels of blend at each join. Default 18. */
  feather?: number;
};

function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function chroma(r: number, g: number, b: number): number {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

/**
 * How strongly this pixel is a painted ceiling (not trim, lamp, or fixture).
 * 1 = shift fully to the catalogue grey.
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

function mixTowardGrey(data: Uint8ClampedArray, i: number, amount: number): void {
  if (amount <= 0) return;
  data[i] = Math.round(data[i] + (CARD_CEILING_GREY.r - data[i]) * amount);
  data[i + 1] = Math.round(data[i + 1] + (CARD_CEILING_GREY.g - data[i + 1]) * amount);
  data[i + 2] = Math.round(data[i + 2] + (CARD_CEILING_GREY.b - data[i + 2]) * amount);
}

function pixelIndex(width: number, x: number, y: number): number {
  return (y * width + x) * 4;
}

/**
 * Paint side strips (when a pad box is given) and shift ceiling pixels to the
 * shared catalogue grey. White trim, warm lamps, and dark fixture holes stay.
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
      for (let x = 0; x < dx; x++) setGrey(data, pixelIndex(width, x, y));
      for (let x = rightX; x < width; x++) setGrey(data, pixelIndex(width, x, y));
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = dx; x < rightX; x++) {
      const i = pixelIndex(width, x, y);
      const blend = catalogCeilingBlend(data[i], data[i + 1], data[i + 2]);
      let amount = blend;
      if (hasBox && feather > 0) {
        const fromLeft = x - dx;
        const fromRight = rightX - 1 - x;
        const edge = Math.min(fromLeft, fromRight);
        if (edge < feather) {
          const t = edge / feather;
          amount = Math.max(amount, (1 - t) * blend);
        }
      }
      mixTowardGrey(data, i, amount);
    }
  }
}
