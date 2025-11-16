# Interaction Recorder - Chrome Extension

A powerful Chrome extension that records web interactions and generates automation tasks for tools like n8n, Puppeteer, Playwright, and custom sneaker bots.

## 🚀 Features

### Recording & Analysis
- **Per-Tab Recording**: Toggle recording on/off for individual tabs
- **Comprehensive Event Capture**: Records clicks, keyboard input, form interactions, scroll, navigation, and more
- **Element Metadata**: Captures tag names, IDs, classes, roles, attributes, and element ancestry
- **Privacy-Focused**: Never captures actual input values or passwords - only metadata about interactions

### Automation Task Builder (NEW in v2.0)
- **Smart Form Detection**: Automatically identifies forms, fields, and submit buttons
- **Sneaker-Bot-Style Tasks**: Generates structured automation steps (fillField, click, navigate)
- **Editable Field Mapping**: Customize field keys, labels, and requirements
- **Step Management**: Enable/disable steps and reorder automation sequences
- **Configuration Persistence**: Save and load automation configs per website

### Export Options
- **Task JSON**: Clean, n8n-ready automation task format (see [AUTOMATION_SCHEMA.md](AUTOMATION_SCHEMA.md))
- **Raw Events JSON**: Complete event log for debugging and analysis
- **Mermaid Diagrams**: Visual flowcharts of interaction flows (legacy feature)

### Modern UI (2026 Design)
- Dark theme with high contrast and subtle animations
- Tabbed interface: Events and Automation views
- Real-time event updates
- Element highlighting on hover
- Inline editing for field keys and labels

---

## 📦 Installation

### Development Mode

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the React popup bundle:
   ```bash
   npm run build
   ```
4. Open Chrome and navigate to `chrome://extensions/`
5. Enable **Developer mode** in the top right
6. Click **Load unpacked**
7. Select the **repository root folder** (the folder containing `manifest.json`)

### Development with Hot Reload (recommended)

```bash
npm run dev
```

This watches for changes and rebuilds automatically. After each rebuild, click the extension reload button in `chrome://extensions/` to pick up the latest popup bundle.

---

## 🎯 Usage

### Basic Recording

1. Click the extension icon in your browser toolbar to open the popup
2. Toggle the **Recording** switch to **ON**
3. Interact with the website (click, type, scroll, navigate)
4. Open the popup again to view recorded events in the **Events** tab
5. Toggle **OFF** when done recording

### Right-Click to Toggle Recording

Prefer a more “native” feel? You can also control recording directly from the page:

1. Right‑click anywhere on the page
2. Choose **“Toggle Interaction Recording”** from the context menu
3. The extension will start/stop recording for that tab and update the badge indicator

### Building Automation Tasks

1. After recording, switch to the **Automation** tab
2. Review detected **Forms** and **Steps**
3. Edit field keys, labels, and requirements as needed
4. Toggle steps on/off to customize the automation flow
5. Click **Save Configuration** to persist your edits
6. Export as **Task JSON** for use in n8n or other automation tools

### Editing Fields

In the Automation tab → Forms view:
- **Form Name**: Click to edit the form name
- **Field Label**: Click to edit the human-readable label
- **Field Key**: Edit the variable name used in automation scripts
- **Required**: Toggle whether the field is required
- **Selector**: Copy the CSS selector for use in scripts

### Managing Steps

In the Automation tab → Steps view:
- **Enable/Disable**: Check/uncheck steps to include/exclude them
- **View Details**: See field keys, selectors, and timestamps
- **Copy Selectors**: Click the copy button to copy selectors to clipboard

### Exporting for n8n

1. Record your interactions
2. Go to Automation tab and customize fields/steps
3. Click **🤖 Task** button to export
4. Import the JSON into your n8n workflow

See [AUTOMATION_SCHEMA.md](AUTOMATION_SCHEMA.md) for the complete JSON schema and n8n integration examples.

---

## 📊 Automation Task JSON

The Task JSON export provides a clean, structured format designed for automation:

```json
{
  "version": "1.0",
  "type": "automation-task",
  "pageUrl": "https://example.com/login",
  "forms": [
    {
      "id": "form_1",
      "name": "Login Form",
      "fields": [
        {
          "selector": "input[name='email']",
          "fieldKey": "email",
          "label": "Email Address",
          "kind": "email-input",
          "required": true
        }
      ],
      "actions": [
        {
          "selector": "button[type='submit']",
          "label": "Sign In",
          "actionType": "submit"
        }
      ]
    }
  ],
  "steps": [
    {
      "id": "step_1",
      "type": "fillField",
      "selector": "input[name='email']",
      "fieldKey": "email",
      "label": "Email Address"
    },
    {
      "id": "step_2",
      "type": "click",
      "selector": "button[type='submit']",
      "description": "Click Sign In"
    }
  ]
}
```

### Using with n8n

```javascript
// In an n8n Code node
const task = $input.first().json;

for (const step of task.steps) {
  switch (step.type) {
    case 'fillField':
      await page.fill(step.selector, data[step.fieldKey]);
      break;
    case 'click':
      await page.click(step.selector);
      break;
  }
}
```

See [AUTOMATION_SCHEMA.md](AUTOMATION_SCHEMA.md) for complete documentation.

---

## 🔧 Technical Details

### Architecture

- **Manifest V3**: Modern Chrome extension architecture with a service worker background
- **React 18**: Hooks-based popup UI with a compact, dark dashboard
- **Vite**: Fast build tool for development and production
- **Service Worker (`background.js`)**: Manages per‑tab recording state, event storage, badge state, and the right‑click context menu
- **Content Scripts (`content/*.js`)**: Injected into pages to capture interactions and highlight elements
- **Session Storage**: Events stored in `chrome.storage.session` (cleared when the browser closes)
- **Sync Storage**: Automation configs stored in `chrome.storage.sync` (synced across devices)
- **Strict CSP for Extension Pages**: Uses a content security policy that only allows scripts bundled with the extension (`script-src 'self'`)

### Project Structure

``` 
.
├── manifest.json           # Extension manifest (MV3)
├── background.js           # Service worker
├── content/
│   ├── utils.js            # Shared utilities (selector generation, etc.)
│   ├── recorder.js         # Main recording script
│   └── highlighter.js      # Element highlighting
├── popup/
│   ├── index.html          # Popup HTML (React mount point)
│   ├── popup.js            # Built React app (from src/)
│   ├── popup.css           # Minified CSS bundle (from src/popup/styles.css)
│   ├── automationModel.js  # Automation model builder
│   └── mermaid.min.js      # Mermaid diagram library (legacy diagrams)
├── src/
│   └── popup/
│       ├── index.jsx       # React entry point
│       ├── styles.css      # Modern 2026 design system
│       ├── components/
│       │   ├── App.jsx                     # Main app component
│       │   ├── RecordingToggle.jsx         # Recording control
│       │   ├── EventList.jsx               # Events tab
│       │   └── AutomationViewEditable.jsx  # Automation tab with editing
│       └── adapters/
│           ├── chromeAdapter.js            # Chrome API wrapper
│           └── storageAdapter.js           # Storage persistence
└── assets/
    └── *.png               # Extension icons
```

### Performance

- **Throttling**: Mouse move and scroll events are throttled (200-300ms)
- **Batching**: Events are sent in batches to reduce overhead
- **Buffer Limit**: Maximum 1000 events per tab (keeps most recent)
- **Minimal Impact**: Designed to have negligible performance impact

### Browser Support

- Chrome 88+ (Manifest V3 support required)
- Chromium-based browsers (Edge, Brave, Opera)

---

## 🔒 Privacy & Security

- **No Text Capture**: We never record actual typed text or input values
- **Password Protection**: Password fields are marked sensitive; keystrokes/input events are skipped
- **Masked Keys**: Keyboard events only capture key categories (Letter, Digit, Enter, etc.)
- **Per-Tab Only**: Recording only works on the tab you enable it for
- **Local Storage**: All data is stored locally in your browser
- **No Server**: No data is sent to any external servers

---

## 🛠️ Development

### Building

```bash
# Install dependencies
npm install

# Development build (watch mode)
npm run dev

# Production build
npm run build

# The built popup assets will be written into the ./popup folder
# alongside index.html and manifest.json so you can load the repo
# root directly as an unpacked extension.
```

### Testing

1. Load extension in developer mode
2. Open a test website
3. Toggle recording ON
4. Perform various interactions
5. Check Events tab for recorded events
6. Check Automation tab for detected forms/steps
7. Verify exports work correctly

### Adding Features

The codebase is modular and easy to extend:

- **New event types**: Add handlers in `content/recorder.js`
- **New step types**: Extend `buildSteps()` in `popup/automationModel.js`
- **UI components**: Add React components in `src/popup/components/`
- **Storage adapters**: Extend `src/popup/adapters/storageAdapter.js`

---

## 📋 Event Types Captured

### Mouse/Pointer Events
- `click` - Element clicks
- `dblclick` - Double clicks
- `contextmenu` - Right-click menu
- `pointerdown` / `pointerup` - Pointer interactions

### Keyboard Events
- `keydown` / `keyup` - Key presses (categorized, not actual text)

### Form Events
- `focus` / `blur` - Focus changes
- `change` - Form value changes (length only, not content)
- `input` - Input events (delta tracking, not content)

### Navigation Events
- `pageload` - Initial page load
- `pushState` / `replaceState` - SPA navigation
- `popstate` - Browser history navigation

### Other Events
- `scroll` - Scroll events (throttled)
- `resize` - Window resize (throttled)

---

## 🎨 Design System

The extension uses a modern 2026 dark theme with:

- **Design Tokens**: CSS variables for colors, spacing, typography
- **Subtle Animations**: Micro-interactions on hover, smooth transitions
- **High Contrast**: Accessible color palette with clear hierarchy
- **Consistent Spacing**: 4px base unit with logical scale
- **Modern Typography**: System fonts with careful sizing and weights

See `src/popup/styles.css` for the complete design system.

---

## 🗺️ Roadmap

### Completed (v2.0)
- ✅ Automation task builder with form/field detection
- ✅ Editable field keys and labels
- ✅ Step enable/disable and management
- ✅ Configuration persistence per website
- ✅ Modern React UI with 2026 design
- ✅ Task JSON export for n8n

### Future Ideas
- [ ] Dedicated DevTools panel with rich timeline visualization
- [ ] Export to HAR format
- [ ] Replay functionality (play back recorded interactions)
- [ ] Domain allow/deny lists
- [ ] Keyboard shortcuts and command palette
- [ ] Session history and comparison
- [ ] Visual selector builder (point-and-click)
- [ ] Multi-page flow support
- [ ] Template library for common tasks

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

### Guidelines

- Follow the existing code style
- Add comments for complex logic
- Test your changes thoroughly
- Update documentation as needed

---

## 📄 License

MIT License - feel free to use and modify as needed.

---

## 📚 Documentation

- [AUTOMATION_SCHEMA.md](AUTOMATION_SCHEMA.md) - Complete JSON schema for automation tasks

---

## 💬 Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

## 🙏 Acknowledgments

Built with:
- React 18
- Vite
- Chrome Extension APIs (Manifest V3)
- Mermaid (for flowchart diagrams)

---

**Version 2.0** - Complete rewrite with automation task builder and modern UI
