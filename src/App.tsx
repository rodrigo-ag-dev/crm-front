import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Setup } from './pages/Setup';
import { Dashboard } from './pages/Dashboard';
import { Deals } from './pages/Deals';
import { Contacts } from './pages/Contacts';
import { Companies } from './pages/Companies';
import { Tickets } from './pages/Tickets';
import { MyDay } from './pages/MyDay';
import { Reports } from './pages/Reports';
import { UserSettings } from './pages/UserSettings';
import { PublicTicketChat } from './pages/PublicTicketChat';
import { parameterService } from './services/parameterService';
import { applyAnimationPreference } from './utils/animationPreferences';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, isLoading, setupRequired } = useAuth();

  useEffect(() => {
    if (!user?.id) {
      applyAnimationPreference(true);
      return;
    }

    let isMounted = true;

    const loadAnimationPreference = async () => {
      try {
        const [globalResponse, userResponse] = await Promise.all([
          parameterService.listParameters(),
          parameterService.listUserParameters(user.id),
        ]);

        const globalParameters = Array.isArray(globalResponse.data) ? globalResponse.data : [];
        const userParameters = Array.isArray(userResponse.data) ? userResponse.data : [];

        const animationOverride = userParameters.find((parameter) => {
          const parameterId = parameter.parameterId ?? parameter.id ?? parameter.name ?? '';
          return parameterId === 'animationActive';
        });

        const animationValue = animationOverride?.value ??
          globalParameters.find((parameter) => {
            const parameterId = parameter.parameterId ?? parameter.id ?? parameter.name ?? '';
            return parameterId === 'animationActive';
          })?.value ??
          'true';

        if (isMounted) {
          applyAnimationPreference(animationValue.toLowerCase() === 'true');
        }
      } catch (error) {
        console.error('Error loading animation preference', error);
        if (isMounted) {
          applyAnimationPreference(true);
        }
      }
    };

    loadAnimationPreference();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  if (window.location.pathname.startsWith('/share/')) {
    return (
      <Routes>
        <Route path="/share/:token" element={<PublicTicketChat />} />
      </Routes>
    );
  }

  if (isLoading) {
    return null;
  }

  return (
    <Routes>
      <Route path="/setup" element={setupRequired ? <Setup /> : <Navigate to="/login" replace />} />
      <Route path="/login" element={setupRequired ? <Navigate to="/setup" replace /> : <Login />} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="my-day" element={<MyDay />} />
        <Route path="deals" element={<Deals />} />
        <Route path="deals/:id" element={<Deals />} />
        <Route path="pipeline" element={<Navigate to="/deals" replace />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="contacts/:id" element={<Contacts />} />
        <Route path="companies" element={<Companies />} />
        <Route path="companies/:id" element={<Companies />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="tickets/funnel" element={<Navigate to="/tickets" replace />} />
        <Route path="tickets/:id" element={<Tickets />} />
        <Route path="reports" element={<Reports />} />
        <Route path="stages" element={<Navigate to="/settings" replace />} />
        <Route path="settings" element={<UserSettings />} />
        <Route path="users" element={<Navigate to="/settings" replace />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <AppRoutes />
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
