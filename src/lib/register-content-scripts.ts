export const REGISTERED_SCRIPT_IDS = {
  mainBootstrap: 'truely-dark-main-bootstrap',
  isolatedBridge: 'truely-dark-isolated-bridge',
  galleryMainBootstrap: 'truely-dark-gallery-main-bootstrap',
  galleryIsolatedBridge: 'truely-dark-gallery-isolated-bridge',
} as const;

const BOOTSTRAP_FILES = {
  main: 'truely-dark-main-bootstrap.js',
  isolated: 'truely-dark-isolated-bridge.js',
} as const;

const GALLERY_MATCHES = [
  'https://chromewebstore.google.com/*',
  'https://chrome.google.com/*',
] as const;

const PERSISTENT_SCRIPT_IDS = [
  REGISTERED_SCRIPT_IDS.mainBootstrap,
  REGISTERED_SCRIPT_IDS.isolatedBridge,
] as const;

const GALLERY_SCRIPT_IDS = [
  REGISTERED_SCRIPT_IDS.galleryMainBootstrap,
  REGISTERED_SCRIPT_IDS.galleryIsolatedBridge,
] as const;

let persistentRegisterInFlight: Promise<void> | null = null;
let galleryRegisterInFlight: Promise<void> | null = null;

async function getRegisteredScriptIds(): Promise<string[]> {
  try {
    const registered = await browser.scripting.getRegisteredContentScripts();
    return registered.map((entry) => entry.id);
  } catch {
    return [];
  }
}

async function unregisterScriptIdsIfPresent(ids: readonly string[]): Promise<void> {
  const registered = await getRegisteredScriptIds();
  const toRemove = ids.filter((id) => registered.includes(id));
  if (toRemove.length === 0) return;

  try {
    await browser.scripting.unregisterContentScripts({ ids: toRemove });
  } catch {
    // Already removed or API unavailable
  }
}

/**
 * Register content scripts without throwing on duplicate IDs (unregister first).
 */
export async function safeRegisterContentScripts(
  scripts: Browser.scripting.RegisteredContentScript[],
): Promise<boolean> {
  const ids = scripts.map((script) => script.id);

  try {
    await unregisterScriptIdsIfPresent(ids);
    await browser.scripting.registerContentScripts(scripts);
    return true;
  } catch (firstError) {
    try {
      await unregisterScriptIdsIfPresent(ids);
      await browser.scripting.registerContentScripts(scripts);
      return true;
    } catch {
      console.warn('[Truely Dark] registerContentScripts failed:', firstError);
      return false;
    }
  }
}

const PERSISTENT_SCRIPTS: Browser.scripting.RegisteredContentScript[] = [
  {
    id: REGISTERED_SCRIPT_IDS.mainBootstrap,
    matches: ['<all_urls>'],
    runAt: 'document_start',
    world: 'MAIN',
    allFrames: true,
    persistAcrossSessions: true,
    js: [BOOTSTRAP_FILES.main],
  },
  {
    id: REGISTERED_SCRIPT_IDS.isolatedBridge,
    matches: ['<all_urls>'],
    runAt: 'document_start',
    world: 'ISOLATED',
    allFrames: true,
    persistAcrossSessions: true,
    js: [BOOTSTRAP_FILES.isolated],
  },
];

const GALLERY_SCRIPTS: Browser.scripting.RegisteredContentScript[] = [
  {
    id: REGISTERED_SCRIPT_IDS.galleryMainBootstrap,
    matches: [...GALLERY_MATCHES],
    runAt: 'document_start',
    world: 'MAIN',
    allFrames: true,
    persistAcrossSessions: true,
    js: [BOOTSTRAP_FILES.main],
  },
  {
    id: REGISTERED_SCRIPT_IDS.galleryIsolatedBridge,
    matches: [...GALLERY_MATCHES],
    runAt: 'document_start',
    world: 'ISOLATED',
    allFrames: true,
    persistAcrossSessions: true,
    js: [BOOTSTRAP_FILES.isolated],
  },
];

async function registerPersistentContentScriptsOnce(): Promise<void> {
  const registered = await getRegisteredScriptIds();
  const allPresent = PERSISTENT_SCRIPT_IDS.every((id) => registered.includes(id));
  if (allPresent) return;

  await safeRegisterContentScripts(PERSISTENT_SCRIPTS);
}

async function registerGalleryContentScriptsOnce(): Promise<void> {
  await safeRegisterContentScripts(GALLERY_SCRIPTS);
}

/**
 * Register document_start MAIN + ISOLATED scripts (persistAcrossSessions, all frames).
 * Mirrors early-injection pattern used by production dark extensions on Polymer/Lit hosts.
 */
export async function registerPersistentContentScripts(): Promise<void> {
  if (persistentRegisterInFlight) {
    await persistentRegisterInFlight;
    return;
  }

  persistentRegisterInFlight = registerPersistentContentScriptsOnce().finally(() => {
    persistentRegisterInFlight = null;
  });

  await persistentRegisterInFlight;
}

/**
 * Explicit gallery matches — sideloaded builds may ignore <all_urls> on CWS.
 */
export async function registerGalleryContentScripts(): Promise<void> {
  if (galleryRegisterInFlight) {
    await galleryRegisterInFlight;
    return;
  }

  galleryRegisterInFlight = registerGalleryContentScriptsOnce().finally(() => {
    galleryRegisterInFlight = null;
  });

  await galleryRegisterInFlight;
}
