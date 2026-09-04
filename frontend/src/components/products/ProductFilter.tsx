'use client';

import { useState } from 'react';

interface FilterOptions {
  wattage: number[];
  size?: string[];
  cct: string[];
  beam_angle: string[];
  dimming: string[];
}

interface ProductFilterProps {
  options: FilterOptions;
  onFilterChange: (filters: Record<string, string | number | null>) => void;
  initialValues?: Record<string, string | number>;
}

export default function ProductFilter({ 
  options, 
  onFilterChange, 
  initialValues = {} 
}: ProductFilterProps) {
  const [filters, setFilters] = useState<Record<string, string | number | null>>(initialValues);

  const handleFilterChange = (key: string, value: string | number | null) => {
    const newFilters = {
      ...filters,
      [key]: value === '' ? null : value,
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Wattage</h3>
        <select
          className="select-field"
          onChange={(e) => handleFilterChange('wattage', e.target.value ? Number(e.target.value) : null)}
          value={filters.wattage || ''}
        >
          <option value="">All</option>
          {options.wattage.map((w) => (
            <option key={w} value={w}>
              {w}W
            </option>
          ))}
        </select>
      </div>

      {(options.size || []).length > 0 ? (
      <div>
        <h3 className="text-lg font-semibold mb-3">Size</h3>
        <select
          className="select-field"
          onChange={(e) => handleFilterChange('size', e.target.value)}
          value={filters.size || ''}
        >
          <option value="">All</option>
          {(options.size || []).map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
      ) : null}

      <div>
        <h3 className="text-lg font-semibold mb-3">Color Temperature</h3>
        <select
          className="select-field"
          onChange={(e) => handleFilterChange('cct', e.target.value)}
          value={filters.cct || ''}
        >
          <option value="">All</option>
          {options.cct.map((cct) => (
            <option key={cct} value={cct}>
              {cct}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Beam Angle</h3>
        <select
          className="select-field"
          onChange={(e) => handleFilterChange('beam_angle', e.target.value)}
          value={filters.beam_angle || ''}
        >
          <option value="">All</option>
          {options.beam_angle.map((angle) => (
            <option key={angle} value={angle}>
              {angle}°
            </option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Dimming</h3>
        <select
          className="select-field"
          onChange={(e) => handleFilterChange('dimming', e.target.value)}
          value={filters.dimming || ''}
        >
          <option value="">All</option>
          {options.dimming.map((dim) => (
            <option key={dim} value={dim}>
              {dim}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
} 