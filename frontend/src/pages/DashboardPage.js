// frontend/src/pages/DashboardPage.js

import React from 'react';
import {
  ArrowTopRightOnSquareIcon,
  Cog6ToothIcon,
  FilmIcon,
  BookmarkIcon,
  NumberedListIcon,
  CalendarDaysIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';

/**
 * Example card data. Each entry has:
 * - title
 * - description
 * - Icon (imported Hero Icon or your own SVG)
 * - iconBg color (Tailwind class)
 */
const cards = [
  {
    title: 'Process Clips',
    // Updated description:
    description: 'Quickly convert 16:9 podcast clips into perfect 9:16 vertical content with a single click. Ideal for mobile audiences.',
    Icon: FilmIcon,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-500',
  },
  {
    title: 'Publish Clips',
    // Updated description:
    description: 'Post your freshly edited reels, Shorts, or TikToks directly to your social media accounts—no extra steps needed.',
    Icon: BookmarkIcon,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-500',
  },
  {
    title: 'View To-Do',
    // Updated description:
    description: 'Keep track of every step in your content workflow, from planning to final release, all in one organized list.',
    Icon: NumberedListIcon,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
  },
  {
    title: 'View Calendar',
    // Updated description:
    description: 'Stay on schedule by viewing all your upcoming content deadlines, events, and publishing dates at a glance.',
    Icon: CalendarDaysIcon,
    iconBg: 'bg-yellow-50',
    iconColor: 'text-yellow-500',
  },
  {
    title: 'Manage Subscriptions',
    // Simple explanation:
    description: 'Change your plan, update payment details, and manage your active subscriptions and billing preferences.',
    Icon: CreditCardIcon,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
  },
  {
    title: 'Account Settings',
    // Simple explanation:
    description: 'Update your personal information, configure app preferences, and control your security and privacy settings.',
    Icon: Cog6ToothIcon,
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-500',
  },
];

function DashboardPage() {
  return (
    <div className="px-8 py-6">
      {/* Big Heading */}
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card, index) => (
          <div
            key={index}
            className="relative flex items-start rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow"
          >
            {/* Icon container */}
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-md ${card.iconBg} mr-4`}
            >
              <card.Icon className={`h-6 w-6 ${card.iconColor}`} />
            </div>

            {/* Text content (title + description) */}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800">
                {card.title}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {card.description}
              </p>
            </div>

            {/* Arrow icon in top-right */}
            <ArrowTopRightOnSquareIcon
              className="absolute top-4 right-4 h-5 w-5 text-gray-300 
                         group-hover:text-gray-400 transition-colors"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;
