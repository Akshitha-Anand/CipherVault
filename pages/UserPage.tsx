import React, { useState, useEffect } from 'react';
import { User, AccountHealthStats, Transaction } from '../types';
import UserDashboard from '../components/UserDashboard';
import { getTransactionsForUser, getUser, createVerificationIncident } from '../services/databaseService';

interface UserPageProps {
  user: User;
  onLogout: () => void;
}

export default function UserPage({ user: initialUser, onLogout }: UserPageProps) {
  const [currentUser, setCurrentUser] = useState<User>(initialUser);
  const [accountHealth, setAccountHealth] = useState<AccountHealthStats | null>(null);

  useEffect(() => {
    setCurrentUser(initialUser);
  }, [initialUser]);

  const fetchAndSetHealth = async (user: User) => {
    const transactions = await getTransactionsForUser(user.id);
    const monthlySpending = transactions
        .filter(t => new Date(t.time).getMonth() === new Date().getMonth()) // Basic month filter
        .reduce((sum, t) => sum + t.amount, 0);
    
    const riskBreakdown = transactions.reduce((acc, t) => {
        if (t.riskLevel === 'LOW') acc.low++;
        else if (t.riskLevel === 'MEDIUM') acc.medium++;
        else if (t.riskLevel === 'HIGH' || t.riskLevel === 'CRITICAL') acc.high++;
        return acc;
    }, { low: 0, medium: 0, high: 0 });

    const updatedUser = await getUser(user.id);
    setCurrentUser(updatedUser || user);

    setAccountHealth({
      status: updatedUser?.status === 'ACTIVE' ? 'Stable' : (updatedUser?.status === 'UNDER_REVIEW' ? 'Under Review' : 'At Risk'),
      totalTransactions: transactions.length,
      monthlySpending,
      riskBreakdown
    });
  }

  useEffect(() => {
    if (currentUser) {
      fetchAndSetHealth(currentUser);
    }
  }, [initialUser]); 

  const handleTransactionCompletion = async () => {
      if(currentUser){
          fetchAndSetHealth(currentUser);
      }
  }

  const handleVerificationFailure = async (transaction: Transaction, capturedImage: string) => {
      await createVerificationIncident(transaction.userId, transaction.userName, capturedImage);
      // Re-fetch everything to show the updated "BLOCKED" status
      if(currentUser){
          fetchAndSetHealth(currentUser);
      }
  }

  if (!currentUser || !accountHealth) {
      return <div className="text-center p-8">Loading Dashboard...</div>
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <UserDashboard 
        user={currentUser} 
        accountHealth={accountHealth} 
        onTransactionComplete={handleTransactionCompletion} 
        onVerificationFailure={handleVerificationFailure}
        onLogout={onLogout} 
      />
    </div>
  );
}