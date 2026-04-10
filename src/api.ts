import type { AuthCredentials, IGThreadResponse } from './types';

function buildHeaders(auth: AuthCredentials): Record<string, string> {
  return {
    'x-csrftoken': auth.csrfToken,
    'x-ig-app-id': auth.appId,
    'x-ig-www-claim': auth.wwwClaim,
    'x-requested-with': 'XMLHttpRequest',
  };
}

/**
 * Fetch a page of messages from a thread.
 * Returns the parsed response, or throws on non-retryable errors.
 */
export async function fetchThreadMessages(
  threadId: string,
  cursor: string | null,
  auth: AuthCredentials,
): Promise<IGThreadResponse> {
  const url = cursor
    ? `https://www.instagram.com/api/v1/direct_v2/threads/${threadId}/?cursor=${encodeURIComponent(cursor)}`
    : `https://www.instagram.com/api/v1/direct_v2/threads/${threadId}/`;

  const resp = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(auth),
    credentials: 'include',
  });

  if (!resp.ok) {
    const error = new Error(`Fetch messages failed: HTTP ${resp.status}`) as Error & {
      status: number;
      body?: any;
    };
    error.status = resp.status;
    try { error.body = await resp.json(); } catch {}
    throw error;
  }

  return resp.json();
}

export interface UnsendResult {
  status: number;
  retryAfter?: number; // seconds, from 429 response body
}

/**
 * Unsend (delete) a single message.
 * Returns the HTTP status code and retry_after (if rate limited).
 */
export async function unsendMessage(
  threadId: string,
  itemId: string,
  auth: AuthCredentials,
): Promise<UnsendResult> {
  const url = `https://www.instagram.com/api/v1/direct_v2/threads/${threadId}/items/${itemId}/delete/`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      ...buildHeaders(auth),
      'content-type': 'application/x-www-form-urlencoded',
    },
    credentials: 'include',
  });

  if (resp.status === 429) {
    let retryAfter: number | undefined;
    try {
      const body = await resp.json();
      retryAfter = body.retry_after;
    } catch {}
    return { status: 429, retryAfter };
  }

  return { status: resp.status };
}
