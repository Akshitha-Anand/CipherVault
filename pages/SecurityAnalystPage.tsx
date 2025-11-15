import React from 'react';
import ActivityFeed from '../components/Analyst/ActivityFeed';

export default function SecurityAnalystPage() {
  return (
    <div>
       <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-orange-400">Security Analyst Console</h2>
        <p className="text-gray-400">Review and respond to high-risk and user-flagged activities.</p>
      </div>
      <ActivityFeed />
    </div>
  );
}
