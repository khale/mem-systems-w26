import React from 'react';
import { PiranhaChip, PiranhaL2Entry, STATE_COLORS, CacheLine } from '../protocols/types';

interface ChipProps {
  chip: PiranhaChip;
  x: number;
  y: number;
  width: number;
  height: number;
  activeCore?: number;  // Global core ID if active
}

export const Chip: React.FC<ChipProps> = ({ chip, x, y, width, height, activeCore }) => {
  const coreWidth = 60;
  const coreHeight = 50;
  const coreSpacing = 10;
  const numCores = chip.cores.length;

  // Layout: cores on top, L2/directory on bottom
  const coresY = y + 25;
  const l2Y = y + height - 55;

  // Center cores horizontally
  const totalCoresWidth = numCores * coreWidth + (numCores - 1) * coreSpacing;
  const coresStartX = x + (width - totalCoresWidth) / 2;

  // Get L2 entries that have data
  const l2Entries = Array.from(chip.l2Cache.entries())
    .filter(([_, entry]) => entry.state !== 'Invalid')
    .slice(0, 4);

  // Get directory entries for addresses homed here
  const dirEntries = Array.from(chip.l2Directory.entries())
    .filter(([_, entry]) => entry.state !== 'Uncached')
    .slice(0, 3);

  return (
    <g>
      {/* Chip background */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={8}
        className="chip-rect"
      />

      {/* Chip label */}
      <text
        x={x + width / 2}
        y={y + 15}
        textAnchor="middle"
        className="chip-label"
      >
        Chip {chip.id}
      </text>

      {/* Cores with L1 caches */}
      {chip.cores.map((core, idx) => {
        const coreX = coresStartX + idx * (coreWidth + coreSpacing);
        const isActive = activeCore === core.id;
        const l1Entries = Array.from(core.l1Cache.entries()).slice(0, 2);

        return (
          <g key={core.id}>
            {/* Core background */}
            <rect
              x={coreX}
              y={coresY}
              width={coreWidth}
              height={coreHeight}
              rx={4}
              className={`core-rect ${isActive ? 'core-active' : ''}`}
            />

            {/* Core label */}
            <text
              x={coreX + coreWidth / 2}
              y={coresY + 12}
              textAnchor="middle"
              className="core-label"
            >
              C{core.localId}
            </text>

            {/* L1 cache entries */}
            <foreignObject x={coreX + 2} y={coresY + 16} width={coreWidth - 4} height={32}>
              <div className="l1-cache-container">
                {l1Entries.length === 0 ? (
                  <div className="l1-empty">L1</div>
                ) : (
                  l1Entries.map(([addr, line]) => (
                    <div
                      key={addr}
                      className="l1-entry"
                      style={{ backgroundColor: STATE_COLORS[line.state] || '#6b7280' }}
                      title={`@${addr}: ${line.state}${line.data !== undefined ? ` = ${line.data}` : ''}`}
                    >
                      {line.state === 'Valid-Dirty' ? 'M' : line.state === 'Valid-Clean' ? 'S' : 'I'}
                    </div>
                  ))
                )}
              </div>
            </foreignObject>

            {/* Connection line from core to L2 */}
            <line
              x1={coreX + coreWidth / 2}
              y1={coresY + coreHeight}
              x2={coreX + coreWidth / 2}
              y2={l2Y}
              className="intra-chip-connection"
            />
          </g>
        );
      })}

      {/* L2 Cache + Directory */}
      <rect
        x={x + 10}
        y={l2Y}
        width={width - 20}
        height={45}
        rx={4}
        className="l2-rect"
      />

      <text
        x={x + 20}
        y={l2Y + 12}
        className="l2-label"
      >
        L2 + Dir
      </text>

      {/* L2 cache entries */}
      <foreignObject x={x + 60} y={l2Y + 3} width={width - 75} height={40}>
        <div className="l2-entries-container">
          {l2Entries.length === 0 && dirEntries.length === 0 ? (
            <div className="l2-empty">Empty</div>
          ) : (
            <>
              {l2Entries.map(([addr, entry]) => (
                <div
                  key={`l2-${addr}`}
                  className="l2-entry"
                  title={`L2 @${addr}: ${entry.state}, local sharers: ${Array.from(entry.localSharers).join(',') || 'none'}`}
                >
                  <span className="l2-addr">@{addr}</span>
                  <span
                    className="l2-state"
                    style={{ backgroundColor: STATE_COLORS[entry.state] || '#6b7280' }}
                  >
                    {entry.state.charAt(0)}
                  </span>
                  {entry.data !== undefined && (
                    <span className="l2-data">={entry.data}</span>
                  )}
                </div>
              ))}
              {dirEntries.map(([addr, entry]) => (
                <div
                  key={`dir-${addr}`}
                  className="dir-entry"
                  title={`Dir @${addr}: ${entry.state}, sharers: ${Array.from(entry.sharers).map(s => `C${s}`).join(',') || 'none'}`}
                >
                  <span className="dir-addr">@{addr}</span>
                  <span
                    className="dir-state"
                    style={{
                      backgroundColor: entry.state === 'Uncached' ? '#d1d5db' :
                        entry.state === 'Exclusive' ? '#f59e0b' : '#06b6d4'
                    }}
                  >
                    D{entry.state.charAt(0)}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </foreignObject>
    </g>
  );
};

export default Chip;
