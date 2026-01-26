import { Message, CPUOperation, StateChange, MemoryUpdate, DirectoryUpdate } from '../protocols/types';

export type EventType =
  | 'cpu_request'
  | 'message_send'
  | 'message_arrive'
  | 'state_change'
  | 'memory_update'
  | 'directory_update'
  | 'operation_complete';

export interface SimulationEvent {
  id: string;
  type: EventType;
  timestamp: number;
  data:
    | CPUOperation
    | Message
    | StateChange
    | MemoryUpdate
    | DirectoryUpdate
    | { operationId: string };
}

export class EventQueue {
  private events: SimulationEvent[] = [];
  private eventIdCounter = 0;

  enqueue(event: Omit<SimulationEvent, 'id'>): string {
    const id = `evt-${this.eventIdCounter++}`;
    const fullEvent = { ...event, id };

    // Insert in sorted order by timestamp
    const insertIdx = this.events.findIndex(e => e.timestamp > event.timestamp);
    if (insertIdx === -1) {
      this.events.push(fullEvent);
    } else {
      this.events.splice(insertIdx, 0, fullEvent);
    }

    return id;
  }

  dequeue(): SimulationEvent | undefined {
    return this.events.shift();
  }

  peek(): SimulationEvent | undefined {
    return this.events[0];
  }

  isEmpty(): boolean {
    return this.events.length === 0;
  }

  clear(): void {
    this.events = [];
    this.eventIdCounter = 0;
  }

  getAll(): SimulationEvent[] {
    return [...this.events];
  }

  size(): number {
    return this.events.length;
  }
}

// Generate unique IDs for messages
let messageIdCounter = 0;
export function generateMessageId(): string {
  return `msg-${messageIdCounter++}`;
}

export function resetMessageIdCounter(): void {
  messageIdCounter = 0;
}
