export type Role = 'USER' | 'ADMIN' | 'ANALYST';

export type AccountStatus = 'ACTIVE' | 'BLOCKED' | 'UNDER_REVIEW';

export interface User {
  id: string;
  name: string;
  dob: string;
  mobile: string;
  email: string;
  status: AccountStatus;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
}

// Represents how data is stored in the "database"
export interface EncryptedBankDetails {
  userId: string;
  encryptedBankName: string;
  encryptedAccountNumber: string;
}

export type TransactionStatus = 'PENDING' | 'APPROVED' | 'BLOCKED_BY_AI' | 'BLOCKED_BY_USER' | 'FLAGGED_BY_USER' | 'CLEARED_BY_ANALYST' | 'ESCALATED';

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  recipient: string;
  amount: number;
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