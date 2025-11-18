import * as db from '../database/mockDatabase';
import cryptoService from './cryptoService';
import { User, StoredUser, BankDetails, Transaction, AccountStatus, TransactionStatus, UserAnalyticsData, VerificationIncident, Notification, TransactionType, RiskAnalysisResult, RiskLevel, UserBehavioralProfile, TypicalLocation, EncryptedBankDetails } from '../types';

// This service layer acts as an intermediary between the UI components
// and the in-memory database, allowing for easy swapping to a real API later.

const databaseService = {
    // Auth
    login: (email: string, password: string): Promise<User | null> => {
        return db.verifyUserCredentials(email, password);
    },
    
    // Registration
    checkEmail: async (email: string): Promise<{ exists: boolean }> => {
        // FIX: Await the async db.doesUserExist call to ensure the promise resolves to a boolean, not another promise.
        return { exists: await db.doesUserExist(email) };
    },
    register: async (data: { personalDetails: Omit<User, 'id' | 'status' | 'passwordHash' | 'createdAt'> & { password: string }, bankDetails: BankDetails, faceImages: string[] }): Promise<User> => {
        const { personalDetails, bankDetails, faceImages } = data;
        
        // Step 1: Create user which encrypts and stores PII
        const storedUser = await db.createStoredUser(personalDetails, faceImages);
        
        // Step 2: Derive the key again to encrypt bank details
        const key = await cryptoService.getKey(personalDetails.password, storedUser.passwordHash);

        // Step 3: Encrypt each field of the bank details individually
        const encryptedBankDetails: EncryptedBankDetails = {
            userId: storedUser.id,
            encryptedAccountHolderName: await cryptoService.encrypt(bankDetails.accountHolderName, key),
            encryptedAccountNumber: await cryptoService.encrypt(bankDetails.accountNumber, key),
            encryptedAccountType: await cryptoService.encrypt(bankDetails.accountType, key),
            encryptedBankName: await cryptoService.encrypt(bankDetails.bankName, key),
            encryptedBranchAddress: await cryptoService.encrypt(bankDetails.branchAddress, key),
            encryptedBranchName: await cryptoService.encrypt(bankDetails.branchName, key),
            encryptedIfscCode: await cryptoService.encrypt(bankDetails.ifscCode, key),
        };
        db.addEncryptedBankDetails(encryptedBankDetails);

        // Step 4: Decrypt the stored user to return a plaintext User object for immediate login
        const [name, dob, mobile, email] = await Promise.all([
             cryptoService.decrypt(storedUser.encryptedName, key),
             cryptoService.decrypt(storedUser.encryptedDob, key),
             cryptoService.decrypt(storedUser.encryptedMobile, key),
             cryptoService.decrypt(storedUser.encryptedEmail, key),
        ]);

        const newUser: User = {
            ...storedUser,
            name,
            dob,
            mobile,
            email
        };

        return newUser;
    },

    // User
    getStoredUser: (userId: string): Promise<StoredUser | null> => Promise.resolve(db.getStoredUserById(userId) || null),
    getUserTransactions: (userId: string): Promise<Transaction[]> => Promise.resolve(db.getTransactionsByUserId(userId)),
    getUserAnalytics: (userId: string): Promise<UserAnalyticsData> => Promise.resolve(db.getUserAnalyticsData(userId)),
    getAccountStabilityScore: (userId: string): Promise<{ score: number }> => Promise.resolve({ score: db.calculateAccountStability(userId) }),
    getTransactionTotals: (userId: string, type: TransactionType): Promise<{ daily: number, weekly: number }> => Promise.resolve(db.getTransactionTotals(userId, type)),
    getUserBehavioralProfile: (userId: string): Promise<UserBehavioralProfile> => Promise.resolve(db.getUserBehavioralProfile(userId)),
    getUserTypicalLocations: (userId: string): Promise<TypicalLocation[]> => Promise.resolve(db.getUserTypicalLocations(userId)),

    // Transactions
    createTransaction: (details: Omit<Transaction, 'id' | 'status'> & { riskScore: number, riskLevel: RiskLevel, aiAnalysisLog: string[] }): Promise<Transaction> => {
        return Promise.resolve(db.createTransaction(details));
    },
    updateTransactionStatus: (transactionId: string, status: TransactionStatus): Promise<{ success: boolean }> => {
        db.updateTransactionStatus(transactionId, status);
        return Promise.resolve({ success: true });
    },
    verifyTransactionOtp: (transactionId: string, otp: string): Promise<{ success: boolean }> => {
        return Promise.resolve(db.verifyTransactionOtp(transactionId, otp));
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
    getBlockedUsers: (): Promise<StoredUser[]> => Promise.resolve(db.getBlockedUsers()),
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
    },

    // DB Inspector
    getAllStoredUsers: (): Promise<StoredUser[]> => Promise.resolve(db.getAllStoredUsersFromDB()),
    getAllEncryptedBankDetails: (): Promise<EncryptedBankDetails[]> => Promise.resolve(db.getAllEncryptedBankDetailsFromDB()),
    getAllVerificationIncidents: (): Promise<VerificationIncident[]> => Promise.resolve(db.getAllVerificationIncidentsFromDB()),
    getAllNotifications: (): Promise<Notification[]> => Promise.resolve(db.getAllNotificationsFromDB()),
};

export default databaseService;