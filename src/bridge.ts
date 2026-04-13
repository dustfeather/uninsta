// Notify background that we're on an Instagram DM page — activates color icon
chrome.runtime.sendMessage({ type: 'uninsta-active' });

chrome.runtime.onMessage.addListener((msg: { type: string }) => {
  if (msg.type === 'uninsta-toggle') {
    document.dispatchEvent(new CustomEvent('uninsta-toggle'));
  }
});
