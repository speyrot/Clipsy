// frontend/src/components/VideoPlayer.js

import React, { useRef, useState, useEffect } from 'react';

const formatTime = (timeInSeconds) => {
  if (isNaN(timeInSeconds)) return "00:00";
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const paddedSeconds = seconds < 10 ? `0${seconds}` : seconds;
  return `${minutes}:${paddedSeconds}`;
};

const VideoPlayer = ({ videoUrl }) => {
  const videoRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);

  const progressBarRef = useRef(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  
  useEffect(() => {
    const video = videoRef.current;

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

    if (video) {
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('ended', handleEnded);
    }

    return () => {
      if (video) {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('ended', handleEnded);
      }
    };
  }, [isScrubbing]);

  const handlePlayPause = () => {
    const video = videoRef.current;
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
    video.currentTime = 0;
    video.play();
    setIsPlaying(true);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
  };

  const seekToTime = (time) => {
    const video = videoRef.current;
    video.currentTime = Math.min(time, duration);
    setCurrentTime(video.currentTime);
  };

  const getRatioFromEvent = (e) => {
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left; 
    let ratio = x / rect.width;
    ratio = Math.min(Math.max(ratio, 0), 1);
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
      setCurrentTime(newTime); // Update currentTime while scrubbing for immediate feedback
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
  }, [isScrubbing, duration]);

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="max-w-[320px] w-full mx-auto overflow-hidden rounded shadow-[0_0_15px_1px_rgba(255,0,255,0.6)] bg-black">
      <div className="relative">
        {/* 9:16 aspect ratio container */}
        <div className="relative w-full" style={{ paddingTop: '177.78%' }}>
          <video
            ref={videoRef}
            className="absolute top-0 left-0 w-full h-full object-contain bg-black"
            preload="metadata"
          >
            <source src={`http://127.0.0.1:8000/processed_video/${videoUrl}`} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Controls Overlay (fixed at bottom) */}
        <div className="absolute bottom-0 w-full bg-gradient-to-t from-black to-transparent text-white p-3 space-y-3">
          {/* Timeline */}
          <div 
            className="group relative h-2 bg-gray-500 rounded hover:bg-gray-400 cursor-pointer"
            ref={progressBarRef}
            onMouseDown={handleProgressBarMouseDown}
          >
            <div 
              className="absolute top-0 left-0 h-2 bg-red-600 rounded" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
            {/* Thumb/Handle */}
            {!isNaN(progressPercentage) && (
              <div 
                className={`absolute top-0 h-2 w-2 bg-white rounded-full transform -translate-x-1/2 ${isScrubbing ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity duration-200'}`}
                style={{ left: `${progressPercentage}%` }}
              ></div>
            )}
          </div>

          {/* Time and Controls Row */}
          <div className="flex items-center justify-between">
            {/* Current Time / Duration */}
            <div className="text-sm flex items-center space-x-2">
              <span>{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>

            <div className="flex items-center space-x-4">
              {/* Play/Pause Button */}
              <button
                onClick={handlePlayPause}
                className="focus:outline-none"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <svg className="w-6 h-6 text-white hover:text-gray-200" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6"/>
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white hover:text-gray-200" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                  </svg>
                )}
              </button>

              {/* Restart Button */}
              <button
                onClick={handleRestart}
                className="focus:outline-none"
                title="Restart"
              >
                <svg className="w-6 h-6 text-white hover:text-gray-200" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
              </button>

              {/* Volume Control */}
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5l-6 6h-3v2h3l6 6V5zm8.5 6A4.5 4.5 0 0015 6.5v11a4.5 4.5 0 004.5-4.5z"/>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;