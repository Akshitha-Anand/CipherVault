import { GoogleGenAI, Type, Part } from "@google/genai";
import { Transaction, RiskAnalysisResult, User, TransactionType } from '../types';
import { getTransactionsForUser, DAILY_UPI_LIMIT, WEEKLY_UPI_LIMIT, DAILY_IMPS_LIMIT, WEEKLY_IMPS_LIMIT } from './databaseService';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const getLimitForType = (type: TransactionType) => {
    switch(type) {
        case 'UPI': return { daily: DAILY_UPI_LIMIT, weekly: WEEKLY_UPI_LIMIT };
        case 'IMPS': return { daily: DAILY_IMPS_LIMIT, weekly: WEEKLY_IMPS_LIMIT };
        default: return { daily: Infinity, weekly: Infinity };
    }
}

export const analyzeTransaction = async (
    details: Omit<Transaction, 'id' | 'riskLevel' | 'riskScore' | 'status' | 'aiAnalysisLog'>, 
    user: User,
    dailyTotal: number,
    weeklyTotal: number
): Promise<RiskAnalysisResult> => {
  
  const userTransactionHistory = await getTransactionsForUser(user.id);

  const userTransactionHistoryString = userTransactionHistory.length > 0 
    ? userTransactionHistory
      .slice(-5) // Get last 5 transactions for brevity
      .map(t => `- ₹${t.amount} to ${t.recipient} (${t.type})`)
      .join('\n')
    : 'No recent transactions found.';
  
  const limits = getLimitForType(details.type);

  const prompt = `
    You are an AI fraud detection engine for a service called CipherVault. 
    Your primary goal is to analyze the context of a financial transaction to determine its risk level, providing a score from 0-100.
    All currency is in Indian Rupees (INR).

    **User Profile:**
    - Name: ${user.name}
    - Account Status: ${user.status}
    - Location Info: This user typically transacts from a primary, known location.
    - Recent Transaction History:
    ${userTransactionHistoryString}
    - Typical Behavior: Spends are usually on e-commerce, food, and subscriptions. Large, unusual, or international transfers are rare.

    **Spending Limit Context (for ${details.type}):**
    - Daily Limit: ₹${limits.daily.toLocaleString('en-IN')}
    - Current Daily Spending: ₹${dailyTotal.toLocaleString('en-IN')}
    - Weekly Limit: ₹${limits.weekly.toLocaleString('en-IN')}
    - Current Weekly Spending: ₹${weeklyTotal.toLocaleString('en-IN')}

    **Transaction to Analyze:**
    - Type: "${details.type}"
    - Recipient: "${details.recipient}"
    - Amount: ₹${details.amount}
    - Location: ${details.location ? `Latitude ${details.location.latitude}, Longitude ${details.location.longitude}` : 'Unknown'}
    - Time: "${new Date(details.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}"

    **Decision Logic & Guiding Principles:**
    Your analysis must prioritize context over the raw transaction amount. A transaction's risk is determined by how much it deviates from the user's established pattern. Use these principles to guide your score:
    - UPI transactions are for smaller, frequent payments. A very large UPI transfer is inherently more suspicious.
    - NEFT/RTGS are for larger, less frequent transfers. A small NEFT payment is unusual but not necessarily risky. IMPS is for instant transfers of moderate value.
    - Consider the transaction type in context with the amount and recipient. A ₹90,000 UPI to a new individual is more suspicious than a ₹90,000 NEFT to a known business account.


    1.  **LOW RISK (Score 0-40):** A transaction is low risk if it fits the user's normal pattern, even if the amount is large for the right transaction type.
        -   *Example:* A large payment of ₹75,000 via NEFT to a recipient named 'Landlord Rent' from the user's home location is LOW RISK if it's a recurring payee.
        -   *Example:* A typical online shopping purchase from a known merchant like 'Amazon.in' via UPI is LOW RISK.

    2.  **MEDIUM RISK (Score 41-70):** A transaction is medium risk if it has one or two moderate deviations from the user's pattern. These warrant user confirmation (like an OTP).
        -   *Example:* A payment of ₹30,000 via IMPS for a typical category (e.g., 'Croma Electronics') but from a completely new city the user has never transacted from before is MEDIUM RISK.
        -   *Example:* A first-time payment to a new person or service that is significantly larger than the user's average transaction amount is MEDIUM RISK.
        -   *Example:* A UPI transaction that brings the user very close to their daily spending limit (e.g., 95% of the way) can be considered MEDIUM RISK, as it could be an attempt to maximize a cash-out.

    3.  **HIGH/CRITICAL RISK (Score 71-100):** A transaction is high risk if it has multiple, significant deviations from the pattern, especially if it involves high-risk categories. These warrant strong verification (like biometrics).
        -   *Example:* A small UPI payment of ₹5,000 to a brand new, international recipient at an unusual time (e.g., 3 AM) is HIGH RISK, despite the low amount.
        -   *Example:* Any payment, regardless of amount or type, to a high-risk category like an offshore crypto exchange for the first time is CRITICAL RISK.
        -   *Example:* A large payment from a foreign country when the user's history is exclusively domestic is CRITICAL RISK.
        -   *Example:* A single UPI transaction for ₹1,00,000 to a new recipient should be considered CRITICAL RISK as it's an attempt to max out the daily limit in one go.

    Based on this logic, calculate a final risk score and provide a step-by-step analysis log explaining your reasoning based on the principles above.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          riskScore: {
            type: Type.INTEGER,
            description: 'A risk score from 0 to 100, where 100 is the highest risk, based on the provided decision logic.'
          },
          analysis: {
            type: Type.ARRAY,
            description: 'An array of strings detailing the step-by-step risk analysis, explaining WHY the score was given based on the guiding principles.',
            items: {
              type: Type.STRING
            }
          }
        },
        required: ["riskScore", "analysis"]
      }
    }
  });

  const jsonString = response.text;
  
  if (!jsonString) {
    throw new Error("Received empty response from Gemini API.");
  }

  try {
    const parsedResult: RiskAnalysisResult = JSON.parse(jsonString);
    return parsedResult;
  } catch (e) {
    console.error("Failed to parse JSON response:", jsonString);
    throw new Error("Invalid JSON format received from Gemini API.");
  }
};

export const verifyFaceWithLiveness = async (
    referenceImages: string[], 
    liveImage: string, 
    challenge: 'SMILE' | 'BLINK'
): Promise<{isSamePerson: boolean; livenessCheckPassed: boolean; reason: string}> => {
  
  const prompt = `
    You are a sophisticated biometric verification AI. Your task is to perform two checks based on the series of images provided after this text.
    The first ${referenceImages.length} images are the user's "Reference Images" on file.
    The final image is the "Live Capture" for this verification attempt.

    1.  **Face Matching**: Compare the "Live Capture" against the "Reference Images". Determine if they belong to the same person. Account for minor variations in lighting, angle, and expression.
    2.  **Liveness Test**: The user was asked to ${challenge}. Determine if the person in the "Live Capture" image is performing this action.
        - For a SMILE: Look for upward-curving corners of the mouth and possibly visible teeth. A neutral expression is a failure.
        - For a BLINK: Look for closed or nearly closed eyelids. Open eyes are a failure.

    Analyze the images and provide a JSON response with your findings. The 'reason' should be a brief, user-facing explanation for any failure (e.g., "User was not smiling.", "Face does not match our records."). If successful, the reason should be "Verification successful."
  `;
  
  const imageParts: Part[] = referenceImages.map(img => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: img.split(',')[1], // remove data:image/jpeg;base64,
    },
  }));

  imageParts.push({
     inlineData: {
      mimeType: 'image/jpeg',
      data: liveImage.split(',')[1],
    },
  });

  const parts: Part[] = [{ text: prompt }, ...imageParts];

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isSamePerson: {
            type: Type.BOOLEAN,
            description: 'True if the person in the live capture is the same as in the reference images.'
          },
          livenessCheckPassed: {
            type: Type.BOOLEAN,
            description: 'True if the person is performing the requested liveness action (e.g., smiling, blinking).'
          },
          reason: {
            type: Type.STRING,
            description: 'A brief, user-facing explanation for the result, especially on failure.'
          }
        },
        required: ["isSamePerson", "livenessCheckPassed", "reason"]
      }
    }
  });

  const jsonString = response.text;
  if (!jsonString) {
    throw new Error("Received empty response from Gemini API for face verification.");
  }

  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Failed to parse JSON response for face verification:", jsonString);
    throw new Error("Invalid JSON format received from Gemini API for face verification.");
  }
};