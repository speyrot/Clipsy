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

  // Handle file selection
  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setError('');
    setSuccessMessage('');
  };

  // Handle form submit and file upload
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
  
      console.log('Upload successful:', response.data);
      setSuccessMessage('Video uploaded successfully!');
      setSelectedFile(null);  // Clear selected file after upload
      setIsUploading(false);
  
      // Pass the entire response object (which includes video_id and job_id)
      if (onUploadComplete) {
        onUploadComplete(response.data);  // Pass the whole data object
      }
    } catch (error) {
      console.error('Error during upload:', error);
      setError('An error occurred during the upload. Please try again.');
      setIsUploading(false);
    }
  };  

  return (
    <div>
      <h2>Upload Video</h2>
      <form onSubmit={handleUpload}>
        <input type="file" onChange={handleFileChange} accept="video/*" />
        <button type="submit" disabled={isUploading}>
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      {/* Error handling */}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Success message */}
      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}

      {/* Show progress bar if upload is ongoing */}
      {isUploading && <ProgressIndicator progress={uploadProgress} />}
    </div>
  );
};

export default UploadComponent;