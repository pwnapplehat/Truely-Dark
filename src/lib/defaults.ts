import type { PresetId, TruelyDarkSettings } from '../types';
import { settingsSchema } from './schema';

export const DEFAULT_SETTINGS: TruelyDarkSettings = {
  enabled: true,
  defaultMode: 'auto',
  brightness: 100,
  contrast: 100,
  sepia: 0,
  preserveMedia: true,
  preset: 'midnight',
  schedule: {
    enabled: false,
    start: '20:00',
    end: '07:00',
    followSystem: true,
  },
  siteOverrides: {},
  detectCache: {},
};

export interface PresetDefinition {
  id: PresetId;
  name: string;
  description: string;
  brightness: number;
  contrast: number;
  sepia: number;
  backgroundColor: string;
}

export const PRESETS: Record<Exclude<PresetId, 'custom'>, PresetDefinition> = {
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: 'AA-safe dark gray (#121212) — balanced for all-day use',
    brightness: 100,
    contrast: 100,
    sepia: 0,
    backgroundColor: '#121212',
  },
  oled: {
    id: 'oled',
    name: 'OLED True Black',
    description: 'Pure black (#000) for OLED displays — maximum contrast',
    brightness: 90,
    contrast: 110,
    sepia: 0,
    backgroundColor: '#000000',
  },
  'paper-night': {
    id: 'paper-night',
    name: 'Paper Night',
    description: 'Warm, low-blue tones for comfortable evening reading',
    brightness: 95,
    contrast: 95,
    sepia: 15,
    backgroundColor: '#1a1410',
  },
  'high-contrast': {
    id: 'high-contrast',
    name: 'High Contrast',
    description: 'Boosted contrast for improved readability',
    brightness: 105,
    contrast: 130,
    sepia: 0,
    backgroundColor: '#000000',
  },
};

export function applyPreset(
  settings: TruelyDarkSettings,
  presetId: PresetId,
): TruelyDarkSettings {
  if (presetId === 'custom') {
    return { ...settings, preset: 'custom' };
  }
  const preset = PRESETS[presetId];
  return {
    ...settings,
    preset: presetId,
    brightness: preset.brightness,
    contrast: preset.contrast,
    sepia: preset.sepia,
  };
}

export function validateSettings(data: unknown): TruelyDarkSettings {
  return settingsSchema.parse(data) as TruelyDarkSettings;
}

export function cloneSettings(settings: TruelyDarkSettings): TruelyDarkSettings {
  return structuredClone(settings);
}
