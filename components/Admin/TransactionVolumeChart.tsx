import React, { useState, useEffect } from 'react';
import { getAllTransactions } from '../../services/databaseService';
import { Transaction } from '../../types';
import { BarChartIcon } from '../icons';

const TransactionVolumeChart: React.FC = () => {
    const [data, setData] = useState<number[]>([]);
    const [labels, setLabels] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const processData = async () => {
            const transactions = await getAllTransactions();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const dailyCounts = new Array(30).fill(0);
            const dateLabels = new Array(30).fill('');

            for (let i = 0; i < 30; i++) {
                const date = new Date();
                date.setDate(date.getDate() - (29 - i));
                dateLabels[i] = `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`;
            }

            transactions.forEach(tx => {
                const txDate = new Date(tx.time);
                if (txDate >= thirtyDaysAgo) {
                    const diffTime = Math.abs(new Date().getTime() - txDate.getTime());
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    const index = 29 - diffDays;
                    if (index >= 0 && index < 30) {
                        dailyCounts[index]++;
                    }
                }
            });
            
            setData(dailyCounts);
            setLabels(dateLabels);
            setLoading(false);
        };
        processData();
    }, []);

    const maxValue = Math.max(...data, 1);
    const points = data.map((value, index) => {
        const x = (index / (data.length - 1)) * 100;
        const y = 100 - (value / maxValue) * 100;
        return `${x},${y}`;
    }).join(' ');

    const areaPoints = `0,100 ${points} 100,100`;

    if (loading) {
        return (
             <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-6 shadow-lg h-80 flex items-center justify-center">
                <p className="text-gray-400">Loading chart data...</p>
             </div>
        )
    }

    return (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-6 shadow-lg h-80">
            <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center">
                <BarChartIcon className="w-5 h-5 mr-2" />
                Transaction Volume (Last 30 Days)
            </h3>
            <div className="w-full h-full max-h-56 relative">
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
                    <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                     {/* Grid lines */}
                    {[...Array(5)].map((_, i) => (
                        <line key={i} x1="0" y1={i * 25} x2="100" y2={i * 25} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                    ))}
                    <polygon points={areaPoints} fill="url(#areaGradient)" />
                    <polyline points={points} fill="none" stroke="#06b6d4" strokeWidth="0.75" />
                </svg>
                 <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs text-gray-500">
                    <span>{labels[0]}</span>
                    <span>{labels[Math.floor(labels.length / 2)]}</span>
                    <span>{labels[labels.length - 1]}</span>
                </div>
            </div>
        </div>
    );
};

export default TransactionVolumeChart;