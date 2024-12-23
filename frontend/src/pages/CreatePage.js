// frontend/src/pages/ProcessPage.js
import React, { useState } from 'react';
import UploadComponent from '../components/UploadComponent';
import VideoPlayer from '../components/VideoPlayer';
import VideoProcessingStatus from '../components/VideoProcessingStatus';
import ProcessingIndicator from '../components/ProcessingIndicator';

function ProcessPage() {
  const [videoId, setVideoId] = useState(null);
  const [processedVideoPath, setProcessedVideoPath] = useState(null);
  const [processingJobId, setProcessingJobId] = useState(null);

  const handleUploadComplete = (uploadedData) => {
    console.log('Upload Complete:', uploadedData);
    setVideoId(uploadedData.video_id);
    setProcessingJobId(uploadedData.job_id);
  };

  const handleProcessingComplete = (path) => {
    console.log('Processing complete:', path);
    setProcessedVideoPath(path);
  };

  return (
    <div className="px-8 py-6">
      {/* Heading */}
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Create</h1>

      {/* Upload Section */}
      {!videoId && (
        <div className="bg-gray-100 border border-gray-200 rounded-2xl shadow-xl p-12 space-y-8">
          <h2 className="text-2xl font-bold text-gray-800 text-center">
            Upload and Process Your Video
          </h2>
          <p className="text-gray-600 text-center text-md max-w-lg mx-auto">
            Upload a video file to get started. We will process it for you and
            return a playable version.
          </p>
          <UploadComponent onUploadComplete={handleUploadComplete} />
        </div>
      )}

      {/* Processing Status Section */}
      {processingJobId && !processedVideoPath && (
        <div className="bg-white rounded-2xl shadow-xl p-12 mt-8 flex flex-col items-center space-y-6">
          <ProcessingIndicator />
          <VideoProcessingStatus
            jobId={processingJobId}
            videoId={videoId}
            onProcessingComplete={handleProcessingComplete}
          />
        </div>
      )}

      {/* Video Player and Form Section */}
      {processedVideoPath && (
        <div className="bg-white rounded-2xl shadow-xl p-12 mt-8">
          <div className="flex flex-col lg:flex-row gap-12">
            {/* Left Column - Form */}
            <div className="w-full lg:w-1/2 space-y-6">
              {/* Row 1: Video Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video Name:
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter video name"
                />
              </div>

              {/* Row 2: Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description:
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter video description"
                />
              </div>

              {/* Row 3: Resolution and Auto Captions */}
              <div className="flex flex-col sm:flex-row sm:space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resolution
                  </label>
                  <select className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                    <option>1080p</option>
                    <option>720p</option>
                    <option>480p</option>
                  </select>
                </div>
                <div className="flex items-center mt-4 sm:mt-0">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Auto Captions
                  </span>
                </div>
              </div>

              {/* Row 4: Add a Cover */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add a Cover
                </label>
                <div className="flex items-center">
                  <input
                    type="file"
                    accept="image/*"
                    className="file-input w-full px-4 py-3 border border-gray-300 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Row 5: Share to Socials */}
              <div>
                <button className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg shadow-lg hover:bg-purple-700 transition duration-200 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 12h.01M12 12h.01M16 12h.01M20 12a8 8 0 11-16 0 8 8 0 0116 0z"
                    />
                  </svg>
                  Share to Socials
                </button>
              </div>

              {/* Row 6: Try Again and Save */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="flex-1 bg-gray-200 text-gray-800 px-4 py-3 rounded-lg shadow-lg hover:bg-gray-300 transition duration-200">
                  Try Again
                </button>
                <button className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg hover:bg-green-700 transition duration-200">
                  Save
                </button>
              </div>
            </div>

            {/* Right Column - Video Player */}
            <div className="w-full lg:w-1/2 flex justify-center">
              <VideoPlayer videoUrl={processedVideoPath} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProcessPage;