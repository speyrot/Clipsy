// frontend/src/components/ProgressIndicator.js

import React from 'react';

const ProgressIndicator = ({ progress, label }) => {
  return (
    <div className="w-full space-y-2">
      {label && <p className="text-sm text-gray-700 font-medium">{label}</p>}
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-300 ease-in-out flex items-center justify-center text-xs text-white font-semibold"
          style={{ width: `${progress}%` }}
        >
          {progress.toFixed(0)}%
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;