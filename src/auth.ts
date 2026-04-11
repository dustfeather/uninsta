import type { AuthCredentials, IGThreadInfo } from './types';
import { getAppId } from './interceptor';

/**
 * Extract a named value from document.cookie.
 */
export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Extract fb_dtsg token from the page.
 * This is embedded in Instagram's HTML/JS and is required for GraphQL requests.
 */
function getFbDtsg(): string | null {
  // Try to find it in script tags
  const scripts = document.querySelectorAll('script:not([src])');
  for (const script of scripts) {
    const text = script.textContent || '';
    // Pattern: "DTSGInitialData",[],{"token":"..."}
    const match = text.match(/["']token["']\s*:\s*["'](NAf[^"']+)["']/);
    if (match) return match[1];
  }

  // Try window.__eqmc (sometimes contains fb_dtsg)
  try {
    const eqmc = (window as any).__eqmc;
    if (eqmc?.f) return eqmc.f;
  } catch {}

  // Try require('DTSGInitData')
  try {
    const requireFn = (window as any).require;
    if (typeof requireFn === 'function') {
      const dtsg = requireFn('DTSGInitData') || requireFn('DTSGInitialData');
      if (dtsg?.token) return dtsg.token;
    }
  } catch {}

  return null;
}

/**
 * Extract the LSD token from the page.
 */
function getLsd(): string | null {
  // Check meta tag
  const meta = document.querySelector('meta[name="lsd"]');
  if (meta) return meta.getAttribute('content');

  // Check script tags
  const scripts = document.querySelectorAll('script:not([src])');
  for (const script of scripts) {
    const text = script.textContent || '';
    const match = text.match(/["']LSD["']\s*,\s*\[\]\s*,\s*\{["']token["']\s*:\s*["']([^"']+)["']/);
    if (match) return match[1];
  }

  return null;
}

/**
 * Attempt to gather all auth credentials.
 * Returns null with a reason string if any credential is missing.
 */
export function getAuth(): { auth: AuthCredentials } | { auth: null; reason: string } {
  const csrfToken = getCookie('csrftoken');
  if (!csrfToken) return { auth: null, reason: 'Not logged in. Please log in to Instagram.' };

  const userId = getCookie('ds_user_id');
  if (!userId) return { auth: null, reason: 'Not logged in. Please log in to Instagram.' };

  const appId = getAppId();
  if (!appId) return { auth: null, reason: 'App ID not captured yet. Click Retry or refresh the page.' };

  const wwwClaim = sessionStorage.getItem('www-claim-v2') || '0';

  const fbDtsg = getFbDtsg();
  if (!fbDtsg) return { auth: null, reason: 'Could not find fb_dtsg token. Please refresh the page.' };

  const lsd = getLsd();
  if (!lsd) return { auth: null, reason: 'Could not find LSD token. Please refresh the page.' };

  return { auth: { csrfToken, userId, appId, wwwClaim, fbDtsg, lsd } };
}

/**
 * Extract thread info from the page's inline scripts.
 * Instagram embeds thread_fbid and thread_igid in the PolarisDirectInboxRoot props.
 */
export function getThreadInfo(): IGThreadInfo | null {
  const scripts = document.querySelectorAll('script:not([src])');

  for (const script of scripts) {
    const text = script.textContent || '';

    // Look for the PolarisDirectInboxRoot props pattern:
    // "thread_igid":"REDACTED_THREAD_IGID","thread_fbid":"REDACTED_THREAD_FBID"
    const igidMatch = text.match(/"thread_igid"\s*:\s*"(\d{30,})"/);
    const fbidMatch = text.match(/"thread_fbid"\s*:\s*"(\d+)"/);

    if (igidMatch && fbidMatch) {
      return {
        threadFbid: fbidMatch[1],
        threadId: igidMatch[1],
      };
    }
  }

  return null;
}

/**
 * Extract the thread URL ID from the current URL.
 * Expects a URL like: https://www.instagram.com/direct/t/THREAD_ID/
 * Returns null if not on a DM thread page.
 */
export function getThreadId(): string | null {
  const match = window.location.pathname.match(/\/direct\/t\/(\d+)/);
  return match ? match[1] : null;
}
