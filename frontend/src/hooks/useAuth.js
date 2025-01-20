// frontend/src/hooks/useAuth.js

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import axiosInstance from '../utils/axios'; // Use the configured axios instance

export const useAuth = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setLoading(false);
      
      // The synchronization with backend is already handled in App.js
      // So no need to handle it here
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    session,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
      window.location.href = '/login';
    },
  };
};
