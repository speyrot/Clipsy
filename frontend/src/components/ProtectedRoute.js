// frontend/src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('access_token');

  if (!token) {
    // Not logged in => redirect
    return <Navigate to="/signin" replace />;
  }

  // Logged in => render children
  return children;
}

export default ProtectedRoute;
