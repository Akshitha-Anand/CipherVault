import React from 'react';
import ActivityFeed from '../components/Analyst/ActivityFeed';
import VerificationAlerts from '../components/Analyst/VerificationAlerts';

export default function SecurityAnalystPage() {
  return (
    <div className="space-y-8">
       <div className="text-center">
        <h2 className="text-3xl font-bold text-orange-400">Security Analyst Console</h2>
        <p className="text-gray-400">Review and respond to high-risk and user-flagged activities.</p>
      </div>
      <VerificationAlerts />
      <ActivityFeed />
    </div>
  );
}