import React, { useState, useEffect } from 'react';
import { getTransactionStatusDistribution } from '../../services/databaseService';
import { BarChartIcon } from '../icons';

interface StatusData {
    name: string;
    value: number;
}

const COLORS: { [key: string]: string } = {
    APPROVED: '#22c55e', // green-500
    CLEARED_BY_ANALYST: '#06b6d4', // cyan-500
    FLAGGED_BY_USER: '#eab308', // yellow-500
    ESCALATED: '#a855f7', // purple-500
    BLOCKED_BY_AI: '#f97316', // orange-500
    BLOCKED_BY_USER: '#ef4444', // red-500
    PENDING: '#6b7280', // gray-500
};

const TransactionStatusChart: React.FC = () => {
    const [data, setData] = useState<StatusData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const distribution = await getTransactionStatusDistribution();
            setData(distribution);
            setLoading(false);
        };
        fetchData();
    }, []);

    const total = data.reduce((sum, item) => sum + item.value, 0);

    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    let accumulatedAngle = 0;

    if (loading) {
         return <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-6 shadow-lg h-full flex items-center justify-center"><p>Loading chart data...</p></div>;
    }

    return (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-6 shadow-lg h-full">
            <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center">
                <BarChartIcon className="w-5 h-5 mr-2" />
                Transaction Status Distribution
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="relative w-full aspect-square max-w-[200px] mx-auto">
                     <svg className="w-full h-full" viewBox="0 0 200 200">
                        {data.map((item) => {
                            const percentage = (item.value / total);
                            const angle = percentage * 360;
                            const strokeDashoffset = circumference * (1 - percentage);
                            
                            const rotation = accumulatedAngle;
                            accumulatedAngle += angle;

                            return (
                                <circle
                                    key={item.name}
                                    cx="100"
                                    cy="100"
                                    r={radius}
                                    fill="transparent"
                                    stroke={COLORS[item.name] || '#9ca3af'}
                                    strokeWidth="20"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    transform={`rotate(${rotation - 90} 100 100)`}
                                />
                            );
                        })}
                    </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-3xl font-bold text-white">{total}</span>
                        <span className="text-sm text-gray-400">Total</span>
                    </div>
                </div>

                <div className="text-sm space-y-2">
                    {data.map(item => (
                        <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[item.name] || '#9ca3af' }}></div>
                                <span className="text-gray-300">{item.name.replace(/_/g, ' ')}</span>
                            </div>
                            <span className="font-mono font-semibold text-white">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TransactionStatusChart;