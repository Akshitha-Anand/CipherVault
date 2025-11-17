import React, { useState, FormEvent } from 'react';
import { User } from '../types';
import databaseService from '../services/databaseService';
import { LogInIcon, MailIcon, LockIcon } from '../components/icons';

interface LoginPageProps {
  onLogin: (user: User) => void;
  onSwitchToRegister: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null); // Clear info message on submit
    setLoading(true);
    
    try {
      // Use the mock database service
      const user = await databaseService.login(email, password);
      if (user) {
        onLogin(user);
      } else {
        setError('Invalid credentials. Please check your email and password.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setError(null); // Clear any existing errors
    setInfoMessage("Password reset functionality is under development.");
    // Clear the message after a few seconds for better UX
    setTimeout(() => setInfoMessage(null), 4000);
  };

  return (
    <div className="w-full max-w-sm">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-8 shadow-lg animate-fade-in">
        <h2 className="text-2xl font-semibold mb-2 text-center text-cyan-300">Welcome Back</h2>
        <p className="text-gray-400 mb-6 text-center">Log in to your CipherVault account.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
              <div className="mt-1 relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <MailIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                      type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="block w-full bg-gray-900/50 border border-gray-600 rounded-md shadow-sm py-2 pl-10 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                      required
                      autoComplete="email"
                  />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
                <div className="text-sm">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="font-medium text-cyan-400 hover:text-cyan-300"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
              <div className="mt-1 relative">
                   <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <LockIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                      type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      className="block w-full bg-gray-900/50 border border-gray-600 rounded-md shadow-sm py-2 pl-10 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                      required
                      autoComplete="current-password"
                  />
              </div>
            </div>
            
            <div className="h-5 text-center"> {/* Container to prevent layout shift */}
              {error && <p className="text-red-400 text-sm animate-fade-in">{error}</p>}
              {infoMessage && <p className="text-cyan-300 text-sm animate-fade-in">{infoMessage}</p>}
            </div>

            <div className="pt-2">
            <button type="submit" className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-900 disabled:bg-cyan-800/50" disabled={loading}>
                <LogInIcon className="mr-2 w-5 h-5" />
                {loading ? 'Logging in...' : 'Log In'}
            </button>
            </div>
        </form>
        <p className="mt-6 text-center text-sm text-gray-400">
            New to CipherVault?{' '}
            <button onClick={onSwitchToRegister} className="font-medium text-cyan-400 hover:text-cyan-300">
                Create an account
            </button>
        </p>
        </div>
    </div>
  );
};

export default LoginPage;
