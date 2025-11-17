
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
        riskScore += 40; // Increased penalty
        analysis.push('CRITICAL: High-accuracy location services were denied by the user.');
    } else if (locationStatus === 'UNAVAILABLE') {
        riskScore += 15; // Increased penalty
        analysis.push('Location services unavailable. This is a moderate risk factor.');
    } else if (locationStatus === 'SUCCESS' && transaction.location) {
        if (typicalLocations.length > 0 && transaction.locationName) {
            const currentCity = transaction.locationName.split(',')[0];
            const isTypical = typicalLocations.some(loc => loc.city === currentCity);
            if (isTypical) {
                analysis.push('Transaction location is consistent with user history.');
            } else {
                riskScore += 50;
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
    simulateSuccess: boolean
  ): Promise<{ match: boolean; reason: string }> => {
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (!referenceImages || referenceImages.length === 0) {
      return { match: false, reason: "No reference images found for this user." };
    }

    // 1. Determine base confidence threshold
    let requiredConfidence = 90.0;
    let reasonForThreshold = `Base threshold: ${requiredConfidence.toFixed(1)}%.`;

    // 2. Adjust threshold based on transaction risk
    if (transaction?.riskLevel === RiskLevel.High) {
      requiredConfidence = 95.0;
      reasonForThreshold = `High-Risk Transaction threshold: ${requiredConfidence.toFixed(1)}%.`;
    } else if (transaction?.riskLevel === RiskLevel.Medium) {
      requiredConfidence = 92.5;
      reasonForThreshold = `Medium-Risk Transaction threshold: ${requiredConfidence.toFixed(1)}%.`;
    }

    // 3. Adjust threshold for new users
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (new Date(user.createdAt) > oneWeekAgo) {
      requiredConfidence += 1.5;
      reasonForThreshold += ` Stricter check (+1.5%) for new user account.`;
    }
    requiredConfidence = Math.min(99.0, requiredConfidence); // Cap it

    // 4. Simulate a realistic confidence score based on the user's toggle
    // This simulates analyzing multiple reference images and picking the best score
    const numImages = referenceImages.length;
    let confidenceScore;
    if (simulateSuccess) {
        // High score with slight variance
        confidenceScore = 96.0 + Math.random() * 3.5; // 96.0 to 99.5
    } else {
        // Low score with slight variance
        confidenceScore = 70.0 + Math.random() * 15.0; // 70.0 to 85.0
    }
    confidenceScore = parseFloat(confidenceScore.toFixed(1));

    // 5. Determine match and create final reason string
    const match = confidenceScore >= requiredConfidence;
    let reason = '';
    if (match) {
        reason = `Match successful. Best confidence of ${confidenceScore}% (from ${numImages} images) met the required threshold of ${requiredConfidence.toFixed(1)}%. ${reasonForThreshold}`;
    } else {
        reason = `Match failed. Best confidence of ${confidenceScore}% (from ${numImages} images) did not meet the required threshold of ${requiredConfidence.toFixed(1)}%. ${reasonForThreshold}`;
    }
    
    return { match, reason };
  },
};

export default geminiService;
