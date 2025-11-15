import React from 'react';
import { UserAnalyticsData } from '../../types';
import { BarChartIcon, PieChartIcon, TrendingUpIcon } from '../icons';

const SPENDING_CATEGORY_COLORS = [
    '#06b6d4', // cyan-500
    '#3b82f6', // blue-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#f97316', // orange-500
    '#eab308', // yellow-500
    '#22c55e', // green-500
    '#64748b', // slate-500
];

const SpendingOverTimeChart: React.FC<{ data: UserAnalyticsData['spendingOverTime'] }> = ({ data }) => {
    const maxValue = Math.max(...data.map(d => d.amount), 1);
    const chartHeight = 150;

    return (
        <div className="h-full flex flex-col">
             <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center flex-shrink-0">
                <BarChartIcon className="w-5 h-5 mr-2" />
                Spending Last 30 Days
            </h3>
            <div className="flex-grow flex items-end justify-between gap-1 px-2">
                {data.map((day, index) => {
                    const barHeight = (day.amount / maxValue) * chartHeight;
                    const date = new Date(day.date);
                    const isToday = new Date().toDateString() === date.toDateString();

                    return (
                         <div key={index} className="flex-1 group flex flex-col items-center">
                            <div className="relative w-full h-[150px] flex items-end">
                                <div 
                                    className={`w-full ${day.amount > 0 ? 'bg-cyan-600' : 'bg-gray-700'} rounded-t-sm group-hover:bg-cyan-400 transition-all duration-200`}
                                    style={{ height: `${barHeight}px` }}
                                ></div>
                            </div>
                            <span className={`text-xs mt-1 ${isToday ? 'text-cyan-400 font-bold' : 'text-gray-500'}`}>
                                {date.getDate()}
                            </span>
                         </div>
                    );
                })}
            </div>
        </div>
    );
};


const SpendingByCategoryChart: React.FC<{ data: UserAnalyticsData['spendingByCategory'] }> = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item.amount, 0);
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    let accumulatedAngle = 0;

    return (
        <div className="h-full">
            <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center">
                <PieChartIcon className="w-5 h-5 mr-2" />
                Spending by Category
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center h-full">
                 <div className="relative w-full aspect-square max-w-[160px] mx-auto">
                     <svg className="w-full h-full" viewBox="0 0 160 160">
                        {data.map((item, index) => {
                            const percentage = (item.amount / total);
                            const angle = percentage * 360;
                            const strokeDashoffset = circumference * (1 - percentage);
                            
                            const rotation = accumulatedAngle;
                            accumulatedAngle += angle;

                            return (
                                <circle
                                    key={item.category}
                                    cx="80"
                                    cy="80"
                                    r={radius}
                                    fill="transparent"
                                    stroke={SPENDING_CATEGORY_COLORS[index % SPENDING_CATEGORY_COLORS.length]}
                                    strokeWidth="20"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    transform={`rotate(${rotation - 90} 80 80)`}
                                />
                            );
                        })}
                    </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-bold text-white">₹{Math.round(total/1000)}k</span>
                        <span className="text-xs text-gray-400">Total</span>
                    </div>
                </div>
                <div className="text-sm space-y-2">
                    {data.slice(0, 5).map((item, index) => (
                        <div key={item.category} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SPENDING_CATEGORY_COLORS[index % SPENDING_CATEGORY_COLORS.length] }}></div>
                                <span className="text-gray-300">{item.category}</span>
                            </div>
                            <span className="font-mono font-semibold text-white">₹{item.amount.toLocaleString('en-IN')}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const TopPayeesList: React.FC<{ data: UserAnalyticsData['topPayees'] }> = ({ data }) => {
    return (
        <div>
            <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center">
                <TrendingUpIcon className="w-5 h-5 mr-2" />
                Top Payees
            </h3>
            <div className="space-y-3">
                {data.map((payee, index) => (
                    <div key={index} className="flex justify-between items-center bg-gray-900/50 p-3 rounded-md">
                        <span className="font-medium text-white text-sm">{payee.recipient}</span>
                        <span className="font-mono text-sm text-cyan-300">₹{payee.amount.toLocaleString('en-IN')}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const UserAnalyticsDashboard: React.FC<{ analytics: UserAnalyticsData }> = ({ analytics }) => {
    return (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 shadow-lg">
            <h2 className="text-2xl font-semibold mb-6 text-cyan-300">My Analytics</h2>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-gray-900/50 p-4 rounded-lg">
                     <SpendingOverTimeChart data={analytics.spendingOverTime} />
                </div>
                <div className="lg:col-span-2 bg-gray-900/50 p-4 rounded-lg">
                    <SpendingByCategoryChart data={analytics.spendingByCategory} />
                </div>
            </div>
            <div className="mt-8 bg-gray-900/50 p-4 rounded-lg">
                <TopPayeesList data={analytics.topPayees} />
            </div>
        </div>
    );
};

export default UserAnalyticsDashboard;