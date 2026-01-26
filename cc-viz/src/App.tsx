import React from 'react';
import { useSimulation } from './hooks/useSimulation';
import { Visualization } from './components/Visualization';
import { Controls } from './components/Controls';
import { ConfigPanel } from './components/ConfigPanel';
import { WorkloadPanel } from './components/WorkloadPanel';
import { EventLog } from './components/EventLog';
import './styles/main.css';

function App() {
  const {
    state,
    config,
    isPlaying,
    speed,
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
    currentWorkload,
  } = useSimulation();

  return (
    <div className="app">
      <header className="app-header">
        <h1>Cache Coherence Protocol Visualization</h1>
        <p>Interactive visualization of MSI, MESI, and Directory-based cache coherence protocols</p>
      </header>

      <main className="app-main">
        <div className="sidebar sidebar-left">
          <ConfigPanel
            nodeCount={config.nodeCount}
            protocol={config.protocol}
            onNodeCountChange={setNodeCount}
            onProtocolChange={setProtocol}
          />
          <WorkloadPanel
            currentWorkload={currentWorkload}
            operations={state.operationQueue}
            currentIndex={state.currentOperationIndex}
            onSelectWorkload={loadWorkloadOps}
            protocol={config.protocol}
          />
        </div>

        <div className="main-content">
          <Visualization
            state={state}
            protocol={config.protocol}
            nodeCount={config.nodeCount}
            isPlaying={isPlaying}
            speed={speed}
          />
          <Controls
            isPlaying={isPlaying}
            isComplete={state.isComplete}
            speed={speed}
            canStepBack={historyIndex >= 0}
            onPlay={play}
            onPause={pause}
            onStep={step}
            onStepBack={stepBack}
            onReset={reset}
            onSpeedChange={setSpeed}
          />
        </div>

        <div className="sidebar sidebar-right">
          <EventLog events={state.eventLog} />
        </div>
      </main>

      <footer className="app-footer">
        <p>
          Educational visualization for memory systems courses.
          Learn how cache coherence protocols maintain memory consistency in multiprocessor systems.
        </p>
      </footer>
    </div>
  );
}

export default App;
