
import React, { useState } from 'react';
import AnalyticsDashboard from '../components/Admin/AnalyticsDashboard';
import TransactionVolumeChart from '../components/Admin/TransactionVolumeChart';
import LiveTransactionFeed from '../components/Admin/LiveTransactionFeed';
import TopAtRiskAccounts from '../components/Admin/TopAtRiskAccounts';
import RiskHotspots from '../components/Admin/RiskHotspots';
import WorkflowAnalysisChart from '../components/Admin/WorkflowAnalysisChart';
import TransactionStatusChart from '../components/Admin/TransactionStatusChart';
import EscalatedAlerts from '../components/Admin/EscalatedAlerts';
import BlockedAccountsManager from '../components/Admin/BlockedAccountsManager';
import DBInspector from '../components/Admin/DBInspector';
import { ArrowRightIcon } from '../components/icons';

export default function AdminPage() {
  const [showInspector, setShowInspector] = useState(false);

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-cyan-400">Security Operations Center</h2>
        <p className="text-gray-400">Platform-wide security and transactional overview.</p>
         <div className="mt-4">
            <button
                onClick={() => setShowInspector(prev => !prev)}
                className="px-4 py-2 text-sm font-semibold rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors flex items-center gap-2 mx-auto"
            >
                {showInspector ? 'Hide' : 'Show'} Database Inspector
                <ArrowRightIcon className={`w-4 h-4 transition-transform ${showInspector ? 'rotate-90' : ''}`} />
            </button>
        </div>
      </div>
      
       {showInspector && <DBInspector />}

      <div className="space-y-6">
        <AnalyticsDashboard />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TransactionVolumeChart />
          </div>
          <div className="lg:col-span-1">
             <LiveTransactionFeed />
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3">
                <WorkflowAnalysisChart />
            </div>
            <div className="lg:col-span-2">
                <TransactionStatusChart />
            </div>
        </div>

        <BlockedAccountsManager />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopAtRiskAccounts />
          <RiskHotspots />
        </div>
        
        <EscalatedAlerts />

      </div>
    </div>
  );
}
