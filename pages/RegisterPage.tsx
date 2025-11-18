import React, { useState } from 'react';
import { User, BankDetails } from '../types';
import PersonalDetailsForm from '../components/Registration/PersonalDetailsForm';
import BankDetailsForm from '../components/Registration/BankDetailsForm';
import FaceCaptureForm from '../components/Registration/FaceCaptureForm';
import databaseService from '../services/databaseService';

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
  const [personalDetails, setPersonalDetails] = useState<Omit<User, 'id' | 'status' | 'passwordHash' | 'createdAt' | 'gender'> & { password: string } | null>(null);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [aiDetectedGender, setAiDetectedGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePersonalSubmit = async (details: Omit<User, 'id' | 'status' | 'passwordHash' | 'createdAt' | 'gender'> & { password: string }) => {
    setApiError(null);
    setIsLoading(true);
    try {
        const { exists } = await databaseService.checkEmail(details.email);
        if (exists) {
            setApiError('This email address is already registered.');
        } else {
            setPersonalDetails(details);
            setStep(RegisterStep.Bank);
        }
    } catch (error) {
        setApiError('Could not verify email. Please try again.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleBankSubmit = async (details: BankDetails) => {
    setBankDetails(details);
    setStep(RegisterStep.FaceCapture);
  };
  
  const handleFaceSubmit = async (faceImages: string[], detectedGender: 'MALE' | 'FEMALE' | 'OTHER') => {
    if (personalDetails && bankDetails) {
        setAiDetectedGender(detectedGender);
        setIsLoading(true);
        try {
            const finalPersonalDetails = { ...personalDetails, gender: detectedGender };
            const user = await databaseService.register({ personalDetails: finalPersonalDetails, bankDetails, faceImages });
            onRegisterSuccess(user);
        } catch (error) {
             if (error instanceof Error) {
                setApiError(error.message);
                setStep(RegisterStep.Personal);
            } else {
                setApiError('An unknown error occurred during registration.');
                setStep(RegisterStep.Personal);
            }
        } finally {
            setIsLoading(false);
        }
    }
  }

  const renderContent = () => {
    switch (step) {
      case RegisterStep.Personal:
        return <PersonalDetailsForm onSubmit={handlePersonalSubmit} apiError={apiError} isLoading={isLoading} />;
      case RegisterStep.Bank:
        return <BankDetailsForm onSubmit={handleBankSubmit} />;
      case RegisterStep.FaceCapture:
        return <FaceCaptureForm onSubmit={handleFaceSubmit} isLoading={isLoading} />;
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
