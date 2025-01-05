// frontend/src/components/Navbar.js
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

function Navbar({ setToken }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine if nav link is active
  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') {
      return true;
    }
    return path !== '/' && location.pathname.startsWith(path);
  };

  // Generate classes for nav links
  const getLinkClasses = (path) => {
    return isActive(path)
      ? "text-purple-600 font-semibold border-b-2 border-purple-600 pb-1"
      : "text-gray-500 hover:text-gray-900 pb-1 border-b-2 border-transparent";
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setToken('');
    navigate('/signin'); // go back to sign-in page
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

        {/* Avatar */}
        <img
          src="https://via.placeholder.com/40"
          alt="User Avatar"
          className="w-9 h-9 rounded-full object-cover"
        />

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
