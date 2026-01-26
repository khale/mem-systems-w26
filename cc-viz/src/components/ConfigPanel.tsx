import React from 'react';
import { ProtocolType } from '../protocols/types';

interface ConfigPanelProps {
  nodeCount: number;
  protocol: ProtocolType;
  onNodeCountChange: (count: number) => void;
  onProtocolChange: (protocol: ProtocolType) => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  nodeCount,
  protocol,
  onNodeCountChange,
  onProtocolChange,
}) => {
  return (
    <div className="config-panel">
      <h3>Configuration</h3>

      <div className="config-group">
        <label>Protocol</label>
        <div className="protocol-buttons">
          {(['MSI', 'MESI', 'Piranha'] as ProtocolType[]).map((p) => (
            <button
              key={p}
              className={`protocol-btn ${protocol === p ? 'protocol-btn-active' : ''}`}
              onClick={() => onProtocolChange(p)}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="protocol-info">
          {protocol === 'MSI' && (
            <span>Bus-based snooping with Modified, Shared, Invalid states</span>
          )}
          {protocol === 'MESI' && (
            <span>Bus-based with Exclusive state for silent upgrades</span>
          )}
          {protocol === 'Piranha' && (
            <span>Directory-based protocol with L2 slices per chip, intra-chip and inter-chip coherence</span>
          )}
        </div>
      </div>

      <div className="config-group">
        {protocol === 'Piranha' ? (
          <>
            <label>Chip Configuration</label>
            <div className="piranha-config-info">
              <span>2 Chips × 2 Cores = 4 Total Cores</span>
              <span className="config-detail">Fixed architecture for Piranha demo</span>
            </div>
          </>
        ) : (
          <>
            <label>Processors: {nodeCount}</label>
            <input
              type="range"
              min="2"
              max="8"
              value={nodeCount}
              onChange={(e) => onNodeCountChange(parseInt(e.target.value))}
            />
            <div className="node-count-labels">
              <span>2</span>
              <span>8</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
