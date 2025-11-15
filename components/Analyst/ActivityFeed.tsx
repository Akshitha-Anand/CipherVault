import React, { useState, useEffect, useCallback } from 'react';
import { getSuspiciousActivity, updateUserStatus, updateTransactionStatus } from '../../services/databaseService';
import { Transaction } from '../../types';
import { AlertTriangleIcon, CheckCircle2, ShieldOffIcon, ShieldCheckIcon, InfoIcon, ChevronUpIcon } from '../icons';
import TransactionDetailModal from './TransactionDetailModal';

const riskStyles = {
    MEDIUM: {
        icon: <AlertTriangleIcon className="w-5 h-5 text-yellow-400" />,
        borderColor: 'border-yellow-600'
    },
    HIGH: {
        icon: <AlertTriangleIcon className="w-5 h-5 text-orange-400" />,
        borderColor: 'border-orange-600'
    },
    CRITICAL: {
        icon: <AlertTriangleIcon className="w-5 h-5 text-red-400" />,
        borderColor: 'border-red-600'
    },
    LOW: { icon: null, borderColor: '' },
    IDLE: { icon: null, borderColor: '' }
};

const statusPill = (status: Transaction['status']) => {
    const styles: { [key in Transaction['status']]: string } = {
        PENDING: 'bg-gray-500 text-white',
        APPROVED: 'bg-green-500/20 text-green-300',
        BLOCKED_BY_AI: 'bg-red-500/20 text-red-300',
        FLAGGED_BY_USER: 'bg-yellow-500/30 text-yellow-200 animate-pulse',
        BLOCKED_BY_USER: 'bg-red-500/30 text-red-200 font-bold animate-pulse',
        CLEARED_BY_ANALYST: 'bg-cyan-500/20 text-cyan-300',
        ESCALATED: 'bg-purple-500/30 text-purple-200',
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${styles[status]}`}>{status.replace(/_/g, ' ')}</span>;
};


const ActivityFeed: React.FC = () => {
    const [activity, setActivity] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

    const fetchActivity = useCallback(async () => {
        setLoading(true);
        const data = await getSuspiciousActivity();
        setActivity(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchActivity();
    }, [fetchActivity]);
    
    const handleBlockAccount = async (userId: string, transactionId: string) => {
        await updateUserStatus(userId, 'BLOCKED');
        await updateTransactionStatus(transactionId, 'BLOCKED_BY_AI');
        fetchActivity();
    };

    const handleMarkSafe = async (transactionId: string) => {
        await updateTransactionStatus(transactionId, 'CLEARED_BY_ANALYST');
        fetchActivity();
    };

    const handleRequestInfo = async (userId: string) => {
        await updateUserStatus(userId, 'UNDER_REVIEW');
        fetchActivity();
    };
    
    const handleEscalate = async (transactionId: string) => {
        await updateTransactionStatus(transactionId, 'ESCALATED');
        fetchActivity();
    };

    if (loading) {
        return <div className="text-center p-8">Loading activity feed...</div>;
    }

    return (
        <>
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-orange-300 mb-4">Unusual Activity Feed</h3>
            {activity.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                    <CheckCircle2 className="w-12 h-12 mx-auto text-gray-600 mb-2" />
                    No suspicious activities to review.
                </div>
            ) : (
                <div className="space-y-4">
                    {activity.map(tx => {
                         const style = riskStyles[tx.riskLevel];
                         const isActionable = tx.status !== 'CLEARED_BY_ANALYST' && tx.status !== 'APPROVED';
                        return (
                        <div key={tx.id} className={`bg-gray-900/50 p-4 rounded-lg border-l-4 ${style.borderColor}`}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                    {style.icon}
                                    <div>
                                        <span className="font-bold text-white">₹{tx.amount.toLocaleString('en-IN')}</span>
                                        <span className="text-gray-400"> to </span>
                                        <span>{tx.recipient}</span>
                                    </div>
                                    <div className="text-sm text-gray-400">(Score: {tx.riskScore})</div>
                                </div>
                                <div className="flex items-center gap-3">
                                   {statusPill(tx.status)}
                                   <div className="text-xs text-gray-500">{new Date(tx.time).toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="border-t border-gray-700 my-3"></div>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-sm">
                                    <span className="text-gray-400">User: </span>
                                    <span className="font-medium">{tx.userName}</span>
                                    <span className="text-gray-500"> ({tx.userId})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setSelectedTxn(tx)} className="px-3 py-1 text-xs font-semibold rounded-md bg-blue-600/50 text-blue-300 hover:bg-blue-600/80 flex items-center gap-1">
                                        <InfoIcon className="w-4 h-4" /> Details
                                    </button>
                                    {isActionable && (
                                    <>
                                        <button onClick={() => handleMarkSafe(tx.id)} className="px-3 py-1 text-xs font-semibold rounded-md bg-green-600/50 text-green-300 hover:bg-green-600/80 flex items-center gap-1">
                                            <ShieldCheckIcon className="w-4 h-4" /> Mark Safe
                                        </button>
                                        <button onClick={() => handleRequestInfo(tx.userId)} className="px-3 py-1 text-xs font-semibold rounded-md bg-yellow-600/50 text-yellow-300 hover:bg-yellow-600/80 flex items-center gap-1">
                                            <InfoIcon className="w-4 h-4" /> Request Info
                                        </button>
                                        <button onClick={() => handleEscalate(tx.id)} className="px-3 py-1 text-xs font-semibold rounded-md bg-purple-600/50 text-purple-300 hover:bg-purple-600/80 flex items-center gap-1">
                                            <ChevronUpIcon className="w-4 h-4" /> Escalate
                                        </button>
                                        <button onClick={() => handleBlockAccount(tx.userId, tx.id)} className="px-3 py-1 text-xs font-semibold rounded-md bg-red-600/50 text-red-300 hover:bg-red-600/80 flex items-center gap-1">
                                            <ShieldOffIcon className="w-4 h-4" /> Block Account
                                        </button>
                                    </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )})}
                </div>
            )}
        </div>
        {selectedTxn && (
            <TransactionDetailModal 
                transaction={selectedTxn}
                onClose={() => setSelectedTxn(null)}
            />
        )}
        </>
    );
};

export default ActivityFeed;