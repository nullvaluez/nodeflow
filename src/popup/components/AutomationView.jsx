import React, { useState } from 'react';

function AutomationView({ automationModel, events }) {
  const [expandedForms, setExpandedForms] = useState(new Set());
  const [selectedView, setSelectedView] = useState('forms'); // 'forms' or 'steps'

  if (!automationModel || events.length === 0) {
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
      // Could show a toast notification here
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
            Forms ({automationModel.forms.length})
          </button>
          <button 
            className={`view-btn ${selectedView === 'steps' ? 'active' : ''}`}
            onClick={() => setSelectedView('steps')}
          >
            Steps ({automationModel.steps.length})
          </button>
        </div>
      </div>

      {selectedView === 'forms' ? (
        <div className="forms-list">
          {automationModel.forms.length === 0 ? (
            <div className="info-message">
              No forms detected. Forms are automatically identified from input fields and submit buttons.
            </div>
          ) : (
            automationModel.forms.map(form => (
              <div key={form.id} className="form-card">
                <div 
                  className="form-header"
                  onClick={() => toggleForm(form.id)}
                >
                  <div className="form-title">
                    <span className="form-icon">📋</span>
                    <span>{form.name}</span>
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
                        <div key={idx} className="field-item">
                          <div className="field-header">
                            <span className="field-label">{field.label}</span>
                            <span className={`field-kind ${field.sensitive ? 'sensitive' : ''}`}>
                              {field.kind}
                            </span>
                          </div>
                          <div className="field-meta">
                            <div className="field-key">
                              <span className="label">Key:</span>
                              <code className="code-inline">{field.fieldKey}</code>
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
          {automationModel.steps.length === 0 ? (
            <div className="info-message">
              No steps detected. Steps are automatically generated from your interactions.
            </div>
          ) : (
            automationModel.steps.map((step, idx) => (
              <div key={step.id} className="step-item">
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

export default AutomationView;

