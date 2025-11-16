export type Role = 'USER' | 'ADMIN' | 'ANALYST';

export type AccountStatus = 'ACTIVE' | 'BLOCKED' | 'UNDER_REVIEW';

export interface User {
  id: string;
  name: string;
  dob: string;
  mobile: string;
  email: string;
  passwordHash: string;
  status: AccountStatus;
  faceReferenceImages?: string[]; // Array of Base64 encoded images
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

// Represents how data is stored in the "database"
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

export type TransactionStatus = 'PENDING' | 'APPROVED' | 'BLOCKED_BY_AI' | 'BLOCKED_BY_USER' | 'FLAGGED_BY_USER' | 'CLEARED_BY_ANALYST' | 'ESCALATED';

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
  AwaitingUserAction = 'AWAITING_USER_ACTION',
  VerificationOTP = 'VERIFICATION_OTP',
  VerificationBiometric = 'VERIFICATION_BIOMETRIC',
  Approved = 'APPROVED',
  Blocked = 'BLOCKED',
  Error = 'ERROR'
}

export enum RiskLevel {
    Idle = 'IDLE',
    Low = 'LOW',
    Medium = 'MEDIUM',
    High = 'HIGH',
    Critical = 'CRITICAL'
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