import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const FILTERS = [
  { value: 'all',        label: 'Todos' },
  { value: 'verified',   label: 'Verificados' },
  { value: 'unverified', label: 'Não verificados' },
  { value: 'suspended',  label: 'Suspensos' },
  { value: 'banned',     label: 'Banidos' },
  { value: 'admins',     label: 'Administradores' },
];

export default function AdminAccounts() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [filter]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.rpc('admin_list_users', {
      p_search: search || null,
      p_filter: filter,
      p_limit: 100,
      p_offset: 0,
    });
    setUsers(data || []);
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    load();
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  /* ---------- Acções ---------- */
  const toggleVerify = async (userId) => {
    setActionLoading(true);
    const { data } = await supabase.rpc('admin_toggle_verify', { target_user: userId });
    setActionLoading(false);
    if (data?.success) {
      showToast(`Perfil ${data.is_verified ? 'verificado' : 'não verificado'}.`);
      load();
      setSelected(null);
    }
  };

  const suspendUser = async (userId) => {
    const reason = prompt('Motivo da suspensão (7 dias):');
    if (reason === null) return;
    setActionLoading(true);
    const { data } = await supabase.rpc('admin_suspend_user', {
      target_user: userId,
      days: 7,
      reason: reason || null,
    });
    setActionLoading(false);
    if (data?.success) {
      showToast('Utilizador suspenso por 7 dias.');
      load();
      setSelected(null);
    }
  };

  const unsuspendUser = async (userId) => {
    setActionLoading(true);
    const { data } = await supabase.rpc('admin_unsuspend_user', { target_user: userId });
    setActionLoading(false);
    if (data?.success) {
      showToast('Suspensão removida.');
      load();
      setSelected(null);
    }
  };

  const banUser = async (userId) => {
    const reason = prompt('Motivo do banimento permanente:');
    if (reason === null) return;
    setActionLoading(true);
    const { data } = await supabase.rpc('admin_ban_user', {
      target_user: userId,
      reason: reason || 'Violação grave das regras',
    });
    setActionLoading(false);
    if (data?.success) {
      showToast('Utilizador banido.', 'error');
      load();
      setSelected(null);
    }
  };

  const unbanUser = async (userId) => {
    setActionLoading(true);
    const { data } = await supabase.rpc('admin_unban_user', { target_user: userId });
    setActionLoading(false);
    if (data?.success) {
      showToast('Banimento removido.');
      load();
      setSelected(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-[26px] sm:text-[30px] font-extrabold tracking-tight text-gray-900">
          Gestão de Contas
        </h1>
        <p className="text-[14px] text-gray-500 mt-1">
          Verifica, suspende ou bane utilizadores da plataforma.
        </p>
      </div>

      {/* Pesquisa + filtros */}
      <div className="mb-5 space-y-3">
        <form onSubmit={handleSearch} className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <i className="fi fi-rr-search text-lg leading-none" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome, email ou cidade..."
            className="w-full pl-12 pr-32 py-3.5 rounded-2xl border border-gray-200 bg-white
              text-[15px] placeholder:text-gray-400
              focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl
              bg-brand-600 text-white text-[13px] font-semibold hover:bg-brand-700 transition"
          >
            Pesquisar
          </button>
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto chip-scroll pb-1">
          <style>{`.chip-scroll::-webkit-scrollbar { display: none; } .chip-scroll { scrollbar-width: none; }`}</style>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold transition
                ${filter === f.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <i className="fi fi-rr-users text-gray-400 text-2xl leading-none" />
          </div>
          <p className="text-[14px] text-gray-500">Sem resultados</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
          {users.map((u, i) => (
            <div
              key={u.id}
              className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition
                ${i !== users.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-brand-100 overflow-hidden
                flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <i className="fi fi-sr-user text-brand-600 text-base leading-none" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-display font-bold text-[15px] text-gray-900 truncate">
                    {u.name || 'Sem nome'}
                  </p>
                  {u.is_verified && (
                    <i className="fi fi-sr-badge-check text-blue-500 text-base leading-none" title="Verificado" />
                  )}
                  {u.is_banned && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700
                      text-[9.5px] font-bold uppercase">Banido</span>
                  )}
                  {u.is_suspended && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700
                      text-[9.5px] font-bold uppercase">Suspenso</span>
                  )}
                  {u.roles?.includes('admin') && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700
                      text-[9.5px] font-bold uppercase">Admin</span>
                  )}
                  {u.roles?.includes('moderator') && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700
                      text-[9.5px] font-bold uppercase">Mod</span>
                  )}
                </div>
                <p className="text-[12.5px] text-gray-500 truncate mt-0.5">
                  {u.email}
                </p>
                <div className="flex items-center gap-3 mt-1 text-[11.5px] text-gray-400">
                  {u.city && <span>📍 {u.city}</span>}
                  {u.age && <span>· {u.age} anos</span>}
                  <span>· {u.contact_balance} contactos</span>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => setSelected(u)}
                className="shrink-0 px-4 py-2 rounded-xl bg-gray-900 text-white
                  text-[12.5px] font-semibold hover:bg-gray-800 transition"
              >
                Gerir
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal de gestão */}
      {selected && (
        <UserActionModal
          user={selected}
          isAdmin={isAdmin}
          loading={actionLoading}
          onClose={() => setSelected(null)}
          onVerify={() => toggleVerify(selected.id)}
          onSuspend={() => suspendUser(selected.id)}
          onUnsuspend={() => unsuspendUser(selected.id)}
          onBan={() => banUser(selected.id)}
          onUnban={() => unbanUser(selected.id)}
          onViewProfile={() => navigate(`/app/perfil/${selected.id}`)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[400]
          px-4 py-2.5 rounded-xl shadow-xl text-[13px] font-semibold
          text-white max-w-[90vw]
          ${toast.type === 'error' ? 'bg-red-600' : 'bg-gray-900'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function UserActionModal({ user, isAdmin, loading, onClose, onVerify, onSuspend, onUnsuspend, onBan, onUnban, onViewProfile }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl
        p-6 pb-8 max-h-[90vh] overflow-y-auto
        animate-[slideUp_250ms_cubic-bezier(0.22,1,0.36,1)]">

        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          @media (min-width: 640px) {
            @keyframes slideUp {
              from { transform: translateY(20px) scale(0.98); opacity: 0; }
              to { transform: translateY(0) scale(1); opacity: 1; }
            }
          }
        `}</style>

        <div className="sm:hidden w-12 h-1.5 rounded-full bg-gray-300 mx-auto mb-5" />

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-100 overflow-hidden shrink-0">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <i className="fi fi-sr-user text-brand-600 text-2xl leading-none" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-[18px] font-extrabold text-gray-900 truncate">
              {user.name}
            </h3>
            <p className="text-[12.5px] text-gray-500 truncate">{user.email}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="p-3 rounded-xl bg-gray-50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Plano</p>
            <p className="text-[13px] font-bold text-gray-900 mt-0.5 capitalize">{user.plan}</p>
          </div>
          <div className="p-3 rounded-xl bg-gray-50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Contactos</p>
            <p className="text-[13px] font-bold text-gray-900 mt-0.5">{user.contact_balance}</p>
          </div>
          <div className="p-3 rounded-xl bg-gray-50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Usados</p>
            <p className="text-[13px] font-bold text-gray-900 mt-0.5">{user.contacts_used}</p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <ActionButton icon="fi-rr-user" label="Ver perfil público" onClick={onViewProfile} color="gray" />

          <ActionButton
            icon={user.is_verified ? 'fi-rr-badge-sale' : 'fi-rr-badge-check'}
            label={user.is_verified ? 'Remover verificação' : 'Verificar perfil'}
            onClick={onVerify}
            color="blue"
            disabled={loading}
          />

          {!user.is_suspended ? (
            <ActionButton
              icon="fi-rr-time-quarter-to"
              label="Suspender 7 dias"
              onClick={onSuspend}
              color="amber"
              disabled={loading || !isAdmin}
            />
          ) : (
            <ActionButton
              icon="fi-rr-time-check"
              label="Remover suspensão"
              onClick={onUnsuspend}
              color="green"
              disabled={loading || !isAdmin}
            />
          )}

          {!user.is_banned ? (
            <ActionButton
              icon="fi-rr-ban"
              label="Banir permanentemente"
              onClick={onBan}
              color="red"
              disabled={loading || !isAdmin}
            />
          ) : (
            <ActionButton
              icon="fi-rr-check-circle"
              label="Remover banimento"
              onClick={onUnban}
              color="green"
              disabled={loading || !isAdmin}
            />
          )}
        </div>

        {!isAdmin && (
          <p className="mt-4 text-[11.5px] text-amber-700 bg-amber-50 border border-amber-200
            rounded-xl px-3 py-2 leading-snug">
            Como Moderador só podes gerir verificações.
          </p>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 mt-4 rounded-2xl bg-gray-100 text-gray-700
            font-semibold text-[14px] hover:bg-gray-200 transition"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, color, disabled }) {
  const colors = {
    blue:  'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-100',
    red:   'bg-red-50 text-red-700 hover:bg-red-100 border-red-100',
    green: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-100',
    gray:  'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-100',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border
        transition font-semibold text-[14px] text-left
        disabled:opacity-40 disabled:cursor-not-allowed
        ${colors[color]}`}
    >
      <i className={`fi ${icon} text-base leading-none`} />
      {label}
    </button>
  );
}