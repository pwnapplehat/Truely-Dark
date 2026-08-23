import { describe, expect, it } from 'vitest';
import { REGISTERED_SCRIPT_IDS } from '../src/lib/register-content-scripts';

describe('registerContentScripts', () => {
  it('defines MAIN bootstrap and ISOLATED bridge script ids', () => {
    expect(REGISTERED_SCRIPT_IDS.mainBootstrap).toBe('truely-dark-main-bootstrap');
    expect(REGISTERED_SCRIPT_IDS.isolatedBridge).toBe('truely-dark-isolated-bridge');
  });
});
