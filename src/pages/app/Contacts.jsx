import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function Contacts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data } = await supabase.rpc('my_conversations');
      setConversations(data || []);
      setLoading(false);
    };
    load();

    // Realtime — atualizar lista quando chega nova mensagem
    const channel = supabase
      .channel('conv-list')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => load())
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const timeAgo = (iso) => {
    if (!iso) return '';
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'agora';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-[26px] sm:text-[30px] font-extrabold tracking-tight text-gray-900">
            Conversas
          </h1>
          <p className="text-[14px] text-gray-500 mt-1">
            Fala com quem já contactaste no Te Quero.
          </p>
        </div>

        <button
          onClick={() => navigate('/app/descobrir')}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
            bg-brand-600 text-white text-[13.5px] font-semibold
            hover:bg-brand-700 active:scale-[0.98] transition
            shadow-lg shadow-brand-600/25"
        >
          <i className="fi fi-rr-heart text-base leading-none" />
          <span className="hidden sm:inline">Descobrir pessoas</span>
          <span className="sm:hidden">Descobrir</span>
        </button>
      </div>

      {/* Lista vazia */}
      {conversations.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 py-16 px-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
            <i className="fi fi-sr-comment text-brand-600 text-3xl leading-none" />
          </div>
          <h2 className="font-display text-[18px] font-extrabold text-gray-900">
            Ainda sem conversas
          </h2>
          <p className="text-[13.5px] text-gray-500 mt-2 max-w-sm mx-auto leading-relaxed">
            Quando contactares alguém, a conversa aparece aqui. Usa um contacto para começar.
          </p>
          <button
            onClick={() => navigate('/app/descobrir')}
            className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl
              bg-gray-900 text-white text-[14px] font-semibold
              hover:bg-gray-800 active:scale-[0.98] transition"
          >
            <i className="fi fi-rr-heart text-base leading-none" />
            Descobrir pessoas
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
          {conversations.map((c, i) => (
            <Link
              key={c.id}
              to={`/app/chat/${c.id}`}
              className={`flex items-center gap-4 px-5 py-4
                hover:bg-gray-50 active:bg-gray-100 transition
                ${i !== conversations.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-full bg-brand-100 overflow-hidden
                  flex items-center justify-center border-2 border-white shadow-sm">
                  {c.other_avatar ? (
                    <img src={c.other_avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <i className="fi fi-sr-user text-brand-600 text-xl leading-none" />
                  )}
                </div>
                {c.unread_count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1
                    bg-brand-600 text-white text-[11px] font-bold rounded-full
                    flex items-center justify-center border-2 border-white">
                    {c.unread_count > 9 ? '9+' : c.unread_count}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate text-[15px] ${
                    c.unread_count > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'
                  }`}>
                    {c.other_name}
                  </p>
                  <span className="shrink-0 text-[11.5px] text-gray-400">
                    {timeAgo(c.last_message_at)}
                  </span>
                </div>
                <p className={`truncate text-[13px] mt-0.5 ${
                  c.unread_count > 0 ? 'font-medium text-gray-700' : 'text-gray-500'
                }`}>
                  {c.last_message_preview || 'Conversa iniciada. Diz olá 👋'}
                </p>
              </div>

              <i className="fi fi-rr-angle-small-right text-gray-300 text-lg leading-none shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}