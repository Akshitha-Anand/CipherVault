import React, { useState, FormEvent } from 'react';
import { BankDetails } from '../../types';
import { ArrowRightIcon } from '../icons';

interface BankDetailsFormProps {
  onSubmit: (details: BankDetails) => void;
}

const BankDetailsForm: React.FC<BankDetailsFormProps> = ({ onSubmit }) => {
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [branchName, setBranchName] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountType, setAccountType] = useState<'SAVINGS' | 'CURRENT'>('SAVINGS');
  const [branchAddress, setBranchAddress] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ bankName, accountNumber, branchName, ifscCode, accountHolderName, accountType, branchAddress });
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-8 shadow-lg animate-fade-in">
      <h2 className="text-2xl font-semibold mb-2 text-cyan-300">Securely Link Your Bank</h2>
      <p className="text-gray-400 mb-6">Step 2: Bank Information</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="accountHolderName" className="block text-sm font-medium text-gray-300">Account Holder Name</label>
          <input
            type="text" id="accountHolderName" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)}
            className="mt-1 block w-full bg-gray-900/50 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
            required
            autoComplete="name"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bankName" className="block text-sm font-medium text-gray-300">Bank Name</label>
              <input
                type="text" id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)}
                className="mt-1 block w-full bg-gray-900/50 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                required
                autoComplete="organization"
              />
            </div>
            <div>
                <label htmlFor="accountType" className="block text-sm font-medium text-gray-300">Account Type</label>
                <select
                    id="accountType"
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as 'SAVINGS' | 'CURRENT')}
                    className="mt-1 block w-full bg-gray-900/50 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                >
                    <option value="SAVINGS">Savings</option>
                    <option value="CURRENT">Current</option>
                </select>
            </div>
        </div>

        <div>
          <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-300">Account Number</label>
          <input
            type="text" id="accountNumber" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
            className="mt-1 block w-full bg-gray-900/50 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
            required
            pattern="\d*"
            title="Account number should only contain digits."
            autoComplete="off"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="branchName" className="block text-sm font-medium text-gray-300">Branch Name</label>
            <input
              type="text" id="branchName" value={branchName} onChange={(e) => setBranchName(e.target.value)}
              className="mt-1 block w-full bg-gray-900/50 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
              required
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="ifscCode" className="block text-sm font-medium text-gray-300">IFSC Code</label>
            <input
              type="text" id="ifscCode" value={ifscCode} onChange={(e) => setIfscCode(e.target.value)}
              className="mt-1 block w-full bg-gray-900/50 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
              required
              autoComplete="off"
            />
          </div>
        </div>
        <div>
            <label htmlFor="branchAddress" className="block text-sm font-medium text-gray-300">Branch Address</label>
            <textarea
                id="branchAddress"
                value={branchAddress}
                onChange={(e) => setBranchAddress(e.target.value)}
                rows={3}
                className="mt-1 block w-full bg-gray-900/50 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                required
            ></textarea>
        </div>
        <div className="pt-2">
          <button type="submit" className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-900">
            Next: Face Capture
            <ArrowRightIcon className="ml-2 w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default BankDetailsForm;