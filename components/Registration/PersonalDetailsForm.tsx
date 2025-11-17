
import React, { useState, FormEvent } from 'react';
import { User } from '../../types';
import { ArrowRightIcon } from '../icons';

interface PersonalDetailsFormProps {
  onSubmit: (details: Omit<User, 'id' | 'status' | 'passwordHash' | 'createdAt'> & { password: string }) => void;
  apiError: string | null;
  isLoading: boolean;
}

const PersonalDetailsForm: React.FC<PersonalDetailsFormProps> = ({ onSubmit, apiError, isLoading }) => {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters long.");
      return;
    }
    setPasswordError('');
    onSubmit({ name, dob, mobile, email, password });
  };
  
  const isFormComplete = name && dob && mobile && email && password && confirmPassword;
  const isSubmitDisabled = !isFormComplete || isLoading;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-8 shadow-lg animate-fade-in">
      <h2 className="text-2xl font-semibold mb-2 text-cyan-300">Create Your CipherVault Account</h2>
      <p className="text-gray-400 mb-6">Step 1: Personal Information</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300">Full Name</label>
          <input
            type="text" id="name" value={name} onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full bg-gray-900/50 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
            required
            autoComplete="name"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="dob" className="block text-sm font-medium text-gray-300">Date of Birth</label>
            <input
              type="date" id="dob" value={dob} onChange={(e) => setDob(e.target.value)}
              className="mt-1 block w-full bg-gray-900/50 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
              required
              autoComplete="bday"
            />
          </div>
          <div>
            <label htmlFor="mobile" className="block text-sm font-medium text-gray-300">Mobile Number</label>
            <input
              type="tel" id="mobile" value={mobile} onChange={(e) => setMobile(e.target.value)}
              className="mt-1 block w-full bg-gray-900/50 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
              required
              autoComplete="tel"
            />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
          <input
            type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full bg-gray-900/50 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
            required
            autoComplete="email"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
            <input
              type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full bg-gray-900/50 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
              required
              autoComplete="new-password"
            />
          </div>
           <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">Confirm Password</label>
            <input
              type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full bg-gray-900/50 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
              required
              autoComplete="new-password"
            />
          </div>
        </div>
        <div className="h-5 text-center">
            {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
            {apiError && <p className="text-red-400 text-sm">{apiError}</p>}
        </div>
        <div className="pt-2">
          <button 
            type="submit" 
            disabled={isSubmitDisabled} 
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verifying...' : 'Next: Bank Details'}
            <ArrowRightIcon className="ml-2 w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default PersonalDetailsForm;
