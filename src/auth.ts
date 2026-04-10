import type { AuthCredentials } from './types';
import { getAppId } from './interceptor';

/**
 * Extract a named value from document.cookie.
 */
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
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
  if (!appId) return { auth: null, reason: 'App ID not captured yet. Please refresh the page and try again.' };

  const wwwClaim = sessionStorage.getItem('www-claim-v2') || '0';

  return { auth: { csrfToken, userId, appId, wwwClaim } };
}

/**
 * Extract the thread ID from the current URL.
 * Expects a URL like: https://www.instagram.com/direct/t/THREAD_ID/
 * Returns null if not on a DM thread page.
 */
export function getThreadId(): string | null {
  const match = window.location.pathname.match(/\/direct\/t\/(\d+)/);
  return match ? match[1] : null;
}
