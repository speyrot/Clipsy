// frontend/src/components/Navbar.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar() {
  const location = useLocation();
  
  // Function to determine if a link is active
  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') {
      return true;
    }
    return path !== '/' && location.pathname.startsWith(path);
  };

  // Function to get classes for nav links
  const getLinkClasses = (path) => {
    return isActive(path)
      ? "text-purple-600 font-semibold border-b-2 border-purple-600 pb-1" // Active state
      : "text-gray-500 hover:text-gray-900 pb-1 border-b-2 border-transparent"; // Inactive state
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
            <Link to="/" className={getLinkClasses('/')}>
              Dashboard
            </Link>
          </li>
          <li>
            <Link to="/process" className={getLinkClasses('/process')}>
              Process
            </Link>
          </li>
          <li>
            <Link to="/drafts" className={getLinkClasses('/drafts')}>
              Drafts
            </Link>
          </li>
          <li>
            <Link to="/calendar" className={getLinkClasses('/calendar')}>
              Calendar
            </Link>
          </li>
          <li>
            <Link to="/publish" className={getLinkClasses('/publish')}>
              Publish
            </Link>
          </li>
        </ul>
      </div>

      {/* Right Section: Notification Bell + Avatar */}
      <div className="flex items-center space-x-6">
        <button className="relative text-gray-600 hover:text-gray-800 focus:outline-none">
          {/* Notification Icon */}
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

        {/* Avatar */}
        <img
          src="https://via.placeholder.com/40"
          alt="User Avatar"
          className="w-9 h-9 rounded-full object-cover"
        />
      </div>
    </nav>
  );
}

export default Navbar;
