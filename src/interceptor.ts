let capturedAppId: string | null = null;

/**
 * Returns the captured x-ig-app-id, or null if not yet intercepted.
 */
export function getAppId(): string | null {
  return capturedAppId;
}

/**
 * Patches window.fetch to intercept x-ig-app-id from Instagram's own requests.
 * Call once on script load. Safe to call multiple times (only patches once).
 */
export function installInterceptor(): void {
  if ((window as any).__uninstaInterceptorInstalled) return;
  (window as any).__uninstaInterceptorInstalled = true;

  const originalFetch = window.fetch;

  window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    if (!capturedAppId) {
      // Check init.headers first (most common)
      if (init?.headers) {
        const appId = extractAppId(init.headers);
        if (appId) {
          capturedAppId = appId;
          console.log('[unInsta] Captured x-ig-app-id:', appId);
        }
      }
      // Also check Request object headers (fetch(new Request(url, opts)))
      if (!capturedAppId && input instanceof Request) {
        const appId = input.headers.get('x-ig-app-id');
        if (appId) {
          capturedAppId = appId;
          console.log('[unInsta] Captured x-ig-app-id:', appId);
        }
      }
    }
    return originalFetch.call(window, input, init);
  };
}

/**
 * Actively try to find the app ID by scanning the page.
 * Useful when the extension loads after Instagram's initial requests.
 * Returns true if found, false otherwise.
 */
export function tryExtractAppIdFromPage(): boolean {
  if (capturedAppId) return true;

  // 1. Check common Instagram global objects
  const globals = [
    (window as any).__igWSHandshakeData,
    (window as any)._sharedData,
    (window as any).__additionalDataLoaded,
  ];
  for (const obj of globals) {
    if (obj) {
      const found = deepSearchAppId(obj, 3);
      if (found) {
        capturedAppId = found;
        console.log('[unInsta] Found x-ig-app-id in page globals:', found);
        return true;
      }
    }
  }

  // 2. Scan inline script tags for the app ID pattern (numeric string, typically 15 digits)
  const scripts = document.querySelectorAll('script:not([src])');
  const appIdPattern = /["']X-IG-App-ID["']\s*:\s*["'](\d{10,20})["']/i;
  const altPattern = /instagramWebDesktopFBAppId["']\s*:\s*["'](\d{10,20})["']/;
  const altPattern2 = /app_id["']\s*:\s*["'](\d{10,20})["']/;

  for (const script of scripts) {
    const text = script.textContent || '';
    for (const pattern of [appIdPattern, altPattern, altPattern2]) {
      const match = text.match(pattern);
      if (match) {
        capturedAppId = match[1];
        console.log('[unInsta] Found x-ig-app-id in page scripts:', capturedAppId);
        return true;
      }
    }
  }

  // 3. Check require/module system (Instagram bundles)
  try {
    const requireFn = (window as any).require;
    if (typeof requireFn === 'function') {
      // Instagram sometimes exposes config via their module system
      const config = requireFn('InstagramWebBrowserAppId') || requireFn('CurrentUserInitialData');
      if (config?.APP_ID) {
        capturedAppId = String(config.APP_ID);
        console.log('[unInsta] Found x-ig-app-id via require():', capturedAppId);
        return true;
      }
    }
  } catch {}

  return false;
}

function deepSearchAppId(obj: any, maxDepth: number): string | null {
  if (maxDepth <= 0 || !obj || typeof obj !== 'object') return null;
  for (const key of Object.keys(obj)) {
    if (/app.?id/i.test(key) && typeof obj[key] === 'string' && /^\d{10,20}$/.test(obj[key])) {
      return obj[key];
    }
    const found = deepSearchAppId(obj[key], maxDepth - 1);
    if (found) return found;
  }
  return null;
}

function extractAppId(headers: HeadersInit): string | null {
  if (headers instanceof Headers) {
    return headers.get('x-ig-app-id');
  }
  if (Array.isArray(headers)) {
    const entry = headers.find(([key]) => key.toLowerCase() === 'x-ig-app-id');
    return entry ? entry[1] : null;
  }
  if (typeof headers === 'object') {
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === 'x-ig-app-id') return value;
    }
  }
  return null;
}
