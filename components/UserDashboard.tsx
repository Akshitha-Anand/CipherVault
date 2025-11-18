import React, { useState, useEffect, useCallback } from 'react';
import { User, RiskAnalysisResult, RiskLevel, ProcessState, AccountHealthStats, Transaction, UserAnalyticsData, AccountStatus, TransactionType, LocationStatus } from '../types';
import databaseService from '../services/databaseService';
import geminiService from '../services/geminiService';
import { useDebounce } from '../hooks/useDebounce';
import { CheckCircle2, CpuIcon, AlertTriangleIcon, UserIcon, ShieldXIcon, QrCodeIcon, InfoIcon, ShieldQuestionIcon, MessageSquareIcon } from './icons';
import FaceVerificationModal from './Verification/FaceVerificationModal';
import OtpModal from './Verification/OtpModal';
import AccountHealthDashboard from './AccountHealthDashboard';
import QRScannerModal from './Verification/QRScannerModal';
import UserAnalyticsDashboard from './User/UserAnalyticsDashboard';

interface UserDashboardProps {
  user: User;
  accountHealth: AccountHealthStats;
  analyticsData: UserAnalyticsData;
  onTransactionComplete: () => void;
  onVerificationFailure: (transaction: Transaction, capturedImage: string) => void;
}

type DisplayRiskLevel = RiskLevel | 'Idle';

const riskConfig: Record<DisplayRiskLevel, { color: string; label: string; }> = {
    Idle: { color: 'gray', label: 'Awaiting Transaction' },
    LOW: { color: 'green', label: 'Low Risk' },
    MEDIUM: { color: 'yellow', label: 'Medium Risk' },
    HIGH: { color: 'red', label: 'High Risk' },
};

const LimitProgressBar: React.FC<{label: string, current: number, max: number}> = ({ label, current, max }) => {
    const percentage = max > 0 ? (current / max) * 100 : 0;
    const barColor = percentage > 90 ? 'bg-red-500' : percentage > 75 ? 'bg-yellow-500' : 'bg-cyan-600';

    return (
        <div>
            <p className="text-sm text-gray-400">{label}</p>
            <div className="w-full bg-gray-700 rounded-full h-2.5 my-1">
                <div className={`${barColor} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
            </div>
            <p className="text-xs text-gray-400 text-right">
                ₹{current.toLocaleString('en-IN')} / ₹{max.toLocaleString('en-IN')}
            </p>
        </div>
    )
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user, accountHealth, analyticsData, onTransactionComplete, onVerificationFailure }) => {
  const [processState, setProcessState] = useState<ProcessState>(ProcessState.Idle);
  const [analysisResult, setAnalysisResult] = useState<RiskAnalysisResult | null>(null);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('UPI');
  const debouncedAmount = useDebounce(amount, 300);
  
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [locationName, setLocationName] = useState<string | undefined>(undefined);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('PENDING');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [totals, setTotals] = useState({ daily: 0, weekly: 0 });

  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [transactionToConfirm, setTransactionToConfirm] = useState<Omit<Transaction, 'id' | 'riskLevel' | 'riskScore' | 'status' | 'aiAnalysisLog' | 'userName'> | null>(null);
  const [isOtpModalVisible, setIsOtpModalVisible] = useState(false);

  const statusStyles: Record<AccountStatus, string> = {
    ACTIVE: 'bg-green-500/20 text-green-300 border border-green-500/30',
    BLOCKED: 'bg-red-500/20 text-red-300 border border-red-500/30',
    UNDER_REVIEW: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  };
  
  const fetchTransactionTotals = useCallback(async (txType: TransactionType) => {
    if (txType === 'UPI' || txType === 'IMPS') {
        const { daily, weekly } = await databaseService.getTransactionTotals(user.id, txType);
        setTotals({ daily, weekly });
    } else {
        setTotals({ daily: 0, weekly: 0 }); // No limits for NEFT/RTGS
    }
  }, [user.id]);
  
   const getGeocode = async (lat: number, lon: number) => {
      try {
          // Using a free, public reverse geocoding service for demonstration
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          const data = await response.json();
          if (data && data.address) {
              const { city, state, country } = data.address;
              return [city, state, country].filter(Boolean).join(', ');
          }
          return 'Unknown Location';
      } catch (error) {
          console.error("Geocoding failed:", error);
          return 'Location lookup failed';
      }
  };

  useEffect(() => {
    fetchTransactionTotals(type);

    setLocationStatus('PENDING');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
        const name = await getGeocode(latitude, longitude);
        setLocationName(name);
        setLocationStatus('SUCCESS');
      },
      (err) => {
        console.warn('Could not get location:', err.message);
        if (err.code === err.PERMISSION_DENIED) {
            setLocationStatus('DENIED');
        } else {
            setLocationStatus('UNAVAILABLE');
        }
      },
      {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
      }
    );
  }, [type, fetchTransactionTotals]);

  const proceedWithAnalysis = useCallback(async (transactionDetails: Omit<Transaction, 'id' | 'riskLevel' | 'riskScore' | 'status' | 'aiAnalysisLog' | 'userName'>) => {
    setProcessState(ProcessState.Analyzing);
    setAnalysisResult(null);
    setError(null);

    try {
      const analysis = await geminiService.analyzeTransaction(transactionDetails, user, locationStatus);
      const resultTransaction = await databaseService.createTransaction({
        ...transactionDetails,
        // FIX: Add the required 'userName' property to the transaction details.
        userName: user.name,
        riskScore: analysis.riskScore,
        riskLevel: analysis.riskLevel,
        aiAnalysisLog: analysis.analysis,
      });
      
      setAnalysisResult({ riskScore: resultTransaction.riskScore, analysis: resultTransaction.aiAnalysisLog });
      setCurrentTransaction(resultTransaction);

      switch (resultTransaction.riskLevel) {
        case RiskLevel.Low:
            setProcessState(ProcessState.Approved);
            break;
        case RiskLevel.Medium:
            setProcessState(ProcessState.VerificationOTP);
            setIsOtpModalVisible(true);
            break;
        case RiskLevel.High:
            setProcessState(ProcessState.VerificationBiometric);
            break;
        default:
            await databaseService.updateTransactionStatus(resultTransaction.id, 'BLOCKED_BY_AI');
            setProcessState(ProcessState.Blocked);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to analyze transaction. Please try again.');
      setProcessState(ProcessState.Error);
    }
  }, [user, locationStatus]);

  const handleAnalysis = useCallback(async (currentAmount: string) => {
    if (!recipient || !currentAmount || parseFloat(currentAmount) <= 0 || user.status === 'BLOCKED') {
      setProcessState(ProcessState.Idle);
      setAnalysisResult(null);
      setCurrentTransaction(null);
      return;
    }
    
    const numericAmount = parseFloat(currentAmount);
    const pendingTransaction: Omit<Transaction, 'id' | 'riskLevel' | 'riskScore' | 'status' | 'aiAnalysisLog' | 'userName'> = {
        userId: user.id,
        recipient,
        amount: numericAmount,
        type,
        location,
        locationName,
        time: new Date().toISOString()
    };

    if (numericAmount >= 10000) {
        setTransactionToConfirm(pendingTransaction);
        setIsConfirmationModalOpen(true);
        return;
    }

    await proceedWithAnalysis(pendingTransaction);

  }, [recipient, location, locationName, user, type, locationStatus, proceedWithAnalysis]);
  
  useEffect(() => {
      handleAnalysis(debouncedAmount);
  }, [debouncedAmount, recipient, handleAnalysis]);
  
  const handleBlockTransaction = async () => {
    setIsOtpModalVisible(false);
    setProcessState(ProcessState.Blocked);
    if(currentTransaction){
        await databaseService.updateTransactionStatus(currentTransaction.id, 'BLOCKED_BY_USER');
    }
  };
  
  const handleVerificationSuccess = async () => {
      setIsOtpModalVisible(false);
      setProcessState(ProcessState.Approved);
      if(currentTransaction){
          await databaseService.updateTransactionStatus(currentTransaction.id, 'APPROVED');
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
    fetchTransactionTotals(type); 
    setRecipient('');
    setAmount('');
    setProcessState(ProcessState.Idle);
    setAnalysisResult(null);
    setCurrentTransaction(null);
    setError(null);
    setIsOtpModalVisible(false);
  }, [onTransactionComplete, fetchTransactionTotals, type]);

  const isFinalState = processState === ProcessState.Approved || processState === ProcessState.Blocked;

  useEffect(() => {
      if (isFinalState) {
          const timer = setTimeout(resetAfterCompletion, 2500);
          return () => clearTimeout(timer);
      }
  }, [processState, isFinalState, resetAfterCompletion]);

  const handleAmountChange = (value: string) => {
      setAmount(value);
      setProcessState(ProcessState.Idle);
      setAnalysisResult(null);
      setError(null);
  };

  const handleConfirmTransaction = async () => {
    if (!transactionToConfirm) return;
    setIsConfirmationModalOpen(false);
    await proceedWithAnalysis(transactionToConfirm);
    setTransactionToConfirm(null);
  };

  const handleCancelConfirmation = () => {
    setIsConfirmationModalOpen(false);
    setTransactionToConfirm(null);
  };


  const renderStatus = () => {
      if(user.status === 'BLOCKED') return <div className="text-red-400 font-semibold">Account Blocked</div>
      if(error) return <div className="text-red-400 font-semibold">{error}</div>
      if(processState === ProcessState.Approved) return <div className="text-green-400 font-semibold">Transaction Approved</div>
      if(processState === ProcessState.Blocked) return <div className="text-red-400 font-semibold">Transaction Blocked & Notified</div>
      if(processState === ProcessState.VerificationOTP) {
        if (isOtpModalVisible) {
           return <div className="text-yellow-400 font-semibold flex items-center justify-center gap-2"><ShieldQuestionIcon className="w-4 h-4" /> Awaiting OTP Verification...</div>
        } else {
           return (
             <button onClick={() => setIsOtpModalVisible(true)} className="w-full text-center text-yellow-400 font-semibold hover:text-yellow-300 transition-colors">
                Verification pending. Click to enter code.
            </button>
           );
        }
      }
      if(processState === ProcessState.VerificationBiometric) return <div className="text-yellow-400 font-semibold">Face Verification Required</div>
      if(isConfirmationModalOpen) return <div className="text-yellow-400 font-semibold">Awaiting Confirmation</div>
      if(processState === ProcessState.Analyzing) return <div className="text-cyan-400 animate-pulse">Analyzing...</div>
      return <div className="text-gray-400">Ready for transaction</div>
  }
  
  const handleScanSuccess = (scannedValue: string) => {
      setRecipient(scannedValue);
      setIsScannerOpen(false);
  }
  
  const renderLimitInfo = () => {
    const limits = { UPI: { daily: 100000, weekly: 500000 }, IMPS: { daily: 500000, weekly: 2000000 } };
    if (type === 'UPI' || type === 'IMPS') {
        return (
            <div className="space-y-3">
                <LimitProgressBar label={`Today's ${type} Limit`} current={totals.daily} max={limits[type].daily} />
                <LimitProgressBar label={`This Week's ${type} Limit`} current={totals.weekly} max={limits[type].weekly} />
            </div>
        )
    }
    return (
        <div className="text-center text-sm text-gray-400 p-4 bg-gray-900/50 rounded-lg">
             <InfoIcon className="mx-auto w-6 h-6 text-gray-500 mb-2"/>
             <p>No preset limits for {type}. Transactions are subject to standard bank policies and AI risk assessment.</p>
        </div>
    )
  }

  const riskLevel: DisplayRiskLevel = currentTransaction?.riskLevel ?? 'Idle';
  const config = riskConfig[riskLevel];
  const score = analysisResult?.riskScore ?? 0;
  const scoreColorClass = riskConfig[riskLevel]?.color ? `text-${riskConfig[riskLevel].color}-400` : 'text-gray-400';

  return (
    <>
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 shadow-lg relative flex flex-col">
            <div className="flex items-start justify-between mb-4 border-b border-gray-700 pb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">{user.name}</h2>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[user.status]}`}>
                    {user.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            <div className="mb-4 space-y-3">
                <h3 className="text-lg font-semibold text-gray-300">Transaction Limits</h3>
                {renderLimitInfo()}
            </div>

            <div className="flex-grow">
                <h2 className="text-2xl font-semibold mb-1 text-cyan-300">New Transaction</h2>
                <p className="text-gray-400 mb-4 text-sm">Analysis starts automatically.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Type:</label>
                    <div className="flex items-center space-x-2">
                        {(['UPI', 'IMPS', 'NEFT', 'RTGS'] as TransactionType[]).map(txType => (
                            <button key={txType} onClick={() => setType(txType)}
                                className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${ type === txType ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600' }`}
                                disabled={isFinalState || processState !== ProcessState.Idle || user.status === 'BLOCKED'} >
                                {txType}
                            </button>
                        ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="recipient" className="block text-sm font-medium text-gray-300">To:</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <UserIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input type="text" id="recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)}
                        className="block w-full rounded-md border-gray-600 bg-gray-900/50 pl-10 py-2 focus:border-cyan-500 focus:ring-cyan-500"
                        placeholder="UPI, mobile number, or contact"
                        disabled={isFinalState || processState !== ProcessState.Idle || user.status === 'BLOCKED'}
                      />
                      <button onClick={() => setIsScannerOpen(true)} className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer text-gray-400 hover:text-cyan-400"  disabled={isFinalState || processState !== ProcessState.Idle || user.status === 'BLOCKED'}>
                        <QrCodeIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-300">Amount:</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                       <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-gray-400 sm:text-sm">₹</span>
                      </div>
                      <input type="number" id="amount" value={amount} onChange={(e) => handleAmountChange(e.target.value)}
                        className="block w-full rounded-md border-gray-600 bg-gray-900/50 pl-7 py-2 focus:border-cyan-500 focus:ring-cyan-500"
                        placeholder="0.00"
                         disabled={isFinalState || processState !== ProcessState.Idle || user.status === 'BLOCKED'}
                      />
                    </div>
                  </div>
                </div>
            </div>
            <div className="text-center pt-2 text-sm h-5 mt-auto">{renderStatus()}</div>
          </div>

          <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 shadow-lg min-h-[260px] flex items-center justify-center">
              {processState === ProcessState.Idle && !amount && !recipient && (
                  <div className="text-center text-gray-400">
                      <CpuIcon className="mx-auto w-16 h-16 text-gray-600 mb-4" />
                      <h3 className="text-xl font-semibold">AI Analysis Engine</h3>
                      {user.status === 'BLOCKED' ? 
                        <p className="text-red-400 mt-2">Your account is currently blocked for security reasons.</p> :
                        <p>Enter recipient and amount to begin analysis.</p>
                      }
                  </div>
              )}
              
              { (processState !== ProcessState.Idle || (!!amount || !!recipient)) && (
                   <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                       <div className="flex flex-col items-center justify-center">
                           <div className={`relative w-32 h-32 flex items-center justify-center`}>
                                <svg className="absolute w-full h-full" viewBox="0 0 100 100">
                                   <circle className="text-gray-700" strokeWidth="8" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
                                   <circle 
                                       className={scoreColorClass} strokeWidth="8" strokeDasharray={2 * Math.PI * 45} strokeDashoffset={2 * Math.PI * 45 * (1 - score / 100)} 
                                       strokeLinecap="round" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" 
                                       style={{transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s ease-out'}}
                                   />
                               </svg>
                               <span className={`text-3xl font-bold ${scoreColorClass}`}>{processState === ProcessState.Analyzing ? '...' : score}</span>
                           </div>
                           <div className={`mt-2 text-center font-semibold text-lg ${scoreColorClass}`}>{config.label}</div>
                       </div>
                       <div className="bg-gray-900/40 p-4 rounded-lg min-h-[150px]">
                           <h3 className="font-semibold text-cyan-300 mb-2">AI Analysis Log</h3>
                           {processState === ProcessState.Analyzing && 
                                <div className="text-gray-400 animate-pulse">
                                  <p>Analyzing transaction...</p>
                                  <p className="text-xs mt-1">Time: {new Date().toLocaleTimeString()}</p>
                                  <p className="text-xs">Location: {locationName || 'Fetching...'}</p>
                                </div>
                           }
                           <ul className="space-y-1 text-sm text-gray-300">
                              {analysisResult?.analysis.map((log, index) => (
                                  <li key={index} className="flex items-start">
                                      <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 text-cyan-400 flex-shrink-0" />
                                      <span>{log}</span>
                                  </li>
                              ))}
                           </ul>
                            {processState === ProcessState.Approved && (
                            <div className={`text-center mt-4 text-green-400`}>
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

      <OtpModal
        isOpen={isOtpModalVisible}
        transaction={currentTransaction}
        onBlock={handleBlockTransaction}
        onSuccess={handleVerificationSuccess}
        onMinimize={() => setIsOtpModalVisible(false)}
      />
      <FaceVerificationModal
        isOpen={processState === ProcessState.VerificationBiometric}
        user={user}
        transaction={currentTransaction}
        onClose={handleBlockTransaction}
        onSuccess={handleVerificationSuccess}
        onFailure={handleVerificationFailureWrapper}
      />
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanSuccess}
      />
      {isConfirmationModalOpen && transactionToConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-8 max-w-md w-full">
            <div className="text-center">
              <AlertTriangleIcon className="mx-auto w-12 h-12 text-yellow-400 mb-4" />
              <h2 className="text-2xl font-bold text-yellow-300">Confirm High-Value Transaction</h2>
              <p className="text-gray-300 mt-4 text-lg">
                Are you sure you want to send{' '}
                <span className="font-bold text-white">₹{transactionToConfirm.amount.toLocaleString('en-IN')}</span> to{' '}
                <span className="font-bold text-white">{transactionToConfirm.recipient}</span>?
              </p>
            </div>
            <div className="mt-8 flex justify-center gap-4">
              <button onClick={handleCancelConfirmation} className="px-6 py-2 font-semibold rounded-md bg-gray-600 hover:bg-gray-500 text-white transition-colors">
                Cancel
              </button>
              <button onClick={handleConfirmTransaction} className="px-6 py-2 font-semibold rounded-md bg-cyan-600 hover:bg-cyan-700 text-white transition-colors">
                Confirm & Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserDashboard;