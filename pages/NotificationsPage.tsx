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
            return <ShieldAlertIcon className="w-6 h-6 text-orange-400" />;
        case NotificationType.TransactionOTP:
             return <MessageSquareIcon className="w-6 h-6 text-cyan-400" />;
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
                                        {notif.type === NotificationType.TransactionOTP && notif.otpCode && (
                                            <p className="mt-2 text-lg font-mono tracking-widest text-cyan-300 bg-gray-900/50 p-2 rounded-md text-center">
                                                {notif.otpCode}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1">{new Date(notif.timestamp).toLocaleString()}</p>
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