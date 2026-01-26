import React from 'react';

interface MemoryProps {
  memory: Map<number, number>;
  x: number;
  y: number;
}

export const Memory: React.FC<MemoryProps> = ({ memory, x, y }) => {
  const entries = Array.from(memory.entries()).slice(0, 8);

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Memory background */}
      <rect
        x={-120}
        y={-45}
        width={240}
        height={90}
        rx={6}
        className="memory-rect"
      />

      {/* Label */}
      <text
        x={0}
        y={-25}
        textAnchor="middle"
        className="memory-label"
      >
        Main Memory
      </text>

      {/* Memory cells */}
      <foreignObject x={-115} y={-12} width={230} height={55}>
        <div className="memory-cells">
          {entries.map(([addr, value]) => (
            <div key={addr} className="memory-cell" title={`Address ${addr}`}>
              <span className="memory-addr">@{addr}</span>
              <span className="memory-value">{value}</span>
            </div>
          ))}
        </div>
      </foreignObject>
    </g>
  );
};
