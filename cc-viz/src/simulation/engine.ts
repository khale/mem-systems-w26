import {
  CacheNode,
  Message,
  CPUOperation,
  ProtocolType,
  DirectoryEntry,
  StateChange,
  MemoryUpdate,
  DirectoryUpdate,
  PiranhaChip,
  PiranhaCore,
  PiranhaL2Entry,
  PiranhaDirectorySlice,
} from '../protocols/types';
import { MSIProtocol } from '../protocols/msi';
import { MESIProtocol } from '../protocols/mesi';
import { PiranhaProtocol } from '../protocols/piranha';
import { EventQueue, SimulationEvent, generateMessageId, resetMessageIdCounter } from './events';

export interface SimulationState {
  nodes: CacheNode[];
  memory: Map<number, number>;
  directory: Map<number, DirectoryEntry>;
  messages: Message[];
  eventLog: SimulationEvent[];
  currentTime: number;
  operationQueue: CPUOperation[];
  currentOperationIndex: number;
  pendingMessages: Message[];
  isComplete: boolean;
  // Piranha-specific state
  chips?: PiranhaChip[];
}

export interface SimulationConfig {
  nodeCount: number;
  protocol: ProtocolType;
  memorySize: number;
  // Piranha-specific config
  chipCount?: number;
  coresPerChip?: number;
}

const protocols = {
  MSI: MSIProtocol,
  MESI: MESIProtocol,
  Piranha: PiranhaProtocol,
};

export function createInitialState(config: SimulationConfig): SimulationState {
  resetMessageIdCounter();

  const memory = new Map<number, number>();
  for (let i = 0; i < config.memorySize; i++) {
    memory.set(i, 0);
  }

  const directory = new Map<number, DirectoryEntry>();

  // For Piranha, create chip-based architecture
  if (config.protocol === 'Piranha') {
    const chipCount = config.chipCount || 2;
    const coresPerChip = config.coresPerChip || 2;
    const chips: PiranhaChip[] = [];

    let globalCoreId = 0;
    for (let chipId = 0; chipId < chipCount; chipId++) {
      const cores: PiranhaCore[] = [];
      for (let localId = 0; localId < coresPerChip; localId++) {
        cores.push({
          id: globalCoreId,
          chipId,
          localId,
          l1Cache: new Map(),
        });
        globalCoreId++;
      }

      // Initialize L2 directory slices - each chip owns a portion of address space
      const l2Directory = new Map<number, PiranhaDirectorySlice>();
      for (let addr = 0; addr < config.memorySize; addr++) {
        // Home chip is determined by address (simple modulo)
        if (addr % chipCount === chipId) {
          l2Directory.set(addr, {
            state: 'Uncached',
            sharers: new Set(),
            data: 0,
          });
        }
      }

      chips.push({
        id: chipId,
        cores,
        l2Cache: new Map(),
        l2Directory,
      });
    }

    // Create CacheNode wrappers for compatibility (one per core)
    const nodes: CacheNode[] = [];
    for (const chip of chips) {
      for (const core of chip.cores) {
        nodes.push({
          id: core.id,
          cache: core.l1Cache,
        });
      }
    }

    return {
      nodes,
      memory,
      directory,
      messages: [],
      eventLog: [],
      currentTime: 0,
      operationQueue: [],
      currentOperationIndex: 0,
      pendingMessages: [],
      isComplete: true,
      chips,
    };
  }

  // For MSI/MESI, create simple flat node structure
  const nodes: CacheNode[] = [];
  for (let i = 0; i < config.nodeCount; i++) {
    nodes.push({
      id: i,
      cache: new Map(),
    });
  }

  return {
    nodes,
    memory,
    directory,
    messages: [],
    eventLog: [],
    currentTime: 0,
    operationQueue: [],
    currentOperationIndex: 0,
    pendingMessages: [],
    isComplete: true,
  };
}

export function loadWorkload(state: SimulationState, operations: CPUOperation[]): SimulationState {
  return {
    ...state,
    operationQueue: [...operations],
    currentOperationIndex: 0,
    isComplete: operations.length === 0,
  };
}

export function stepSimulation(
  state: SimulationState,
  protocol: ProtocolType
): SimulationState {
  const protocolImpl = protocols[protocol];
  let newState = { ...state };

  // If we have pending messages, process them
  if (newState.pendingMessages.length > 0) {
    const message = newState.pendingMessages[0];
    const remainingMessages = newState.pendingMessages.slice(1);

    // Process the message
    const result = protocolImpl.handleMessage(
      message,
      newState.nodes,
      newState.memory,
      newState.directory
    );

    // Apply state changes
    for (const change of result.stateChanges) {
      const node = newState.nodes[change.nodeId];
      if (node) {
        const existing = node.cache.get(change.address);
        const newData = existing?.data ?? newState.memory.get(change.address) ?? 0;
        node.cache.set(change.address, {
          address: change.address,
          state: change.newState,
          data: newData,
        });

        // Sync to Piranha chip's L2 cache if present
        if (newState.chips) {
          const coresPerChip = newState.nodes.length / newState.chips.length;
          const chipId = Math.floor(change.nodeId / coresPerChip);
          const chip = newState.chips[chipId];
          if (chip && change.newState !== 'Invalid' && change.newState !== 'I') {
            // Update L2 cache entry
            chip.l2Cache.set(change.address, {
              state: change.newState === 'Valid-Dirty' || change.newState === 'M' ? 'Modified' :
                     change.newState === 'Valid-Clean' || change.newState === 'S' ? 'Shared' : 'Invalid',
              data: newData,
              localSharers: new Set([change.nodeId % coresPerChip]),
              localOwner: (change.newState === 'Valid-Dirty' || change.newState === 'M') ?
                         change.nodeId % coresPerChip : undefined,
              globalState: 'Local',
              homeChip: change.address % newState.chips.length,
            });
          } else if (chip && (change.newState === 'Invalid' || change.newState === 'I')) {
            // Remove from L2 if invalidated
            chip.l2Cache.delete(change.address);
          }
        }
      }
      newState.eventLog.push({
        id: `log-${newState.eventLog.length}`,
        type: 'state_change',
        timestamp: newState.currentTime,
        data: change,
      });
    }

    // Apply memory updates
    for (const update of result.memoryUpdates) {
      newState.memory.set(update.address, update.data);
      newState.eventLog.push({
        id: `log-${newState.eventLog.length}`,
        type: 'memory_update',
        timestamp: newState.currentTime,
        data: update,
      });
    }

    // Apply directory updates
    if (result.directoryUpdates) {
      for (const update of result.directoryUpdates) {
        const entry = newState.directory.get(update.address);
        if (entry) {
          entry.state = update.state;
          entry.owner = update.owner;
          entry.sharers = new Set(update.sharers);
        }

        // Sync to Piranha chip's l2Directory if present
        if (newState.chips) {
          const numChips = newState.chips.length;
          const homeChip = update.address % numChips;
          const chip = newState.chips[homeChip];
          if (chip) {
            const dirEntry = chip.l2Directory.get(update.address);
            if (dirEntry) {
              // Map directory state to l2Directory state
              dirEntry.state = update.state === 'M' ? 'Exclusive' :
                              update.state === 'S' ? 'Shared' : 'Uncached';
              dirEntry.owner = update.owner !== undefined ?
                              Math.floor(update.owner / (newState.nodes.length / numChips)) : undefined;
              dirEntry.sharers = new Set(
                update.sharers.map(s => Math.floor(s / (newState.nodes.length / numChips)))
              );
            }
          }
        }

        newState.eventLog.push({
          id: `log-${newState.eventLog.length}`,
          type: 'directory_update',
          timestamp: newState.currentTime,
          data: update,
        });
      }
    }

    // Add new messages
    const newMessages = result.messages.map(m => ({
      ...m,
      id: generateMessageId(),
      timestamp: newState.currentTime,
      progress: 0,
    }));

    newState = {
      ...newState,
      pendingMessages: [...remainingMessages, ...newMessages],
      messages: [...newState.messages.filter(m => m.id !== message.id), ...newMessages],
      currentTime: newState.currentTime + 1,
    };

    // Check if operation is complete
    if (remainingMessages.length === 0 && newMessages.length === 0) {
      // Move to next operation
      if (newState.currentOperationIndex < newState.operationQueue.length - 1) {
        newState.currentOperationIndex++;
      } else {
        newState.isComplete = true;
      }
    }

    return newState;
  }

  // No pending messages - start next operation
  if (newState.currentOperationIndex < newState.operationQueue.length) {
    const operation = newState.operationQueue[newState.currentOperationIndex];

    newState.eventLog.push({
      id: `log-${newState.eventLog.length}`,
      type: 'cpu_request',
      timestamp: newState.currentTime,
      data: operation,
    });

    const result = protocolImpl.handleCPURequest(
      operation,
      newState.nodes,
      newState.memory,
      newState.directory
    );

    // If operation completes immediately (cache hit)
    if (result.complete) {
      newState.eventLog.push({
        id: `log-${newState.eventLog.length}`,
        type: 'operation_complete',
        timestamp: newState.currentTime,
        data: { operationId: `op-${newState.currentOperationIndex}` },
      });

      if (newState.currentOperationIndex < newState.operationQueue.length - 1) {
        newState.currentOperationIndex++;
      } else {
        newState.isComplete = true;
      }
      newState.currentTime++;
      return newState;
    }

    // Apply immediate state changes
    for (const change of result.stateChanges) {
      const node = newState.nodes[change.nodeId];
      if (node) {
        const existing = node.cache.get(change.address);
        node.cache.set(change.address, {
          address: change.address,
          state: change.newState,
          data: existing?.data ?? newState.memory.get(change.address) ?? 0,
        });
      }
    }

    // Queue messages
    const newMessages = result.messages.map(m => ({
      ...m,
      id: generateMessageId(),
      timestamp: newState.currentTime,
      progress: 0,
    }));

    newState = {
      ...newState,
      pendingMessages: newMessages,
      messages: newMessages,
      currentTime: newState.currentTime + 1,
    };
  }

  return newState;
}

export function resetSimulation(config: SimulationConfig): SimulationState {
  return createInitialState(config);
}

// Deep clone state for immutability
export function cloneState(state: SimulationState): SimulationState {
  const cloned: SimulationState = {
    nodes: state.nodes.map(n => ({
      id: n.id,
      cache: new Map(Array.from(n.cache.entries()).map(([k, v]) => [k, { ...v }])),
    })),
    memory: new Map(state.memory),
    directory: new Map(
      Array.from(state.directory.entries()).map(([k, v]) => [
        k,
        { ...v, sharers: new Set(v.sharers) },
      ])
    ),
    messages: state.messages.map(m => ({ ...m })),
    eventLog: [...state.eventLog],
    currentTime: state.currentTime,
    operationQueue: [...state.operationQueue],
    currentOperationIndex: state.currentOperationIndex,
    pendingMessages: state.pendingMessages.map(m => ({ ...m })),
    isComplete: state.isComplete,
  };

  // Clone Piranha chips if present
  if (state.chips) {
    cloned.chips = state.chips.map(chip => ({
      id: chip.id,
      cores: chip.cores.map(core => ({
        id: core.id,
        chipId: core.chipId,
        localId: core.localId,
        l1Cache: new Map(Array.from(core.l1Cache.entries()).map(([k, v]) => [k, { ...v }])),
      })),
      l2Cache: new Map(
        Array.from(chip.l2Cache.entries()).map(([k, v]) => [
          k,
          { ...v, localSharers: new Set(v.localSharers) },
        ])
      ),
      l2Directory: new Map(
        Array.from(chip.l2Directory.entries()).map(([k, v]) => [
          k,
          { ...v, sharers: new Set(v.sharers) },
        ])
      ),
    }));
  }

  return cloned;
}
