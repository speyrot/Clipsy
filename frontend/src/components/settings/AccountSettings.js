// frontend/src/components/settings/AccountSettings.js

import React, { useState, useEffect } from "react";
import { UserCircleIcon } from "@heroicons/react/24/solid";
import { toast } from "react-hot-toast";
import axiosInstance from "../../utils/axios";
import { useDropzone } from "react-dropzone";

const AccountSettings = () => {
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    profilePicture: null
  });

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    onDrop: async (acceptedFiles) => {
      try {
        const file = acceptedFiles[0];
        const formData = new FormData();
        formData.append('file', file);

        const response = await axiosInstance.put(
          '/users/profile-picture',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );

        setUserData(prev => ({
          ...prev,
          profilePicture: `${response.data.profile_picture_url}?ts=${Date.now()}`
        }));
        
        toast.success('Profile picture updated successfully', {
          duration: 4000,
          position: 'bottom-right',
        });

      } catch (error) {
        console.error('Upload error:', error);
        const errorMessage = error.response?.data?.detail || 'Failed to upload image';
        toast.error(errorMessage, {
          duration: 4000,
          position: 'bottom-right',
        });
      }
    }
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await axiosInstance.get('/users/me');
        setUserData({
          firstName: response.data.first_name || '',
          lastName: response.data.last_name || '',
          email: response.data.email || '',
          profilePicture: response.data.profile_picture_url
        });
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
          <div 
            {...getRootProps()}
            className="cursor-pointer relative group"
          >
            <input {...getInputProps()} />
            {userData.profilePicture ? (
              <img
                src={userData.profilePicture}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover group-hover:opacity-75 transition-opacity"
              />
            ) : (
              <UserCircleIcon className="w-24 h-24 text-gray-300 group-hover:text-gray-400 transition-colors" />
            )}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity rounded-full flex items-center justify-center">
              <span className="text-white opacity-0 group-hover:opacity-100 text-sm">
                Change Photo
              </span>
            </div>
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
              {userData.firstName}
            </div>
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
              {userData.lastName}
            </div>
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
            {userData.email}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings; 