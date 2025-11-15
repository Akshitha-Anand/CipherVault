import React from 'react';
import { AccountHealthStats } from '../types';
import { ShieldCheckIcon, ActivityIcon, TrendingUpIcon, BarChartIcon } from './icons';

interface AccountHealthDashboardProps {
    stats: AccountHealthStats;
}

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string | number; description?: string }> = ({ icon, title, value, description }) => (
    <div className="bg-gray-900/50 p-4 rounded-lg flex items-start space-x-4">
        <div className="flex-shrink-0 w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-xl font-bold text-white">{value}</p>
            {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
    </div>
);


const AccountHealthDashboard: React.FC<AccountHealthDashboardProps> = ({ stats }) => {
    const { status, totalTransactions, monthlySpending, riskBreakdown } = stats;
    const totalRiskTransactions = riskBreakdown.low + riskBreakdown.medium + riskBreakdown.high;

    const riskPercentage = (riskCount: number) => {
        if (totalRiskTransactions === 0) return '0%';
        return `${((riskCount / totalRiskTransactions) * 100).toFixed(1)}%`;
    }

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">Account Health Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    icon={<ShieldCheckIcon className="w-6 h-6 text-green-400" />}
                    title="Account Status"
                    value={status}
                    description="Your account is secure."
                />
                <StatCard 
                    icon={<ActivityIcon className="w-6 h-6 text-cyan-400" />}
                    title="Total Transactions"
                    value={totalTransactions}
                    description="All-time transaction count."
                />
                <StatCard 
                    icon={<TrendingUpIcon className="w-6 h-6 text-yellow-400" />}
                    title="Monthly Spending"
                    value={`₹${monthlySpending.toLocaleString('en-IN')}`}
                    description="Current month's total."
                />
                 <div className="bg-gray-900/50 p-4 rounded-lg">
                     <div className="flex items-center space-x-2 mb-2">
                        <BarChartIcon className="w-5 h-5 text-orange-400" />
                        <h3 className="text-sm text-gray-400 font-semibold">Risk Profile</h3>
                     </div>
                     <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                            <span className="text-green-400">Low Risk</span>
                            <span className="font-mono text-gray-300">{riskBreakdown.low} ({riskPercentage(riskBreakdown.low)})</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-yellow-400">Medium Risk</span>
                            <span className="font-mono text-gray-300">{riskBreakdown.medium} ({riskPercentage(riskBreakdown.medium)})</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-red-400">High Risk</span>
                             <span className="font-mono text-gray-300">{riskBreakdown.high} ({riskPercentage(riskBreakdown.high)})</span>
                        </div>
                     </div>
                 </div>
            </div>
        </div>
    );
};

export default AccountHealthDashboard;