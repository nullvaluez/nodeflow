// Utility functions for element selection and description
// These utilities are shared between recorder.js and other content scripts

(function() {
  'use strict';

  // Generate a stable CSS selector for an element
  function generateSelector(element) {
    if (!element || element.nodeType !== 1) return null;
    
    // If element has an ID, use it
    if (element.id) {
      return `#${CSS.escape(element.id)}`;
    }
    
    // Try to build a selector using attributes
    const tag = element.tagName.toLowerCase();
    let selector = tag;
    
    // Add data-testid if present (commonly used for testing)
    const testId = element.getAttribute('data-testid');
    if (testId) {
      return `${tag}[data-testid="${CSS.escape(testId)}"]`;
    }
    
    // Add name attribute if present
    const name = element.getAttribute('name');
    if (name) {
      return `${tag}[name="${CSS.escape(name)}"]`;
    }
    
    // Add first class if present
    if (element.classList.length > 0) {
      const firstClass = element.classList[0];
      selector += `.${CSS.escape(firstClass)}`;
      
      // Check if this is unique
      try {
        const matches = document.querySelectorAll(selector);
        if (matches.length === 1) {
          return selector;
        }
      } catch (e) {
        // Invalid selector, continue
      }
    }
    
    // Add role if present
    const role = element.getAttribute('role');
    if (role) {
      const roleSelector = `${tag}[role="${CSS.escape(role)}"]`;
      try {
        const matches = document.querySelectorAll(roleSelector);
        if (matches.length === 1) {
          return roleSelector;
        }
      } catch (e) {
        // Invalid selector, continue
      }
    }
    
    // Fall back to nth-of-type
    let sibling = element;
    let nth = 1;
    while (sibling.previousElementSibling) {
      sibling = sibling.previousElementSibling;
      if (sibling.tagName === element.tagName) {
        nth++;
      }
    }
    
    const parent = element.parentElement;
    if (parent && parent !== document.documentElement) {
      const parentSelector = generateSelector(parent);
      return `${parentSelector} > ${tag}:nth-of-type(${nth})`;
    }
    
    return `${tag}:nth-of-type(${nth})`;
  }

  // Generate ancestry breadcrumb for an element
  function generateAncestry(element) {
    const ancestry = [];
    let current = element;
    
    while (current && current !== document.body && current !== document.documentElement) {
      const tag = current.tagName.toLowerCase();
      let label = tag;
      
      if (current.id) {
        label += `#${current.id}`;
      }
      
      if (current.classList.length > 0) {
        const classes = Array.from(current.classList).slice(0, 3).join('.');
        label += `.${classes}`;
      }
      
      ancestry.unshift(label);
      current = current.parentElement;
    }
    
    return ancestry;
  }

  // Create a detailed element descriptor
  function describeElement(element) {
    if (!element || element.nodeType !== 1) {
      return null;
    }
    
    const tag = element.tagName.toLowerCase();
    const rect = element.getBoundingClientRect();
    
    return {
      selector: generateSelector(element),
      tag,
      idAttr: element.id || null,
      classes: Array.from(element.classList),
      role: element.getAttribute('role'),
      attrs: {
        name: element.getAttribute('name'),
        type: element.getAttribute('type'),
        ariaLabel: element.getAttribute('aria-label'),
        href: element.getAttribute('href'),
        dataTestid: element.getAttribute('data-testid'),
        placeholder: element.getAttribute('placeholder')
      },
      ancestry: generateAncestry(element),
      bbox: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
        scrollX: Math.round(window.scrollX),
        scrollY: Math.round(window.scrollY)
      },
      isContentEditable: element.isContentEditable,
      isPassword: element.getAttribute('type') === 'password'
    };
  }

  // Categorize keyboard keys
  function categorizeKey(key) {
    if (/^F\d+$/.test(key)) return 'Function';
    if (/^(Shift|Alt|Control|Meta|CapsLock)$/.test(key)) return 'Modifier';
    if (/^(Enter|Backspace|Tab|Escape|Delete)$/.test(key)) return key;
    if (/^Arrow(Up|Down|Left|Right)$/.test(key)) return 'Arrow';
    if (/^(Home|End|PageUp|PageDown)$/.test(key)) return 'Navigation';
    if (/^[0-9]$/.test(key)) return 'Digit';
    if (/^[a-zA-Z]$/.test(key)) return 'Letter';
    if (key === ' ') return 'Space';
    return 'Other';
  }

  // Throttle function
  function throttle(func, wait) {
    let timeout = null;
    let lastRan = 0;
    
    return function(...args) {
      const context = this;
      const now = Date.now();
      
      if (!lastRan) {
        func.apply(context, args);
        lastRan = now;
      } else {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          if (now - lastRan >= wait) {
            func.apply(context, args);
            lastRan = now;
          }
        }, wait - (now - lastRan));
      }
    };
  }

  // Debounce function
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }

  // Export utilities to global scope for use by other content scripts
  window.__INTERACTION_RECORDER_UTILS__ = {
    generateSelector,
    generateAncestry,
    describeElement,
    categorizeKey,
    throttle,
    debounce
  };
})();
