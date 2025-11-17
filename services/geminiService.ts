import { User, Transaction, RiskAnalysisResult, RiskLevel, LocationStatus } from '../types';
import databaseService from './databaseService';

// This is a MOCK Gemini service. It simulates the responses of the real Gemini API
// to provide a fast and predictable development experience without actual API calls.

const geminiService = {
  analyzeTransaction: async (
    transaction: Omit<Transaction, 'id' | 'riskLevel' | 'riskScore' | 'status' | 'aiAnalysisLog' | 'userName'>,
    user: User,
    locationStatus: LocationStatus
  ): Promise<RiskAnalysisResult & { riskLevel: RiskLevel }> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    let riskScore = 0;
    const analysis: string[] = [];

    const profile = await databaseService.getUserBehavioralProfile(user.id);
    const userHistory = await databaseService.getUserTransactions(user.id);
    const typicalLocations = await databaseService.getUserTypicalLocations(user.id);

    // 1. UPI Tiered Risk
    if (transaction.type === 'UPI') {
        if (transaction.amount > 60000 && transaction.amount <= 100000) {
            riskScore += 60;
            analysis.push('High-value UPI transaction amount detected.');
        } else if (transaction.amount > 20000 && transaction.amount <= 60000) {
            riskScore += 35;
            analysis.push('Medium-value UPI transaction amount.');
        } else {
            analysis.push('Low-value UPI transaction within normal limits.');
        }
    }

    // 2. Repeated Payments in a day
    const today = new Date().toDateString();
    const paymentsToRecipientToday = userHistory.filter(
      (tx) => tx.recipient === transaction.recipient && new Date(tx.time).toDateString() === today
    ).length;

    if (paymentsToRecipientToday >= 3) {
      riskScore += 40;
      analysis.push(`Frequent payments (${paymentsToRecipientToday + 1}) to the same recipient in one day.`);
    }
    
    // 3. Behavioral Anomaly Detection
    if (profile.transactionCount > 5) {
        // Amount outlier check
        const deviationThreshold = profile.averageAmount + 2.5 * profile.stdDevAmount;
        if (transaction.amount > deviationThreshold && profile.stdDevAmount > 0) {
            riskScore += 65;
            analysis.push(`Amount is a significant outlier from user's average spending of ₹${profile.averageAmount.toFixed(0)}.`);
        }

        // Unusual recipient check
        if (!profile.commonRecipients.includes(transaction.recipient)) {
            riskScore += 25;
            analysis.push(`Payment to an infrequent or new recipient.`);
        }

        // Unusual time check based on profile
        const transactionHour = new Date(transaction.time).getHours();
        if (transactionHour < profile.typicalHours.start || transactionHour > profile.typicalHours.end) {
            riskScore += 30;
            analysis.push(`Transaction occurs outside of user's typical hours (${profile.typicalHours.start}:00-${profile.typicalHours.end}:00).`);
        }

    } else {
        analysis.push("New user profile. Applying standard checks.");
        // Fallback for new users: General unusual time check
        const transactionHour = new Date(transaction.time).getHours();
        if (transactionHour >= 1 && transactionHour < 6) { // Between 1 AM and 6 AM
            riskScore += 45;
            analysis.push('Transaction occurs during unusual late-night hours.');
        }
    }
    
    // 4. Geolocation service status & Historical comparison
    if (locationStatus === 'DENIED') {
        riskScore += 50; // Increased penalty
        analysis.push('CRITICAL: High-accuracy location services were denied by the user.');
    } else if (locationStatus === 'UNAVAILABLE') {
        riskScore += 20; // Increased penalty
        analysis.push('Location services unavailable. This is a moderate risk factor.');
    } else if (locationStatus === 'SUCCESS' && transaction.location) {
        if (typicalLocations.length > 0 && transaction.locationName) {
            const currentCity = transaction.locationName.split(',')[0];
            const isTypical = typicalLocations.some(loc => loc.city === currentCity);
            if (isTypical) {
                analysis.push('Transaction location is consistent with user history.');
            } else {
                riskScore += 60; // Increased penalty for geographical anomaly
                analysis.push(`HIGH RISK: Transaction from an unusual location (${transaction.locationName}). User's typical locations: ${typicalLocations.map(l => l.city).join(', ')}.`);
            }
        } else {
            analysis.push('User location captured. Not enough history for location anomaly detection.');
        }
    }

    // 5. User account status
    if(user.status === 'UNDER_REVIEW') {
        riskScore += 15;
        analysis.push('User account is currently under review.');
    }

    riskScore = Math.min(100, riskScore); // Cap at 100

    const riskLevel =
      riskScore >= 60 ? RiskLevel.High :
      riskScore >= 35 ? RiskLevel.Medium :
      RiskLevel.Low;
      
    if(riskLevel === RiskLevel.Low && analysis.length > 0) {
        analysis.unshift('Overall risk profile appears low despite minor flags.');
    } else if (riskLevel === RiskLevel.Low) {
        analysis.push('Transaction appears routine and safe.');
    }

    return { riskScore, analysis, riskLevel };
  },

  verifyFaceSimilarity: async (
    liveImage: string,
    referenceImages: string[],
    transaction: Transaction | null = null,
    user: User,
    simulateSuccess: boolean,
    simulatedGender: 'MALE' | 'FEMALE' | 'OTHER'
  ): Promise<{ match: boolean; reason: string }> => {
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (!referenceImages || referenceImages.length === 0) {
      return { match: false, reason: "No reference images found for this user." };
    }
    
    // 1. GENDER MISMATCH CHECK (NEW)
    if (user.gender !== 'OTHER' && simulatedGender !== 'OTHER' && user.gender !== simulatedGender) {
        return { match: false, reason: `Match failed with 100% certainty. Obvious gender mismatch detected. User profile is ${user.gender}, simulation was ${simulatedGender}.`};
    }

    // 2. Determine base confidence threshold
    let requiredConfidence = 90.0;
    let reasonForThreshold = `Base threshold: ${requiredConfidence.toFixed(1)}%.`;

    // 3. Adjust threshold based on transaction risk
    if (transaction?.riskLevel === RiskLevel.High) {
      requiredConfidence = 95.0;
      reasonForThreshold = `High-Risk Transaction threshold: ${requiredConfidence.toFixed(1)}%.`;
    } else if (transaction?.riskLevel === RiskLevel.Medium) {
      requiredConfidence = 92.5;
      reasonForThreshold = `Medium-Risk Transaction threshold: ${requiredConfidence.toFixed(1)}%.`;
    }

    // 4. Adjust threshold for new users
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (new Date(user.createdAt) > oneWeekAgo) {
      requiredConfidence += 1.5;
      reasonForThreshold += ` Stricter check (+1.5%) for new user account.`;
    }
    requiredConfidence = Math.min(99.0, requiredConfidence); // Cap it

    // 5. Simulate a deterministic multi-image comparison
    const numImages = referenceImages.length;
    let bestScore;
    
    if (simulateSuccess) {
        // GUARANTEED SUCCESS: Simulate a very close match.
        // The score will always be higher than the required threshold.
        bestScore = requiredConfidence + (Math.random() * (99.8 - requiredConfidence));
    } else {
        // GUARANTEED FAILURE: Simulate a very poor match.
        // The score will always be significantly lower than the required threshold.
        bestScore = requiredConfidence - 20 - (Math.random() * 30); // 20 to 50 points below
    }

    bestScore = Math.max(0, parseFloat(bestScore.toFixed(1)));

    // 6. Determine match and create final reason string
    const match = bestScore >= requiredConfidence;
    let reason = '';
    if (match) {
        reason = `Match successful. Best confidence of ${bestScore}% (from ${numImages} images) met the required threshold of ${requiredConfidence.toFixed(1)}%. ${reasonForThreshold}`;
    } else {
        reason = `Match failed. Best confidence of ${bestScore}% (from ${numImages} images) did not meet the required threshold of ${requiredConfidence.toFixed(1)}%. ${reasonForThreshold}`;
    }
    
    return { match, reason };
  },
};

export default geminiService;