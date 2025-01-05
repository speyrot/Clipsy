// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';

import DashboardPage from './pages/DashboardPage';
import CreatePage from './pages/CreatePage';
import PlanPage from './pages/PlanPage';
import CalendarPage from './pages/CalendarPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  // Initialize state from localStorage
  const [token, setToken] = useState(localStorage.getItem('access_token') || '');

  // Listen for sign in changes via localStorage (optional but can help if multiple tabs)
  useEffect(() => {
    const onStorageChange = () => {
      setToken(localStorage.getItem('access_token') || '');
    };
    window.addEventListener('storage', onStorageChange);
    return () => window.removeEventListener('storage', onStorageChange);
  }, []);

  return (
    <Router>
      {/* Conditionally render the Navbar if we have a token in state */}
      {token && <Navbar setToken={setToken} />}

      <Routes>
        {/* Public Routes */}
        <Route path="/signin" element={<SignInPage setToken={setToken} />} />
        <Route path="/signup" element={<SignUpPage />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute token={token}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create"
          element={
            <ProtectedRoute token={token}>
              <CreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/plan"
          element={
            <ProtectedRoute token={token}>
              <PlanPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute token={token}>
              <CalendarPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;