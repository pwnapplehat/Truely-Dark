import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  REGISTERED_SCRIPT_IDS,
  registerGalleryContentScripts,
  registerPersistentContentScripts,
  safeRegisterContentScripts,
} from '../src/lib/register-content-scripts';

type RegisteredEntry = { id: string };

function createScriptingMock() {
  const registered: RegisteredEntry[] = [];

  return {
    registered,
    getRegisteredContentScripts: vi.fn(async () =>
      registered.map((entry) => ({ id: entry.id })),
    ),
    unregisterContentScripts: vi.fn(async ({ ids }: { ids: string[] }) => {
      for (const id of ids) {
        const index = registered.findIndex((entry) => entry.id === id);
        if (index >= 0) registered.splice(index, 1);
      }
    }),
    registerContentScripts: vi.fn(async (scripts: Array<{ id: string }>) => {
      for (const script of scripts) {
        if (registered.some((entry) => entry.id === script.id)) {
          throw new Error(`Duplicate script ID '${script.id}'`);
        }
        registered.push({ id: script.id });
      }
    }),
  };
}

describe('registerContentScripts', () => {
  it('defines MAIN bootstrap and ISOLATED bridge script ids', () => {
    expect(REGISTERED_SCRIPT_IDS.mainBootstrap).toBe('truely-dark-main-bootstrap');
    expect(REGISTERED_SCRIPT_IDS.isolatedBridge).toBe('truely-dark-isolated-bridge');
  });
});

describe('safeRegisterContentScripts', () => {
  let scripting: ReturnType<typeof createScriptingMock>;

  beforeEach(() => {
    scripting = createScriptingMock();
    vi.stubGlobal('browser', { scripting: scripting });
  });

  it('second register call does not reject when IDs already exist', async () => {
    const scripts = [
      {
        id: REGISTERED_SCRIPT_IDS.mainBootstrap,
        matches: ['<all_urls>'],
        runAt: 'document_start' as const,
        world: 'MAIN' as const,
        allFrames: true,
        persistAcrossSessions: true,
        js: ['truely-dark-main-bootstrap.js'],
      },
    ];

    await safeRegisterContentScripts(scripts);
    await expect(safeRegisterContentScripts(scripts)).resolves.toBe(true);
    expect(scripting.registerContentScripts).toHaveBeenCalledTimes(2);
    expect(scripting.unregisterContentScripts).toHaveBeenCalled();
  });

  it('registerPersistentContentScripts twice does not throw', async () => {
    await registerPersistentContentScripts();
    await expect(registerPersistentContentScripts()).resolves.toBeUndefined();
    expect(scripting.registerContentScripts).toHaveBeenCalled();
  });

  it('registerGalleryContentScripts twice does not throw', async () => {
    await registerGalleryContentScripts();
    await expect(registerGalleryContentScripts()).resolves.toBeUndefined();
    expect(scripting.registerContentScripts).toHaveBeenCalled();
  });
});
