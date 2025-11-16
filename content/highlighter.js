// Element highlighter for interaction recorder
// Highlights elements on the page when hovering over events in the popup

(function() {
  'use strict';
  
  // Prevent duplicate injection
  if (window.__HIGHLIGHTER_LOADED__) {
    return;
  }
  window.__HIGHLIGHTER_LOADED__ = true;
  
  // Create highlight overlay
  let highlightOverlay = null;
  
  function createHighlightOverlay() {
    if (highlightOverlay) return highlightOverlay;
    
    highlightOverlay = document.createElement('div');
    highlightOverlay.id = '__interaction-recorder-highlight__';
    highlightOverlay.style.cssText = `
      position: absolute;
      pointer-events: none;
      z-index: 2147483647;
      border: 2px solid #3b82f6;
      background: rgba(59, 130, 246, 0.1);
      border-radius: 4px;
      transition: all 0.2s ease;
      display: none;
    `;
    
    document.body.appendChild(highlightOverlay);
    return highlightOverlay;
  }
  
  function highlightElement(selector) {
    if (!selector) {
      hideHighlight();
      return;
    }
    
    try {
      const element = document.querySelector(selector);
      if (!element) {
        hideHighlight();
        return;
      }
      
      const overlay = createHighlightOverlay();
      const rect = element.getBoundingClientRect();
      
      overlay.style.display = 'block';
      overlay.style.top = (rect.top + window.scrollY) + 'px';
      overlay.style.left = (rect.left + window.scrollX) + 'px';
      overlay.style.width = rect.width + 'px';
      overlay.style.height = rect.height + 'px';
      
      // Scroll element into view
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    } catch (error) {
      console.warn('Failed to highlight element:', error);
      hideHighlight();
    }
  }
  
  function hideHighlight() {
    if (highlightOverlay) {
      highlightOverlay.style.display = 'none';
    }
  }
  
  // Listen for highlight messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'HIGHLIGHT_ELEMENT') {
      highlightElement(message.selector);
      sendResponse({ success: true });
      return false;
    }
    
    if (message.type === 'HIDE_HIGHLIGHT') {
      hideHighlight();
      sendResponse({ success: true });
      return false;
    }
  });
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    if (highlightOverlay) {
      highlightOverlay.remove();
    }
  });
})();

