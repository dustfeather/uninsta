import type { AuthCredentials, IGMessage, IGPageInfo } from './types';

const GRAPHQL_URL = 'https://www.instagram.com/api/graphql';
const DOC_ID_MESSAGES = '26252548844395561'; // IGDMessageListOffMsysQuery
const DOC_ID_UNSEND = '24812777031749983'; // IGDMessageUnsendDialogOffMsysMutation

/**
 * Build the common form body params for GraphQL requests.
 */
function buildBody(
  auth: AuthCredentials,
  friendlyName: string,
  docId: string,
  variables: Record<string, unknown>,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set('__d', 'www');
  params.set('__user', '0');
  params.set('__a', '1');
  params.set('fb_dtsg', auth.fbDtsg);
  params.set('lsd', auth.lsd);
  params.set('fb_api_caller_class', 'RelayModern');
  params.set('fb_api_req_friendly_name', friendlyName);
  params.set('server_timestamps', 'true');
  params.set('variables', JSON.stringify(variables));
  params.set('doc_id', docId);
  return params;
}

/**
 * Build headers for GraphQL requests.
 */
function buildHeaders(auth: AuthCredentials, friendlyName: string): Record<string, string> {
  return {
    'content-type': 'application/x-www-form-urlencoded',
    'x-csrftoken': auth.csrfToken,
    'x-fb-friendly-name': friendlyName,
    'x-fb-lsd': auth.lsd,
    'x-ig-app-id': auth.appId,
  };
}

export interface MessageListResult {
  messages: IGMessage[];
  pageInfo: IGPageInfo;
}

/**
 * Fetch a page of messages from a thread via GraphQL.
 * Uses Relay-style cursor pagination.
 */
export async function fetchThreadMessages(
  threadFbid: string,
  cursor: string | null,
  auth: AuthCredentials,
): Promise<MessageListResult> {
  const friendlyName = 'IGDMessageListOffMsysQuery';
  const variables: Record<string, unknown> = {
    id: threadFbid,
    first: 20,
    after: cursor,
    before: null,
    last: null,
    newer_than_message_id: null,
    older_than_message_id: null,
    __relay_internal__pv__IGDInitialMessagePageCountrelayprovider: 20,
    __relay_internal__pv__IGDEnableOffMsysPinnedMessagesQErelayprovider: false,
  };

  const resp = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: buildHeaders(auth, friendlyName),
    body: buildBody(auth, friendlyName, DOC_ID_MESSAGES, variables),
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

  const json = await resp.json();
  // Navigate the GraphQL response structure
  // Response: { data: { fetch__SlideThread: { as_ig_direct_thread: { slide_messages: { edges: [...], page_info: {...} } } } } }
  const slideThread = json?.data?.fetch__SlideThread?.as_ig_direct_thread;
  const messagesConnection = slideThread?.slide_messages;

  if (!messagesConnection?.edges) {
    return { messages: [], pageInfo: { has_previous_page: false, start_cursor: null, end_cursor: null, has_next_page: false } };
  }

  const messages: IGMessage[] = messagesConnection.edges.map((edge: any) => {
    const msg = edge.node;
    // Extract text from the content structure
    let text: string | undefined;
    if (msg.content?.__typename === 'SlideMessageText') {
      text = msg.text_body || msg.content?.text_body;
    } else if (msg.content?.xma?.xmaTitle) {
      text = msg.content.xma.xmaTitle;
    }

    return {
      message_id: msg.message_id,
      // sender_fbid is the primary ID, but also store sender.igid for matching
      sender_id: String(msg.sender?.igid || msg.sender_fbid || ''),
      timestamp_ms: typeof msg.timestamp_ms === 'string' ? parseInt(msg.timestamp_ms, 10) : (msg.timestamp_ms || 0),
      message: text ? { text } : undefined,
      __typename: msg.content?.__typename || 'unknown',
    };
  });

  const pageInfo: IGPageInfo = messagesConnection.page_info || {
    has_previous_page: false,
    start_cursor: null,
    end_cursor: null,
    has_next_page: false,
  };

  return { messages, pageInfo };
}

export interface UnsendResult {
  status: number;
  retryAfter?: number;
}

/**
 * Unsend (delete) a single message via GraphQL mutation.
 */
export async function unsendMessage(
  threadId: string,
  messageId: string,
  auth: AuthCredentials,
): Promise<UnsendResult> {
  const friendlyName = 'IGDMessageUnsendDialogOffMsysMutation';
  const variables = {
    message_id: messageId,
    send_data: {
      thread_id: threadId,
    },
  };

  const resp = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: buildHeaders(auth, friendlyName),
    body: buildBody(auth, friendlyName, DOC_ID_UNSEND, variables),
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
