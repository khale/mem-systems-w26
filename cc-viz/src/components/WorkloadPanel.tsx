import React from 'react';
import { Workload, allWorkloads } from '../simulation/workloads';
import { CPUOperation, ProtocolType } from '../protocols/types';

interface WorkloadPanelProps {
  currentWorkload: Workload | null;
  operations: CPUOperation[];
  currentIndex: number;
  onSelectWorkload: (workload: Workload) => void;
  protocol: ProtocolType;
}

export const WorkloadPanel: React.FC<WorkloadPanelProps> = ({
  currentWorkload,
  operations,
  currentIndex,
  onSelectWorkload,
  protocol,
}) => {
  // Separate Piranha-specific workloads from general ones
  const piranhaWorkloads = allWorkloads.filter(w => w.name.startsWith('Piranha:'));
  const generalWorkloads = allWorkloads.filter(w => !w.name.startsWith('Piranha:'));

  // Order workloads based on protocol
  const orderedWorkloads = protocol === 'Piranha'
    ? [...piranhaWorkloads, ...generalWorkloads]
    : [...generalWorkloads, ...piranhaWorkloads];

  return (
    <div className="workload-panel">
      <h3>Workload</h3>

      <div className="workload-select">
        <select
          value={currentWorkload?.name || ''}
          onChange={(e) => {
            const workload = allWorkloads.find((w) => w.name === e.target.value);
            if (workload) {
              onSelectWorkload(workload);
            }
          }}
        >
          <option value="" disabled>
            Select a workload...
          </option>
          {protocol === 'Piranha' && piranhaWorkloads.length > 0 && (
            <optgroup label="Piranha-Specific">
              {piranhaWorkloads.map((w) => (
                <option key={w.name} value={w.name}>
                  {w.name.replace('Piranha: ', '')}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label={protocol === 'Piranha' ? 'General Workloads' : 'Workloads'}>
            {generalWorkloads.map((w) => (
              <option key={w.name} value={w.name}>
                {w.name}
              </option>
            ))}
          </optgroup>
          {protocol !== 'Piranha' && piranhaWorkloads.length > 0 && (
            <optgroup label="Piranha-Specific (for Piranha protocol)">
              {piranhaWorkloads.map((w) => (
                <option key={w.name} value={w.name}>
                  {w.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {currentWorkload && (
        <div className="workload-description">{currentWorkload.description}</div>
      )}

      <div className="operation-list">
        <h4>Operations</h4>
        {operations.length === 0 ? (
          <div className="operation-empty">No operations loaded</div>
        ) : (
          <ul>
            {operations.map((op, idx) => (
              <li
                key={idx}
                className={`operation-item ${
                  idx < currentIndex
                    ? 'operation-done'
                    : idx === currentIndex
                    ? 'operation-current'
                    : ''
                }`}
              >
                <span className="operation-index">{idx + 1}.</span>
                <span className="operation-node">P{op.nodeId}</span>
                <span
                  className={`operation-type ${
                    op.type === 'Write' ? 'operation-write' : 'operation-read'
                  }`}
                >
                  {op.type}
                </span>
                <span className="operation-addr">@{op.address}</span>
                {op.data !== undefined && (
                  <span className="operation-data">= {op.data}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
