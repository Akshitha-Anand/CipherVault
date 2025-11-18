export type Role = 'USER' | 'ADMIN' | 'ANALYST';

export type AccountStatus = 'ACTIVE' | 'BLOCKED' | 'UNDER_REVIEW';

// Represents the decrypted user object for an active session
export interface User {
  id: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dob: string;
  mobile: string;
  email: string;
  passwordHash: string;
  status: AccountStatus;
  faceReferenceImages?: string[]; // Array of Base64 encoded images
  faceReferenceVectors?: number[][]; // Array of 128-dimension vectors
  createdAt: string;
  adminNotes?: string[];
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  branchName: string;
  ifscCode: string;
  accountHolderName: string;
  accountType: 'SAVINGS' | 'CURRENT';
  branchAddress: string;
}

export interface EncryptedData {
  iv: string; // Base64 encoded IV
  ciphertext: string; // Base64 encoded ciphertext
}

// Represents how user data is stored in the "database"
export interface StoredUser {
  id: string;
  encryptedName: EncryptedData;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  encryptedDob: EncryptedData;
  encryptedMobile: EncryptedData;
  encryptedEmail: EncryptedData;
  passwordHash: string;
  status: AccountStatus;
  faceReferenceImages?: string[];
  faceReferenceVectors?: number[][]; // Array of 128-dimension vectors
  createdAt: string;
  adminNotes?: string[];
}


// Represents how bank data is stored in the "database"
export interface EncryptedBankDetails {
  userId: string;
  encryptedBankName: EncryptedData;
  encryptedAccountNumber: EncryptedData;
  encryptedBranchName: EncryptedData;
  encryptedIfscCode: EncryptedData;
  encryptedAccountHolderName: EncryptedData;
  encryptedAccountType: EncryptedData;
  encryptedBranchAddress: EncryptedData;
}

export type TransactionStatus = 'PENDING' | 'APPROVED' | 'BLOCKED_BY_AI' | 'BLOCKED_BY_USER' | 'FLAGGED_BY_USER' | 'CLEARED_BY_ANALYST' | 'ESCALATED' | 'PENDING_OTP';

export type TransactionType = 'UPI' | 'NEFT' | 'IMPS' | 'RTGS';

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  recipient: string;
  amount: number;
  type: TransactionType;
  location: {
    latitude: number;
    longitude: number;
  } | null;
  locationName?: string;
  time: string;
  riskLevel: RiskLevel;
  riskScore: number;
  status: TransactionStatus;
  aiAnalysisLog: string[];
}


export interface RiskAnalysisResult {
  riskScore: number;
  analysis: string[];
}

export interface AccountHealthStats {
    status: 'Stable' | 'Under Review' | 'At Risk';
    totalTransactions: number;
    monthlySpending: number;
    riskBreakdown: {
        low: number;
        medium: number;
        high: number;
    };
    stabilityScore: number;
}

export interface UserAnalyticsData {
  spendingOverTime: { date: string; amount: number }[];
  spendingByCategory: { category: string; amount: number }[];
  topPayees: { recipient: string; amount: number }[];
}

export enum ProcessState {
  Idle = 'IDLE',
  Analyzing = 'ANALYZING',
  VerificationOTP = 'VERIFICATION_OTP',
  VerificationBiometric = 'VERIFICATION_BIOMETRIC',
  Approved = 'APPROVED',
  Blocked = 'BLOCKED',
  Error = 'ERROR',
}

export enum RiskLevel {
    Low = 'LOW',
    Medium = 'MEDIUM',
    High = 'HIGH',
}

export type VerificationIncidentStatus = 'PENDING_REVIEW' | 'ESCALATED' | 'RESOLVED';

export interface VerificationIncident {
  id: string;
  userId: string;
  userName: string;
  timestamp: string;
  capturedImage: string; // Base64 of the failed attempt
  status: VerificationIncidentStatus;
}

export type LocationStatus = 'PENDING' | 'SUCCESS' | 'DENIED' | 'UNAVAILABLE';

export interface UserBehavioralProfile {
  averageAmount: number;
  stdDevAmount: number;
  commonRecipients: string[];
  typicalHours: { start: number; end: number };
  transactionCount: number;
}

export enum NotificationType {
    HighRiskTransaction = 'HIGH_RISK_TRANSACTION',
    AccountBlocked = 'ACCOUNT_BLOCKED',
    AccountUnblocked = 'ACCOUNT_UNBLOCKED',
    AccountUnderReview = 'ACCOUNT_UNDER_REVIEW',
    TransactionOTP = 'TRANSACTION_OTP',
}

export interface Notification {
    id: string;
    userId: string;
    message: string;
    type: NotificationType;
    timestamp: string;
    read: boolean;
    transactionId?: string;
    otpCode?: string;
}

export interface TypicalLocation {
  city: string;
  count: number;
}