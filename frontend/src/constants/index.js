// frontend/src/constants/index.js

export const MAX_SELECTIONS = 3;

export const captionStyles = [
  { id: 1, name: 'Modern Clean', thumbnail: '/caption-style1.jpg' },
  { id: 2, name: 'Gaming Bold', thumbnail: '/caption-style2.jpg' },
  { id: 3, name: 'Minimal', thumbnail: '/caption-style3.jpg' },
  { id: 4, name: 'Subtitles', thumbnail: '/caption-style4.jpg' },
];

export const resolutionOptions = [
  { value: '1080p', label: '1080p Full HD' },
  { value: '720p', label: '720p HD' },
  { value: '480p', label: '480p SD' },
];

// Helper functions for filename manipulation
export const extractExtensionFromFilename = (filename) => {
  if (!filename) return '';
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex >= 0 ? filename.substring(dotIndex) : '';
};

export const extractBaseName = (filename) => {
  if (!filename) return '';
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex >= 0 ? filename.substring(0, dotIndex) : filename;
}; 