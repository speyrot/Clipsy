// frontend/src/components/VideoPlayer.js

import React, { useRef, useState, useEffect } from 'react';
import { Switch } from '@headlessui/react';

const formatTime = (timeInSeconds) => {
  if (isNaN(timeInSeconds)) return "00:00";
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const paddedSeconds = seconds < 10 ? `0${seconds}` : seconds;
  return `${minutes}:${paddedSeconds}`;
};

const VideoPlayer = ({ videoUrl }) => {
  // --------------------------------------------------------
  // 1. Local State
  // --------------------------------------------------------
  const videoRef = useRef(null);
  const progressBarRef = useRef(null);

  // Is the user scrubbing the timeline?
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  // Some UI toggles
  const [resolution, setResolution] = useState('480p');
  const [autoCaptions, setAutoCaptions] = useState(false);

  // --------------------------------------------------------
  // 3. Event Handlers for Video
  // --------------------------------------------------------
  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      if (!isScrubbing) {
        setCurrentTime(video.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [isScrubbing]);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleRestart = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    video.play();
    setIsPlaying(true);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    setVolume(newVolume);
  };

  // --------------------------------------------------------
  // 4. Timeline Scrubbing
  // --------------------------------------------------------
  const seekToTime = (time) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(time, duration);
    setCurrentTime(videoRef.current.currentTime);
  };

  const getRatioFromEvent = (e) => {
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let ratio = x / rect.width;
    ratio = Math.max(0, Math.min(ratio, 1));
    return ratio;
  };

  const handleProgressBarMouseDown = (e) => {
    setIsScrubbing(true);
    const ratio = getRatioFromEvent(e);
    seekToTime(ratio * duration);
  };

  const handleDocumentMouseMove = (e) => {
    if (isScrubbing) {
      const ratio = getRatioFromEvent(e);
      const newTime = ratio * duration;
      setCurrentTime(newTime);
    }
  };

  const handleDocumentMouseUp = (e) => {
    if (isScrubbing) {
      setIsScrubbing(false);
      const ratio = getRatioFromEvent(e);
      seekToTime(ratio * duration);
    }
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [handleDocumentMouseMove, handleDocumentMouseUp]);

  // --------------------------------------------------------
  // 5. Derived values
  // --------------------------------------------------------
  const progressPercentage = duration ? (currentTime / duration) * 100 : 0;

  const handleResolutionChange = (e) => {
    setResolution(e.target.value);
  };

  // --------------------------------------------------------
  // RENDER
  // --------------------------------------------------------
  return (
    <div className="mx-auto max-w-xs w-full bg-white rounded-lg shadow-md overflow-hidden">
      {/* Video Container */}
      <div className="relative bg-black">
        {/* Maintain 9:16 aspect ratio */}
        <div className="relative w-full" style={{ paddingTop: '177.78%' }}>
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-contain bg-black"
            preload="metadata"
            src={videoUrl || undefined}
          >
            {/* Fallback message */}
            Sorry, your browser does not support embedded videos.
          </video>
        </div>

        {/* Controls Overlay */}
        <div className="absolute bottom-0 w-full bg-gradient-to-t from-black to-transparent text-white p-3 space-y-3">
          {/* Timeline */}
          <div
            className="group relative h-2 bg-white/20 rounded cursor-pointer"
            ref={progressBarRef}
            onMouseDown={handleProgressBarMouseDown}
          >
            <div
              className="absolute top-0 left-0 h-2 bg-purple-500 rounded transition-width duration-150"
              style={{ width: `${progressPercentage}%` }}
            />
            {!isNaN(progressPercentage) && (
              <div
                className={`absolute top-0 h-2 w-2 bg-white rounded-full transform -translate-x-1/2 ${
                  isScrubbing
                    ? ''
                    : 'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
                }`}
                style={{ left: `${progressPercentage}%` }}
              />
            )}
          </div>

          {/* Time + Controls Row */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1">
              <span>{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>

            <div className="flex items-center space-x-4">
              {/* Play/Pause */}
              <button
                onClick={handlePlayPause}
                className="focus:outline-none hover:text-gray-300"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 9v6m4-6v6"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M14.752 11.168l-3.197-2.132A1
                        1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1
                        1 0 000-1.664z"
                    />
                  </svg>
                )}
              </button>

              {/* Restart */}
              <button
                onClick={handleRestart}
                className="focus:outline-none hover:text-gray-300"
                title="Restart"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 12l2-2m0 0l7-7 7 7M5
                      10v10a1 1 0 001 1h3m10-11l2
                      2m-2-2v10a1 1 0 01-1 1h-3m-6
                      0a1 1 0 001-1v-4a1 1 0
                      011-1h2a1 1 0 011
                      1v4a1 1 0 001 1m-6
                      0h6"
                  />
                </svg>
              </button>

              {/* Volume */}
              <div className="flex items-center space-x-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M11 5l-6 6H2v2h3l6
                      6V5zm8.5 6A4.5 4.5 0 0015
                      6.5v11a4.5 4.5 0 004.5-4.5z"
                  />
                </svg>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-16 appearance-none bg-transparent focus:outline-none"
                  title="Volume"
                />
              </div>

              {/* Resolution Dropdown */}
              <select
                value={resolution}
                onChange={handleResolutionChange}
                className="border rounded px-2 py-1 text-sm focus:outline-none w-24"
              >
                <option value="480p">480p</option>
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
              </select>

              {/* Auto-Captions Toggle */}
              <div className="flex items-center space-x-2">
                <Switch
                  checked={autoCaptions}
                  onChange={setAutoCaptions}
                  className={`${
                    autoCaptions ? 'bg-purple-600' : 'bg-gray-200'
                  } relative inline-flex h-5 w-9 items-center rounded-full transition-colors`}
                >
                  <span className="sr-only">Enable auto-captions</span>
                  <span
                    className={`${
                      autoCaptions ? 'translate-x-5' : 'translate-x-1'
                    } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
                  />
                </Switch>
                <span className="text-sm text-white">Auto-captions</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;