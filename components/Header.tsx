
import React from 'react';
import { ShieldCheckIcon } from './icons';

const Header: React.FC = () => {
  return (
    <header className="text-center">
      <div className="flex items-center justify-center gap-4">
        <ShieldCheckIcon className="w-10 h-10 text-cyan-400" />
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
          CipherVault
        </h1>
      </div>
      <p className="mt-2 text-lg text-gray-400">AI-Powered Fraud Detection Workflow</p>
    </header>
  );
};

export default Header;
