const NON_SCRIPTABLE_PREFIXES = [
  'chrome:',
  'chrome-extension:',
  'edge:',
  'about:',
  'moz-extension:',
  'vivaldi:',
  'opera:',
  'brave:',
  'data:',
  'view-source:',
  'devtools:',
] as const;

/**
 * True for browser-internal URLs where content scripts cannot run (chrome://, about:, etc.).
 * HTTPS pages like chromewebstore.google.com are normal scriptable web pages.
 */
export function isNonScriptableUrl(url: string): boolean {
  if (!url) return true;
  const lower = url.toLowerCase().trim();
  return NON_SCRIPTABLE_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

/**
 * True for http(s) pages where Truely Dark can inject content scripts.
 */
export function isConfigurableWebPage(url: string): boolean {
  if (!url || url === 'about:blank') return false;
  if (isNonScriptableUrl(url)) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
