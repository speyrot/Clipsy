// frontend/src/utils/axios.js

import axios from 'axios';
import { supabase } from './supabaseClient';

const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
});

// Add request interceptor to add backend token to all requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('backend_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401 errors
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Optionally, implement token refresh logic here if supported
        // For now, sign out user and redirect to login
        await supabase.auth.signOut();
        localStorage.removeItem('backend_token');
        window.location.href = '/login';
        return Promise.reject(error);
      } catch (refreshError) {
        console.error('Error during token refresh:', refreshError);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
