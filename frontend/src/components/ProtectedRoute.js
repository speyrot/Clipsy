// frontend/src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

export const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('backend_token');
  
  if (!token) {
    return <Navigate to="/signin" replace />;
  }
  
  return children;
};
