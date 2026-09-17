import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { FeatureFlagsProvider } from './hooks/useFeatureFlags';
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
import Search from './pages/app/Search';
import Contacts from './pages/app/Contacts';
import Notifications from './pages/app/Notifications';
import Plans from './pages/app/Plans';
import Profile from './pages/app/Profile';
import UserProfile from './pages/app/UserProfile';
import Chat from './pages/app/Chat';

import AdminRoute from './components/AdminRoute';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminAccounts from './pages/admin/AdminAccounts';
import AdminAdmins from './pages/admin/AdminAdmins';
import AdminReports from './pages/admin/AdminReports';
import AdminVerifications from './pages/admin/AdminVerifications';
import AdminPlans from './pages/admin/AdminPlans';
import AdminFeatureFlags from './pages/admin/FeatureFlags';
import OnboardingMonitor from './pages/admin/OnboardingMonitor';   // ← NOVO

export default function App() {
  return (
    <AuthProvider>
      <FeatureFlagsProvider>
        <BrowserRouter>
          <Routes>
            {/* ============ PÚBLICAS ============ */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registar" element={<Register />} />

            {/* ============ ONBOARDING ============ */}
            <Route element={<OnboardingGuard />}>
              <Route path="/onboarding" element={<OnboardingLayout />}>
                <Route index element={<Navigate to="bem-vindo" replace />} />
                <Route path="bem-vindo" element={<Welcome />} />
                <Route path="regras" element={<Rules />} />
                <Route path="perfil" element={<ProfileSetup />} />
              </Route>
            </Route>

            {/* ============ APP (protegida) ============ */}
            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<AppLayout />}>
                {/* /app → vai directo para Descobrir */}
                <Route index element={<Navigate to="descobrir" replace />} />

                <Route path="descobrir" element={<Discover />} />
                <Route path="pesquisa" element={<Search />} />
                <Route path="contactos" element={<Contacts />} />
                <Route path="notificacoes" element={<Notifications />} />
                <Route path="planos" element={<Plans />} />

                {/* O MEU perfil (edição) */}
                <Route path="perfil" element={<Profile />} />

                {/* PERFIL PÚBLICO (detalhes de outro utilizador) */}
                <Route path="perfil/:slug" element={<UserProfile />} />
                <Route path="chat/:id" element={<Chat />} />
              </Route>
            </Route>

            {/* ============ ADMIN ============ */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="contas" element={<AdminAccounts />} />
                <Route path="onboarding" element={<OnboardingMonitor />} />   {/* ← NOVO */}
                <Route path="verificacoes" element={<AdminVerifications />} />
                <Route path="denuncias" element={<AdminReports />} />
                <Route path="admins" element={<AdminAdmins />} />
                <Route path="planos" element={<AdminPlans />} />
                <Route path="flags" element={<AdminFeatureFlags />} />
              </Route>
            </Route>

            {/* ============ FALLBACK ============ */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </FeatureFlagsProvider>
    </AuthProvider>
  );
}