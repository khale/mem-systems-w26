import React, { useMemo } from 'react';
import { SimulationState } from '../simulation/engine';
import { ProtocolType, Message as MessageType } from '../protocols/types';
import { Node, calculateNodePositions } from './Node';
import { Memory } from './Memory';
import { Directory } from './Directory';
import { Bus } from './Bus';
import { Message, MessagePath } from './Message';
import { useAnimation, getMessagePosition } from '../hooks/useAnimation';
import { PiranhaVisualization } from './PiranhaVisualization';

interface VisualizationProps {
  state: SimulationState;
  protocol: ProtocolType;
  nodeCount: number;
  isPlaying: boolean;
  speed: number;
}

const WIDTH = 700;
const HEIGHT = 600;
const CENTER_X = WIDTH / 2;
const CENTER_Y = 200;  // Move nodes up
const NODE_RADIUS = 140;
const BUS_Y = 380;  // Bus below the nodes
const MEMORY_Y = 480;  // Memory at the bottom

export const Visualization: React.FC<VisualizationProps> = ({
  state,
  protocol,
  nodeCount,
  isPlaying,
  speed,
}) => {
  // Use dedicated Piranha visualization for that protocol
  if (protocol === 'Piranha') {
    return (
      <div className="visualization">
        <PiranhaVisualization state={state} isPlaying={isPlaying} speed={speed} />
      </div>
    );
  }

  const isDirectoryBased = false; // Only MSI/MESI use this path now

  // Calculate node positions
  const nodePositions = useMemo(
    () => calculateNodePositions(nodeCount, CENTER_X, CENTER_Y, NODE_RADIUS),
    [nodeCount]
  );

  // Position map for animation
  const positionMap = useMemo(() => {
    const map = new Map<number | string, { x: number; y: number }>();
    nodePositions.forEach((pos, idx) => {
      map.set(idx, pos);
    });
    map.set('memory', { x: CENTER_X, y: MEMORY_Y });
    map.set('directory', { x: CENTER_X, y: 60 });
    map.set('bus', { x: CENTER_X, y: BUS_Y });
    return map;
  }, [nodePositions]);

  // Animate messages
  const animatedMessages = useAnimation(state.messages, isPlaying, speed);

  // Bus position
  const busX1 = CENTER_X - NODE_RADIUS - 80;
  const busX2 = CENTER_X + NODE_RADIUS + 80;

  return (
    <div className="visualization">
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Connection lines from nodes to bus */}
        {!isDirectoryBased && nodePositions.map((pos, idx) => (
          <line
            key={`conn-${idx}`}
            x1={pos.x}
            y1={pos.y + 50}
            x2={pos.x}
            y2={BUS_Y}
            className="node-connection"
          />
        ))}

        {/* Bus or Directory paths */}
        {isDirectoryBased ? (
          // Directory-based: draw paths to directory
          <>
            {nodePositions.map((pos, idx) => (
              <MessagePath
                key={`path-${idx}`}
                x1={pos.x}
                y1={pos.y - 50}
                x2={CENTER_X}
                y2={90}
              />
            ))}
            <Directory
              directory={state.directory}
              x={CENTER_X}
              y={60}
            />
          </>
        ) : (
          // Bus-based: draw bus and memory
          <>
            <Bus
              x1={busX1}
              y={BUS_Y}
              x2={busX2}
              isActive={state.messages.length > 0}
            />
            {/* Connection from bus to memory */}
            <line
              x1={CENTER_X}
              y1={BUS_Y}
              x2={CENTER_X}
              y2={MEMORY_Y - 45}
              className="node-connection"
            />
            <Memory memory={state.memory} x={CENTER_X} y={MEMORY_Y} />
          </>
        )}

        {/* Nodes */}
        {state.nodes.map((node, idx) => (
          <Node
            key={node.id}
            node={node}
            x={nodePositions[idx].x}
            y={nodePositions[idx].y}
            isActive={
              state.operationQueue[state.currentOperationIndex]?.nodeId === node.id
            }
          />
        ))}

        {/* Memory for directory protocol */}
        {isDirectoryBased && (
          <Memory memory={state.memory} x={CENTER_X} y={HEIGHT - 50} />
        )}

        {/* Animated messages */}
        {animatedMessages.map((msg) => {
          const pos = getMessagePosition(
            msg,
            positionMap,
            isDirectoryBased ? undefined : BUS_Y
          );
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
      </svg>

      {/* Legend */}
      <div className="legend">
        <h4>States</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#ef4444' }} />
            <span>Modified</span>
          </div>
          {protocol === 'MESI' && (
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#3b82f6' }} />
              <span>Exclusive</span>
            </div>
          )}
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#22c55e' }} />
            <span>Shared</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#6b7280' }} />
            <span>Invalid</span>
          </div>
        </div>
      </div>
    </div>
  );
};
