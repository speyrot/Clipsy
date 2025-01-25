// frontend/src/components/settings/SecuritySettings.js

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { supabase } from "../../utils/supabaseClient";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axios";

const SecuritySettings = () => {
  const navigate = useNavigate();
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await axiosInstance.get('/users/me');
        setCurrentEmail(response.data.email);
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

  const handleEmailChange = async () => {
    try {
      setLoading(true);

      // Basic validation
      if (!newEmail) {
        toast.error('New email is required', {
          duration: 4000,
          position: 'bottom-right',
        });
        return;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        toast.error('Please enter a valid email address', {
          duration: 4000,
          position: 'bottom-right',
        });
        return;
      }

      // Update email through Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (updateError) throw updateError;

      // Clear form and show success message
      setNewEmail('');
      setIsChangingEmail(false);
      
      toast.success('Email verification sent. Please check your new email.', {
        duration: 4000,
        position: 'bottom-right',
      });

    } catch (error) {
      console.error('Email change error:', error);
      toast.error(error.message || 'Failed to update email', {
        duration: 4000,
        position: 'bottom-right',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      setLoading(true);

      // Basic validation
      if (!currentPassword || !newPassword || !confirmPassword) {
        toast.error('All password fields are required', {
          duration: 4000,
          position: 'bottom-right',
        });
        return;
      }

      if (newPassword !== confirmPassword) {
        toast.error('New passwords do not match', {
          duration: 4000,
          position: 'bottom-right',
        });
        return;
      }

      if (newPassword.length < 6) {
        toast.error('New password must be at least 6 characters long', {
          duration: 4000,
          position: 'bottom-right',
        });
        return;
      }

      // First verify the current password
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.email) {
        toast.error('Unable to verify current user', {
          duration: 4000,
          position: 'bottom-right',
        });
        return;
      }

      // Try to sign in with current password to verify it
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.user.email,
        password: currentPassword,
      });

      if (signInError) {
        toast.error('Current password is incorrect', {
          duration: 4000,
          position: 'bottom-right',
        });
        return;
      }

      // If current password is correct, proceed with password update
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      // Clear form and show success message
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);
      
      toast.success('Password updated successfully', {
        duration: 4000,
        position: 'bottom-right',
      });

    } catch (error) {
      console.error('Password change error:', error);
      toast.error(error.message || 'Failed to update password', {
        duration: 4000,
        position: 'bottom-right',
      });
    } finally {
      setLoading(false);
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
              <p className="text-sm text-gray-500">Update your password</p>
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
                  disabled={loading}
                  className={`px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium 
                    ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700'} 
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500`}
                >
                  {loading ? 'Updating...' : 'Update Password'}
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