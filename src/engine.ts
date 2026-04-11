import type { AuthCredentials, Boundary, EngineCallbacks, EngineState, IGMessage, IGThreadInfo } from './types';
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
  private failedMessages: { message_id: string; timestamp_ms: number; preview: string }[] = [];

  constructor(
    private threadInfo: IGThreadInfo,
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
    this.failedMessages = [];
    this.callbacks.onProgress(this.state);

    const boundaryTimestamp = this.boundary?.timestamp ?? null;
    const boundaryMessageId = this.boundary?.messageId ?? null;

    // Resume from saved cursor if available
    const storageKey = `uninsta_cursor_${this.threadInfo.threadFbid}`;
    let cursor: string | null = null;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        cursor = saved;
        this.callbacks.onLog('Resuming from last saved position...', 'info');
      }
    } catch {}

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

        const data = await fetchThreadMessages(this.threadInfo.threadFbid, cursor, this.auth);
        const messages = data.messages;

        if (!messages || messages.length === 0) {
          this.callbacks.onLog('No more messages found.', 'info');
          break;
        }

        // Filter to own messages
        const ownMessages = messages.filter(
          (msg) => String(msg.sender_id) === this.auth.userId,
        );

        // Count this page's messages upfront so progress bar stays ahead
        this.state.totalFound += ownMessages.length;
        this.callbacks.onProgress(this.state);

        for (const msg of ownMessages) {
          if (this.abortFlag) break;

          // Check boundary by message ID
          if (boundaryMessageId && msg.message_id === boundaryMessageId) {
            // Adjust totalFound since we won't process remaining
            this.state.totalFound -= ownMessages.length - ownMessages.indexOf(msg);
            reachedBoundary = true;
            this.callbacks.onLog('Reached boundary message. Stopping.', 'info');
            break;
          }

          // Check boundary by timestamp (messages come newest-first)
          if (boundaryTimestamp != null && msg.timestamp_ms < boundaryTimestamp) {
            this.state.totalFound -= ownMessages.length - ownMessages.indexOf(msg);
            reachedBoundary = true;
            this.callbacks.onLog('Reached timestamp boundary. Stopping.', 'info');
            break;
          }

          const preview = msg.message?.text
            ? `"${msg.message.text.substring(0, 40)}${msg.message.text.length > 40 ? '...' : ''}"`
            : `[${msg.__typename || 'media'}]`;
          const dateStr = msg.timestamp_ms ? new Date(msg.timestamp_ms).toISOString().replace('T', ' ').substring(0, 19) : '';
          const count = this.state.unsentCount + this.state.failedCount + 1;

          const success = await this.unsendWithRetry(msg);

          if (success) {
            this.state.unsentCount++;
            this.callbacks.onLog(
              `[${count}] ${dateStr} ${preview} - OK`,
              'success',
            );
          } else {
            this.state.failedCount++;
            this.failedMessages.push({ message_id: msg.message_id, timestamp_ms: msg.timestamp_ms, preview });
            this.callbacks.onLog(
              `[${count}] ${dateStr} ${preview} - FAILED`,
              'error',
            );
          }

          this.callbacks.onProgress(this.state);

          const delay = jitteredDelay(this.deleteDelay, DELETE_JITTER);
          this.callbacks.onLog(`Waiting ${(delay / 1000).toFixed(1)}s...`, 'debug');
          await wait(delay);
        }

        // Check if there are more pages (Relay pagination)
        if (!data.pageInfo.has_previous_page && !data.pageInfo.end_cursor) {
          this.callbacks.onLog('Reached end of conversation.', 'info');
          break;
        }

        cursor = data.pageInfo.end_cursor;
        if (!cursor) {
          this.callbacks.onLog('No more pages.', 'info');
          break;
        }

        // Save cursor for resume
        try { localStorage.setItem(storageKey, cursor); } catch {}

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

    // Dump failed messages
    if (this.failedMessages.length > 0) {
      this.callbacks.onLog(`--- ${this.failedMessages.length} failed message(s) ---`, 'error');
      for (const fm of this.failedMessages) {
        const dateStr = fm.timestamp_ms ? new Date(fm.timestamp_ms).toISOString().replace('T', ' ').substring(0, 19) : 'unknown date';
        this.callbacks.onLog(`  ${dateStr} ${fm.preview} (${fm.message_id})`, 'error');
      }
    }

    // Clear saved cursor if we finished naturally (not stopped/errored)
    if (!this.abortFlag) {
      try { localStorage.removeItem(storageKey); } catch {}
    }

    this.state.running = false;
    this.callbacks.onComplete(this.state);
  }

  stop(): void {
    this.abortFlag = true;
  }

  private async unsendWithRetry(msg: IGMessage): Promise<boolean> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const result = await unsendMessage(this.threadInfo.threadId, msg.message_id, this.auth);

      if (result.status === 200 || result.status === 204) {
        return true;
      }

      if (result.status === 429) {
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

      // Other errors -- skip immediately
      this.callbacks.onLog(`HTTP ${result.status}, skipping message.`, 'warn');
      this.state.skippedCount++;
      return true;
    }

    return false;
  }
}
