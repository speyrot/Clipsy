// frontend/src/components/UploadComponent.js

import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const UploadComponent = ({ onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const loadingToast = toast.loading('Uploading video...', {
      position: 'bottom-right',
    });

    try {
      setIsUploading(true);

      const response = await axios.post('http://127.0.0.1:8000/upload_only', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (onUploadComplete) {
        onUploadComplete({
          video_id: response.data.video_id,
          s3_url: response.data.s3_url,
          filename: response.data.s3_filename || file.name
        });
      }

      toast.dismiss(loadingToast);
      
      toast.success('Video uploaded successfully!', {
        duration: 4000,
        position: 'bottom-right',
      });
      
      setIsUploading(false);
    } catch (error) {
      console.error('Error during upload:', error);
      
      toast.dismiss(loadingToast);
      
      toast.error('An error occurred during the upload', {
        duration: 4000,
        position: 'bottom-right',
      });
      
      setIsUploading(false);
    }
  };

  return (
    <div className="flex-shrink-0 w-64 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
      <label className="w-full aspect-video cursor-pointer bg-gray-50 hover:bg-gray-100 flex flex-col justify-center items-center transition-colors">
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
        <input
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="video/*"
          disabled={isUploading}
        />
      </label>
    </div>
  );
};

export default UploadComponent;
