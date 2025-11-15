import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, RiskAnalysisResult, User } from '../types';
import { getTransactionsForUser } from './databaseService';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const analyzeTransaction = async (details: Omit<Transaction, 'id' | 'riskLevel' | 'riskScore' | 'status' | 'aiAnalysisLog'>, user: User): Promise<RiskAnalysisResult> => {
  
  const userTransactionHistory = await getTransactionsForUser(user.id);

  const userTransactionHistoryString = userTransactionHistory.length > 0 
    ? userTransactionHistory
      .slice(-5) // Get last 5 transactions for brevity
      .map(t => `- ₹${t.amount} to ${t.recipient}`)
      .join('\n')
    : 'No recent transactions found.';

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

    **Transaction to Analyze:**
    - Recipient: "${details.recipient}"
    - Amount: ₹${details.amount}
    - Location: ${details.location ? `Latitude ${details.location.latitude}, Longitude ${details.location.longitude}` : 'Unknown'}
    - Time: "${new Date(details.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}"

    **Decision Logic & Guiding Principles:**
    Your analysis must prioritize context over the raw transaction amount. A transaction's risk is determined by how much it deviates from the user's established pattern. Use these principles to guide your score:

    1.  **LOW RISK (Score 0-40):** A transaction is low risk if it fits the user's normal pattern, even if the amount is large.
        -   *Example:* A large payment of ₹75,000 to a recipient named 'Landlord Rent' from the user's home location is LOW RISK if it's a recurring payee.
        -   *Example:* A typical online shopping purchase from a known merchant like 'Amazon.in' is LOW RISK.

    2.  **MEDIUM RISK (Score 41-70):** A transaction is medium risk if it has one or two moderate deviations from the user's pattern. These warrant user confirmation (like an OTP).
        -   *Example:* A payment of ₹30,000 for a typical category (e.g., 'Croma Electronics') but from a completely new city the user has never transacted from before is MEDIUM RISK.
        -   *Example:* A first-time payment to a new person or service that is significantly larger than the user's average transaction amount is MEDIUM RISK.

    3.  **HIGH/CRITICAL RISK (Score 71-100):** A transaction is high risk if it has multiple, significant deviations from the pattern, especially if it involves high-risk categories. These warrant strong verification (like biometrics).
        -   *Example:* A small payment of ₹5,000 to a brand new, international recipient at an unusual time (e.g., 3 AM) is HIGH RISK, despite the low amount.
        -   *Example:* Any payment, regardless of amount, to a high-risk category like an offshore crypto exchange for the first time is CRITICAL RISK.
        -   *Example:* A large payment from a foreign country when the user's history is exclusively domestic is CRITICAL RISK.

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