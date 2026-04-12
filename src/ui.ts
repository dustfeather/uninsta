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

  // Build DOM without innerHTML to pass AMO validation
  const header = document.createElement('div');
  header.id = 'uninsta-header';
  const h3 = document.createElement('h3');
  h3.textContent = 'unInsta';
  const btnMinimize = document.createElement('button');
  btnMinimize.id = 'uninsta-btn-minimize';
  btnMinimize.title = 'Minimize';
  btnMinimize.setAttribute('aria-label', 'Minimize panel');
  btnMinimize.textContent = '\u2212';
  const btnClose = document.createElement('button');
  btnClose.id = 'uninsta-btn-close';
  btnClose.title = 'Close';
  btnClose.setAttribute('aria-label', 'Close panel');
  btnClose.textContent = '\u00D7';
  header.append(h3, btnMinimize, btnClose);

  const status = document.createElement('div');
  status.id = 'uninsta-status';
  const statusRow1 = document.createElement('div');
  statusRow1.className = 'status-row';
  const statusText = document.createElement('span');
  statusText.id = 'uninsta-status-text';
  statusText.textContent = 'Status: Ready';
  statusRow1.append(statusText);
  const statusRow2 = document.createElement('div');
  statusRow2.className = 'status-row';
  const threadText = document.createElement('span');
  threadText.id = 'uninsta-status-thread';
  threadText.textContent = 'Thread: --';
  statusRow2.append(threadText);
  const statusRow3 = document.createElement('div');
  statusRow3.className = 'status-row';
  const appIdText = document.createElement('span');
  appIdText.id = 'uninsta-status-appid';
  appIdText.textContent = 'App ID: Not captured';
  const btnRetryAppId = document.createElement('button');
  btnRetryAppId.id = 'uninsta-btn-retry-appid';
  btnRetryAppId.title = 'Scan page for App ID';
  btnRetryAppId.setAttribute('aria-label', 'Retry App ID capture');
  btnRetryAppId.textContent = 'Retry';
  statusRow3.append(appIdText, btnRetryAppId);
  status.append(statusRow1, statusRow2, statusRow3);

  const boundary = document.createElement('div');
  boundary.id = 'uninsta-boundary';
  const boundaryLabel = document.createElement('label');
  boundaryLabel.textContent = 'Boundary (optional)';
  const pickerRow = document.createElement('div');
  pickerRow.className = 'picker-row';
  const btnPick = document.createElement('button');
  btnPick.id = 'uninsta-btn-pick';
  btnPick.textContent = 'Pick message';
  const pickerPreview = document.createElement('span');
  pickerPreview.id = 'uninsta-picker-preview';
  pickerPreview.textContent = 'No message selected';
  const btnClearPicker = document.createElement('button');
  btnClearPicker.id = 'uninsta-btn-clear-picker';
  btnClearPicker.style.display = 'none';
  btnClearPicker.title = 'Clear';
  btnClearPicker.setAttribute('aria-label', 'Clear selected message');
  btnClearPicker.textContent = '\u00D7';
  pickerRow.append(btnPick, pickerPreview, btnClearPicker);
  const datetimeInput = document.createElement('input');
  datetimeInput.type = 'datetime-local';
  datetimeInput.id = 'uninsta-datetime';
  datetimeInput.title = 'Only unsend messages newer than this date';
  boundary.append(boundaryLabel, pickerRow, datetimeInput);

  const controls = document.createElement('div');
  controls.id = 'uninsta-controls';
  const btnStart = document.createElement('button');
  btnStart.id = 'uninsta-btn-start';
  btnStart.textContent = 'Unsend All';
  const btnStop = document.createElement('button');
  btnStop.id = 'uninsta-btn-stop';
  btnStop.disabled = true;
  btnStop.textContent = 'Stop';
  controls.append(btnStart, btnStop);

  const logArea = document.createElement('div');
  logArea.id = 'uninsta-log';
  logArea.setAttribute('role', 'log');
  logArea.setAttribute('aria-label', 'Activity log');

  const progress = document.createElement('div');
  progress.id = 'uninsta-progress';
  const progressText = document.createElement('span');
  progressText.id = 'uninsta-progress-text';
  progressText.setAttribute('aria-live', 'polite');
  progressText.textContent = 'Ready';
  const progressBar = document.createElement('div');
  progressBar.id = 'uninsta-progress-bar';
  const progressBarFill = document.createElement('div');
  progressBarFill.id = 'uninsta-progress-bar-fill';
  progressBarFill.setAttribute('role', 'progressbar');
  progressBarFill.setAttribute('aria-valuemin', '0');
  progressBarFill.setAttribute('aria-valuemax', '100');
  progressBarFill.setAttribute('aria-valuenow', '0');
  progressBar.append(progressBarFill);
  progress.append(progressText, progressBar);

  panel.append(header, status, boundary, controls, logArea, progress);

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
  btn.setAttribute('aria-label', 'Toggle unInsta panel');
  btn.textContent = '\u2716';
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
let phaseStartTime = 0;

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function resetProgressTimer(): void {
  phaseStartTime = Date.now();
}

export function updateProgress(
  elements: UIElements,
  state: EngineState,
): void {
  const done = state.unsentCount + state.failedCount + state.skippedCount;
  const pct = state.totalFound > 0 ? Math.round((done / state.totalFound) * 100) : 0;

  if (state.totalFound > 0 && done > 0) {
    const elapsed = Date.now() - phaseStartTime;
    const avgPerMsg = elapsed / done;
    const remaining = (state.totalFound - done) * avgPerMsg;
    elements.progressText.textContent = `[${done}/${state.totalFound}] ${pct}% | Elapsed: ${formatDuration(elapsed)} | Remaining: ~${formatDuration(remaining)}`;
  } else if (state.totalFound > 0) {
    elements.progressText.textContent = `[0/${state.totalFound}] 0%`;
  } else {
    elements.progressText.textContent = `Collecting... (page ${state.currentPage})`;
  }

  elements.progressBarFill.style.width = `${pct}%`;
  elements.progressBarFill.setAttribute('aria-valuenow', String(pct));
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
