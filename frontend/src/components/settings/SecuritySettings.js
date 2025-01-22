// frontend/src/components/settings/SecuritySettings.js

import React, { useState } from "react";
import { toast } from "react-hot-toast";

const SecuritySettings = () => {
  const [currentEmail, setCurrentEmail] = useState('john.smith@example.com');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleEmailChange = async () => {
    try {
      // TODO: Implement API call to change email
      toast.success('Email updated successfully');
      setCurrentEmail(newEmail);
      setNewEmail('');
      setIsChangingEmail(false);
    } catch (error) {
      toast.error('Failed to update email');
    }
  };

  const handlePasswordChange = async () => {
    try {
      if (newPassword !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
      // TODO: Implement API call to change password
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);
    } catch (error) {
      toast.error('Failed to update password');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-gray-900">Security</h2>
      <p className="mt-1 text-sm text-gray-500 mb-6">
        Manage your email and password settings.
      </p>

      <div className="space-y-6 max-w-2xl">
        {/* Email Section */}
        <div className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Email Address</h3>
              <p className="text-sm text-gray-500">{currentEmail}</p>
            </div>
            <button
              onClick={() => setIsChangingEmail(!isChangingEmail)}
              className="text-sm text-purple-600 hover:text-purple-700"
            >
              {isChangingEmail ? 'Cancel' : 'Change'}
            </button>
          </div>

          {isChangingEmail && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Email Address
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter new email address"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleEmailChange}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Update Email
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Password Section */}
        <div className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Password</h3>
              <p className="text-sm text-gray-500">Last changed 30 days ago</p>
            </div>
            <button
              onClick={() => setIsChangingPassword(!isChangingPassword)}
              className="text-sm text-purple-600 hover:text-purple-700"
            >
              {isChangingPassword ? 'Cancel' : 'Change'}
            </button>
          </div>

          {isChangingPassword && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Confirm new password"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handlePasswordChange}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Update Password
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings; 