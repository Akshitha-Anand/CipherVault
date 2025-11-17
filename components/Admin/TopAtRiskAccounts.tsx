import React, { useState, useEffect } from 'react';
import databaseService from '../../services/databaseService';
import { User } from '../../types';
import { ShieldAlertIcon } from '../icons';

interface UserRiskStat {
    user: User;
    highRiskCount: number;
    flaggedCount: number;
}

const TopAtRiskAccounts: React.FC = () => {
    const [users, setUsers] = useState<UserRiskStat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const data = await databaseService.getUsersWithRiskStats();
                setUsers(data.slice(0, 5)); // Top 5
            } catch (error) {
                console.error("Failed to fetch at-risk users:", error);
            }
            setLoading(false);
        };
        fetchUsers();
    }, []);

    return (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center">
                <ShieldAlertIcon className="w-5 h-5 mr-2 text-red-400" />
                Top At-Risk Accounts
            </h3>
            {loading ? (
                <div className="text-gray-400">Analyzing user data...</div>
            ) : users.length === 0 ? (
                 <div className="text-gray-400 text-center py-4">No accounts currently show high-risk patterns.</div>
            ) : (
                <div className="space-y-4">
                    {users.map(({ user, highRiskCount, flaggedCount }) => (
                        <div key={user.id} className="bg-gray-900/50 p-3 rounded-md">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-white">{user.name}</p>
                                    <p className="text-xs text-gray-500">{user.email}</p>
                                </div>
                                <div className="text-right text-xs space-y-1">
                                    <p><span className="font-bold text-orange-400">{highRiskCount}</span> high-risk txns</p>
                                    <p><span className="font-bold text-red-400">{flaggedCount}</span> flagged/blocked</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TopAtRiskAccounts;
