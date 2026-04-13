const COLOR_ICONS = {
  16: 'icons/icon16.png',
  32: 'icons/icon32.png',
  48: 'icons/icon48.png',
  128: 'icons/icon128.png',
};

// Content script signals when it loads on an Instagram DM page
chrome.runtime.onMessage.addListener((msg: { type: string }, sender) => {
  if (msg.type === 'uninsta-active' && sender.tab?.id) {
    chrome.action.setIcon({ tabId: sender.tab.id, path: COLOR_ICONS });
  }

  if (msg.type === 'uninsta-toggle') {
    // Forward to content script (bridge → background → main world via bridge)
  }
});

// Toggle panel on icon click
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'uninsta-toggle' }).catch(() => {
      // Content script not loaded on this page -- ignore
    });
  }
});
