// frontend/src/components/VideoEditor.js

// frontend/src/components/VideoEditor.js

import React from 'react';

const VideoEditor = ({ videoUrl }) => {
  // Placeholder for future editing functionalities
  return (
    <div>
      <h2>Video Editor</h2>
      <video width="600" controls>
        <source src={`http://127.0.0.1:8000/${videoUrl}`} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      {/* Future editing tools will be added here */}
    </div>
  );
};

export default VideoEditor;
