// frontend/src/components/ProgressIndicator.js

import React from 'react';

const ProgressIndicator = ({ progress, label }) => {
  return (
    <div style={{ marginTop: '20px' }}>
      {label && <p>{label}</p>}
      <div
        style={{
          width: '100%',
          backgroundColor: '#f3f3f3',
          borderRadius: '5px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            backgroundColor: '#4caf50',
            height: '20px',
            textAlign: 'center',
            color: 'white',
            transition: 'width 0.5s ease-in-out',
          }}
        >
          {progress.toFixed(2)}%
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;
