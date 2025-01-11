// frontend/src/pages/SettingsPage.js

import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { PencilSquareIcon } from "@heroicons/react/24/outline";

const SettingsPage = () => {
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [profileData, setProfileData] = useState({
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    emailNotifications: true,
    textNotifications: false,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      toast.success("Settings updated successfully");
      setIsEditing(false); // Exit editing mode after saving
    } catch (error) {
      toast.error("Failed to update settings");
    }
    setLoading(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto bg-white shadow-md rounded-lg">
        {/* Header */}
        <div className="p-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Account Settings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your account preferences and security.
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 flex items-center space-x-2 text-sm font-medium text-purple-600 border border-purple-600 rounded-md hover:bg-purple-50"
            >
              <PencilSquareIcon className="h-5 w-5 text-purple-600" />
              <span>Edit</span>
            </button>
          )}
        </div>

        <hr className="border-gray-200" />

        {/* Personal Information */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Personal Information
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Update your profile and contact details.
          </p>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-700">First Name:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.firstName}
                  onChange={(e) =>
                    setProfileData({ ...profileData, firstName: e.target.value })
                  }
                  className="block w-full max-w-xs border border-gray-300 rounded-md shadow-sm py-1 px-2 text-gray-900"
                />
              ) : (
                <span className="text-gray-800">{profileData.firstName}</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-700">Last Name:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.lastName}
                  onChange={(e) =>
                    setProfileData({ ...profileData, lastName: e.target.value })
                  }
                  className="block w-full max-w-xs border border-gray-300 rounded-md shadow-sm py-1 px-2 text-gray-900"
                />
              ) : (
                <span className="text-gray-800">{profileData.lastName}</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-700">Email:</span>
              <span className="text-gray-800">{profileData.email}</span>
            </div>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Security */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">Security</h2>
          <p className="text-sm text-gray-500 mb-4">
            Update your password and secure your account.
          </p>
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-700">Change Password:</span>
            <button className="px-4 py-2 text-sm font-medium text-purple-600 border border-purple-600 rounded-md hover:bg-purple-50">
              Reset Password
            </button>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Notification Preferences */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Notification Preferences
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Manage your email and push notifications.
          </p>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-700">Email Notifications:</span>
              <button
                type="button"
                onClick={() =>
                  setProfileData({
                    ...profileData,
                    emailNotifications: !profileData.emailNotifications,
                  })
                }
                className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
                  profileData.emailNotifications ? "bg-purple-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`${
                    profileData.emailNotifications
                      ? "translate-x-5"
                      : "translate-x-0"
                  } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                />
              </button>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-700">Text Notifications:</span>
              <button
                type="button"
                onClick={() =>
                  setProfileData({
                    ...profileData,
                    textNotifications: !profileData.textNotifications,
                  })
                }
                className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
                  profileData.textNotifications ? "bg-purple-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`${
                    profileData.textNotifications
                      ? "translate-x-5"
                      : "translate-x-0"
                  } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer (only shown in editing mode) */}
        {isEditing && (
          <div className="px-6 py-3 bg-gray-100 border-t border-gray-200 rounded-b-lg flex justify-between items-center">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-purple-600 border border-purple-600 rounded-md hover:bg-purple-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
