chrome.runtime.onMessage.addListener((msg: { type: string }) => {
  if (msg.type === 'uninsta-toggle') {
    document.dispatchEvent(new CustomEvent('uninsta-toggle'));
  }
});
