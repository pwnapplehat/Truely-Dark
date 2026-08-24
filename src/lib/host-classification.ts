/**
 * Host classification — separates engine policy from site-pack CSS scope.
 * Prevents marketing packs (OVH mega-menu) from matching app SPAs (Manager hub).
 */

/** OVH Manager / control-panel hosts — Angular ODS apps, not marketing Drupal. */
const OVH_MANAGER_HOST_RE =
  /^(?:[a-z0-9-]+\.)*manager(?:\.[a-z0-9-]+)*\.ovhcloud\.com$/i;

/** Marketing-only OVH origins — never suffix-match subdomains like manager.*. */
export const OVH_MARKETING_ORIGINS = ['ovhcloud.com', 'www.ovhcloud.com'] as const;

/** Never invert Soft on these suffixes (marketing hero sites, YouTube, etc.). */
export const PREFER_FORCE_HOST_SUFFIXES = [
  'ovhcloud.com',
  'x.ai',
  'medium.com',
  'youtube.com',
] as const;

export function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().trim();
}

export function isOvhManagerHost(hostname: string): boolean {
  return OVH_MANAGER_HOST_RE.test(normalizeHostname(hostname));
}

export function isOvhMarketingHost(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  return OVH_MARKETING_ORIGINS.some((origin) => normalized === origin);
}

/**
 * True when marketing force shell CSS (hero/card paints) may be applied.
 * Manager and other OVH subdomains must never receive marketing shell rules.
 */
export function hostUsesMarketingForceShell(hostname: string): boolean {
  if (isOvhManagerHost(hostname)) return false;
  if (isOvhMarketingHost(hostname)) return true;
  const normalized = normalizeHostname(hostname);
  if (normalized === 'x.ai' || normalized.endsWith('.x.ai')) return true;
  if (normalized === 'medium.com' || normalized.endsWith('.medium.com')) return true;
  return false;
}

/**
 * App control-panel SPAs (OVH Manager) — never invert, never marketing force paint.
 */
export function hostUsesAppShellSoft(hostname: string): boolean {
  return isOvhManagerHost(hostname);
}

/**
 * Force-stylesheet Soft engine (no invert filter). Manager uses app-shell Soft instead.
 */
export function hostPrefersForceStylesheet(hostname: string): boolean {
  if (isOvhManagerHost(hostname)) return false;

  const normalized = normalizeHostname(hostname);
  for (const suffix of PREFER_FORCE_HOST_SUFFIXES) {
    if (normalized === suffix || normalized.endsWith(`.${suffix}`)) {
      return true;
    }
  }
  return false;
}

export interface SitePackOriginMatch {
  origins: readonly string[];
  /** When true, only exact hostname matches — no `.origin` subdomain inheritance. */
  exactOriginsOnly?: boolean;
}

/**
 * Whether a site pack applies to a hostname.
 */
export function hostMatchesSitePackOrigin(
  hostname: string,
  pack: SitePackOriginMatch,
): boolean {
  const normalized = normalizeHostname(hostname);
  return pack.origins.some((origin) => {
    const o = origin.toLowerCase();
    if (pack.exactOriginsOnly) {
      return normalized === o;
    }
    return normalized === o || normalized.endsWith(`.${o}`);
  });
}
