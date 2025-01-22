// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import Navbar from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from 'react-hot-toast';

import DashboardPage from './pages/DashboardPage';
import CreatePage from './pages/CreatePage';
import PlanPage from './pages/PlanPage';
import CalendarPage from './pages/CalendarPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import SettingsPage from './pages/SettingsPage';

console.log('Environment check:', {
  url: process.env.REACT_APP_SUPABASE_URL,
  hasKey: !!process.env.REACT_APP_SUPABASE_ANON_KEY
});

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log("Initial session:", session);
      if (session?.access_token) {
        try {
          const response = await fetch('http://localhost:8000/auth/signin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              access_token: session.access_token
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            localStorage.setItem('backend_token', data.token);
          } else {
            // Clear session if backend auth fails
            localStorage.removeItem('backend_token');
            await supabase.auth.signOut();
          }
        } catch (error) {
          console.error('Complete error:', error);
          localStorage.removeItem('backend_token');
          await supabase.auth.signOut();
        }
      }
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (!session) {
        localStorage.removeItem('backend_token');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Router>
        {session && <Navbar />}

        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={session ? <Navigate to="/dashboard" /> : <SignInPage />}
          />
          <Route
            path="/signup"
            element={session ? <Navigate to="/dashboard" /> : <SignUpPage />}
          />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Navigate to="/dashboard" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create"
            element={
              <ProtectedRoute>
                <CreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plan"
            element={
              <ProtectedRoute>
                <PlanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <CalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
      <Toaster
        position="bottom-right"
        gutter={8}
        containerStyle={{
          top: 40,
          right: 40,
          bottom: 40,
        }}
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(255, 255, 255, 0.9)',
            color: '#1F2937',
            padding: '16px',
            borderRadius: '8px',
            maxWidth: '400px',
          },
          success: {
            style: {
              border: '2px solid #9333EA', // Purple-600
            },
          },
          error: {
            style: {
              border: '2px solid #DC2626', // Red-600
            },
          },
          loading: {
            style: {
              border: '2px solid #6B7280', // Gray-500
            },
          },
        }}
      />
    </>
  );
}

export default App;