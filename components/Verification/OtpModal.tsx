import React, { useState, FormEvent } from 'react';
import { ShieldQuestionIcon, MessageSquareIcon } from '../icons';

interface OtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const OtpModal: React.FC<OtpModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // In a real app, you'd verify the OTP. Here we just check for a 6-digit code.
    if (otp.match(/^\d{6}$/)) {
      onSuccess();
    } else {
      setError('Invalid OTP. Please enter the 6-digit code.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-8 max-w-sm w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">&times;</button>
        <div className="text-center">
            <ShieldQuestionIcon className="mx-auto w-12 h-12 text-yellow-400 mb-4" />
            <h2 className="text-2xl font-bold text-yellow-400">OTP Verification Required</h2>
            <p className="text-gray-300 mt-2">For your security, please enter the 6-digit code sent to your registered mobile number.</p>
        </div>
        <form onSubmit={handleSubmit} className="mt-6">
            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <MessageSquareIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value); setError(''); }}
                    maxLength={6}
                    className="block w-full text-center tracking-[1em] text-2xl font-mono rounded-md border-gray-600 bg-gray-900/50 py-3 pl-12 pr-4 focus:border-yellow-500 focus:ring-yellow-500"
                    placeholder="∙∙∙∙∙∙"
                />
            </div>
            {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
            <button type="submit" className="mt-6 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-gray-900 bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 focus:ring-offset-gray-900">
                Verify Transaction
            </button>
        </form>
      </div>
    </div>
  );
};

export default OtpModal;