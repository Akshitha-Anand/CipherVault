import db from '../database/mockDatabase';
import { User, BankDetails, Transaction, EncryptedBankDetails, AccountStatus, TransactionStatus, RiskLevel, EncryptedData, VerificationIncident } from '../types';

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

export const addUser = async (userData: Omit<User, 'id' | 'status' | 'passwordHash'> & { password: string, faceReferenceImage: string }): Promise<User> => {
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
    
    const encryptedDetails: EncryptedBankDetails = {
        userId,
        encryptedBankName,
        encryptedAccountNumber,
        encryptedBranchName,
        encryptedIfscCode,
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


// --- BIOMETRIC SIMULATION ---

/**
 * A simple, fuzzy comparison of two base64 image strings.
 * This is a simulation and not cryptographically secure.
 * It checks for similarity in length and a checksum of character codes.
 */
export const simulateBiometricComparison = (baseImage: string, newImage: string): Promise<boolean> => {
    return new Promise(resolve => {
        setTimeout(() => {
            if (!baseImage || !newImage) {
                resolve(false);
            }

            // 1. Check if lengths are reasonably similar (within 20%)
            const lengthDifference = Math.abs(baseImage.length - newImage.length);
            const lengthThreshold = baseImage.length * 0.20;
            if (lengthDifference > lengthThreshold) {
                resolve(false);
                return;
            }

            // 2. Simple checksum of character codes for a block of the string
            const getChecksum = (str: string) => {
                let sum = 0;
                const part = str.substring(str.length / 2, str.length / 2 + 1000); // Check a 1000-char block from the middle
                for (let i = 0; i < part.length; i++) {
                    sum += part.charCodeAt(i);
                }
                return sum;
            };

            const baseChecksum = getChecksum(baseImage);
            const newChecksum = getChecksum(newImage);

            // 3. Check if checksums are reasonably similar (within 5%)
            const checksumDifference = Math.abs(baseChecksum - newChecksum);
            const checksumThreshold = baseChecksum * 0.05;
            
            resolve(checksumDifference <= checksumThreshold);

        }, 500); // Simulate processing time
    });
};