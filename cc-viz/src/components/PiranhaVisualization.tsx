import React from 'react';
import { SimulationState } from '../simulation/engine';
import { PiranhaChip, STATE_COLORS } from '../protocols/types';
import { Message } from './Message';
import { useAnimation, getMessagePosition } from '../hooks/useAnimation';

interface PiranhaVisualizationProps {
  state: SimulationState;
  isPlaying: boolean;
  speed: number;
}

const WIDTH = 750;
const HEIGHT = 550;

export const PiranhaVisualization: React.FC<PiranhaVisualizationProps> = ({
  state,
  isPlaying,
  speed,
}) => {
  const chips = state.chips || [];
  const chipCount = chips.length || 2;
  const coresPerChip = chips[0]?.cores.length || 2;

  // Layout: chips arranged horizontally with interconnect
  const chipWidth = 160;
  const chipHeight = 200;
  const chipSpacing = 80;
  const totalChipsWidth = chipCount * chipWidth + (chipCount - 1) * chipSpacing;
  const chipsStartX = (WIDTH - totalChipsWidth) / 2;
  const chipsY = 80;

  // Memory at bottom
  const memoryY = HEIGHT - 80;

  // Build position map for animations
  const positionMap = React.useMemo(() => {
    const map = new Map<number | string, { x: number; y: number }>();

    chips.forEach((chip, chipIdx) => {
      const chipX = chipsStartX + chipIdx * (chipWidth + chipSpacing) + chipWidth / 2;
      const chipCenterY = chipsY + chipHeight / 2;

      // Chip center (for L2/directory)
      map.set(`chip-${chip.id}`, { x: chipX, y: chipCenterY + 50 });
      map.set(`l2-${chip.id}`, { x: chipX, y: chipsY + chipHeight - 30 });

      // Core positions
      chip.cores.forEach((core, coreIdx) => {
        const coreX = chipsStartX + chipIdx * (chipWidth + chipSpacing) + 30 + coreIdx * 55;
        map.set(core.id, { x: coreX + 25, y: chipsY + 50 });
      });
    });

    map.set('memory', { x: WIDTH / 2, y: memoryY });
    map.set('directory', { x: WIDTH / 2, y: memoryY - 40 });

    return map;
  }, [chips, chipsStartX, chipsY, chipWidth, chipSpacing, chipHeight, memoryY]);

  // Animate messages
  const animatedMessages = useAnimation(state.messages, isPlaying, speed);

  // Get active core from current operation
  const activeCore = state.operationQueue[state.currentOperationIndex]?.nodeId;

  return (
    <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      {/* Background */}
      <defs>
        <pattern id="grid-piranha" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-piranha)" />

      {/* Title */}
      <text x={WIDTH / 2} y={25} textAnchor="middle" className="piranha-title" fontSize="14" fontWeight="600" fill="#374151">
        Piranha: Directory-Based Coherence with L2 Slices
      </text>

      {/* Inter-chip interconnect ring */}
      <ellipse
        cx={WIDTH / 2}
        cy={chipsY + chipHeight / 2 + 20}
        rx={totalChipsWidth / 2 + 20}
        ry={40}
        className="inter-chip-ring"
        fill="none"
        stroke="#c4b5fd"
        strokeWidth="3"
        strokeDasharray="8,4"
      />
      <text x={WIDTH / 2} y={chipsY + chipHeight / 2 + 65} textAnchor="middle" fontSize="10" fill="#7c3aed">
        Inter-Chip Ring
      </text>

      {/* Chips */}
      {chips.map((chip, chipIdx) => {
        const chipX = chipsStartX + chipIdx * (chipWidth + chipSpacing);
        return (
          <g key={chip.id}>
            {/* Chip background */}
            <rect
              x={chipX}
              y={chipsY}
              width={chipWidth}
              height={chipHeight}
              rx={8}
              fill="#f0fdf4"
              stroke="#16a34a"
              strokeWidth="2"
            />

            {/* Chip label */}
            <text x={chipX + chipWidth / 2} y={chipsY + 18} textAnchor="middle" fontSize="12" fontWeight="700" fill="#166534">
              Chip {chip.id}
            </text>

            {/* Cores */}
            {chip.cores.map((core, coreIdx) => {
              const coreX = chipX + 15 + coreIdx * 70;
              const coreY = chipsY + 30;
              const isActive = activeCore === core.id;
              const l1Entries = Array.from(core.l1Cache.entries()).slice(0, 2);

              return (
                <g key={core.id}>
                  {/* Core box */}
                  <rect
                    x={coreX}
                    y={coreY}
                    width={60}
                    height={55}
                    rx={4}
                    fill="white"
                    stroke={isActive ? '#3b82f6' : '#d1d5db'}
                    strokeWidth={isActive ? 2 : 1.5}
                  />

                  {/* Core label */}
                  <text x={coreX + 30} y={coreY + 14} textAnchor="middle" fontSize="10" fontWeight="600" fill="#374151">
                    Core {core.localId}
                  </text>

                  {/* L1 Cache entries */}
                  <text x={coreX + 5} y={coreY + 28} fontSize="8" fill="#6b7280">L1:</text>
                  {l1Entries.length === 0 ? (
                    <text x={coreX + 20} y={coreY + 42} fontSize="8" fill="#9ca3af">empty</text>
                  ) : (
                    l1Entries.map(([addr, line], idx) => (
                      <g key={addr}>
                        <rect
                          x={coreX + 5 + idx * 26}
                          y={coreY + 32}
                          width={24}
                          height={18}
                          rx={2}
                          fill={STATE_COLORS[line.state] || '#6b7280'}
                        />
                        <text x={coreX + 17 + idx * 26} y={coreY + 44} textAnchor="middle" fontSize="7" fill="white" fontWeight="600">
                          @{addr}={line.data ?? 0}
                        </text>
                      </g>
                    ))
                  )}

                  {/* Connection to L2 */}
                  <line
                    x1={coreX + 30}
                    y1={coreY + 55}
                    x2={coreX + 30}
                    y2={chipsY + chipHeight - 65}
                    stroke="#a7f3d0"
                    strokeWidth="1.5"
                    strokeDasharray="3,2"
                  />
                </g>
              );
            })}

            {/* L2 Cache + Directory Slice */}
            <rect
              x={chipX + 10}
              y={chipsY + chipHeight - 60}
              width={chipWidth - 20}
              height={50}
              rx={4}
              fill="#fef3c7"
              stroke="#f59e0b"
              strokeWidth="1.5"
            />

            <text x={chipX + 20} y={chipsY + chipHeight - 45} fontSize="9" fontWeight="600" fill="#92400e">
              L2 + Dir Slice
            </text>

            {/* L2 entries */}
            {(() => {
              const l2Entries = Array.from(chip.l2Cache.entries()).slice(0, 2);
              const dirEntries = Array.from(chip.l2Directory.entries())
                .filter(([_, e]) => e.state !== 'Uncached')
                .slice(0, 2);

              return (
                <g>
                  {l2Entries.map(([addr, entry], idx) => (
                    <g key={`l2-${addr}`}>
                      <rect
                        x={chipX + 15 + idx * 35}
                        y={chipsY + chipHeight - 32}
                        width={32}
                        height={16}
                        rx={2}
                        fill={STATE_COLORS[entry.state] || '#d1d5db'}
                      />
                      <text
                        x={chipX + 31 + idx * 35}
                        y={chipsY + chipHeight - 21}
                        textAnchor="middle"
                        fontSize="7"
                        fill="white"
                        fontWeight="500"
                      >
                        @{addr}
                      </text>
                    </g>
                  ))}
                  {dirEntries.map(([addr, entry], idx) => (
                    <g key={`dir-${addr}`}>
                      <rect
                        x={chipX + 85 + idx * 35}
                        y={chipsY + chipHeight - 32}
                        width={32}
                        height={16}
                        rx={2}
                        fill={entry.state === 'Exclusive' ? '#f59e0b' : '#06b6d4'}
                        stroke="#7c3aed"
                        strokeWidth="1"
                        strokeDasharray="2,1"
                      />
                      <text
                        x={chipX + 101 + idx * 35}
                        y={chipsY + chipHeight - 21}
                        textAnchor="middle"
                        fontSize="7"
                        fill="white"
                        fontWeight="500"
                      >
                        D@{addr}
                      </text>
                    </g>
                  ))}
                </g>
              );
            })()}

            {/* Connection to memory/directory */}
            <line
              x1={chipX + chipWidth / 2}
              y1={chipsY + chipHeight}
              x2={chipX + chipWidth / 2}
              y2={memoryY - 45}
              stroke="#8b5cf6"
              strokeWidth="2"
              strokeDasharray="6,3"
            />
          </g>
        );
      })}

      {/* Main Memory */}
      <rect
        x={WIDTH / 2 - 100}
        y={memoryY - 35}
        width={200}
        height={60}
        rx={6}
        fill="#dbeafe"
        stroke="#3b82f6"
        strokeWidth="2"
      />
      <text x={WIDTH / 2} y={memoryY - 15} textAnchor="middle" fontSize="12" fontWeight="600" fill="#1e40af">
        Main Memory
      </text>

      {/* Memory values */}
      <g>
        {Array.from(state.memory.entries()).slice(0, 8).map(([addr, value], idx) => (
          <g key={addr}>
            <rect
              x={WIDTH / 2 - 90 + idx * 22}
              y={memoryY}
              width={20}
              height={18}
              rx={2}
              fill="#bfdbfe"
              stroke="#60a5fa"
              strokeWidth="1"
            />
            <text
              x={WIDTH / 2 - 80 + idx * 22}
              y={memoryY + 9}
              textAnchor="middle"
              fontSize="7"
              fill="#1e40af"
            >
              @{addr}
            </text>
            <text
              x={WIDTH / 2 - 80 + idx * 22}
              y={memoryY + 16}
              textAnchor="middle"
              fontSize="7"
              fill="#1e3a8a"
              fontWeight="600"
            >
              {value}
            </text>
          </g>
        ))}
      </g>

      {/* Animated messages */}
      {animatedMessages.map((msg) => {
        const pos = getMessagePosition(msg, positionMap, undefined);
        return (
          <Message
            key={msg.id}
            type={msg.type}
            x={pos.x}
            y={pos.y}
            progress={msg.animationProgress}
          />
        );
      })}

      {/* Legend - Cache States */}
      <g transform={`translate(10, ${HEIGHT - 50})`}>
        <text x={0} y={0} fontSize="9" fontWeight="600" fill="#6b7280">CACHE STATES:</text>
        <rect x={90} y={-8} width={12} height={12} rx={2} fill="#ef4444" />
        <text x={105} y={2} fontSize="8" fill="#374151">Modified</text>
        <rect x={160} y={-8} width={12} height={12} rx={2} fill="#22c55e" />
        <text x={175} y={2} fontSize="8" fill="#374151">Shared</text>
        <rect x={220} y={-8} width={12} height={12} rx={2} fill="#6b7280" />
        <text x={235} y={2} fontSize="8" fill="#374151">Invalid</text>
        <rect x={280} y={-8} width={12} height={12} rx={2} fill="#f59e0b" stroke="#7c3aed" strokeDasharray="2,1" />
        <text x={295} y={2} fontSize="8" fill="#374151">Dir Entry</text>
      </g>
      {/* Legend - Message Types */}
      <g transform={`translate(10, ${HEIGHT - 30})`}>
        <text x={0} y={0} fontSize="9" fontWeight="600" fill="#6b7280">MESSAGES:</text>
        <circle cx={96} cy={-2} r={6} fill="#22c55e" />
        <text x={105} y={2} fontSize="8" fill="#374151">Local (L1↔L2)</text>
        <circle cx={186} cy={-2} r={6} fill="#3b82f6" />
        <text x={195} y={2} fontSize="8" fill="#374151">Remote (Dir)</text>
        <circle cx={276} cy={-2} r={6} fill="#06b6d4" />
        <text x={285} y={2} fontSize="8" fill="#374151">Chip↔Chip</text>
      </g>
    </svg>
  );
};
