/** A single message node from Instagram's GraphQL thread response. */
export interface IGMessage {
  message_id: string; // "REDACTED_MESSAGE_ID"
  sender_id: string;
  timestamp_ms: number; // milliseconds
  message?: { text?: string };
  __typename?: string;
}

/** Pagination info from GraphQL Relay response. */
export interface IGPageInfo {
  has_previous_page: boolean;
  start_cursor: string | null;
  end_cursor: string | null;
  has_next_page: boolean;
}

/** Thread info extracted from page state. */
export interface IGThreadInfo {
  threadFbid: string; // "REDACTED_THREAD_FBID" - used in GraphQL queries
  threadId: string; // "340282366841710301..." - used in unsend mutation
}

/** Collected auth credentials needed for API requests. */
export interface AuthCredentials {
  csrfToken: string;
  userId: string;
  appId: string;
  wwwClaim: string;
  fbDtsg: string;
  lsd: string;
}

/** Tracks progress of the unsend loop. */
export interface EngineState {
  running: boolean;
  totalFound: number;
  unsentCount: number;
  skippedCount: number;
  failedCount: number;
  currentPage: number;
}

/** Callbacks from the engine to the UI layer. */
export interface EngineCallbacks {
  onLog: (message: string, level: 'info' | 'success' | 'warn' | 'error' | 'debug') => void;
  onProgress: (state: EngineState) => void;
  onComplete: (state: EngineState) => void;
}

/** Boundary configuration for limiting which messages to unsend. */
export interface Boundary {
  /** Message message_id to stop before (from click-to-pick). */
  messageId?: string;
  /** Timestamp in milliseconds to stop before (from datetime input). */
  timestamp?: number;
}
