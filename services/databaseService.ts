
import * as db from '../database/mockDatabase';
import { User, BankDetails, Transaction, AccountStatus, TransactionStatus, UserAnalyticsData, VerificationIncident, Notification, TransactionType, RiskAnalysisResult, RiskLevel, UserBehavioralProfile, TypicalLocation } from '../types';

// This service layer acts as an intermediary between the UI components
// and the in-memory database, allowing for easy swapping to a real API later.

const databaseService = {
    // Auth
    login: (email: string, password: string): Promise<User | null> => {
        return Promise.resolve(db.verifyUserCredentials(email, password));
    },
    
    // Registration
    checkEmail: (email: string): Promise<{ exists: boolean }> => {
        return Promise.resolve({ exists: db.doesUserExist(email) });
    },
    register: (data: { personalDetails: Omit<User, 'id' | 'status' | 'passwordHash' | 'createdAt'> & { password: string }, bankDetails: BankDetails, faceImages: string[] }): Promise<User> => {
        const { personalDetails, bankDetails, faceImages } = data;
        return Promise.resolve(db.createUser(personalDetails, bankDetails, faceImages));
    },

    // User
    getUser: (userId: string): Promise<User | null> => Promise.resolve(db.getUserById(userId) || null),
    getUserTransactions: (userId: string): Promise<Transaction[]> => Promise.resolve(db.getTransactionsByUserId(userId)),
    getUserAnalytics: (userId: string): Promise<UserAnalyticsData> => Promise.resolve(db.getUserAnalyticsData(userId)),
    getAccountStabilityScore: (userId: string): Promise<{ score: number }> => Promise.resolve({ score: db.calculateAccountStability(userId) }),
    getTransactionTotals: (userId: string, type: TransactionType): Promise<{ daily: number, weekly: number }> => Promise.resolve(db.getTransactionTotals(userId, type)),
    getUserBehavioralProfile: (userId: string): Promise<UserBehavioralProfile> => Promise.resolve(db.getUserBehavioralProfile(userId)),
    getUserTypicalLocations: (userId: string): Promise<TypicalLocation[]> => Promise.resolve(db.getUserTypicalLocations(userId)),

    // Transactions
    createTransaction: (details: Omit<Transaction, 'id' | 'userName' | 'status'> & { riskScore: number, riskLevel: RiskLevel, aiAnalysisLog: string[] }): Promise<Transaction> => {
        return Promise.resolve(db.createTransaction(details));
    },
    updateTransactionStatus: (transactionId: string, status: TransactionStatus): Promise<{ success: boolean }> => {
        db.updateTransactionStatus(transactionId, status);
        return Promise.resolve({ success: true });
    },
    verifyTransactionOtp: (transactionId: string, otp: string): Promise<{ success: boolean }> => {
        return Promise.resolve({ success: db.verifyTransactionOtp(transactionId, otp) });
    },

    // Verification
    createVerificationIncident: (userId: string, userName: string, capturedImage: string): Promise<VerificationIncident> => {
         return Promise.resolve(db.createVerificationIncident(userId, userName, capturedImage));
    },

    // Notifications
    getNotifications: (userId: string): Promise<Notification[]> => Promise.resolve(db.getNotifications(userId)),
    markNotificationsRead: (userId: string, notificationIds: string[]): Promise<{ success: boolean }> => {
        db.markNotificationsAsRead(userId, notificationIds);
        return Promise.resolve({ success: true });
    },

    // Admin
    getPlatformStats: () => Promise.resolve(db.getPlatformStats()),
    getAllTransactions: (): Promise<Transaction[]> => Promise.resolve(db.getAllTransactions()),
    getUsersWithRiskStats: () => Promise.resolve(db.getUsersWithRiskStats()),
    getRiskHotspots: () => Promise.resolve(db.getRiskHotspots()),
    getWorkflowStats: () => Promise.resolve(db.getWorkflowStats()),
    getTransactionStatusDistribution: () => Promise.resolve(db.getTransactionStatusDistribution()),
    getBlockedUsers: (): Promise<User[]> => Promise.resolve(db.getBlockedUsers()),
    updateUserStatus: (userId: string, status: AccountStatus): Promise<{ success: boolean }> => {
        db.updateUserStatus(userId, status, 'ADMIN');
        return Promise.resolve({ success: true });
    },
    addAdminNote: (userId: string, note: string): Promise<{ success: boolean }> => {
         db.addAdminNoteToUser(userId, note);
         return Promise.resolve({ success: true });
    },
    getEscalatedIncidents: (): Promise<VerificationIncident[]> => Promise.resolve(db.getEscalatedIncidents()),
    
    // Analyst
    getSuspiciousActivity: (): Promise<Transaction[]> => Promise.resolve(db.getSuspiciousActivity()),
    getPendingIncidents: (): Promise<VerificationIncident[]> => Promise.resolve(db.getPendingIncidents()),
    escalateIncident: (incidentId: string): Promise<{ success: boolean }> => {
         db.escalateIncident(incidentId);
         return Promise.resolve({ success: true });
    },
    resolveIncident: (incidentId: string): Promise<{ success: boolean }> => {
        db.resolveIncident(incidentId);
        return Promise.resolve({ success: true });
    }
};

export default databaseService;
