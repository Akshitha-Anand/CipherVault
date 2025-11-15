import React, { useState, useEffect } from 'react';
import { getAllTransactions } from '../../services/databaseService';
import { Transaction, RiskLevel } from '../../types';
import { ActivityIcon } from '../icons';

const riskStyles: { [key in RiskLevel]: string } = {
    [RiskLevel.Idle]: 'border-gray-600',
    [RiskLevel.Low]: 'border-gray-700',
    [RiskLevel.Medium]: 'border-yellow-600/50 bg-yellow-900/10',
    [RiskLevel.High]: 'border-orange-600/50 bg-orange-900/10',
    [RiskLevel.Critical]: 'border-red-600/50 bg-red-900/10',
};

const TransactionItem: React.FC<{ tx: Transaction }> = ({ tx }) => (
    <div className={`p-3 rounded-md border-l-4 ${riskStyles[tx.riskLevel]} transition-colors`}>
        <div className="flex justify-between items-center text-sm">
            <div>
                <span className="font-semibold text-white">{tx.userName}</span>
                <span className="text-gray-400"> to </span>
                <span className="text-gray-300">{tx.recipient}</span>
            </div>
            <span className="font-bold text-white">₹{tx.amount.toLocaleString('en-IN')}</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">{new Date(tx.time).toLocaleString()}</div>
    </div>
);

const LiveTransactionFeed: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTransactions = async () => {
            const data = await getAllTransactions();
            setTransactions(data.slice(0, 20)); // Show latest 20
            setLoading(false);
        };
        fetchTransactions();
    }, []);

    return (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-6 shadow-lg h-80 flex flex-col">
            <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center flex-shrink-0">
                <ActivityIcon className="w-5 h-5 mr-2" />
                Live Transaction Feed
            </h3>
            {loading ? (
                <div className="flex-grow flex items-center justify-center text-gray-400">Loading feed...</div>
            ) : (
                <div className="space-y-3 overflow-y-auto pr-2 flex-grow">
                    {transactions.map(tx => <TransactionItem key={tx.id} tx={tx} />)}
                </div>
            )}
        </div>
    );
};

export default LiveTransactionFeed;