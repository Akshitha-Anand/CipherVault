
import React, { useState, useMemo, useCallback } from 'react';
import Header from './components/Header';
import UserPage from './pages/UserPage';
import AdminPage from './pages/AdminPage';
import SecurityAnalystPage from './pages/SecurityAnalystPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotificationsPage from './pages/NotificationsPage';
import { Role, User } from './types';

type View = 'MAIN' | 'NOTIFICATIONS';

const RoleSwitcher: React.FC<{ currentRole: Role; setRole: (role: Role) => void }> = ({ currentRole, setRole }) => {
  const roles: Role[] = ['USER', 'ADMIN', 'ANALYST'];
  return (
    <div className="absolute top-4 right-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-2 shadow-lg z-20">
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-300">View as:</span>
        {roles.map((role) => (
          <button
            key={role}
            onClick={() => setRole(role)}
            className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
              currentRole === role
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {role.charAt(0) + role.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>('USER');
  const [isRegistering, setIsRegistering] = useState(false);
  const [currentView, setCurrentView] = useState<View>('MAIN');

  const handleLogin = useCallback((user: User) => {
    setCurrentUser(user);
    setIsRegistering(false);
    setCurrentView('MAIN');
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setRole('USER');
    setCurrentView('MAIN');
  }, []);

  const navigateTo = useCallback((view: View) => {
    setCurrentView(view);
  }, []);

  const CurrentPage = useMemo(() => {
    if (!currentUser) {
      if (isRegistering) {
        return <RegisterPage onRegisterSuccess={handleLogin} onSwitchToLogin={() => setIsRegistering(false)} />;
      }
      return <LoginPage onLogin={handleLogin} onSwitchToRegister={() => setIsRegistering(true)} />;
    }

    if (currentView === 'NOTIFICATIONS') {
        return <NotificationsPage user={currentUser} onNavigateBack={() => navigateTo('MAIN')} />;
    }
    
    switch (role) {
      case 'USER':
        return <UserPage user={currentUser} />;
      case 'ADMIN':
        return <AdminPage />;
      case 'ANALYST':
        return <SecurityAnalystPage />;
      default:
        return <UserPage user={currentUser} />;
    }
  }, [role, currentUser, isRegistering, handleLogin, currentView, navigateTo]);

  const mainContentClass = currentUser ? "mt-8" : "flex items-center justify-center min-h-[calc(100vh-200px)]";

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans antialiased relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjAsIDM1LCA2MCwgMC4yNSkiPjxwYXRoIGQ9Ik0wIC41SDMybTAtMVYwIj48L3BhdGg+PC9zdmc+')] opacity-50"></div>
      <div className="relative z-10 container mx-auto px-4 py-8">
        <Header user={currentUser} onLogout={handleLogout} onNavigate={navigateTo} />
        {currentUser && <RoleSwitcher currentRole={role} setRole={setRole} />}
        <main className={mainContentClass}>
          {CurrentPage}
        </main>
      </div>
    </div>
  );
}
