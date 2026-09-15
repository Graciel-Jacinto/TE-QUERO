import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/* ============================================================
   Ícone WhatsApp
============================================================ */
function WhatsAppIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/* ---------- Tabs (desktop sidebar) ---------- */
const allTabs = [
  { id: 'discover', label: 'Para ti',      icon: 'fi-rr-heart',       fill: 'fi-sr-heart',       needsAuth: false },
  { id: 'explore',  label: 'Explorar',     icon: 'fi-rr-search',      fill: 'fi-sr-search',      needsAuth: true  },
  { id: 'notifs',   label: 'Notificações', icon: 'fi-rr-bell',        fill: 'fi-sr-bell',        needsAuth: true  },
  { id: 'plans',    label: 'Planos',       icon: 'fi-rr-credit-card', fill: 'fi-sr-credit-card', needsAuth: false },
  { id: 'profile',  label: 'Perfil',       icon: 'fi-rr-user',        fill: 'fi-sr-user',        needsAuth: true  },
];

const mobileNav = [
  { id: 'discover', label: 'Para ti',  icon: 'fi-rr-heart',       fill: 'fi-sr-heart',       needsAuth: false },
  { id: 'explore',  label: 'Explorar', icon: 'fi-rr-search',      fill: 'fi-sr-search',      needsAuth: true  },
  { id: 'plans',    label: 'Planos',   icon: 'fi-rr-credit-card', fill: 'fi-sr-credit-card', needsAuth: false },
];

const mobileDrawerItems = [
  { id: 'notifs',  label: 'Notificações', icon: 'fi-rr-bell', desc: 'Vê quem se interessou por ti', needsAuth: true },
  { id: 'profile', label: 'Perfil',       icon: 'fi-rr-user', desc: 'Acede ao teu perfil',          needsAuth: true },
];

/* ---------- Planos ---------- */
const PAYMENT_PLANS = [
  {
    id: 'p1',
    name: 'Começar',
    tagline: 'Para quem quer experimentar',
    price: 99,
    features: [
      '3 contactos no WhatsApp',
      'Selo verificado incluído',
      'Cancelas quando quiseres',
    ],
    popular: false,
  },
  {
    id: 'p2',
    name: 'Recomendado',
    tagline: 'A escolha de 8 em cada 10',
    price: 299,
    features: [
      '10 contactos no WhatsApp',
      'Selo verificado incluído',
      'Destaque no feed',
      'Cancelas quando quiseres',
    ],
    popular: true,
  },
  {
    id: 'p3',
    name: 'Sem limites',
    tagline: 'Para quem leva a sério',
    price: 299,
    features: [
      'Contactos ilimitados',
      'Selo verificado incluído',
      'Destaque no feed',
      'Suporte prioritário',
    ],
    popular: false,
  },
];

/* ============================================================
   Helpers
============================================================ */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function calcAge(dob) {
  if (!dob) return null;
  const b = new Date(dob);
  const d = new Date();
  let a = d.getFullYear() - b.getFullYear();
  const m = d.getMonth() - b.getMonth();
  if (m === 0 && d.getDate() < b.getDate()) a--;
  else if (m < 0) a--;
  return a;
}

/* ============================================================
   Landing
============================================================ */
export default function Landing() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const [view, setView] = useState('discover'); // 'discover' | 'plans'
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('tq-sidebar-collapsed') === 'true';
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [guestProfiles, setGuestProfiles] = useState([]);
  const [guestLoading, setGuestLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const feedRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('tq-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (!profile?.rules_accepted_at) return navigate('/onboarding/bem-vindo');
    if (!profile?.onboarding_completed) return navigate('/onboarding/perfil');
    navigate('/app/descobrir');
  }, [user, profile, authLoading, navigate]);

  useEffect(() => {
    if (user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, slug, birth_date, city, bio, avatar_url, interests, is_verified')
        .eq('onboarding_completed', true)
        .eq('is_banned', false)
        .limit(30);

      const source = data || [];
      setGuestProfiles([...shuffle(source), ...shuffle(source)]);
      setGuestLoading(false);
    })();
  }, [user]);

  const handleScroll = (e) => {
    const el = e.currentTarget;
    const h = el.clientHeight;
    if (h === 0) return;
    const idx = Math.round(el.scrollTop / h);
    if (idx !== currentIdx) setCurrentIdx(idx);
  };

  const scrollByCards = (dir) => {
    const el = feedRef.current;
    if (!el) return;
    const h = el.clientHeight;
    el.scrollTo({ top: (currentIdx + dir) * h, behavior: 'smooth' });
  };

  /* ---------- Abrir modal de login ---------- */
  const requireLogin = () => {
    if (navigator.vibrate) navigator.vibrate(6);
    setShowLoginModal(true);
  };

  /* ---------- Navegar entre tabs ---------- */
  const handleTabClick = (tab) => {
    // Tabs que exigem autenticação → abre modal
    if (tab.needsAuth) {
      requireLogin();
      return;
    }

    // Tabs livres → navegação interna
    if (tab.id === 'discover') {
      setView('discover');
      setDrawerOpen(false);
      return;
    }
    if (tab.id === 'plans') {
      setView('plans');
      setDrawerOpen(false);
      return;
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="h-8 w-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">

      {/* ============ HEADER MOBILE ============ */}
      <header className="md:hidden shrink-0 bg-white border-b border-gray-100 z-[60]">
        <div className="h-[56px] px-3 flex items-center justify-between gap-2">
          <button onClick={() => setView('discover')} className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700
              flex items-center justify-center shadow-sm shadow-brand-600/30">
              <i className="fi fi-sr-heart text-white text-base leading-none" />
            </div>
            <span className="font-display font-extrabold text-[16px] tracking-tight text-gray-900">
              Te Quero<span className="text-brand-600">.</span>
            </span>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/login')}
              className="px-3 py-2 rounded-lg text-[13px] font-semibold text-gray-700
                hover:bg-brand-50 hover:text-brand-700 transition">
              Entrar
            </button>
            <button
              onClick={() => navigate('/registar')}
              className="px-3.5 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-semibold
                hover:bg-brand-700 transition shadow-sm shadow-brand-600/25">
              Criar
            </button>
          </div>
        </div>
      </header>

      {/* ============ LAYOUT ============ */}
      <div className="flex-1 min-h-0 flex relative">

        {/* ---------- SIDEBAR ---------- */}
        <aside
          className={`hidden md:flex md:flex-col shrink-0
            bg-white border-r border-gray-100 z-40
            transition-all duration-300 ease-in-out
            ${collapsed ? 'w-[92px]' : 'w-[240px] lg:w-[260px]'}`}
        >
          <div className={`h-[84px] flex items-center border-b border-gray-100
            ${collapsed ? 'justify-center px-2' : 'px-6'}`}>
            <button onClick={() => setView('discover')}
              className="flex items-center gap-3 min-w-0 group">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700
                flex items-center justify-center shadow-sm shadow-brand-600/30 shrink-0
                group-hover:scale-105 transition-transform">
                <i className="fi fi-sr-heart text-white text-lg leading-none" />
              </div>
              {!collapsed && (
                <div className="flex flex-col leading-none min-w-0 text-left">
                  <span className="font-display font-extrabold text-[20px] tracking-tight text-gray-900 truncate">
                    Te Quero<span className="text-brand-600">.</span>
                  </span>
                  <span className="text-[10px] font-medium text-gray-400 tracking-[0.15em] uppercase mt-1">
                    Encontros
                  </span>
                </div>
              )}
            </button>
          </div>

          <nav className={`flex-1 py-4 space-y-1 overflow-y-auto sidebar-nav
            ${collapsed ? 'px-2.5' : 'px-3'}`}>
            <style>{`
              .sidebar-nav::-webkit-scrollbar { width: 0; }
              .sidebar-nav { scrollbar-width: none; }
            `}</style>

            {allTabs.map((t) => {
              const isActive =
                (t.id === 'discover' && view === 'discover') ||
                (t.id === 'plans' && view === 'plans');

              return (
                <button
                  key={t.id}
                  onClick={() => handleTabClick(t)}
                  title={collapsed ? t.label : undefined}
                  className={`group relative w-full flex items-center rounded-xl text-[15px] font-semibold
                    transition-all duration-200
                    ${isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-700 hover:bg-gray-100'}
                    ${collapsed ? 'justify-center px-2 py-3.5' : 'gap-4 px-3.5 py-3.5'}`}
                >
                  <div className="relative shrink-0">
                    <i className={`fi ${isActive ? t.fill : t.icon} ${collapsed ? 'text-[22px]' : 'text-[21px]'} leading-none`} />
                  </div>

                  {!collapsed && <span className="truncate flex-1 text-left">{t.label}</span>}

                  {collapsed && (
                    <span className="absolute left-full ml-3 px-3 py-2 rounded-lg
                      bg-gray-900 text-white text-[13px] font-medium
                      whitespace-nowrap opacity-0 pointer-events-none
                      group-hover:opacity-100 transition-opacity duration-150
                      shadow-xl z-[100]">
                      {t.label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className={`border-t border-gray-100 ${collapsed ? 'p-3' : 'p-3'}`}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={`w-full flex items-center rounded-xl font-semibold
                text-gray-500 hover:text-gray-900 hover:bg-gray-100
                active:bg-gray-200 transition-all duration-200
                ${collapsed ? 'justify-center p-3' : 'gap-4 px-3.5 py-3'}`}
            >
              <i className={`fi ${collapsed ? 'fi-rr-angle-small-right' : 'fi-rr-angle-small-left'}
                text-[20px] leading-none shrink-0`} />
              {!collapsed && <span className="text-[14.5px]">Colapsar menu</span>}
            </button>
          </div>

          <div className={`border-t border-gray-100 ${collapsed ? 'p-2.5 space-y-2' : 'p-4 space-y-2.5'}`}>
            <button
              onClick={() => navigate('/login')}
              className={`w-full flex items-center justify-center gap-2 rounded-xl font-bold
                bg-brand-600 text-white
                hover:bg-brand-700 active:scale-[0.98]
                transition-all duration-200 shadow-lg shadow-brand-600/25
                ${collapsed ? 'p-3' : 'px-4 py-3.5 text-[14.5px]'}`}
              title={collapsed ? 'Iniciar sessão' : undefined}
            >
              <i className="fi fi-rr-sign-in-alt text-[18px] leading-none shrink-0" />
              {!collapsed && <span>Iniciar sessão</span>}
            </button>

            {!collapsed && (
              <p className="text-[11.5px] text-gray-400 text-center leading-snug px-1">
                Cria conta grátis e recebe <span className="font-bold text-gray-600">3 contactos</span>
              </p>
            )}
          </div>
        </aside>

        {/* ---------- CONTEÚDO ---------- */}
        <main className="flex-1 min-h-0 relative overflow-hidden bg-white">
          {view === 'discover' && (
            <DiscoverView
              profiles={guestProfiles}
              loading={guestLoading}
              currentIdx={currentIdx}
              feedRef={feedRef}
              onScroll={handleScroll}
              onScrollBy={scrollByCards}
              onAction={requireLogin}
            />
          )}

          {view === 'plans' && (
            <PlansView onSubscribe={requireLogin} />
          )}
        </main>
      </div>

      {/* ============ BOTTOM NAV (mobile) ============ */}
      <nav className="md:hidden shrink-0 bg-white border-t border-gray-100 z-40">
        <div className="grid grid-cols-3">
          {mobileNav.map((t) => {
            const isActive =
              (t.id === 'discover' && view === 'discover') ||
              (t.id === 'plans' && view === 'plans');

            return (
              <button
                key={t.id}
                onClick={() => handleTabClick(t)}
                className={`relative flex flex-col items-center justify-center gap-0.5
                  py-2.5 text-[10px] font-semibold transition-colors
                  ${isActive ? 'text-brand-600' : 'text-gray-500'}`}
              >
                <i className={`fi ${isActive ? t.fill : t.icon} text-xl leading-none`} />
                <span>{t.label}</span>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2
                    w-8 h-0.5 bg-brand-600 rounded-full" />
                )}
              </button>
            );
          })}
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
        className={`md:hidden fixed top-0 right-0 bottom-0 w-[85%] max-w-[360px]
          bg-white z-[101] flex flex-col
          transition-transform duration-300 ease-out
          ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="shrink-0 flex items-center justify-between px-5 h-[64px]
          border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700
              flex items-center justify-center">
              <i className="fi fi-sr-heart text-white text-sm leading-none" />
            </div>
            <span className="font-display font-extrabold text-[16px] text-gray-900">Menu</span>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-10 h-10 rounded-full flex items-center justify-center
              text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition">
            <i className="fi fi-rr-cross-small text-xl leading-none" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <p className="px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
            Mais opções
          </p>

          {mobileDrawerItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setDrawerOpen(false); requireLogin(); }}
              className="w-full flex items-center gap-3.5 px-3 py-3.5 rounded-2xl transition
                text-gray-700 hover:bg-gray-50 active:bg-gray-100">
              <div className="relative w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <i className={`fi ${item.icon} text-[19px] leading-none`} />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="font-semibold text-[14.5px] leading-tight">{item.label}</p>
                <p className="text-[11.5px] text-gray-400 truncate mt-0.5">{item.desc}</p>
              </div>
              <i className="fi fi-rr-angle-small-right text-gray-300 text-base leading-none" />
            </button>
          ))}
        </div>

        <div className="shrink-0 p-4 border-t border-gray-100 space-y-2">
          <button
            onClick={() => { setDrawerOpen(false); navigate('/login'); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl
              text-white bg-brand-600 font-bold text-[14.5px]
              hover:bg-brand-700 active:scale-[0.98] transition
              shadow-lg shadow-brand-600/25">
            <i className="fi fi-rr-sign-in-alt text-[19px] leading-none" />
            Iniciar sessão
          </button>
          <button
            onClick={() => { setDrawerOpen(false); navigate('/registar'); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl
              text-brand-700 bg-brand-50 font-semibold text-[14.5px]
              hover:bg-brand-100 transition">
            <i className="fi fi-sr-user-add text-[19px] leading-none" />
            Criar conta grátis
          </button>
        </div>
      </div>

      {/* ============ MODAL SIMPLES DE LOGIN ============ */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
          <div onClick={() => setShowLoginModal(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <div className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl
            p-6 pb-7 sm:p-7 animate-[slideUpPrompt_280ms_cubic-bezier(0.22,1,0.36,1)]">

            <style>{`
              @keyframes slideUpPrompt {
                from { transform: translateY(100%); }
                to   { transform: translateY(0); }
              }
              @media (min-width: 640px) {
                @keyframes slideUpPrompt {
                  from { transform: translateY(20px) scale(0.98); opacity: 0; }
                  to   { transform: translateY(0) scale(1); opacity: 1; }
                }
              }
            `}</style>

            <div className="sm:hidden w-12 h-1.5 rounded-full bg-gray-300 mx-auto mb-5" />

            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center">
                <i className="fi fi-sr-lock text-brand-600 text-2xl leading-none" />
              </div>
            </div>

            <h3 className="font-display text-[19px] font-extrabold text-gray-900 text-center leading-tight">
              Inicia sessão para continuar
            </h3>

            <p className="mt-2 text-[13.5px] text-gray-500 text-center leading-relaxed">
              Cria conta grátis em segundos.
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => { setShowLoginModal(false); navigate('/login'); }}
                className="w-full py-3.5 rounded-2xl bg-brand-600 text-white font-bold text-[14.5px]
                  hover:bg-brand-700 active:scale-[0.98] transition shadow-lg shadow-brand-600/25">
                Entrar
              </button>
              <button
                onClick={() => { setShowLoginModal(false); navigate('/registar'); }}
                className="w-full py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-[14px]
                  hover:bg-gray-200 transition">
                Criar conta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Discover View (guest)
============================================================ */
function DiscoverView({ profiles, loading, currentIdx, feedRef, onScroll, onScrollBy, onAction }) {
  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-2">
        <div className="w-full h-full max-w-[400px] rounded-3xl bg-gray-200 animate-pulse" />
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
        <div className="max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center mx-auto mb-4">
            <i className="fi fi-rr-search-alt text-brand-600 text-2xl leading-none" />
          </div>
          <h2 className="font-display text-xl font-extrabold text-gray-900">
            Ainda não há perfis
          </h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Volta mais tarde. Estamos a adicionar novas pessoas todos os dias.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="hidden md:flex flex-col items-center gap-3
        absolute right-6 top-1/2 -translate-y-1/2 z-30">
        <button onClick={() => onScrollBy(-1)}
          className="w-12 h-12 rounded-full bg-white shadow-xl border border-gray-100
            flex items-center justify-center text-gray-700
            hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all"
          aria-label="Perfil anterior">
          <i className="fi fi-rr-angle-small-up text-2xl leading-none" />
        </button>
        <div className="flex flex-col items-center gap-1.5 py-2">
          <span className="w-1.5 h-5 bg-brand-600 rounded-full" />
          <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
          <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
          <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
          <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
        </div>
        <button onClick={() => onScrollBy(1)}
          className="w-12 h-12 rounded-full bg-white shadow-xl border border-gray-100
            flex items-center justify-center text-gray-700
            hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all"
          aria-label="Próximo perfil">
          <i className="fi fi-rr-angle-small-down text-2xl leading-none" />
        </button>
      </div>

      <div ref={feedRef} onScroll={onScroll}
        className="flex-1 min-h-0 overflow-y-scroll snap-y snap-mandatory landing-feed">
        <style>{`
          .landing-feed {
            scroll-behavior: smooth;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .landing-feed::-webkit-scrollbar { display: none; }
        `}</style>

        {profiles.map((p, i) => {
          const a = calcAge(p.birth_date);
          const isActive = i === currentIdx;
          const targetVerified = p.is_verified === true;

          return (
            <div key={`${p.id}-${i}`}
              className="snap-start snap-always w-full h-full flex items-center justify-center">
              <div
                onClick={onAction}
                className={`relative w-full h-full
                  md:max-w-[400px] md:h-[calc(100%-16px)]
                  overflow-hidden bg-gray-900
                  md:rounded-2xl md:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.3)]
                  cursor-pointer select-none active:scale-[0.995]
                  transition-all duration-500
                  ${isActive ? 'opacity-100 scale-100' : 'opacity-90 scale-[0.98]'}`}>

                {p.avatar_url ? (
                  <img src={p.avatar_url} alt={p.name}
                    className="w-full h-full object-cover pointer-events-none"
                    loading="lazy" draggable="false" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-brand-400 via-brand-600 to-brand-800
                    flex items-center justify-center">
                    <i className="fi fi-sr-user text-white text-[120px] leading-none opacity-40" />
                  </div>
                )}

                <div className="absolute inset-x-0 top-0 h-24
                  bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-2/3
                  bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />

                <div className="absolute right-3 bottom-32 z-10 flex flex-col items-center gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); onAction(); }}
                      className="w-12 h-12 rounded-full backdrop-blur border
                        bg-white/15 border-white/20 hover:bg-white/25
                        flex items-center justify-center active:scale-90 transition-all duration-200"
                      aria-label="Gostar">
                      <i className="fi fi-rr-heart text-white text-xl leading-none" />
                    </button>
                    <span className="text-[11px] font-bold text-white/90 drop-shadow-md">
                      Gostar
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); onAction(); }}
                      className="w-12 h-12 rounded-full backdrop-blur border
                        bg-[#25D366] border-[#25D366]/50 shadow-lg shadow-green-500/40
                        hover:bg-[#1eb356]
                        flex items-center justify-center active:scale-90 transition-all duration-200"
                      aria-label="Enviar mensagem">
                      <WhatsAppIcon className="w-6 h-6 text-white" />
                    </button>
                    <span className="text-[11px] font-bold text-white/90 drop-shadow-md">
                      Mensagem
                    </span>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); onAction(); }}
                    className="w-12 h-12 rounded-full bg-white/15 backdrop-blur border border-white/20
                      flex items-center justify-center hover:bg-white/25 active:scale-90 transition"
                    aria-label="Mais opções">
                    <i className="fi fi-sr-menu-dots-vertical text-white text-base leading-none" />
                  </button>
                </div>

                <div className="absolute bottom-0 inset-x-0 p-5 text-white pr-20 pointer-events-none">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display text-[26px] font-extrabold leading-tight">
                      {p.name}{a ? `, ${a}` : ''}
                    </h2>
                    {targetVerified && (
                      <i className="fi fi-sr-badge-check text-blue-400 text-[20px] leading-none
                        drop-shadow-[0_2px_8px_rgba(59,130,246,0.6)]" title="Perfil verificado" />
                    )}
                  </div>

                  {p.city && (
                    <p className="mt-1.5 text-[13px] text-white/90 flex items-center gap-1.5">
                      <i className="fi fi-sr-marker leading-none" />
                      {p.city}
                    </p>
                  )}

                  {p.bio && (
                    <p className="mt-3 text-[13.5px] text-white/85 leading-relaxed line-clamp-3">
                      {p.bio}
                    </p>
                  )}

                  {Array.isArray(p.interests) && p.interests.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.interests.slice(0, 3).map((t) => (
                        <span key={t}
                          className="text-[11px] font-medium bg-white/15 backdrop-blur text-white
                            px-2.5 py-1 rounded-full border border-white/15">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   Plans View (guest)
============================================================ */
function PlansView({ onSubscribe }) {
  return (
    <div className="absolute inset-0 overflow-y-auto bg-white">
      <div className="max-w-[980px] mx-auto px-5 sm:px-8 py-10 sm:py-14">

        <div className="mb-10 sm:mb-12 max-w-lg">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
            <span className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-brand-600">
              Planos · Mensal
            </span>
          </div>
          <h1 className="font-display text-[32px] sm:text-[42px] font-extrabold
            tracking-[-0.03em] text-gray-900 leading-[1.05]">
            Fala com quem quiseres.<br />
            <span className="text-brand-600">Sem complicações.</span>
          </h1>
          <p className="mt-4 text-[15px] text-gray-500 leading-relaxed">
            Todos os planos incluem o <strong className="text-gray-800">selo azul</strong> no teu perfil.
            Cancelas quando quiseres, sem perguntas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-3 items-stretch">
          {PAYMENT_PLANS.map((plan) => {
            const isPopular = plan.popular;

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl flex flex-col
                  transition-all duration-300
                  ${isPopular
                    ? 'bg-gray-900 md:scale-[1.03] md:-my-2 shadow-2xl shadow-gray-900/20'
                    : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-lg'}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <div className="px-3.5 py-1.5 rounded-full bg-brand-600 text-white
                      text-[10.5px] font-bold uppercase tracking-wider
                      shadow-lg shadow-brand-600/40 flex items-center gap-1.5 whitespace-nowrap">
                      <i className="fi fi-sr-star text-[10px] leading-none" />
                      Mais escolhido
                    </div>
                  </div>
                )}

                <div className="p-6 sm:p-7 flex-1 flex flex-col">
                  <div className="mb-5">
                    <h3 className={`font-display text-[20px] font-extrabold leading-tight
                      ${isPopular ? 'text-white' : 'text-gray-900'}`}>
                      {plan.name}
                    </h3>
                    <p className={`text-[12.5px] mt-1 leading-snug
                      ${isPopular ? 'text-white/60' : 'text-gray-500'}`}>
                      {plan.tagline}
                    </p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1.5">
                      <span className={`font-display text-[44px] font-extrabold leading-none tabular-nums
                        ${isPopular ? 'text-white' : 'text-gray-900'}`}>
                        {plan.price}
                      </span>
                      <span className={`text-[14px] font-bold
                        ${isPopular ? 'text-white/70' : 'text-gray-500'}`}>
                        MZN
                      </span>
                    </div>
                    <p className={`text-[11.5px] mt-1.5
                      ${isPopular ? 'text-white/50' : 'text-gray-400'}`}>
                      por mês · sem fidelização
                    </p>
                  </div>

                  <div className={`h-px mb-5
                    ${isPopular ? 'bg-white/10' : 'bg-gray-100'}`} />

                  <ul className="space-y-3 flex-1">
                    {plan.features.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5
                          ${isPopular ? 'bg-brand-500/20' : 'bg-green-50'}`}>
                          <i className={`fi fi-sr-check text-[10px] leading-none
                            ${isPopular ? 'text-brand-400' : 'text-green-600'}`} />
                        </span>
                        <span className={`text-[13.5px] leading-snug
                          ${isPopular ? 'text-white/85' : 'text-gray-700'}`}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={onSubscribe}
                    className={`mt-6 w-full py-3.5 rounded-2xl font-bold text-[14px]
                      transition-all active:scale-[0.98]
                      flex items-center justify-center gap-2
                      ${isPopular
                        ? 'bg-brand-600 text-white hover:bg-brand-500 shadow-lg shadow-brand-600/30'
                        : 'bg-gray-900 text-white hover:bg-gray-800'}`}
                  >
                    Escolher este
                    <i className="fi fi-rr-arrow-small-right text-base leading-none" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: 'fi-sr-shield-check',
              title: 'Pagamento seguro',
              desc: 'M-Pesa e e-Mola',
              color: 'bg-blue-50 text-blue-600',
            },
            {
              icon: 'fi-sr-bolt',
              title: 'Ativação imediata',
              desc: 'Selo ativo em segundos',
              color: 'bg-amber-50 text-amber-600',
            },
            {
              icon: 'fi-sr-refresh',
              title: 'Cancelas quando quiseres',
              desc: 'Sem letras pequenas',
              color: 'bg-green-50 text-green-600',
            },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-3.5 p-4 rounded-2xl
              bg-white border border-gray-100">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${b.color}`}>
                <i className={`fi ${b.icon} text-lg leading-none`} />
              </div>
              <div className="min-w-0">
                <p className="text-[13.5px] font-bold text-gray-900 leading-tight">
                  {b.title}
                </p>
                <p className="text-[12px] text-gray-500 mt-0.5 leading-snug">
                  {b.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="h-10" />
      </div>
    </div>
  );
}