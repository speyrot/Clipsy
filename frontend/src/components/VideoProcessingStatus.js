// frontend/src/components/VideoProcessingStatus.js

import React, { useEffect, useRef } from 'react';
import axios from 'axios';

const VideoProcessingStatus = ({ jobId, videoId, onProcessingComplete }) => {
  const pollingInterval = useRef(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await axios.get(
          `http://127.0.0.1:8000/status/${jobId}?_=${new Date().getTime()}`
        );
        
        console.log("Video Processing Status:", response.data);
        
        const { status, processed_video_path } = response.data;
        
        if (status === 'completed' && processed_video_path) {
          console.log("Video processing completed, path:", processed_video_path);
          clearInterval(pollingInterval.current);
          const filename = processed_video_path.split('/').pop();
          onProcessingComplete(filename);
        }
      } catch (error) {
        console.error("Error checking video processing status:", error);
      }
    };

    pollingInterval.current = setInterval(checkStatus, 3000);
    checkStatus(); // Initial check

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [jobId, videoId, onProcessingComplete]);

  return null;
};

export default VideoProcessingStatus; 