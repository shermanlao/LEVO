import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  appearanceAiSourcePath,
  findAppearancePhoto,
  rankAppearancePhotos,
  sizeDrawingProductPhotoPath,
  unusedAppearancePhotos,
  type AppearancePhotoDto,
} from './appearance-photos';
import type { SeriesOptionDto } from './series-options';

const SIZE_A = 'L172.5 x W92 x H76mm';
const SIZE_B = 'L92 x W92 x H93.5mm';

function photo(partial: Partial<AppearancePhotoDto> & { id: number; main_image_A: string }): AppearancePhotoDto {
  return {
    colour: '',
    trim_color: '',
    reflector_finish: '',
    size: '',
    ...partial,
  };
}

describe('rankAppearancePhotos', () => {
  const white = photo({ id: 1, colour: 'White', main_image_A: '/white.jpg' });
  const whiteSize = photo({
    id: 2,
    colour: 'White',
    size: SIZE_A,
    main_image_A: '/white-size.jpg',
  });
  const black = photo({ id: 3, colour: 'Black', main_image_A: '/black.jpg' });
  const untagged = photo({ id: 4, main_image_A: '/any.jpg' });
  const photos = [white, whiteSize, black, untagged];

  it('ranks white+size above white-only, then an untagged photo', () => {
    const ranked = rankAppearancePhotos(photos, { colour: 'White', size: SIZE_A });
    assert.deepEqual(
      ranked.map((row) => row.id),
      [2, 1, 4]
    );
    assert.equal(findAppearancePhoto(photos, { colour: 'White', size: SIZE_A })?.id, 2);
  });

  it('drops a size-tagged photo when the size disagrees and keeps the broader white photo', () => {
    const ranked = rankAppearancePhotos(photos, { colour: 'White', size: SIZE_B });
    assert.deepEqual(
      ranked.map((row) => row.id),
      [1, 4]
    );
  });

  it('never includes a conflicting finish', () => {
    const ranked = rankAppearancePhotos(photos, { colour: 'Black', size: SIZE_A });
    assert.deepEqual(
      ranked.map((row) => row.id),
      [3, 4]
    );
    assert.equal(
      ranked.some((row) => row.colour === 'White'),
      false
    );
  });

  it('puts the newer id first when tag counts match', () => {
    const older = photo({ id: 8, colour: 'White', main_image_A: '/old.jpg' });
    const newer = photo({ id: 12, colour: 'White', main_image_A: '/new.jpg' });
    const ranked = rankAppearancePhotos([older, newer], { colour: 'White', size: SIZE_A });
    assert.equal(ranked[0]?.id, 12);
  });

  it('returns an empty chain when nothing is compatible', () => {
    const onlyWhiteSize = [whiteSize];
    assert.deepEqual(rankAppearancePhotos(onlyWhiteSize, { colour: 'Black', size: SIZE_B }), []);
    assert.equal(findAppearancePhoto(onlyWhiteSize, { colour: 'Black', size: SIZE_B }), null);
  });
});

describe('unusedAppearancePhotos', () => {
  it('keeps photos whose tags are still on the series and flags leftover tags', () => {
    const grouped: Record<string, SeriesOptionDto[]> = {
      colour: [
        { kind: 'colour', value: 'White', sort_order: 0 },
        { kind: 'colour', value: 'Black', sort_order: 1 },
      ],
      size: [{ kind: 'size', value: SIZE_A, sort_order: 0 }],
    };
    const current = photo({ id: 1, colour: 'White', size: SIZE_A, main_image_A: '/ok.jpg' });
    const leftover = photo({ id: 2, colour: 'Milky', main_image_A: '/old.jpg' });
    const unused = unusedAppearancePhotos([current, leftover], grouped);
    assert.deepEqual(
      unused.map((row) => row.id),
      [2]
    );
  });
});

describe('appearance photo sources', () => {
  it('prefers a size-tagged library photo for the drawing, then any library photo', () => {
    const sizePhoto = photo({ id: 1, size: SIZE_A, main_image_A: '/size.jpg' });
    const other = photo({ id: 2, main_image_A: '/any.jpg' });
    assert.equal(sizeDrawingProductPhotoPath([sizePhoto, other], SIZE_A, ['/series.jpg']), '/size.jpg');
    assert.equal(sizeDrawingProductPhotoPath([other], SIZE_A, ['/series.jpg']), '/any.jpg');
    assert.equal(sizeDrawingProductPhotoPath([], SIZE_A, ['/series.jpg']), '/series.jpg');
  });

  it('edits the card photo, then another library photo, then the series photo', () => {
    const empty = photo({ id: 1, colour: 'White', main_image_A: '' });
    const other = photo({ id: 2, main_image_A: '/lib.jpg' });
    assert.equal(appearanceAiSourcePath([empty, other], other, ['/series.jpg']), '/lib.jpg');
    assert.equal(appearanceAiSourcePath([empty, other], empty, ['/series.jpg']), '/lib.jpg');
    assert.equal(appearanceAiSourcePath([empty], empty, ['/series.jpg']), '/series.jpg');
  });
});
