import { CPUOperation } from '../protocols/types';

export interface Workload {
  name: string;
  description: string;
  operations: CPUOperation[];
}

// Basic Read Sharing: P0 reads, P1 reads same address
export const basicReadSharing: Workload = {
  name: 'Basic Read Sharing',
  description: 'P0 reads address 0, then P1 reads the same address. Demonstrates how shared state is established.',
  operations: [
    { nodeId: 0, type: 'Read', address: 0 },
    { nodeId: 1, type: 'Read', address: 0 },
  ],
};

// Write Invalidation: P0 reads, P1 writes same address
export const writeInvalidation: Workload = {
  name: 'Write Invalidation',
  description: 'P0 reads address 0, then P1 writes to it. Demonstrates how writes invalidate other copies.',
  operations: [
    { nodeId: 0, type: 'Read', address: 0 },
    { nodeId: 1, type: 'Write', address: 0, data: 42 },
  ],
};

// Ping-Pong: Alternating writes between two processors
export const pingPong: Workload = {
  name: 'Ping-Pong',
  description: 'P0 and P1 alternately write to the same address. Shows the cost of cache line bouncing.',
  operations: [
    { nodeId: 0, type: 'Write', address: 0, data: 1 },
    { nodeId: 1, type: 'Write', address: 0, data: 2 },
    { nodeId: 0, type: 'Write', address: 0, data: 3 },
    { nodeId: 1, type: 'Write', address: 0, data: 4 },
  ],
};

// Producer-Consumer: One writer, multiple readers
export const producerConsumer: Workload = {
  name: 'Producer-Consumer',
  description: 'P0 writes data, then P1, P2, P3 read it. Demonstrates one-to-many data sharing.',
  operations: [
    { nodeId: 0, type: 'Write', address: 0, data: 100 },
    { nodeId: 1, type: 'Read', address: 0 },
    { nodeId: 2, type: 'Read', address: 0 },
    { nodeId: 3, type: 'Read', address: 0 },
  ],
};

// False Sharing: Adjacent addresses in same cache line
export const falseSharing: Workload = {
  name: 'False Sharing',
  description: 'P0 and P1 write to different addresses in the same cache line. Shows unnecessary invalidations.',
  operations: [
    { nodeId: 0, type: 'Write', address: 0, data: 10 },
    { nodeId: 1, type: 'Write', address: 0, data: 20 }, // Same cache line
    { nodeId: 0, type: 'Write', address: 0, data: 11 },
    { nodeId: 1, type: 'Write', address: 0, data: 21 },
  ],
};

// Read-Modify-Write pattern
export const readModifyWrite: Workload = {
  name: 'Read-Modify-Write',
  description: 'P0 reads then writes, P1 reads then writes. Common atomic operation pattern.',
  operations: [
    { nodeId: 0, type: 'Read', address: 0 },
    { nodeId: 0, type: 'Write', address: 0, data: 1 },
    { nodeId: 1, type: 'Read', address: 0 },
    { nodeId: 1, type: 'Write', address: 0, data: 2 },
  ],
};

// MESI Exclusive Demo
export const mesiExclusive: Workload = {
  name: 'MESI Exclusive Optimization',
  description: 'P0 reads (gets Exclusive), then writes (silent upgrade to Modified). MESI advantage over MSI.',
  operations: [
    { nodeId: 0, type: 'Read', address: 0 },
    { nodeId: 0, type: 'Write', address: 0, data: 99 },
  ],
};

// Three-way sharing
export const threeWaySharing: Workload = {
  name: 'Three-Way Sharing',
  description: 'Three processors share a read-only copy of data.',
  operations: [
    { nodeId: 0, type: 'Read', address: 0 },
    { nodeId: 1, type: 'Read', address: 0 },
    { nodeId: 2, type: 'Read', address: 0 },
  ],
};

// Migratory data pattern
export const migratoryData: Workload = {
  name: 'Migratory Data',
  description: 'Data moves through multiple processors with read-modify-write operations.',
  operations: [
    { nodeId: 0, type: 'Read', address: 0 },
    { nodeId: 0, type: 'Write', address: 0, data: 1 },
    { nodeId: 1, type: 'Read', address: 0 },
    { nodeId: 1, type: 'Write', address: 0, data: 2 },
    { nodeId: 2, type: 'Read', address: 0 },
    { nodeId: 2, type: 'Write', address: 0, data: 3 },
  ],
};

// Piranha: Intra-chip sharing (same chip, local L2)
export const piranhaIntraChip: Workload = {
  name: 'Piranha: Intra-Chip Sharing',
  description: 'Cores 0 and 1 (same chip) share address 0. Data stays local - only L1↔L2 traffic.',
  operations: [
    { nodeId: 0, type: 'Write', address: 0, data: 10 },
    { nodeId: 1, type: 'Read', address: 0 },  // Same chip, local sharing
  ],
};

// Piranha: Inter-chip access (remote home directory)
export const piranhaInterChip: Workload = {
  name: 'Piranha: Inter-Chip Access',
  description: 'Core 0 (chip 0) accesses address 1 (homed on chip 1). Shows directory lookup across chips.',
  operations: [
    { nodeId: 0, type: 'Read', address: 1 },  // Chip 0 core accessing chip 1 home
    { nodeId: 2, type: 'Read', address: 1 },  // Chip 1 core accessing local home
  ],
};

// Piranha: Cross-chip ping-pong
export const piranhaCrossChipPingPong: Workload = {
  name: 'Piranha: Cross-Chip Ping-Pong',
  description: 'Core 0 (chip 0) and core 2 (chip 1) alternate writes. Shows inter-chip invalidation cost.',
  operations: [
    { nodeId: 0, type: 'Write', address: 0, data: 1 },
    { nodeId: 2, type: 'Write', address: 0, data: 2 },  // Cross-chip write
    { nodeId: 0, type: 'Write', address: 0, data: 3 },
    { nodeId: 2, type: 'Write', address: 0, data: 4 },
  ],
};

// Piranha: Local vs Remote Home
export const piranhaLocalVsRemote: Workload = {
  name: 'Piranha: Local vs Remote Home',
  description: 'Core 0 accesses addr 0 (local home) then addr 1 (remote home). Compare latencies.',
  operations: [
    { nodeId: 0, type: 'Read', address: 0 },  // Local home (addr % 2 = 0 → chip 0)
    { nodeId: 0, type: 'Read', address: 1 },  // Remote home (addr % 2 = 1 → chip 1)
  ],
};

export const allWorkloads: Workload[] = [
  basicReadSharing,
  writeInvalidation,
  pingPong,
  producerConsumer,
  falseSharing,
  readModifyWrite,
  mesiExclusive,
  threeWaySharing,
  migratoryData,
  piranhaIntraChip,
  piranhaInterChip,
  piranhaCrossChipPingPong,
  piranhaLocalVsRemote,
];

export function getWorkloadByName(name: string): Workload | undefined {
  return allWorkloads.find(w => w.name === name);
}

// Adjust workload for node count (cap nodeIds to available nodes)
export function adjustWorkloadForNodeCount(workload: Workload, nodeCount: number): Workload {
  return {
    ...workload,
    operations: workload.operations.map(op => ({
      ...op,
      nodeId: op.nodeId % nodeCount,
    })),
  };
}
