// frontend/src/App.js

import React, { useState } from 'react';
import UploadComponent from './components/UploadComponent';
import FaceSelection from './components/FaceSelection';
import VideoPlayer from './components/VideoPlayer';
import axios from 'axios';
import VideoProcessingStatus from './components/VideoProcessingStatus';

function App() {
  const [videoId, setVideoId] = useState(null);
  const [speakerJobId, setSpeakerJobId] = useState(null);
  const [speakersLoaded, setSpeakersLoaded] = useState(false); // New state to track speaker detection
  const [speakers, setSpeakers] = useState([]);
  const [selectedSpeakers, setSelectedSpeakers] = useState([]);
  const [processedVideoPath, setProcessedVideoPath] = useState(null);
  const [processingJobId, setProcessingJobId] = useState(null);

  // Handle completion of the upload process
  const handleUploadComplete = (uploadedData) => {
    console.log("Upload Complete:", uploadedData);
    setVideoId(uploadedData.video_id);
    setSpeakerJobId(uploadedData.job_id);
  };

  const handleProcessingComplete = (path) => {
    console.log("Processing complete, setting video path:", path);
    setProcessedVideoPath(path);
  };

  // Handle when speakers are loaded after speaker detection
  const handleSpeakersLoaded = (loadedSpeakers) => {
    console.log("Speakers Loaded:", loadedSpeakers);
    setSpeakers(loadedSpeakers);
    setSpeakersLoaded(true);
  };

  // Handle when the user selects speakers
  const handleSpeakerSelection = async (selectedSpeakerIds) => {
    console.log("Selected Speakers:", selectedSpeakerIds);
    setSelectedSpeakers(selectedSpeakerIds);

    if (selectedSpeakerIds.length === 0) {
      // If no speakers are selected, it means the video processing is complete
      setProcessedVideoPath(`${videoId}_processed`);
      return;
    }

    // Proceed to video processing (to be implemented)
    // For demonstration, we'll just log the selection
    // You can implement additional functionality here as needed

    // Example: Trigger 'video_processing' job
    try {
      const response = await axios.post('http://127.0.0.1:8000/process_video', {
        video_id: videoId,
        selected_speakers: selectedSpeakerIds
      });
      const { job_id } = response.data;
      setProcessingJobId(job_id);
      console.log("Video Processing Job Triggered:", job_id);
    } catch (error) {
      console.error("Error starting video processing:", error);
      // Optionally, display an error message to the user
    }
  };

  return (
    <div className="App">
      {/* Render UploadComponent if no video is uploaded yet */}
      {!videoId && (
        <UploadComponent onUploadComplete={handleUploadComplete} />
      )}
      
      {/* Render FaceSelection if video is uploaded but speakers are not yet loaded */}
      {videoId && speakerJobId && !speakersLoaded && (
        <FaceSelection
          videoId={videoId}
          jobId={speakerJobId}
          onSpeakersLoaded={handleSpeakersLoaded}
          onSpeakerSelection={handleSpeakerSelection}
          processedVideoPath={processedVideoPath}
        />
      )}
      
      {/* Render Speaker Selection UI once speakers are loaded */}
      {videoId && speakersLoaded && !processedVideoPath && (
        <div>
          <h2>Select Faces to Track</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {speakers.map((speaker) => (
              <div
                key={speaker.id}
                onClick={() => {
                  const isSelected = selectedSpeakers.includes(speaker.id);
                  if (isSelected) {
                    setSelectedSpeakers(selectedSpeakers.filter(id => id !== speaker.id));
                    console.log(`Deselecting Speaker ID: ${speaker.id}`);
                  } else {
                    setSelectedSpeakers([...selectedSpeakers, speaker.id]);
                    console.log(`Selecting Speaker ID: ${speaker.id}`);
                  }
                }}
                style={{
                  border: selectedSpeakers.includes(speaker.id) ? '2px solid green' : '2px solid gray',
                  margin: '5px',
                  cursor: 'pointer'
                }}
              >
                <img
                  src={`http://127.0.0.1:8000/thumbnails/${speaker.thumbnail_path}`}
                  alt={`Speaker ${speaker.id}`}
                  style={{ width: '100px', height: '100px' }}
                  onError={(e) => {
                    console.error(`Error loading thumbnail for Speaker ID: ${speaker.id}`);
                    e.target.src = 'path/to/default/thumbnail.png'; // Fallback image
                  }}
                />
              </div>
            ))}
          </div>
          <button onClick={() => handleSpeakerSelection(selectedSpeakers)} disabled={selectedSpeakers.length === 0}>
            Confirm Selection
          </button>
        </div>
      )}
      
      {/* Add VideoProcessingStatus component */}
      {processingJobId && !processedVideoPath && (
        <VideoProcessingStatus
          jobId={processingJobId}
          videoId={videoId}
          onProcessingComplete={handleProcessingComplete}
        />
      )}
      
      {/* Render VideoPlayer once video processing is complete */}
      {processedVideoPath && (
        <VideoPlayer videoUrl={processedVideoPath} />
      )}
    </div>
  );
}

export default App;
