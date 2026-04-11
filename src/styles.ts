export const PANEL_CSS = `
/* unInsta Panel - distinct dark theme, not Instagram's variables */
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
  color: #e4e6eb;
  background: #1a1a2e;
  border: 1px solid #30305a;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
  overflow: hidden;
}

/* Header - gradient accent bar */
#uninsta-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #833AB4 0%, #C13584 40%, #E1306C 70%, #F77737 100%);
  cursor: grab;
  user-select: none;
}

#uninsta-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  flex-grow: 1;
  color: #fff;
  letter-spacing: 0.3px;
}

#uninsta-header button {
  background: rgba(255,255,255,0.2);
  border: none;
  font-size: 14px;
  cursor: pointer;
  color: #fff;
  padding: 2px 8px;
  line-height: 1;
  border-radius: 4px;
  margin-left: 4px;
}

#uninsta-header button:hover {
  background: rgba(255,255,255,0.35);
}

/* Status */
#uninsta-status {
  padding: 10px 16px;
  font-size: 12px;
  color: #8b8fa3;
  background: #16162b;
  border-bottom: 1px solid #30305a;
}

#uninsta-status .status-row {
  display: flex;
  gap: 12px;
  margin-bottom: 2px;
}

/* Boundary */
#uninsta-boundary {
  padding: 12px 16px;
  background: #1a1a2e;
  border-bottom: 1px solid #30305a;
}

#uninsta-boundary label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #8b8fa3;
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
  color: #8b8fa3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

#uninsta-boundary input[type="datetime-local"] {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #30305a;
  border-radius: 8px;
  background: #16162b;
  color: #e4e6eb;
  font-size: 13px;
}

#uninsta-boundary input[type="datetime-local"]:focus {
  outline: none;
  border-color: #C13584;
}

/* Controls */
#uninsta-controls {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: #1a1a2e;
  border-bottom: 1px solid #30305a;
}

#uninsta-controls button {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

#uninsta-controls button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

#uninsta-controls button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

#uninsta-btn-start {
  background: linear-gradient(135deg, #833AB4, #C13584, #E1306C);
  color: #fff;
}

#uninsta-btn-stop {
  background: #ed4956;
  color: #fff;
}

#uninsta-btn-pick {
  background: #16162b;
  color: #e4e6eb;
  border: 1px solid #30305a !important;
}

#uninsta-btn-pick:hover {
  border-color: #C13584 !important;
}

/* Log Area */
#uninsta-log {
  flex: 1;
  min-height: 120px;
  max-height: 300px;
  overflow-y: auto;
  padding: 10px 14px;
  background: #0d0d1a;
  font-family: "SF Mono", SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 11px;
  line-height: 1.7;
}

#uninsta-log::-webkit-scrollbar { width: 6px; }
#uninsta-log::-webkit-scrollbar-track { background: transparent; }
#uninsta-log::-webkit-scrollbar-thumb { background: #30305a; border-radius: 3px; }
#uninsta-log::-webkit-scrollbar-thumb:hover { background: #4a4a7a; }

#uninsta-log .log-entry {
  margin-bottom: 2px;
}

#uninsta-log .log-success { color: #4ade80; }
#uninsta-log .log-error { color: #f87171; }
#uninsta-log .log-warn { color: #fbbf24; }
#uninsta-log .log-info { color: #C13584; }
#uninsta-log .log-debug { color: #6b7280; }

/* Progress Footer */
#uninsta-progress {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  font-size: 12px;
  color: #8b8fa3;
  background: #16162b;
  border-top: 1px solid #30305a;
  gap: 10px;
}

#uninsta-progress-bar {
  flex: 1;
  height: 4px;
  background: #30305a;
  border-radius: 2px;
  overflow: hidden;
}

#uninsta-progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #833AB4, #C13584, #E1306C, #F77737);
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
  color: #C13584;
}

/* Picker Mode Overlay */
.uninsta-pick-mode [role="row"],
.uninsta-pick-mode [role="listitem"] {
  cursor: crosshair !important;
}

.uninsta-pick-mode [role="row"]:hover,
.uninsta-pick-mode [role="listitem"]:hover {
  outline: 2px solid #C13584;
  outline-offset: -2px;
  border-radius: 4px;
}

.uninsta-pick-highlight {
  outline: 2px solid #C13584 !important;
  outline-offset: -2px;
  border-radius: 4px;
  background: rgba(193, 53, 132, 0.08) !important;
}
`;
