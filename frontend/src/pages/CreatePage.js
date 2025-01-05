// frontend/src/pages/CreatePage.js
import React, { useState, useCallback, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { MAX_SELECTIONS } from '../constants';
import { useVideoManagement } from '../hooks/useVideoManagement';

// Components
import UploadComponent from '../components/UploadComponent';
import VideoProcessingStatus from '../components/VideoProcessingStatus';
import VideoPreviewModal from '../components/VideoPreviewModal';
import VideoCard from '../components/VideoCard/VideoCard';
import ConfigurationModal from '../components/ConfigurationModal/ConfigurationModal';
import RenameModal from '../components/RenameModal/RenameModal';

function CreatePage() {
  // State management via custom hook
  const {
    uploadedVideos,
    processedVideos,
    processingJobs,
    renameModalOpen,
    renameTargetVideo,
    newName,
    fileExtension,
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
  } = useVideoManagement();

  // Add useEffect to fetch videos on mount
  useEffect(() => {
    fetchUserVideos();
  }, [fetchUserVideos]);

  // Local state
  const [selectedVideos, setSelectedVideos] = useState(new Set());
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videoConfigs, setVideoConfigs] = useState({});
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [previewVideo, setPreviewVideo] = useState(null);

  // UI Handlers
  const handleSelect = useCallback((videoId) => {
    setSelectedVideos(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(videoId)) {
        newSelection.delete(videoId);
      } else if (newSelection.size < MAX_SELECTIONS) {
        newSelection.add(videoId);
      }
      return newSelection;
    });
  }, []);

  const handleDropdownClick = useCallback((e, id) => {
    e.stopPropagation();
    setActiveDropdown(activeDropdown === id ? null : id);
  }, [activeDropdown]);

  const handleActionClick = useCallback((e, action, video, type) => {
    e.stopPropagation();
    setActiveDropdown(null);
  
    switch (action) {
      case 'rename':
        setRenameTargetVideo(video);
        setNewName(video.name || video.filename);
        setRenameModalOpen(true);
        break;
      case 'delete':
        handleDeleteVideo(video, type);
        break;
      case 'download':
        handleDownloadVideo(video, type);
        break;
      default:
        break;
    }
  }, [handleDeleteVideo, handleDownloadVideo, setRenameModalOpen, setRenameTargetVideo, setNewName]);

  // Config Modal Handler
  const handleConfigSave = async (videoId, config) => {
    setVideoConfigs(prev => ({
      ...prev,
      [videoId]: config
    }));

    if (currentVideoIndex === selectedVideos.size - 1) {
      setShowConfigModal(false);
      
      for (const vid of Array.from(selectedVideos)) {
        const video = uploadedVideos.find(v => v.id === vid);
        if (video) await handleProcessVideo(video);
      }
      
      setSelectedVideos(new Set());
      setCurrentVideoIndex(0);
    } else {
      setCurrentVideoIndex(prev => prev + 1);
    }
  };

  const handlePreview = useCallback((video, type) => {
    setPreviewVideo({ video, type });
  }, []);

  return (
    <>
      <div className="px-8 py-6">
        {/* Header */}
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
              {uploadedVideos.map(video => (
                <VideoCard 
                  key={video.id}
                  video={video}
                  type="upload"
                  isSelected={selectedVideos.has(video.id)}
                  atMaxSelections={selectedVideos.size >= MAX_SELECTIONS}
                  onSelect={handleSelect}
                  onPreviewClick={handlePreview}
                  onDropdownClick={handleDropdownClick}
                  activeDropdown={activeDropdown}
                  onActionClick={handleActionClick}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Post Production Section */}
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
                    isSelected={false}
                    atMaxSelections={false}
                    onPreviewClick={handlePreview}
                    onDropdownClick={handleDropdownClick}
                    activeDropdown={activeDropdown}
                    onActionClick={handleActionClick}
                  />
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Modals */}
      {showConfigModal && (
        <ConfigurationModal 
          onClose={() => {
            setShowConfigModal(false);
            setSelectedVideos(new Set());
            setCurrentVideoIndex(0);
          }}
          onSave={handleConfigSave}
          selectedVideos={Array.from(selectedVideos)}
          currentVideoIndex={currentVideoIndex}
          setCurrentVideoIndex={setCurrentVideoIndex}
          videoConfigs={videoConfigs}
          currentVideo={uploadedVideos.find(v => 
            v.id === Array.from(selectedVideos)[currentVideoIndex]
          )}
        />
      )}

      {previewVideo && (
        <VideoPreviewModal
          video={previewVideo.video}
          type={previewVideo.type}
          onClose={() => setPreviewVideo(null)}
        />
      )}

      <RenameModal 
        isOpen={renameModalOpen}
        targetVideo={renameTargetVideo}
        newName={newName}
        setNewName={setNewName}
        fileExtension={fileExtension}
        onClose={closeRenameModal}
        onSubmit={handleRenameSubmit}
      />

      {/* Processing Status */}
      {Array.from(processingJobs.entries()).map(([vid_id, job_id]) => (
        <VideoProcessingStatus
          key={`${job_id}-${vid_id}`}
          jobId={job_id}
          videoId={vid_id}
          onProcessingComplete={(processedPath) => 
            handleProcessingComplete(vid_id, processedPath)
          }
        />
      ))}

      <Toaster />
    </>
  );
}

export default CreatePage;