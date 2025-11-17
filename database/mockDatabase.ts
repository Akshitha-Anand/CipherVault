
import { v4 as uuidv4 } from 'uuid';
import { User, BankDetails, Transaction, RiskLevel, ProcessState, AccountHealthStats, UserAnalyticsData, AccountStatus, TransactionStatus, TransactionType, VerificationIncident, Notification, NotificationType, UserBehavioralProfile, TypicalLocation } from '../types.js';

// --- IN-MEMORY DATABASE ---
let users: User[] = [];
let transactions: Transaction[] = [];
let verificationIncidents: VerificationIncident[] = [];
let notifications: Notification[] = [];

// --- UTILITIES ---
const hashPassword = (password: string) => `hashed_${password}_${uuidv4()}`;
const verifyPassword = (password: string, hash: string) => hash.startsWith(`hashed_${password}_`);
const createNotification = (userId: string, type: NotificationType, message: string, details: { transactionId?: string; } = {}) => {
    const newNotif: Notification = { 
        id: uuidv4(), 
        userId, 
        type, 
        message, 
        read: false, 
        timestamp: new Date().toISOString(),
        transactionId: details.transactionId,
     };
    notifications.unshift(newNotif);
    console.log(`NOTIFICATION for ${userId}: ${message}`);
    return newNotif;
};


// --- MOCK DATA INITIALIZATION ---
const initMockData = () => {
    // User 1: Active, stable user
    const user1: User = {
        id: 'user-001',
        name: 'Alice Johnson',
        dob: '1990-05-15',
        mobile: '9876543210',
        email: 'alice@example.com',
        passwordHash: hashPassword("password123"),
        status: 'ACTIVE',
        faceReferenceImages: [], 
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        adminNotes: [],
    };
    users.push(user1);

    // User 2: Blocked user with history
    const user2: User = {
        id: 'user-002',
        name: 'Bob Williams',
        dob: '1985-11-20',
        mobile: '9988776655',
        email: 'bob@example.com',
        passwordHash: hashPassword('password456'),
        status: 'BLOCKED',
        faceReferenceImages: [],
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        adminNotes: [`${new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()}: Account blocked due to repeated failed biometric verifications.`, `${new Date().toISOString()}: User notified to visit branch for manual verification.`],
    };
    users.push(user2);

    // User 3: Under Review
    const user3: User = {
        id: 'user-003',
        name: 'Charlie Brown',
        dob: '1995-02-10',
        mobile: '9123456789',
        email: 'charlie@example.com',
        passwordHash: hashPassword('password789'),
        status: 'UNDER_REVIEW',
        faceReferenceImages: [],
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        adminNotes: [`${new Date().toISOString()}: Analyst requested more information due to unusual transaction patterns.`],
    };
    users.push(user3);


    // --- Transaction Data ---
    const commonRecipients = ["Zomato", "Swiggy", "Amazon", "Flipkart", "Myntra", "Uber"];
    const locations = [
        { name: "Bengaluru, India", coords: { latitude: 12.9716, longitude: 77.5946 } },
        { name: "Mumbai, India", coords: { latitude: 19.0760, longitude: 72.8777 } },
        { name: "Bengaluru, India", coords: { latitude: 12.9716, longitude: 77.5946 } }, // higher weight for Bengaluru
        { name: "New Delhi, India", coords: { latitude: 28.6139, longitude: 77.2090 } },
    ];
    
    // User 1 (Alice) - Normal activity
    for (let i = 0; i < 50; i++) {
        const amount = Math.floor(Math.random() * 2000) + 200;
        const riskScore = Math.floor(Math.random() * 30);
        const transactionDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        const hour = 9 + Math.floor(Math.random() * 10); // 9 AM to 7 PM
        transactionDate.setHours(hour);
        const locationData = locations[i % locations.length];

        transactions.push({
            id: uuidv4(),
            userId: user1.id,
            userName: user1.name,
            recipient: commonRecipients[i % commonRecipients.length],
            amount, type: 'UPI',
            location: locationData.coords,
            locationName: locationData.name,
            time: transactionDate.toISOString(),
            riskLevel: RiskLevel.Low,
            riskScore, status: 'APPROVED',
            aiAnalysisLog: ['Transaction consistent with user profile.'],
        });
    }
     // User 1 - Flagged by user
    transactions.unshift({
        id: uuidv4(),
        userId: user1.id, userName: user1.name,
        recipient: 'Unusual International Vendor', amount: 75000, type: 'IMPS',
        location: { latitude: 51.5074, longitude: -0.1278 }, locationName: "London, UK",
        time: new Date().toISOString(),
        riskLevel: RiskLevel.High, riskScore: 85, status: 'FLAGGED_BY_USER',
        aiAnalysisLog: ['Large amount.', 'International transaction.', 'Unusual recipient.'],
    });

    // User 2 (Bob) - Suspicious activity leading to block
     transactions.unshift({
        id: uuidv4(),
        userId: user2.id, userName: user2.name,
        recipient: 'Crypto Exchange', amount: 95000, type: 'IMPS',
        location: { latitude: 34.0522, longitude: -118.2437 }, locationName: "Los Angeles, USA",
        time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 10000).toISOString(),
        riskLevel: RiskLevel.High, riskScore: 98, status: 'BLOCKED_BY_AI',
        aiAnalysisLog: ['High-risk merchant category.', 'Exceeds typical transaction size.', 'Unusual time of day.'],
    });

    // User 3 (Charlie) - A medium risk transaction for analyst review
    const medRiskTx: Transaction = {
        id: uuidv4(),
        userId: user3.id, userName: user3.name,
        recipient: 'Online Gaming Platform', amount: 45000, type: 'UPI',
        location: { latitude: 19.0760, longitude: 72.8777 }, locationName: "Mumbai, India",
        time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        riskLevel: RiskLevel.Medium, riskScore: 55, status: 'PENDING_OTP',
        aiAnalysisLog: ['Medium-high transaction value.', 'Recipient associated with higher chargeback rates.'],
    };
    transactions.unshift(medRiskTx);
    createNotification(user3.id, NotificationType.MediumRiskAlert, `A transaction of ₹45,000 to Online Gaming Platform requires OTP verification. The mock OTP is 123456.`, { transactionId: medRiskTx.id });


    // --- Verification Incidents ---
    verificationIncidents.push({
        id: uuidv4(),
        userId: user2.id,
        userName: user2.name,
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        capturedImage: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", // Placeholder
        status: 'ESCALATED', // Escalated for admin review
    });
};

initMockData();


// --- API FUNCTIONS ---
export const verifyUserCredentials = (email: string, password: string): User | null => {
    const user = users.find(u => u.email === email);
    if (user && verifyPassword(password, user.passwordHash)) {
        return user;
    }
    return null;
};

export const doesUserExist = (email: string): boolean => {
    return users.some(u => u.email === email);
};

export const createUser = (
    personalDetails: Omit<User, 'id' | 'status' | 'passwordHash' | 'createdAt'> & { password: string },
    bankDetails: BankDetails,
    faceImages: string[]
): User => {
    const newUser: User = {
        id: `user-${String(users.length + 1).padStart(3, '0')}`,
        ...personalDetails,
        passwordHash: hashPassword(personalDetails.password),
        status: 'ACTIVE',
        faceReferenceImages: faceImages,
        createdAt: new Date().toISOString(),
        adminNotes: [],
    };
    users.push(newUser);
    // In a real DB, you'd store the bank details securely. Here we just log it.
    console.log(`Created bank details for ${newUser.id}:`, bankDetails);
    return newUser;
};

export const getUserById = (userId: string): User | undefined => users.find(u => u.id === userId);

export const getTransactionsByUserId = (userId: string): Transaction[] => {
    return transactions.filter(t => t.userId === userId).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
};

export const createTransaction = (txData: Omit<Transaction, 'id' | 'userName' | 'status'> & { riskScore: number, riskLevel: RiskLevel, aiAnalysisLog: string[] }): Transaction => {
    const user = getUserById(txData.userId);
    let status: TransactionStatus = 'PENDING';
    if(txData.riskLevel === RiskLevel.Low) status = 'APPROVED';
    if(txData.riskLevel === RiskLevel.Medium) status = 'PENDING_OTP';
    
    const newTransaction: Transaction = {
        ...txData,
        id: uuidv4(),
        userName: user?.name || 'Unknown User',
        status,
    };
    transactions.unshift(newTransaction);
    
    if (newTransaction.riskLevel === 'HIGH') {
        createNotification(txData.userId, NotificationType.HighRiskTransaction, `A high-risk transaction of ₹${txData.amount} to ${txData.recipient} requires your attention.`);
    } else if (newTransaction.riskLevel === 'MEDIUM') {
        createNotification(
            txData.userId, 
            NotificationType.MediumRiskAlert, 
            `A transaction of ₹${txData.amount} to ${txData.recipient} requires OTP verification. The mock OTP is 123456.`, 
            { transactionId: newTransaction.id }
        );
    }

    return newTransaction;
};

export const updateTransactionStatus = (transactionId: string, status: TransactionStatus) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (transaction) {
        transaction.status = status;
        if (status === 'CLEARED_BY_ANALYST') {
             const user = getUserById(transaction.userId);
             if(user && user.status !== 'BLOCKED') user.status = 'ACTIVE';
        }
    }
};

export const verifyTransactionOtp = (transactionId: string, otp: string): { success: boolean } => {
    // For this mock, we use a simple hardcoded OTP. In a real app, this would be a secure check.
    const MOCK_OTP = '123456';
    if (otp === MOCK_OTP) {
        updateTransactionStatus(transactionId, 'APPROVED');
        return { success: true };
    }
    updateTransactionStatus(transactionId, 'BLOCKED_BY_USER');
    return { success: false };
};

export const calculateAccountStability = (userId: string): number => {
    const userTransactions = getTransactionsByUserId(userId);
    if (userTransactions.length < 5) return 50; // Not enough data, start with a neutral score
    const highRiskCount = userTransactions.filter(t => t.riskLevel === 'HIGH').length;
    const blockedCount = userTransactions.filter(t => t.status.startsWith('BLOCKED')).length;
    const score = 100 - (highRiskCount * 5) - (blockedCount * 10);
    return Math.max(0, score);
};

export const getUserAnalyticsData = (userId: string): UserAnalyticsData => {
    const userTransactions = getTransactionsByUserId(userId);
    
    // Spending over time (last 30 days)
    const spendingOverTime = [...Array(30)].map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return { date: date.toISOString().split('T')[0], amount: 0 };
    });
    userTransactions.forEach(t => {
        const dateStr = t.time.split('T')[0];
        const day = spendingOverTime.find(d => d.date === dateStr);
        if (day) day.amount += t.amount;
    });

    // Spending by category (mocked)
    const categories = ['Groceries', 'Utilities', 'Travel', 'Shopping', 'Entertainment', 'Health'];
    const spendingByCategory = categories.map(c => ({
        category: c,
        amount: userTransactions
            .filter((_, i) => (i % categories.length) === categories.indexOf(c))
            .reduce((sum, t) => sum + t.amount, 0)
    })).sort((a,b) => b.amount - a.amount);

    // Top payees
    const payeeMap = new Map<string, number>();
    userTransactions.forEach(t => {
        payeeMap.set(t.recipient, (payeeMap.get(t.recipient) || 0) + t.amount);
    });
    const topPayees = [...payeeMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([recipient, amount]) => ({ recipient, amount }));

    return { spendingOverTime, spendingByCategory, topPayees };
};

export const getTransactionTotals = (userId: string, type: TransactionType): { daily: number, weekly: number } => {
    const userTransactions = getTransactionsByUserId(userId).filter(t => t.type === type && t.status !== 'BLOCKED_BY_AI' && t.status !== 'BLOCKED_BY_USER');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const daily = userTransactions.filter(t => new Date(t.time) >= today).reduce((sum, t) => sum + t.amount, 0);
    const weekly = userTransactions.filter(t => new Date(t.time) >= weekAgo).reduce((sum, t) => sum + t.amount, 0);

    return { daily, weekly };
};

export const getUserBehavioralProfile = (userId: string): UserBehavioralProfile => {
    const userTransactions = getTransactionsByUserId(userId);
    const transactionCount = userTransactions.length;

    if (transactionCount < 5) {
        return {
            averageAmount: 1000,
            stdDevAmount: 500,
            commonRecipients: [],
            typicalHours: { start: 9, end: 22 }, // Broad for new users
            transactionCount,
        };
    }

    // Calculate amount stats
    const amounts = userTransactions.map(t => t.amount);
    const sum = amounts.reduce((a, b) => a + b, 0);
    const averageAmount = sum / transactionCount;
    const stdDevAmount = Math.sqrt(
        amounts.map(x => Math.pow(x - averageAmount, 2)).reduce((a, b) => a + b, 0) / transactionCount
    );

    // Find common recipients
    const recipientCounts = new Map<string, number>();
    userTransactions.forEach(t => {
        recipientCounts.set(t.recipient, (recipientCounts.get(t.recipient) || 0) + 1);
    });
    const commonRecipients = [...recipientCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(entry => entry[0]);

    // Find typical hours
    const hours = userTransactions.map(t => new Date(t.time).getHours());
    const hourCounts: { [hour: number]: number } = {};
    let maxCount = 0;
    let peakHour = 12;
    hours.forEach(h => {
        hourCounts[h] = (hourCounts[h] || 0) + 1;
        if (hourCounts[h] > maxCount) {
            maxCount = hourCounts[h];
            peakHour = h;
        }
    });

    const typicalHours = {
        start: Math.max(0, peakHour - 4),
        end: Math.min(23, peakHour + 4),
    };
    
    return {
        averageAmount,
        stdDevAmount,
        commonRecipients,
        typicalHours,
        transactionCount,
    };
};

export const getUserTypicalLocations = (userId: string): TypicalLocation[] => {
    const userTransactions = getTransactionsByUserId(userId);
    const locationCounts = new Map<string, number>();

    userTransactions.forEach(tx => {
        if (tx.locationName) {
            const city = tx.locationName.split(',')[0];
            locationCounts.set(city, (locationCounts.get(city) || 0) + 1);
        }
    });

    return [...locationCounts.entries()]
        .sort((a, b) => b[1] - a[1]) // sort by count desc
        .slice(0, 3) // top 3
        .map(([city, count]) => ({ city, count }));
};


export const createVerificationIncident = (userId: string, userName: string, capturedImage: string): VerificationIncident => {
    const newIncident: VerificationIncident = {
        id: uuidv4(),
        userId,
        userName,
        capturedImage,
        timestamp: new Date().toISOString(),
        status: 'PENDING_REVIEW'
    };
    verificationIncidents.unshift(newIncident);
    updateUserStatus(userId, 'BLOCKED', 'SYSTEM');
    return newIncident;
};

// --- NOTIFICATIONS ---
export const getNotifications = (userId: string): Notification[] => {
    return notifications.filter(n => n.userId === userId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};
export const markNotificationsAsRead = (userId: string, notificationIds: string[]) => {
    notifications.forEach(n => {
        if (n.userId === userId && notificationIds.includes(n.id)) {
            n.read = true;
        }
    });
};

// --- ADMIN FUNCTIONS ---
export const getPlatformStats = () => {
    const totalValue = transactions.reduce((sum, t) => sum + t.amount, 0);
    const atRiskAccounts = users.filter(u => u.status === 'BLOCKED' || u.status === 'UNDER_REVIEW').length;
    const riskBreakdown = transactions.reduce((acc, t) => {
            if (t.riskLevel === 'LOW') acc.low++;
            else if (t.riskLevel === 'MEDIUM') acc.medium++;
            else if (t.riskLevel === 'HIGH') acc.high++;
            return acc;
        }, { low: 0, medium: 0, high: 0 });

    return { totalUsers: users.length, totalTransactions: transactions.length, totalValue, atRiskAccounts, riskBreakdown };
};

export const getAllTransactions = (): Transaction[] => transactions.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

export const getUsersWithRiskStats = () => {
    return users.map(user => {
        const userTransactions = getTransactionsByUserId(user.id);
        const highRiskCount = userTransactions.filter(t => t.riskLevel === 'HIGH').length;
        const flaggedCount = userTransactions.filter(t => t.status.startsWith('BLOCKED') || t.status === 'FLAGGED_BY_USER').length;
        return { user, highRiskCount, flaggedCount, totalRisk: highRiskCount + flaggedCount };
    })
    .filter(stat => stat.totalRisk > 0)
    .sort((a, b) => b.totalRisk - a.totalRisk);
};

export const getRiskHotspots = () => {
    const locationCounts = new Map<string, number>();
    transactions.filter(t => t.riskLevel === 'HIGH').forEach(tx => {
        if (tx.locationName) {
            locationCounts.set(tx.locationName, (locationCounts.get(tx.locationName) || 0) + 1);
        }
    });
    return [...locationCounts.entries()]
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count);
};

export const getWorkflowStats = () => {
    const initiated = transactions.length;
    const autoApproved = transactions.filter(t => t.riskLevel === 'LOW').length;
    const needsReview = initiated - autoApproved;
    const finalApproved = transactions.filter(t => t.status === 'APPROVED' || t.status === 'CLEARED_BY_ANALYST').length;
    const finalBlocked = transactions.filter(t => t.status.startsWith('BLOCKED')).length;
    return { initiated, autoApproved, needsReview, finalApproved, finalBlocked };
};

export const getTransactionStatusDistribution = () => {
    const statusMap = new Map<TransactionStatus, number>();
    transactions.forEach(tx => {
        statusMap.set(tx.status, (statusMap.get(tx.status) || 0) + 1);
    });
    return [...statusMap.entries()].map(([name, value]) => ({ name, value }));
};

export const getBlockedUsers = (): User[] => users.filter(u => u.status === 'BLOCKED');

export const addAdminNoteToUser = (userId: string, note: string) => {
    const user = getUserById(userId);
    if (user) {
        if (!user.adminNotes) user.adminNotes = [];
        user.adminNotes.push(`${new Date().toISOString()}: ${note}`);
    }
};

export const updateUserStatus = (userId: string, status: AccountStatus, actor: 'ADMIN' | 'SYSTEM' | 'ANALYST') => {
    const user = getUserById(userId);
    if (user && user.status !== status) {
        user.status = status;
        if (status === 'ACTIVE') {
            createNotification(userId, NotificationType.AccountUnblocked, `Your account has been re-activated by an administrator.`);
        } else if (status === 'BLOCKED') {
            createNotification(userId, NotificationType.AccountBlocked, `Your account has been blocked for security reasons.`);
        } else if (status === 'UNDER_REVIEW') {
            createNotification(userId, NotificationType.AccountUnderReview, `Your account is under review. An analyst will contact you.`);
        }
    }
};


// --- ANALYST FUNCTIONS ---
export const getSuspiciousActivity = (): Transaction[] => {
    return transactions
        .filter(t => t.status === 'FLAGGED_BY_USER' || t.status === 'BLOCKED_BY_USER' || (t.riskLevel === 'HIGH' && t.status !== 'APPROVED' && t.status !== 'CLEARED_BY_ANALYST'))
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
};

export const getPendingIncidents = (): VerificationIncident[] => {
    return verificationIncidents
        .filter(i => i.status === 'PENDING_REVIEW')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const getEscalatedIncidents = (): VerificationIncident[] => {
     return verificationIncidents
        .filter(i => i.status === 'ESCALATED')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const escalateIncident = (incidentId: string) => {
    const incident = verificationIncidents.find(i => i.id === incidentId);
    if (incident) {
        incident.status = 'ESCALATED';
    }
};

export const resolveIncident = (incidentId: string) => {
    const incident = verificationIncidents.find(i => i.id === incidentId);
    if (incident) {
        incident.status = 'RESOLVED';
    }
};