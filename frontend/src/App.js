// frontend/src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import CreatePage from './pages/CreatePage';
import ToDosPage from './pages/ToDosPage';
import CalendarPage from './pages/CalendarPage';

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
            <Route path="/create" element={<CreatePage />} />
            <Route path="/todos" element={<ToDosPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

