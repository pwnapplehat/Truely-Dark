import { z } from 'zod';

export const siteModeSchema = z.enum(['auto', 'soft', 'on', 'off']);

export const presetIdSchema = z.enum([
  'midnight',
  'oled',
  'paper-night',
  'high-contrast',
  'custom',
]);

export const detectResultSchema = z.enum(['dark', 'light', 'unknown']);

export const siteOverrideSchema = z.object({
  mode: siteModeSchema,
  brightness: z.number().min(0).max(200).optional(),
  contrast: z.number().min(0).max(200).optional(),
  sepia: z.number().min(0).max(100).optional(),
  preserveMedia: z.boolean().optional(),
  addedAt: z.number(),
});

export const scheduleSettingsSchema = z.object({
  enabled: z.boolean(),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  followSystem: z.boolean(),
});

export const settingsSchema = z.object({
  enabled: z.boolean(),
  defaultMode: siteModeSchema,
  brightness: z.number().min(0).max(200),
  contrast: z.number().min(0).max(200),
  sepia: z.number().min(0).max(100),
  preserveMedia: z.boolean(),
  preset: presetIdSchema,
  schedule: scheduleSettingsSchema,
  siteOverrides: z.record(z.string(), siteOverrideSchema),
  detectCache: z.record(
    z.string(),
    z.object({
      result: detectResultSchema,
      timestamp: z.number(),
    }),
  ),
});

export const sitePackSchema = z.object({
  origins: z.array(z.string()),
  mode: siteModeSchema,
  invertSelectors: z.array(z.string()).optional(),
  ignoreImages: z.boolean().optional(),
  customCss: z.string().optional(),
  skipDetect: z.boolean().optional(),
});

export const importPayloadSchema = z.object({
  version: z.literal(1),
  settings: settingsSchema,
  exportedAt: z.string().optional(),
});

export type SettingsInput = z.input<typeof settingsSchema>;
export type SettingsOutput = z.output<typeof settingsSchema>;

/**
 * Validate settings object; returns parsed settings or throws ZodError.
 */
export function parseSettings(data: unknown): SettingsOutput {
  return settingsSchema.parse(data);
}

/**
 * Safely validate settings; returns null if invalid.
 */
export function safeParseSettings(data: unknown): SettingsOutput | null {
  const result = settingsSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Merge partial settings with defaults and validate.
 */
export function mergeWithDefaults(
  partial: Partial<SettingsInput>,
  defaults: SettingsOutput,
): SettingsOutput {
  return settingsSchema.parse({ ...defaults, ...partial });
}
