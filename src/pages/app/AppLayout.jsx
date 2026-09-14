import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

/* ---------- Tabs completas (desktop sidebar) ---------- */
const allTabs = [
  { to: '/app/descobrir',    label: 'Descobrir',    icon: 'fi-rr-heart',       fill: 'fi-sr-heart' },
  { to: '/app/pesquisa',     label: 'Pesquisar',    icon: 'fi-rr-search',      fill: 'fi-sr-search' },
  { to: '/app/notificacoes', label: 'Notificações', icon: 'fi-rr-bell',        fill: 'fi-sr-bell', badge: true },
  { to: '/app/planos',       label: 'Planos',       icon: 'fi-rr-credit-card', fill: 'fi-sr-credit-card' },
  { to: '/app/perfil',       label: 'Perfil',       icon: 'fi-rr-user',        fill: 'fi-sr-user' },
];

/* ---------- Bottom navbar mobile ---------- */
const mobileNav = [
  { to: '/app/descobrir', label: 'Descobrir', icon: 'fi-rr-heart',    fill: 'fi-sr-heart' },
  { to: '/app/pesquisa',  label: 'Pesquisar', icon: 'fi-rr-search',   fill: 'fi-sr-search' },
  { to: '/app/perfil',    label: 'Perfil',    icon: 'fi-rr-user',     fill: 'fi-sr-user' },
];

/* ---------- Itens extra no drawer mobile ---------- */
const mobileDrawerItems = [
  { to: '/app/notificacoes', label: 'Notificações', icon: 'fi-rr-bell',        desc: 'Vê quem se interessou por ti', badge: true },
  { to: '/app/planos',       label: 'Planos',       icon: 'fi-rr-credit-card', desc: 'Compra mais contactos' },
];

export default function AppLayout() {
  const { profile, user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isDiscover = location.pathname.startsWith('/app/descobrir');

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('tq-sidebar-collapsed') === 'true';
  });

  const [unread, setUnread] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const notifRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('tq-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => { setDrawerOpen(false); setNotifOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  /* ---------- Fechar popup ao clicar fora ---------- */
  useEffect(() => {
    const onClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  /* ---------- Contador em tempo real ---------- */
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const fetchUnread = async () => {
      const { data } = await supabase.rpc('my_unread_count');
      if (mounted) setUnread(data || 0);
    };
    fetchUnread();

    const channel = supabase
      .channel('notif-count')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${user.id}` },
        () => fetchUnread())
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${user.id}` },
        () => fetchUnread())
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  /* ---------- Abrir popup ---------- */
  const openNotifPopup = async () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (!next || !user) return;

    setNotifLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, actor_id, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    setNotifications(data || []);
    setNotifLoading(false);

    await supabase.rpc('mark_all_read');
    setUnread(0);
  };

  const timeAgo = (iso) => {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'agora';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
  };

  const iconFor = (type) => {
    if (type === 'like')    return { icon: 'fi-sr-heart',        bg: 'bg-brand-50', fg: 'text-brand-600' };
    if (type === 'contact') return { icon: 'fi-brands-whatsapp', bg: 'bg-green-50', fg: 'text-green-600' };
    return                       { icon: 'fi-sr-bell',          bg: 'bg-amber-50', fg: 'text-amber-600' };
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  /* ---------- Lista de notificações ---------- */
  const NotifList = () => (
    <div className="flex-1 min-h-0 overflow-y-auto notif-scroll">
      <style>{`
        .notif-scroll::-webkit-scrollbar { width: 6px; }
        .notif-scroll::-webkit-scrollbar-track { background: transparent; }
        .notif-scroll::-webkit-scrollbar-thumb {
          background: #e5e7eb; border-radius: 3px;
        }
      `}</style>

      {notifLoading && (
        <div className="py-12 text-center">
          <div className="h-6 w-6 border-[3px] border-brand-200 border-t-brand-600
            rounded-full animate-spin mx-auto" />
        </div>
      )}

      {!notifLoading && notifications.length === 0 && (
        <div className="py-14 text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <i className="fi fi-rr-bell text-gray-400 text-xl leading-none" />
          </div>
          <p className="text-[13.5px] font-semibold text-gray-900">
            Sem notificações
          </p>
          <p className="text-[12px] text-gray-500 mt-1">
            Fica atento, avisamos-te quando alguém se interessar.
          </p>
        </div>
      )}

      {!notifLoading && notifications.map((n, i) => {
        const meta = iconFor(n.type);
        return (
          <button
            key={n.id}
            onClick={() => {
              if (n.actor_id) {
                setNotifOpen(false);
                navigate(`/app/perfil/${n.actor_id}`);
              }
            }}
            disabled={!n.actor_id}
            className={`w-full flex items-start gap-3.5 px-5 py-4 text-left transition
              ${n.actor_id ? 'hover:bg-gray-50 active:bg-gray-100' : 'cursor-default'}
              ${i !== notifications.length - 1 ? 'border-b border-gray-50' : ''}`}
          >
            <div className={`w-10 h-10 rounded-xl ${meta.bg}
              flex items-center justify-center shrink-0`}>
              <i className={`fi ${meta.icon} ${meta.fg} text-base leading-none`} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13.5px] font-semibold text-gray-900 leading-snug">
                  {n.title}
                </p>
                <span className="text-[11px] text-gray-400 shrink-0 mt-0.5">
                  {timeAgo(n.created_at)}
                </span>
              </div>
              {n.body && (
                <p className="text-[12.5px] text-gray-500 mt-0.5 leading-snug line-clamp-2">
                  {n.body}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">

      {/* ============ HEADER MOBILE ============ */}
      <header className="md:hidden shrink-0 bg-white border-b border-gray-100 z-[60]">
        <div className="h-[56px] px-3 flex items-center justify-between gap-2">

          <button onClick={() => navigate('/app/descobrir')} className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700
              flex items-center justify-center shadow-sm shadow-brand-600/30">
              <i className="fi fi-sr-heart text-white text-base leading-none" />
            </div>
            <span className="font-display font-extrabold text-[16px] tracking-tight text-gray-900">
              Te Quero<span className="text-brand-600">.</span>
            </span>
          </button>

          <div className="flex items-center gap-0.5" ref={notifRef}>
            <button
              onClick={() => navigate('/app/pesquisa')}
              className="w-10 h-10 rounded-full flex items-center justify-center
                text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition"
              aria-label="Pesquisar"
            >
              <i className="fi fi-rr-search text-[19px] leading-none" />
            </button>

            <button
              onClick={openNotifPopup}
              className="relative w-10 h-10 rounded-full flex items-center justify-center
                text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition"
              aria-label="Notificações"
            >
              <i className={`fi ${notifOpen ? 'fi-sr-bell' : 'fi-rr-bell'} text-[19px] leading-none`} />
              {unread > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1
                  bg-brand-600 text-white text-[10px] font-bold rounded-full
                  flex items-center justify-center border-2 border-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            <button
              onClick={() => setDrawerOpen(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center
                text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition"
              aria-label="Abrir menu"
            >
              <i className="fi fi-rr-menu-burger text-[19px] leading-none" />
            </button>
          </div>
        </div>
      </header>

      {/* ============ POPUP MOBILE (bottom sheet) ============ */}
      {notifOpen && (
        <div className="md:hidden fixed inset-0 z-[120] flex items-end justify-center">
          <div
            onClick={() => setNotifOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          <div className="relative w-full max-w-lg bg-white rounded-t-3xl
            max-h-[80vh] flex flex-col overflow-hidden
            animate-[slideUpNotif_250ms_cubic-bezier(0.22,1,0.36,1)]">

            <style>{`
              @keyframes slideUpNotif {
                from { transform: translateY(100%); }
                to   { transform: translateY(0); }
              }
            `}</style>

            <div className="shrink-0 pt-3 pb-0">
              <div className="w-12 h-1.5 rounded-full bg-gray-300 mx-auto mb-3" />
              <div className="flex items-center justify-between px-5 pb-4
                border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-extrabold text-[16px] text-gray-900">
                    Notificações
                  </h3>
                  {unread > 0 && (
                    <span className="px-2 py-0.5 bg-brand-100 text-brand-700 text-[11px]
                      font-bold rounded-full">
                      {unread} nova{unread !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => { setNotifOpen(false); navigate('/app/notificacoes'); }}
                  className="text-[12.5px] font-semibold text-brand-600 hover:text-brand-700 transition"
                >
                  Ver todas
                </button>
              </div>
            </div>

            <NotifList />

            <div className="shrink-0 p-4 border-t border-gray-100">
              <button
                onClick={() => setNotifOpen(false)}
                className="w-full py-3 rounded-2xl bg-gray-100 text-gray-700
                  font-semibold text-[14px] hover:bg-gray-200 active:bg-gray-300 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ LAYOUT PRINCIPAL ============ */}
      <div className="flex-1 min-h-0 flex relative">

        {/* ---------- SIDEBAR (desktop) ---------- */}
        <aside
          className={`hidden md:flex md:flex-col shrink-0
            bg-white border-r border-gray-100 z-40
            transition-all duration-300 ease-in-out
            ${collapsed ? 'w-[92px]' : 'w-[320px] lg:w-[340px]'}`}
        >
          {/* ---------- Logo + Sino (topo) ---------- */}
          <div className={`h-[84px] flex items-center border-b border-gray-100
            ${collapsed ? 'justify-center px-2 flex-col gap-2' : 'px-6 justify-between gap-2'}`}>

            {!collapsed ? (
              <>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700
                    flex items-center justify-center shadow-sm shadow-brand-600/30 shrink-0">
                    <i className="fi fi-sr-heart text-white text-lg leading-none" />
                  </div>
                  <div className="flex flex-col leading-none min-w-0">
                    <span className="font-display font-extrabold text-[20px] tracking-tight text-gray-900 truncate">
                      Te Quero<span className="text-brand-600">.</span>
                    </span>
                    <span className="text-[10px] font-medium text-gray-400 tracking-[0.15em] uppercase mt-1">
                      Encontros
                    </span>
                  </div>
                </div>

                {/* 🔔 Sino na sidebar (expandido) */}
                <div className="relative shrink-0" ref={notifRef}>
                  <button
                    onClick={openNotifPopup}
                    className="relative w-10 h-10 rounded-full flex items-center justify-center
                      text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition"
                    aria-label="Notificações"
                  >
                    <i className={`fi ${notifOpen ? 'fi-sr-bell' : 'fi-rr-bell'} text-[19px] leading-none`} />
                    {unread > 0 && (
                      <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1
                        bg-brand-600 text-white text-[10px] font-bold rounded-full
                        flex items-center justify-center border-2 border-white">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </button>

                  {/* Dropdown desktop */}
                  {notifOpen && (
                    <div className="absolute left-full ml-2 top-0 w-[400px] max-h-[600px]
                      bg-white rounded-2xl shadow-2xl border border-gray-100
                      flex flex-col overflow-hidden z-[100]
                      animate-[notifIn_180ms_cubic-bezier(0.22,1,0.36,1)]">

                      <style>{`
                        @keyframes notifIn {
                          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
                          to   { opacity: 1; transform: translateY(0) scale(1); }
                        }
                      `}</style>

                      <div className="shrink-0 flex items-center justify-between px-5 py-4
                        border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-extrabold text-[16px] text-gray-900">
                            Notificações
                          </h3>
                          {unread > 0 && (
                            <span className="px-2 py-0.5 bg-brand-100 text-brand-700 text-[11px]
                              font-bold rounded-full">
                              {unread} nova{unread !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => { setNotifOpen(false); navigate('/app/notificacoes'); }}
                          className="text-[12.5px] font-semibold text-brand-600 hover:text-brand-700 transition"
                        >
                          Ver todas
                        </button>
                      </div>

                      <NotifList />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700
                  flex items-center justify-center shadow-sm shadow-brand-600/30">
                  <i className="fi fi-sr-heart text-white text-lg leading-none" />
                </div>

                <button
                  onClick={openNotifPopup}
                  className="relative w-10 h-10 rounded-full flex items-center justify-center
                    text-gray-600 hover:bg-gray-100 transition"
                  aria-label="Notificações"
                >
                  <i className={`fi ${notifOpen ? 'fi-sr-bell' : 'fi-rr-bell'} text-[19px] leading-none`} />
                  {unread > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1
                      bg-brand-600 text-white text-[10px] font-bold rounded-full
                      flex items-center justify-center border-2 border-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </button>
              </>
            )}
          </div>

          <nav className={`flex-1 py-4 space-y-1.5 overflow-y-auto sidebar-nav
            ${collapsed ? 'px-2.5' : 'px-4'}`}>
            <style>{`
              .sidebar-nav::-webkit-scrollbar { width: 0; }
              .sidebar-nav { scrollbar-width: none; }
            `}</style>

            {allTabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                title={collapsed ? t.label : undefined}
                className={({ isActive }) =>
                  `group relative flex items-center rounded-xl text-[15px] font-semibold
                  transition-all duration-200
                  ${collapsed ? 'justify-center px-2 py-3.5' : 'gap-4 px-4 py-3.5'}
                  ${isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="relative shrink-0">
                      <i className={`fi ${isActive ? t.fill : t.icon}
                        ${collapsed ? 'text-[22px]' : 'text-[20px]'} leading-none`} />

                      {collapsed && t.badge && unread > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1
                          bg-brand-600 text-white text-[9.5px] font-bold rounded-full
                          flex items-center justify-center border-2 border-white">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </div>

                    {!collapsed && <span className="truncate flex-1">{t.label}</span>}

                    {!collapsed && t.badge && unread > 0 && (
                      <span className="shrink-0 min-w-[20px] h-5 px-1.5
                        bg-brand-600 text-white text-[11px] font-bold rounded-full
                        flex items-center justify-center">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}

                    {collapsed && (
                      <span className="absolute left-full ml-3 px-3 py-2 rounded-lg
                        bg-gray-900 text-white text-[13px] font-medium
                        whitespace-nowrap opacity-0 pointer-events-none
                        group-hover:opacity-100 transition-opacity duration-150
                        shadow-xl z-[100]">
                        {t.label}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* ---------- Colapsar menu ---------- */}
          <div className={`border-t border-gray-100 ${collapsed ? 'p-3' : 'p-4'}`}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={`w-full flex items-center rounded-xl font-semibold
                text-gray-500 hover:text-gray-900 hover:bg-gray-100
                active:bg-gray-200 transition-all duration-200
                ${collapsed ? 'justify-center p-3' : 'gap-4 px-4 py-3'}`}
            >
              <i className={`fi ${collapsed ? 'fi-rr-angle-small-right' : 'fi-rr-angle-small-left'}
                text-[20px] leading-none shrink-0`} />
              {!collapsed && <span className="text-[14.5px]">Colapsar menu</span>}
            </button>
          </div>

          {/* ---------- Perfil (cima) + Logout (baixo) ---------- */}
          <div className={`border-t border-gray-100 ${collapsed ? 'p-2.5 space-y-2' : 'p-4 space-y-2'}`}>

            {/* Perfil */}
            <button
              onClick={() => navigate('/app/perfil')}
              className={`w-full flex items-center rounded-xl
                hover:bg-gray-50 active:bg-gray-100 transition text-left
                ${collapsed ? 'justify-center p-2' : 'gap-3.5 px-3 py-2.5'}`}
              title={collapsed ? 'Ver o meu perfil' : undefined}
            >
              <div className="w-11 h-11 rounded-full bg-brand-100 overflow-hidden
                flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <i className="fi fi-sr-user text-brand-600 text-base leading-none" />
                )}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-gray-900 truncate leading-tight">
                    {profile?.name?.split(' ')[0] || 'Utilizador'}
                  </p>
                  <p className="text-[11.5px] text-gray-400 truncate mt-0.5">Ver o meu perfil</p>
                </div>
              )}
            </button>

            {/* Logout */}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className={`w-full flex items-center rounded-xl font-semibold
                text-red-600 hover:bg-red-50 active:bg-red-100
                transition-all duration-200
                ${collapsed ? 'justify-center p-3' : 'gap-3.5 px-3 py-2.5'}`}
              title={collapsed ? 'Terminar sessão' : undefined}
            >
              <i className="fi fi-rr-sign-out-alt text-[20px] leading-none shrink-0" />
              {!collapsed && <span className="text-[14.5px]">Terminar sessão</span>}
            </button>
          </div>
        </aside>

        {/* ---------- CONTEÚDO ---------- */}
        <main className="flex-1 min-h-0 relative overflow-hidden">
          {isDiscover ? (
            <Outlet />
          ) : (
            <div className="h-full overflow-y-auto">
              <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6">
                <Outlet />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ============ BOTTOM NAVBAR (mobile) ============ */}
      <nav className="md:hidden shrink-0 bg-white border-t border-gray-100 z-40">
        <div className="grid grid-cols-3">
          {mobileNav.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
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
            <span className="font-display font-extrabold text-[16px] text-gray-900">
              Menu
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

        <div className="shrink-0 p-5 border-b border-gray-100">
          <button
            onClick={() => navigate('/app/perfil')}
            className="w-full flex items-center gap-3.5 text-left"
          >
            <div className="w-14 h-14 rounded-full bg-brand-100 overflow-hidden
              flex items-center justify-center border-2 border-white shadow-sm shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <i className="fi fi-sr-user text-brand-600 text-xl leading-none" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-[16px] text-gray-900 truncate leading-tight">
                {profile?.name?.split(' ')[0] || 'Utilizador'}
              </p>
              <p className="text-[12.5px] text-gray-400 truncate mt-0.5">Ver o meu perfil</p>
            </div>
            <i className="fi fi-rr-angle-small-right text-gray-300 text-lg leading-none" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <p className="px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
            Mais opções
          </p>

          {mobileDrawerItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-3 py-3.5 rounded-2xl transition
                ${isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-700 hover:bg-gray-50'}`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <i className={`fi ${isActive ? item.icon.replace('rr', 'sr') : item.icon}
                      text-[19px] leading-none`} />
                    {item.badge && unread > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1
                        bg-brand-600 text-white text-[10px] font-bold rounded-full
                        flex items-center justify-center border-2 border-white">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[14.5px] leading-tight">{item.label}</p>
                    <p className="text-[11.5px] text-gray-400 truncate mt-0.5">{item.desc}</p>
                  </div>
                  <i className="fi fi-rr-angle-small-right text-gray-300 text-base leading-none" />
                </>
              )}
            </NavLink>
          ))}
        </div>

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

      {/* ============ MODAL DE CONFIRMAÇÃO LOGOUT (desktop) ============ */}
      {showLogoutConfirm && (
        <div className="hidden md:flex fixed inset-0 z-[300] items-center justify-center">
          <div
            onClick={() => setShowLogoutConfirm(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          <div className="relative w-full max-w-sm bg-white rounded-3xl p-7 shadow-2xl
            animate-[logoutIn_200ms_cubic-bezier(0.22,1,0.36,1)]">

            <style>{`
              @keyframes logoutIn {
                from { opacity: 0; transform: scale(0.95) translateY(10px); }
                to   { opacity: 1; transform: scale(1) translateY(0); }
              }
            `}</style>

            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-3xl bg-red-50 flex items-center justify-center">
                <i className="fi fi-sr-sign-out-alt text-red-600 text-2xl leading-none" />
              </div>
            </div>

            <h3 className="font-display text-[19px] font-extrabold text-gray-900 text-center">
              Terminar sessão?
            </h3>
            <p className="mt-2 text-[13.5px] text-gray-500 text-center leading-relaxed">
              Vais sair da tua conta. Podes sempre voltar a entrar quando quiseres.
            </p>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-700
                  font-semibold text-[14.5px]
                  hover:bg-gray-200 active:bg-gray-300 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3.5 rounded-xl bg-red-600 text-white
                  font-bold text-[14.5px]
                  hover:bg-red-700 active:scale-[0.98] transition
                  shadow-lg shadow-red-600/25
                  flex items-center justify-center gap-2"
              >
                <i className="fi fi-rr-sign-out-alt text-base leading-none" />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}