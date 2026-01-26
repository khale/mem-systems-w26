import {
  Protocol,
  L1State,
  CacheNode,
  CPUOperation,
  Message,
  ProtocolResult,
  DirectoryEntry,
} from './types';

// Helper to get chip ID from core ID (assuming 2 cores per chip)
function getChipId(coreId: number, coresPerChip: number = 2): number {
  return Math.floor(coreId / coresPerChip);
}

// Helper to get home chip for an address (address % numChips)
function getHomeChip(address: number, numChips: number = 2): number {
  return address % numChips;
}

// Helper to get local core ID within chip
function getLocalCoreId(coreId: number, coresPerChip: number = 2): number {
  return coreId % coresPerChip;
}

export const PiranhaProtocol: Protocol = {
  name: 'Piranha',

  getInitialState(): L1State {
    return 'Invalid';
  },

  handleCPURequest(
    operation: CPUOperation,
    nodes: CacheNode[],
    memory: Map<number, number>,
    directory?: Map<number, DirectoryEntry>
  ): ProtocolResult {
    const { nodeId, type, address, data } = operation;
    const node = nodes[nodeId];
    const cacheLine = node.cache.get(address);
    const currentState = (cacheLine?.state as L1State) || 'Invalid';

    const messages: ProtocolResult['messages'] = [];
    const stateChanges: ProtocolResult['stateChanges'] = [];
    const memoryUpdates: ProtocolResult['memoryUpdates'] = [];

    const coresPerChip = 2;
    const numChips = Math.ceil(nodes.length / coresPerChip);
    const requestingChip = getChipId(nodeId, coresPerChip);
    const homeChip = getHomeChip(address, numChips);
    const isLocal = requestingChip === homeChip;

    if (type === 'Read') {
      switch (currentState) {
        case 'Valid-Clean':
        case 'Valid-Dirty':
          // L1 Cache hit
          return { messages: [], stateChanges: [], memoryUpdates: [], complete: true };

        case 'Invalid':
          // L1 miss - first check L2, then go to directory if needed
          // For simplicity, we go directly to the home chip's directory
          messages.push({
            type: isLocal ? 'L1_READ' : 'DIR_GETS',
            from: nodeId,
            to: 'directory',
            address,
            fromChip: requestingChip,
            toChip: homeChip,
            isInterChip: !isLocal,
          });
          break;
      }
    } else {
      // Write
      switch (currentState) {
        case 'Valid-Dirty':
          // Already have exclusive access, just update
          if (data !== undefined) {
            node.cache.set(address, { address, state: 'Valid-Dirty', data });
          }
          return { messages: [], stateChanges: [], memoryUpdates: [], complete: true };

        case 'Valid-Clean':
        case 'Invalid':
          // Need exclusive access - send upgrade/GETX to directory
          messages.push({
            type: isLocal ? 'L1_WRITE' : 'DIR_GETX',
            from: nodeId,
            to: 'directory',
            address,
            data,
            fromChip: requestingChip,
            toChip: homeChip,
            isInterChip: !isLocal,
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
    directory?: Map<number, DirectoryEntry>
  ): ProtocolResult {
    const messages: ProtocolResult['messages'] = [];
    const stateChanges: ProtocolResult['stateChanges'] = [];
    const memoryUpdates: ProtocolResult['memoryUpdates'] = [];
    const directoryUpdates: ProtocolResult['directoryUpdates'] = [];

    if (!directory) {
      return { messages, stateChanges, memoryUpdates, directoryUpdates, complete: true };
    }

    const { type, from, to, address, data } = message;
    const requesterId = typeof from === 'number' ? from : -1;
    const coresPerChip = 2;
    const numChips = Math.ceil(nodes.length / coresPerChip);

    // Get or create directory entry
    let entry = directory.get(address);
    if (!entry) {
      entry = {
        state: 'U',
        sharers: new Set(),
        data: memory.get(address) ?? 0,
      };
      directory.set(address, entry);
    }

    if (to === 'directory') {
      // Handle requests to directory (either local L2 or remote directory)
      const requesterChip = message.fromChip ?? getChipId(requesterId, coresPerChip);
      const homeChip = getHomeChip(address, numChips);
      const isLocalRequest = requesterChip === homeChip;

      switch (type) {
        case 'L1_READ':
        case 'DIR_GETS': {
          // Read request - check if another node has exclusive copy
          if (entry.state === 'M' && entry.owner !== undefined) {
            const ownerChip = getChipId(entry.owner, coresPerChip);
            const isOwnerLocal = ownerChip === homeChip;

            // Forward to owner to get data
            messages.push({
              type: isOwnerLocal ? 'L1_DOWNGRADE' : 'DIR_FWD_GETS',
              from: 'directory',
              to: entry.owner,
              address,
              data: requesterId, // Piggyback requester ID
              fromChip: homeChip,
              toChip: ownerChip,
              isInterChip: !isOwnerLocal,
            });
          } else {
            // Send data directly from L2/memory
            const isRequesterLocal = message.fromChip === homeChip;
            messages.push({
              type: isRequesterLocal ? 'L2_DATA' : 'DIR_DATA',
              from: 'directory',
              to: requesterId,
              address,
              data: entry.data,
              fromChip: homeChip,
              toChip: requesterChip,
              isInterChip: !isRequesterLocal,
            });
            // Update directory state
            entry.sharers.add(requesterId);
            if (entry.state === 'U') {
              entry.state = 'S';
            }
            directoryUpdates.push({
              address,
              state: entry.state,
              sharers: Array.from(entry.sharers),
            });
          }
          break;
        }

        case 'L1_WRITE':
        case 'DIR_GETX': {
          // Write request - need exclusive access
          if (entry.state === 'M' && entry.owner !== undefined && entry.owner !== requesterId) {
            // Forward to owner to get data and invalidate
            const ownerChip = getChipId(entry.owner, coresPerChip);
            messages.push({
              type: 'DIR_FWD_GETX',
              from: 'directory',
              to: entry.owner,
              address,
              data: requesterId,
              fromChip: homeChip,
              toChip: ownerChip,
              isInterChip: ownerChip !== homeChip,
            });
          } else if (entry.state === 'S') {
            // Send invalidations to all sharers
            for (const sharer of entry.sharers) {
              if (sharer !== requesterId) {
                const sharerChip = getChipId(sharer, coresPerChip);
                messages.push({
                  type: sharerChip === homeChip ? 'L1_INV' : 'DIR_INV',
                  from: 'directory',
                  to: sharer,
                  address,
                  fromChip: homeChip,
                  toChip: sharerChip,
                  isInterChip: sharerChip !== homeChip,
                });
              }
            }
            // Send data to requester
            const requesterChip = message.fromChip ?? getChipId(requesterId, coresPerChip);
            messages.push({
              type: requesterChip === homeChip ? 'L2_DATA' : 'DIR_DATA',
              from: 'directory',
              to: requesterId,
              address,
              data: entry.data,
              fromChip: homeChip,
              toChip: requesterChip,
              isInterChip: requesterChip !== homeChip,
            });
          } else {
            // Uncached or requester is already owner
            const requesterChip = message.fromChip ?? getChipId(requesterId, coresPerChip);
            messages.push({
              type: requesterChip === homeChip ? 'L2_DATA' : 'DIR_DATA',
              from: 'directory',
              to: requesterId,
              address,
              data: entry.data,
              fromChip: homeChip,
              toChip: requesterChip,
              isInterChip: requesterChip !== homeChip,
            });
          }

          // Update directory to exclusive
          entry.state = 'M';
          entry.owner = requesterId;
          entry.sharers.clear();
          directoryUpdates.push({
            address,
            state: 'M',
            owner: requesterId,
            sharers: [],
          });
          break;
        }

        case 'DIR_WB': {
          // Writeback from a node
          if (data !== undefined) {
            entry.data = data;
            memoryUpdates.push({ address, data });
          }
          if (entry.owner === requesterId) {
            entry.state = 'U';
            entry.owner = undefined;
            directoryUpdates.push({
              address,
              state: 'U',
              sharers: [],
            });
          }
          break;
        }

        case 'DIR_ACK':
        case 'L2_ACK': {
          // Acknowledgment - nothing to do for now
          break;
        }
      }
    } else if (typeof to === 'number') {
      // Message to a cache node
      const targetNode = nodes[to];
      if (!targetNode) {
        return { messages, stateChanges, memoryUpdates, directoryUpdates, complete: true };
      }

      switch (type) {
        case 'L1_DOWNGRADE':
        case 'DIR_FWD_GETS': {
          // Forward request - owner should send data to requester and downgrade
          const requesterId = data as number;
          const cacheLine = targetNode.cache.get(address);
          const cacheData = cacheLine?.data ?? entry.data;
          const requesterChip = getChipId(requesterId, coresPerChip);
          const ownerChip = getChipId(to, coresPerChip);

          messages.push({
            type: requesterChip === ownerChip ? 'L2_DATA' : 'CHIP_DATA',
            from: to,
            to: requesterId,
            address,
            data: cacheData,
            fromChip: ownerChip,
            toChip: requesterChip,
            isInterChip: requesterChip !== ownerChip,
          });

          // Owner downgrades to Shared
          stateChanges.push({
            nodeId: to,
            address,
            oldState: (cacheLine?.state as L1State) || 'Invalid',
            newState: 'Valid-Clean',
          });
          targetNode.cache.set(address, {
            address,
            state: 'Valid-Clean',
            data: cacheData,
          });
          break;
        }

        case 'DIR_FWD_GETX': {
          // Forward exclusive request - owner must invalidate and send data
          const requesterId = data as number;
          const cacheLine = targetNode.cache.get(address);
          const cacheData = cacheLine?.data ?? entry.data;
          const requesterChip = getChipId(requesterId, coresPerChip);
          const ownerChip = getChipId(to, coresPerChip);

          messages.push({
            type: requesterChip === ownerChip ? 'L2_DATA' : 'CHIP_DATA',
            from: to,
            to: requesterId,
            address,
            data: cacheData,
            fromChip: ownerChip,
            toChip: requesterChip,
            isInterChip: requesterChip !== ownerChip,
          });

          // Owner invalidates
          stateChanges.push({
            nodeId: to,
            address,
            oldState: (cacheLine?.state as L1State) || 'Invalid',
            newState: 'Invalid',
          });
          targetNode.cache.delete(address);
          break;
        }

        case 'L1_INV':
        case 'DIR_INV': {
          // Invalidation
          const cacheLine = targetNode.cache.get(address);
          if (cacheLine) {
            stateChanges.push({
              nodeId: to,
              address,
              oldState: cacheLine.state as L1State,
              newState: 'Invalid',
            });
            targetNode.cache.delete(address);
          }
          break;
        }

        case 'L2_DATA':
        case 'DIR_DATA':
        case 'CHIP_DATA': {
          // Data response - update requesting node's cache
          const cacheLine = targetNode.cache.get(address);
          // Determine if this is for a write (GETX) or read (GETS)
          // For simplicity, check if data came with original request
          const newState: L1State = 'Valid-Clean';

          stateChanges.push({
            nodeId: to,
            address,
            oldState: (cacheLine?.state as L1State) || 'Invalid',
            newState,
          });

          targetNode.cache.set(address, {
            address,
            state: newState,
            data: data ?? 0,
          });
          break;
        }
      }
    }

    return {
      messages,
      stateChanges,
      memoryUpdates,
      directoryUpdates,
      complete: messages.length === 0,
    };
  },
};

export function getL1State(node: CacheNode, address: number): L1State {
  const line = node.cache.get(address);
  return (line?.state as L1State) || 'Invalid';
}
