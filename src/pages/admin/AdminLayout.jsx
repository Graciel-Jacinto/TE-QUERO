import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const allTabs = [
  { to: '/admin',              label: 'Dashboard',       short: 'Painel',     icon: 'fi-rr-chart-pie',      fill: 'fi-sr-chart-pie',      end: true },
  { to: '/admin/contas',       label: 'Contas',          short: 'Contas',     icon: 'fi-rr-users',          fill: 'fi-sr-users' },
  { to: '/admin/verificacoes', label: 'Verificações',    short: 'Verificar',  icon: 'fi-rr-badge-check',    fill: 'fi-sr-badge-check' },
  { to: '/admin/denuncias',    label: 'Denúncias',       short: 'Denúncias',  icon: 'fi-rr-flag',           fill: 'fi-sr-flag' },
  { to: '/admin/admins',       label: 'Administradores', short: 'Admins',     icon: 'fi-rr-shield-check',   fill: 'fi-sr-shield-check' },
  { to: '/admin/planos',       label: 'Planos',          short: 'Planos',     icon: 'fi-rr-credit-card',    fill: 'fi-sr-credit-card' },
];

/* Bottom nav mobile — 4 principais */
const mobileTabs = [
  { to: '/admin',           label: 'Painel',    icon: 'fi-rr-chart-pie',   fill: 'fi-sr-chart-pie',   end: true },
  { to: '/admin/contas',    label: 'Contas',    icon: 'fi-rr-users',       fill: 'fi-sr-users' },
  { to: '/admin/denuncias', label: 'Denúncias', icon: 'fi-rr-flag',        fill: 'fi-sr-flag' },
  { to: '/admin/planos',    label: 'Planos',    icon: 'fi-rr-credit-card', fill: 'fi-sr-credit-card' },
];

export default function AdminLayout() {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const handleLogout = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">

      {/* ============ HEADER ============ */}
      <header className="shrink-0 bg-white border-b border-gray-100 z-40">
        <div className="h-[60px] sm:h-[68px] px-3 sm:px-6 flex items-center justify-between gap-2">

          {/* Logo + Icon do sistema */}
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2.5 min-w-0 group"
          >
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-brand-500 rounded-xl blur-md opacity-0
                group-hover:opacity-60 transition-opacity" />
              <div className="relative w-10 h-10 rounded-xl
                bg-gradient-to-br from-brand-500 to-brand-700
                flex items-center justify-center
                shadow-sm shadow-brand-600/30 group-hover:scale-105 transition-transform">
                <i className="fi fi-sr-shield-check text-white text-lg leading-none" />
              </div>
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="font-display font-extrabold text-[15px] sm:text-[17px] tracking-tight text-gray-900 truncate">
                Te Quero <span className="text-brand-600">Admin</span>
              </span>
              <span className="hidden sm:block text-[10px] font-medium text-gray-400
                tracking-[0.15em] uppercase mt-0.5">
                Painel de Gestão
              </span>
            </div>
          </button>

          {/* Acções */}
          <div className="flex items-center gap-1.5 sm:gap-2">

            {/* Voltar à app */}
            <button
              onClick={() => navigate('/app/descobrir')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg
                text-[12.5px] font-semibold text-gray-600
                hover:bg-gray-100 hover:text-gray-900 transition"
            >
              <i className="fi fi-rr-arrow-small-left text-base leading-none" />
              Voltar à app
            </button>

            {/* Badge "Admin" */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full
              bg-brand-50 border border-brand-100">
              <i className={`fi ${isAdmin ? 'fi-sr-shield-check' : 'fi-sr-user-shield'}
                text-brand-600 text-[11px] leading-none`} />
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-brand-700">
                {isAdmin ? 'Admin' : 'Moderador'}
              </span>
            </div>

            {/* Separador */}
            <div className="hidden md:block w-px h-6 bg-gray-200 mx-1" />

            {/* User (só desktop) */}
            <div className="hidden md:flex items-center gap-2.5">
              <div className="flex flex-col items-end">
                <p className="text-[12.5px] font-bold leading-tight text-gray-900">
                  {profile?.name?.split(' ')[0]}
                </p>
                <p className="text-[10px] text-gray-400">
                  {profile?.email?.split('@')[0]}
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-brand-100 overflow-hidden
                flex items-center justify-center border-2 border-white shadow-sm">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <i className="fi fi-sr-user text-brand-600 text-sm leading-none" />
                )}
              </div>
            </div>

            {/* Hamburger (mobile) */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden w-10 h-10 rounded-lg flex items-center justify-center
                text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition"
              aria-label="Abrir menu"
            >
              <i className="fi fi-rr-menu-burger text-xl leading-none" />
            </button>

            {/* Logout (desktop) */}
            <button
              onClick={handleLogout}
              className="hidden md:flex w-9 h-9 rounded-lg items-center justify-center
                text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
              title="Terminar sessão"
            >
              <i className="fi fi-rr-sign-out-alt text-base leading-none" />
            </button>
          </div>
        </div>
      </header>

      {/* ============ LAYOUT ============ */}
      <div className="flex-1 min-h-0 flex">

        {/* Sidebar (desktop) */}
        <aside className="hidden md:flex md:flex-col w-[260px] shrink-0
          bg-white border-r border-gray-100">

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto admin-nav">
            <style>{`
              .admin-nav::-webkit-scrollbar { width: 0; }
              .admin-nav { scrollbar-width: none; }
            `}</style>

            {/* Label */}
            <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
              Gestão
            </p>

            {allTabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 px-4 py-3 rounded-xl
                  text-[14.5px] font-semibold transition-all
                  ${isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <i className={`fi ${isActive ? t.fill : t.icon} text-[19px] leading-none`} />
                    <span className="flex-1">{t.label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />
                    )}
                  </>
                )}
              </NavLink>
            ))}

            {/* Divisor */}
            <div className="h-px bg-gray-100 my-3 mx-2" />

            {/* Voltar à app */}
            <button
              onClick={() => navigate('/app/descobrir')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
                text-[14.5px] font-semibold text-gray-600
                hover:bg-gray-50 hover:text-gray-900 transition"
            >
              <i className="fi fi-rr-arrow-small-left text-[19px] leading-none" />
              <span className="flex-1 text-left">Voltar à app</span>
            </button>
          </nav>

          {/* Card de aviso */}
          <div className="p-3 border-t border-gray-100">
            <div className="p-3.5 rounded-xl bg-brand-50 border border-brand-100">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-md bg-brand-600 flex items-center justify-center shrink-0">
                  <i className="fi fi-sr-shield-check text-white text-[10px] leading-none" />
                </div>
                <p className="text-[12px] font-bold text-brand-900">
                  Área restrita
                </p>
              </div>
              <p className="text-[11px] text-brand-800 leading-snug">
                Todas as acções ficam registadas no histórico.
              </p>
            </div>
          </div>
        </aside>

        {/* Conteúdo */}
        <main className="flex-1 min-h-0 overflow-y-auto pb-20 md:pb-0">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ============ BOTTOM NAV (mobile) ============ */}
      <nav className="md:hidden shrink-0 bg-white border-t border-gray-100 z-40
        pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4">
          {mobileTabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center gap-0.5
                py-2.5 text-[10px] font-semibold transition-colors
                ${isActive ? 'text-brand-600' : 'text-gray-400'}`
              }
            >
              {({ isActive }) => (
                <>
                  <i className={`fi ${isActive ? t.fill : t.icon} text-xl leading-none`} />
                  <span>{t.label}</span>
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2
                      w-8 h-0.5 bg-brand-600 rounded-full" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* ============ DRAWER MOBILE ============ */}
      <div
        onClick={() => setDrawerOpen(false)}
        className={`md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]
          transition-opacity duration-300
          ${drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />

      <div
        className={`md:hidden fixed top-0 right-0 bottom-0 w-[85%] max-w-[340px]
          bg-white z-[101] flex flex-col
          transition-transform duration-300 ease-out
          ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header drawer */}
        <div className="shrink-0 flex items-center justify-between px-5 h-[68px]
          border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700
              flex items-center justify-center shadow-sm shadow-brand-600/30">
              <i className="fi fi-sr-shield-check text-white text-base leading-none" />
            </div>
            <span className="font-display font-extrabold text-[15px] text-gray-900">
              Te Quero <span className="text-brand-600">Admin</span>
            </span>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-10 h-10 rounded-full flex items-center justify-center
              text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition"
          >
            <i className="fi fi-rr-cross-small text-xl leading-none" />
          </button>
        </div>

        {/* Utilizador */}
        <div className="shrink-0 p-5 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-full bg-brand-100 overflow-hidden
              flex items-center justify-center border-2 border-white shadow-sm shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <i className="fi fi-sr-user text-brand-600 text-xl leading-none" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-[15px] text-gray-900 truncate">
                {profile?.name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <i className={`fi ${isAdmin ? 'fi-sr-shield-check' : 'fi-sr-user-shield'}
                  text-brand-600 text-[10px] leading-none`} />
                <p className="text-[11.5px] text-brand-700 font-semibold">
                  {isAdmin ? 'Administrador' : 'Moderador'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="flex-1 overflow-y-auto p-3">
          <p className="px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
            Navegação
          </p>

          {allTabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              onClick={() => setDrawerOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-3 py-3.5 rounded-2xl transition
                ${isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-700 hover:bg-gray-50'}`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                    ${isActive ? 'bg-brand-100' : 'bg-gray-100'}`}>
                    <i className={`fi ${isActive ? t.fill : t.icon} text-[19px] leading-none`} />
                  </div>
                  <span className="font-semibold text-[14.5px] flex-1">{t.label}</span>
                  <i className="fi fi-rr-angle-small-right text-gray-300 text-base leading-none" />
                </>
              )}
            </NavLink>
          ))}

          <div className="h-px bg-gray-100 my-3 mx-2" />

          <button
            onClick={() => { setDrawerOpen(false); navigate('/app/descobrir'); }}
            className="w-full flex items-center gap-3.5 px-3 py-3 rounded-2xl
              text-gray-700 hover:bg-gray-50 transition text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              <i className="fi fi-rr-arrow-small-left text-[19px] leading-none" />
            </div>
            <span className="font-semibold text-[14.5px]">Voltar à app</span>
          </button>
        </div>

        {/* Logout */}
        <div className="shrink-0 p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl
              text-red-600 font-semibold text-[14.5px]
              hover:bg-red-50 active:bg-red-100 transition"
          >
            <i className="fi fi-rr-sign-out-alt text-[19px] leading-none" />
            Terminar sessão
          </button>
        </div>
      </div>
    </div>
  );
}