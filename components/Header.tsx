
import React, { useState, useEffect } from 'react';
import { ShieldCheckIcon, LogOutIcon, BellIcon } from './icons';
import { User, Notification } from '../types';
import databaseService from '../services/databaseService';

interface HeaderProps {
  user?: User | null;
  onLogout?: () => void;
  onNavigate: (view: 'MAIN' | 'NOTIFICATIONS') => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onNavigate }) => {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (user) {
            const fetchNotifs = async () => {
                const userNotifs = await databaseService.getNotifications(user.id);
                setUnreadCount(userNotifs.filter(n => !n.read).length);
            };
            fetchNotifs();
            const interval = setInterval(fetchNotifs, 5000);
            return () => clearInterval(interval);
        } else {
            setUnreadCount(0);
        }
    }, [user]);

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
                    onClick={() => onNavigate('NOTIFICATIONS')}
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
