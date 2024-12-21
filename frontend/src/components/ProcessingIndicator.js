// frontend/src/components/ProcessingIndicator.js

import React from 'react';

const ProcessingIndicator = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 text-center py-6">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
      <h2 className="text-xl font-semibold text-gray-800">Processing Your Video</h2>
      <p className="text-sm text-gray-600 max-w-sm mx-auto">
        Please wait while we process your video. This may take a few minutes depending on the length and complexity.
      </p>
    </div>
  );
};

export default ProcessingIndicator;