// Cache line states for different protocols
export type MSIState = 'M' | 'S' | 'I';
export type MESIState = 'M' | 'E' | 'S' | 'I';
export type DirectoryState = 'U' | 'S' | 'M'; // Uncached, Shared, Modified
export type L1State = 'Invalid' | 'Valid-Clean' | 'Valid-Dirty';
export type L2State = 'Invalid' | 'Shared' | 'Exclusive' | 'Modified';

export type CacheState = MSIState | MESIState | L1State | L2State;

// Protocol types
export type ProtocolType = 'MSI' | 'MESI' | 'Piranha';

// Bus message types for snooping protocols
export type BusMessageType =
  | 'BusRd'      // Read request
  | 'BusRdX'     // Read exclusive (for write)
  | 'BusUpgr'    // Upgrade (S -> M without data)
  | 'BusWB'      // Write back
  | 'Flush'      // Flush data to bus
  | 'FlushOpt';  // Optional flush (MESI optimization)

// Directory message types for Piranha
export type DirectoryMessageType =
  | 'GETS'       // Get shared
  | 'GETX'       // Get exclusive
  | 'FORWARD'    // Forward request to owner
  | 'INV'        // Invalidate
  | 'ACK'        // Acknowledgment
  | 'DATA'       // Data response
  | 'WB';        // Write back

export type MessageType = BusMessageType | DirectoryMessageType | PiranhaMessageType;

// Cache line representation
export interface CacheLine {
  address: number;
  state: CacheState;
  data?: number;
}

// CPU/Cache node
export interface CacheNode {
  id: number;
  cache: Map<number, CacheLine>; // address -> cache line
}

// Directory entry for simple directory protocol
export interface DirectoryEntry {
  state: DirectoryState;
  owner?: number;      // Node ID of owner (for Modified state)
  sharers: Set<number>; // Set of node IDs sharing this line
  data: number;
}

// ============= Piranha-specific types =============

// Piranha L2 directory entry (stored in L2 cache slices)
export interface PiranhaL2Entry {
  state: L2State;
  data?: number;
  // Local directory: which L1s on this chip have the line
  localSharers: Set<number>;  // Core IDs (0-3 within chip)
  localOwner?: number;        // Core ID if locally modified
  // Global state: is data potentially in other chips?
  globalState: 'Local' | 'Remote' | 'Shared-Remote';
  homeChip: number;           // Which chip owns this address (for directory)
}

// Piranha chip structure
export interface PiranhaChip {
  id: number;
  cores: PiranhaCore[];
  l2Cache: Map<number, PiranhaL2Entry>;  // L2 cache with directory
  l2Directory: Map<number, PiranhaDirectorySlice>; // Directory slices for addresses homed here
}

// Piranha core (CPU + L1)
export interface PiranhaCore {
  id: number;        // Global core ID
  chipId: number;    // Which chip this core belongs to
  localId: number;   // Core ID within chip (0-3)
  l1Cache: Map<number, CacheLine>;
}

// Directory slice entry (for addresses homed on this chip)
export interface PiranhaDirectorySlice {
  state: 'Uncached' | 'Shared' | 'Exclusive';
  owner?: number;           // Chip ID of exclusive owner
  sharers: Set<number>;     // Set of chip IDs with shared copies
  data: number;
}

// Piranha message types (more specific)
export type PiranhaMessageType =
  // Intra-chip messages
  | 'L1_READ'        // L1 read request to L2
  | 'L1_WRITE'       // L1 write request to L2
  | 'L2_DATA'        // L2 response with data
  | 'L2_ACK'         // L2 acknowledgment
  | 'L1_INV'         // Invalidate L1
  | 'L1_DOWNGRADE'   // Downgrade L1 from M to S
  // Inter-chip messages
  | 'DIR_GETS'       // Get shared from home directory
  | 'DIR_GETX'       // Get exclusive from home directory
  | 'DIR_DATA'       // Data from directory/memory
  | 'DIR_FWD_GETS'   // Forward read to owner chip
  | 'DIR_FWD_GETX'   // Forward write to owner chip
  | 'DIR_INV'        // Invalidate request to sharer chip
  | 'DIR_ACK'        // Acknowledgment to directory
  | 'DIR_WB'         // Writeback to directory
  | 'CHIP_DATA';     // Data response between chips

// Message for animation
export interface Message {
  id: string;
  type: MessageType;
  from: number | 'memory' | 'directory';
  to: number | 'memory' | 'directory' | 'bus';
  address: number;
  data?: number;
  timestamp: number;
  progress: number; // 0-1 for animation
  // Piranha-specific routing info
  fromChip?: number;
  toChip?: number;
  fromCore?: number;  // Local core ID within chip
  toCore?: number;
  isInterChip?: boolean;  // true for chip-to-chip messages
}

// CPU operation types
export type OperationType = 'Read' | 'Write';

export interface CPUOperation {
  nodeId: number;
  type: OperationType;
  address: number;
  data?: number; // For writes
}

// Protocol interface that all implementations must follow
export interface Protocol {
  name: ProtocolType;

  // Handle a CPU request, returns messages to send
  handleCPURequest(
    operation: CPUOperation,
    nodes: CacheNode[],
    memory: Map<number, number>,
    directory?: Map<number, DirectoryEntry>
  ): ProtocolResult;

  // Handle a received message
  handleMessage(
    message: Message,
    nodes: CacheNode[],
    memory: Map<number, number>,
    directory?: Map<number, DirectoryEntry>
  ): ProtocolResult;

  // Get initial state for a cache line
  getInitialState(): CacheState;
}

export interface ProtocolResult {
  messages: Omit<Message, 'id' | 'timestamp' | 'progress'>[];
  stateChanges: StateChange[];
  memoryUpdates: MemoryUpdate[];
  directoryUpdates?: DirectoryUpdate[];
  complete: boolean; // Is the operation complete?
}

export interface StateChange {
  nodeId: number;
  address: number;
  oldState: CacheState;
  newState: CacheState;
}

export interface MemoryUpdate {
  address: number;
  data: number;
}

export interface DirectoryUpdate {
  address: number;
  state: DirectoryState;
  owner?: number;
  sharers: number[];
}

// State colors for visualization
export const STATE_COLORS: Record<string, string> = {
  'M': '#ef4444',        // Red
  'E': '#3b82f6',        // Blue
  'S': '#22c55e',        // Green
  'I': '#6b7280',        // Gray
  'U': '#d1d5db',        // Light gray
  'Invalid': '#6b7280',
  'Valid-Clean': '#22c55e',
  'Valid-Dirty': '#ef4444',
  // L2 states
  'Shared': '#22c55e',
  'Exclusive': '#3b82f6',
  'Modified': '#ef4444',
  // Directory states
  'Uncached': '#d1d5db',
  'Local': '#a855f7',     // Purple - data local to chip
  'Remote': '#f59e0b',    // Amber - data on remote chip
  'Shared-Remote': '#06b6d4', // Cyan - shared across chips
};

export const STATE_LABELS: Record<string, string> = {
  'M': 'Modified',
  'E': 'Exclusive',
  'S': 'Shared',
  'I': 'Invalid',
  'U': 'Uncached',
  'Invalid': 'Invalid',
  'Valid-Clean': 'Valid (Clean)',
  'Valid-Dirty': 'Valid (Dirty)',
  'Shared': 'Shared',
  'Exclusive': 'Exclusive',
  'Modified': 'Modified',
  'Uncached': 'Uncached',
  'Local': 'Local',
  'Remote': 'Remote',
  'Shared-Remote': 'Shared (Remote)',
};
