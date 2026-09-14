import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminVerifications() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.rpc('admin_list_users', {
      p_search: null,
      p_filter: 'unverified',
      p_limit: 100,
      p_offset: 0,
    });
    setUsers(data || []);
    setLoading(false);
  };

  const verify = async (userId) => {
    await supabase.rpc('admin_toggle_verify', { target_user: userId });
    load();
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-[26px] sm:text-[30px] font-extrabold tracking-tight text-gray-900">
          Verificações
        </h1>
        <p className="text-[14px] text-gray-500 mt-1">
          Confirma perfis reais para dar mais confiança à comunidade.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
            <i className="fi fi-sr-badge-check text-green-600 text-2xl leading-none" />
          </div>
          <p className="text-[14px] text-gray-500">Todos verificados 🎉</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => (
            <div key={u.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-brand-100 overflow-hidden shrink-0">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <i className="fi fi-sr-user text-brand-600 text-xl leading-none" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold text-[15px] text-gray-900 truncate">
                    {u.name}
                  </p>
                  <p className="text-[12px] text-gray-500 truncate">{u.email}</p>
                  {u.city && (
                    <p className="text-[11.5px] text-gray-400 truncate mt-0.5">📍 {u.city}</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => verify(u.id)}
                className="mt-4 w-full py-2.5 rounded-xl bg-blue-600 text-white
                  text-[13px] font-bold hover:bg-blue-700 transition
                  flex items-center justify-center gap-2"
              >
                <i className="fi fi-sr-badge-check text-base leading-none" />
                Verificar perfil
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}