import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CARD_CEILING_GREY,
  catalogCeilingBlend,
  featherOriginalInto,
  hardJoinDelta,
  joinFeatherWidth,
  luma,
  originalJoinWeight,
  pullSideColourIntoJoin,
  sampleCeilingGrey,
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

  it('samples the original ceiling instead of always using the fallback chip', () => {
    const width = 40;
    const height = 10;
    const data = fill(width, height, [200, 198, 192]);
    const sampled = sampleCeilingGrey(data, width, height, { dx: 8, drawW: 24 });
    assert.ok(Math.abs(sampled.r - 200) <= 2);
    assert.ok(Math.abs(sampled.g - 198) <= 2);
    assert.ok(Math.abs(sampled.b - 192) <= 2);
  });

  it('paints a blank white side strip to the sampled ceiling grey', () => {
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
    const target = { r: 190, g: 188, b: 182 };
    unifyCatalogCardGrey(data, width, height, { dx: 6, drawW: 8, feather: 0 }, target);
    assert.deepEqual(pixel(data, width, 1, 1), [190, 188, 182]);
    assert.deepEqual(pixel(data, width, 18, 1), [190, 188, 182]);
  });

  it('keeps side-strip brightness so AI plaster grain is not flattened', () => {
    const width = 20;
    const height = 4;
    const data = fill(width, height, [180, 180, 176]);
    unifyCatalogCardGrey(data, width, height, { dx: 6, drawW: 8, feather: 0 }, CARD_CEILING_GREY);
    const side = pixel(data, width, 1, 1);
    assert.ok(Math.abs(luma(side[0], side[1], side[2]) - luma(180, 180, 176)) <= 2);
    assert.ok(Math.abs(side[0] - side[1]) <= 1);
  });

  it('does not flatten ceiling grain in the original photo', () => {
    const width = 12;
    const height = 2;
    const data = fill(width, height, [185, 185, 183]);
    const bright = (0 * width + 6) * 4;
    data[bright] = 205;
    data[bright + 1] = 205;
    data[bright + 2] = 203;
    unifyCatalogCardGrey(data, width, height, { dx: 2, drawW: 8, feather: 0 });
    const dim = pixel(data, width, 4, 0);
    const lit = pixel(data, width, 6, 0);
    const delta = luma(lit[0], lit[1], lit[2]) - luma(dim[0], dim[1], dim[2]);
    assert.ok(delta > 12, `expected grain to remain, got luma delta ${delta}`);
  });

  it('feathers the original so the join is not a hard box', () => {
    const width = 36;
    const height = 4;
    const dest = fill(width, height, [210, 210, 208]);
    const orig = fill(width, height, [160, 160, 158]);
    const box = { dx: 8, drawW: 20, feather: 6 };
    featherOriginalInto(dest, orig, width, height, box);
    const join = pixel(dest, width, 8, 1);
    const mid = pixel(dest, width, 18, 1);
    assert.ok(luma(join[0], join[1], join[2]) > luma(mid[0], mid[1], mid[2]) + 15);
    assert.ok(Math.abs(mid[0] - 160) <= 2);
    assert.ok(originalJoinWeight(8, 8, 20, 6) < 0.05);
    assert.ok(originalJoinWeight(18, 8, 20, 6) > 0.95);
  });

  it('pulls side colour into a stamped original so boot unify can unbox it', () => {
    const width = 36;
    const height = 4;
    const dest = fill(width, height, [210, 210, 208]);
    for (let y = 0; y < height; y++) {
      for (let x = 8; x < 28; x++) {
        const i = (y * width + x) * 4;
        dest[i] = 160;
        dest[i + 1] = 160;
        dest[i + 2] = 158;
      }
    }
    const orig = new Uint8ClampedArray(dest);
    const box = { dx: 8, drawW: 20, feather: 6 };
    pullSideColourIntoJoin(dest, width, height, box);
    featherOriginalInto(dest, orig, width, height, box);
    const join = pixel(dest, width, 8, 1);
    const mid = pixel(dest, width, 18, 1);
    assert.ok(luma(join[0], join[1], join[2]) > luma(mid[0], mid[1], mid[2]) + 20);
    assert.ok(Math.abs(mid[0] - 160) <= 2);
  });

  it('flags a hard vertical seam between original and sides', () => {
    const width = 24;
    const height = 8;
    const data = fill(width, height, [210, 210, 208]);
    for (let y = 0; y < height; y++) {
      for (let x = 8; x < 16; x++) {
        const i = (y * width + x) * 4;
        data[i] = 170;
        data[i + 1] = 170;
        data[i + 2] = 168;
      }
    }
    assert.ok(hardJoinDelta(data, width, height, { dx: 8, drawW: 8 }) > 20);
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
    unifyCatalogCardGrey(data, width, height, { dx: 2, drawW: 4, feather: 0 });
    assert.deepEqual(pixel(data, width, 3, 0), [252, 252, 252]);
    assert.deepEqual(pixel(data, width, 4, 1), [240, 170, 70]);
  });
});
