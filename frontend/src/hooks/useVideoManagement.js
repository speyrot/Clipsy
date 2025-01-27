// frontend/src/hooks/useVideoManagement.js

import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import axiosInstance from '../utils/axios'; // Import the configured axios instance
import { supabase } from '../utils/supabaseClient';
import { useNavigate } from 'react-router-dom';

export const useVideoManagement = () => {
  const navigate = useNavigate();
  const [uploadedVideos, setUploadedVideos] = useState([]);
  const [processedVideos, setProcessedVideos] = useState([]);
  const [processingJobs, setProcessingJobs] = useState(new Map());
  
  // For renaming videos
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameTargetVideo, setRenameTargetVideo] = useState(null);
  const [newName, setNewName] = useState('');
  const [fileExtension, setFileExtension] = useState('.mp4');

  // Handle upload completion
  const handleUploadComplete = useCallback((uploadedData) => {
    const newVideo = {
      id: uploadedData.video_id,
      s3Url: uploadedData.s3_url,
      filename: uploadedData.filename,
      thumbnail: uploadedData.thumbnail_url || '/placeholder-thumbnail.jpg',
      uploaded_at: new Date().toISOString()  // Add timestamp for sorting
    };
    
    // Prepend the new video to the beginning of the array
    setUploadedVideos(prev => [newVideo, ...prev]);
  }, []);

  // Handle processing completion
  const handleProcessingComplete = useCallback((videoId, processedPath) => {
    const processedVideo = uploadedVideos.find(v => v.id === videoId);
    
    if (processedVideo && !processedVideos.some(v => v.id === videoId)) {
      const newProcessedVideo = {
        ...processedVideo,
        processed_path: processedPath,
        filename: `Processed_${processedVideo.filename}`
      };
      
      setProcessedVideos(prev => [...prev, newProcessedVideo]);
      toast.success('Video processing completed!');
      
      setProcessingJobs(prev => {
        const newJobs = new Map(prev);
        newJobs.delete(videoId);
        return newJobs;
      });
    }
  }, [uploadedVideos, processedVideos]);

  // Handle video processing
  const handleProcessVideo = async (video, config) => {
    try {
      const response = await axiosInstance.post(
        "/process_video_simple",
        {
          video_id: video.id,
          auto_captions: config.autoCaptions ?? false,
        }
      );
      
      const toastId = toast.loading('Processing video...', { duration: Infinity });
      localStorage.setItem(`processing_toast_${response.data.job_id}`, toastId);
      
      setProcessingJobs(prev => {
        const newJobs = new Map(prev);
        newJobs.set(video.id, response.data.job_id);
        return newJobs;
      });
      
    } catch (error) {
      console.error("Error processing video:", error);
      toast.error("Failed to process video");
    }
  };

  // Handle video deletion
  const handleDeleteVideo = async (video, type) => {
    try {
      let part = determineDeletePart(video, type, uploadedVideos, processedVideos);
      const resp = await axiosInstance.delete(`/videos/${video.id}`, {
        params: { part },
      });

      toast.success(resp.data.message);
      updateVideoLists(video.id, part);

    } catch (err) {
      console.error('Error deleting video:', err);
      toast.error('Error deleting video');
    }
  };

  // Handle video download
  const handleDownloadVideo = async (video, type) => {
    try {
      const part = type === 'upload' ? 'upload' : 'processed';
      const res = await axiosInstance.get(`/videos/${video.id}/download`, {
        params: { part },
      });

      const { download_url } = res.data;

      // Create an invisible anchor element to trigger the download
      const link = document.createElement('a');
      link.href = download_url;
      // The filename will be handled by the Content-Disposition header from the presigned URL
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error('Error downloading video:', err);
      toast.error('Error downloading video');
    }
  };

  // Handle video rename
  const handleRenameSubmit = async () => {
    if (!renameTargetVideo) return;

    try {
      const response = await axiosInstance.patch(`/videos/${renameTargetVideo.id}/rename`, {
        name: newName
      });

      updateVideoNames(renameTargetVideo.id, newName);
      closeRenameModal();

    } catch (err) {
      console.error("Error renaming video:", err);
      toast.error("Failed to rename video");
    }
  };

  // Helper functions
  const determineDeletePart = (video, type, uploadedVideos, processedVideos) => {
    if (type === 'upload') {
      return processedVideos.some(p => p.id === video.id) ? 'upload' : 'both';
    }
    return uploadedVideos.some(u => u.id === video.id) ? 'processed' : 'both';
  };

  const updateVideoLists = (videoId, part) => {
    if (part === 'upload' || part === 'both') {
      setUploadedVideos(prev => prev.filter(vid => vid.id !== videoId));
    }
    if (part === 'processed' || part === 'both') {
      setProcessedVideos(prev => prev.filter(vid => vid.id !== videoId));
    }
  };

  const updateVideoNames = (videoId, newName) => {
    setUploadedVideos(prev =>
      prev.map(v => v.id === videoId ? { ...v, name: newName } : v)
    );
    setProcessedVideos(prev =>
      prev.map(v => v.id === videoId ? { ...v, name: newName } : v)
    );
  };

  const closeRenameModal = () => {
    setRenameModalOpen(false);
    setRenameTargetVideo(null);
    setNewName('');
    setFileExtension('.mp4');
  };

  const handleAuthError = useCallback(() => {
    localStorage.removeItem('backend_token');
    navigate('/signin');
  }, [navigate]);

  const fetchUserVideos = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/videos/');
      
      const data = response.data;
      const newUploads = [];
      const newProcessed = [];

      data.forEach((item) => {
        const fallbackFilename =
          item.name ||
          item.upload_path?.split('/').pop() ||
          `Video_${item.id}`;

        const baseVid = {
          id: item.id,
          upload_path: item.upload_path,
          processed_path: item.processed_path,
          status: item.status,
          name: item.name,
          filename: fallbackFilename,
          thumbnail: item.thumbnail_url || '/placeholder-thumbnail.jpg',
        };

        if (item.upload_path) {
          newUploads.push({ ...baseVid });
        }
        if (item.processed_path) {
          newProcessed.push({ ...baseVid });
        }
      });

      setUploadedVideos(newUploads);
      setProcessedVideos(newProcessed);
    } catch (err) {
      console.error('Error fetching user videos:', err);
      toast.error('Failed to load videos. Please try again.');
    }
  }, []);

  return {
    // State
    uploadedVideos,
    processedVideos,
    processingJobs,
    renameModalOpen,
    renameTargetVideo,
    newName,
    fileExtension,
    
    // Actions
    handleUploadComplete,
    handleProcessingComplete,
    handleProcessVideo,
    handleDeleteVideo,
    handleDownloadVideo,
    handleRenameSubmit,
    setRenameModalOpen,
    setRenameTargetVideo,
    setNewName,
    setFileExtension,
    closeRenameModal,
    fetchUserVideos,
  };
}; 
