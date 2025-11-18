
import { User, Transaction, RiskAnalysisResult, RiskLevel, LocationStatus } from '../types';
import databaseService from './databaseService';

// This is a MOCK Gemini service. It simulates the responses of the real Gemini API
// to provide a fast and predictable development experience without actual API calls.

// --- Helper functions for more realistic AI simulation ---

// Creates a random "vector" (an array of numbers) to represent a face.
const createFaceVector = (): number[] => Array.from({ length: 128 }, () => Math.random() * 2 - 1);

// Calculates the cosine similarity between two vectors. Result is between -1 and 1.
// 1 means identical, 0 means orthogonal, -1 means opposite.
const calculateCosineSimilarity = (vecA: number[], vecB: number[]): number => {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
};


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

  analyzeRegistrationFace: async (
    faceImage: string
  ): Promise<{ gender: 'MALE' | 'FEMALE' | 'OTHER' }> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    // In a real scenario, this would be a sophisticated model.
    // Here we simulate it semi-deterministically based on image data length for consistency.
    const genders: Array<'MALE' | 'FEMALE'> = ['MALE', 'FEMALE'];
    const detectedGender = genders[faceImage.length % 2];
    return { gender: detectedGender };
  },
  
  verifyFaceSimilarity: async (
    liveImage: string,
    referenceImages: string[],
    transaction: Transaction | null = null,
    user: User,
    isImposterSimulation: boolean
  ): Promise<{ match: boolean; reason: string }> => {
    await new Promise(resolve => setTimeout(resolve, 1500));

    // The reference vectors are now stored with the user object
    const referenceVectors = user.faceReferenceVectors;

    if (!referenceVectors || referenceVectors.length === 0) {
      return { match: false; reason: "No reference face vectors found for this user." };
    }
    
    // 1. AI-POWERED GENDER CLASSIFICATION (SIMULATED & DETERMINISTIC)
    let liveFaceGender: 'MALE' | 'FEMALE' | 'OTHER';
    if (!isImposterSimulation) {
      // For a legitimate user, the detected gender must match their profile to ensure the check passes reliably.
      liveFaceGender = user.gender;
    } else {
      // For an imposter, run the "AI" analysis. It might fail here, or at the vector stage.
      const { gender } = await geminiService.analyzeRegistrationFace(liveImage);
      liveFaceGender = gender;
    }

    // 2. HARD RULE: GENDER MISMATCH CHECK
    if (user.gender !== 'OTHER' && liveFaceGender !== 'OTHER' && user.gender !== liveFaceGender) {
        return { match: false, reason: `TRANSACTION BLOCKED. Identity check failed with 100% certainty due to a gender mismatch. The system detected a ${liveFaceGender} face, but the account profile is registered as ${user.gender}.`};
    }

    // 3. Determine base similarity threshold (0.0 to 1.0 scale)
    let requiredSimilarity = 0.90;
    let reasonForThreshold = `Base threshold: ${requiredSimilarity.toFixed(2)}.`;

    // 4. Adjust threshold based on transaction risk
    if (transaction?.riskLevel === RiskLevel.High) {
      requiredSimilarity = 0.95;
      reasonForThreshold = `High-Risk Transaction threshold: ${requiredSimilarity.toFixed(2)}.`;
    } else if (transaction?.riskLevel === RiskLevel.Medium) {
      requiredSimilarity = 0.925;
      reasonForThreshold = `Medium-Risk Transaction threshold: ${requiredSimilarity.toFixed(2)}.`;
    }

    // 5. Adjust threshold for new users
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (new Date(user.createdAt) > oneWeekAgo) {
      requiredSimilarity += 0.015;
      reasonForThreshold += ` Stricter check (+0.015) for new user account.`;
    }
    requiredSimilarity = Math.min(0.99, requiredSimilarity); // Cap it

    // 6. Simulate a deterministic vector-based comparison
    let liveVector;
    
    if (!isImposterSimulation) {
        // GUARANTEED SUCCESS (LEGITIMATE USER): Simulate a live vector that is very similar to one of the STORED reference vectors.
        const referenceToMatch = referenceVectors[0]; // Match against the first stored vector
        liveVector = referenceToMatch.map(val => val + (Math.random() - 0.5) * 0.2); // Add tiny noise for realism
    } else {
        // GUARANTEED FAILURE (IMPOSTER): Simulate a completely different face vector.
        liveVector = createFaceVector();
    }
    
    const similarities = referenceVectors.map(refVec => calculateCosineSimilarity(liveVector, refVec));
    const bestSimilarity = Math.max(...similarities);

    // 7. Determine match and create final reason string
    const match = bestSimilarity >= requiredSimilarity;
    let reason = '';
    if (match) {
        reason = `Match successful. Best vector similarity of ${bestSimilarity.toFixed(3)} (from ${referenceVectors.length} reference vectors) met the required threshold of ${requiredSimilarity.toFixed(2)}. ${reasonForThreshold}`;
    } else {
        reason = `TRANSACTION BLOCKED. Face match failed. Best vector similarity of ${bestSimilarity.toFixed(3)} (from ${referenceVectors.length} reference vectors) did not meet the required threshold of ${requiredSimilarity.toFixed(2)}. ${reasonForThreshold}`;
    }
    
    return { match, reason };
  },
};

export default geminiService;
