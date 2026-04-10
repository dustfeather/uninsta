export const PANEL_CSS = `
/* Uninsta Panel */
#uninsta-panel {
  position: fixed;
  z-index: 10000;
  top: 60px;
  right: 16px;
  display: flex;
  flex-direction: column;
  width: 420px;
  max-height: 70vh;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px;
  color: var(--ig-primary-text, #262626);
  background: var(--ig-primary-background, #fff);
  border: 1px solid var(--ig-elevated-separator, #dbdbdb);
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.15);
  overflow: hidden;
}

#uninsta-panel.dark {
  color: var(--ig-primary-text, #f5f5f5);
  background: var(--ig-primary-background, #000);
  border-color: var(--ig-elevated-separator, #363636);
}

/* Header */
#uninsta-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--ig-secondary-background, #fafafa);
  border-bottom: 1px solid var(--ig-elevated-separator, #dbdbdb);
  cursor: grab;
  user-select: none;
}

#uninsta-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  flex-grow: 1;
}

#uninsta-header button {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--ig-secondary-text, #8e8e8e);
  padding: 0 4px;
  line-height: 1;
}

#uninsta-header button:hover {
  color: var(--ig-primary-text, #262626);
}

/* Status */
#uninsta-status {
  padding: 8px 16px;
  font-size: 12px;
  color: var(--ig-secondary-text, #8e8e8e);
  border-bottom: 1px solid var(--ig-elevated-separator, #dbdbdb);
}

#uninsta-status .status-row {
  display: flex;
  gap: 12px;
}

/* Boundary */
#uninsta-boundary {
  padding: 12px 16px;
  border-bottom: 1px solid var(--ig-elevated-separator, #dbdbdb);
}

#uninsta-boundary label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--ig-secondary-text, #8e8e8e);
  text-transform: uppercase;
  margin-bottom: 8px;
}

#uninsta-boundary .picker-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

#uninsta-boundary .picker-preview {
  flex: 1;
  font-size: 12px;
  color: var(--ig-secondary-text, #8e8e8e);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

#uninsta-boundary input[type="datetime-local"] {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--ig-elevated-separator, #dbdbdb);
  border-radius: 8px;
  background: var(--ig-primary-background, #fff);
  color: var(--ig-primary-text, #262626);
  font-size: 14px;
}

/* Controls */
#uninsta-controls {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ig-elevated-separator, #dbdbdb);
}

#uninsta-controls button {
  flex: 1;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

#uninsta-controls button:hover {
  opacity: 0.85;
}

#uninsta-controls button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

#uninsta-btn-start {
  background: #0095f6;
  color: #fff;
}

#uninsta-btn-stop {
  background: #ed4956;
  color: #fff;
}

#uninsta-btn-pick {
  background: var(--ig-secondary-background, #fafafa);
  color: var(--ig-primary-text, #262626);
  border: 1px solid var(--ig-elevated-separator, #dbdbdb) !important;
}

/* Log Area */
#uninsta-log {
  flex: 1;
  min-height: 120px;
  max-height: 300px;
  overflow-y: auto;
  padding: 8px 12px;
  font-family: "SF Mono", SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 11px;
  line-height: 1.6;
}

#uninsta-log .log-entry {
  margin-bottom: 2px;
}

#uninsta-log .log-success { color: #58c322; }
#uninsta-log .log-error { color: #ed4956; }
#uninsta-log .log-warn { color: #fdcb6e; }
#uninsta-log .log-info { color: #0095f6; }
#uninsta-log .log-debug { color: var(--ig-secondary-text, #8e8e8e); }

/* Progress Footer */
#uninsta-progress {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  font-size: 12px;
  color: var(--ig-secondary-text, #8e8e8e);
  border-top: 1px solid var(--ig-elevated-separator, #dbdbdb);
  gap: 8px;
}

#uninsta-progress-bar {
  flex: 1;
  height: 4px;
  background: var(--ig-elevated-separator, #dbdbdb);
  border-radius: 2px;
  overflow: hidden;
}

#uninsta-progress-bar-fill {
  height: 100%;
  background: #0095f6;
  border-radius: 2px;
  transition: width 0.3s ease;
  width: 0%;
}

/* Trigger Button */
#uninsta-trigger {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  color: var(--ig-primary-text, #262626);
  font-size: 20px;
  line-height: 1;
  display: flex;
  align-items: center;
}

#uninsta-trigger:hover {
  opacity: 0.7;
}

#uninsta-trigger.active {
  color: #ed4956;
}

/* Picker Mode Overlay */
.uninsta-pick-mode [role="row"],
.uninsta-pick-mode [role="listitem"] {
  cursor: crosshair !important;
}

.uninsta-pick-mode [role="row"]:hover,
.uninsta-pick-mode [role="listitem"]:hover {
  outline: 2px solid #0095f6;
  outline-offset: -2px;
  border-radius: 4px;
}

.uninsta-pick-highlight {
  outline: 2px solid #0095f6 !important;
  outline-offset: -2px;
  border-radius: 4px;
  background: rgba(0, 149, 246, 0.05) !important;
}
`;
