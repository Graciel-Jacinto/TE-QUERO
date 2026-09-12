import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { profilePath } from '../../lib/profilePath';

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id, type, title, body, actor_id, read, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setItems(data || []);
      setLoading(false);

      await supabase.rpc('mark_all_read');
    })();
  }, [user]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-gray-900">
        Notificações
      </h1>
      <p className="text-gray-600 mt-1">
        Fica a par de quem se interessou por ti.
      </p>

      {items.length === 0 ? (
        <div className="mt-10 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <i className="fi fi-rr-bell text-gray-400 text-2xl leading-none" />
          </div>
          <p className="text-sm text-gray-500">
            Ainda não tens notificações
          </p>
        </div>
      ) : (
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {items.map((n, i) => {
            const meta = iconFor(n.type);
            return (
              <button
                key={n.id}
                onClick={() => {
                  if (n.actor_id) {
                    // Passa o id como parâmetro — o UserProfile resolve pelo slug ou id
                    navigate(`/app/perfil/${n.actor_id}`);
                  }
                }}
                disabled={!n.actor_id}
                className={`w-full flex items-start gap-4 p-4 text-left
                  hover:bg-gray-50 active:bg-gray-100 transition
                  ${i !== items.length - 1 ? 'border-b border-gray-50' : ''}
                  ${!n.read ? 'bg-brand-50/40' : ''}`}
              >
                <div className={`w-11 h-11 rounded-xl ${meta.bg}
                  flex items-center justify-center shrink-0`}>
                  <i className={`fi ${meta.icon} ${meta.fg} text-lg leading-none`} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-[14px] text-gray-900 leading-snug">
                      {n.title}
                    </p>
                    <span className="text-[11px] text-gray-400 shrink-0 mt-0.5">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  {n.body && (
                    <p className="text-[12.5px] text-gray-500 mt-0.5 leading-snug">
                      {n.body}
                    </p>
                  )}
                </div>

                {!n.read && (
                  <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0 mt-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}