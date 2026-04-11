chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'uninsta-toggle' }).catch(() => {
      // Content script not loaded on this page -- ignore
    });
  }
});
