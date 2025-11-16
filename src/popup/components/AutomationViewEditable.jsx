import React, { useState, useEffect } from 'react';
import { storageAdapter } from '../adapters/storageAdapter';

function AutomationViewEditable({ automationModel, events }) {
  const [expandedForms, setExpandedForms] = useState(new Set());
  const [selectedView, setSelectedView] = useState('forms');
  const [editedModel, setEditedModel] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize edited model from automation model
  useEffect(() => {
    if (automationModel) {
      // Try to load saved config and merge with detected model
      loadAndMergeConfig();
    }
  }, [automationModel]);

  async function loadAndMergeConfig() {
    const savedConfig = await storageAdapter.loadConfig(automationModel.pageUrl);
    
    if (savedConfig) {
      // Merge saved edits with current model
      const merged = mergeConfigs(automationModel, savedConfig);
      setEditedModel(merged);
    } else {
      setEditedModel(JSON.parse(JSON.stringify(automationModel)));
    }
  }

  function mergeConfigs(detected, saved) {
    const merged = JSON.parse(JSON.stringify(detected));
    
    // Merge form field edits
    if (saved.forms) {
      merged.forms.forEach(form => {
        const savedForm = saved.forms.find(f => f.id === form.id || f.selector === form.selector);
        if (savedForm) {
          form.name = savedForm.name || form.name;
          form.fields.forEach(field => {
            const savedField = savedForm.fields?.find(f => f.selector === field.selector);
            if (savedField) {
              field.fieldKey = savedField.fieldKey || field.fieldKey;
              field.label = savedField.label || field.label;
              field.required = savedField.required !== undefined ? savedField.required : field.required;
            }
          });
        }
      });
    }
    
    // Merge step edits
    if (saved.steps) {
      merged.steps.forEach(step => {
        const savedStep = saved.steps.find(s => s.id === step.id);
        if (savedStep) {
          step.enabled = savedStep.enabled !== undefined ? savedStep.enabled : true;
          step.description = savedStep.description || step.description;
        } else {
          step.enabled = true;
        }
      });
    } else {
      merged.steps.forEach(step => {
        step.enabled = true;
      });
    }
    
    return merged;
  }

  async function handleSaveConfig() {
    if (!editedModel) return;
    
    await storageAdapter.saveConfig(editedModel.pageUrl, editedModel);
    setHasChanges(false);
    
    // Show feedback
    alert('Configuration saved!');
  }

  function updateFieldKey(formId, fieldSelector, newKey) {
    const updated = JSON.parse(JSON.stringify(editedModel));
    const form = updated.forms.find(f => f.id === formId);
    if (form) {
      const field = form.fields.find(f => f.selector === fieldSelector);
      if (field) {
        field.fieldKey = newKey;
        setEditedModel(updated);
        setHasChanges(true);
      }
    }
  }

  function updateFieldLabel(formId, fieldSelector, newLabel) {
    const updated = JSON.parse(JSON.stringify(editedModel));
    const form = updated.forms.find(f => f.id === formId);
    if (form) {
      const field = form.fields.find(f => f.selector === fieldSelector);
      if (field) {
        field.label = newLabel;
        setEditedModel(updated);
        setHasChanges(true);
      }
    }
  }

  function toggleFieldRequired(formId, fieldSelector) {
    const updated = JSON.parse(JSON.stringify(editedModel));
    const form = updated.forms.find(f => f.id === formId);
    if (form) {
      const field = form.fields.find(f => f.selector === fieldSelector);
      if (field) {
        field.required = !field.required;
        setEditedModel(updated);
        setHasChanges(true);
      }
    }
  }

  function toggleStepEnabled(stepId) {
    const updated = JSON.parse(JSON.stringify(editedModel));
    const step = updated.steps.find(s => s.id === stepId);
    if (step) {
      step.enabled = !step.enabled;
      setEditedModel(updated);
      setHasChanges(true);
    }
  }

  function updateFormName(formId, newName) {
    const updated = JSON.parse(JSON.stringify(editedModel));
    const form = updated.forms.find(f => f.id === formId);
    if (form) {
      form.name = newName;
      setEditedModel(updated);
      setHasChanges(true);
    }
  }

  if (!automationModel || !editedModel || events.length === 0) {
    return (
      <div className="automation-section">
        <div className="empty-state">
          <div className="empty-icon">🤖</div>
          <div className="empty-text">
            No automation data yet.
            <br />
            Start recording to detect forms and steps.
          </div>
        </div>
      </div>
    );
  }

  function toggleForm(formId) {
    const newExpanded = new Set(expandedForms);
    if (newExpanded.has(formId)) {
      newExpanded.delete(formId);
    } else {
      newExpanded.add(formId);
    }
    setExpandedForms(newExpanded);
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard');
    });
  }

  return (
    <div className="automation-section">
      <div className="automation-header">
        <div className="view-toggle">
          <button 
            className={`view-btn ${selectedView === 'forms' ? 'active' : ''}`}
            onClick={() => setSelectedView('forms')}
          >
            Forms ({editedModel.forms.length})
          </button>
          <button 
            className={`view-btn ${selectedView === 'steps' ? 'active' : ''}`}
            onClick={() => setSelectedView('steps')}
          >
            Steps ({editedModel.steps.length})
          </button>
        </div>

        <button 
          className="btn btn-primary save-config-btn"
          onClick={handleSaveConfig}
          disabled={!hasChanges}
          title={hasChanges ? 'Save your changes' : 'No changes to save'}
        >
          💾 Save Configuration
        </button>
      </div>

      {selectedView === 'forms' ? (
        <div className="forms-list">
          {editedModel.forms.length === 0 ? (
            <div className="info-message">
              No forms detected. Forms are automatically identified from input fields and submit buttons.
            </div>
          ) : (
            editedModel.forms.map(form => (
              <div key={form.id} className="form-card">
                <div 
                  className="form-header"
                  onClick={() => toggleForm(form.id)}
                >
                  <div className="form-title">
                    <span className="form-icon">📋</span>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateFormName(form.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-edit"
                    />
                  </div>
                  <div className="form-meta">
                    <span className="badge">{form.fields.length} fields</span>
                    <span className="expand-icon">
                      {expandedForms.has(form.id) ? '▼' : '▶'}
                    </span>
                  </div>
                </div>

                {expandedForms.has(form.id) && (
                  <div className="form-body">
                    {form.selector && (
                      <div className="form-selector">
                        <span className="label">Selector:</span>
                        <code className="code-inline">{form.selector}</code>
                        <button 
                          className="copy-btn"
                          onClick={() => copyToClipboard(form.selector)}
                          title="Copy selector"
                        >
                          📋
                        </button>
                      </div>
                    )}

                    <div className="fields-section">
                      <h4 className="subsection-title">Fields</h4>
                      {form.fields.map((field, idx) => (
                        <div key={idx} className="field-item editable">
                          <div className="field-header">
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => updateFieldLabel(form.id, field.selector, e.target.value)}
                              className="inline-edit field-label-edit"
                            />
                            <div className="field-badges">
                              <span className={`field-kind ${field.sensitive ? 'sensitive' : ''}`}>
                                {field.kind}
                              </span>
                              <label className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={field.required}
                                  onChange={() => toggleFieldRequired(form.id, field.selector)}
                                />
                                <span>Required</span>
                              </label>
                            </div>
                          </div>
                          <div className="field-meta">
                            <div className="field-key">
                              <span className="label">Key:</span>
                              <input
                                type="text"
                                value={field.fieldKey}
                                onChange={(e) => updateFieldKey(form.id, field.selector, e.target.value)}
                                className="inline-edit code-edit"
                              />
                            </div>
                            <div className="field-selector">
                              <span className="label">Selector:</span>
                              <code className="code-inline">{field.selector}</code>
                              <button 
                                className="copy-btn"
                                onClick={() => copyToClipboard(field.selector)}
                                title="Copy selector"
                              >
                                📋
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {form.actions.length > 0 && (
                      <div className="actions-section">
                        <h4 className="subsection-title">Actions</h4>
                        {form.actions.map((action, idx) => (
                          <div key={idx} className="action-item">
                            <span className="action-label">{action.label}</span>
                            <span className="action-type">{action.actionType}</span>
                            <code className="code-inline">{action.selector}</code>
                            <button 
                              className="copy-btn"
                              onClick={() => copyToClipboard(action.selector)}
                              title="Copy selector"
                            >
                              📋
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="steps-list">
          {editedModel.steps.length === 0 ? (
            <div className="info-message">
              No steps detected. Steps are automatically generated from your interactions.
            </div>
          ) : (
            editedModel.steps.map((step, idx) => (
              <div 
                key={step.id} 
                className={`step-item ${step.enabled === false ? 'disabled' : ''}`}
              >
                <label className="step-checkbox">
                  <input
                    type="checkbox"
                    checked={step.enabled !== false}
                    onChange={() => toggleStepEnabled(step.id)}
                  />
                </label>
                <div className="step-number">{idx + 1}</div>
                <div className="step-content">
                  <div className="step-header">
                    <span className={`step-type ${step.type}`}>{step.type}</span>
                    <span className="step-time">
                      {new Date(step.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="step-details">
                    {step.type === 'fillField' && (
                      <>
                        <div className="step-label">{step.label}</div>
                        <div className="step-meta">
                          <span className="label">Field Key:</span>
                          <code className="code-inline">{step.fieldKey}</code>
                        </div>
                        <div className="step-meta">
                          <span className="label">Selector:</span>
                          <code className="code-inline">{step.selector}</code>
                          <button 
                            className="copy-btn"
                            onClick={() => copyToClipboard(step.selector)}
                            title="Copy selector"
                          >
                            📋
                          </button>
                        </div>
                      </>
                    )}
                    {step.type === 'click' && (
                      <>
                        <div className="step-label">{step.description || step.label}</div>
                        <div className="step-meta">
                          <span className="label">Selector:</span>
                          <code className="code-inline">{step.selector}</code>
                          <button 
                            className="copy-btn"
                            onClick={() => copyToClipboard(step.selector)}
                            title="Copy selector"
                          >
                            📋
                          </button>
                        </div>
                      </>
                    )}
                    {step.type === 'navigation' && (
                      <>
                        <div className="step-label">{step.description}</div>
                        <div className="step-meta">
                          <span className="label">URL:</span>
                          <code className="code-inline">{step.url}</code>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default AutomationViewEditable;

