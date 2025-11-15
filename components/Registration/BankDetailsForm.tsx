import React, { useState, FormEvent } from 'react';
import { BankDetails } from '../../types';
import { ArrowRightIcon, ShieldCheckIcon } from '../icons';

interface BankDetailsFormProps {
  onSubmit: (details: BankDetails) => void;
}

const BankDetailsForm: React.FC<BankDetailsFormProps> = ({ onSubmit }) => {
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ bankName, accountNumber });
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-8 shadow-lg animate-fade-in">
      <h2 className="text-2xl font-semibold mb-2 text-cyan-300">Securely Link Your Bank</h2>
      <p className="text-gray-400 mb-6">Step 2: Bank Information</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="bankName" className="block text-sm font-medium text-gray-300">Bank Name</label>
          <input
            type="text" id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)}
            className="mt-1 block w-full bg-gray-900/50 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
            required
          />
        </div>
        <div>
          <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-300">Account Number</label>
          <input
            type="text" id="accountNumber" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
            className="mt-1 block w-full bg-gray-900/50 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
            required
            pattern="\d*"
            title="Account number should only contain digits."
          />
        </div>
        <div className="pt-2">
          <button type="submit" className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-900">
            Complete Setup & Go to Dashboard
            <ShieldCheckIcon className="ml-2 w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default BankDetailsForm;