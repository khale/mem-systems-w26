import { useState, useCallback, useRef, useEffect } from 'react';
import {
  SimulationState,
  SimulationConfig,
  createInitialState,
  loadWorkload,
  stepSimulation,
  cloneState,
} from '../simulation/engine';
import { ProtocolType, CPUOperation } from '../protocols/types';
import { Workload, adjustWorkloadForNodeCount } from '../simulation/workloads';

export interface UseSimulationReturn {
  state: SimulationState;
  config: SimulationConfig;
  isPlaying: boolean;
  speed: number;
  history: SimulationState[];
  historyIndex: number;

  // Controls
  play: () => void;
  pause: () => void;
  step: () => void;
  stepBack: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;

  // Configuration
  setNodeCount: (count: number) => void;
  setProtocol: (protocol: ProtocolType) => void;
  loadWorkloadOps: (workload: Workload) => void;
  addOperation: (operation: CPUOperation) => void;

  // Current workload info
  currentWorkload: Workload | null;
}

const DEFAULT_CONFIG: SimulationConfig = {
  nodeCount: 4,
  protocol: 'MSI',
  memorySize: 8,
};

export function useSimulation(): UseSimulationReturn {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [state, setState] = useState<SimulationState>(() => createInitialState(DEFAULT_CONFIG));
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState(1);
  const [history, setHistory] = useState<SimulationState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentWorkload, setCurrentWorkload] = useState<Workload | null>(null);

  const playIntervalRef = useRef<number | null>(null);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, []);

  // Handle play/pause
  useEffect(() => {
    if (isPlaying && !state.isComplete) {
      const interval = Math.max(100, 1000 / speed);
      playIntervalRef.current = window.setInterval(() => {
        setState(prev => {
          if (prev.isComplete) {
            setIsPlaying(false);
            return prev;
          }
          const newState = stepSimulation(prev, config.protocol);
          setHistory(h => [...h.slice(0, historyIndex + 1), cloneState(prev)]);
          setHistoryIndex(i => i + 1);
          return newState;
        });
      }, interval);

      return () => {
        if (playIntervalRef.current) {
          clearInterval(playIntervalRef.current);
          playIntervalRef.current = null;
        }
      };
    }
  }, [isPlaying, speed, config.protocol, state.isComplete, historyIndex]);

  const play = useCallback(() => {
    if (!state.isComplete) {
      setIsPlaying(true);
    }
  }, [state.isComplete]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const step = useCallback(() => {
    if (!state.isComplete) {
      setHistory(h => [...h.slice(0, historyIndex + 1), cloneState(state)]);
      setHistoryIndex(i => i + 1);
      setState(prev => stepSimulation(prev, config.protocol));
    }
  }, [state, config.protocol, historyIndex]);

  const stepBack = useCallback(() => {
    if (historyIndex >= 0 && history[historyIndex]) {
      setState(cloneState(history[historyIndex]));
      setHistoryIndex(i => i - 1);
    }
  }, [history, historyIndex]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    const newState = createInitialState(config);
    if (currentWorkload) {
      const adjusted = adjustWorkloadForNodeCount(currentWorkload, config.nodeCount);
      setState(loadWorkload(newState, adjusted.operations));
    } else {
      setState(newState);
    }
    setHistory([]);
    setHistoryIndex(-1);
  }, [config, currentWorkload]);

  const setSpeed = useCallback((newSpeed: number) => {
    setSpeedState(Math.max(0.25, Math.min(4, newSpeed)));
  }, []);

  const setNodeCount = useCallback((count: number) => {
    const newCount = Math.max(2, Math.min(8, count));
    setConfig(prev => ({ ...prev, nodeCount: newCount }));
    setIsPlaying(false);

    const newState = createInitialState({ ...config, nodeCount: newCount });
    if (currentWorkload) {
      const adjusted = adjustWorkloadForNodeCount(currentWorkload, newCount);
      setState(loadWorkload(newState, adjusted.operations));
    } else {
      setState(newState);
    }
    setHistory([]);
    setHistoryIndex(-1);
  }, [config, currentWorkload]);

  const setProtocol = useCallback((protocol: ProtocolType) => {
    // For Piranha, configure chips (2 chips, 2 cores each = 4 total cores)
    const newConfig: SimulationConfig = {
      ...config,
      protocol,
      chipCount: protocol === 'Piranha' ? 2 : undefined,
      coresPerChip: protocol === 'Piranha' ? 2 : undefined,
      nodeCount: protocol === 'Piranha' ? 4 : config.nodeCount,
    };
    setConfig(newConfig);
    setIsPlaying(false);

    const newState = createInitialState(newConfig);
    if (currentWorkload) {
      const adjusted = adjustWorkloadForNodeCount(currentWorkload, newConfig.nodeCount);
      setState(loadWorkload(newState, adjusted.operations));
    } else {
      setState(newState);
    }
    setHistory([]);
    setHistoryIndex(-1);
  }, [config, currentWorkload]);

  const loadWorkloadOps = useCallback((workload: Workload) => {
    setIsPlaying(false);
    setCurrentWorkload(workload);
    const adjusted = adjustWorkloadForNodeCount(workload, config.nodeCount);
    const newState = createInitialState(config);
    setState(loadWorkload(newState, adjusted.operations));
    setHistory([]);
    setHistoryIndex(-1);
  }, [config]);

  const addOperation = useCallback((operation: CPUOperation) => {
    setState(prev => ({
      ...prev,
      operationQueue: [...prev.operationQueue, operation],
      isComplete: false,
    }));
  }, []);

  return {
    state,
    config,
    isPlaying,
    speed,
    history,
    historyIndex,
    play,
    pause,
    step,
    stepBack,
    reset,
    setSpeed,
    setNodeCount,
    setProtocol,
    loadWorkloadOps,
    addOperation,
    currentWorkload,
  };
}
