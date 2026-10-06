import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CARD_CEILING_GREY,
  catalogCeilingBlend,
  luma,
  unifyCatalogCardGrey,
} from './catalog-card-grey';

function pixel(data: Uint8ClampedArray, width: number, x: number, y: number) {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2]] as const;
}

function fill(
  width: number,
  height: number,
  rgb: readonly [number, number, number]
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
    data[i + 3] = 255;
  }
  return data;
}

describe('catalog card grey', () => {
  it('treats a dull mid grey as ceiling and leaves white trim, lamps, and holes', () => {
    assert.ok(catalogCeilingBlend(190, 190, 188) > 0.8);
    assert.equal(catalogCeilingBlend(250, 250, 250), 0);
    assert.equal(catalogCeilingBlend(240, 180, 80), 0);
    assert.equal(catalogCeilingBlend(40, 40, 40), 0);
  });

  it('paints a blank white side strip to the shared grey', () => {
    const width = 20;
    const height = 4;
    const data = fill(width, height, [255, 255, 255]);
    for (let y = 0; y < height; y++) {
      for (let x = 6; x < 14; x++) {
        const i = (y * width + x) * 4;
        data[i] = 180;
        data[i + 1] = 180;
        data[i + 2] = 176;
      }
    }
    unifyCatalogCardGrey(data, width, height, { dx: 6, drawW: 8, feather: 0 });
    assert.deepEqual(pixel(data, width, 1, 1), [CARD_CEILING_GREY.r, CARD_CEILING_GREY.g, CARD_CEILING_GREY.b]);
    assert.deepEqual(pixel(data, width, 18, 1), [CARD_CEILING_GREY.r, CARD_CEILING_GREY.g, CARD_CEILING_GREY.b]);
  });

  it('keeps side-strip brightness so AI plaster grain is not flattened', () => {
    const width = 20;
    const height = 4;
    const data = fill(width, height, [180, 180, 176]);
    unifyCatalogCardGrey(data, width, height, { dx: 6, drawW: 8, feather: 0 });
    const side = pixel(data, width, 1, 1);
    assert.ok(Math.abs(luma(side[0], side[1], side[2]) - luma(180, 180, 176)) <= 2);
    assert.ok(Math.abs(side[0] - side[1]) <= 1);
  });

  it('keeps ceiling grain in the original photo instead of flattening it', () => {
    const width = 12;
    const height = 2;
    const data = fill(width, height, [185, 185, 183]);
    const bright = (0 * width + 6) * 4;
    data[bright] = 205;
    data[bright + 1] = 205;
    data[bright + 2] = 203;
    unifyCatalogCardGrey(data, width, height);
    const dim = pixel(data, width, 2, 0);
    const lit = pixel(data, width, 6, 0);
    const delta = luma(lit[0], lit[1], lit[2]) - luma(dim[0], dim[1], dim[2]);
    assert.ok(delta > 12, `expected grain to remain, got luma delta ${delta}`);
  });

  it('keeps a white trim pixel and a warm lamp pixel', () => {
    const width = 8;
    const height = 2;
    const data = fill(width, height, [190, 190, 188]);
    const trim = (0 * width + 3) * 4;
    data[trim] = 252;
    data[trim + 1] = 252;
    data[trim + 2] = 252;
    const lamp = (1 * width + 4) * 4;
    data[lamp] = 240;
    data[lamp + 1] = 170;
    data[lamp + 2] = 70;
    unifyCatalogCardGrey(data, width, height);
    assert.deepEqual(pixel(data, width, 3, 0), [252, 252, 252]);
    assert.deepEqual(pixel(data, width, 4, 1), [240, 170, 70]);
  });
});
