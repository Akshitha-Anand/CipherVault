import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheckIcon, LogOutIcon, BellIcon, ShieldAlertIcon, ShieldXIcon, UserCheckIcon, ShieldQuestionIcon } from './icons';
import { User, Notification, NotificationType } from '../types';
import { getNotificationsForUser, markNotificationsAsRead } from '../services/databaseService';

interface HeaderProps {
  user?: User | null;
  onLogout?: () => void;
}

const NotificationIcon: React.FC<{ type: NotificationType }> = ({ type }) => {
    switch (type) {
        case NotificationType.HighRiskTransaction:
            return <ShieldAlertIcon className="w-5 h-5 text-orange-400" />;
        case NotificationType.AccountBlocked:
            return <ShieldXIcon className="w-5 h-5 text-red-400" />;
        case NotificationType.AccountUnblocked:
            return <UserCheckIcon className="w-5 h-5 text-green-400" />;
        case NotificationType.AccountUnderReview:
            return <ShieldQuestionIcon className="w-5 h-5 text-yellow-400" />;
        default:
            return <BellIcon className="w-5 h-5 text-gray-400" />;
    }
};

const NotificationsDropdown: React.FC<{ notifications: Notification[], onClose: () => void }> = ({ notifications, onClose }) => {
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);
    
    return (
        <div ref={dropdownRef} className="absolute top-full right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 animate-fade-in">
            <div className="p-3 border-b border-gray-700">
                <h4 className="font-semibold text-white">Notifications</h4>
            </div>
            {notifications.length === 0 ? (
                <p className="p-4 text-sm text-gray-400 text-center">No new notifications.</p>
            ) : (
                <ul className="max-h-96 overflow-y-auto">
                    {notifications.map(notif => (
                        <li key={notif.id} className={`flex items-start gap-3 p-3 border-b border-gray-700/50 ${!notif.read ? 'bg-cyan-900/20' : ''}`}>
                            <div className="flex-shrink-0 mt-1">
                                <NotificationIcon type={notif.type} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-200">{notif.message}</p>
                                <p className="text-xs text-gray-500 mt-1">{new Date(notif.timestamp).toLocaleString()}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};


const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        if (user) {
            const fetchNotifs = async () => {
                const userNotifs = await getNotificationsForUser(user.id);
                setNotifications(userNotifs);
            };
            fetchNotifs();
            // Polling for new notifications every 10 seconds
            const interval = setInterval(fetchNotifs, 10000);
            return () => clearInterval(interval);
        } else {
            setNotifications([]);
        }
    }, [user]);

    const handleToggleDropdown = async () => {
        const shouldOpen = !isDropdownOpen;
        setIsDropdownOpen(shouldOpen);
        if (shouldOpen && unreadCount > 0 && user) {
            const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
            // Mark as read on the backend
            await markNotificationsAsRead(user.id, unreadIds);
            // Optimistically update the UI
            setNotifications(prev => prev.map(n => unreadIds.includes(n.id) ? { ...n, read: true } : n));
        }
    };

  return (
    <header className="text-center relative">
      <div className="flex items-center justify-center gap-4">
        <ShieldCheckIcon className="w-10 h-10 text-cyan-400" />
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
          CipherVault
        </h1>
      </div>
      <p className="mt-2 text-lg text-gray-400">AI-Powered Fraud Detection Workflow</p>
      
      {user && (
        <div className="absolute top-1/2 -translate-y-1/2 right-0 h-full flex items-center gap-4">
            <div className="relative">
                <button
                    onClick={handleToggleDropdown}
                    className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700 border border-gray-700/50"
                    aria-label="Notifications"
                >
                    <BellIcon className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                            {unreadCount}
                        </span>
                    )}
                </button>
                {isDropdownOpen && <NotificationsDropdown notifications={notifications} onClose={() => setIsDropdownOpen(false)} />}
            </div>
            
            {onLogout && (
                <button 
                onClick={onLogout} 
                className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700 border border-gray-700/50"
                aria-label="Log Out"
                >
                    <LogOutIcon className="w-5 h-5" />
                    <span className="hidden md:inline font-semibold">Log Out</span>
                </button>
            )}
        </div>
      )}
    </header>
  );
};

export default Header;