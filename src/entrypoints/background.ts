import { registerBackgroundHandlers } from '../lib/background-handlers';
import { registerPersistentContentScripts } from '../lib/register-content-scripts';

export default defineBackground(() => {
  void registerPersistentContentScripts();
  registerBackgroundHandlers();
});
