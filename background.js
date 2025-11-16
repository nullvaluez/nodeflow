// Background service worker for Interaction Recorder
// Manages per-tab recording state, content script injection, and event storage

const STORAGE_KEY_PREFIX = 'events_tab_';
const RECORDING_STATE_KEY = 'recording_tabs';
const MAX_EVENTS_PER_TAB = 1000;
const INSTALL_ID_KEY = 'extension_install_id';

// Initialize recording state and context menu on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('Interaction Recorder installed');
  console.log('Extension ID:', chrome.runtime.id);
  chrome.storage.session.set({ [RECORDING_STATE_KEY]: {} });

  // Persist the install-time extension ID so we can sanity-check it later
  chrome.storage.local.set({ [INSTALL_ID_KEY]: chrome.runtime.id }).catch?.(() => {});

  // Create a context menu item to toggle recording from the page
  try {
    chrome.contextMenus.create({
      id: 'interaction-recorder-toggle',
      title: 'Toggle Interaction Recording',
      contexts: ['page', 'frame']
    });
  } catch (error) {
    // Context menu may already exist on reload during development
    console.warn('Could not create context menu:', error);
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'interaction-recorder-toggle' && tab && typeof tab.id === 'number') {
    toggleRecording(tab.id).catch((error) => {
      console.error('Failed to toggle recording from context menu:', error);
    });
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Basic validation: ignore malformed messages
  if (!message || typeof message.type !== 'string') {
    return;
  }

  if (message.type === 'TOGGLE_RECORDING') {
    toggleRecording(message.tabId).then(sendResponse);
    return true; // Keep channel open for async response
  }
  
  if (message.type === 'GET_RECORDING_STATE') {
    getRecordingState(message.tabId).then(sendResponse);
    return true;
  }
  
  if (message.type === 'GET_EVENTS') {
    getEvents(message.tabId).then(sendResponse);
    return true;
  }
  
  if (message.type === 'CLEAR_EVENTS') {
    clearEvents(message.tabId).then(sendResponse);
    return true;
  }
  
  if (message.type === 'EVENT_BATCH') {
    handleEventBatch(sender.tab.id, message.events).then(sendResponse);
    return true;
  }

  if (message.type === 'GET_EXTENSION_ID') {
    handleGetExtensionId(sendResponse);
    return true; // async response
  }

  if (message.type === 'RECORDER_READY') {
    console.log(`Recorder ready in tab ${sender.tab.id}`);
    sendResponse({ success: true });
    return false;
  }
});

// Return the current runtime ID and the ID stored at install time, and whether they match
async function handleGetExtensionId(sendResponse) {
  try {
    const data = await chrome.storage.local.get(INSTALL_ID_KEY);
    let installId = data[INSTALL_ID_KEY];

    // First run / missing value: initialize it now
    if (!installId) {
      installId = chrome.runtime.id;
      await chrome.storage.local.set({ [INSTALL_ID_KEY]: installId });
    }

    const extensionId = chrome.runtime.id;
    const consistent = installId === extensionId;

    sendResponse({
      extensionId,
      installExtensionId: installId,
      consistent
    });
  } catch (error) {
    console.error('Failed to read extension install ID:', error);
    sendResponse({
      extensionId: chrome.runtime.id,
      installExtensionId: null,
      consistent: false
    });
  }
}

// Toggle recording for a specific tab
async function toggleRecording(tabId) {
  const data = await chrome.storage.session.get(RECORDING_STATE_KEY);
  const recordingTabs = data[RECORDING_STATE_KEY] || {};
  
  const isRecording = recordingTabs[tabId] || false;
  const newState = !isRecording;
  
  recordingTabs[tabId] = newState;
  await chrome.storage.session.set({ [RECORDING_STATE_KEY]: recordingTabs });
  
  if (newState) {
    // Start recording - inject content script
    await injectRecorder(tabId);
    // Update badge to show recording
    await chrome.action.setBadgeText({ tabId, text: '●' });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#ef4444' });
  } else {
    // Stop recording - send message to content script to cleanup
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'STOP_RECORDING' });
    } catch (error) {
      // Content script may not be present
      console.log('Could not send stop message:', error);
    }
    // Clear badge
    await chrome.action.setBadgeText({ tabId, text: '' });
  }
  
  return { isRecording: newState };
}

// Get recording state for a tab
async function getRecordingState(tabId) {
  const data = await chrome.storage.session.get(RECORDING_STATE_KEY);
  const recordingTabs = data[RECORDING_STATE_KEY] || {};
  return { isRecording: recordingTabs[tabId] || false };
}

// Inject recorder content script
async function injectRecorder(tabId) {
  try {
    // Check if script is already injected by trying to send a ping
    try {
      const response = await chrome.tabs.sendMessage(tabId, { type: 'PING' });
      if (response && response.pong) {
        console.log('Recorder already injected in tab', tabId);
        return;
      }
    } catch (e) {
      // Script not injected, continue with injection
    }
    
    // Inject the utilities, highlighter and recorder scripts (order matters)
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      files: ['content/utils.js', 'content/highlighter.js', 'content/recorder.js']
    });
    
    console.log('Recorder injected into tab', tabId);
  } catch (error) {
    console.error('Failed to inject recorder:', error);
    throw error;
  }
}

// Handle batch of events from content script
async function handleEventBatch(tabId, events) {
  if (!events || events.length === 0) {
    return { success: true };
  }
  
  // Get existing events
  const storageKey = STORAGE_KEY_PREFIX + tabId;
  const data = await chrome.storage.session.get(storageKey);
  let existingEvents = data[storageKey] || [];
  
  // Add new events
  existingEvents = existingEvents.concat(events);
  
  // Limit to MAX_EVENTS_PER_TAB (keep most recent)
  if (existingEvents.length > MAX_EVENTS_PER_TAB) {
    existingEvents = existingEvents.slice(-MAX_EVENTS_PER_TAB);
  }
  
  // Store back
  await chrome.storage.session.set({ [storageKey]: existingEvents });
  
  return { success: true, count: existingEvents.length };
}

// Get all events for a tab
async function getEvents(tabId) {
  const storageKey = STORAGE_KEY_PREFIX + tabId;
  const data = await chrome.storage.session.get(storageKey);
  return { events: data[storageKey] || [] };
}

// Clear events for a tab
async function clearEvents(tabId) {
  const storageKey = STORAGE_KEY_PREFIX + tabId;
  await chrome.storage.session.remove(storageKey);
  return { success: true };
}

// Listen for navigation events to re-inject recorder if recording
chrome.webNavigation.onCommitted.addListener(async (details) => {
  // Only handle main frame navigations
  if (details.frameId !== 0) return;
  
  const tabId = details.tabId;
  
  // Check if this tab is being recorded
  const data = await chrome.storage.session.get(RECORDING_STATE_KEY);
  const recordingTabs = data[RECORDING_STATE_KEY] || {};
  
  if (recordingTabs[tabId]) {
    // Re-inject recorder after navigation
    console.log('Re-injecting recorder after navigation in tab', tabId);
    
    // Small delay to ensure page is ready
    setTimeout(async () => {
      try {
        await injectRecorder(tabId);
      } catch (error) {
        console.error('Failed to re-inject recorder:', error);
      }
    }, 100);
  }
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  // Remove from recording state
  const data = await chrome.storage.session.get(RECORDING_STATE_KEY);
  const recordingTabs = data[RECORDING_STATE_KEY] || {};
  delete recordingTabs[tabId];
  await chrome.storage.session.set({ [RECORDING_STATE_KEY]: recordingTabs });
  
  // Remove events
  await clearEvents(tabId);
});

