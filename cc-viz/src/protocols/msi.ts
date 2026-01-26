import {
  Protocol,
  MSIState,
  CacheNode,
  CPUOperation,
  Message,
  ProtocolResult,
  DirectoryEntry,
  CacheLine,
} from './types';

export const MSIProtocol: Protocol = {
  name: 'MSI',

  getInitialState(): MSIState {
    return 'I';
  },

  handleCPURequest(
    operation: CPUOperation,
    nodes: CacheNode[],
    memory: Map<number, number>,
    _directory?: Map<number, DirectoryEntry>
  ): ProtocolResult {
    const { nodeId, type, address, data } = operation;
    const node = nodes[nodeId];
    const cacheLine = node.cache.get(address);
    const currentState = (cacheLine?.state as MSIState) || 'I';

    const messages: ProtocolResult['messages'] = [];
    const stateChanges: ProtocolResult['stateChanges'] = [];
    const memoryUpdates: ProtocolResult['memoryUpdates'] = [];

    if (type === 'Read') {
      switch (currentState) {
        case 'M':
        case 'S':
          // Cache hit, no action needed
          return { messages: [], stateChanges: [], memoryUpdates: [], complete: true };

        case 'I':
          // Cache miss, issue BusRd
          messages.push({
            type: 'BusRd',
            from: nodeId,
            to: 'bus',
            address,
          });
          break;
      }
    } else {
      // Write
      switch (currentState) {
        case 'M':
          // Already have exclusive access, just update
          if (data !== undefined) {
            node.cache.set(address, { address, state: 'M', data });
          }
          return { messages: [], stateChanges: [], memoryUpdates: [], complete: true };

        case 'S':
          // Need to upgrade to Modified
          messages.push({
            type: 'BusRdX',
            from: nodeId,
            to: 'bus',
            address,
            data,
          });
          break;

        case 'I':
          // Cache miss, need exclusive access
          messages.push({
            type: 'BusRdX',
            from: nodeId,
            to: 'bus',
            address,
            data,
          });
          break;
      }
    }

    return { messages, stateChanges, memoryUpdates, complete: false };
  },

  handleMessage(
    message: Message,
    nodes: CacheNode[],
    memory: Map<number, number>,
    _directory?: Map<number, DirectoryEntry>
  ): ProtocolResult {
    const messages: ProtocolResult['messages'] = [];
    const stateChanges: ProtocolResult['stateChanges'] = [];
    const memoryUpdates: ProtocolResult['memoryUpdates'] = [];

    const { type, from, address, data } = message;
    const requesterId = typeof from === 'number' ? from : -1;

    if (message.to === 'bus') {
      // Snooping: all other nodes observe the bus transaction
      // Track data from a node that has it in Modified state
      let flushedData: number | undefined = undefined;

      for (const node of nodes) {
        if (node.id === requesterId) continue;

        const cacheLine = node.cache.get(address);
        const currentState = (cacheLine?.state as MSIState) || 'I';

        switch (type) {
          case 'BusRd':
            // Another processor wants to read
            if (currentState === 'M') {
              // Must flush data to bus and transition to Shared
              const dataToFlush = cacheLine?.data ?? memory.get(address) ?? 0;
              flushedData = dataToFlush;
              messages.push({
                type: 'Flush',
                from: node.id,
                to: 'bus',
                address,
                data: dataToFlush,
              });
              stateChanges.push({
                nodeId: node.id,
                address,
                oldState: 'M',
                newState: 'S',
              });
            } else if (currentState === 'S' && flushedData === undefined) {
              // Get data from a shared copy if no Modified copy exists
              flushedData = cacheLine?.data;
            }
            break;

          case 'BusRdX':
            // Another processor wants exclusive access
            if (currentState === 'M') {
              // Flush data and invalidate
              const dataToFlush = cacheLine?.data ?? memory.get(address) ?? 0;
              flushedData = dataToFlush;
              messages.push({
                type: 'Flush',
                from: node.id,
                to: 'bus',
                address,
                data: dataToFlush,
              });
              stateChanges.push({
                nodeId: node.id,
                address,
                oldState: 'M',
                newState: 'I',
              });
            } else if (currentState === 'S') {
              // Get data from shared copy before invalidating
              if (flushedData === undefined) {
                flushedData = cacheLine?.data;
              }
              // Invalidate
              stateChanges.push({
                nodeId: node.id,
                address,
                oldState: 'S',
                newState: 'I',
              });
            }
            break;
        }
      }

      // Requester gets the data
      const requester = nodes[requesterId];
      if (requester) {
        const memData = memory.get(address) ?? 0;
        const newState: MSIState = type === 'BusRdX' ? 'M' : 'S';
        // Use flushed data if available, otherwise use data from message (for writes) or memory
        const newData = type === 'BusRdX' && data !== undefined
          ? data
          : (flushedData !== undefined ? flushedData : memData);

        stateChanges.push({
          nodeId: requesterId,
          address,
          oldState: (requester.cache.get(address)?.state as MSIState) || 'I',
          newState,
        });

        // Update cache
        requester.cache.set(address, {
          address,
          state: newState,
          data: newData,
        });
      }
    } else if (type === 'Flush') {
      // Data flushed to memory
      if (data !== undefined) {
        memoryUpdates.push({ address, data });
      }
    }

    return { messages, stateChanges, memoryUpdates, complete: messages.length === 0 };
  },
};

// Helper to get cache line state
export function getMSIState(node: CacheNode, address: number): MSIState {
  const line = node.cache.get(address);
  return (line?.state as MSIState) || 'I';
}
