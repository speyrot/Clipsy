// frontend/src/components/ConfigurationModal/ConfigurationModal.js

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { captionStyles, resolutionOptions } from '../../constants';
import axiosInstance from '../../utils/axios';
import { toast } from 'react-hot-toast';

const ConfigurationModal = ({ 
  onClose, 
  onSave, 
  selectedVideos, 
  currentVideoIndex,
  setCurrentVideoIndex,
  videoConfigs,
  currentVideo 
}) => {
  // Initialize config with current video's display name instead of s3 filename
  const [config, setConfig] = useState({
    filename: currentVideo?.name || currentVideo?.filename || '',
    resolution: '1080p',
    autoCaptions: false,
    captionStyle: null
  });

  // Track original filename to detect changes
  const [originalFilename] = useState(currentVideo?.name || currentVideo?.filename || '');

  // Handle filename change and rename API call
  const handleFilenameChange = async (newFilename) => {
    setConfig(prev => ({ ...prev, filename: newFilename }));
  };

  // Handle save with potential rename
  const handleSave = async () => {
    try {
      // If filename was changed, call rename API first
      if (config.filename !== originalFilename) {
        // Match the backend VideoRenameRequest model
        const payload = {
          name: config.filename  // Changed from new_name to name
        };
        
        console.log('Rename payload:', payload);
        
        await axiosInstance.patch(`/videos/${currentVideo.id}/rename`, payload);
      }
      
      // Then proceed with normal save
      onSave(currentVideo.id, config);
    } catch (error) {
      console.error('Error details:', error.response?.data);
      toast.error('Failed to rename video. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-semibold">
            Configure Video {currentVideoIndex + 1} of {selectedVideos.length}
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
          {/* Filename - Now editable */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Video Name
            </label>
            <input
              type="text"
              value={config.filename}
              onChange={(e) => handleFilenameChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Enter video name"
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
            onClick={handleSave}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            {currentVideoIndex === selectedVideos.length - 1 
              ? `Process ${selectedVideos.length} Clips`
              : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationModal; 