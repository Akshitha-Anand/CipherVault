import React, { useState, useEffect } from 'react';
import { getPlatformStats } from '../../services/databaseService';
import { UsersIcon, ActivityIcon, DollarSignIcon, ShieldAlertIcon, BarChartIcon } from '../icons';

interface PlatformStats {
    totalUsers: number;
    totalTransactions: number;
    totalValue: number;
    atRiskAccounts: number;
    riskBreakdown: {
        low: number;
        medium: number;
        high: number;
    };
}

const StatCard: React.FC<{ icon: React.ReactElement<{ className?: string }>; title: string; value: string | number; description?: string; colorClass: string }> = ({ icon, title, value, description, colorClass }) => (
    <div className="bg-gray-800/60 p-4 rounded-lg flex items-start space-x-4 border border-gray-700/50">
        <div className={`flex-shrink-0 w-12 h-12 bg-gray-900/50 border ${colorClass.replace('text', 'border')} rounded-lg flex items-center justify-center`}>
            {React.cloneElement(icon, { className: `w-6 h-6 ${colorClass}` })}
        </div>
        <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
    </div>
);

const AnalyticsDashboard: React.FC = () => {
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            const data = await getPlatformStats();
            setStats(data);
            setLoading(false);
        };
        fetchStats();
    }, []);

    if (loading || !stats) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array(4).fill(0).map((_, i) => (
                    <div key={i} className="bg-gray-800/60 p-4 rounded-lg h-24 animate-pulse border border-gray-700/50"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
                icon={<UsersIcon />}
                title="Total Users"
                value={stats.totalUsers.toLocaleString()}
                colorClass="text-cyan-400"
            />
            <StatCard 
                icon={<ActivityIcon />}
                title="Total Transactions"
                value={stats.totalTransactions.toLocaleString()}
                colorClass="text-blue-400"
            />
            <StatCard 
                icon={<DollarSignIcon />}
                title="Total Value (INR)"
                value={`₹${stats.totalValue.toLocaleString('en-IN')}`}
                colorClass="text-green-400"
            />
            <StatCard 
                icon={<ShieldAlertIcon />}
                title="At-Risk Accounts"
                value={stats.atRiskAccounts.toLocaleString()}
                colorClass="text-red-400"
            />
        </div>
    );
};

export default AnalyticsDashboard;