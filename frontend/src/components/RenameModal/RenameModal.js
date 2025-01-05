// frontend/src/components/RenameModal/RenameModal.js

import React from 'react';

const RenameModal = ({ 
  isOpen, 
  targetVideo, 
  newName, 
  setNewName, 
  fileExtension, 
  onClose, 
  onSubmit 
}) => {
  if (!isOpen || !targetVideo) return null;
  
  const nameWithoutExtension = (targetVideo.name || targetVideo.filename || "")
    .replace(/\.[^/.]+$/, "");

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-semibold mb-4">Rename Video</h2>
        <p className="text-sm text-gray-600 mb-2">
          Current name: <strong>{targetVideo.name || targetVideo.filename}</strong>
        </p>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          New name:
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newName.replace(/\.[^/.]+$/, "")}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 border rounded p-2"
          />
          <span className="text-gray-700">{fileExtension}</span>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={() => onClose()}
            className="mr-2 px-4 py-2 border rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit()}
            className="px-4 py-2 border rounded bg-purple-600 hover:bg-purple-700 text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default RenameModal; 