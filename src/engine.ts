import type { AuthCredentials, Boundary, EngineCallbacks, EngineState, IGMessage } from './types';
import { fetchThreadMessages, unsendMessage } from './api';

const BASE_DELETE_DELAY = 3500;
const MAX_DELETE_DELAY = 15000;
const DELETE_JITTER = 500;
const FETCH_DELAY = 2000;
const MAX_RETRIES = 3;

function jitteredDelay(base: number, jitter: number): number {
  return base + Math.floor(Math.random() * jitter * 2) - jitter;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determine the effective boundary timestamp in microseconds.
 * If both picker and datetime boundaries are set, use the more restrictive one (the newer/larger timestamp).
 */
function resolveBoundaryTimestamp(boundary: Boundary | null): number | null {
  if (!boundary) return null;

  const values: number[] = [];
  if (boundary.timestamp != null) values.push(boundary.timestamp);
  // messageId boundary is resolved to a timestamp during the fetch loop (see engine loop below).
  // This function only handles the timestamp input.
  if (values.length === 0) return null;
  return Math.max(...values);
}

export class UnsendEngine {
  private state: EngineState = {
    running: false,
    totalFound: 0,
    unsentCount: 0,
    skippedCount: 0,
    failedCount: 0,
    currentPage: 0,
  };

  private deleteDelay = BASE_DELETE_DELAY;
  private abortFlag = false;

  constructor(
    private threadId: string,
    private auth: AuthCredentials,
    private boundary: Boundary | null,
    private callbacks: EngineCallbacks,
  ) {}

  async start(): Promise<void> {
    this.abortFlag = false;
    this.state = {
      running: true,
      totalFound: 0,
      unsentCount: 0,
      skippedCount: 0,
      failedCount: 0,
      currentPage: 0,
    };
    this.deleteDelay = BASE_DELETE_DELAY;
    this.callbacks.onProgress(this.state);

    const boundaryTimestamp = resolveBoundaryTimestamp(this.boundary);
    const boundaryMessageId = this.boundary?.messageId ?? null;

    let cursor: string | null = null;
    let reachedBoundary = false;

    this.callbacks.onLog('Starting unsend process...', 'info');

    try {
      while (!reachedBoundary) {
        if (this.abortFlag) {
          this.callbacks.onLog('Stopped by user.', 'warn');
          break;
        }

        this.state.currentPage++;
        this.callbacks.onLog(`Fetching page ${this.state.currentPage}...`, 'debug');

        const data = await fetchThreadMessages(this.threadId, cursor, this.auth);
        const items = data.thread.items;

        if (!items || items.length === 0) {
          this.callbacks.onLog('No more messages found.', 'info');
          break;
        }

        // Filter to own messages
        const ownMessages = items.filter(
          (msg) => String(msg.user_id) === this.auth.userId,
        );

        for (const msg of ownMessages) {
          if (this.abortFlag) break;

          // Check boundary by message ID
          if (boundaryMessageId && msg.item_id === boundaryMessageId) {
            reachedBoundary = true;
            this.callbacks.onLog('Reached boundary message. Stopping.', 'info');
            break;
          }

          // Check boundary by timestamp
          if (boundaryTimestamp != null && msg.timestamp < boundaryTimestamp) {
            reachedBoundary = true;
            this.callbacks.onLog('Reached timestamp boundary. Stopping.', 'info');
            break;
          }

          this.state.totalFound++;
          const preview = msg.text
            ? `"${msg.text.substring(0, 40)}${msg.text.length > 40 ? '...' : ''}"`
            : `[${msg.item_type}]`;

          this.callbacks.onLog(
            `[${this.state.unsentCount + this.state.failedCount + 1}] Unsending ${preview}`,
            'debug',
          );

          const success = await this.unsendWithRetry(msg);

          if (success) {
            this.state.unsentCount++;
            this.callbacks.onLog(
              `[${this.state.unsentCount}] ${preview} - OK`,
              'success',
            );
          } else {
            this.state.failedCount++;
            this.callbacks.onLog(
              `${preview} - FAILED after ${MAX_RETRIES} retries`,
              'error',
            );
          }

          this.callbacks.onProgress(this.state);

          const delay = jitteredDelay(this.deleteDelay, DELETE_JITTER);
          this.callbacks.onLog(`Waiting ${(delay / 1000).toFixed(1)}s...`, 'debug');
          await wait(delay);
        }

        // Check if there are more pages
        if (
          !data.thread.has_older ||
          data.thread.oldest_cursor === 'MINCURSOR'
        ) {
          this.callbacks.onLog('Reached end of conversation.', 'info');
          break;
        }

        cursor = data.thread.oldest_cursor;

        // Delay between page fetches
        await wait(FETCH_DELAY);
      }
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        this.callbacks.onLog('Session expired. Please refresh and log in again.', 'error');
      } else {
        this.callbacks.onLog(`Unexpected error: ${err.message}`, 'error');
      }
    }

    this.state.running = false;
    this.callbacks.onComplete(this.state);
  }

  stop(): void {
    this.abortFlag = true;
  }

  private async unsendWithRetry(msg: IGMessage): Promise<boolean> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const result = await unsendMessage(this.threadId, msg.item_id, this.auth);

      if (result.status === 200 || result.status === 204) {
        return true;
      }

      if (result.status === 429) {
        // Rate limited -- use retry_after from response + 3s cooldown
        const retryAfterMs = (result.retryAfter ?? 3) * 1000;
        const backoff = retryAfterMs + 3000;
        this.deleteDelay = Math.min(this.deleteDelay + 1000, MAX_DELETE_DELAY);
        this.callbacks.onLog(
          `Rate limited (429). Waiting ${(backoff / 1000).toFixed(0)}s, increasing delay to ${(this.deleteDelay / 1000).toFixed(1)}s...`,
          'warn',
        );
        await wait(backoff);
        continue;
      }

      if (result.status === 401 || result.status === 403) {
        throw Object.assign(new Error('Auth failure'), { status: result.status });
      }

      // Other errors (404 = already gone, etc.) -- skip immediately, don't retry
      this.callbacks.onLog(`HTTP ${result.status}, skipping message.`, 'warn');
      this.state.skippedCount++;
      return true;
    }

    return false;
  }
}
