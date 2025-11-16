import React, { useState } from 'react';
import { User, BankDetails } from '../types';
import PersonalDetailsForm from '../components/Registration/PersonalDetailsForm';
import BankDetailsForm from '../components/Registration/BankDetailsForm';
import FaceCaptureForm from '../components/Registration/FaceCaptureForm';
import { addUser, addBankDetails, getUserByEmail } from '../services/databaseService';

interface RegisterPageProps {
  onRegisterSuccess: (user: User) => void;
  onSwitchToLogin: () => void;
}

enum RegisterStep {
    Personal,
    Bank,
    FaceCapture
}

export default function RegisterPage({ onRegisterSuccess, onSwitchToLogin }: RegisterPageProps) {
  const [step, setStep] = useState<RegisterStep>(RegisterStep.Personal);
  // FIX: Omit `createdAt` from personal details type to match form data.
  const [personalDetails, setPersonalDetails] = useState<Omit<User, 'id' | 'status' | 'passwordHash' | 'createdAt'> & { password: string } | null>(null);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // FIX: Omit `createdAt` from details parameter type to match form data.
  const handlePersonalSubmit = async (details: Omit<User, 'id' | 'status' | 'passwordHash' | 'createdAt'> & { password: string }) => {
    setApiError(null);
    setIsVerifying(true);
    try {
        const existingUser = await getUserByEmail(details.email);
        if (existingUser) {
            setApiError('An account with this email already exists. Please log in.');
            return; // Stop execution and stay on this step
        }
        // If email is unique, proceed
        setPersonalDetails(details);
        setStep(RegisterStep.Bank);
    } catch (error) {
        setApiError('An error occurred verifying your email. Please try again.');
    } finally {
        setIsVerifying(false);
    }
  };

  const handleBankSubmit = async (details: BankDetails) => {
    setBankDetails(details);
    setStep(RegisterStep.FaceCapture);
  };
  
  const handleFaceSubmit = async (faceImages: string[]) => {
    if (personalDetails && bankDetails) {
        try {
            // The addUser service still has a final check for safety
            const user = await addUser({ ...personalDetails, faceReferenceImages: faceImages });
            await addBankDetails(user.id, bankDetails);
            onRegisterSuccess(user);
        } catch (error) {
             if (error instanceof Error) {
                setApiError(error.message);
                // Go back to the first step to fix the error
                setStep(RegisterStep.Personal);
            } else {
                setApiError('An unknown error occurred during registration.');
                setStep(RegisterStep.Personal);
            }
        }
    }
  }

  const renderContent = () => {
    switch (step) {
      case RegisterStep.Personal:
        return <PersonalDetailsForm onSubmit={handlePersonalSubmit} apiError={apiError} isVerifying={isVerifying} />;
      case RegisterStep.Bank:
        return <BankDetailsForm onSubmit={handleBankSubmit} />;
      case RegisterStep.FaceCapture:
        return <FaceCaptureForm onSubmit={handleFaceSubmit} />;
      default:
        return <div>Error: Invalid registration step.</div>;
    }
  };

  return (
    <div className="w-full max-w-lg">
      {renderContent()}
      <p className="mt-6 text-center text-sm text-gray-400">
        Already have an account?{' '}
        <button onClick={onSwitchToLogin} className="font-medium text-cyan-400 hover:text-cyan-300">
          Log in here
        </button>
      </p>
    </div>
  );
}