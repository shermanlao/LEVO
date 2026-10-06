import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MAX_CARTESIAN_COMBO_ROWS,
  cartesianComboRows,
  comboCount,
  compareOptionValues,
  groupOptionsByKind,
} from './series-options';

describe('series option cartesian', () => {
  it('counts visible selector combinations', () => {
    const grouped = groupOptionsByKind([
      { kind: 'wattage', value: '10W', sort_order: 0 },
      { kind: 'wattage', value: '20W', sort_order: 1 },
      { kind: 'cct', value: '3000K', sort_order: 0 },
      { kind: 'cct', value: '4000K', sort_order: 1 },
    ]);
    assert.equal(comboCount(grouped), 4);
  });

  it('caps generated combo rows', () => {
    const options = [];
    for (let i = 0; i < 20; i += 1) {
      options.push({ kind: 'wattage', value: `${i}W`, sort_order: i });
      options.push({ kind: 'cct', value: `${3000 + i}K`, sort_order: i });
    }
    const rows = cartesianComboRows(groupOptionsByKind(options));
    assert.ok(rows.length <= MAX_CARTESIAN_COMBO_ROWS);
  });

  it('keeps size pack_id and photos when merging duplicate size labels', () => {
    const grouped = groupOptionsByKind([
      {
        kind: 'size',
        value: 'Ø90mm',
        sort_order: 0,
        dimensions: 'Ø90mm',
        pack_id: 12,
        main_image_A: '/uploads/a.jpg',
      },
      { kind: 'size', value: 'Ø90mm', sort_order: 1, cutout_size: 'Ø80mm', size_image: '/uploads/d.png' },
    ]);
    assert.equal(grouped.size[0].pack_id, 12);
    assert.equal(grouped.size[0].cutout_size, 'Ø80mm');
    assert.equal(grouped.size[0].main_image_A, '/uploads/a.jpg');
    assert.equal(grouped.size[0].size_image, '/uploads/d.png');
  });

  it('lists finish and reflector as white, then black, then other', () => {
    const finishes = ['Black', 'Silver', 'White', 'Gold', 'Black/White', 'Matt White', 'White/Black'];
    const grouped = groupOptionsByKind([
      ...finishes.map((value, sort_order) => ({ kind: 'colour', value, sort_order })),
      ...finishes.map((value, sort_order) => ({ kind: 'reflector_finish', value, sort_order })),
      ...['Black/White', 'Black/White/Silver', 'Silver/Black/White', 'White', 'White/Black'].map(
        (value, sort_order) => ({ kind: 'trim_color', value, sort_order })
      ),
    ]);
    const expected = ['White', 'Matt White', 'White/Black', 'Black', 'Black/White', 'Gold', 'Silver'];
    assert.deepEqual(grouped.colour.map((option) => option.value), expected);
    assert.deepEqual(grouped.reflector_finish.map((option) => option.value), expected);
    assert.deepEqual(grouped.trim_color.map((option) => option.value), [
      'White',
      'White/Black',
      'Black/White',
      'Black/White/Silver',
      'Silver/Black/White',
    ]);
    assert.ok(compareOptionValues('wattage', '10W', '2W') > 0);
  });

  it('builds combo rows with white finish before black', () => {
    const rows = cartesianComboRows(
      groupOptionsByKind([
        { kind: 'colour', value: 'Black', sort_order: 0 },
        { kind: 'colour', value: 'White', sort_order: 1 },
        { kind: 'cct', value: '3000K', sort_order: 0 },
        { kind: 'cct', value: '2700K', sort_order: 1 },
      ])
    );
    assert.deepEqual(
      rows.map((row) => `${row.selection.colour}|${row.selection.cct}`),
      ['White|2700K', 'White|3000K', 'Black|2700K', 'Black|3000K']
    );
  });
});
