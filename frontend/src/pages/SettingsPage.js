// frontend/src/pages/SettingsPage.js

import React, { useState } from "react";
import { toast } from "react-hot-toast";
import {
  UserIcon,
  Cog6ToothIcon,
  LockClosedIcon,
  EnvelopeIcon,
  CreditCardIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import AccountSettings from '../components/settings/AccountSettings';
import PreferencesSettings from '../components/settings/PreferencesSettings';
import SecuritySettings from '../components/settings/SecuritySettings';
import NotificationSettings from '../components/settings/NotificationSettings';
import BillingSettings from '../components/settings/BillingSettings';
import { useSearchParams } from 'react-router-dom';

const SettingsPage = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'account');
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'account', name: 'Account', icon: UserIcon },
    { id: 'preferences', name: 'Preferences', icon: Cog6ToothIcon },
    { id: 'security', name: 'Security', icon: LockClosedIcon },
    { id: 'notifications', name: 'Notifications', icon: EnvelopeIcon },
    { id: 'billing', name: 'Billing', icon: CreditCardIcon },
  ];

  const getTabContent = (tabId) => {
    switch (tabId) {
      case 'account':
        return <AccountSettings />;
      case 'preferences':
        return <PreferencesSettings />;
      case 'security':
        return <SecuritySettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'billing':
        return <BillingSettings />;
      default:
        return <AccountSettings />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <div className="w-64 bg-white rounded-lg shadow">
            <nav className="space-y-1 p-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                    activeTab === tab.id
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <tab.icon
                    className={`mr-3 h-5 w-5 ${
                      activeTab === tab.id
                        ? 'text-purple-500'
                        : 'text-gray-400'
                    }`}
                  />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 bg-white rounded-lg shadow">
            {getTabContent(activeTab)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
