import {
  collectSpecRows,
  datasheetFilename,
  familyDatasheetFilename,
  formatSpecValue,
  GENERAL_LABEL_FILENAME,
  installationFilename,
  labelFilename,
  PHYSICAL_SPEC_FIELDS,
  SpecField,
  SpecRow,
} from './shared/product-specs';

export {
  collectSpecRows,
  datasheetFilename,
  familyDatasheetFilename,
  formatSpecValue,
  GENERAL_LABEL_FILENAME,
  installationFilename,
  labelFilename,
  PHYSICAL_SPEC_FIELDS,
};
export type { SpecField, SpecRow };

export const DATASHEET_PHYSICAL_FIELDS: SpecField[] = [
  { label: 'Size', key: 'dimensions' },
  { label: 'Cuthole', key: 'cutout_size' },
  { label: 'Mountings', key: 'mounting_type' },
  { label: 'Finish', key: 'colour' },
  { label: 'Trim', key: 'trim_color' },
  { label: 'Reflector', key: 'reflector_finish' },
  { label: 'Orientation', key: 'orientation' },
  { label: 'Material', key: 'material' },
];

export const DATASHEET_TECHNICAL_FIELDS: SpecField[] = [
  { label: 'Lamp Source', key: 'lamp_source' },
  { label: 'Source Lumen', key: 'lumen', suffix: 'lm' },
  { label: 'System Lumen', key: 'system_lumen', suffix: 'lm' },
  { label: 'LED Power', key: 'wattage', suffix: 'W' },
  { label: 'Luminaire Efficacy', key: 'efficacy', suffix: 'lm/W' },
  { label: 'Color Temperature (CCT)', key: 'cct' },
  { label: 'Beam Angle', key: 'beam_angle', suffix: '°' },
  { label: 'CRI', key: 'cri' },
  { label: 'Ingress Protection (IP)', key: 'ip_rating' },
  { label: 'Lifetime', key: 'lifetime' },
  { label: 'Driver', key: 'driver_type' },
  { label: 'Control', key: 'dimming' },
  { label: 'Power Factor', key: 'power_factor' },
  { label: 'Input', key: 'input_voltage' },
  { label: 'Warranty', key: 'warranty' },
  { label: 'Optic', key: 'optic' },
  { label: 'Operating Temperature', key: 'operating_temperature' },
];

export const LABEL_SPEC_FIELDS: SpecField[] = [
  { label: 'Power', key: 'wattage', suffix: 'W' },
  { label: 'Input', key: 'input_voltage' },
  { label: 'Source Lumen', key: 'lumen', suffix: 'lm' },
  { label: 'CCT', key: 'cct' },
  { label: 'CRI', key: 'cri' },
  { label: 'IP', key: 'ip_rating' },
  { label: 'Beam', key: 'beam_angle', suffix: '°' },
  { label: 'Control', key: 'dimming' },
  { label: 'Life', key: 'lifetime' },
];

export const INSTALLATION_FIELDS: SpecField[] = [
  { label: 'Mounting', key: 'mounting_type' },
  { label: 'Size', key: 'dimensions' },
  { label: 'Cuthole', key: 'cutout_size' },
  { label: 'Ingress Protection (IP)', key: 'ip_rating' },
  { label: 'Input', key: 'input_voltage' },
  { label: 'Driver', key: 'driver_type' },
  { label: 'Control', key: 'dimming' },
];
