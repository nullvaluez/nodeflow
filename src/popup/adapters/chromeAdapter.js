// Chrome API adapter for easier testing and abstraction

export const chromeAdapter = {
  async getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  },

  async getRecordingState(tabId) {
    return await chrome.runtime.sendMessage({
      type: 'GET_RECORDING_STATE',
      tabId
    });
  },

  async toggleRecording(tabId) {
    return await chrome.runtime.sendMessage({
      type: 'TOGGLE_RECORDING',
      tabId
    });
  },

  async getEvents(tabId) {
    return await chrome.runtime.sendMessage({
      type: 'GET_EVENTS',
      tabId
    });
  },

  async clearEvents(tabId) {
    return await chrome.runtime.sendMessage({
      type: 'CLEAR_EVENTS',
      tabId
    });
  },

  async getExtensionId() {
    return await chrome.runtime.sendMessage({
      type: 'GET_EXTENSION_ID'
    });
  },

  async highlightElement(tabId, selector) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'HIGHLIGHT_ELEMENT',
        selector
      });
    } catch (err) {
      // Content script may not be injected
      console.warn('Could not highlight element:', err);
    }
  },

  async hideHighlight(tabId) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'HIDE_HIGHLIGHT'
      });
    } catch (err) {
      console.warn('Could not hide highlight:', err);
    }
  }
};

