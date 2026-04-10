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
