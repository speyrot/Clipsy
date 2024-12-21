// frontend/src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import ProcessPage from './pages/ProcessPage';
import DraftsPage from './pages/DraftsPage';
import CalendarPage from './pages/CalendarPage';
import PublishPage from './pages/PublishPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Top Navigation Bar */}
        <Navbar />

        {/* Main Content */}
        <main className="flex-grow">
          <Routes>
            {/* 
              By convention:
              - The Dashboard is shown at the root URL "/"
              - The other pages at "/process", "/drafts", "/calendar", "/publish"
            */}
            <Route path="/" element={<DashboardPage />} />
            <Route path="/process" element={<ProcessPage />} />
            <Route path="/drafts" element={<DraftsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/publish" element={<PublishPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

