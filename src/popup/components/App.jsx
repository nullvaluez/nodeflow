import React, { useState, useEffect } from 'react';
import RecordingToggle from './RecordingToggle';
import EventList from './EventList';
import AutomationViewEditable from './AutomationViewEditable';
import { chromeAdapter } from '../adapters/chromeAdapter';

function App() {
  const [currentTab, setCurrentTab] = useState('events');
  const [tabId, setTabId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [events, setEvents] = useState([]);
  const [automationModel, setAutomationModel] = useState(null);
  const [isExtensionValid, setIsExtensionValid] = useState(true);

  // Initialize - validate extension ID consistency, then get current tab and load state
  useEffect(() => {
    async function init() {
      // Security check: ensure the runtime ID matches the ID stored at install time
      try {
        const result = await chromeAdapter.getExtensionId();
        if (!result || result.consistent === false) {
          console.error('Interaction Recorder: extension ID consistency check failed', result);
          setIsExtensionValid(false);
          return;
        }
      } catch (err) {
        console.error('Interaction Recorder: failed to validate extension ID', err);
        setIsExtensionValid(false);
        return;
      }

      const tab = await chromeAdapter.getCurrentTab();
      setTabId(tab.id);
      
      // Load recording state
      const state = await chromeAdapter.getRecordingState(tab.id);
      setIsRecording(state.isRecording);
      
      // Load events
      await loadEvents(tab.id);
    }
    
    init();
  }, []);

  if (!isExtensionValid) {
    return (
      <div className="app">
        <div className="header">
          <h1>NodeFlow</h1>
          <p>Security check failed</p>
        </div>
        <div className="tab-content">
          <div className="automation-section">
            <div className="empty-state">
              <div className="empty-text">
                This build of NodeFlow is not authorized for this extension ID.
              </div>
            </div>
          </div>
        </div>
      </div>  
    );
  }

  // Auto-refresh events when recording
  useEffect(() => {
    if (!isRecording || !tabId) return;
    
    const interval = setInterval(() => {
      loadEvents(tabId);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isRecording, tabId]);

  // Load events from storage
  async function loadEvents(currentTabId) {
    const result = await chromeAdapter.getEvents(currentTabId || tabId);
    setEvents(result.events || []);
    
    // Build automation model
    if (result.events && result.events.length > 0) {
      const model = window.buildAutomationModel(result.events);
      setAutomationModel(model);
    }
  }

  // Toggle recording
  async function handleToggleRecording() {
    const result = await chromeAdapter.toggleRecording(tabId);
    setIsRecording(result.isRecording);
    
    if (result.isRecording) {
      // Clear old events when starting new recording
      setTimeout(() => loadEvents(tabId), 500);
    }
  }

  // Clear events
  async function handleClearEvents() {
    if (!confirm('Clear all recorded events?')) return;
    
    await chromeAdapter.clearEvents(tabId);
    setEvents([]);
    setAutomationModel(null);
  }

  // Export handlers
  async function handleExportRawJson() {
    if (events.length === 0) {
      alert('No events to export');
      return;
    }
    
    const json = JSON.stringify(events, null, 2);
    downloadJson(json, `raw-events-${Date.now()}.json`);
  }

  async function handleExportTaskJson() {
    if (!automationModel || events.length === 0) {
      alert('No events to export');
      return;
    }
    
    const taskExport = {
      version: '1.0',
      type: 'automation-task',
      pageUrl: automationModel.pageUrl,
      forms: automationModel.forms,
      steps: automationModel.steps,
      elements: automationModel.elements.map(el => ({
        selector: el.selector,
        kind: el.kind,
        label: el.label,
        tag: el.tag,
        sensitive: el.sensitive
      })),
      metadata: {
        exportedAt: Date.now()
      }
    };
    
    const json = JSON.stringify(taskExport, null, 2);
    downloadJson(json, `automation-task-${Date.now()}.json`);
  }

  function downloadJson(json, filename) {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app">
      <div className="header">
        <h1>NodeFlow</h1>
        <p>Track interactions and build automation tasks</p>
      </div>

      <RecordingToggle 
        isRecording={isRecording}
        onToggle={handleToggleRecording}
      />

      <div className="actions">
        <button 
          className="btn btn-primary" 
          onClick={handleExportTaskJson}
          title="Export automation task JSON"
        >
          <span>🤖</span>
          <span>Task</span>
        </button>
        <button 
          className="btn btn-secondary" 
          onClick={handleExportRawJson}
          title="Export raw events as JSON"
        >
          <span>📥</span>
          <span>Raw</span>
        </button>
        <button 
          className="btn btn-danger" 
          onClick={handleClearEvents}
          title="Clear all events"
        >
          <span>🗑️</span>
          <span>Clear</span>
        </button>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${currentTab === 'events' ? 'active' : ''}`}
          onClick={() => setCurrentTab('events')}
        >
          Events
          <span className="badge">{events.length}</span>
        </button>
        <button 
          className={`tab ${currentTab === 'automation' ? 'active' : ''}`}
          onClick={() => setCurrentTab('automation')}
        >
          Automation
          {automationModel && (
            <span className="badge">{automationModel.steps.length}</span>
          )}
        </button>
      </div>

      <div className="tab-content">
        {currentTab === 'events' ? (
          <EventList 
            events={events}
            tabId={tabId}
          />
        ) : (
          <AutomationViewEditable 
            automationModel={automationModel}
            events={events}
          />
        )}
      </div>
    </div>
  );
}

export default App;

