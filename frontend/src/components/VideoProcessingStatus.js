// frontend/src/components/VideoProcessingStatus.js

import React, { useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const VideoProcessingStatus = ({ jobId, videoId, onProcessingComplete }) => {
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 30;

    const checkVideoStatus = async () => {
      try {
        // Log the attempt
        console.log(`Checking video status for video ID: ${videoId}`);
        const response = await axios.get(`http://127.0.0.1:8000/video/${videoId}`);
        console.log('Video status response:', response.data);
        
        if (response.data.processed_video_path) {
          onProcessingComplete(response.data.processed_video_path);
          return true;
        }
      } catch (error) {
        console.error('Error checking video status:', error);
      }
      return false;
    };

    const checkStatus = async () => {
      try {
        // Log the attempt
        console.log(`Checking job status for job ID: ${jobId}`);
        const response = await axios.get(`http://127.0.0.1:8000/status/${jobId}`);
        console.log('Job status response:', response.data);
        
        if (response.data.status === 'completed' && response.data.processed_video_path) {
          // Dismiss any existing processing toast
          const loadingToastId = localStorage.getItem(`processing_toast_${jobId}`);
          if (loadingToastId) {
            toast.dismiss(loadingToastId);
            localStorage.removeItem(`processing_toast_${jobId}`);
          }
          
          onProcessingComplete(response.data.processed_video_path);
          return true;
        }
      } catch (error) {
        console.error('Error checking job status:', error);
        
        // If job status check fails, try video status
        const isComplete = await checkVideoStatus();
        if (isComplete) return true;
        
        retryCount++;
        if (retryCount >= MAX_RETRIES) {
          console.error('Max retries reached for status check');
          // Show error toast
          toast.error('Failed to check processing status', {
            duration: 4000,
            position: 'bottom-right',
          });
          return true; // Stop polling after max retries
        }
      }
      return false;
    };

    const intervalId = setInterval(async () => {
      if (!isMounted) return;
      
      const isComplete = await checkStatus();
      if (isComplete) {
        clearInterval(intervalId);
      }
    }, 2000);

    // Start checking immediately instead of waiting for first interval
    checkStatus();

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [jobId, videoId, onProcessingComplete]);

  return null;
};

export default VideoProcessingStatus; 