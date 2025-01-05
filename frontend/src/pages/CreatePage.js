// frontend/src/pages/CreatePage.js

import React, { useState, useCallback, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { MAX_SELECTIONS } from '../constants';
import { useVideoManagement } from '../hooks/useVideoManagement';
import {
  Squares2X2Icon,
  ListBulletIcon
} from '@heroicons/react/24/outline';

import UploadComponent from '../components/UploadComponent';
import VideoProcessingStatus from '../components/VideoProcessingStatus';
import VideoPreviewModal from '../components/VideoPreviewModal';
import VideoCard from '../components/VideoCard/VideoCard';
import VideoListRow from '../components/VideoListRow/VideoListRow';
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

  // Fetch videos on mount
  useEffect(() => {
    fetchUserVideos();
  }, [fetchUserVideos]);

  // Local states
  const [selectedVideos, setSelectedVideos] = useState(new Set());
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videoConfigs, setVideoConfigs] = useState({});
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [previewVideo, setPreviewVideo] = useState(null);

  // View mode toggle: "card" or "list"
  const [viewMode, setViewMode] = useState('card');

  // -------------------------------------------------
  // Selection, Dropdown, Action Clicks
  // -------------------------------------------------
  const handleSelect = useCallback((videoId) => {
    setSelectedVideos((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(videoId)) {
        newSelection.delete(videoId);
      } else if (newSelection.size < MAX_SELECTIONS) {
        newSelection.add(videoId);
      }
      return newSelection;
    });
  }, []);

  const handleDropdownClick = useCallback(
    (e, id) => {
      e.stopPropagation();
      setActiveDropdown(activeDropdown === id ? null : id);
    },
    [activeDropdown]
  );

  const handleActionClick = useCallback(
    (e, action, video, type) => {
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
    },
    [
      handleDeleteVideo,
      handleDownloadVideo,
      setRenameModalOpen,
      setRenameTargetVideo,
      setNewName,
    ]
  );

  // -------------------------------------------------
  // Config modal: finalize processing
  // -------------------------------------------------
  const handleConfigSave = async (videoId, config) => {
    setVideoConfigs((prev) => ({
      ...prev,
      [videoId]: config,
    }));

    if (currentVideoIndex === selectedVideos.size - 1) {
      setShowConfigModal(false);

      for (const vid of Array.from(selectedVideos)) {
        const video = uploadedVideos.find((v) => v.id === vid);
        if (video) await handleProcessVideo(video);
      }

      setSelectedVideos(new Set());
      setCurrentVideoIndex(0);
    } else {
      setCurrentVideoIndex((prev) => prev + 1);
    }
  };

  // -------------------------------------------------
  // Preview
  // -------------------------------------------------
  const handlePreview = useCallback((video, type) => {
    setPreviewVideo({ video, type });
  }, []);

  return (
    <>
      <div className="px-8 py-6">
        {/* 
          Header row 
          "Video Hub" on left, 
          View mode toggle on the right 
        */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Video Hub</h1>

          {/* View mode toggle */}
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              onClick={() => setViewMode('card')}
              className={`px-3 py-1 text-sm rounded-l-md border border-gray-300 hover:bg-gray-200 flex items-center ${
                viewMode === 'card'
                  ? 'bg-purple-100 text-purple-600 font-semibold'
                  : 'text-gray-600'
              }`}
            >
              <Squares2X2Icon className="h-4 w-4 mr-1" />
              Card
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm rounded-r-md border border-gray-300 hover:bg-gray-200 flex items-center ${
                viewMode === 'list'
                  ? 'bg-purple-100 text-purple-600 font-semibold'
                  : 'text-gray-600'
              }`}
            >
              <ListBulletIcon className="h-4 w-4 mr-1" />
              List
            </button>
          </div>
        </div>

        {/* -------------------------------------------------
          Uploads Section
        ------------------------------------------------- */}
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
                  ${
                    selectedVideos.size > 0
                      ? 'bg-purple-600 text-white hover:bg-purple-700 cursor-pointer'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
                disabled={selectedVideos.size === 0}
              >
                Process
                {selectedVideos.size > 0 && ` (${selectedVideos.size})`}
              </button>
            </div>
          </div>

          {/* Conditionally render the Upload Section in card or list view */}
          {viewMode === 'card' ? (
            // Card View
            <div className="relative">
              <div className="overflow-x-auto flex space-x-4 p-4">
                <UploadComponent onUploadComplete={handleUploadComplete} />
                {uploadedVideos.map((video) => (
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
          ) : (
            // List View
            <div className="relative border border-gray-200 rounded-lg">
              <table className="w-full border-collapse text-left">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-sm font-semibold text-gray-700 w-10"></th>
                    <th className="p-3 text-sm font-semibold text-gray-700">Name</th>
                    <th className="p-3 text-sm font-semibold text-gray-700 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* 
                    NEW/CHANGED: Add a top row for “upload.” 
                    Instead of a big tile, we show a single row the user can click
                  */}
                  <tr
                    className="border-b last:border-b-0 cursor-pointer hover:bg-gray-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      const input = document.getElementById('list-upload-input');
                      if (input) input.click();
                    }}
                  >
                    <td colSpan="3" className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-gray-400"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
                          <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z" />
                        </svg>
                        <span>Click here to upload a new video</span>
                      </div>
                    </td>
                  </tr>

                  {/* Actual list of uploaded videos */}
                  {uploadedVideos.map((video) => (
                    <VideoListRow
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
                </tbody>
              </table>

              {/* We hide the original UploadComponent 
                  but still need its hidden input to handleFileChange */}
              <div className="hidden">
                <UploadComponent
                  onUploadComplete={handleUploadComplete}
                  inputId="list-upload-input" // pass an ID, used to reference in the row
                />
              </div>
            </div>
          )}
        </section>

        {/* -------------------------------------------------
          Post Production Section
        ------------------------------------------------- */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              Post Production
            </h2>
            <div className="flex space-x-2">
              <select className="border rounded-lg px-3 py-2 text-sm text-gray-600">
                <option>All Videos</option>
                <option>Recent</option>
                <option>Processing</option>
              </select>
            </div>
          </div>

          {viewMode === 'card' ? (
            <div className="relative">
              <div className="overflow-x-auto flex space-x-4 p-4">
                {processedVideos.length === 0 ? (
                  <div className="flex-shrink-0 w-full rounded-lg border border-gray-200 p-8 text-center">
                    <p className="text-gray-500">No processed videos yet</p>
                  </div>
                ) : (
                  processedVideos.map((video) => (
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
          ) : (
            // List view for processed videos
            <div className="relative border border-gray-200 rounded-lg">
              {processedVideos.length === 0 ? (
                <div className="flex-shrink-0 w-full p-8 text-center">
                  <p className="text-gray-500">No processed videos yet</p>
                </div>
              ) : (
                <table className="w-full border-collapse text-left">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 text-sm font-semibold text-gray-700 w-10"></th>
                      <th className="p-3 text-sm font-semibold text-gray-700">
                        Name
                      </th>
                      <th className="p-3 text-sm font-semibold text-gray-700 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedVideos.map((video) => (
                      <VideoListRow
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
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>
      </div>

      {/* -------------------------------------------------
        Config Modal
      ------------------------------------------------- */}
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
          currentVideo={uploadedVideos.find(
            (v) => v.id === Array.from(selectedVideos)[currentVideoIndex]
          )}
        />
      )}

      {/* -------------------------------------------------
        Preview Modal
      ------------------------------------------------- */}
      {previewVideo && (
        <VideoPreviewModal
          video={previewVideo.video}
          type={previewVideo.type}
          onClose={() => setPreviewVideo(null)}
        />
      )}

      {/* -------------------------------------------------
        Rename Modal
      ------------------------------------------------- */}
      <RenameModal
        isOpen={renameModalOpen}
        targetVideo={renameTargetVideo}
        newName={newName}
        setNewName={setNewName}
        fileExtension={fileExtension}
        onClose={closeRenameModal}
        onSubmit={handleRenameSubmit}
      />

      {/* -------------------------------------------------
        Processing Status
      ------------------------------------------------- */}
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
