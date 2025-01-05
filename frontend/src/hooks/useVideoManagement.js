import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { extractBaseName, extractExtensionFromFilename } from '../constants';

export const useVideoManagement = () => {
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
    };
    setUploadedVideos(prev => [...prev, newVideo]);
  }, []);

  // Handle processing completion
  const handleProcessingComplete = useCallback((videoId, processedPath) => {
    const processedVideo = uploadedVideos.find(v => v.id === videoId);
    
    if (processedVideo && !processedVideos.some(v => v.id === videoId)) {
      const newProcessedVideo = {
        ...processedVideo,
        processedUrl: processedPath,
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
  const handleProcessVideo = async (video) => {
    try {
      const response = await axios.post("http://127.0.0.1:8000/process_video_simple", {
        video_id: video.id,
      });
      
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
      const token = localStorage.getItem('access_token');
      const resp = await fetch(`http://127.0.0.1:8000/videos/${video.id}?part=${part}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resp.ok) throw new Error(await resp.text());

      const result = await resp.json();
      toast.success(result.message);
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
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/videos/${video.id}/download?part=${part}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(await res.text());

      const { download_url } = await res.json();

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
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://127.0.0.1:8000/videos/${renameTargetVideo.id}/rename`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newName })
      });

      if (!response.ok) throw new Error('Rename failed');

      await response.json();
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

  const fetchUserVideos = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/videos/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        console.error("Failed to fetch user's videos");
        return;
      }
      
      const data = await res.json();
      const newUploads = [];
      const newProcessed = [];

      data.forEach((item) => {
        const fallbackFilename =
          item.filename ||
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