// frontend/src/components/VideoCard/VideoCard.js

import React from 'react';
import { EllipsisVerticalIcon, CheckCircleIcon, EyeIcon } from '@heroicons/react/24/solid';

const VideoCard = React.memo(({ 
  video, 
  type, 
  isSelected,
  atMaxSelections,
  onSelect,
  onPreviewClick,
  onDropdownClick,
  activeDropdown,
  onActionClick 
}) => {
  const isUpload = type === 'upload';
  
  // Get display name based on type
  const displayName = type === "processed" 
    ? `${video.name || video.filename}_processed`
    : (video.name || video.filename);

  const handlePreviewClick = (e) => {
    e.stopPropagation();
    onPreviewClick(video, type);
  };

  const handleDropdownButtonClick = (e) => {
    e.stopPropagation();
    onDropdownClick(e, `${type}-${video.id}`);
  };

  return (
    <div 
      onClick={() => isUpload && onSelect(video.id)}
      className={`
        flex-shrink-0 w-64 rounded-lg border border-gray-200 overflow-hidden 
        transition-all duration-200 relative group hover:border-2 hover:border-purple-500
        ${isUpload ? 'cursor-pointer hover:bg-black/5' : ''}
        ${isSelected ? 'border-purple-500 bg-black/5' : ''}
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
                w-5 h-5 rounded-full border-2 border-purple-500/70
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
          loading="lazy"
        />
      </div>
      <div className="px-3 py-2 flex items-center justify-between">
        <p className="text-sm text-gray-600 truncate flex-1" title={displayName}>
          {displayName}
        </p>
        <div className="relative flex items-center">
          {/* Eye Icon for Preview */}
          <button
            onClick={handlePreviewClick}
            className="p-1 hover:bg-gray-100 rounded mr-1"
          >
            <EyeIcon className="w-5 h-5 text-gray-600 hover:text-purple-600" />
          </button>

          {/* Ellipsis Menu Button */}
          <button
            onClick={handleDropdownButtonClick}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <EllipsisVerticalIcon className="w-5 h-5 text-gray-600 hover:text-purple-600" />
          </button>

          {/* Dropdown Menu */}
          {activeDropdown === `${type}-${video.id}` && (
            <div className="absolute right-0 bottom-full mb-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
              <button
                onClick={(e) => onActionClick(e, 'rename', video, type)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Rename
              </button>
              <button
                onClick={(e) => onActionClick(e, 'download', video, type)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Download
              </button>
              <button
                onClick={(e) => onActionClick(e, 'delete', video, type)}
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
}, (prevProps, nextProps) => {
  return (
    prevProps.video.id === nextProps.video.id &&
    prevProps.video.thumbnail === nextProps.video.thumbnail &&
    prevProps.video.name === nextProps.video.name &&
    prevProps.video.filename === nextProps.video.filename &&
    prevProps.type === nextProps.type &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.atMaxSelections === nextProps.atMaxSelections &&
    prevProps.activeDropdown === nextProps.activeDropdown
  );
});

VideoCard.displayName = 'VideoCard';

export default VideoCard; 