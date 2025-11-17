import React, { useState, useEffect } from 'react';
import { Transaction, User } from '../../types';
import databaseService from '../../services/databaseService';
import { UserIcon, ActivityIcon, CheckCircle2, ShieldAlertIcon } from '../icons';

interface TransactionDetailModalProps {
  transaction: Transaction;
  onClose: () => void;
}

const DetailRow: React.FC<{ label: string; value: React.ReactNode; }> = ({ label, value }) => (
    <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-md font-semibold text-white">{value}</p>
    </div>
);

const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({ transaction, onClose }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userHistory, setUserHistory] = useState<Transaction[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [fetchedUser, history] = await Promise.all([
                    databaseService.getUser(transaction.userId),
                    databaseService.getUserTransactions(transaction.userId)
                ]);
                setUser(fetchedUser);
                setUserHistory(history.filter(t => t.id !== transaction.id).slice(0, 3));
            } catch (error) {
                console.error("Failed to fetch transaction details:", error);
            }
        };
        fetchData();
    }, [transaction]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-8 max-w-2xl w-full relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl">&times;</button>
                <h2 className="text-2xl font-bold text-orange-400 mb-6">Transaction Investigation Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Transaction & User */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-cyan-300 mb-2 flex items-center gap-2"><ShieldAlertIcon /> Transaction Details</h3>
                            <div className="bg-gray-900/50 p-4 rounded-lg space-y-3">
                                <DetailRow label="Amount" value={`₹${transaction.amount.toLocaleString('en-IN')}`} />
                                <DetailRow label="Recipient" value={transaction.recipient} />
                                <DetailRow label="Location" value={transaction.locationName || 'Unknown'} />
                                <DetailRow label="Time" value={new Date(transaction.time).toLocaleString()} />
                                <DetailRow label="Risk Score" value={`${transaction.riskScore} (${transaction.riskLevel})`} />
                                <DetailRow label="Status" value={transaction.status.replace(/_/g, ' ')} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-cyan-300 mb-2 flex items-center gap-2"><UserIcon /> User Details</h3>
                             <div className="bg-gray-900/50 p-4 rounded-lg space-y-3">
                                <DetailRow label="Name" value={user?.name || 'Loading...'} />
                                <DetailRow label="Email" value={user?.email || 'Loading...'} />
                                <DetailRow label="Account Status" value={user?.status.replace('_', ' ') || 'Loading...'} />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: AI Log & History */}
                    <div className="space-y-6">
                        <div>
                           <h3 className="text-lg font-semibold text-cyan-300 mb-2">AI Analysis Log</h3>
                           <div className="bg-gray-900/50 p-4 rounded-lg max-h-48 overflow-y-auto">
                                <ul className="space-y-1 text-sm text-gray-300">
                                {transaction.aiAnalysisLog.map((log, index) => (
                                    <li key={index} className="flex items-start">
                                        <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 text-cyan-400 flex-shrink-0" />
                                        <span>{log}</span>
                                    </li>
                                ))}
                                </ul>
                           </div>
                        </div>
                        <div>
                           <h3 className="text-lg font-semibold text-cyan-300 mb-2 flex items-center gap-2"><ActivityIcon /> Recent User History</h3>
                           <div className="bg-gray-900/50 p-4 rounded-lg space-y-2">
                                {userHistory.length > 0 ? userHistory.map(tx => (
                                    <div key={tx.id} className="text-sm flex justify-between">
                                        <span className="text-gray-300">₹{tx.amount.toLocaleString('en-IN')} to {tx.recipient}</span>
                                        <span className="text-gray-500 text-xs">{new Date(tx.time).toLocaleDateString()}</span>
                                    </div>
                                )) : <p className="text-sm text-gray-400">No other recent transactions found.</p>}
                           </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default TransactionDetailModal;
