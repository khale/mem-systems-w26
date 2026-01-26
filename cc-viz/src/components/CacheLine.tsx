import React from 'react';
import { CacheState, STATE_COLORS, STATE_LABELS } from '../protocols/types';

interface CacheLineProps {
  address: number;
  state: CacheState;
  data?: number;
  compact?: boolean;
}

export const CacheLine: React.FC<CacheLineProps> = ({
  address,
  state,
  data,
  compact = false,
}) => {
  const color = STATE_COLORS[state] || '#6b7280';
  const label = STATE_LABELS[state] || state;

  if (compact) {
    return (
      <div
        className="cache-line-compact"
        style={{ backgroundColor: color }}
        title={`Addr ${address}: ${label}${data !== undefined ? ` = ${data}` : ''}`}
      >
        <span className="cache-line-addr-compact">@{address}</span>
        <span className="cache-line-state">{state.charAt(0)}</span>
        {data !== undefined && <span className="cache-line-data-compact">={data}</span>}
      </div>
    );
  }

  return (
    <div className="cache-line" style={{ borderLeftColor: color }}>
      <div className="cache-line-header">
        <span className="cache-line-addr">@{address}</span>
        <span
          className="cache-line-state-badge"
          style={{ backgroundColor: color }}
        >
          {state}
        </span>
      </div>
      {data !== undefined && (
        <div className="cache-line-data">Data: {data}</div>
      )}
    </div>
  );
};
