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

const StabilityScoreGauge: React.FC<{ score: number }> = ({ score }) => {
    const scoreColorClass = score > 75 ? 'text-green-400' : score > 40 ? 'text-yellow-400' : 'text-red-400';
    const scoreBgClass = score > 75 ? 'bg-green-900/50' : score > 40 ? 'bg-yellow-900/50' : 'bg-red-900/50';
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className={`relative flex flex-col items-center justify-center p-4 rounded-lg ${scoreBgClass}`}>
            <svg className="w-28 h-28 transform -rotate-90">
                <circle
                    className="text-gray-700"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="56"
                    cy="56"
                />
                <circle
                    className={scoreColorClass}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="56"
                    cy="56"
                    style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className={`text-3xl font-bold ${scoreColorClass}`}>{score}</span>
                <span className="text-xs text-gray-400">Stability Score</span>
            </div>
        </div>
    );
};


const AccountHealthDashboard: React.FC<AccountHealthDashboardProps> = ({ stats }) => {
    const { status, totalTransactions, monthlySpending, riskBreakdown, stabilityScore } = stats;
    const totalRiskTransactions = riskBreakdown.low + riskBreakdown.medium + riskBreakdown.high;

    const riskPercentage = (riskCount: number) => {
        if (totalRiskTransactions === 0) return 0;
        return (riskCount / totalRiskTransactions) * 100;
    }

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">Account Health Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-1">
                    <StabilityScoreGauge score={stabilityScore} />
                </div>
                <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                     <div className="bg-gray-900/50 p-4 rounded-lg md:col-span-2 lg:col-span-3">
                         <div className="flex items-center space-x-2 mb-3">
                            <BarChartIcon className="w-5 h-5 text-orange-400" />
                            <h3 className="text-sm text-gray-400 font-semibold">Risk Profile (All Time)</h3>
                         </div>
                         <div className="space-y-2 text-xs">
                            <div className="flex items-center">
                                <span className="w-24 text-gray-400">Low Risk ({riskBreakdown.low})</span>
                                <div className="flex-1 bg-gray-700 rounded-full h-5">
                                    <div className="bg-green-500 h-5 rounded-full flex items-center justify-center text-white font-bold" style={{ width: `${riskPercentage(riskBreakdown.low)}%` }}>
                                        {riskPercentage(riskBreakdown.low) > 10 ? `${riskPercentage(riskBreakdown.low).toFixed(0)}%` : ''}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <span className="w-24 text-gray-400">Medium Risk ({riskBreakdown.medium})</span>
                                <div className="flex-1 bg-gray-700 rounded-full h-5">
                                    <div className="bg-yellow-500 h-5 rounded-full flex items-center justify-center text-gray-900 font-bold" style={{ width: `${riskPercentage(riskBreakdown.medium)}%` }}>
                                         {riskPercentage(riskBreakdown.medium) > 10 ? `${riskPercentage(riskBreakdown.medium).toFixed(0)}%` : ''}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <span className="w-24 text-gray-400">High Risk ({riskBreakdown.high})</span>
                                <div className="flex-1 bg-gray-700 rounded-full h-5">
                                    <div className="bg-red-500 h-5 rounded-full flex items-center justify-center text-white font-bold" style={{ width: `${riskPercentage(riskBreakdown.high)}%` }}>
                                         {riskPercentage(riskBreakdown.high) > 10 ? `${riskPercentage(riskBreakdown.high).toFixed(0)}%` : ''}
                                    </div>
                                </div>
                            </div>
                         </div>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default AccountHealthDashboard;