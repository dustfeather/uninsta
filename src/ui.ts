import type { Boundary, EngineState } from './types';
import { PANEL_CSS } from './styles';

export interface UIElements {
  panel: HTMLDivElement;
  logArea: HTMLDivElement;
  progressText: HTMLSpanElement;
  progressBarFill: HTMLDivElement;
  statusText: HTMLSpanElement;
  btnStart: HTMLButtonElement;
  btnStop: HTMLButtonElement;
  btnPick: HTMLButtonElement;
  pickerPreview: HTMLSpanElement;
  datetimeInput: HTMLInputElement;
  btnClearPicker: HTMLButtonElement;
}

export interface UICallbacks {
  onStart: (boundary: Boundary | null) => void;
  onStop: () => void;
  onPickModeEnter: () => void;
}

/**
 * Inject the CSS styles into the document head.
 */
export function injectStyles(): void {
  const style = document.createElement('style');
  style.textContent = PANEL_CSS;
  document.head.appendChild(style);
}

/**
 * Build the full floating panel and return references to key elements.
 */
export function buildPanel(callbacks: UICallbacks): UIElements {
  const panel = document.createElement('div');
  panel.id = 'uninsta-panel';
  panel.style.display = 'none';

  panel.innerHTML = `
    <div id="uninsta-header">
      <h3>unInsta</h3>
      <button id="uninsta-btn-minimize" title="Minimize">&minus;</button>
      <button id="uninsta-btn-close" title="Close">&times;</button>
    </div>
    <div id="uninsta-status">
      <div class="status-row">
        <span id="uninsta-status-text">Status: Ready</span>
      </div>
      <div class="status-row">
        <span id="uninsta-status-thread">Thread: --</span>
      </div>
      <div class="status-row">
        <span id="uninsta-status-appid">App ID: Not captured</span>
        <button id="uninsta-btn-retry-appid" title="Scan page for App ID">Retry</button>
      </div>
    </div>
    <div id="uninsta-boundary">
      <label>Boundary (optional)</label>
      <div class="picker-row">
        <button id="uninsta-btn-pick">Pick message</button>
        <span id="uninsta-picker-preview">No message selected</span>
        <button id="uninsta-btn-clear-picker" style="display:none" title="Clear">&times;</button>
      </div>
      <input type="datetime-local" id="uninsta-datetime" title="Only unsend messages newer than this date">
    </div>
    <div id="uninsta-controls">
      <button id="uninsta-btn-start">Unsend All</button>
      <button id="uninsta-btn-stop" disabled>Stop</button>
    </div>
    <div id="uninsta-log"></div>
    <div id="uninsta-progress">
      <span id="uninsta-progress-text">Ready</span>
      <div id="uninsta-progress-bar">
        <div id="uninsta-progress-bar-fill"></div>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  // Grab element references
  const elements: UIElements = {
    panel,
    logArea: panel.querySelector('#uninsta-log')!,
    progressText: panel.querySelector('#uninsta-progress-text')!,
    progressBarFill: panel.querySelector('#uninsta-progress-bar-fill')!,
    statusText: panel.querySelector('#uninsta-status-text')!,
    btnStart: panel.querySelector('#uninsta-btn-start')!,
    btnStop: panel.querySelector('#uninsta-btn-stop')!,
    btnPick: panel.querySelector('#uninsta-btn-pick')!,
    pickerPreview: panel.querySelector('#uninsta-picker-preview')!,
    datetimeInput: panel.querySelector('#uninsta-datetime')!,
    btnClearPicker: panel.querySelector('#uninsta-btn-clear-picker')!,
  };

  // Wire up close/minimize
  panel.querySelector('#uninsta-btn-close')!.addEventListener('click', () => {
    panel.style.display = 'none';
  });

  panel.querySelector('#uninsta-btn-minimize')!.addEventListener('click', () => {
    const body = panel.querySelector('#uninsta-boundary') as HTMLElement;
    const log = elements.logArea;
    const controls = panel.querySelector('#uninsta-controls') as HTMLElement;
    const isMinimized = body.style.display === 'none';
    body.style.display = isMinimized ? '' : 'none';
    log.style.display = isMinimized ? '' : 'none';
    controls.style.display = isMinimized ? '' : 'none';
  });

  // Wire up start/stop
  elements.btnStart.addEventListener('click', () => {
    const boundary = getBoundaryFromUI(elements);
    callbacks.onStart(boundary);
  });

  elements.btnStop.addEventListener('click', () => {
    callbacks.onStop();
  });

  // Wire up pick button
  elements.btnPick.addEventListener('click', () => {
    callbacks.onPickModeEnter();
  });

  // Wire up clear picker
  elements.btnClearPicker.addEventListener('click', () => {
    elements.pickerPreview.textContent = 'No message selected';
    elements.pickerPreview.removeAttribute('data-item-id');
    elements.btnClearPicker.style.display = 'none';
  });

  // Make header draggable
  setupDrag(panel, panel.querySelector('#uninsta-header')!);

  return elements;
}

function getBoundaryFromUI(elements: UIElements): Boundary | null {
  const boundary: Boundary = {};

  const pickedId = elements.pickerPreview.getAttribute('data-item-id');
  if (pickedId) {
    boundary.messageId = pickedId;
  }

  const datetimeValue = elements.datetimeInput.value;
  if (datetimeValue) {
    // Convert to milliseconds (Instagram GraphQL uses millisecond timestamps)
    boundary.timestamp = new Date(datetimeValue).getTime();
  }

  if (!boundary.messageId && !boundary.timestamp) return null;
  return boundary;
}

/**
 * Create the trigger button to toggle the panel.
 */
export function createTriggerButton(panel: HTMLDivElement, onShow?: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = 'uninsta-trigger';
  btn.title = 'unInsta - Unsend messages';
  btn.innerHTML = '\u2716'; // X mark character
  btn.addEventListener('click', () => {
    const isVisible = panel.style.display !== 'none';
    panel.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible && onShow) onShow();
  });
  return btn;
}

/**
 * Inject the trigger button into Instagram's chat header.
 * Retries with a MutationObserver if the header isn't found yet.
 */
export function injectTriggerButton(btn: HTMLButtonElement): void {
  function tryInject(): boolean {
    // Instagram's chat header area -- look for common container patterns
    const header =
      document.querySelector('[role="banner"]') ||
      document.querySelector('header') ||
      document.querySelector('[data-pagelet="ChatHeader"]');
    if (header) {
      header.appendChild(btn);
      return true;
    }
    return false;
  }

  if (tryInject()) return;

  // If not found yet, observe for DOM changes
  const observer = new MutationObserver(() => {
    if (tryInject()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Give up after 30 seconds
  setTimeout(() => observer.disconnect(), 30000);
}

/**
 * Append a log entry to the log area.
 */
const MAX_LOG_ENTRIES = 500;

export function appendLog(
  logArea: HTMLDivElement,
  message: string,
  level: 'info' | 'success' | 'warn' | 'error' | 'debug',
): void {
  const entry = document.createElement('div');
  entry.className = `log-entry log-${level}`;
  entry.textContent = message;
  logArea.appendChild(entry);
  // Cap log entries to prevent DOM bloat on large conversations
  while (logArea.children.length > MAX_LOG_ENTRIES) {
    logArea.removeChild(logArea.firstChild!);
  }
  logArea.scrollTop = logArea.scrollHeight;
}

/**
 * Update the progress display.
 */
export function updateProgress(
  elements: UIElements,
  state: EngineState,
): void {
  const done = state.unsentCount + state.failedCount + state.skippedCount;
  const pct = state.totalFound > 0 ? Math.round((done / state.totalFound) * 100) : 0;
  elements.progressText.textContent = state.totalFound > 0
    ? `[${done}/${state.totalFound}] ${pct}%`
    : `Collecting... (page ${state.currentPage})`;
  elements.progressBarFill.style.width = `${pct}%`;
}

/**
 * Update the status info display with thread ID and app ID state.
 */
export function updateStatusInfo(
  panel: HTMLDivElement,
  threadId: string | null,
  appIdCaptured: boolean,
): void {
  const threadEl = panel.querySelector('#uninsta-status-thread');
  const appIdEl = panel.querySelector('#uninsta-status-appid');
  if (threadEl) threadEl.textContent = `Thread: ${threadId ?? '--'}`;
  if (appIdEl) appIdEl.textContent = `App ID: ${appIdCaptured ? 'Captured' : 'Not captured'}`;
}

/**
 * Set UI into running or stopped state.
 */
export function setRunningState(elements: UIElements, running: boolean): void {
  elements.btnStart.disabled = running;
  elements.btnStop.disabled = !running;
  elements.statusText.textContent = running ? 'Status: Running...' : 'Status: Ready';
}

/**
 * Simple drag functionality for the panel.
 */
function setupDrag(panel: HTMLElement, handle: HTMLElement): void {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startRight = 0;
  let startTop = 0;

  handle.addEventListener('mousedown', (e: MouseEvent) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startRight = parseInt(panel.style.right || '16', 10);
    startTop = parseInt(panel.style.top || '60', 10);
    handle.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    panel.style.right = `${startRight - dx}px`;
    panel.style.top = `${startTop + dy}px`;
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      handle.style.cursor = 'grab';
    }
  });
}
