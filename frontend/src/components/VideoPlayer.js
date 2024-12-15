import React, { useRef } from 'react';

const VideoPlayer = ({ videoUrl }) => {
  const videoRef = useRef(null);

  const handlePlay = () => {
    videoRef.current.play();
  };

  const handlePause = () => {
    videoRef.current.pause();
  };

  return (
    <div>
      <h2>Video Player</h2>
      <p>Loading video: {videoUrl}</p>
      <video ref={videoRef} width="600" controls>
        <source src={`http://127.0.0.1:8000/processed_video/${videoUrl}`} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div>
        <button onClick={handlePlay}>Play</button>
        <button onClick={handlePause}>Pause</button>
      </div>
    </div>
  );
};

export default VideoPlayer; 