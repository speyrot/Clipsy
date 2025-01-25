// frontend/src/components/settings/AccountSettings.js

import React, { useState, useEffect } from "react";
import { UserCircleIcon } from "@heroicons/react/24/solid";
import { toast } from "react-hot-toast";
import axiosInstance from "../../utils/axios";

const AccountSettings = () => {
  const [profileImage, setProfileImage] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await axiosInstance.get('/users/me');
        setFirstName(response.data.first_name || '');
        setLastName(response.data.last_name || '');
        setEmail(response.data.email || '');
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast.error('Failed to load user profile', {
          duration: 4000,
          position: 'bottom-right',
        });
      }
    };

    fetchUserProfile();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-gray-900">Account Settings</h2>
      <p className="mt-1 text-sm text-gray-500 mb-6">
        Your account information.
      </p>

      {/* Profile Picture Section */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Profile Picture
        </label>
        <div className="flex items-center space-x-6">
          <div className="relative">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <UserCircleIcon className="w-24 h-24 text-gray-300" />
            )}
          </div>
        </div>
      </div>

      {/* Personal Information Display */}
      <div className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
              {firstName}
            </div>
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
              {lastName}
            </div>
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
            {email}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings; 