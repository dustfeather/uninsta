const COLOR_ICONS = {
  16: 'icons/icon16.png',
  32: 'icons/icon32.png',
  48: 'icons/icon48.png',
  128: 'icons/icon128.png',
};

const GRAY_ICONS = {
  16: 'icons/icon16-gray.png',
  32: 'icons/icon32-gray.png',
  48: 'icons/icon48-gray.png',
  128: 'icons/icon128-gray.png',
};

function isInstagramDM(url: string | undefined): boolean {
  return !!url && url.startsWith('https://www.instagram.com/direct/');
}

function updateIcon(tabId: number, url: string | undefined): void {
  const path = isInstagramDM(url) ? COLOR_ICONS : GRAY_ICONS;
  chrome.action.setIcon({ tabId, path });
}

// Update icon when the active tab changes
chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (!chrome.runtime.lastError) {
      updateIcon(tabId, tab.url);
    }
  });
});

// Update icon when a tab navigates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    updateIcon(tabId, tab.url);
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
