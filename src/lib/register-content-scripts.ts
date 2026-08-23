export const REGISTERED_SCRIPT_IDS = {
  mainBootstrap: 'truely-dark-main-bootstrap',
  isolatedBridge: 'truely-dark-isolated-bridge',
} as const;

const BOOTSTRAP_FILES = {
  main: 'truely-dark-main-bootstrap.js',
  isolated: 'truely-dark-isolated-bridge.js',
} as const;

/**
 * Register document_start MAIN + ISOLATED scripts (persistAcrossSessions, all frames).
 * Mirrors early-injection pattern used by production dark extensions on Polymer/Lit hosts.
 */
export async function registerPersistentContentScripts(): Promise<void> {
  const ids = Object.values(REGISTERED_SCRIPT_IDS);

  try {
    await browser.scripting.unregisterContentScripts({ ids });
  } catch {
    // First install — nothing to unregister
  }

  await browser.scripting.registerContentScripts([
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
  ]);
}
