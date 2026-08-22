import type { PresetId, TruelyDarkSettings } from '../types';
import { settingsSchema } from './schema';

export const DEFAULT_SETTINGS: TruelyDarkSettings = {
  enabled: true,
  defaultMode: 'auto',
  brightness: 98,
  contrast: 92,
  sepia: 0,
  preserveMedia: true,
  batterySaver: false,
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
    description:
      'Comfortable dark gray (#121212) with softened contrast — avoids halation from pure black/white',
    brightness: 98,
    contrast: 92,
    sepia: 0,
    backgroundColor: '#121212',
  },
  oled: {
    id: 'oled',
    name: 'OLED True Black',
    description: 'Pure black (#000) for OLED displays — explicit high-contrast opt-in',
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
    contrast: 90,
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
    backgroundColor: '#0a0a0a',
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

/**
 * Migrate legacy settings objects missing new fields.
 */
export function migrateSettings(data: Record<string, unknown>): TruelyDarkSettings {
  const merged = {
    ...DEFAULT_SETTINGS,
    ...data,
    schedule: { ...DEFAULT_SETTINGS.schedule, ...(data.schedule as object) },
  };

  if (data.batterySaver === undefined) {
    merged.batterySaver = false;
  }

  // Migrate detect cache entries missing confidence
  const cache = (data.detectCache ?? {}) as Record<string, Record<string, unknown>>;
  const detectCache: TruelyDarkSettings['detectCache'] = {};
  for (const [key, entry] of Object.entries(cache)) {
    detectCache[key] = {
      result: entry.result as TruelyDarkSettings['detectCache'][string]['result'],
      confidence: (entry.confidence as TruelyDarkSettings['detectCache'][string]['confidence']) ?? 'medium',
      timestamp: entry.timestamp as number,
    };
  }
  merged.detectCache = detectCache;

  return validateSettings(merged);
}
