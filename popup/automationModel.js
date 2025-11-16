// Automation Model Builder
// Transforms raw interaction events into structured automation tasks (sneaker-bot style)

/**
 * Build an automation model from raw events
 * @param {Array} events - Raw event array from recorder
 * @returns {Object} Automation model with elements, forms, and steps
 */
function buildAutomationModel(events) {
  if (!events || events.length === 0) {
    return {
      pageUrl: '',
      elements: [],
      forms: [],
      steps: []
    };
  }

  const pageUrl = events[0]?.pageUrl || '';
  
  // Step 1: Build element profiles from events
  const elementProfiles = buildElementProfiles(events);
  
  // Step 2: Detect forms and group fields
  const forms = detectForms(events, elementProfiles);
  
  // Step 3: Build step sequence from events
  const steps = buildSteps(events, elementProfiles, forms);
  
  return {
    pageUrl,
    elements: Array.from(elementProfiles.values()),
    forms,
    steps
  };
}

/**
 * Build element profiles by grouping events by selector
 * @param {Array} events
 * @returns {Map} Map of selector -> element profile
 */
function buildElementProfiles(events) {
  const profiles = new Map();
  
  events.forEach(event => {
    if (!event.selector) return;
    
    const selector = event.selector;
    
    if (!profiles.has(selector)) {
      // Create new element profile
      const profile = {
        id: generateElementId(selector),
        selector,
        tag: event.tag,
        idAttr: event.idAttr,
        classes: event.classes || [],
        role: event.role,
        attrs: event.attrs || {},
        kind: inferElementKind(event),
        label: deriveElementLabel(event),
        interactionTypes: new Set(),
        sensitive: event.sensitive || false
      };
      profiles.set(selector, profile);
    }
    
    // Track interaction types for this element
    const profile = profiles.get(selector);
    profile.interactionTypes.add(event.type);
  });
  
  // Convert Sets to arrays for JSON serialization
  profiles.forEach(profile => {
    profile.interactionTypes = Array.from(profile.interactionTypes);
  });
  
  return profiles;
}

/**
 * Infer the semantic kind of an element from its properties
 * @param {Object} event - Event with element data
 * @returns {string} Element kind
 */
function inferElementKind(event) {
  const tag = event.tag?.toLowerCase();
  const type = event.attrs?.type?.toLowerCase();
  const role = event.role?.toLowerCase();
  
  // Form elements
  if (tag === 'input') {
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (type === 'submit') return 'submit-button';
    if (type === 'button') return 'button';
    if (type === 'password') return 'password-input';
    if (type === 'email') return 'email-input';
    if (type === 'tel') return 'phone-input';
    if (type === 'number') return 'number-input';
    if (type === 'date') return 'date-input';
    if (type === 'file') return 'file-input';
    return 'text-input';
  }
  
  if (tag === 'textarea') return 'textarea';
  if (tag === 'select') return 'select';
  if (tag === 'button') return type === 'submit' ? 'submit-button' : 'button';
  if (tag === 'a') return 'link';
  if (tag === 'form') return 'form';
  
  // Role-based inference
  if (role === 'button') return 'button';
  if (role === 'link') return 'link';
  if (role === 'textbox') return 'text-input';
  if (role === 'checkbox') return 'checkbox';
  if (role === 'radio') return 'radio';
  
  // Generic
  return tag || 'unknown';
}

/**
 * Derive a human-readable label for an element
 * @param {Object} event - Event with element data
 * @returns {string} Label
 */
function deriveElementLabel(event) {
  const attrs = event.attrs || {};
  
  // Priority order for label derivation
  if (attrs.ariaLabel) return attrs.ariaLabel;
  if (attrs.placeholder) return attrs.placeholder;
  if (attrs.name) return humanizeFieldName(attrs.name);
  if (event.idAttr) return humanizeFieldName(event.idAttr);
  
  // For buttons/links, we might want to extract text content
  // but we don't have that in events - could be added later
  
  return event.tag || 'element';
}

/**
 * Convert a field name like "user_email" to "User Email"
 * @param {string} name
 * @returns {string}
 */
function humanizeFieldName(name) {
  return name
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Generate a stable ID for an element
 * @param {string} selector
 * @returns {string}
 */
function generateElementId(selector) {
  // Simple hash of selector for stable IDs
  let hash = 0;
  for (let i = 0; i < selector.length; i++) {
    const char = selector.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'el_' + Math.abs(hash).toString(36);
}

/**
 * Detect forms and group fields
 * @param {Array} events
 * @param {Map} elementProfiles
 * @returns {Array} Form definitions
 */
function detectForms(events, elementProfiles) {
  const forms = [];
  const formElements = new Map(); // selector -> form info
  const fieldsByForm = new Map(); // form selector -> fields
  
  // Find all form elements and their children
  events.forEach(event => {
    if (!event.selector || !event.ancestry) return;
    
    // Check if this element is inside a form
    const formAncestor = event.ancestry.find(a => a.startsWith('form'));
    
    if (formAncestor) {
      if (!fieldsByForm.has(formAncestor)) {
        fieldsByForm.set(formAncestor, []);
      }
      
      // If this is an input/select/textarea, add it as a field
      const profile = elementProfiles.get(event.selector);
      if (profile && isFieldElement(profile.kind)) {
        const fields = fieldsByForm.get(formAncestor);
        if (!fields.find(f => f.selector === event.selector)) {
          fields.push({
            selector: event.selector,
            elementId: profile.id,
            fieldKey: deriveFieldKey(profile),
            label: profile.label,
            kind: profile.kind,
            required: false, // Could be inferred from attrs.required
            sensitive: profile.sensitive
          });
        }
      }
    }
  });
  
  // Build form objects
  let formCounter = 1;
  fieldsByForm.forEach((fields, formSelector) => {
    if (fields.length === 0) return;
    
    // Find submit buttons associated with this form
    const actions = findFormActions(events, elementProfiles, formSelector);
    
    forms.push({
      id: `form_${formCounter++}`,
      name: humanizeFieldName(formSelector.replace(/^form[#.]?/, '')) || `Form ${formCounter}`,
      selector: formSelector,
      fields,
      actions
    });
  });
  
  // Also detect "pseudo-forms" - groups of fields without a <form> tag
  // Look for clusters of input events that aren't in a form
  const unassignedFields = Array.from(elementProfiles.values())
    .filter(p => isFieldElement(p.kind))
    .filter(p => !forms.some(f => f.fields.some(field => field.selector === p.selector)));
  
  if (unassignedFields.length > 0) {
    forms.push({
      id: `form_${formCounter++}`,
      name: 'Unassigned Fields',
      selector: null,
      fields: unassignedFields.map(p => ({
        selector: p.selector,
        elementId: p.id,
        fieldKey: deriveFieldKey(p),
        label: p.label,
        kind: p.kind,
        required: false,
        sensitive: p.sensitive
      })),
      actions: []
    });
  }
  
  return forms;
}

/**
 * Check if an element kind represents a form field
 * @param {string} kind
 * @returns {boolean}
 */
function isFieldElement(kind) {
  return [
    'text-input', 'password-input', 'email-input', 'phone-input',
    'number-input', 'date-input', 'textarea', 'select',
    'checkbox', 'radio', 'file-input'
  ].includes(kind);
}

/**
 * Derive a fieldKey from element profile
 * @param {Object} profile
 * @returns {string}
 */
function deriveFieldKey(profile) {
  const attrs = profile.attrs || {};
  
  // Use name attribute if available
  if (attrs.name) return attrs.name;
  
  // Use id if available
  if (profile.idAttr) return profile.idAttr;
  
  // Use placeholder as fallback
  if (attrs.placeholder) {
    return attrs.placeholder
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }
  
  // Generic fallback
  return `field_${profile.id}`;
}

/**
 * Find action buttons (submit, etc.) associated with a form
 * @param {Array} events
 * @param {Map} elementProfiles
 * @param {string} formSelector
 * @returns {Array}
 */
function findFormActions(events, elementProfiles, formSelector) {
  const actions = [];
  
  // Find click events on buttons within this form
  events.forEach(event => {
    if (event.type !== 'click' || !event.selector || !event.ancestry) return;
    
    // Check if this click is inside the form
    const isInForm = event.ancestry.some(a => a === formSelector || a.includes(formSelector));
    if (!isInForm) return;
    
    const profile = elementProfiles.get(event.selector);
    if (!profile) return;
    
    // Check if it's a button-like element
    if (profile.kind.includes('button') || profile.kind === 'link') {
      if (!actions.find(a => a.selector === event.selector)) {
        actions.push({
          selector: event.selector,
          elementId: profile.id,
          label: profile.label,
          kind: profile.kind,
          actionType: inferActionType(profile)
        });
      }
    }
  });
  
  return actions;
}

/**
 * Infer the type of action (submit, cancel, next, etc.)
 * @param {Object} profile
 * @returns {string}
 */
function inferActionType(profile) {
  const label = (profile.label || '').toLowerCase();
  const attrs = profile.attrs || {};
  const type = (attrs.type || '').toLowerCase();
  
  if (type === 'submit' || label.includes('submit') || label.includes('send')) {
    return 'submit';
  }
  if (label.includes('next') || label.includes('continue')) {
    return 'next';
  }
  if (label.includes('back') || label.includes('previous')) {
    return 'back';
  }
  if (label.includes('cancel') || label.includes('close')) {
    return 'cancel';
  }
  if (label.includes('add') || label.includes('cart')) {
    return 'add_to_cart';
  }
  if (label.includes('buy') || label.includes('purchase') || label.includes('checkout')) {
    return 'checkout';
  }
  
  return 'action';
}

/**
 * Build step sequence from events
 * @param {Array} events
 * @param {Map} elementProfiles
 * @param {Array} forms
 * @returns {Array}
 */
function buildSteps(events, elementProfiles, forms) {
  const steps = [];
  let stepCounter = 1;
  
  // Track which elements we've already created steps for
  const processedSelectors = new Set();
  
  // Group events by gesture to identify logical steps
  const gestures = groupEventsByGesture(events);
  
  gestures.forEach(gesture => {
    // Determine the primary action in this gesture
    const clickEvent = gesture.find(e => e.type === 'click');
    const inputEvents = gesture.filter(e => e.type === 'input' || e.type === 'change');
    const focusEvent = gesture.find(e => e.type === 'focus');
    
    // Input/change events -> fillField step
    inputEvents.forEach(event => {
      if (!event.selector || processedSelectors.has(event.selector)) return;
      
      const profile = elementProfiles.get(event.selector);
      if (!profile || !isFieldElement(profile.kind)) return;
      
      // Find which form this field belongs to
      const form = forms.find(f => f.fields.some(field => field.selector === event.selector));
      const field = form?.fields.find(f => f.selector === event.selector);
      
      steps.push({
        id: `step_${stepCounter++}`,
        type: 'fillField',
        selector: event.selector,
        elementId: profile.id,
        fieldKey: field?.fieldKey || deriveFieldKey(profile),
        label: profile.label,
        formId: form?.id || null,
        timestamp: event.ts
      });
      
      processedSelectors.add(event.selector);
    });
    
    // Click events -> click step
    if (clickEvent && !processedSelectors.has(clickEvent.selector)) {
      const profile = elementProfiles.get(clickEvent.selector);
      if (profile) {
        const stepType = profile.kind.includes('button') ? 'click' : 'navigate';
        
        steps.push({
          id: `step_${stepCounter++}`,
          type: stepType,
          selector: clickEvent.selector,
          elementId: profile.id,
          label: profile.label,
          description: `Click ${profile.label}`,
          timestamp: clickEvent.ts
        });
        
        processedSelectors.add(clickEvent.selector);
      }
    }
  });
  
  // Add navigation events as steps
  events.forEach(event => {
    if (event.type === 'pageload' || event.type === 'pushState' || event.type === 'popstate') {
      steps.push({
        id: `step_${stepCounter++}`,
        type: 'navigation',
        url: event.url || event.pageUrl,
        description: event.type === 'pageload' ? 'Page loaded' : 'Navigation',
        timestamp: event.ts
      });
    }
  });
  
  // Sort steps by timestamp
  steps.sort((a, b) => a.timestamp - b.timestamp);
  
  return steps;
}

/**
 * Group events by gesture ID
 * @param {Array} events
 * @returns {Array} Array of gesture groups
 */
function groupEventsByGesture(events) {
  const gestures = [];
  const gestureMap = new Map();
  
  events.forEach(event => {
    if (event.gestureId) {
      if (!gestureMap.has(event.gestureId)) {
        gestureMap.set(event.gestureId, []);
      }
      gestureMap.get(event.gestureId).push(event);
    } else {
      // Events without gesture ID are standalone
      gestures.push([event]);
    }
  });
  
  // Add all grouped gestures
  gestureMap.forEach(gesture => gestures.push(gesture));
  
  return gestures;
}

// Export for use in popup
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildAutomationModel };
}
