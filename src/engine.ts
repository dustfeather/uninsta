import type { AuthCredentials, Boundary, EngineCallbacks, EngineState, IGMessage, IGThreadInfo } from './types';
import { fetchThreadMessages, unsendMessage } from './api';
import { storeMessages, getMessageCount, getNextMessage, removeMessage, clearMessages, saveCursor, loadCursor, clearCursor } from './storage';

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
    const threadFbid = this.threadInfo.threadFbid;
    // Track whether we've walked past the picked-message boundary while
    // paginating newest → oldest. If no message-ID boundary is set, treat as
    // already passed so the timestamp boundary (or no boundary) takes over.
    let pastMessageBoundary = !boundaryMessageId;

    try {
      // ── Phase 1: Collect all messages into IndexedDB ─────────────────
      this.callbacks.onLog('Phase 1: Collecting messages...', 'info');

      // Check if we have messages from a previous run
      const existingCount = await getMessageCount(threadFbid);
      if (existingCount > 0) {
        this.callbacks.onLog(`Found ${existingCount} messages from previous run.`, 'info');
        this.state.totalFound = existingCount;
        this.callbacks.onProgress(this.state);
      } else {
        // Fetch all pages and store in IndexedDB
        let cursor = await loadCursor(threadFbid);
        if (cursor) {
          this.callbacks.onLog('Resuming collection from last position...', 'info');
        }

        while (true) {
          if (this.abortFlag) {
            this.callbacks.onLog('Stopped by user.', 'warn');
            break;
          }

          this.state.currentPage++;
          this.callbacks.onLog(`Fetching page ${this.state.currentPage}...`, 'debug');

          const data = await fetchThreadMessages(threadFbid, cursor, this.auth);
          const messages = data.messages;

          if (!messages || messages.length === 0) {
            this.callbacks.onLog('No more messages.', 'info');
            break;
          }

          // Walk newest → oldest. Apply boundaries (skip messages newer than
          // boundary), then filter to own messages.
          const toStore: IGMessage[] = [];
          for (const msg of messages) {
            // The picked-message boundary may belong to either party — check
            // it against ALL messages so we correctly transition.
            if (boundaryMessageId && msg.message_id === boundaryMessageId) {
              pastMessageBoundary = true;
              continue;
            }
            if (!pastMessageBoundary) continue;

            if (boundaryTimestamp != null && msg.timestamp_ms >= boundaryTimestamp) continue;

            if (String(msg.sender_id) !== this.auth.userId) continue;

            toStore.push(msg);
          }

          if (toStore.length > 0) {
            await storeMessages(threadFbid, toStore);
            this.state.totalFound += toStore.length;
            this.callbacks.onProgress(this.state);
          }

          // Check for more pages
          if (!data.pageInfo.has_previous_page && !data.pageInfo.end_cursor) break;
          cursor = data.pageInfo.end_cursor;
          if (!cursor) break;

          await saveCursor(threadFbid, cursor);
          await wait(FETCH_DELAY);
        }

        if (this.abortFlag) {
          this.state.running = false;
          this.callbacks.onComplete(this.state);
          return;
        }

        // Update total from DB (in case of resume)
        this.state.totalFound = await getMessageCount(threadFbid);
      }

      // ── Phase 2: Unsend from IndexedDB one by one ────────────────────
      this.callbacks.onLog(`Phase 2: Unsending ${this.state.totalFound} messages...`, 'info');
      this.callbacks.onProgress(this.state);

      let msg: IGMessage | null;
      while ((msg = await getNextMessage(threadFbid)) !== null) {
        if (this.abortFlag) {
          this.callbacks.onLog('Stopped by user.', 'warn');
          break;
        }

        const preview = msg.message?.text
          ? `"${msg.message.text.substring(0, 40)}${msg.message.text.length > 40 ? '...' : ''}"`
          : '[SharedContent]';
        const dateStr = msg.timestamp_ms ? new Date(msg.timestamp_ms).toISOString().replace('T', ' ').substring(0, 19) : '';
        const count = this.state.unsentCount + this.state.failedCount + 1;

        const success = await this.unsendWithRetry(msg);

        if (success) {
          this.state.unsentCount++;
          await removeMessage(msg.message_id);
          this.callbacks.onLog(
            `[${count}/${this.state.totalFound}] ${dateStr} ${preview} - OK`,
            'success',
          );
        } else {
          this.state.failedCount++;
          await removeMessage(msg.message_id);
          this.failedMessages.push({ message_id: msg.message_id, timestamp_ms: msg.timestamp_ms, preview });
          this.callbacks.onLog(
            `[${count}/${this.state.totalFound}] ${dateStr} ${preview} - FAILED`,
            'error',
          );
        }

        this.callbacks.onProgress(this.state);

        const delay = jitteredDelay(this.deleteDelay, DELETE_JITTER);
        this.callbacks.onLog(`Waiting ${(delay / 1000).toFixed(1)}s...`, 'debug');
        await wait(delay);
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

    // Clean up if finished naturally
    if (!this.abortFlag) {
      await clearMessages(threadFbid);
      await clearCursor(threadFbid);
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
