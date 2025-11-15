import React, { useState, useEffect } from 'react';
import { User, AccountHealthStats } from '../types';
import UserDashboard from '../components/UserDashboard';
import { getTransactionsForUser, getUser } from '../services/databaseService';

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

  useEffect(() => {
    // If we have a user, fetch their data to calculate account health
    if (currentUser) {
      const calculateHealth = async () => {
        const transactions = await getTransactionsForUser(currentUser.id);
        const monthlySpending = transactions
            .filter(t => new Date(t.time).getMonth() === new Date().getMonth()) // Basic month filter
            .reduce((sum, t) => sum + t.amount, 0);
        
        const riskBreakdown = transactions.reduce((acc, t) => {
            if (t.riskLevel === 'LOW') acc.low++;
            else if (t.riskLevel === 'MEDIUM') acc.medium++;
            else if (t.riskLevel === 'HIGH' || t.riskLevel === 'CRITICAL') acc.high++;
            return acc;
        }, { low: 0, medium: 0, high: 0 });

        const updatedUser = await getUser(currentUser.id);

        setAccountHealth({
          status: updatedUser?.status === 'ACTIVE' ? 'Stable' : (updatedUser?.status === 'UNDER_REVIEW' ? 'Under Review' : 'At Risk'),
          totalTransactions: transactions.length,
          monthlySpending,
          riskBreakdown
        });
      };
      calculateHealth();
    }
  }, [currentUser]); // Recalculate when user is set

  const handleTransactionCompletion = async () => {
      if(currentUser){
          // Re-fetch user and health data to reflect latest status
          const updatedUser = await getUser(currentUser.id);
          if (updatedUser) setCurrentUser(updatedUser);
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
        onLogout={onLogout} 
      />
    </div>
  );
}