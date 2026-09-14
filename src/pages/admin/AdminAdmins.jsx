import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const ROLE_INFO = {
  admin: {
    label: 'Administrador',
    short: 'Admin',
    icon: 'fi-sr-shield-check',
    description: 'Acesso total à plataforma',
    dot: 'bg-gray-900',
  },
  moderator: {
    label: 'Moderador',
    short: 'Mod',
    icon: 'fi-sr-user-shield',
    description: 'Analisa denúncias e verificações',
    dot: 'bg-gray-400',
  },
};

export default function AdminAdmins() {
  const { user } = useAuth();

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!search.trim() || search.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    setShowResults(true);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase.rpc('admin_list_users', {
        p_search: search.trim(),
        p_filter: 'all',
        p_limit: 8,
        p_offset: 0,
      });
      setSearchResults(data || []);
      setSearching(false);
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.rpc('admin_list_admins');
    setAdmins(data || []);
    setLoading(false);
  };

  const stats = useMemo(() => {
    const adminCount = admins.filter((a) => a.role === 'admin').length;
    const modCount = admins.filter((a) => a.role === 'moderator').length;
    return { total: admins.length, adminCount, modCount };
  }, [admins]);

  const grantRole = async (userId, role) => {
    setActionLoading(true);
    const { data } = await supabase.rpc('admin_grant_role', {
      target_user: userId,
      new_role: role,
    });
    setActionLoading(false);

    if (data?.success) {
      showToast(`${ROLE_INFO[role].label} atribuído.`);
      setSearchResults([]);
      setSearch('');
      setShowResults(false);
      load();
    }
  };

  const revokeRole = async (userId, role) => {
    setActionLoading(true);
    const { data } = await supabase.rpc('admin_revoke_role', {
      target_user: userId,
      old_role: role,
    });
    setActionLoading(false);
    setConfirm(null);

    if (data?.success) {
      showToast('Cargo removido.');
      load();
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const adminsList = admins.filter((a) => a.role === 'admin');
  const moderatorsList = admins.filter((a) => a.role === 'moderator');

  return (
    <div className="w-full space-y-5 sm:space-y-6">

      {/* ============ CABEÇALHO ============ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] sm:text-[26px] lg:text-[28px] font-extrabold
            tracking-tight text-gray-900">
            Equipa
          </h1>
          <p className="text-[13px] sm:text-[13.5px] text-gray-500 mt-1">
            Gere quem tem acesso ao painel de administração.
          </p>
        </div>

        {/* Stats inline em desktop */}
        <div className="hidden md:flex items-center gap-2">
          <div className="px-4 py-2 rounded-lg bg-white border border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Admins
            </p>
            <p className="font-display text-[18px] font-extrabold text-gray-900 tabular-nums leading-none mt-0.5">
              {stats.adminCount}
            </p>
          </div>
          <div className="px-4 py-2 rounded-lg bg-white border border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Mods
            </p>
            <p className="font-display text-[18px] font-extrabold text-gray-900 tabular-nums leading-none mt-0.5">
              {stats.modCount}
            </p>
          </div>
          <div className="px-4 py-2 rounded-lg bg-gray-900">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Total
            </p>
            <p className="font-display text-[18px] font-extrabold text-white tabular-nums leading-none mt-0.5">
              {stats.total}
            </p>
          </div>
        </div>
      </div>

      {/* ============ ESTATÍSTICAS (mobile) ============ */}
      <div className="grid grid-cols-3 gap-3 md:hidden">
        <StatBox label="Admins" value={stats.adminCount} />
        <StatBox label="Mods" value={stats.modCount} />
        <StatBox label="Total" value={stats.total} dark />
      </div>

      {/* ============ GRID PRINCIPAL ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] xl:grid-cols-[480px_1fr] gap-5 lg:gap-6">

        {/* ---------- COLUNA ESQUERDA: Adicionar ---------- */}
        <div className="bg-white rounded-2xl border border-gray-100 h-fit lg:sticky lg:top-6">
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <i className="fi fi-rr-user-add text-gray-700 text-base leading-none" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-[14.5px] font-bold text-gray-900">
                  Adicionar à equipa
                </h2>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  Pesquisa por nome ou email
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative" ref={searchRef}>
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                {searching ? (
                  <span className="block h-4 w-4 border-2 border-gray-200 border-t-gray-700
                    rounded-full animate-spin" />
                ) : (
                  <i className="fi fi-rr-search text-base leading-none" />
                )}
              </span>

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => search.length >= 2 && setShowResults(true)}
                placeholder="Nome ou email..."
                className="w-full pl-11 pr-10 py-2.5 rounded-lg border border-gray-200 bg-gray-50
                  text-[14px] placeholder:text-gray-400
                  focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10
                  focus:border-gray-400 transition"
              />

              {search && (
                <button
                  onClick={() => { setSearch(''); setSearchResults([]); setShowResults(false); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md
                    flex items-center justify-center text-gray-400 hover:bg-gray-200 transition"
                >
                  <i className="fi fi-rr-cross-small text-base leading-none" />
                </button>
              )}

              {/* Dropdown */}
              {showResults && search.trim().length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50
                  bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden
                  max-h-[400px] overflow-y-auto">
                  {searching ? (
                    <div className="py-8 text-center">
                      <div className="h-5 w-5 border-2 border-gray-200 border-t-gray-700
                        rounded-full animate-spin mx-auto" />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="py-8 px-6 text-center">
                      <i className="fi fi-rr-search text-gray-300 text-2xl leading-none" />
                      <p className="text-[12.5px] text-gray-500 mt-2">
                        Sem resultados
                      </p>
                    </div>
                  ) : (
                    searchResults.map((u) => {
                      const isAlreadyAdmin = admins.some((a) => a.id === u.id && a.role === 'admin');
                      const isAlreadyMod = admins.some((a) => a.id === u.id && a.role === 'moderator');

                      return (
                        <div
                          key={u.id}
                          className="flex items-center gap-3 px-4 py-3
                            hover:bg-gray-50 border-b border-gray-50 last:border-0"
                        >
                          <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden shrink-0">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <i className="fi fi-sr-user text-gray-500 text-sm leading-none" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-gray-900 truncate">
                              {u.name}
                            </p>
                            <p className="text-[11.5px] text-gray-500 truncate">
                              {u.email}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isAlreadyMod ? (
                              <span className="px-2 py-1 rounded-md bg-gray-100
                                text-[10.5px] font-semibold text-gray-500">
                                Mod
                              </span>
                            ) : (
                              <button
                                onClick={() => grantRole(u.id, 'moderator')}
                                disabled={actionLoading}
                                className="px-2.5 py-1.5 rounded-md border border-gray-200
                                  text-[11px] font-semibold text-gray-700
                                  hover:bg-gray-50 active:scale-[0.97]
                                  disabled:opacity-50 transition"
                              >
                                + Mod
                              </button>
                            )}

                            {isAlreadyAdmin ? (
                              <span className="px-2 py-1 rounded-md bg-gray-100
                                text-[10.5px] font-semibold text-gray-500">
                                Admin
                              </span>
                            ) : (
                              <button
                                onClick={() => grantRole(u.id, 'admin')}
                                disabled={actionLoading}
                                className="px-2.5 py-1.5 rounded-md
                                  bg-gray-900 text-white
                                  text-[11px] font-semibold
                                  hover:bg-gray-800 active:scale-[0.97]
                                  disabled:opacity-50 transition"
                              >
                                + Admin
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Legenda */}
          <div className="border-t border-gray-100 divide-y divide-gray-100">
            {Object.entries(ROLE_INFO).map(([key, info]) => (
              <div key={key} className="flex items-start gap-3 p-4">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <i className={`fi ${info.icon} text-gray-700 text-sm leading-none`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-bold text-gray-900">
                    {info.label}
                  </p>
                  <p className="text-[11.5px] text-gray-500 mt-0.5 leading-snug">
                    {info.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ---------- COLUNA DIREITA: Lista ---------- */}
        <div className="space-y-4 min-w-0">
          {loading ? (
            <LoadingList />
          ) : admins.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {adminsList.length > 0 && (
                <RoleSection
                  role="admin"
                  admins={adminsList}
                  currentUserId={user?.id}
                  onRemove={(admin) => setConfirm({ admin, role: 'admin' })}
                />
              )}

              {moderatorsList.length > 0 && (
                <RoleSection
                  role="moderator"
                  admins={moderatorsList}
                  currentUserId={user?.id}
                  onRemove={(admin) => setConfirm({ admin, role: 'moderator' })}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* ============ MODAL ============ */}
      {confirm && (
        <ConfirmRemoveModal
          admin={confirm.admin}
          role={confirm.role}
          loading={actionLoading}
          onClose={() => setConfirm(null)}
          onConfirm={() => revokeRole(confirm.admin.id, confirm.role)}
        />
      )}

      {/* ============ TOAST ============ */}
      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[400]
          px-4 py-2.5 rounded-lg shadow-lg text-[13px] font-semibold
          text-white max-w-[90vw] flex items-center gap-2
          ${toast.type === 'error' ? 'bg-red-600' : 'bg-gray-900'}`}>
          <i className={`fi ${
            toast.type === 'error' ? 'fi-rr-exclamation' : 'fi-rr-check-circle'
          } text-base leading-none`} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   StatBox
============================================================ */
function StatBox({ label, value, dark = false }) {
  return (
    <div className={`rounded-xl border p-4 ${
      dark ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-100'
    }`}>
      <p className={`text-[10.5px] font-bold uppercase tracking-wider truncate ${
        dark ? 'text-gray-400' : 'text-gray-400'
      }`}>
        {label}
      </p>
      <p className={`font-display text-[22px] font-extrabold mt-1.5 tabular-nums leading-none ${
        dark ? 'text-white' : 'text-gray-900'
      }`}>
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   RoleSection
============================================================ */
function RoleSection({ role, admins, currentUserId, onRemove }) {
  const info = ROLE_INFO[role];
  const isAdminRole = role === 'admin';
  const isLastAdmin = isAdminRole && admins.length <= 1;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2
        px-5 sm:px-6 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`w-2 h-2 rounded-full ${info.dot}`} />
          <h2 className="text-[12px] font-bold uppercase tracking-wider text-gray-500">
            {info.label}s
          </h2>
        </div>
        <span className="text-[12px] font-bold text-gray-400 tabular-nums">
          {admins.length}
        </span>
      </div>

      {/* Lista */}
      <div className="divide-y divide-gray-50">
        {admins.map((a) => {
          const isMe = a.id === currentUserId;
          const cannotRemove = isMe || isLastAdmin;

          return (
            <div
              key={`${a.id}-${a.role}`}
              className="flex items-center gap-3 sm:gap-4 px-5 sm:px-6 py-3.5
                hover:bg-gray-50/60 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0">
                {a.avatar_url ? (
                  <img src={a.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <i className="fi fi-sr-user text-gray-500 text-base leading-none" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-[13.5px] sm:text-[14px] text-gray-900 truncate">
                    {a.name}
                  </p>
                  {isMe && (
                    <span className="shrink-0 text-[10px] font-semibold
                      text-gray-400 uppercase tracking-wider">
                      Tu
                    </span>
                  )}
                  {isLastAdmin && !isMe && (
                    <span className="shrink-0 text-[10px] font-semibold
                      text-gray-400 uppercase tracking-wider">
                      Único
                    </span>
                  )}
                </div>
                <p className="text-[11.5px] sm:text-[12px] text-gray-500 truncate mt-0.5">
                  {a.email}
                </p>
              </div>

              {!cannotRemove && (
                <button
                  onClick={() => onRemove(a)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md
                    text-[11.5px] font-semibold text-gray-500
                    hover:text-red-600 hover:bg-red-50
                    active:scale-[0.97] transition"
                >
                  <i className="fi fi-rr-cross-small text-sm leading-none" />
                  <span className="hidden sm:inline">Remover</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   ConfirmRemoveModal
============================================================ */
function ConfirmRemoveModal({ admin, role, loading, onClose, onConfirm }) {
  const info = ROLE_INFO[role];

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative w-full max-w-sm bg-white rounded-t-2xl sm:rounded-2xl
        p-6 pb-6
        animate-[slideUpModal_220ms_ease-out]">

        <style>{`
          @keyframes slideUpModal {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
          }
          @media (min-width: 640px) {
            @keyframes slideUpModal {
              from { transform: translateY(10px); opacity: 0; }
              to   { transform: translateY(0); opacity: 1; }
            }
          }
        `}</style>

        <div className="sm:hidden w-10 h-1 rounded-full bg-gray-300 mx-auto mb-5" />

        <h3 className="font-display text-[17px] font-extrabold text-gray-900">
          Remover {info.label.toLowerCase()}?
        </h3>

        <p className="mt-2 text-[13.5px] text-gray-600 leading-relaxed">
          <strong className="text-gray-900">{admin.name}</strong> vai perder acesso
          ao painel de administração.
        </p>

        <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
          <div className="w-9 h-9 rounded-full bg-white overflow-hidden shrink-0 border border-gray-200">
            {admin.avatar_url ? (
              <img src={admin.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <i className="fi fi-sr-user text-gray-400 text-sm leading-none" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold text-gray-900 truncate">
              {admin.name}
            </p>
            <p className="text-[11px] text-gray-500 truncate">
              {admin.email}
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-gray-100 text-gray-700
              font-semibold text-[13.5px] hover:bg-gray-200
              disabled:opacity-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-red-600 text-white
              font-semibold text-[13.5px] hover:bg-red-700
              active:scale-[0.98] transition
              disabled:opacity-60
              flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="h-4 w-4 border-2 border-white/40 border-t-white
                rounded-full animate-spin" />
            ) : 'Remover'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   LoadingList
============================================================ */
function LoadingList() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
      <div className="h-3 bg-gray-100 rounded w-24 mb-4" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3 border-t border-gray-50">
          <div className="w-10 h-10 rounded-full bg-gray-100" />
          <div className="flex-1">
            <div className="h-3 bg-gray-100 rounded w-32 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   EmptyState
============================================================ */
function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
        <i className="fi fi-rr-users text-gray-400 text-xl leading-none" />
      </div>
      <p className="text-[13.5px] font-semibold text-gray-900">
        Sem equipa definida
      </p>
      <p className="text-[12.5px] text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed">
        Adiciona administradores e moderadores usando a pesquisa à esquerda.
      </p>
    </div>
  );
}