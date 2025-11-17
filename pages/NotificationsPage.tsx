
import React, { useState, useEffect, useCallback } from 'react';
import { User, Notification, NotificationType } from '../types';
import databaseService from '../services/databaseService';
import { BellIcon, ArrowRightIcon, ShieldAlertIcon, ShieldXIcon, UserCheckIcon, ShieldQuestionIcon, MessageSquareIcon } from '../components/icons';

interface NotificationsPageProps {
  user: User;
  onNavigateBack: () => void;
}

const NotificationIcon: React.FC<{ type: NotificationType }> = ({ type }) => {
    switch (type) {
        case NotificationType.HighRiskTransaction:
        case NotificationType.TransactionOTP:
            return <ShieldAlertIcon className="w-6 h-6 text-orange-400" />;
        case NotificationType.AccountBlocked:
            return <ShieldXIcon className="w-6 h-6 text-red-400" />;
        case NotificationType.AccountUnblocked:
            return <UserCheckIcon className="w-6 h-6 text-green-400" />;
        case NotificationType.AccountUnderReview:
            return <ShieldQuestionIcon className="w-6 h-6 text-yellow-400" />;
        default:
            return <BellIcon className="w-6 h-6 text-gray-400" />;
    }
};

const OtpVerificationItem: React.FC<{ notification: Notification, onVerified: () => void }> = ({ notification, onVerified }) => {
    const [otpInput, setOtpInput] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!notification.transactionId || !otpInput.match(/^\d{6}$/)) {
            setError('Please enter a valid 6-digit OTP.');
            return;
        }
        setLoading(true);
        const { success } = await databaseService.verifyTransactionOtp(notification.transactionId, otpInput);
        if (success) {
            onVerified();
        } else {
            setError('The OTP you entered is incorrect. The transaction has been blocked.');
            // The UI will refresh on the next fetch, showing the updated (blocked) status
            setTimeout(onVerified, 2000); // Refresh list after showing error
        }
        setLoading(false);
    };

    return (
        <div className="mt-3 bg-gray-900/50 p-4 rounded-lg">
            <p className="text-sm font-semibold text-cyan-300 mb-2">Action Required: Enter OTP</p>
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
                 <div className="relative flex-grow">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <MessageSquareIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        maxLength={6}
                        className="block w-full text-center tracking-[0.5em] text-lg font-mono rounded-md border-gray-600 bg-gray-800 py-2 pl-10 pr-4 focus:border-cyan-500 focus:ring-cyan-500"
                        placeholder="∙∙∙∙∙∙"
                        disabled={loading}
                    />
                </div>
                <button type="submit" className="px-4 py-2 text-sm font-semibold rounded-md bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-50" disabled={loading}>
                    {loading ? 'Verifying...' : 'Verify'}
                </button>
            </form>
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        </div>
    )
};


const NotificationsPage: React.FC<NotificationsPageProps> = ({ user, onNavigateBack }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const userNotifs = await databaseService.getNotifications(user.id);
            setNotifications(userNotifs);
            const unreadIds = userNotifs.filter(n => !n.read).map(n => n.id);
            if (unreadIds.length > 0) {
                await databaseService.markNotificationsRead(user.id, unreadIds);
            }
        } catch (e) {
            console.error("Failed to fetch notifications:", e);
        }
        setLoading(false);
    }, [user.id]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    return (
        <div className="w-full max-w-3xl mx-auto animate-fade-in">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg">
                <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-cyan-300 flex items-center gap-3">
                        <BellIcon />
                        Notifications
                    </h1>
                    <button onClick={onNavigateBack} className="text-sm font-semibold text-gray-300 hover:text-white flex items-center gap-2">
                        Back to Dashboard <ArrowRightIcon className="w-4 h-4" />
                    </button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto">
                    {loading ? (
                        <p className="p-8 text-center text-gray-400">Loading notifications...</p>
                    ) : notifications.length === 0 ? (
                        <p className="p-8 text-center text-gray-400">You have no notifications.</p>
                    ) : (
                        <ul>
                           {notifications.map(notif => (
                                <li key={notif.id} className={`flex items-start gap-4 p-6 border-b border-gray-700/50 ${!notif.read ? 'bg-cyan-900/10' : ''}`}>
                                    <div className="flex-shrink-0 mt-1">
                                        <NotificationIcon type={notif.type} />
                                    </div>
                                    <div className="flex-grow">
                                        <p className="text-gray-200">{notif.message}</p>
                                        <p className="text-xs text-gray-500 mt-1">{new Date(notif.timestamp).toLocaleString()}</p>
                                        {notif.type === NotificationType.TransactionOTP && !notif.read && (
                                            <OtpVerificationItem notification={notif} onVerified={fetchNotifications} />
                                        )}
                                    </div>
                                </li>
                           ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationsPage;
