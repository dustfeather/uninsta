// Generated from src/panel.scss — do not edit directly
export const PANEL_CSS = `
#uninsta-panel {
  --md-sys-color-primary: #FFB0CE;
  --md-sys-color-on-primary: #5E1133;
  --md-sys-color-primary-container: #7D2950;
  --md-sys-color-on-primary-container: #FFD8E5;
  --md-sys-color-secondary: #E2BDC7;
  --md-sys-color-on-secondary: #422A31;
  --md-sys-color-secondary-container: #5A3F47;
  --md-sys-color-on-secondary-container: #FFD8E2;
  --md-sys-color-error: #FFB4AB;
  --md-sys-color-on-error: #690005;
  --md-sys-color-surface: #1a1a2e;
  --md-sys-color-on-surface: #e4e6eb;
  --md-sys-color-on-surface-variant: #8b8fa3;
  --md-sys-color-surface-container-lowest: #0d0d1a;
  --md-sys-color-surface-container-low: #16162b;
  --md-sys-color-surface-container: #1a1a2e;
  --md-sys-color-surface-container-high: #30305a;
  --md-sys-color-outline: #30305a;
  --md-sys-color-outline-variant: #30305a;
  --brand-gradient: linear-gradient(135deg, #833AB4 0%, #C13584 40%, #E1306C 70%, #F77737 100%);
  --brand-accent: #C13584;
  --brand-error: #ed4956;
  --md-sys-shape-corner-extra-small: 4px;
  --md-sys-shape-corner-small: 8px;
  --md-sys-shape-corner-medium: 12px;
  --md-sys-shape-corner-full: 9999px;
  --md-sys-motion-easing-standard: cubic-bezier(0.2, 0, 0, 1);
  --md-sys-motion-duration-short4: 200ms;
  --md-sys-motion-duration-medium2: 300ms;
}

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
  color: var(--md-sys-color-on-surface);
  background: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline);
  border-radius: var(--md-sys-shape-corner-medium);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
  overflow: hidden;
}

#uninsta-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--brand-gradient);
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
  background: rgba(255, 255, 255, 0.2);
  border: none;
  font-size: 14px;
  cursor: pointer;
  color: #fff;
  padding: 2px 8px;
  line-height: 1;
  border-radius: var(--md-sys-shape-corner-extra-small);
  margin-left: 4px;
  transition: background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}
#uninsta-header button:hover {
  background: rgba(255, 255, 255, 0.35);
}

#uninsta-status {
  padding: 10px 16px;
  font-size: 12px;
  color: var(--md-sys-color-on-surface-variant);
  background: var(--md-sys-color-surface-container-low);
  border-bottom: 1px solid var(--md-sys-color-outline);
}
#uninsta-status .status-row {
  display: flex;
  gap: 12px;
  margin-bottom: 2px;
  align-items: center;
}

#uninsta-btn-retry-appid {
  background: var(--md-sys-color-surface-container-high);
  border: none;
  color: var(--brand-accent);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--md-sys-shape-corner-extra-small);
  cursor: pointer;
  margin-left: 4px;
  transition: background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}
#uninsta-btn-retry-appid:hover {
  background: #3a3a6a;
}
#uninsta-btn-retry-appid.captured {
  display: none;
}

#uninsta-boundary {
  padding: 12px 16px;
  background: var(--md-sys-color-surface);
  border-bottom: 1px solid var(--md-sys-color-outline);
}
#uninsta-boundary label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
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
  color: var(--md-sys-color-on-surface-variant);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
#uninsta-boundary input[type=datetime-local] {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--md-sys-color-outline);
  border-radius: var(--md-sys-shape-corner-small);
  background: var(--md-sys-color-surface-container-low);
  color: var(--md-sys-color-on-surface);
  font-size: 13px;
  transition: border-color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}
#uninsta-boundary input[type=datetime-local]:focus {
  outline: none;
  border-color: var(--brand-accent);
}

#uninsta-controls {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: var(--md-sys-color-surface);
  border-bottom: 1px solid var(--md-sys-color-outline);
}
#uninsta-controls button {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: var(--md-sys-shape-corner-small);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard), box-shadow var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}
#uninsta-controls button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
#uninsta-controls button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

#uninsta-btn-start {
  background: var(--brand-gradient);
  color: #fff;
}

#uninsta-btn-stop {
  background: var(--brand-error);
  color: #fff;
}

#uninsta-btn-pick {
  background: var(--md-sys-color-surface-container-low);
  color: var(--md-sys-color-on-surface);
  border: 1px solid var(--md-sys-color-outline) !important;
  transition: border-color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}
#uninsta-btn-pick:hover {
  border-color: var(--brand-accent) !important;
}

#uninsta-log {
  flex: 1;
  min-height: 120px;
  max-height: 300px;
  overflow-y: auto;
  padding: 10px 14px;
  background: var(--md-sys-color-surface-container-lowest);
  font-family: "SF Mono", SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 11px;
  line-height: 1.7;
}
#uninsta-log::-webkit-scrollbar {
  width: 6px;
}
#uninsta-log::-webkit-scrollbar-track {
  background: transparent;
}
#uninsta-log::-webkit-scrollbar-thumb {
  background: var(--md-sys-color-surface-container-high);
  border-radius: 3px;
}
#uninsta-log::-webkit-scrollbar-thumb:hover {
  background: #4a4a7a;
}
#uninsta-log .log-entry {
  margin-bottom: 2px;
}
#uninsta-log .log-success {
  color: #4ade80;
}
#uninsta-log .log-error {
  color: var(--md-sys-color-error);
}
#uninsta-log .log-warn {
  color: #fbbf24;
}
#uninsta-log .log-info {
  color: var(--brand-accent);
}
#uninsta-log .log-debug {
  color: #6b7280;
}

#uninsta-progress {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  font-size: 12px;
  color: var(--md-sys-color-on-surface-variant);
  background: var(--md-sys-color-surface-container-low);
  border-top: 1px solid var(--md-sys-color-outline);
  gap: 10px;
}

#uninsta-progress-bar {
  flex: 1;
  height: 4px;
  background: var(--md-sys-color-surface-container-high);
  border-radius: 2px;
  overflow: hidden;
}

#uninsta-progress-bar-fill {
  height: 100%;
  background: var(--brand-gradient);
  border-radius: 2px;
  transition: width var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-standard);
  width: 0%;
}

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

.uninsta-pick-mode [role=row],
.uninsta-pick-mode [role=listitem] {
  cursor: crosshair !important;
}
.uninsta-pick-mode [role=row]:hover,
.uninsta-pick-mode [role=listitem]:hover {
  outline: 2px solid #C13584;
  outline-offset: -2px;
  border-radius: 4px;
}

.uninsta-pick-highlight {
  outline: 2px solid #C13584 !important;
  outline-offset: -2px;
  border-radius: 4px;
  background: rgba(193, 53, 132, 0.08) !important;
}`;
