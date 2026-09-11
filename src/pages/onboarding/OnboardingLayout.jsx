import { Outlet, useLocation } from 'react-router-dom';
import Logo from '../../components/Logo';

const steps = [
  { path: '/onboarding/bem-vindo', label: 'Bem-vindo' },
  { path: '/onboarding/regras',    label: 'Regras' },
  { path: '/onboarding/perfil',    label: 'Perfil' },
];

export default function OnboardingLayout() {
  const { pathname } = useLocation();
  const currentIdx = Math.max(0, steps.findIndex((s) => pathname.startsWith(s.path)));

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <header className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
        <Logo />
        <span className="text-xs text-gray-500">
          Passo {currentIdx + 1} de {steps.length}
        </span>
      </header>

      <div className="max-w-3xl mx-auto px-6">
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 transition-all"
            style={{ width: `${((currentIdx + 1) / steps.length) * 100}%` }}
          />
        </div>

        <main className="py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}