// frontend/src/components/settings/BillingSettings.js

import React, { useState } from "react";
import { CreditCardIcon } from "@heroicons/react/24/outline";

const BillingSettings = () => {
  const [currentPlan, setCurrentPlan] = useState('free');
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [billingHistory] = useState([
    {
      id: 1,
      date: 'Mar 1, 2024',
      amount: '$0.00',
      status: 'Paid',
      description: 'Free Plan - Monthly'
    },
    {
      id: 2,
      date: 'Feb 1, 2024',
      amount: '$0.00',
      status: 'Paid',
      description: 'Free Plan - Monthly'
    }
  ]);

  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-gray-900">Billing</h2>
      <p className="mt-1 text-sm text-gray-500 mb-6">
        Manage your subscription and billing information.
      </p>

      <div className="space-y-6 max-w-3xl">
        {/* Current Plan */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Current Plan</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Free Plan</p>
              <p className="text-sm text-gray-500">Basic features for personal use</p>
            </div>
            <button
              className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Upgrade Plan
            </button>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">Payment Method</h3>
            {!paymentMethod && (
              <button
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                Add Payment Method
              </button>
            )}
          </div>
          
          {paymentMethod ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="mr-3">
                  <CreditCardIcon className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    •••• •••• •••• 4242
                  </p>
                  <p className="text-sm text-gray-500">Expires 12/24</p>
                </div>
              </div>
              <button
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                Edit
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No payment method added
            </p>
          )}
        </div>

        {/* Billing History */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Billing History</h3>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Receipt
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {billingHistory.map((bill) => (
                  <tr key={bill.id}>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {bill.date}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {bill.description}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {bill.amount}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {bill.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                      <button className="text-purple-600 hover:text-purple-700">
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Plan Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Plan Details</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Plan</span>
              <span className="text-sm font-medium text-gray-900">Free Plan</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Billing Period</span>
              <span className="text-sm font-medium text-gray-900">Monthly</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Next Payment</span>
              <span className="text-sm font-medium text-gray-900">Apr 1, 2024</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingSettings; 