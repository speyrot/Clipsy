// frontend/src/pages/DashboardPage.js
import React from 'react';

function DashboardPage() {
  return (
    <div className="px-8 py-6">
      {/* Big Heading */}
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Large “Dashboard” placeholder area */}
      <div className="bg-gray-100 border border-gray-200 rounded-lg p-8 mb-6">
        <p className="text-gray-500 italic">[ Large Dashboard Content Area ]</p>
      </div>
    </div>
  );
}

export default DashboardPage;