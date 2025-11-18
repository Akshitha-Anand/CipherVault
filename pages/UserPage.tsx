import React, { useState, useEffect, useCallback } from 'react';
import { User, AccountHealthStats, Transaction, UserAnalyticsData } from '../types';
import UserDashboard from '../components/UserDashboard';
import databaseService from '../services/databaseService';

interface UserPageProps {
  user: User;
}

export default function UserPage({ user: initialUser }: UserPageProps) {
  const [currentUser, setCurrentUser] = useState<User>(initialUser);
  const [accountHealth, setAccountHealth] = useState<AccountHealthStats | null>(null);
  const [analyticsData, setAnalyticsData] = useState<UserAnalyticsData | null>(null);

  const fetchAllUserData = useCallback(async (user: User) => {
    try {
        const [transactions, updatedStoredUser, stabilityScoreData, analytics] = await Promise.all([
            databaseService.getUserTransactions(user.id),
            databaseService.getStoredUser(user.id),
            databaseService.getAccountStabilityScore(user.id),
            databaseService.getUserAnalytics(user.id)
        ]);

        const monthlySpending = transactions
            .filter(t => new Date(t.time).getMonth() === new Date().getMonth())
            .reduce((sum, t) => sum + t.amount, 0);
        
        const riskBreakdown = transactions.reduce((acc, t) => {
            if (t.riskLevel === 'LOW') acc.low++;
            else if (t.riskLevel === 'MEDIUM') acc.medium++;
            else if (t.riskLevel === 'HIGH') acc.high++;
            return acc;
        }, { low: 0, medium: 0, high: 0 });

        if (updatedStoredUser) {
          // Keep the decrypted PII from the current session, but update non-sensitive fields
          setCurrentUser(prevUser => ({
            ...prevUser,
            status: updatedStoredUser.status,
            adminNotes: updatedStoredUser.adminNotes,
          }));
        }

        setAccountHealth({
          status: updatedStoredUser?.status === 'ACTIVE' ? 'Stable' : (updatedStoredUser?.status === 'UNDER_REVIEW' ? 'Under Review' : 'At Risk'),
          totalTransactions: transactions.length,
          monthlySpending,
          riskBreakdown,
          stabilityScore: stabilityScoreData.score
        });
        
        setAnalyticsData(analytics);
    } catch (error) {
        console.error("Failed to fetch user data:", error);
    }
  }, []);

  useEffect(() => {
    if (initialUser) {
        fetchAllUserData(initialUser);
    }
  }, [initialUser, fetchAllUserData]); 

  const handleTransactionCompletion = async () => {
      if(currentUser){
          fetchAllUserData(currentUser);
      }
  }

  const handleVerificationFailure = async (transaction: Transaction, capturedImage: string) => {
      await databaseService.updateTransactionStatus(transaction.id, 'BLOCKED_BY_AI');
      await databaseService.createVerificationIncident(transaction.userId, transaction.userName, capturedImage);
      if(currentUser){
          fetchAllUserData(currentUser);
      }
  }

  if (!currentUser || !accountHealth || !analyticsData) {
      return <div className="text-center p-8">Loading Dashboard...</div>
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <UserDashboard 
        user={currentUser} 
        accountHealth={accountHealth} 
        analyticsData={analyticsData}
        onTransactionComplete={handleTransactionCompletion} 
        onVerificationFailure={handleVerificationFailure}
      />
    </div>
  );
}