import type { Boundary, EngineState } from './types';
import { installInterceptor, getAppId } from './interceptor';
import { getAuth, getThreadId } from './auth';
import { UnsendEngine } from './engine';
import {
  injectStyles,
  buildPanel,
  createTriggerButton,
  injectTriggerButton,
  appendLog,
  updateProgress,
  updateStatusInfo,
  setRunningState,
} from './ui';
import type { UIElements } from './ui';
import { enterPickMode } from './picker';

(function uninsta() {
  'use strict';

  // Install the fetch interceptor immediately to start capturing x-ig-app-id
  installInterceptor();

  let engine: UnsendEngine | null = null;
  let uiElements: UIElements;
  let pickModeCleanup: (() => void) | null = null;

  function log(message: string, level: 'info' | 'success' | 'warn' | 'error' | 'debug'): void {
    appendLog(uiElements.logArea, message, level);
  }

  function refreshStatusInfo(): void {
    const threadId = getThreadId();
    const cookie = document.cookie;
    const userIdMatch = cookie.match(/(?:^|;\s*)ds_user_id=([^;]*)/);
    const userId = userIdMatch ? decodeURIComponent(userIdMatch[1]) : null;
    updateStatusInfo(uiElements.panel, threadId, userId, getAppId() !== null);
  }

  function handleStart(boundary: Boundary | null): void {
    refreshStatusInfo();
    const threadId = getThreadId();
    if (!threadId) {
      log('Navigate to a DM conversation first.', 'warn');
      return;
    }

    const result = getAuth();
    if (!result.auth) {
      log(result.reason, 'error');
      return;
    }

    // Clear log
    uiElements.logArea.innerHTML = '';

    setRunningState(uiElements, true);

    engine = new UnsendEngine(threadId, result.auth, boundary, {
      onLog: log,
      onProgress: (state: EngineState) => updateProgress(uiElements, state),
      onComplete: (state: EngineState) => {
        setRunningState(uiElements, false);
        updateProgress(uiElements, state);
        uiElements.statusText.textContent = 'Status: Done';
        log(
          `Complete. Unsent: ${state.unsentCount}, Failed: ${state.failedCount}, Skipped: ${state.skippedCount}`,
          'info',
        );
      },
    });

    engine.start().catch((err: Error) => {
      log(`Unexpected fatal error: ${err.message}`, 'error');
      setRunningState(uiElements, false);
    });
  }

  function handleStop(): void {
    if (engine) {
      engine.stop();
      // Keep Start disabled until onComplete fires to prevent concurrent engines
      uiElements.statusText.textContent = 'Status: Stopping...';
    }
  }

  function handlePickModeEnter(): void {
    if (pickModeCleanup) pickModeCleanup();

    pickModeCleanup = enterPickMode(
      uiElements,
      (itemId: string, preview: string) => {
        uiElements.pickerPreview.textContent = preview;
        uiElements.pickerPreview.setAttribute('data-item-id', itemId);
        uiElements.btnClearPicker.style.display = '';
        log(`Boundary set: ${preview} (ID: ${itemId})`, 'info');
        pickModeCleanup = null;
      },
      () => {
        log('Pick mode cancelled or failed to read message ID. Use the date input instead.', 'warn');
        pickModeCleanup = null;
      },
    );
  }

  function init(): void {
    injectStyles();

    uiElements = buildPanel({
      onStart: handleStart,
      onStop: handleStop,
      onPickModeEnter: handlePickModeEnter,
    });

    const triggerBtn = createTriggerButton(uiElements.panel, refreshStatusInfo);
    injectTriggerButton(triggerBtn);

    // Listen for toolbar icon toggle (from extension bridge script)
    document.addEventListener('uninsta-toggle', () => {
      const isVisible = uiElements.panel.style.display !== 'none';
      uiElements.panel.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) refreshStatusInfo();
    });
  }

  // Wait for the page to be ready
  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
})();
