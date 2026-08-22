import { registerBackgroundHandlers } from '../lib/background-handlers';

export default defineBackground(() => {
  registerBackgroundHandlers();
});
