// frontend/src/components/Navbar.js

import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import {
  UserIcon,
  Cog6ToothIcon,
  LockClosedIcon,
  EnvelopeIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import axiosInstance from '../utils/axios';

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [userProfile, setUserProfile] = useState({
    profilePicture: null,
    firstName: '',
    lastName: '',
    email: ''
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axiosInstance.get('/users/me');
        setUserProfile({
          profilePicture: response.data.profile_picture_url,
          firstName: response.data.first_name,
          lastName: response.data.last_name,
          email: response.data.email
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    fetchProfile();
  }, []);

  // Determine if nav link is active
  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  // Generate classes for nav links
  const getLinkClasses = (path) => {
    return isActive(path)
      ? "text-purple-600 font-semibold border-b-2 border-purple-600 pb-1"
      : "text-gray-500 hover:text-gray-900 pb-1 border-b-2 border-transparent";
  };

  // Updated logout handler
  const handleLogout = async () => {
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear backend token
      localStorage.removeItem('backend_token');
      
      // Navigate to login
      navigate('/login');
      setIsDropdownOpen(false);
      
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  };

  // Update the avatar image and user info
  const avatarContent = userProfile.profilePicture ? (
    <img
      src={`${userProfile.profilePicture}?ts=${Date.now()}`}
      alt="User Avatar"
      className="w-9 h-9 rounded-full object-cover hover:ring-2 hover:ring-purple-500 transition-all"
      onError={(e) => {
        e.target.onerror = null; 
        e.target.src = 'https://via.placeholder.com/40';
      }}
    />
  ) : (
    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
      <UserIcon className="w-5 h-5 text-gray-400" />
    </div>
  );

  return (
    <nav className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm">
      {/* Left Section: Logo + Nav Items */}
      <div className="flex items-center space-x-8">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <span className="font-bold text-xl text-purple-600 tracking-tight">
            Clipsy
          </span>
        </div>

        {/* Nav Links */}
        <ul className="flex items-center space-x-6">
          <li>
            <Link to="/dashboard" className={getLinkClasses('/')}>
              Dashboard
            </Link>
          </li>
          <li>
            <Link to="/create" className={getLinkClasses('/create')}>
              Create
            </Link>
          </li>
          <li>
            <Link to="/plan" className={getLinkClasses('/plan')}>
              Plan
            </Link>
          </li>
          <li>
            <Link to="/calendar" className={getLinkClasses('/calendar')}>
              Calendar
            </Link>
          </li>
        </ul>
      </div>

      {/* Right Section: Notification + Avatar + Logout */}
      <div className="flex items-center space-x-6">
        <button className="relative text-gray-600 hover:text-gray-800 focus:outline-none">
          {/* Notification icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31
                 A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75
                 a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085
                 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 
                 0a3 3 0 1 1-5.714 0"
            />
          </svg>
        </button>

        {/* Avatar with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center focus:outline-none"
          >
            {avatarContent}
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
              {/* Updated User Info */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">
                  {userProfile.firstName} {userProfile.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">{userProfile.email}</p>
              </div>

              {/* Account */}
              <Link
                to="/settings?tab=account"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsDropdownOpen(false)}
              >
                <UserIcon className="h-4 w-4 mr-3 text-gray-400" />
                Account
              </Link>

              {/* Preferences */}
              <Link
                to="/settings?tab=preferences"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsDropdownOpen(false)}
              >
                <Cog6ToothIcon className="h-4 w-4 mr-3 text-gray-400" />
                Preferences
              </Link>

              {/* Security */}
              <Link
                to="/settings?tab=security"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsDropdownOpen(false)}
              >
                <LockClosedIcon className="h-4 w-4 mr-3 text-gray-400" />
                Security
              </Link>

              {/* Notification Settings */}
              <Link
                to="/settings?tab=notifications"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsDropdownOpen(false)}
              >
                <EnvelopeIcon className="h-4 w-4 mr-3 text-gray-400" />
                Notifications
              </Link>

              {/* Billing */}
              <Link
                to="/settings?tab=billing"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsDropdownOpen(false)}
              >
                <CreditCardIcon className="h-4 w-4 mr-3 text-gray-400" />
                Billing
              </Link>

              {/* Divider */}
              <div className="h-px bg-gray-200 my-1"></div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              >
                <svg
                  className="h-4 w-4 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
