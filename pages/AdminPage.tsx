import React from 'react';
import AnalyticsDashboard from '../components/Admin/AnalyticsDashboard';
import TransactionVolumeChart from '../components/Admin/TransactionVolumeChart';
import LiveTransactionFeed from '../components/Admin/LiveTransactionFeed';
import TopAtRiskAccounts from '../components/Admin/TopAtRiskAccounts';
import RiskHotspots from '../components/Admin/RiskHotspots';
import WorkflowAnalysisChart from '../components/Admin/WorkflowAnalysisChart';
import TransactionStatusChart from '../components/Admin/TransactionStatusChart';
import EscalatedAlerts from '../components/Admin/EscalatedAlerts';
import BlockedAccountsManager from '../components/Admin/BlockedAccountsManager';

export default function AdminPage() {
  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-cyan-400">Security Operations Center</h2>
        <p className="text-gray-400">Platform-wide security and transactional overview.</p>
      </div>
      
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