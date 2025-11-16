import React from 'react';

function RecordingToggle({ isRecording, onToggle }) {
  return (
    <div className="controls">
      <div className="toggle-container">
        <span className="toggle-label">Recording</span>
        <label className="toggle-switch">
          <input 
            type="checkbox" 
            checked={isRecording}
            onChange={onToggle}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>
      <div className={`status ${isRecording ? 'recording' : 'stopped'}`}>
        <span className="status-dot"></span>
        <span>{isRecording ? 'Recording Active' : 'Not Recording'}</span>
      </div>
    </div>
  );
}

export default RecordingToggle;

