


import { GoogleGenAI, Type, Part } from "@google/genai";
import { Transaction, RiskAnalysisResult, User, TransactionType } from '../types';
import { getTransactionsForUser, DAILY_UPI_LIMIT, WEEKLY_UPI_LIMIT, DAILY_IMPS_LIMIT, WEEKLY_IMPS_LIMIT } from './databaseService';

// @google/genai-sdk: Initialize with named apiKey parameter
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

/**
 * Cleans and parses a JSON string that may be wrapped in markdown code fences.
 * @param jsonString The raw string from the API.
 * @param context A string for logging purposes.
 * @returns The parsed JSON object.
 */
function cleanAndParseJson(jsonString: string, context: string): any {
  // The model can sometimes wrap the JSON in ```json ... ```.
  const match = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
  const strToParse = match ? match[1] : jsonString;

  try {
    return JSON.parse(strToParse.trim());
  } catch (e) {
    console.error(`Failed to parse JSON response for ${context}:`, strToParse);
    // Let's re-throw the original string for better debugging.
    console.error(`Original string from API for ${context}:`, jsonString);
    throw new Error(`Invalid JSON format received from Gemini API for ${context}.`);
  }
}


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

    Based on this logic, calculate a final risk score and provide a step-by-step analysis log explaining your reasoning based on the principles above. Each item in the 'analysis' array must be a single, concise sentence without any newline characters.
  `;

  // @google/genai-sdk: Use modern ai.models.generateContent API
  const response = await ai.models.generateContent({
    // OPTIMIZATION: Switched to gemini-2.5-flash for faster, real-time transaction analysis.
    model: "gemini-2.5-flash",
    contents: [{ parts: [{ text: prompt }] }],
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

  // @google/genai-sdk: Use response.text to access response, fixing "not callable" error
  const jsonString = response.text;
  
  if (!jsonString) {
    throw new Error("Received empty response from Gemini API.");
  }
  
  return cleanAndParseJson(jsonString, 'transaction analysis');
};

export const verifyFaceSimilarity = async (
    referenceImage: string, 
    liveImage: string
): Promise<{faceSimilarityScore: number; reason: string}> => {
  
  const prompt = `
    You are a high-performance biometric verification API. Your task is to strictly compare a "Live Capture Image" against a "Reference Image" and return a JSON object.

    Analyze stable facial landmarks (e.g., distance between eyes, nose shape, jaw structure). Be resilient to minor changes in lighting, expression, or accessories like glasses.

    Based on your analysis, provide a \`faceSimilarityScore\` from 0 to 100. A score of 100 is an identical match. Be critical in your scoring. A score below 85 should be considered a likely mismatch.

    Your response MUST be a JSON object with this exact structure:
    {
      "faceSimilarityScore": <integer>,
      "reason": "<string>"
    }

    Example for a good match:
    {"faceSimilarityScore": 95, "reason": "High similarity in key facial features."}

    Example for a poor match:
    {"faceSimilarityScore": 30, "reason": "Significant differences in nose and jaw structure detected."}

    Provide only the JSON object in your response.
  `;
  
  const referenceImagePart: Part = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: referenceImage.split(',')[1],
    },
  };

  const liveImagePart: Part = {
     inlineData: {
      mimeType: 'image/jpeg',
      data: liveImage.split(',')[1],
    },
  };
  
  const parts: Part[] = [
      { text: prompt },
      { text: "Reference Image:" },
      referenceImagePart,
      { text: "Live Capture Image:" },
      liveImagePart
  ];

  // @google/genai-sdk: Use modern ai.models.generateContent API
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          faceSimilarityScore: {
            type: Type.INTEGER,
            description: 'A score from 0 to 100 indicating the similarity between the reference and live images.'
          },
          reason: {
            type: Type.STRING,
            description: 'A brief, user-facing explanation for the result.'
          }
        },
        required: ["faceSimilarityScore", "reason"]
      }
    }
  });

  // @google/genai-sdk: Use response.text to access response, fixing "not callable" error
  const jsonString = response.text;
  if (!jsonString) {
    throw new Error("Received empty response from Gemini API for face verification.");
  }

  const parsed = cleanAndParseJson(jsonString, 'face verification');
  // The response schema might return a string for the number, so we parse it to be safe.
  if (typeof parsed.faceSimilarityScore === 'string') {
      parsed.faceSimilarityScore = parseInt(parsed.faceSimilarityScore, 10);
  }
  return parsed;
};