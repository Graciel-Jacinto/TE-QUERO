import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import OnboardingGuard from './components/OnboardingGuard';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';

import OnboardingLayout from './pages/onboarding/OnboardingLayout';
import Welcome from './pages/onboarding/Welcome';
import Rules from './pages/onboarding/Rules';
import ProfileSetup from './pages/onboarding/ProfileSetup';

import AppLayout from './pages/app/AppLayout';
import Discover from './pages/app/Discover';
import Contacts from './pages/app/Contacts';
import Profile from './pages/app/Profile';
import UserProfile from './pages/app/UserProfile';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Públicas */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registar" element={<Register />} />

          {/* Onboarding */}
          <Route element={<OnboardingGuard />}>
            <Route path="/onboarding" element={<OnboardingLayout />}>
              <Route index element={<Navigate to="bem-vindo" replace />} />
              <Route path="bem-vindo" element={<Welcome />} />
              <Route path="regras" element={<Rules />} />
              <Route path="perfil" element={<ProfileSetup />} />
            </Route>
          </Route>

          {/* App */}
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Navigate to="descobrir" replace />} />
              <Route path="descobrir" element={<Discover />} />
              <Route path="contactos" element={<Contacts />} />
              <Route path="perfil" element={<Profile />} />
              <Route path="perfil/:id" element={<UserProfile />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}