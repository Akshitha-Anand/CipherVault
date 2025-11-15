import React, { useState, useEffect, useCallback } from 'react';
import { User, RiskAnalysisResult, RiskLevel, ProcessState, AccountHealthStats, Transaction, UserAnalyticsData } from '../types';
import { analyzeTransaction } from '../services/geminiService';
import { addTransaction, updateTransactionStatus } from '../services/databaseService';
import { useDebounce } from '../hooks/useDebounce';
import { CheckCircle2, CpuIcon, AlertTriangleIcon, UserIcon, ThumbsUpIcon, ThumbsDownIcon, HandIcon, ShieldXIcon, LogOutIcon, ShieldQuestionIcon, QrCodeIcon } from './icons';
import OtpModal from './Verification/OtpModal';
import FaceVerificationModal from './Verification/FaceVerificationModal';
import AccountHealthDashboard from './AccountHealthDashboard';
import QRScannerModal from './Verification/QRScannerModal';
import UserAnalyticsDashboard from './User/UserAnalyticsDashboard';

interface UserDashboardProps {
  user: User;
  accountHealth: AccountHealthStats;
  analyticsData: UserAnalyticsData;
  onTransactionComplete: () => void;
  onVerificationFailure: (transaction: Transaction, capturedImage: string) => void;
  onLogout: () => void;
}

const getRiskLevel = (score: number | null): RiskLevel => {
  if (score === null) return RiskLevel.Idle;
  if (score <= 40) return RiskLevel.Low;
  if (score <= 70) return RiskLevel.Medium;
  if (score <= 90) return RiskLevel.High;
  return RiskLevel.Critical;
};

const riskConfig = {
    [RiskLevel.Idle]: { color: 'gray', label: 'Awaiting Transaction', scoreRange: '' },
    [RiskLevel.Low]: { color: 'green', label: 'Low Risk', scoreRange: '0-40%' },
    [RiskLevel.Medium]: { color: 'yellow', label: 'Medium Risk', scoreRange: '41-70%' },
    [RiskLevel.High]: { color: 'orange', label: 'High Risk', scoreRange: '71-90%' },
    [RiskLevel.Critical]: { color: 'red', label: 'Critical Risk', scoreRange: '91-100%' },
};

const UserDashboard: React.FC<UserDashboardProps> = ({ user, accountHealth, analyticsData, onTransactionComplete, onVerificationFailure, onLogout }) => {
  const [processState, setProcessState] = useState<ProcessState>(ProcessState.Idle);
  const [analysisResult, setAnalysisResult] = useState<RiskAnalysisResult | null>(null);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const debouncedAmount = useDebounce(amount, 1000);
  
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (err) => {
        console.warn('Could not get location:', err.message);
      }
    );
  }, []);

  const handleAnalysis = useCallback(async (currentAmount: string) => {
    if (!recipient || !currentAmount || parseFloat(currentAmount) <= 0 || user.status === 'BLOCKED') {
      setProcessState(ProcessState.Idle);
      setAnalysisResult(null);
      setCurrentTransaction(null);
      return;
    }
    
    setProcessState(ProcessState.Analyzing);
    setAnalysisResult(null);
    setError(null);

    try {
      const pendingTransaction: Omit<Transaction, 'id' | 'riskLevel' | 'riskScore' | 'status' | 'aiAnalysisLog'> = {
          userId: user.id,
          userName: user.name,
          recipient,
          amount: parseFloat(currentAmount),
          location,
          time: new Date().toISOString()
      };

      const result = await analyzeTransaction(pendingTransaction, user);
      setAnalysisResult(result);
      const riskLevel = getRiskLevel(result.riskScore);
      
      const newTransaction = await addTransaction({
        ...pendingTransaction,
        riskScore: result.riskScore,
        riskLevel: riskLevel,
        status: 'PENDING',
        aiAnalysisLog: result.analysis,
      });
      setCurrentTransaction(newTransaction);

      if (riskLevel === RiskLevel.Low) {
        setProcessState(ProcessState.Approved);
        await updateTransactionStatus(newTransaction.id, 'APPROVED');
      } else {
        setProcessState(ProcessState.AwaitingUserAction);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to analyze transaction. Please try again.');
      setProcessState(ProcessState.Error);
    }
  }, [recipient, location, user]);
  
  useEffect(() => {
      handleAnalysis(debouncedAmount);
  }, [debouncedAmount, recipient, handleAnalysis]);
  
  const handleUserConfirmation = () => {
    const riskLevel = getRiskLevel(analysisResult?.riskScore ?? null);
     if (riskLevel === RiskLevel.Medium) {
        setProcessState(ProcessState.VerificationOTP);
     } else if (riskLevel === RiskLevel.High || riskLevel === RiskLevel.Critical) {
        setProcessState(ProcessState.VerificationBiometric);
     }
  };

  const handleUserRejection = async (isBlocking: boolean) => {
    setProcessState(ProcessState.Blocked);
    if(currentTransaction){
        await updateTransactionStatus(currentTransaction.id, isBlocking ? 'BLOCKED_BY_USER' : 'FLAGGED_BY_USER');
    }
  };
  
  const handleVerificationSuccess = async () => {
      setProcessState(ProcessState.Approved);
      if(currentTransaction){
          await updateTransactionStatus(currentTransaction.id, 'APPROVED');
      }
  }
  
  const handleVerificationFailureWrapper = (capturedImage: string) => {
    if(currentTransaction) {
      onVerificationFailure(currentTransaction, capturedImage);
      setProcessState(ProcessState.Blocked);
    }
  }

  const resetAfterCompletion = useCallback(() => {
    onTransactionComplete();
    setRecipient('');
    setAmount('');
    setProcessState(ProcessState.Idle);
    setAnalysisResult(null);
    setCurrentTransaction(null);
    setError(null);
  }, [onTransactionComplete]);

  const riskLevel = getRiskLevel(analysisResult?.riskScore ?? null);
  const config = riskConfig[riskLevel];
  const score = analysisResult?.riskScore ?? 0;
  const scoreColorClass = {
      [RiskLevel.Low]: 'text-green-400',
      [RiskLevel.Medium]: 'text-yellow-400',
      [RiskLevel.High]: 'text-orange-400',
      [RiskLevel.Critical]: 'text-red-400',
      [RiskLevel.Idle]: 'text-gray-400'
  }[riskLevel];

  const isFinalState = processState === ProcessState.Approved || processState === ProcessState.Blocked;

  useEffect(() => {
      if (isFinalState) {
          const timer = setTimeout(() => {
              resetAfterCompletion();
          }, 4000);
          return () => clearTimeout(timer);
      }
  }, [processState, isFinalState, resetAfterCompletion]);

  const renderStatus = () => {
      if(user.status === 'BLOCKED') return <div className="text-red-400 font-semibold">Account Blocked</div>
      if(processState === ProcessState.Approved) return <div className="text-green-400 font-semibold">Transaction Approved</div>
      if(processState === ProcessState.Blocked) return <div className="text-red-400 font-semibold">Transaction Blocked & Notified</div>
      if(processState === ProcessState.VerificationBiometric || processState === ProcessState.VerificationOTP) return <div className="text-yellow-400 font-semibold">Verification Required</div>
      if(processState === ProcessState.Analyzing) return <div className="text-cyan-400 animate-pulse">Analyzing...</div>
      if(processState === ProcessState.AwaitingUserAction) return <div className="text-yellow-400 font-semibold">Action Required</div>
      return <div className="text-gray-400">Ready for transaction</div>
  }
  
  const handleScanSuccess = (scannedValue: string) => {
      setRecipient(scannedValue);
      setIsScannerOpen(false);
  }

  return (
    <>
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Transaction Input */}
          <div className="lg:col-span-1 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 shadow-lg relative">
             <button onClick={onLogout} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm p-2 rounded-lg bg-gray-900/50 hover:bg-gray-700">
                <LogOutIcon className="w-4 h-4" />
                <span>Log Out</span>
            </button>
            <h2 className="text-2xl font-semibold mb-1 text-cyan-300">New Transaction</h2>
            <p className="text-gray-400 mb-4 text-sm">Analysis starts automatically.</p>
            <div className="space-y-4">
              <div>
                <label htmlFor="recipient" className="block text-sm font-medium text-gray-300">To:</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text" id="recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)}
                    className="block w-full rounded-md border-gray-600 bg-gray-900/50 pl-10 py-2 focus:border-cyan-500 focus:ring-cyan-500"
                    placeholder="UPI, mobile number, or contact"
                    disabled={isFinalState || user.status === 'BLOCKED'}
                  />
                  <button onClick={() => setIsScannerOpen(true)} className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer text-gray-400 hover:text-cyan-400"  disabled={isFinalState || user.status === 'BLOCKED'}>
                    <QrCodeIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-300">Amount:</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                   <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-gray-400 sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="block w-full rounded-md border-gray-600 bg-gray-900/50 pl-7 py-2 focus:border-cyan-500 focus:ring-cyan-500"
                    placeholder="0.00"
                     disabled={isFinalState || user.status === 'BLOCKED'}
                  />
                </div>
              </div>
               <div className="text-center pt-2 text-sm h-5">{renderStatus()}</div>
            </div>
          </div>

          {/* Analysis Dashboard */}
          <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 shadow-lg min-h-[260px] flex items-center justify-center">
              {processState === ProcessState.Idle && !amount && !recipient && (
                  <div className="text-center text-gray-400">
                      <CpuIcon className="mx-auto w-16 h-16 text-gray-600 mb-4" />
                      <h3 className="text-xl font-semibold">Welcome, {user.name.split(' ')[0]}</h3>
                      {user.status === 'BLOCKED' ? 
                        <p className="text-red-400 mt-2">Your account is currently blocked for security reasons.</p> :
                        <p>Enter recipient and amount to begin analysis.</p>
                      }
                  </div>
              )}

              {(processState !== ProcessState.Idle || (!!amount || !!recipient)) && (
                   <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                       <div className="flex flex-col items-center justify-center">
                           <div className={`relative w-32 h-32 flex items-center justify-center`}>
                                <svg className="absolute w-full h-full" viewBox="0 0 100 100">
                                   <circle className="text-gray-700" strokeWidth="8" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
                                   <circle 
                                       className={scoreColorClass} 
                                       strokeWidth="8" 
                                       strokeDasharray={2 * Math.PI * 45} 
                                       strokeDashoffset={2 * Math.PI * 45 * (1 - score / 100)} 
                                       strokeLinecap="round" 
                                       stroke="currentColor" 
                                       fill="transparent" 
                                       r="45" cx="50" cy="50" 
                                       style={{transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s ease-out'}}
                                   />
                               </svg>
                               <span className={`text-3xl font-bold ${scoreColorClass}`}>{processState === ProcessState.Analyzing ? '...' : score}</span>
                           </div>
                           <div className={`mt-2 text-center font-semibold text-lg ${scoreColorClass}`}>{config.label}</div>
                       </div>
                       <div className="bg-gray-900/40 p-4 rounded-lg min-h-[150px]">
                           <h3 className="font-semibold text-cyan-300 mb-2">AI Analysis Log</h3>
                           {processState === ProcessState.Analyzing && <div className="text-gray-400 animate-pulse">Analyzing transaction...</div>}
                           <ul className="space-y-1 text-sm text-gray-300">
                              {analysisResult?.analysis.map((log, index) => (
                                  <li key={index} className="flex items-start">
                                      <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 text-cyan-400 flex-shrink-0" />
                                      <span>{log}</span>
                                  </li>
                              ))}
                           </ul>
                            {processState === ProcessState.Approved && (
                            <div className="text-center text-green-400 mt-4">
                                <CheckCircle2 className="mx-auto w-8 h-8 text-green-500 mb-2" />
                                <p className="font-semibold">Transaction Approved</p>
                                <p className="text-sm">Your transaction was successful.</p>
                            </div>
                           )}
                           {processState === ProcessState.Blocked && (
                            <div className="text-center text-red-400 mt-4">
                                <ShieldXIcon className="mx-auto w-8 h-8 text-red-500 mb-2" />
                                <p className="font-semibold">Transaction Blocked</p>
                                <p className="text-sm">We've secured your account. Our team will contact you shortly.</p>
                            </div>
                           )}
                           {processState === ProcessState.Error && error && (
                               <div className="text-center text-red-400">
                                   <AlertTriangleIcon className="mx-auto w-8 h-8 text-red-500 mb-2" />
                                   <p className="text-sm">{error}</p>
                               </div>
                           )}
                       </div>
                   </div>
              )}
          </div>
        </div>

        <AccountHealthDashboard stats={accountHealth} />
        
        <div className="mt-8">
            <UserAnalyticsDashboard analytics={analyticsData} />
        </div>
      </div>
      
      {/* Action Required Modal */}
      {processState === ProcessState.AwaitingUserAction && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
              <div className="bg-gray-800 border border-yellow-700 rounded-lg shadow-xl p-8 max-w-md w-full relative">
                   <div className="text-center">
                        <ShieldQuestionIcon className="mx-auto w-12 h-12 text-yellow-400 mb-4" />
                        <h2 className="text-2xl font-bold text-yellow-400">Action Required</h2>
                        <p className="text-gray-300 mt-2">Our AI detected unusual activity. Please review this transaction of <span className="font-bold text-white">₹{amount}</span> to <span className="font-bold text-white">{recipient}</span>.</p>
                        <p className="text-sm text-gray-400 mt-1">Does this look right to you?</p>
                    </div>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <button onClick={handleUserConfirmation} className="w-full flex items-center justify-center gap-2 p-3 rounded-md bg-green-500/20 text-green-300 hover:bg-green-500/40 transition-colors font-semibold">
                            <ThumbsUpIcon className="w-5 h-5" /> Yes, it's me
                        </button>
                        <button onClick={() => handleUserRejection(false)} className="w-full flex items-center justify-center gap-2 p-3 rounded-md bg-red-500/20 text-red-300 hover:bg-red-500/40 transition-colors font-semibold">
                            <ThumbsDownIcon className="w-5 h-5" /> No, not me
                        </button>
                        <button onClick={() => handleUserRejection(true)} className="w-full flex items-center justify-center gap-2 p-3 rounded-md bg-gray-500/20 text-gray-300 hover:bg-gray-500/40 transition-colors font-semibold">
                            <HandIcon className="w-5 h-5" /> Block Account
                        </button>
                    </div>
              </div>
          </div>
      )}


      {/* Verification Modals */}
      <OtpModal 
        isOpen={processState === ProcessState.VerificationOTP}
        onClose={() => handleUserRejection(false)}
        onSuccess={handleVerificationSuccess}
      />
      <FaceVerificationModal
        isOpen={processState === ProcessState.VerificationBiometric}
        user={user}
        onClose={() => handleUserRejection(false)}
        onSuccess={handleVerificationSuccess}
        onFailure={handleVerificationFailureWrapper}
      />
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanSuccess}
      />
    </>
  );
};

export default UserDashboard;