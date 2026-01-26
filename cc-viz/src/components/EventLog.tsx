import React from 'react';
import { SimulationEvent } from '../simulation/events';
import { CPUOperation, StateChange, Message } from '../protocols/types';

interface EventLogProps {
  events: SimulationEvent[];
  maxEvents?: number;
}

export const EventLog: React.FC<EventLogProps> = ({ events, maxEvents = 20 }) => {
  const recentEvents = events.slice(-maxEvents).reverse();

  const formatEvent = (event: SimulationEvent): string => {
    switch (event.type) {
      case 'cpu_request': {
        const op = event.data as CPUOperation;
        return `P${op.nodeId} ${op.type} @${op.address}${op.data !== undefined ? ` = ${op.data}` : ''}`;
      }
      case 'state_change': {
        const change = event.data as StateChange;
        return `P${change.nodeId} @${change.address}: ${change.oldState} → ${change.newState}`;
      }
      case 'message_send':
      case 'message_arrive': {
        const msg = event.data as Message;
        const from = typeof msg.from === 'number' ? `P${msg.from}` : msg.from;
        const to = typeof msg.to === 'number' ? `P${msg.to}` : msg.to;
        return `${msg.type}: ${from} → ${to}`;
      }
      case 'operation_complete':
        return 'Operation complete';
      default:
        return event.type;
    }
  };

  const getEventIcon = (type: string): string => {
    switch (type) {
      case 'cpu_request': return '🔵';
      case 'state_change': return '🔄';
      case 'message_send': return '📤';
      case 'message_arrive': return '📥';
      case 'operation_complete': return '✅';
      default: return '•';
    }
  };

  return (
    <div className="event-log">
      <h3>Event Log</h3>
      <div className="event-list">
        {recentEvents.length === 0 ? (
          <div className="event-empty">No events yet</div>
        ) : (
          recentEvents.map((event) => (
            <div key={event.id} className="event-item">
              <span className="event-icon">{getEventIcon(event.type)}</span>
              <span className="event-time">t={event.timestamp}</span>
              <span className="event-text">{formatEvent(event)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
