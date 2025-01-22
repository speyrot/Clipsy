// frontend/src/components/settings/NotificationSettings.js

import React, { useState } from "react";
import { toast } from "react-hot-toast";

const NotificationSettings = () => {
  const [notifications, setNotifications] = useState({
    email: {
      newComments: true,
      mentions: true,
      taskUpdates: false,
      weeklyDigest: true
    },
    push: {
      newComments: false,
      mentions: true,
      taskUpdates: true
    }
  });

  const handleToggle = (category, setting) => {
    setNotifications(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: !prev[category][setting]
      }
    }));
  };

  const handleSave = async () => {
    try {
      // TODO: Implement API call to save notification settings
      toast.success('Notification preferences saved successfully');
    } catch (error) {
      toast.error('Failed to save notification preferences');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-gray-900">Notification Settings</h2>
      <p className="mt-1 text-sm text-gray-500 mb-6">
        Choose how and when you want to be notified.
      </p>

      <div className="space-y-6 max-w-2xl">
        {/* Email Notifications */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-4">Email Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">New Comments</label>
                <p className="text-sm text-gray-500">Get notified when someone comments on your content</p>
              </div>
              <button
                onClick={() => handleToggle('email', 'newComments')}
                className={`${
                  notifications.email.newComments ? 'bg-purple-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    notifications.email.newComments ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Mentions</label>
                <p className="text-sm text-gray-500">Get notified when someone mentions you</p>
              </div>
              <button
                onClick={() => handleToggle('email', 'mentions')}
                className={`${
                  notifications.email.mentions ? 'bg-purple-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    notifications.email.mentions ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Task Updates</label>
                <p className="text-sm text-gray-500">Get notified about updates to your tasks</p>
              </div>
              <button
                onClick={() => handleToggle('email', 'taskUpdates')}
                className={`${
                  notifications.email.taskUpdates ? 'bg-purple-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    notifications.email.taskUpdates ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Weekly Digest</label>
                <p className="text-sm text-gray-500">Get a weekly summary of your activity</p>
              </div>
              <button
                onClick={() => handleToggle('email', 'weeklyDigest')}
                className={`${
                  notifications.email.weeklyDigest ? 'bg-purple-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    notifications.email.weeklyDigest ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Push Notifications */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-4">Push Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">New Comments</label>
                <p className="text-sm text-gray-500">Get notified when someone comments on your content</p>
              </div>
              <button
                onClick={() => handleToggle('push', 'newComments')}
                className={`${
                  notifications.push.newComments ? 'bg-purple-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    notifications.push.newComments ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Mentions</label>
                <p className="text-sm text-gray-500">Get notified when someone mentions you</p>
              </div>
              <button
                onClick={() => handleToggle('push', 'mentions')}
                className={`${
                  notifications.push.mentions ? 'bg-purple-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    notifications.push.mentions ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Task Updates</label>
                <p className="text-sm text-gray-500">Get notified about updates to your tasks</p>
              </div>
              <button
                onClick={() => handleToggle('push', 'taskUpdates')}
                className={`${
                  notifications.push.taskUpdates ? 'bg-purple-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    notifications.push.taskUpdates ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
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

export default NotificationSettings; 