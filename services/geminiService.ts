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
    Analyze the risk of the following transaction based on the user's profile and transaction history.
    All currency is in Indian Rupees (INR).
    Provide a risk score (0-100) and a brief, step-by-step analysis log.

    **User Profile:**
    - Name: ${user.name}
    - Account Status: ${user.status}
    - Location Info: This user typically transacts from their home location. Be suspicious of transactions from very different or multiple geollocations in a short time.
    - Recent Transaction History:
    ${userTransactionHistoryString}
    - Typical Behavior: Spends are usually on e-commerce, food, and subscriptions. Large, unusual, or international transfers are rare.

    **Transaction to Analyze:**
    - Recipient: "${details.recipient}"
    - Amount: ₹${details.amount}
    - Location: ${details.location ? `Latitude ${details.location.latitude}, Longitude ${details.location.longitude}` : 'Unknown'}
    - Time: "${details.time}"

    **Analysis Factors:**
    1.  **Recipient Risk**: Is the recipient new, unusual, or high-risk (e.g., offshore crypto exchange) compared to their history?
    2.  **Amount Anomaly**: Is the amount significantly higher than their typical spending pattern?
    3.  **Location Anomaly**: Is the transaction from an unusual or new location?
    4.  **Time Anomaly**: Is the transaction occurring at an odd hour (e.g., 3 AM local time)?

    Based on your analysis, calculate a final risk score and provide the analysis log.
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
            description: 'A risk score from 0 to 100, where 100 is the highest risk.'
          },
          analysis: {
            type: Type.ARRAY,
            description: 'An array of strings detailing the step-by-step risk analysis.',
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