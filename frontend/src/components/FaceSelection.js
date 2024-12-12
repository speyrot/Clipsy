// frontend/src/components/FaceSelection.js

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const FaceSelection = ({ videoId, jobId, onSpeakersLoaded, onSpeakerSelection }) => {
  console.log("FaceSelection Component Mounted");
  console.log("Received jobId:", jobId);
  
  const [loading, setLoading] = useState(true);
  const [jobStatus, setJobStatus] = useState('pending'); // Track the job status
  const [progress, setProgress] = useState(0); // Track processing progress
  const pollingInterval = useRef(null); // Track the interval ID

  useEffect(() => {
    const checkStatus = async () => {
      console.log("Polling job status for jobId:", jobId);
      try {
        const statusResponse = await axios.get(
          `http://127.0.0.1:8000/status/${jobId}?_=${new Date().getTime()}`
        );
        
        console.log("Status Response:", statusResponse.data);

        const { status: job_status, progress, processed_video_path } = statusResponse.data;
        
        console.log(`Job Status: ${job_status}, Progress: ${progress}`);

        setJobStatus(job_status || 'pending');
        setProgress(progress || 0);

        if (job_status === 'completed') {
          console.log("Job Completed. Fetching speakers...");
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;

          // Fetch speakers
          const speakerResponse = await axios.get(`http://127.0.0.1:8000/detect_speakers/${videoId}`);
          console.log("Speakers Data Response:", speakerResponse.data);

          if (speakerResponse.data && speakerResponse.data.speakers) {
            onSpeakersLoaded(speakerResponse.data.speakers);
          } else {
            console.warn("No speakers found in the response.");
          }

          setLoading(false);
        } else if (job_status === 'failed') {
          console.error("Job failed.");
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
          setLoading(false);
        }
      } catch (error) {
        console.error("Error polling status:", error);
      }
    };

    // Start polling every 3 seconds
    pollingInterval.current = setInterval(checkStatus, 3000);

    // Initial check immediately
    checkStatus();

    return () => {
      if (pollingInterval.current) {
        console.log("Clearing polling interval on unmount.");
        clearInterval(pollingInterval.current);
      }
    };
  }, [jobId, videoId, onSpeakersLoaded]);

  if (loading) {
    return (
      <div>
        <p>Loading... Please wait while the video is processed.</p>
        {jobStatus !== 'completed' && (
          <p>
            Job Type: SPEAKER DETECTION, Status: {jobStatus}, Progress:{" "}
            {progress ? progress.toFixed(2) : "0.00"}%
          </p>
        )}
      </div>
    );
  }

  return null; // FaceSelection no longer renders UI, just handles polling and calls onSpeakersLoaded
};

export default FaceSelection;
