import React from 'react';

interface BusProps {
  x1: number;
  y: number;
  x2: number;
  isActive?: boolean;
}

export const Bus: React.FC<BusProps> = ({ x1, y, x2, isActive = false }) => {
  return (
    <g className="bus-group">
      {/* Bus line */}
      <line
        x1={x1}
        y1={y}
        x2={x2}
        y2={y}
        className={`bus-line ${isActive ? 'bus-active' : ''}`}
        strokeWidth={4}
      />

      {/* Bus label */}
      <text
        x={(x1 + x2) / 2}
        y={y - 10}
        textAnchor="middle"
        className="bus-label"
      >
        Shared Bus
      </text>

      {/* Connection points */}
      <circle cx={x1 + 20} cy={y} r={3} className="bus-connector" />
      <circle cx={x2 - 20} cy={y} r={3} className="bus-connector" />
    </g>
  );
};
