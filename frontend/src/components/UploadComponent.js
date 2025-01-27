// frontend/src/components/UploadComponent.js

import React, { useState, useId } from 'react';
import axiosInstance from '../utils/axios';
import { toast } from 'react-hot-toast';
import { supabase } from '../utils/supabaseClient';

const UploadComponent = ({ onUploadComplete, inputId }) => {
  const [isUploading, setIsUploading] = useState(false);

  // If no inputId is passed (card view), generate a unique ID.
  const generatedId = useId(); 
  const actualId = inputId || generatedId;

  // Handle file selection & upload
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check for both tokens
    const backendToken = localStorage.getItem('backend_token');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!backendToken || !session) {
      toast.error('Please log in to upload videos', {
        style: {
          border: '2px solid #DC2626',
        },
      });
      window.location.href = '/login';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const loadingToast = toast.loading('Uploading video...', {
      style: {
        border: '2px solid #6B7280',
      },
      duration: Infinity,
    });

    try {
      setIsUploading(true);
      const response = await axiosInstance.post(
        '/upload_only',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${backendToken}`
          },
        }
      );

      if (onUploadComplete) {
        const uploadData = {
          video_id: response.data.video_id,
          s3_url: response.data.s3_url,
          filename: response.data.s3_filename || file.name,
          thumbnail_url: response.data.thumbnail_url,
        };
        onUploadComplete(uploadData);
      }

      toast.success('Video uploaded successfully!', { 
        id: loadingToast,
        style: {
          border: '2px solid #9333EA',
        },
      });

      setIsUploading(false);
    } catch (error) {
      console.error('Error during upload:', error.response || error);
      
      toast.error(error.response?.data?.detail || 'An error occurred during the upload', { 
        id: loadingToast,
        style: {
          border: '2px solid #DC2626',
        },
      });
      
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again', {
          style: {
            border: '2px solid #DC2626',
          },
        });
        // Get a fresh token before redirecting
        try {
          const response = await fetch('http://localhost:8000/auth/signin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              access_token: session.access_token
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            localStorage.setItem('backend_token', data.token);
            // Retry the upload instead of redirecting
            handleFileChange(event);
            return;
          }
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError);
        }
        window.location.href = '/login';
      }
      
      setIsUploading(false);
    }
  };

  return (
    <>
      {/* Always have a hidden input that triggers the actual file selection */}
      <input
        id={actualId}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept="video/*"
        disabled={isUploading}
      />

      {/* 
        In card view (no inputId), we show the tile. 
        Clicking the tile calls document.getElementById(actualId).click().
      */}
      {!inputId && (
        <div
          className="flex-shrink-0 w-64 h-[190px] rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors cursor-pointer"
          onClick={() => {
            const inputElem = document.getElementById(actualId);
            if (inputElem) inputElem.click();
          }}
        >
          <div className="w-full h-full bg-gray-100 hover:bg-gray-200 flex flex-col justify-center items-center">
            <div className="flex flex-col items-center text-gray-500 text-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 mb-2 text-gray-400"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
                <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z" />
              </svg>
              <span className="text-sm font-medium">
                Click or Drag a Video File Here
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UploadComponent;
