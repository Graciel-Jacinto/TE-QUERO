import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminVerifications() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unverified' | 'verified'
  const [processingId, setProcessingId] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.rpc('admin_list_users', {
      p_search: null,
      p_filter: filter === 'all' ? null : filter,
      p_limit: 100,
      p_offset: 0,
    });
    setUsers(data || []);
    setLoading(false);
  };

  const toggleVerify = async (userId, currentlyVerified) => {
    setProcessingId(userId);
    try {
      const { data, error } = await supabase.rpc('admin_toggle_verify', {
        target_user: userId,
      });

      if (error) throw error;

      // Se o RPC não devolver o novo estado, assume o oposto
      const newState = data?.is_verified ?? !currentlyVerified;

      // Actualiza localmente sem refetch (mais rápido)
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_verified: newState } : u
        )
      );

      showToast(
        newState
          ? 'Selo atribuído com sucesso.'
          : 'Selo retirado com sucesso.',
        newState ? 'success' : 'info'
      );

      // Se estiver a filtrar, remove da lista quem deixou de pertencer
      if (filter === 'unverified' && newState) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } else if (filter === 'verified' && !newState) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Erro ao atualizar verificação.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  return (
    <div>
      {/* ============ CABEÇALHO ============ */}
      <div className="mb-6">
        <h1 className="font-display text-[26px] sm:text-[30px] font-extrabold tracking-tight text-gray-900">
          Verificações
        </h1>
        <p className="text-[14px] text-gray-500 mt-1">
          Atribui ou retira o selo de verificação aos perfis.
        </p>
      </div>

      {/* ============ FILTROS ============ */}
      <div className="mb-5 flex items-center gap-2 flex-wrap">
        {[
          { id: 'all',        label: 'Todos',       icon: 'fi fi-rr-list' },
          { id: 'unverified', label: 'Não verificados', icon: 'fi fi-rr-time-past' },
          { id: 'verified',   label: 'Verificados', icon: 'fi fi-sr-badge-check' },
        ].map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl
                text-[13px] font-semibold transition
                ${active
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
            >
              <i className={`${f.icon} text-base leading-none`} />
              {f.label}
            </button>
          );
        })}
      </div>

      {/* ============ LISTA ============ */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
            <i className="fi fi-sr-badge-check text-green-600 text-2xl leading-none" />
          </div>
          <p className="text-[14px] text-gray-500">
            {filter === 'verified'
              ? 'Ainda não há perfis verificados.'
              : filter === 'unverified'
                ? 'Todos verificados 🎉'
                : 'Sem utilizadores.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => {
            const verified = u.is_verified === true;
            const busy = processingId === u.id;

            return (
              <div
                key={u.id}
                className={`bg-white rounded-2xl border p-5 transition
                  ${verified ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-full bg-brand-100 overflow-hidden">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <i className="fi fi-sr-user text-brand-600 text-xl leading-none" />
                        </div>
                      )}
                    </div>

                    {verified && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full
                        bg-white border-2 border-blue-100 flex items-center justify-center">
                        <i className="fi fi-sr-badge-check text-blue-500 text-sm leading-none" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-display font-bold text-[15px] text-gray-900 truncate">
                        {u.name}
                      </p>
                      {verified && (
                        <i className="fi fi-sr-badge-check text-blue-500 text-[14px] leading-none shrink-0" />
                      )}
                    </div>
                    <p className="text-[12px] text-gray-500 truncate">{u.email}</p>
                    {u.city && (
                      <p className="text-[11.5px] text-gray-400 truncate mt-0.5">📍 {u.city}</p>
                    )}
                  </div>
                </div>

                {/* Botão alternado */}
                {verified ? (
                  <button
                    onClick={() => toggleVerify(u.id, true)}
                    disabled={busy}
                    className="mt-4 w-full py-2.5 rounded-xl bg-white text-red-600
                      border border-red-200 text-[13px] font-bold
                      hover:bg-red-50 active:scale-[0.98] transition
                      disabled:opacity-60 disabled:cursor-not-allowed
                      flex items-center justify-center gap-2">
                    {busy ? (
                      <>
                        <span className="h-3.5 w-3.5 border-2 border-red-200 border-t-red-600
                          rounded-full animate-spin" />
                        A remover...
                      </>
                    ) : (
                      <>
                        <i className="fi fi-rr-cross-circle text-base leading-none" />
                        Retirar selo
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => toggleVerify(u.id, false)}
                    disabled={busy}
                    className="mt-4 w-full py-2.5 rounded-xl bg-blue-600 text-white
                      text-[13px] font-bold hover:bg-blue-700 active:scale-[0.98] transition
                      disabled:opacity-60 disabled:cursor-not-allowed
                      flex items-center justify-center gap-2">
                    {busy ? (
                      <>
                        <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white
                          rounded-full animate-spin" />
                        A verificar...
                      </>
                    ) : (
                      <>
                        <i className="fi fi-sr-badge-check text-base leading-none" />
                        Verificar perfil
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ============ TOAST ============ */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[400]
            px-4 py-2.5 rounded-xl shadow-xl text-[13px] font-semibold
            text-white max-w-[90vw]
            ${toast.type === 'error'
              ? 'bg-red-600'
              : toast.type === 'success'
                ? 'bg-green-600'
                : 'bg-gray-900'}`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}