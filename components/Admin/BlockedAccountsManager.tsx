
import React, { useState, useEffect, useCallback } from 'react';
import databaseService from '../../services/databaseService';
import { User } from '../../types';
import { ShieldAlertIcon, UserCheckIcon, SendIcon, XIcon, InfoIcon, MessageSquareIcon } from '../icons';

type Toast = {
    id: number;
    message: string;
    type: 'success' | 'info';
};

type NoteModalState = {
    isOpen: boolean;
    user: User | null;
    mode: 'reactivate' | 'add';
};

const BlockedAccountsManager: React.FC = () => {
    const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [noteModal, setNoteModal] = useState<NoteModalState>({ isOpen: false, user: null, mode: 'add' });
    const [noteContent, setNoteContent] = useState('');
    const [toasts, setToasts] = useState<Toast[]>([]);

    const fetchBlockedUsers = useCallback(async () => {
        setLoading(true);
        try {
            const users = await databaseService.getBlockedUsers();
            setBlockedUsers(users);
        } catch (error) {
            console.error("Failed to fetch blocked users:", error);
        }
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

    const openNoteModal = (user: User, mode: 'reactivate' | 'add') => {
        setNoteModal({ isOpen: true, user, mode });
        setNoteContent('');
    };

    const closeNoteModal = () => {
        setNoteModal({ isOpen: false, user: null, mode: 'add' });
        setNoteContent('');
    };
    
    const handleNoteSubmit = async () => {
        if (!noteModal.user || !noteContent.trim()) {
            showToast('Note cannot be empty.', 'info');
            return;
        }

        await databaseService.addAdminNote(noteModal.user.id, noteContent);

        if (noteModal.mode === 'reactivate') {
            await databaseService.updateUserStatus(noteModal.user.id, 'ACTIVE');
            showToast(`User ${noteModal.user.name} has been re-activated.`, 'success');
        } else {
            showToast(`Note added to ${noteModal.user.name}'s account.`, 'success');
        }
        
        closeNoteModal();
        fetchBlockedUsers();
    };
    
    const handleNotify = async (user: User) => {
        const note = 'Admin kept account blocked and sent notification to user to visit the nearest branch for verification.';
        await databaseService.addAdminNote(user.id, note);
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
                                    <p className="text-xs text-gray-400 mt-1 italic">
                                        <span className="text-gray-500">Last note:</span> {user.adminNotes?.[user.adminNotes.length - 1]?.split(': ')[1] || 'No notes'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        onClick={() => openNoteModal(user, 'add')}
                                        className="px-3 py-1 text-xs font-semibold rounded-md bg-blue-600/50 text-blue-300 hover:bg-blue-600/80 flex items-center gap-1.5 transition-colors"
                                    >
                                        <MessageSquareIcon className="w-4 h-4" />
                                        Add Note
                                    </button>
                                     <button
                                        onClick={() => handleNotify(user)}
                                        className="px-3 py-1 text-xs font-semibold rounded-md bg-orange-600/50 text-orange-300 hover:bg-orange-600/80 flex items-center gap-1.5 transition-colors"
                                    >
                                        <SendIcon className="w-4 h-4" />
                                        Notify Visit
                                    </button>
                                    <button
                                        onClick={() => openNoteModal(user, 'reactivate')}
                                        className="px-3 py-1 text-xs font-semibold rounded-md bg-green-600/50 text-green-300 hover:bg-green-600/80 flex items-center gap-1.5 transition-colors"
                                    >
                                        <UserCheckIcon className="w-4 h-4" />
                                        Re-activate...
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {noteModal.isOpen && noteModal.user && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-8 max-w-md w-full">
                        <div className="text-left">
                            <h2 className="text-2xl font-bold text-cyan-300">
                                {noteModal.mode === 'reactivate' ? 'Re-activate Account' : 'Add Note'}
                            </h2>
                            <p className="text-gray-400 mt-1">
                                For user: <span className="font-semibold text-white">{noteModal.user.name}</span>
                            </p>
                             <p className="text-gray-300 mt-4 mb-2 text-sm font-medium">
                                {noteModal.mode === 'reactivate' ? 'Please provide a reason for re-activation:' : 'Enter your note below:'}
                            </p>
                            <textarea
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                                rows={4}
                                className="w-full bg-gray-900/50 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                                placeholder="E.g., User verified identity via video call..."
                            />
                        </div>
                        <div className="mt-6 flex justify-end gap-4">
                            <button onClick={closeNoteModal} className="px-6 py-2 font-semibold rounded-md bg-gray-600 hover:bg-gray-500 text-white transition-colors">
                                Cancel
                            </button>
                            <button 
                                onClick={handleNoteSubmit} 
                                disabled={!noteContent.trim()}
                                className={`px-6 py-2 font-semibold rounded-md text-white transition-colors flex items-center gap-2 ${
                                    noteModal.mode === 'reactivate' 
                                    ? 'bg-green-600 hover:bg-green-700' 
                                    : 'bg-cyan-600 hover:bg-cyan-700'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {noteModal.mode === 'reactivate' ? <><UserCheckIcon className="w-5 h-5" /> Confirm & Re-activate</> : <><MessageSquareIcon className="w-5 h-5" /> Save Note</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed bottom-4 right-4 z-50 w-full max-w-xs space-y-3">
                {toasts.map(toast => (
                    <div key={toast.id} className={`flex items-start justify-between gap-4 p-4 rounded-lg shadow-lg border animate-fade-in-up ${
                        toast.type === 'success' ? 'bg-green-900/80 backdrop-blur-sm border-green-600' : 'bg-blue-900/80 backdrop-blur-sm border-blue-600'
                    }`}>
                        <div className="flex items-center gap-3">
                            {toast.type === 'success' ? <UserCheckIcon className="w-6 h-6 text-green-300" /> : <InfoIcon className="w-6 h-6 text-blue-300" />}
                            <p className="text-sm text-gray-200">{toast.message}</p>
                        </div>
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