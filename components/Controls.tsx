import React, { useEffect, useState } from "react";
import { formatTime } from "../utils/audioUtils";
interface ControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  volume: number;
  onVolumeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}
const Controls: React.FC<ControlsProps> = ({
  isPlaying,
  onPlayPause,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
}) => {
  const [localTime, setLocalTime] = useState(currentTime);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    if (!dragging) setLocalTime(currentTime);
  }, [currentTime, dragging]);
  return (
    <div className="transport-controls">
      <div className="seek-row">
        <output>{formatTime(localTime)}</output>
        <input
          aria-label="Позиція відтворення"
          aria-valuetext={`${formatTime(localTime)} з ${formatTime(duration)}`}
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={localTime}
          style={
            {
              "--range-progress": `${(localTime / (duration || 1)) * 100}%`,
            } as React.CSSProperties
          }
          onChange={(event) => {
            setDragging(true);
            setLocalTime(Number(event.target.value));
          }}
          onMouseUp={() => {
            setDragging(false);
            onSeek(localTime);
          }}
          onTouchEnd={() => {
            setDragging(false);
            onSeek(localTime);
          }}
        />
      </div>
      <div className="transport-row">
        <button
          aria-label={isPlaying ? "Пауза" : "Відтворити"}
          className="play-button"
          onClick={onPlayPause}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 5h3v14H7zm7 0h3v14h-3z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="m8 5 11 7-11 7z" />
            </svg>
          )}
        </button>
        <label className="volume">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              d="M4 10v4h4l5 4V6l-5 4zm12 0a4 4 0 0 1 0 4m2-7a8 8 0 0 1 0 10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <input
            aria-label="Гучність"
            aria-valuetext={`${Math.round(volume * 100)}%`}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            style={
              { "--range-progress": `${volume * 100}%` } as React.CSSProperties
            }
            onChange={onVolumeChange}
          />
        </label>
      </div>
    </div>
  );
};
export default Controls;
