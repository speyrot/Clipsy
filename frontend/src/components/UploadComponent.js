// frontend/src/components/UploadComponent.js

import React, { useState } from 'react';
import axios from 'axios';
import ProgressIndicator from './ProgressIndicator';

const UploadComponent = ({ onUploadComplete }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setError('');
    setSuccessMessage('');
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setError('Please select a file before uploading.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setIsUploading(true);
      setError('');
      setSuccessMessage('');
      setUploadProgress(0);

      const response = await axios.post('http://127.0.0.1:8000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });

      setSuccessMessage('Video uploaded successfully!');
      setSelectedFile(null);
      setIsUploading(false);

      if (onUploadComplete) {
        onUploadComplete(response.data);
      }
    } catch (error) {
      console.error('Error during upload:', error);
      setError('An error occurred during the upload. Please try again.');
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleUpload} className="w-full space-y-4">
          <div>
            <label className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 flex flex-col justify-center items-center transition-colors">
              {selectedFile ? (
                <p className="text-gray-700 text-sm font-medium truncate p-2">
                  {selectedFile.name}
                </p>
              ) : (
                <div className="flex flex-col items-center text-gray-500 text-sm">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 mb-2 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                    <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
                  </svg>
                  <span className="text-sm font-medium">
                    Click or Drag a Video File Here
                  </span>
                </div>
              )}
              <input
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept="video/*"
              />
            </label>
          </div>

          {/* Upload Button */}
          <button
            type="submit"
            disabled={isUploading || !selectedFile}
            className={`w-full py-2 text-white rounded-md text-sm font-semibold transition-colors ${
              isUploading || !selectedFile
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>

        {/* Error/Success Messages */}
        {error && (
          <div className="mt-4 p-2 bg-red-50 text-red-700 text-sm rounded-md">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mt-4 p-2 bg-green-50 text-green-700 text-sm rounded-md">
            {successMessage}
          </div>
        )}

        {/* Progress Bar */}
        {isUploading && (
          <div className="mt-4">
            <ProgressIndicator progress={uploadProgress} label="Uploading your video..." />
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadComponent;
