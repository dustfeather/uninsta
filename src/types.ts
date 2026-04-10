/** A single message item from Instagram's thread API response. */
export interface IGMessage {
  item_id: string;
  user_id: number;
  timestamp: number; // microseconds
  item_type: string; // "text", "media", "link", "raven_media", etc.
  text?: string;
}

/** Response shape from GET /api/v1/direct_v2/threads/{threadId}/ */
export interface IGThreadResponse {
  thread: {
    thread_id: string;
    thread_title: string;
    items: IGMessage[];
    oldest_cursor: string;
    has_older: boolean;
  };
  status: string;
}

/** Collected auth credentials needed for API requests. */
export interface AuthCredentials {
  csrfToken: string;
  userId: string;
  appId: string;
  wwwClaim: string;
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
  /** Message item_id to stop before (from click-to-pick). */
  messageId?: string;
  /** Timestamp in microseconds to stop before (from datetime input). */
  timestamp?: number;
}
