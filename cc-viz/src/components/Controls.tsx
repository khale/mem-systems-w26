import React from 'react';

interface ControlsProps {
  isPlaying: boolean;
  isComplete: boolean;
  speed: number;
  canStepBack: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onStepBack: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
}

export const Controls: React.FC<ControlsProps> = ({
  isPlaying,
  isComplete,
  speed,
  canStepBack,
  onPlay,
  onPause,
  onStep,
  onStepBack,
  onReset,
  onSpeedChange,
}) => {
  return (
    <div className="controls">
      <div className="controls-buttons">
        <button
          className="control-btn"
          onClick={onStepBack}
          disabled={!canStepBack}
          title="Step Back"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        {isPlaying ? (
          <button
            className="control-btn control-btn-primary"
            onClick={onPause}
            title="Pause"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          </button>
        ) : (
          <button
            className="control-btn control-btn-primary"
            onClick={onPlay}
            disabled={isComplete}
            title="Play"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}

        <button
          className="control-btn"
          onClick={onStep}
          disabled={isComplete}
          title="Step Forward"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>

        <button
          className="control-btn"
          onClick={onReset}
          title="Reset"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
          </svg>
        </button>
      </div>

      <div className="speed-control">
        <label>Speed: {speed.toFixed(1)}x</label>
        <input
          type="range"
          min="0.25"
          max="4"
          step="0.25"
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
        />
      </div>

      {isComplete && (
        <div className="status-complete">
          Simulation Complete
        </div>
      )}
    </div>
  );
};
