import React, { useState } from 'react';
import { User, BankDetails } from '../types';
import PersonalDetailsForm from '../components/Registration/PersonalDetailsForm';
import BankDetailsForm from '../components/Registration/BankDetailsForm';
import { addUser, addBankDetails } from '../services/databaseService';

interface RegisterPageProps {
  onRegisterSuccess: (user: User) => void;
  onSwitchToLogin: () => void;
}

enum RegisterStep {
    Personal,
    Bank,
}

export default function RegisterPage({ onRegisterSuccess, onSwitchToLogin }: RegisterPageProps) {
  const [step, setStep] = useState<RegisterStep>(RegisterStep.Personal);
  const [newUser, setNewUser] = useState<User | null>(null);

  const handlePersonalSubmit = async (details: Omit<User, 'id' | 'status'>) => {
    const user = await addUser(details);
    setNewUser(user);
    setStep(RegisterStep.Bank);
  };

  const handleBankSubmit = async (details: BankDetails) => {
    if(newUser) {
        await addBankDetails(newUser.id, details);
        onRegisterSuccess(newUser);
    }
  };

  const renderContent = () => {
    switch (step) {
      case RegisterStep.Personal:
        return <PersonalDetailsForm onSubmit={handlePersonalSubmit} />;
      case RegisterStep.Bank:
        return <BankDetailsForm onSubmit={handleBankSubmit} />;
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