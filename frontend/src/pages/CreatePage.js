// frontend/src/pages/CreatePage.js
import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { EllipsisVerticalIcon, CheckCircleIcon, XMarkIcon, EyeIcon } from '@heroicons/react/24/solid';
import { Toaster, toast } from 'react-hot-toast';
import UploadComponent from '../components/UploadComponent';
import VideoProcessingStatus from '../components/VideoProcessingStatus';
import ProcessingIndicator from '../components/ProcessingIndicator';
import VideoPreviewModal from '../components/VideoPreviewModal';

function CreatePage() {
  // -------------------------------------------------
  // 1. Local State
  // -------------------------------------------------
  const [selectedVideos, setSelectedVideos] = useState(new Set());
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videoConfigs, setVideoConfigs] = useState({});
  const [activeDropdown, setActiveDropdown] = useState(null);
  const MAX_SELECTIONS = 3;

  // Two lists: "uploaded" and "processed"
  const [uploadedVideos, setUploadedVideos] = useState([]);
  const [processedVideos, setProcessedVideos] = useState([]);
  
  // For tracking processing tasks
  const [videoId, setVideoId] = useState(null);
  const [processingJobId, setProcessingJobId] = useState(null);
  const [processedVideoPath, setProcessedVideoPath] = useState(null);
  const [processingJobs, setProcessingJobs] = useState(new Map()); // Track multiple jobs
  const [previewVideo, setPreviewVideo] = useState(null);

  // -------------------------------------------------
  // 2. Fetch user videos
  // -------------------------------------------------
  useEffect(() => {
    async function fetchUserVideos() {
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
          // Fallback filename logic
          const fallbackFilename =
            item.filename ||
            item.upload_path?.split('/').pop() ||
            `Video_${item.id}`;

          // Always build a base object
          const baseVid = {
            id: item.id,
            upload_path: item.upload_path,
            processed_path: item.processed_path,
            status: item.status,
            filename: fallbackFilename,
            thumbnail: item.thumbnail_url || '/placeholder-thumbnail.jpg',
          };

          // If it has an upload_path, show in "Uploads"
          if (item.upload_path) {
            newUploads.push({ ...baseVid });
          }
          // If it has a processed_path, also show in "Post Production"
          if (item.processed_path) {
            newProcessed.push({ ...baseVid });
          }
        });

        setUploadedVideos(newUploads);
        setProcessedVideos(newProcessed);
      } catch (err) {
        console.error('Error fetching user videos:', err);
      }
    }

    fetchUserVideos();
  }, []);

  // -------------------------------------------------
  // 3. Handle Upload Completion
  // -------------------------------------------------
  const handleUploadComplete = (uploadedData) => {
    const newVideo = {
      id: uploadedData.video_id,
      s3Url: uploadedData.s3_url,
      filename: uploadedData.filename,
      thumbnail: '/placeholder-thumbnail.jpg',
    };
    setUploadedVideos(prev => [...prev, newVideo]);
  };

  // -------------------------------------------------
  // 4. Processing Completion
  // -------------------------------------------------
  const handleProcessingComplete = useCallback((videoId, processedPath) => {
    // Find the video that was being processed
    const processedVideo = uploadedVideos.find(v => v.id === videoId);
    
    if (processedVideo) {
      // Check if this video is already in processedVideos
      const alreadyProcessed = processedVideos.some(v => v.id === videoId);
      
      if (!alreadyProcessed) {
        const newProcessedVideo = {
          ...processedVideo,
          processedUrl: processedPath,
          filename: `Processed_${processedVideo.filename}`
        };
        
        setProcessedVideos(prev => [...prev, newProcessedVideo]);
        
        // Show success toast
        toast.success('Video processing completed!', {
          duration: 4000,
          position: 'bottom-right',
        });
        
        // Remove the job from processing jobs
        setProcessingJobs(prev => {
          const newJobs = new Map(prev);
          newJobs.delete(videoId);
          return newJobs;
        });
      }
    }
  }, [uploadedVideos, processedVideos]);

  // -------------------------------------------------
  // 5. Initiate Processing
  // -------------------------------------------------
  const handleProcessVideo = async (video) => {
    try {
      const response = await axios.post("http://127.0.0.1:8000/process_video_simple", {
        video_id: video.id,
      });
      
      setVideoId(video.id);
      setProcessingJobId(response.data.job_id);
      setProcessedVideoPath(null);
      
      // Add processing toast and store its ID
      const toastId = toast.loading('Processing video...', {
        duration: Infinity, // Toast will remain until dismissed
        position: 'bottom-right',
      });
      
      // Store the toast ID in localStorage to be able to dismiss it later
      localStorage.setItem(`processing_toast_${response.data.job_id}`, toastId);
      
      // Add the job to processing jobs
      setProcessingJobs(prev => {
        const newJobs = new Map(prev);
        newJobs.set(video.id, response.data.job_id);
        return newJobs;
      });
      
      // Clear the selected videos immediately after processing starts
      setSelectedVideos(new Set());
      setShowConfigModal(false);
      
    } catch (error) {
      console.error("Error processing video:", error);
      toast.error("Failed to process video");
    }
  };

  // -------------------------------------------------
  // 6. Deletion Handling [ADDED]
  // -------------------------------------------------
  const handleDeleteVideo = async (video, type) => {
    try {
      let part = 'upload'; // default
      if (type === 'upload') {
        // If it also appears in processedVideos => just remove the upload portion
        const isProcessed = processedVideos.some((p) => p.id === video.id);
        if (!isProcessed) {
          // Means there's no processed version => remove entire entry
          part = 'both';
        }
      } else if (type === 'processed') {
        // If it also appears in uploadedVideos => just remove the processed portion
        const isUploaded = uploadedVideos.some((u) => u.id === video.id);
        if (!isUploaded) {
          // Means there's no upload => remove entire entry
          part = 'both';
        } else {
          part = 'processed';
        }
      }

      const token = localStorage.getItem('access_token');
      const url = `http://127.0.0.1:8000/videos/${video.id}?part=${part}`;
      const resp = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!resp.ok) {
        const text = await resp.text();
        console.error('Delete request failed', resp.status, text);
        toast.error('Failed to delete video');
        return;
      }

      const result = await resp.json();
      console.log('Delete success:', result);
      toast.success(result.message);

      // Now update local state
      if (part === 'upload') {
        // Remove from uploadedVideos
        setUploadedVideos((prev) => prev.filter((vid) => vid.id !== video.id));
        // The DB entry still exists => the processed part remains
      } else if (part === 'processed') {
        // Remove from processedVideos
        setProcessedVideos((prev) => prev.filter((vid) => vid.id !== video.id));
      } else {
        // 'both' => remove from both arrays
        setUploadedVideos((prev) => prev.filter((vid) => vid.id !== video.id));
        setProcessedVideos((prev) => prev.filter((vid) => vid.id !== video.id));
      }
    } catch (err) {
      console.error('Error deleting video:', err);
      toast.error('Error deleting video');
    }
  };

  // -------------------------------------------------
  // 7. UI Handlers for Selection, Dropdown, etc.
  // -------------------------------------------------
  const toggleVideoSelection = (videoId) => {
    setSelectedVideos(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(videoId)) {
        newSelection.delete(videoId);
      } else if (newSelection.size < MAX_SELECTIONS) {
        newSelection.add(videoId);
      } else if (!newSelection.has(videoId)) {
        toast.error('You can only select up to 3 videos at once', {
          duration: 2000,
          position: 'bottom-center',
          style: {
            background: '#F9FAFB',
            color: '#1F2937',
            border: '1px solid #E5E7EB',
            padding: '16px',
            borderRadius: '8px',
          },
          id: 'max-selection',
        });
      }
      return newSelection;
    });
  };

  const handleDropdownClick = (e, id) => {
    e.stopPropagation();
    setActiveDropdown(activeDropdown === id ? null : id);
  };

  const handleActionClick = (e, action, video, type) => {
    e.stopPropagation();
    setActiveDropdown(null);

    switch (action) {
      case 'rename':
        console.log('Rename:', video.filename);
        break;
      case 'delete':
        handleDeleteVideo(video, type); 
        break;
      case 'download':
        console.log('Download:', video.filename);
        break;
      default:
        break;
    }
  };

  // -------------------------------------------------
  // 8. Video Card
  // -------------------------------------------------
  const VideoCard = ({ video, type, onVideoClick }) => {
    const isSelected = type === 'upload' ? selectedVideos.has(video.id) : false;
    const isUpload = type === 'upload';
    const atMaxSelections = selectedVideos.size >= MAX_SELECTIONS;

    return (
      <div
        onClick={() => isUpload && toggleVideoSelection(video.id)}
        className={`
          flex-shrink-0 w-64 rounded-lg border border-gray-200 overflow-hidden
          transition-all duration-200 relative group
          ${isUpload ? 'cursor-pointer hover:bg-black/5' : ''}
          ${isSelected ? 'border-purple-500 bg-black/5' : 'hover:border-gray-300'}
          ${isUpload && atMaxSelections && !isSelected ? 'cursor-not-allowed opacity-50' : ''}
        `}
      >
        {/* Checkmark - Only for upload section */}
        {isUpload && (
          <div className="absolute top-2 right-2 z-10 transition-all duration-200">
            {isSelected ? (
              <CheckCircleIcon className="w-6 h-6 text-purple-500" />
            ) : (
              <div
                className={`
                  w-5 h-5 rounded-full border-2 border-gray-400/70
                  opacity-0 group-hover:opacity-100 bg-white/50
                  ${atMaxSelections ? 'hidden' : ''}
                `}
              />
            )}
          </div>
        )}

        <div className="aspect-video bg-gray-100">
          <img
            src={video.thumbnail}
            alt="Video thumbnail"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="px-3 py-2 flex items-center justify-between">
          <p className="text-sm text-gray-600 truncate flex-1" title={video.filename}>
            {video.filename}
          </p>
          <div className="relative flex items-center">
            {/* Eye Icon for Preview */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleVideoPreview(video, type);
              }}
              className="p-1 hover:bg-gray-100 rounded mr-1"
            >
              <EyeIcon className="w-5 h-5 text-gray-600 hover:text-purple-600" />
            </button>

            {/* Ellipsis Menu Button */}
            <button
              onClick={(e) => handleDropdownClick(e, `${type}-${video.id}`)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <EllipsisVerticalIcon className="w-5 h-5 text-gray-600" />
            </button>

            {/* Dropdown Menu */}
            {activeDropdown === `${type}-${video.id}` && (
              <div className="absolute right-0 bottom-full mb-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                <button
                  onClick={(e) => handleActionClick(e, 'rename', video, type)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Rename
                </button>
                <button
                  onClick={(e) => handleActionClick(e, 'download', video, type)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Download
                </button>
                <button
                  onClick={(e) => handleActionClick(e, 'delete', video, type)}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Dummy caption styles for the demo
  const captionStyles = [
    { id: 1, name: 'Modern Clean', thumbnail: '/caption-style1.jpg' },
    { id: 2, name: 'Gaming Bold', thumbnail: '/caption-style2.jpg' },
    { id: 3, name: 'Minimal', thumbnail: '/caption-style3.jpg' },
    { id: 4, name: 'Subtitles', thumbnail: '/caption-style4.jpg' },
  ];

  const resolutionOptions = [
    { value: '1080p', label: '1080p Full HD' },
    { value: '720p', label: '720p HD' },
    { value: '480p', label: '480p SD' },
  ];

  // -------------------------------------------------
  // 9. Config Modal
  // -------------------------------------------------
  const handleConfigSave = async (videoId, config) => {
    setVideoConfigs(prev => ({
      ...prev,
      [videoId]: config
    }));

    // If this is the last video, process all selected videos
    if (currentVideoIndex === selectedVideos.size - 1) {
      setShowConfigModal(false);
      
      // Get array of selected video IDs
      const selectedVideoIds = Array.from(selectedVideos);
      
      // Process each selected video
      for (const videoId of selectedVideoIds) {
        const video = uploadedVideos.find(v => v.id === videoId);
        if (video) {
          await handleProcessVideo(video);
        }
      }
      
      // Clear selections after all videos are processed
      setSelectedVideos(new Set());
      setCurrentVideoIndex(0);
    } else {
      // Move to next video
      setCurrentVideoIndex(prev => prev + 1);
    }
  };

  const ConfigurationModal = ({ onClose, onSave, selectedVideos, currentVideoIndex, videoConfigs }) => {
    const selectedVideoIds = Array.from(selectedVideos);
    const currentVideo = uploadedVideos.find(v => v.id === selectedVideoIds[currentVideoIndex]);
    
    // Initialize config with current video's data
    const [config, setConfig] = useState({
      filename: currentVideo?.filename || '',
      resolution: '1080p',
      autoCaptions: false,
      captionStyle: null
    });

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-xl font-semibold">
              Configure Video {currentVideoIndex + 1} of {selectedVideos.size}
            </h3>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 space-y-6">
            {/* Filename */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Output Filename
              </label>
              <input
                type="text"
                value={config.filename}
                onChange={e => setConfig(prev => ({ ...prev, filename: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                disabled
              />
            </div>

            {/* Resolution */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution
              </label>
              <select
                value={config.resolution}
                onChange={e => setConfig(prev => ({ ...prev, resolution: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {resolutionOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto Captions with Toggle Switch */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-gray-700">
                  Auto Captions
                </label>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, autoCaptions: !prev.autoCaptions }))}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none"
                  style={{ backgroundColor: config.autoCaptions ? '#9333EA' : '#E5E7EB' }}
                >
                  <span
                    className={`
                      inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 shadow-sm
                      ${config.autoCaptions ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>

              {/* Caption Styles Carousel */}
              {config.autoCaptions && (
                <div className="overflow-x-auto">
                  <div className="flex space-x-4 p-2">
                    {captionStyles.map(style => (
                      <div
                        key={style.id}
                        onClick={() => setConfig(prev => ({ ...prev, captionStyle: style.id }))}
                        className={`
                          flex-shrink-0 w-32 rounded-lg border-2 overflow-hidden cursor-pointer
                          ${config.captionStyle === style.id 
                            ? 'border-purple-500' 
                            : 'border-gray-200'}
                        `}
                      >
                        <div className="aspect-video bg-gray-100">
                          {/* Placeholder for caption style preview */}
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            Style {style.id}
                          </div>
                        </div>
                        <div className="p-2 text-center text-sm">
                          {style.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <button
              onClick={() => setCurrentVideoIndex(prev => Math.max(0, prev - 1))}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              disabled={currentVideoIndex === 0}
            >
              Previous
            </button>
            <button
              onClick={() => onSave(currentVideo.id, config)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              {currentVideoIndex === selectedVideos.size - 1 
                ? `Process ${selectedVideos.size} Clips`
                : 'Next'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------------------------
  // 10. Video Preview
  // -------------------------------------------------
  const handleVideoPreview = (video, type) => {
    setPreviewVideo({ video, type });
  };

  return (
    <>
      <div className="px-8 py-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Video Hub</h1>

        {/* Uploads Section */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">Uploads</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {selectedVideos.size}/{MAX_SELECTIONS} selected
              </span>
              <button 
                onClick={() => {
                  if (selectedVideos.size > 0) {
                    setCurrentVideoIndex(0);
                    setShowConfigModal(true);
                  }
                }}
                className={`
                  px-4 py-2 rounded-lg transition-all duration-200
                  ${selectedVideos.size > 0 
                    ? 'bg-purple-600 text-white hover:bg-purple-700 cursor-pointer' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                `}
                disabled={selectedVideos.size === 0}
              >
                Process {selectedVideos.size > 0 && `(${selectedVideos.size})`}
              </button>
            </div>
          </div>
          
          <div className="relative">
            <div className="overflow-x-auto flex space-x-4 p-4">
              <UploadComponent onUploadComplete={handleUploadComplete} />
              
              {/* Uploaded Video Tiles with click handler */}
              {uploadedVideos.map(video => (
                <VideoCard 
                  key={video.id} 
                  video={video} 
                  type="upload"
                  onVideoClick={() => handleVideoPreview(video)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Post Production Videos Section */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">Post Production</h2>
            <div className="flex space-x-2">
              <select className="border rounded-lg px-3 py-2 text-sm text-gray-600">
                <option>All Videos</option>
                <option>Recent</option>
                <option>Processing</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-x-auto flex space-x-4 p-4">
              {processedVideos.length === 0 ? (
                <div className="flex-shrink-0 w-full rounded-lg border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No processed videos yet</p>
                </div>
              ) : (
                processedVideos.map(video => (
                  <VideoCard 
                    key={video.id} 
                    video={video} 
                    type="processed"
                    onVideoClick={() => handleVideoPreview(video)}
                  />
                ))
              )}
            </div>
          </div>
        </section>
      </div>
      
      {showConfigModal && (
        <ConfigurationModal 
          onClose={() => {
            setShowConfigModal(false);
            setSelectedVideos(new Set()); // Clear selections when modal is closed
            setCurrentVideoIndex(0);
          }}
          onSave={handleConfigSave}
          selectedVideos={Array.from(selectedVideos)}
          currentVideoIndex={currentVideoIndex}
          videoConfigs={videoConfigs}
        />
      )}
      
      {/* Render processing status components for active jobs */}
      {Array.from(processingJobs.entries()).map(([vid_id, job_id]) => (
        <VideoProcessingStatus
          key={`${job_id}-${vid_id}`}
          jobId={job_id}
          videoId={vid_id}
          onProcessingComplete={(processedPath) => handleProcessingComplete(vid_id, processedPath)}
        />
      ))}
      
      {/* Video Preview Modal */}
      {previewVideo && (
        <VideoPreviewModal
          video={previewVideo.video}
          type={previewVideo.type}
          onClose={() => setPreviewVideo(null)}
        />
      )}
      
      <Toaster />
    </>
  );
}

export default CreatePage;