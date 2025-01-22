// frontend/src/components/settings/PreferencesSettings.js

import React, { useState } from "react";
import { toast } from "react-hot-toast";

const PreferencesSettings = () => {
  const [preferences, setPreferences] = useState({
    videoHubView: 'tile',
    calendarView: 'tile',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h'
  });

  const handleChange = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    try {
      // TODO: Implement API call to save preferences
      toast.success('Preferences saved successfully');
    } catch (error) {
      toast.error('Failed to save preferences');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-gray-900">Preferences</h2>
      <p className="mt-1 text-sm text-gray-500 mb-6">
        Customize your application experience.
      </p>

      <div className="space-y-6 max-w-2xl">
        {/* Default Views Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-4">Default Views</h3>
          <div className="space-y-4">
            {/* Video Hub View Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Video Hub Default View
              </label>
              <select
                value={preferences.videoHubView}
                onChange={(e) => handleChange('videoHubView', e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
              >
                <option value="tile">Tile View</option>
                <option value="list">List View</option>
              </select>
            </div>

            {/* Calendar View Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calendar Default View
              </label>
              <select
                value={preferences.calendarView}
                onChange={(e) => handleChange('calendarView', e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
              >
                <option value="tile">Tile View</option>
                <option value="list">List View</option>
              </select>
            </div>
          </div>
        </div>

        {/* Date & Time Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-4">Date & Time</h3>
          <div className="space-y-4">
            {/* Date Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Format
              </label>
              <select
                value={preferences.dateFormat}
                onChange={(e) => handleChange('dateFormat', e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>

            {/* Time Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Format
              </label>
              <select
                value={preferences.timeFormat}
                onChange={(e) => handleChange('timeFormat', e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
              >
                <option value="12h">12-hour (1:00 PM)</option>
                <option value="24h">24-hour (13:00)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreferencesSettings; 