
import React from 'react';
import { ShieldCheckIcon, LogOutIcon } from './icons';
import { User } from '../types';

interface HeaderProps {
  user?: User | null;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="text-center relative">
      <div className="flex items-center justify-center gap-4">
        <ShieldCheckIcon className="w-10 h-10 text-cyan-400" />
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
          CipherVault
        </h1>
      </div>
      <p className="mt-2 text-lg text-gray-400">AI-Powered Fraud Detection Workflow</p>
      
      {user && onLogout && (
        <div className="absolute top-1/2 -translate-y-1/2 right-0 h-full flex items-center">
            <button 
              onClick={onLogout} 
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700 border border-gray-700/50"
              aria-label="Log Out"
            >
                <LogOutIcon className="w-5 h-5" />
                <span className="hidden md:inline font-semibold">Log Out</span>
            </button>
        </div>
      )}
    </header>
  );
};

export default Header;
