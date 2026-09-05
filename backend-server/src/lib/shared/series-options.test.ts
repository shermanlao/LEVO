import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MAX_CARTESIAN_COMBO_ROWS, cartesianComboRows, comboCount, groupOptionsByKind } from './series-options';

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
});
