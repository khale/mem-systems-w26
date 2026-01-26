import React from 'react';
import { CacheNode } from '../protocols/types';
import { CacheLine } from './CacheLine';

interface NodeProps {
  node: CacheNode;
  x: number;
  y: number;
  isActive?: boolean;
}

export const Node: React.FC<NodeProps> = ({ node, x, y, isActive = false }) => {
  const cacheLines = Array.from(node.cache.entries());

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Node background */}
      <rect
        x={-60}
        y={-50}
        width={120}
        height={100}
        rx={8}
        className={`node-rect ${isActive ? 'node-active' : ''}`}
      />

      {/* CPU label */}
      <text
        x={0}
        y={-30}
        textAnchor="middle"
        className="node-label"
      >
        CPU {node.id}
      </text>

      {/* Cache lines */}
      <foreignObject x={-55} y={-20} width={110} height={65}>
        <div className="cache-container">
          {cacheLines.length === 0 ? (
            <div className="cache-empty">Cache Empty</div>
          ) : (
            cacheLines.slice(0, 3).map(([addr, line]) => (
              <CacheLine
                key={addr}
                address={addr}
                state={line.state}
                data={line.data}
                compact
              />
            ))
          )}
          {cacheLines.length > 3 && (
            <div className="cache-more">+{cacheLines.length - 3} more</div>
          )}
        </div>
      </foreignObject>
    </g>
  );
};

// Calculate node positions in a circle
export function calculateNodePositions(
  nodeCount: number,
  centerX: number,
  centerY: number,
  radius: number
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const startAngle = -Math.PI / 2; // Start at top

  for (let i = 0; i < nodeCount; i++) {
    const angle = startAngle + (2 * Math.PI * i) / nodeCount;
    positions.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  }

  return positions;
}
