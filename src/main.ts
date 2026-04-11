import type { Boundary, EngineState } from './types';
import { installInterceptor, getAppId, tryExtractAppIdFromPage } from './interceptor';
import { getAuth, getThreadId, getThreadInfo } from './auth';
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
    const appIdCaptured = getAppId() !== null;
    updateStatusInfo(uiElements.panel, threadId, appIdCaptured);
    const retryBtn = uiElements.panel.querySelector('#uninsta-btn-retry-appid');
    if (retryBtn) {
      retryBtn.classList.toggle('captured', appIdCaptured);
    }
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

    const threadInfo = getThreadInfo();
    if (!threadInfo) {
      log('Could not extract thread info from page. Try refreshing.', 'error');
      return;
    }
    log(`Thread fbid: ${threadInfo.threadFbid}, id: ${threadInfo.threadId}`, 'debug');

    // Clear log (keep the thread info line)
    // uiElements.logArea.innerHTML = '';

    setRunningState(uiElements, true);

    engine = new UnsendEngine(threadInfo, result.auth, boundary, {
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

    // Wire up retry app ID button
    const retryBtn = uiElements.panel.querySelector('#uninsta-btn-retry-appid');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        if (tryExtractAppIdFromPage()) {
          log('App ID captured from page.', 'success');
          retryBtn.classList.add('captured');
        } else {
          log('App ID not found. Try switching chats or scrolling, then retry.', 'warn');
        }
        refreshStatusInfo();
      });
    }

    // Try to capture app ID from page on init
    tryExtractAppIdFromPage();
    refreshStatusInfo();

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
