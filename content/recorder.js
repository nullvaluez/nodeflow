// Content script for recording user interactions
// This script is injected into pages when recording is enabled

(function() {
  'use strict';
  
  // Prevent duplicate injection
  if (window.__INTERACTION_RECORDER_LOADED__) {
    console.log('NodeFlow recorder already loaded');
    return;
  }
  window.__INTERACTION_RECORDER_LOADED__ = true;
  
  // Import utilities from shared module
  // Note: In a content script context, we need to load utils.js first via manifest
  // For now, we'll check if utilities are available in the global scope
  const {
    generateSelector,
    generateAncestry,
    describeElement,
    categorizeKey,
    throttle
  } = window.__INTERACTION_RECORDER_UTILS__ || {};
  
  // Recorder state
  let eventBuffer = [];
  let sessionId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  let eventCounter = 0;
  let currentGestureId = null;
  let isRecording = true;
  
  // Send events to background in batches
  function sendEvents() {
    if (eventBuffer.length === 0) return;
    
    const batch = eventBuffer.slice();
    eventBuffer = [];
    
    chrome.runtime.sendMessage({
      type: 'EVENT_BATCH',
      events: batch
    }).catch(err => {
      console.warn('Failed to send events:', err);
      // Re-add to buffer if send failed
      eventBuffer = batch.concat(eventBuffer);
    });
  }
  
  // Debounced send
  const debouncedSend = throttle(sendEvents, 500);
  
  // Create event record
  function createEvent(type, element, extraData = {}) {
    const elementData = element ? describeElement(element) : {};
    
    // Mark sensitive fields (passwords) but still record the element structure
    // We never record actual values, just metadata
    if (elementData.isPassword) {
      elementData.sensitive = true;
      // For sensitive fields, skip keystroke/input events to avoid any leakage
      if (type === 'keydown' || type === 'keyup' || type === 'input') {
        return null;
      }
    }
    
    const event = {
      id: `${sessionId}-${eventCounter++}`,
      ts: Date.now(),
      type,
      pageUrl: window.location.href,
      sessionId,
      gestureId: currentGestureId,
      ...elementData,
      ...extraData
    };
    
    return event;
  }
  
  // Record an event
  function recordEvent(type, element, extraData = {}) {
    if (!isRecording) return;
    
    const event = createEvent(type, element, extraData);
    if (event) {
      eventBuffer.push(event);
      debouncedSend();
    }
  }
  
  // Start a new gesture
  function startGesture() {
    currentGestureId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
  
  function endGesture() {
    setTimeout(() => {
      currentGestureId = null;
    }, 100);
  }
  
  // Event listeners
  
  // Click events
  document.addEventListener('click', (e) => {
    const target = e.composedPath ? e.composedPath()[0] : e.target;
    startGesture();
    recordEvent('click', target, {
      button: e.button,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey
    });
    endGesture();
  }, true);
  
  document.addEventListener('dblclick', (e) => {
    const target = e.composedPath ? e.composedPath()[0] : e.target;
    startGesture();
    recordEvent('dblclick', target);
    endGesture();
  }, true);
  
  document.addEventListener('contextmenu', (e) => {
    const target = e.composedPath ? e.composedPath()[0] : e.target;
    startGesture();
    recordEvent('contextmenu', target);
    endGesture();
  }, true);
  
  // Pointer events
  document.addEventListener('pointerdown', (e) => {
    const target = e.composedPath ? e.composedPath()[0] : e.target;
    startGesture();
    recordEvent('pointerdown', target, {
      pointerType: e.pointerType,
      button: e.button
    });
  }, true);
  
  document.addEventListener('pointerup', (e) => {
    const target = e.composedPath ? e.composedPath()[0] : e.target;
    recordEvent('pointerup', target, {
      pointerType: e.pointerType
    });
    endGesture();
  }, true);
  
  // Keyboard events
  let lastKeyTarget = null;
  
  document.addEventListener('keydown', (e) => {
    const target = e.composedPath ? e.composedPath()[0] : e.target;
    lastKeyTarget = target;
    
    if (!currentGestureId) {
      startGesture();
    }
    
    recordEvent('keydown', target, {
      key: { category: categorizeKey(e.key) },
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey
    });
  }, true);
  
  document.addEventListener('keyup', (e) => {
    const target = e.composedPath ? e.composedPath()[0] : e.target;
    recordEvent('keyup', target, {
      key: { category: categorizeKey(e.key) }
    });
    
    // End gesture after a delay
    setTimeout(() => {
      if (lastKeyTarget === target) {
        endGesture();
      }
    }, 1000);
  }, true);
  
  // Form events
  document.addEventListener('focus', (e) => {
    const target = e.target;
    recordEvent('focus', target);
  }, true);
  
  document.addEventListener('blur', (e) => {
    const target = e.target;
    recordEvent('blur', target);
  }, true);
  
  document.addEventListener('change', (e) => {
    const target = e.target;
    recordEvent('change', target, {
      input: {
        valueLength: target.value ? target.value.length : 0
      }
    });
  }, true);
  
  let lastInputLength = new WeakMap();
  
  document.addEventListener('input', (e) => {
    const target = e.target;
    const oldLength = lastInputLength.get(target) || 0;
    const newLength = target.value ? target.value.length : 0;
    const lengthDelta = newLength - oldLength;
    lastInputLength.set(target, newLength);
    
    recordEvent('input', target, {
      input: {
        lengthDelta,
        valueLength: newLength
      }
    });
  }, true);
  
  // Scroll events (throttled)
  const handleScroll = throttle((e) => {
    const target = e.target === document ? document.documentElement : e.target;
    recordEvent('scroll', target, {
      scrollTop: target.scrollTop,
      scrollLeft: target.scrollLeft
    });
  }, 300);
  
  document.addEventListener('scroll', handleScroll, true);
  
  // Resize events (throttled)
  const handleResize = throttle(() => {
    recordEvent('resize', document.documentElement, {
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight
    });
  }, 300);
  
  window.addEventListener('resize', handleResize);
  
  // History/Navigation hooks
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function(...args) {
    recordEvent('pushState', null, {
      url: args[2] || window.location.href,
      state: args[0]
    });
    return originalPushState.apply(this, args);
  };
  
  history.replaceState = function(...args) {
    recordEvent('replaceState', null, {
      url: args[2] || window.location.href,
      state: args[0]
    });
    return originalReplaceState.apply(this, args);
  };
  
  window.addEventListener('popstate', (e) => {
    recordEvent('popstate', null, {
      url: window.location.href,
      state: e.state
    });
  });
  
  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'STOP_RECORDING') {
      isRecording = false;
      sendEvents(); // Send any remaining events
      sendResponse({ success: true });
      return false;
    }
    
    if (message.type === 'PING') {
      sendResponse({ pong: true });
      return false;
    }
    
    // Note: HIGHLIGHT_ELEMENT is handled by highlighter.js
  });
  
  // Initial page load event
  recordEvent('pageload', document.documentElement, {
    url: window.location.href,
    title: document.title
  });
  
  // Notify background that recorder is ready
  chrome.runtime.sendMessage({
    type: 'RECORDER_READY'
  }).catch(err => {
    console.warn('Could not notify background:', err);
  });
  
  console.log('NodeFlow recorder active on', window.location.href);
})();

