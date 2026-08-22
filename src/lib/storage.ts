import type { TruelyDarkSettings } from '../types';
import { STORAGE_KEY } from '../types';
import { DEFAULT_SETTINGS, cloneSettings, migrateSettings, validateSettings } from './defaults';

let cachedSettings: TruelyDarkSettings | null = null;

export async function getSettings(): Promise<TruelyDarkSettings> {
  if (cachedSettings) return cloneSettings(cachedSettings);

  const result = await browser.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY];

  if (stored) {
    try {
      cachedSettings = migrateSettings(stored as Record<string, unknown>);
      return cloneSettings(cachedSettings);
    } catch {
      cachedSettings = cloneSettings(DEFAULT_SETTINGS);
      return cloneSettings(cachedSettings);
    }
  }

  cachedSettings = cloneSettings(DEFAULT_SETTINGS);
  await browser.storage.local.set({ [STORAGE_KEY]: cachedSettings });
  return cloneSettings(cachedSettings);
}

export async function setSettings(settings: TruelyDarkSettings): Promise<void> {
  const validated = validateSettings(settings);
  cachedSettings = validated;
  await browser.storage.local.set({ [STORAGE_KEY]: validated });
}

export async function updateSettings(
  partial: Partial<TruelyDarkSettings>,
): Promise<TruelyDarkSettings> {
  const current = await getSettings();
  const merged = validateSettings({ ...current, ...partial });
  await setSettings(merged);
  return merged;
}

export function invalidateSettingsCache(): void {
  cachedSettings = null;
}

export function onSettingsChanged(
  callback: (settings: TruelyDarkSettings) => void,
): () => void {
  const listener = (
    changes: Record<string, Browser.storage.StorageChange>,
    area: string,
  ) => {
    if (area !== 'local' || !changes[STORAGE_KEY]) return;
    invalidateSettingsCache();
    const newValue = changes[STORAGE_KEY].newValue;
    if (newValue) {
      try {
        callback(migrateSettings(newValue as Record<string, unknown>));
      } catch {
        callback(cloneSettings(DEFAULT_SETTINGS));
      }
    }
  };

  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
