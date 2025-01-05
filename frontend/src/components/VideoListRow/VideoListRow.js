// frontend/src/components/VideoListRow/VideoListRow.js

import React from 'react';
import { CheckCircleIcon, EyeIcon, EllipsisVerticalIcon } from '@heroicons/react/24/solid';

// We memoize for performance
const VideoListRow = React.memo(
  ({
    video,
    type,
    isSelected,
    atMaxSelections,
    onSelect,
    onPreviewClick,
    onDropdownClick,
    activeDropdown,
    onActionClick,
  }) => {
    const isUpload = type === 'upload';
    const displayName =
      type === 'processed'
        ? `${video.name || video.filename}_processed`
        : video.name || video.filename;

    const handleRowClick = () => {
      if (isUpload) onSelect(video.id);
    };

    const handlePreviewClick = (e) => {
      e.stopPropagation();
      onPreviewClick(video, type);
    };

    const handleDropdownClickWrapper = (e) => {
      e.stopPropagation();
      onDropdownClick(e, `${type}-${video.id}`);
    };

    return (
      <tr
        onClick={handleRowClick}
        className={`border-b last:border-b-0 transition ${
          isUpload ? 'hover:bg-gray-50 cursor-pointer' : ''
        }`}
      >
        {/* Left cell: selection checkmark if it's upload */}
        <td className="p-3 w-10">
          {isUpload && (
            <>
              {isSelected ? (
                <CheckCircleIcon className="w-5 h-5 text-purple-500 inline-block" />
              ) : atMaxSelections ? (
                <span className="inline-block text-gray-300">✕</span>
              ) : (
                <span className="inline-block text-gray-400">○</span>
              )}
            </>
          )}
        </td>

        {/* Middle cell: name + thumbnail */}
        <td className="p-3">
          <div className="flex items-center">
            <img
              src={video.thumbnail}
              alt="thumbnail"
              className="w-12 h-12 object-cover rounded mr-2"
            />
            <span className="truncate" title={displayName}>
              {displayName}
            </span>
          </div>
        </td>

        {/* Right cell: actions */}
        <td className="p-3 text-right"> {/* text-right for right alignment */}
          <div className="inline-flex items-center space-x-2 relative">
            {/* Eye / Preview */}
            <button
              onClick={handlePreviewClick}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <EyeIcon className="w-5 h-5 text-gray-600 hover:text-purple-600" />
            </button>

            {/* Ellipsis / Menu */}
            <button
              onClick={handleDropdownClickWrapper}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <EllipsisVerticalIcon className="w-5 h-5 text-gray-600 hover:text-purple-600" />
            </button>

            {/* Dropdown Menu */}
            {activeDropdown === `${type}-${video.id}` && (
              <div className="absolute right-0 top-8 w-48 bg-white border border-gray-200 shadow-lg rounded-lg py-1 z-10">
                <button
                  onClick={(e) => onActionClick(e, 'rename', video, type)}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Rename
                </button>
                <button
                  onClick={(e) => onActionClick(e, 'download', video, type)}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Download
                </button>
                <button
                  onClick={(e) => onActionClick(e, 'delete', video, type)}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  },
  (prev, next) =>
    prev.video.id === next.video.id &&
    prev.video.thumbnail === next.video.thumbnail &&
    prev.video.name === next.video.name &&
    prev.video.filename === next.video.filename &&
    prev.type === next.type &&
    prev.isSelected === next.isSelected &&
    prev.atMaxSelections === next.atMaxSelections &&
    prev.activeDropdown === next.activeDropdown
);

VideoListRow.displayName = 'VideoListRow';
export default VideoListRow;
