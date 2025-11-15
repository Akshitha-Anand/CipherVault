import db from '../database/mockDatabase';
import { User, BankDetails, Transaction, EncryptedBankDetails, AccountStatus, TransactionStatus, RiskLevel, EncryptedData, VerificationIncident, UserAnalyticsData } from '../types';

// --- SECURE HASHING & ENCRYPTION UTILS ---

// --- Password Hashing (Simulating Bcrypt) ---
/**
 * Simulates hashing a password with a salt, mimicking bcrypt.
 * Returns a promise to simulate async nature of hashing.
 */
const hashPassword = (password: string): Promise<string> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const salt = `salt${Math.random()}`;
            const hash = `bcrypt_sim_${salt}_${btoa(password)}`;
            resolve(hash);
        }, 100); // simulate async work
    });
};

/**
 * Simulates verifying a password against a hash, mimicking bcrypt.compare.
 * Returns a promise to simulate async nature of comparison.
 */
const verifyPassword = (password: string, hash: string): Promise<boolean> => {
     return new Promise(resolve => {
        setTimeout(() => {
            try {
                const parts = hash.split('_');
                if (parts.length !== 4 || parts[0] !== 'bcrypt' || parts[1] !== 'sim') {
                    resolve(false);
                }
                const decodedPassword = atob(parts[3]);
                resolve(password === decodedPassword);
            } catch (e) {
                resolve(false);
            }
        }, 100); // simulate async work
    });
};

// --- Bank Details Encryption (Using Web Crypto API) ---
let cryptoKey: CryptoKey;
const generateKey = async () => {
    if (!cryptoKey) {
        try {
            cryptoKey = await window.crypto.subtle.generateKey(
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );
        } catch (e) {
            console.error("Error generating crypto key:", e);
        }
    }
};
// Ensure key is generated when the module loads
generateKey();

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

const base64ToArrayBuffer = (base64: string) => {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
};

/**
 * Encrypts data using AES-GCM with the Web Crypto API.
 * Returns a structured object with the IV and ciphertext.
 */
const encrypt = async (data: string): Promise<EncryptedData> => {
    if (!cryptoKey) await generateKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);

    const ciphertext = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        cryptoKey,
        encodedData
    );

    return {
        iv: arrayBufferToBase64(iv),
        ciphertext: arrayBufferToBase64(ciphertext)
    };
};

/**
 * Decrypts data using AES-GCM with the Web Crypto API.
 * Not used in the app flow for security, but implemented for completeness.
 */
const decrypt = async (encryptedData: EncryptedData): Promise<string> => {
    if (!cryptoKey) await generateKey();
    try {
        const iv = base64ToArrayBuffer(encryptedData.iv);
        const ciphertext = base64ToArrayBuffer(encryptedData.ciphertext);

        const decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            cryptoKey,
            ciphertext
        );
        return new TextDecoder().decode(decrypted);
    } catch (e) {
        console.error('Decryption failed:', e);
        return 'Decryption Error';
    }
};


// --- USER MANAGEMENT ---

export const addUser = async (userData: Omit<User, 'id' | 'status' | 'passwordHash' | 'createdAt'> & { password: string, faceReferenceImage: string }): Promise<User> => {
    const existingUser = await getUserByEmail(userData.email);
    if (existingUser) {
        throw new Error('An account with this email already exists.');
    }
    
    const passwordHash = await hashPassword(userData.password);
    const newUser: User = {
        name: userData.name,
        dob: userData.dob,
        mobile: userData.mobile,
        email: userData.email,
        faceReferenceImage: userData.faceReferenceImage,
        id: `user-${Date.now()}`,
        status: 'ACTIVE',
        passwordHash: passwordHash,
        createdAt: new Date().toISOString(),
        adminNotes: [],
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

export const verifyUserCredentials = async (email: string, password: string): Promise<User | null> => {
    const user = await getUserByEmail(email);
    if (!user) {
        return null;
    }
    const isPasswordCorrect = await verifyPassword(password, user.passwordHash);
    return isPasswordCorrect ? user : null;
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
    const encryptedBankName = await encrypt(details.bankName);
    const encryptedAccountNumber = await encrypt(details.accountNumber);
    const encryptedBranchName = await encrypt(details.branchName);
    const encryptedIfscCode = await encrypt(details.ifscCode);
    const encryptedAccountHolderName = await encrypt(details.accountHolderName);
    const encryptedAccountType = await encrypt(details.accountType);
    const encryptedBranchAddress = await encrypt(details.branchAddress);
    
    const encryptedDetails: EncryptedBankDetails = {
        userId,
        encryptedBankName,
        encryptedAccountNumber,
        encryptedBranchName,
        encryptedIfscCode,
        encryptedAccountHolderName,
        encryptedAccountType,
        encryptedBranchAddress,
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

// --- VERIFICATION INCIDENT MANAGEMENT ---

export const createVerificationIncident = async (userId: string, userName: string, capturedImage: string) => {
    const incident: VerificationIncident = {
        id: `inc-${Date.now()}`,
        userId,
        userName,
        capturedImage,
        timestamp: new Date().toISOString(),
        status: 'PENDING_REVIEW'
    };
    db.verificationIncidents.push(incident);
    // Automatically block the user's account
    await updateUserStatus(userId, 'BLOCKED');
    return incident;
};

export const getPendingIncidents = async (): Promise<VerificationIncident[]> => {
    return db.verificationIncidents
        .filter(inc => inc.status === 'PENDING_REVIEW')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const getEscalatedIncidents = async (): Promise<VerificationIncident[]> => {
     return db.verificationIncidents
        .filter(inc => inc.status === 'ESCALATED')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const escalateIncident = async (incidentId: string): Promise<boolean> => {
    const incident = db.verificationIncidents.find(inc => inc.id === incidentId);
    if(incident) {
        incident.status = 'ESCALATED';
        return true;
    }
    return false;
};

export const resolveIncident = async (incidentId: string): Promise<boolean> => {
    const incident = db.verificationIncidents.find(inc => inc.id === incidentId);
    if(incident) {
        incident.status = 'RESOLVED';
        return true;
    }
    return false;
}


// --- BIOMETRIC SIMULATION (PERCEPTUAL HASH) ---
const getGrayscalePixelData = async (base64Image: string, width: number, height: number): Promise<Uint8ClampedArray | null> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                const imageData = ctx.getImageData(0, 0, width, height);
                // Convert to grayscale for hash consistency
                for (let i = 0; i < imageData.data.length; i += 4) {
                    const avg = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
                    imageData.data[i] = avg; // R
                    imageData.data[i + 1] = avg; // G
                    imageData.data[i + 2] = avg; // B
                }
                resolve(imageData.data);
            } else {
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = base64Image;
    });
};

/**
 * Creates a "difference hash" of an image. This is a form of perceptual hash
 * that is resilient to minor changes in lighting and angle but sensitive to
 * major changes in image structure (i.e., a different face).
 */
const createDifferenceHash = async (base64Image: string): Promise<string | null> => {
    const width = 9, height = 8;
    const pixelData = await getGrayscalePixelData(base64Image, width, height);
    if (!pixelData) return null;

    let hash = '';
    // Compare adjacent pixels' brightness
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width - 1; x++) {
            const leftPixelIndex = (y * width + x) * 4;
            const rightPixelIndex = (y * width + (x + 1)) * 4;
            const leftPixelBrightness = pixelData[leftPixelIndex];
            const rightPixelBrightness = pixelData[rightPixelIndex];
            hash += (leftPixelBrightness > rightPixelBrightness) ? '1' : '0';
        }
    }
    return hash; // Returns a 64-bit string like '1011001...'
};

/**
 * Compares two images by generating their perceptual hashes and calculating the
 * Hamming distance (number of different bits) between them.
 */
export const simulateBiometricComparison = async (baseImage: string, newImage: string): Promise<boolean> => {
    if (!baseImage || !newImage) return false;

    const [baseHash, newHash] = await Promise.all([
        createDifferenceHash(baseImage),
        createDifferenceHash(newImage)
    ]);

    if (!baseHash || !newHash || baseHash.length !== newHash.length) {
        console.error("Failed to generate one or both image hashes.");
        return false;
    }

    // Calculate Hamming distance
    let distance = 0;
    for (let i = 0; i < baseHash.length; i++) {
        if (baseHash[i] !== newHash[i]) {
            distance++;
        }
    }
    
    // A common threshold for a 64-bit dHash is ~10.
    // A lower threshold is stricter. This should distinguish different faces.
    // Increased tolerance to prevent false negatives for the same user.
    const threshold = 15;

    console.log(`Biometric Hamming Distance (lower is better): ${distance}`, `Threshold: <= ${threshold}`);
    return distance <= threshold;
};


// --- ACCOUNT STABILITY SCORE ---

export const calculateAccountStabilityScore = async (userId: string): Promise<number> => {
    const user = await getUser(userId);
    const transactions = await getTransactionsForUser(userId);
    const incidents = db.verificationIncidents.filter(inc => inc.userId === userId);

    if (!user) return 0;

    let score = 50; // Start with a neutral score

    // Factor 1: Account Age (up to +15 points)
    const accountAgeDays = (new Date().getTime() - new Date(user.createdAt).getTime()) / (1000 * 3600 * 24);
    score += Math.min(15, Math.floor(accountAgeDays / 30)); // 1 point per month, max 15

    // Factor 2: Transaction History (up to +15 points)
    score += Math.min(15, Math.floor(transactions.length / 5)); // 1 point per 5 transactions, max 15

    // Factor 3: Risk Profile (can be negative or positive)
    const highRiskTxns = transactions.filter(t => t.riskLevel === 'HIGH' || t.riskLevel === 'CRITICAL').length;
    const lowRiskTxns = transactions.filter(t => t.riskLevel === 'LOW').length;
    score -= highRiskTxns * 5; // -5 for each high risk transaction
    score += Math.min(10, Math.floor(lowRiskTxns / 10)); // +1 for every 10 low risk, max 10

    // Factor 4: Security Incidents (-25 each)
    score -= incidents.length * 25;

    // Factor 5: Account Status
    if (user.status === 'BLOCKED') score -= 50;
    if (user.status === 'UNDER_REVIEW') score -= 20;

    // Normalize score to be between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
};


// --- ADMIN ACTIONS ---
export const getBlockedUsers = async (): Promise<User[]> => {
    return db.users.filter(u => u.status === 'BLOCKED');
};

export const addAdminNoteToUser = async (userId: string, note: string): Promise<boolean> => {
    const user = await getUser(userId);
    if(user) {
        if (!user.adminNotes) {
            user.adminNotes = [];
        }
        user.adminNotes.push(`${new Date().toISOString()}: ${note}`);
        return true;
    }
    return false;
};

// --- USER ANALYTICS ---

const categorizeRecipient = (recipient: string): string => {
    const lowerRecipient = recipient.toLowerCase();
    if (['amazon', 'flipkart', 'myntra'].some(s => lowerRecipient.includes(s))) return 'Shopping';
    if (['zomato', 'swiggy', 'bigbasket'].some(s => lowerRecipient.includes(s))) return 'Food & Dining';
    if (['netflix', 'recharge'].some(s => lowerRecipient.includes(s))) return 'Bills & Utilities';
    if (['uber', 'bookmyshow'].some(s => lowerRecipient.includes(s))) return 'Travel & Entertainment';
    if (['crypto', 'exchange'].some(s => lowerRecipient.includes(s))) return 'Investments';
    if (['pharmacy', 'medical'].some(s => lowerRecipient.includes(s))) return 'Health';
    return 'Miscellaneous';
};

export const getUserAnalytics = async (userId: string): Promise<UserAnalyticsData> => {
    const transactions = await getTransactionsForUser(userId);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTransactions = transactions.filter(tx => new Date(tx.time) >= thirtyDaysAgo);

    // Spending over time (last 30 days)
    const spendingOverTimeMap: { [key: string]: number } = {};
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        spendingOverTimeMap[dateString] = 0;
    }
    recentTransactions.forEach(tx => {
        const dateString = tx.time.split('T')[0];
        if (spendingOverTimeMap[dateString] !== undefined) {
            spendingOverTimeMap[dateString] += tx.amount;
        }
    });
    const spendingOverTime = Object.entries(spendingOverTimeMap).map(([date, amount]) => ({ date, amount }));

    // Spending by category (all time)
    const spendingByCategoryMap: { [key: string]: number } = {};
    transactions.forEach(tx => {
        const category = categorizeRecipient(tx.recipient);
        spendingByCategoryMap[category] = (spendingByCategoryMap[category] || 0) + tx.amount;
    });
    const spendingByCategory = Object.entries(spendingByCategoryMap)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);

    // Top payees (all time)
    const topPayeesMap: { [key: string]: number } = {};
    transactions.forEach(tx => {
        topPayeesMap[tx.recipient] = (topPayeesMap[tx.recipient] || 0) + tx.amount;
    });
    const topPayees = Object.entries(topPayeesMap)
        .map(([recipient, amount]) => ({ recipient, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
    
    return { spendingOverTime, spendingByCategory, topPayees };
};