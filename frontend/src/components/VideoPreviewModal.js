// frontend/src/components/VideoPreviewModal.js

import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

const VideoPreviewModal = ({ video, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-xl font-semibold text-gray-800">
            {video.filename}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4">
          <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
            <video
              className="w-full h-full object-contain"
              controls
              autoPlay
              src={video.processedUrl || video.s3Url}
            >
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Video Details */}
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Type:</span>{' '}
              {video.processedUrl ? 'Processed Video' : 'Original Upload'}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">URL:</span>{' '}
              {video.processedUrl || video.s3Url}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoPreviewModal; 