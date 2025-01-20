// frontend/src/components/Navbar.js
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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
            <img
              src="https://via.placeholder.com/40"
              alt="User Avatar"
              className="w-9 h-9 rounded-full object-cover hover:ring-2 hover:ring-purple-500 transition-all"
            />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
              <Link
                to="/settings"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsDropdownOpen(false)}
              >
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              >
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
