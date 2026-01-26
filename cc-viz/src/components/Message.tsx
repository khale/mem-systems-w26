import React from 'react';
import { MessageType } from '../protocols/types';

interface MessageProps {
  type: MessageType;
  x: number;
  y: number;
  progress: number;
}

const MESSAGE_COLORS: Record<string, string> = {
  // Bus messages (MSI/MESI)
  BusRd: '#3b82f6',     // Blue
  BusRdX: '#ef4444',    // Red
  BusUpgr: '#f59e0b',   // Amber
  BusWB: '#8b5cf6',     // Purple
  Flush: '#8b5cf6',     // Purple
  FlushOpt: '#8b5cf6',  // Purple

  // Generic directory messages
  GETS: '#3b82f6',      // Blue
  GETX: '#ef4444',      // Red
  FORWARD: '#f59e0b',   // Amber
  INV: '#dc2626',       // Red
  ACK: '#22c55e',       // Green
  DATA: '#10b981',      // Emerald
  WB: '#8b5cf6',        // Purple

  // Piranha local messages (intra-chip, L1↔L2)
  L1_READ: '#22c55e',       // Green - local read request
  L1_WRITE: '#16a34a',      // Darker green - local write request
  L2_DATA: '#10b981',       // Emerald - L2 data response
  L2_ACK: '#6ee7b7',        // Light emerald - L2 acknowledgment
  L1_INV: '#fbbf24',        // Yellow - local invalidation
  L1_DOWNGRADE: '#f59e0b',  // Amber - local downgrade

  // Piranha remote messages (inter-chip, directory)
  DIR_GETS: '#3b82f6',      // Blue - remote read request
  DIR_GETX: '#ef4444',      // Red - remote write request
  DIR_DATA: '#6366f1',      // Indigo - directory data response
  DIR_FWD_GETS: '#8b5cf6',  // Purple - forwarded read
  DIR_FWD_GETX: '#a855f7',  // Violet - forwarded write
  DIR_INV: '#dc2626',       // Red - remote invalidation
  DIR_ACK: '#22d3ee',       // Cyan - directory acknowledgment
  DIR_WB: '#7c3aed',        // Purple - writeback to directory
  CHIP_DATA: '#06b6d4',     // Cyan - chip-to-chip data transfer
};

const MESSAGE_LABELS: Record<string, string> = {
  // Bus messages (MSI/MESI)
  BusRd: 'Rd',
  BusRdX: 'RdX',
  BusUpgr: 'Upgr',
  BusWB: 'WB',
  Flush: 'Flush',
  FlushOpt: 'Flush',

  // Generic directory messages
  GETS: 'GETS',
  GETX: 'GETX',
  FORWARD: 'FWD',
  INV: 'INV',
  ACK: 'ACK',
  DATA: 'DATA',
  WB: 'WB',

  // Piranha local messages (intra-chip)
  L1_READ: 'L1Rd',
  L1_WRITE: 'L1Wr',
  L2_DATA: 'L2D',
  L2_ACK: 'L2Ack',
  L1_INV: 'L1Inv',
  L1_DOWNGRADE: 'L1Dwn',

  // Piranha remote messages (inter-chip)
  DIR_GETS: 'DirRd',
  DIR_GETX: 'DirWr',
  DIR_DATA: 'DirD',
  DIR_FWD_GETS: 'Fwd',
  DIR_FWD_GETX: 'FwdX',
  DIR_INV: 'DInv',
  DIR_ACK: 'DAck',
  DIR_WB: 'DWB',
  CHIP_DATA: 'ChpD',
};

export const Message: React.FC<MessageProps> = ({ type, x, y, progress }) => {
  const color = MESSAGE_COLORS[type] || '#6b7280';
  const label = MESSAGE_LABELS[type] || type;
  const opacity = progress < 1 ? 1 : 0;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{ opacity, transition: 'opacity 0.2s' }}
    >
      {/* Message circle */}
      <circle
        r={16}
        fill={color}
        className="message-circle"
      />

      {/* Message label */}
      <text
        y={1}
        textAnchor="middle"
        dominantBaseline="middle"
        className="message-label"
      >
        {label}
      </text>
    </g>
  );
};

// Draw a path line between two points
export const MessagePath: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  active?: boolean;
}> = ({ x1, y1, x2, y2, active = false }) => {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      className={`message-path ${active ? 'message-path-active' : ''}`}
      strokeDasharray="4,4"
    />
  );
};
