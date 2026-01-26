import {
  Protocol,
  MESIState,
  CacheNode,
  CPUOperation,
  Message,
  ProtocolResult,
  DirectoryEntry,
} from './types';

export const MESIProtocol: Protocol = {
  name: 'MESI',

  getInitialState(): MESIState {
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
    const currentState = (cacheLine?.state as MESIState) || 'I';

    const messages: ProtocolResult['messages'] = [];
    const stateChanges: ProtocolResult['stateChanges'] = [];
    const memoryUpdates: ProtocolResult['memoryUpdates'] = [];

    if (type === 'Read') {
      switch (currentState) {
        case 'M':
        case 'E':
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
          // Already have exclusive dirty access, just update
          if (data !== undefined) {
            node.cache.set(address, { address, state: 'M', data });
          }
          return { messages: [], stateChanges: [], memoryUpdates: [], complete: true };

        case 'E':
          // Silent upgrade to Modified (no bus transaction needed!)
          stateChanges.push({
            nodeId,
            address,
            oldState: 'E',
            newState: 'M',
          });
          node.cache.set(address, { address, state: 'M', data: data ?? cacheLine?.data ?? 0 });
          return { messages: [], stateChanges, memoryUpdates: [], complete: true };

        case 'S':
          // Need to issue BusUpgr (upgrade without getting data)
          messages.push({
            type: 'BusUpgr',
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
      let sharedSignal = false;
      let flushedData: number | undefined = undefined;

      // Snooping: all other nodes observe the bus transaction
      for (const node of nodes) {
        if (node.id === requesterId) continue;

        const cacheLine = node.cache.get(address);
        const currentState = (cacheLine?.state as MESIState) || 'I';

        switch (type) {
          case 'BusRd':
            // Another processor wants to read
            if (currentState === 'M') {
              // Must flush data to bus and transition to Shared
              const dataToFlush = cacheLine?.data ?? memory.get(address) ?? 0;
              flushedData = dataToFlush;
              messages.push({
                type: 'FlushOpt',
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
              sharedSignal = true;
            } else if (currentState === 'E') {
              // Transition to Shared (no flush needed, data is clean)
              // But capture the data for the requester
              if (flushedData === undefined) {
                flushedData = cacheLine?.data;
              }
              stateChanges.push({
                nodeId: node.id,
                address,
                oldState: 'E',
                newState: 'S',
              });
              sharedSignal = true;
            } else if (currentState === 'S') {
              if (flushedData === undefined) {
                flushedData = cacheLine?.data;
              }
              sharedSignal = true;
            }
            break;

          case 'BusRdX':
            // Another processor wants exclusive access
            if (currentState === 'M') {
              // Flush data and invalidate
              const dataToFlush = cacheLine?.data ?? memory.get(address) ?? 0;
              flushedData = dataToFlush;
              messages.push({
                type: 'FlushOpt',
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
            } else if (currentState === 'E' || currentState === 'S') {
              if (flushedData === undefined) {
                flushedData = cacheLine?.data;
              }
              stateChanges.push({
                nodeId: node.id,
                address,
                oldState: currentState,
                newState: 'I',
              });
            }
            break;

          case 'BusUpgr':
            // Another processor upgrading S -> M
            if (currentState === 'S') {
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
        // Use flushed data if available, otherwise memory
        const suppliedData = flushedData !== undefined ? flushedData : memData;

        if (type === 'BusRd') {
          // If no one else has it, we get Exclusive; otherwise Shared
          const newState: MESIState = sharedSignal ? 'S' : 'E';
          stateChanges.push({
            nodeId: requesterId,
            address,
            oldState: (requester.cache.get(address)?.state as MESIState) || 'I',
            newState,
          });
          requester.cache.set(address, { address, state: newState, data: suppliedData });
        } else if (type === 'BusRdX') {
          stateChanges.push({
            nodeId: requesterId,
            address,
            oldState: (requester.cache.get(address)?.state as MESIState) || 'I',
            newState: 'M',
          });
          requester.cache.set(address, {
            address,
            state: 'M',
            data: data ?? suppliedData,
          });
        } else if (type === 'BusUpgr') {
          stateChanges.push({
            nodeId: requesterId,
            address,
            oldState: 'S',
            newState: 'M',
          });
          requester.cache.set(address, {
            address,
            state: 'M',
            data: data ?? requester.cache.get(address)?.data ?? memData,
          });
        }
      }
    } else if (type === 'FlushOpt' || type === 'Flush') {
      // Data flushed to memory
      if (data !== undefined) {
        memoryUpdates.push({ address, data });
      }
    }

    return { messages, stateChanges, memoryUpdates, complete: messages.length === 0 };
  },
};

export function getMESIState(node: CacheNode, address: number): MESIState {
  const line = node.cache.get(address);
  return (line?.state as MESIState) || 'I';
}
