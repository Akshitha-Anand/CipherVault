import React, { useState, useEffect, useCallback } from 'react';
import { getBlockedUsers, updateUserStatus, addAdminNoteToUser } from '../../services/databaseService';
import { User } from '../../types';
import { ShieldAlertIcon, UserCheckIcon, SendIcon, XIcon, InfoIcon } from '../icons';

type Toast = {
    id: number;
    message: string;
    type: 'success' | 'info';
};

const BlockedAccountsManager: React.FC = () => {
    const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [userToReactivate, setUserToReactivate] = useState<User | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const fetchBlockedUsers = useCallback(async () => {
        setLoading(true);
        const users = await getBlockedUsers();
        setBlockedUsers(users);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchBlockedUsers();
    }, [fetchBlockedUsers]);

    const showToast = (message: string, type: 'success' | 'info' = 'info') => {
        const newToast = { id: Date.now(), message, type };
        setToasts(prevToasts => [...prevToasts, newToast]);
        setTimeout(() => {
            setToasts(prevToasts => prevToasts.filter(toast => toast.id !== newToast.id));
        }, 4000);
    };

    const handleConfirmReactivate = async () => {
        if (userToReactivate) {
            await updateUserStatus(userToReactivate.id, 'ACTIVE');
            await addAdminNoteToUser(userToReactivate.id, 'Account manually re-activated by admin.');
            showToast(`User ${userToReactivate.name} has been re-activated.`, 'success');
            setUserToReactivate(null);
            fetchBlockedUsers();
        }
    };
    
    const handleNotify = async (user: User) => {
        await addAdminNoteToUser(user.id, 'Admin kept account blocked and sent notification to user to visit the nearest branch for verification.');
        showToast(`A notification has been simulated for ${user.name}.`, 'info');
        fetchBlockedUsers();
    };

    return (
        <>
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center">
                    <ShieldAlertIcon className="w-5 h-5 mr-2 text-yellow-400" />
                    Blocked Account Review
                </h3>
                {loading ? (
                    <p className="text-gray-400">Loading blocked accounts...</p>
                ) : blockedUsers.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">There are no blocked accounts to review.</p>
                ) : (
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                        {blockedUsers.map(user => (
                            <div key={user.id} className="bg-gray-900/50 p-3 rounded-lg flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <p className="font-semibold text-white">{user.name}</p>
                                    <p className="text-xs text-gray-500">{user.email}</p>
                                    <p className="text-xs text-gray-500 mt-1 italic">
                                        Last note: {user.adminNotes?.[user.adminNotes.length - 1]?.split(': ')[1] || 'No notes'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setUserToReactivate(user)}
                                        className="px-3 py-1 text-xs font-semibold rounded-md bg-green-600/50 text-green-300 hover:bg-green-600/80 flex items-center gap-1.5 transition-colors"
                                    >
                                        <UserCheckIcon className="w-4 h-4" />
                                        Re-activate
                                    </button>
                                    <button
                                        onClick={() => handleNotify(user)}
                                        className="px-3 py-1 text-xs font-semibold rounded-md bg-orange-600/50 text-orange-300 hover:bg-orange-600/80 flex items-center gap-1.5 transition-colors"
                                    >
                                        <SendIcon className="w-4 h-4" />
                                        Notify to Visit Branch
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {userToReactivate && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-8 max-w-md w-full">
                        <div className="text-center">
                            <ShieldAlertIcon className="mx-auto w-12 h-12 text-yellow-400 mb-4" />
                            <h2 className="text-2xl font-bold text-yellow-300">Confirm Re-activation</h2>
                            <p className="text-gray-300 mt-2">
                                Are you sure you want to re-activate the account for <span className="font-bold text-white">{userToReactivate.name}</span> ({userToReactivate.email})?
                            </p>
                        </div>
                        <div className="mt-6 flex justify-center gap-4">
                            <button onClick={() => setUserToReactivate(null)} className="px-6 py-2 font-semibold rounded-md bg-gray-600 hover:bg-gray-500 text-white transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleConfirmReactivate} className="px-6 py-2 font-semibold rounded-md bg-green-600 hover:bg-green-700 text-white transition-colors flex items-center gap-2">
                                <UserCheckIcon className="w-5 h-5" />
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notifications Container */}
            <div className="fixed bottom-4 right-4 z-50 w-full max-w-xs space-y-3">
                {toasts.map(toast => (
                    <div key={toast.id} className={`flex items-start justify-between gap-4 p-4 rounded-lg shadow-lg border animate-fade-in-up ${
                        toast.type === 'success' ? 'bg-green-900/80 backdrop-blur-sm border-green-600' : 'bg-blue-900/80 backdrop-blur-sm border-blue-600'
                    }`}>
                        <div className="flex items-center gap-3">
                            {toast.type === 'success' ? <UserCheckIcon className="w-6 h-6 text-green-300" /> : <InfoIcon className="w-6 h-6 text-blue-300" />}
                            <p className="text-sm text-gray-200">{toast.message}</p>
                        </div>
                        {/* FIX: Use `toast.id` from the map function scope instead of the out-of-scope `newToast.id`. */}
                        <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-gray-400 hover:text-white">
                           <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>
        </>
    );
};

export default BlockedAccountsManager;