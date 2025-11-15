import db from '../database/mockDatabase';
import { User, BankDetails, Transaction, EncryptedBankDetails, AccountStatus, TransactionStatus, RiskLevel } from '../types';

// --- MOCK ENCRYPTION/HASHING UTILS ---
// In a real app, use a robust library like bcrypt for hashing and crypto-js or native Web Crypto API for encryption.

/**
 * Simulates hashing data. Returns a predictable "hash".
 */
const hashData = (data: string): string => {
    return `hashed_${data}_${data.length}`;
};

/**
 * Simulates encrypting data. Returns a placeholder string.
 */
const encrypt = (data: string): string => {
    return `encrypted(${btoa(data)})`;
};

/**
 * Simulates decrypting data.
 */
const decrypt = (encryptedData: string): string => {
    if (encryptedData.startsWith('encrypted(') && encryptedData.endsWith(')')) {
        try {
            return atob(encryptedData.substring(10, encryptedData.length - 1));
        } catch (e) {
            return 'Decryption Error';
        }
    }
    return encryptedData;
};


// --- USER MANAGEMENT ---

export const addUser = async (userData: Omit<User, 'id' | 'status'>): Promise<User> => {
    const newUser: User = {
        ...userData,
        id: `user-${Date.now()}`,
        status: 'ACTIVE'
    };
    db.users.push(newUser);
    return newUser;
};

export const getUser = async (userId: string): Promise<User | undefined> => {
    return db.users.find(u => u.id === userId);
};

export const getUserByEmail = async (email: string): Promise<User | undefined> => {
    return db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
};

export const getAllUsers = async (): Promise<User[]> => {
    return [...db.users];
}

export const updateUserStatus = async (userId: string, status: AccountStatus): Promise<boolean> => {
    const user = db.users.find(u => u.id === userId);
    if (user) {
        user.status = status;
        return true;
    }
    return false;
};

// --- BANK DETAILS MANAGEMENT ---

export const addBankDetails = async (userId: string, details: BankDetails): Promise<EncryptedBankDetails> => {
    const encryptedDetails: EncryptedBankDetails = {
        userId,
        encryptedBankName: encrypt(details.bankName),
        encryptedAccountNumber: encrypt(details.accountNumber),
    };
    // Remove old details if they exist
    const index = db.bankDetails.findIndex(bd => bd.userId === userId);
    if (index > -1) {
        db.bankDetails[index] = encryptedDetails;
    } else {
        db.bankDetails.push(encryptedDetails);
    }
    return encryptedDetails;
};

// --- TRANSACTION MANAGEMENT ---

export const addTransaction = async (txData: Omit<Transaction, 'id'>): Promise<Transaction> => {
    const newTransaction: Transaction = {
        ...txData,
        id: `txn-${Date.now()}`,
    };
    db.transactions.push(newTransaction);
    return newTransaction;
};

export const getTransactionsForUser = async (userId: string): Promise<Transaction[]> => {
    return db.transactions.filter(t => t.userId === userId).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
};

export const updateTransactionStatus = async (transactionId: string, status: TransactionStatus): Promise<boolean> => {
    const transaction = db.transactions.find(t => t.id === transactionId);
    if (transaction) {
        transaction.status = status;
        
        // If user blocked, update their account status too
        if (status === 'BLOCKED_BY_USER' || status === 'BLOCKED_BY_AI') {
            await updateUserStatus(transaction.userId, 'BLOCKED');
        }
        if (status === 'CLEARED_BY_ANALYST' && (await getUser(transaction.userId))?.status === 'UNDER_REVIEW') {
             await updateUserStatus(transaction.userId, 'ACTIVE');
        }
        return true;
    }
    return false;
};


// --- AGGREGATE DATA FOR DASHBOARDS ---

export const getAllTransactions = async (): Promise<Transaction[]> => {
    return [...db.transactions].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
};

export const getPlatformStats = async () => {
    const totalUsers = db.users.length;
    const totalTransactions = db.transactions.length;
    const totalValue = db.transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const atRiskAccounts = db.users.filter(u => u.status !== 'ACTIVE').length;
    
    const riskBreakdown = db.transactions.reduce((acc, t) => {
        if (t.riskLevel === RiskLevel.Low) acc.low++;
        else if (t.riskLevel === RiskLevel.Medium) acc.medium++;
        else if (t.riskLevel === 'HIGH' || t.riskLevel === 'CRITICAL') acc.high++;
        return acc;
    }, { low: 0, medium: 0, high: 0 });

    return { totalUsers, totalTransactions, totalValue, atRiskAccounts, riskBreakdown };
};

export const getSuspiciousActivity = async (): Promise<Transaction[]> => {
    return db.transactions
        .filter(t => t.riskLevel === 'MEDIUM' || t.riskLevel === 'HIGH' || t.riskLevel === 'CRITICAL')
        .sort((a, b) => {
            // Prioritize user-flagged transactions
            const aFlagged = a.status === 'FLAGGED_BY_USER' || a.status === 'BLOCKED_BY_USER';
            const bFlagged = b.status === 'FLAGGED_BY_USER' || b.status === 'BLOCKED_BY_USER';
            if (aFlagged && !bFlagged) return -1;
            if (!aFlagged && bFlagged) return 1;
            // Then escalated
            if (a.status === 'ESCALATED' && b.status !== 'ESCALATED') return -1;
            if (a.status !== 'ESCALATED' && b.status === 'ESCALATED') return 1;
            return new Date(b.time).getTime() - new Date(a.time).getTime(); // Then sort by time
        });
};

export const getUsersWithRiskStats = async () => {
    const userStats: { [userId: string]: { user: User; highRiskCount: number; flaggedCount: number } } = {};

    db.transactions.forEach(tx => {
        if (!userStats[tx.userId]) {
            const user = db.users.find(u => u.id === tx.userId);
            if (user) {
                userStats[tx.userId] = { user, highRiskCount: 0, flaggedCount: 0 };
            }
        }

        if (userStats[tx.userId]) {
            if (tx.riskLevel === 'HIGH' || tx.riskLevel === 'CRITICAL') {
                userStats[tx.userId].highRiskCount++;
            }
            if (tx.status === 'FLAGGED_BY_USER' || tx.status === 'BLOCKED_BY_USER' || tx.status === 'BLOCKED_BY_AI') {
                userStats[tx.userId].flaggedCount++;
            }
        }
    });

    return Object.values(userStats).sort((a, b) => (b.flaggedCount + b.highRiskCount) - (a.flaggedCount + a.highRiskCount));
};

export const getWorkflowStats = async () => {
    const all = db.transactions.length;
    const lowRisk = db.transactions.filter(t => t.riskLevel === RiskLevel.Low).length;
    const medOrHigh = all - lowRisk;
    const approved = db.transactions.filter(t => t.status === 'APPROVED' || t.status === 'CLEARED_BY_ANALYST').length;
    const blocked = db.transactions.filter(t => t.status.startsWith('BLOCKED')).length;

    return {
        initiated: all,
        autoApproved: lowRisk,
        needsReview: medOrHigh,
        finalApproved: approved,
        finalBlocked: blocked,
    };
};

export const getTransactionStatusDistribution = async () => {
    const distribution: { [key: string]: number } = {};
    db.transactions.forEach(tx => {
        distribution[tx.status] = (distribution[tx.status] || 0) + 1;
    });
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
};