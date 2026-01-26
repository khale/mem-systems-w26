import React from 'react';
import { DirectoryEntry, STATE_COLORS } from '../protocols/types';

interface DirectoryProps {
  directory: Map<number, DirectoryEntry>;
  x: number;
  y: number;
}

export const Directory: React.FC<DirectoryProps> = ({ directory, x, y }) => {
  const entries = Array.from(directory.entries())
    .filter(([_, entry]) => entry.state !== 'U')
    .slice(0, 4);

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Directory background */}
      <rect
        x={-100}
        y={-45}
        width={200}
        height={90}
        rx={6}
        className="directory-rect"
      />

      {/* Label */}
      <text
        x={0}
        y={-25}
        textAnchor="middle"
        className="directory-label"
      >
        Directory Controller
      </text>

      {/* Directory entries */}
      <foreignObject x={-95} y={-15} width={190} height={55}>
        <div className="directory-entries">
          {entries.length === 0 ? (
            <div className="directory-empty">No cached entries</div>
          ) : (
            <table className="directory-table">
              <thead>
                <tr>
                  <th>Addr</th>
                  <th>State</th>
                  <th>Owner/Sharers</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(([addr, entry]) => (
                  <tr key={addr}>
                    <td>@{addr}</td>
                    <td>
                      <span
                        className="directory-state"
                        style={{ backgroundColor: STATE_COLORS[entry.state] }}
                      >
                        {entry.state}
                      </span>
                    </td>
                    <td>
                      {entry.state === 'M' && entry.owner !== undefined
                        ? `P${entry.owner}`
                        : entry.sharers.size > 0
                        ? Array.from(entry.sharers).map(s => `P${s}`).join(', ')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </foreignObject>
    </g>
  );
};
