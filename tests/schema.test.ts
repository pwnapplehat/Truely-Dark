import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, migrateSettings } from '../src/lib/defaults';
import {
  buildExportPayload,
  importPayloadSchema,
  mergeWithDefaults,
  parseImportPayload,
  parseSettings,
  safeParseSettings,
  settingsSchema,
  siteOverrideSchema,
} from '../src/lib/schema';

describe('settingsSchema', () => {
  it('validates default settings including batterySaver', () => {
    const result = settingsSchema.safeParse(DEFAULT_SETTINGS);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.batterySaver).toBe(false);
    }
  });

  it('rejects invalid brightness', () => {
    const invalid = { ...DEFAULT_SETTINGS, brightness: 300 };
    const result = settingsSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects invalid site mode', () => {
    const invalid = { ...DEFAULT_SETTINGS, defaultMode: 'invalid' };
    const result = settingsSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects invalid schedule time format', () => {
    const invalid = {
      ...DEFAULT_SETTINGS,
      schedule: { ...DEFAULT_SETTINGS.schedule, start: '8:00' },
    };
    const result = settingsSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('accepts valid site overrides', () => {
    const withOverrides = {
      ...DEFAULT_SETTINGS,
      siteOverrides: {
        'https://github.com': {
          mode: 'soft' as const,
          addedAt: Date.now(),
        },
      },
    };
    const result = settingsSchema.safeParse(withOverrides);
    expect(result.success).toBe(true);
  });
});

describe('siteOverrideSchema', () => {
  it('validates minimal override', () => {
    const result = siteOverrideSchema.safeParse({
      mode: 'auto',
      addedAt: 1234567890,
    });
    expect(result.success).toBe(true);
  });

  it('validates override with optional fields', () => {
    const result = siteOverrideSchema.safeParse({
      mode: 'soft',
      brightness: 110,
      contrast: 105,
      sepia: 10,
      preserveMedia: true,
      addedAt: Date.now(),
    });
    expect(result.success).toBe(true);
  });
});

describe('parseSettings', () => {
  it('parses valid settings', () => {
    const parsed = parseSettings(DEFAULT_SETTINGS);
    expect(parsed.enabled).toBe(true);
    expect(parsed.defaultMode).toBe('auto');
  });

  it('throws on invalid data', () => {
    expect(() => parseSettings({ enabled: 'yes' })).toThrow();
  });
});

describe('safeParseSettings', () => {
  it('returns null for invalid data', () => {
    expect(safeParseSettings(null)).toBeNull();
    expect(safeParseSettings({ bad: true })).toBeNull();
  });

  it('returns parsed settings for valid data', () => {
    const result = safeParseSettings(DEFAULT_SETTINGS);
    expect(result).not.toBeNull();
    expect(result?.enabled).toBe(true);
  });
});

describe('mergeWithDefaults', () => {
  it('merges partial settings with defaults', () => {
    const merged = mergeWithDefaults({ brightness: 120 }, DEFAULT_SETTINGS);
    expect(merged.brightness).toBe(120);
    expect(merged.contrast).toBe(DEFAULT_SETTINGS.contrast);
  });
});

describe('importPayloadSchema', () => {
  it('validates export format', () => {
    const payload = {
      version: 1 as const,
      settings: DEFAULT_SETTINGS,
      exportedAt: '2026-01-01T00:00:00.000Z',
    };
    const result = importPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('rejects wrong version', () => {
    const payload = {
      version: 2,
      settings: DEFAULT_SETTINGS,
    };
    const result = importPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

describe('import/export roundtrip', () => {
  it('preserves settings through export and import', () => {
    const customized = {
      ...DEFAULT_SETTINGS,
      brightness: 110,
      batterySaver: true,
      siteOverrides: {
        'https://example.com': { mode: 'soft' as const, addedAt: 1700000000000 },
      },
      detectCache: {
        'https://github.com': {
          result: 'dark' as const,
          confidence: 'high' as const,
          timestamp: 1700000000000,
        },
      },
    };

    const exported = buildExportPayload(customized);
    const imported = parseImportPayload(exported);

    expect(imported.brightness).toBe(110);
    expect(imported.batterySaver).toBe(true);
    expect(imported.siteOverrides['https://example.com']?.mode).toBe('soft');
    expect(imported.detectCache['https://github.com']?.confidence).toBe('high');
  });

  it('migrates legacy detect cache and purges poisoned medium-dark entries', () => {
    const legacy: Record<string, unknown> = {
      ...DEFAULT_SETTINGS,
      detectCache: {
        'https://github.com': { result: 'dark', timestamp: Date.now() },
        'https://en.wikipedia.org': {
          result: 'dark',
          confidence: 'medium',
          timestamp: Date.now(),
        },
      },
    };
    delete legacy.batterySaver;

    const migrated = migrateSettings(legacy);
    expect(migrated.batterySaver).toBe(false);
    // Legacy dark without confidence defaults to medium → purged
    expect(migrated.detectCache['https://github.com']).toBeUndefined();
    expect(migrated.detectCache['https://en.wikipedia.org']).toBeUndefined();
  });

  it('keeps high-confidence dark cache entries after migration', () => {
    const legacy: Record<string, unknown> = {
      ...DEFAULT_SETTINGS,
      detectCache: {
        'https://github.com': {
          result: 'dark',
          confidence: 'high',
          timestamp: Date.now(),
        },
      },
    };

    const migrated = migrateSettings(legacy);
    expect(migrated.detectCache['https://github.com']?.confidence).toBe('high');
  });
});
