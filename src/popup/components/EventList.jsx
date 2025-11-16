import React, { useState } from 'react';
import { chromeAdapter } from '../adapters/chromeAdapter';

function EventList({ events, tabId }) {
  const [filter, setFilter] = useState('');

  // Filter events
  const filteredEvents = filter
    ? events.filter(event => {
        const query = filter.toLowerCase();
        return (
          event.type?.toLowerCase().includes(query) ||
          event.tag?.toLowerCase().includes(query) ||
          event.idAttr?.toLowerCase().includes(query) ||
          event.selector?.toLowerCase().includes(query)
        );
      })
    : events;

  // Format element label
  function formatElementLabel(event) {
    if (!event.tag) return '';
    
    let label = event.tag;
    
    if (event.idAttr) {
      label += `#${event.idAttr}`;
    } else if (event.classes && event.classes.length > 0) {
      label += `.${event.classes[0]}`;
    }
    
    if (event.attrs && event.attrs.name) {
      label += `[name="${event.attrs.name}"]`;
    }
    
    return label;
  }

  // Format additional event details
  function formatEventDetails(event) {
    const details = [];
    
    if (event.attrs) {
      if (event.attrs.href) {
        details.push(`href: ${event.attrs.href}`);
      }
      if (event.attrs.placeholder) {
        details.push(`placeholder: ${event.attrs.placeholder}`);
      }
    }
    
    if (event.key) {
      details.push(`key: ${event.key.category}`);
    }
    
    if (event.input && event.input.lengthDelta !== undefined) {
      details.push(`input delta: ${event.input.lengthDelta > 0 ? '+' : ''}${event.input.lengthDelta}`);
    }
    
    return details.join(' • ');
  }

  // Handle mouse enter for highlighting
  function handleMouseEnter(selector) {
    if (selector && tabId) {
      chromeAdapter.highlightElement(tabId, selector);
    }
  }

  // Handle mouse leave
  function handleMouseLeave() {
    if (tabId) {
      chromeAdapter.hideHighlight(tabId);
    }
  }

  // Show most recent events first
  const recentEvents = filteredEvents.slice(-50).reverse();

  return (
    <div className="events-section">
      <div className="section-header">
        <h2 className="section-title">Recent Events</h2>
        <span className="event-count">{events.length} event{events.length !== 1 ? 's' : ''}</span>
      </div>
      
      <input 
        type="text" 
        className="filter-input" 
        placeholder="Filter events by type or element..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      
      <div className="events-list">
        {recentEvents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <div className="empty-text">
              {events.length === 0 
                ? 'No events recorded yet.\nToggle recording to start.' 
                : 'No matching events found.'}
            </div>
          </div>
        ) : (
          recentEvents.map((event, index) => {
            const time = new Date(event.ts).toLocaleTimeString();
            const elementLabel = formatElementLabel(event);
            const details = formatEventDetails(event);
            
            return (
              <div 
                key={event.id || index}
                className="event-item"
                onMouseEnter={() => handleMouseEnter(event.selector)}
                onMouseLeave={handleMouseLeave}
              >
                <div className="event-header">
                  <span className="event-type">{event.type}</span>
                  <span className="event-time">{time}</span>
                </div>
                <div className="event-details">
                  {elementLabel && (
                    <div className="event-element">{elementLabel}</div>
                  )}
                  {details && (
                    <div style={{ marginTop: '4px', fontSize: '11px' }}>{details}</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default EventList;

