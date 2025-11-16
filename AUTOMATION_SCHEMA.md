# Automation Task JSON Schema

This document describes the JSON format exported by the "Task" button in the Interaction Recorder extension. This format is designed to be consumed by automation tools like n8n, Puppeteer, Playwright, or custom sneaker bots.

## Overview

The Automation Task JSON provides a structured, high-level representation of user interactions on a web page, organized into:
- **Elements**: Unique interactive elements with selectors and metadata
- **Forms**: Detected form structures with fields and actions
- **Steps**: Sequential automation steps (fillField, click, navigate)

## Schema Version 1.0

### Root Object

```json
{
  "version": "1.0",
  "type": "automation-task",
  "pageUrl": "https://example.com/checkout",
  "forms": [...],
  "steps": [...],
  "elements": [...],
  "metadata": {
    "exportedAt": 1699564800000
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Schema version (currently "1.0") |
| `type` | string | Always "automation-task" |
| `pageUrl` | string | The URL where interactions were recorded |
| `forms` | array | Detected forms (see Form Object) |
| `steps` | array | Sequential automation steps (see Step Object) |
| `elements` | array | Unique elements referenced in steps (see Element Object) |
| `metadata` | object | Export metadata including timestamp |

---

## Form Object

Represents a detected form or logical grouping of input fields.

```json
{
  "id": "form_1",
  "name": "Login Form",
  "selector": "form#login-form",
  "fields": [...],
  "actions": [...]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique form identifier |
| `name` | string | Human-readable form name |
| `selector` | string | CSS selector for the form element (null for pseudo-forms) |
| `fields` | array | Form fields (see Field Object) |
| `actions` | array | Associated action buttons (see Action Object) |

### Field Object

```json
{
  "selector": "input[name='email']",
  "elementId": "el_abc123",
  "fieldKey": "email",
  "label": "Email Address",
  "kind": "email-input",
  "required": false,
  "sensitive": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| `selector` | string | CSS selector to locate the field |
| `elementId` | string | Reference to element in elements array |
| `fieldKey` | string | **Key for automation**: use this as the variable name |
| `label` | string | Human-readable field label |
| `kind` | string | Field type (see Element Kinds below) |
| `required` | boolean | Whether field is required |
| `sensitive` | boolean | True for password fields |

### Action Object

```json
{
  "selector": "button[type='submit']",
  "elementId": "el_def456",
  "label": "Submit",
  "kind": "submit-button",
  "actionType": "submit"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `selector` | string | CSS selector for the button/link |
| `elementId` | string | Reference to element in elements array |
| `label` | string | Button text or label |
| `kind` | string | Element kind (button, submit-button, link) |
| `actionType` | string | Inferred action type (submit, next, cancel, etc.) |

---

## Step Object

Represents a single automation step in chronological order.

### Step Types

#### 1. fillField

Fill an input field with a value.

```json
{
  "id": "step_1",
  "type": "fillField",
  "selector": "input[name='email']",
  "elementId": "el_abc123",
  "fieldKey": "email",
  "label": "Email Address",
  "formId": "form_1",
  "timestamp": 1699564800000
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique step identifier |
| `type` | string | Always "fillField" |
| `selector` | string | CSS selector for the field |
| `elementId` | string | Reference to element |
| `fieldKey` | string | **Variable name for the value to fill** |
| `label` | string | Human-readable field label |
| `formId` | string | Parent form ID (null if not in a form) |
| `timestamp` | number | When this interaction occurred |

**Usage in n8n/automation:**
```javascript
await page.fill(step.selector, variables[step.fieldKey]);
```

#### 2. click

Click a button, link, or other clickable element.

```json
{
  "id": "step_2",
  "type": "click",
  "selector": "button[type='submit']",
  "elementId": "el_def456",
  "label": "Submit",
  "description": "Click Submit",
  "timestamp": 1699564801000
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique step identifier |
| `type` | string | Always "click" |
| `selector` | string | CSS selector for the element to click |
| `elementId` | string | Reference to element |
| `label` | string | Button/link label |
| `description` | string | Human-readable step description |
| `timestamp` | number | When this interaction occurred |

**Usage in n8n/automation:**
```javascript
await page.click(step.selector);
```

#### 3. navigate

Navigate to a new page or URL change.

```json
{
  "id": "step_3",
  "type": "navigation",
  "url": "https://example.com/success",
  "description": "Navigation",
  "timestamp": 1699564802000
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique step identifier |
| `type` | string | Always "navigation" |
| `url` | string | The URL navigated to |
| `description` | string | Description of navigation event |
| `timestamp` | number | When navigation occurred |

**Usage in n8n/automation:**
```javascript
// Often used to wait for navigation after a click
await page.waitForNavigation();
```

---

## Element Object

Simplified element metadata for reference.

```json
{
  "selector": "input[name='email']",
  "kind": "email-input",
  "label": "Email Address",
  "tag": "input",
  "sensitive": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| `selector` | string | CSS selector |
| `kind` | string | Element kind (see below) |
| `label` | string | Human-readable label |
| `tag` | string | HTML tag name |
| `sensitive` | boolean | True for password fields |

### Element Kinds

| Kind | Description |
|------|-------------|
| `text-input` | Text input field |
| `email-input` | Email input field |
| `password-input` | Password input field |
| `phone-input` | Phone number input |
| `number-input` | Number input |
| `date-input` | Date picker |
| `textarea` | Multi-line text area |
| `select` | Dropdown select |
| `checkbox` | Checkbox |
| `radio` | Radio button |
| `file-input` | File upload |
| `button` | Generic button |
| `submit-button` | Form submit button |
| `link` | Hyperlink |

---

## Example: Complete Task JSON

```json
{
  "version": "1.0",
  "type": "automation-task",
  "pageUrl": "https://example.com/login",
  "forms": [
    {
      "id": "form_1",
      "name": "Login Form",
      "selector": "form#login-form",
      "fields": [
        {
          "selector": "input[name='username']",
          "elementId": "el_1a2b3c",
          "fieldKey": "username",
          "label": "Username",
          "kind": "text-input",
          "required": true,
          "sensitive": false
        },
        {
          "selector": "input[name='password']",
          "elementId": "el_4d5e6f",
          "fieldKey": "password",
          "label": "Password",
          "kind": "password-input",
          "required": true,
          "sensitive": true
        }
      ],
      "actions": [
        {
          "selector": "button[type='submit']",
          "elementId": "el_7g8h9i",
          "label": "Sign In",
          "kind": "submit-button",
          "actionType": "submit"
        }
      ]
    }
  ],
  "steps": [
    {
      "id": "step_1",
      "type": "navigation",
      "url": "https://example.com/login",
      "description": "Page loaded",
      "timestamp": 1699564800000
    },
    {
      "id": "step_2",
      "type": "fillField",
      "selector": "input[name='username']",
      "elementId": "el_1a2b3c",
      "fieldKey": "username",
      "label": "Username",
      "formId": "form_1",
      "timestamp": 1699564801000
    },
    {
      "id": "step_3",
      "type": "fillField",
      "selector": "input[name='password']",
      "elementId": "el_4d5e6f",
      "fieldKey": "password",
      "label": "Password",
      "formId": "form_1",
      "timestamp": 1699564802000
    },
    {
      "id": "step_4",
      "type": "click",
      "selector": "button[type='submit']",
      "elementId": "el_7g8h9i",
      "label": "Sign In",
      "description": "Click Sign In",
      "timestamp": 1699564803000
    }
  ],
  "elements": [
    {
      "selector": "input[name='username']",
      "kind": "text-input",
      "label": "Username",
      "tag": "input",
      "sensitive": false
    },
    {
      "selector": "input[name='password']",
      "kind": "password-input",
      "label": "Password",
      "tag": "input",
      "sensitive": true
    },
    {
      "selector": "button[type='submit']",
      "kind": "submit-button",
      "label": "Sign In",
      "tag": "button",
      "sensitive": false
    }
  ],
  "metadata": {
    "exportedAt": 1699564803500
  }
}
```

---

## Using with n8n

### Example n8n Workflow Node

```javascript
// In an n8n Code node or HTTP Request node

const taskJson = $input.first().json; // The imported task JSON

// Extract steps
const steps = taskJson.steps;

// Build automation commands
const commands = steps.map(step => {
  switch (step.type) {
    case 'fillField':
      return {
        action: 'fill',
        selector: step.selector,
        value: `{{$json.${step.fieldKey}}}` // Reference n8n variable
      };
    case 'click':
      return {
        action: 'click',
        selector: step.selector
      };
    case 'navigation':
      return {
        action: 'goto',
        url: step.url
      };
    default:
      return null;
  }
}).filter(Boolean);

return commands;
```

### Puppeteer/Playwright Example

```javascript
const taskJson = require('./automation-task.json');

async function runAutomation(page, data) {
  for (const step of taskJson.steps) {
    switch (step.type) {
      case 'fillField':
        await page.fill(step.selector, data[step.fieldKey]);
        break;
      case 'click':
        await page.click(step.selector);
        break;
      case 'navigation':
        await page.waitForURL(step.url);
        break;
    }
  }
}

// Usage
await runAutomation(page, {
  username: 'john@example.com',
  password: 'secret123'
});
```

---

## Notes

- **Selectors are stable**: The extension generates selectors using IDs, names, data-testid, and other stable attributes when possible.
- **Privacy**: No actual input values are recorded, only metadata about fields.
- **Timestamps**: All timestamps are Unix epoch milliseconds.
- **Field keys**: Use `fieldKey` as variable names in your automation scripts.
- **Sensitive fields**: Password fields are marked `sensitive: true` and have limited event data.

---

## Version History

- **1.0** (Initial): Basic form detection, steps, and elements

