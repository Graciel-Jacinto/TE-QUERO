import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function Chat() {
  const { id: conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [other, setOther] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);
  const [otherTyping, setOtherTyping] = useState(false);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const channelRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const myTypingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  /* ---------- Carregar conversa ---------- */
  useEffect(() => {
    if (!conversationId || !user) return;

    (async () => {
      const { data: conv } = await supabase
        .from('conversations')
        .select('id, user_a, user_b, last_message_at')
        .eq('id', conversationId)
        .maybeSingle();

      if (!conv) {
        setLoading(false);
        return;
      }

      const otherId = conv.user_a === user.id ? conv.user_b : conv.user_a;

      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('id, name, slug, avatar_url')
        .eq('id', otherId)
        .maybeSingle();

      setOther(otherProfile);

      const { data: msgs } = await supabase.rpc('conversation_messages', {
        p_conversation_id: conversationId,
      });
      setMessages(msgs || []);
      setLoading(false);

      // Marcar como entregues + lidas
      await supabase.rpc('mark_messages_delivered', { p_conversation_id: conversationId });
      await supabase.rpc('mark_messages_read', { p_conversation_id: conversationId });

      requestAnimationFrame(() => scrollToBottom());
    })();
  }, [conversationId, user]);

  /* ---------- Realtime: mensagens + typing + status ---------- */
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`chat-${conversationId}`, {
        config: {
          broadcast: { self: false },
        },
      })
      // Nova mensagem
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          setMessages((prev) => {
            // Evitar duplicados
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          requestAnimationFrame(() => scrollToBottom());

          if (payload.new.sender_id !== user.id) {
            await supabase.rpc('mark_messages_delivered', { p_conversation_id: conversationId });
            await supabase.rpc('mark_messages_read', { p_conversation_id: conversationId });
          }
        }
      )
      // Mensagem lida (o outro leu as minhas)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m))
          );
        }
      )
      // Typing indicator
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id === user.id) return;
        setOtherTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 3000);
      })
      .on('broadcast', { event: 'stop_typing' }, ({ payload }) => {
        if (payload.user_id === user.id) return;
        setOtherTyping(false);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (myTypingTimeoutRef.current) clearTimeout(myTypingTimeoutRef.current);
    };
  }, [conversationId, user]);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  /* ---------- Typing ---------- */
  const notifyTyping = () => {
    if (!channelRef.current) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: user.id },
      });
    }
    // Reset do timer — se parar de escrever 2s, envia "stop"
    if (myTypingTimeoutRef.current) clearTimeout(myTypingTimeoutRef.current);
    myTypingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'stop_typing',
          payload: { user_id: user.id },
        });
      }
    }, 2000);
  };

  const stopTyping = () => {
    if (isTypingRef.current && channelRef.current) {
      isTypingRef.current = false;
      channelRef.current.send({
        type: 'broadcast',
        event: 'stop_typing',
        payload: { user_id: user.id },
      });
    }
    if (myTypingTimeoutRef.current) clearTimeout(myTypingTimeoutRef.current);
  };

  /* ---------- Enviar mensagem ---------- */
  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;

    stopTyping();

    // Optimistic update — mostra logo a mensagem com estado "sending"
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      sender_id: user.id,
      content,
      delivered: false,
      read: false,
      created_at: new Date().toISOString(),
      _sending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setText('');
    setSending(true);
    requestAnimationFrame(() => scrollToBottom());

    const { data, error } = await supabase.rpc('send_message', {
      p_conversation_id: conversationId,
      p_content: content,
    });

    setSending(false);

    if (error || !data?.success) {
      // Remover optimista + restaurar texto
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(content);
      return showToast('Erro ao enviar. Tenta novamente.', 'error');
    }

    // Substituir optimista pelo real
    setMessages((prev) =>
      prev.map((m) =>
        m.id === tempId
          ? {
              id: data.message_id,
              sender_id: user.id,
              content,
              delivered: false,
              read: false,
              created_at: new Date().toISOString(),
              _sending: false,
            }
          : m
      )
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    notifyTyping();
    // Auto-resize textarea
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    }
  };

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  const formatDay = (iso) =>
    new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long' });

  const shouldShowDay = (i) => {
    if (i === 0) return true;
    const prev = new Date(messages[i - 1].created_at).toDateString();
    const cur = new Date(messages[i].created_at).toDateString();
    return prev !== cur;
  };

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!other) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <i className="fi fi-rr-comment text-gray-400 text-2xl leading-none" />
        </div>
        <h2 className="font-display text-xl font-extrabold text-gray-900">
          Conversa não encontrada
        </h2>
        <button
          onClick={() => navigate('/app/contactos')}
          className="mt-4 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold"
        >
          Voltar aos contactos
        </button>
      </div>
    );
  }

  /* ---------- UI ---------- */
  return (
    <>
      <div className="absolute inset-0 flex flex-col bg-gray-50 overflow-hidden">

        {/* ============ HEADER ============ */}
        <header className="shrink-0 bg-white border-b border-gray-100 z-10">
          <div className="flex items-center gap-3 px-3 sm:px-4 h-[64px]">
            <button
              onClick={() => navigate('/app/contactos')}
              className="w-10 h-10 rounded-full flex items-center justify-center
                text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition shrink-0"
              aria-label="Voltar"
            >
              <i className="fi fi-rr-angle-small-left text-xl leading-none" />
            </button>

            <button
              onClick={() => other.slug && navigate(`/app/perfil/${other.slug}`)}
              className="flex items-center gap-3 min-w-0 flex-1 text-left
                hover:bg-gray-50 rounded-xl -mx-1 px-1 py-1 transition"
            >
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-brand-100 overflow-hidden
                  flex items-center justify-center border-2 border-white shadow-sm">
                  {other.avatar_url ? (
                    <img src={other.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <i className="fi fi-sr-user text-brand-600 text-base leading-none" />
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full
                  bg-green-500 border-2 border-white" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-display font-bold text-[15px] text-gray-900 truncate">
                  {other.name}
                </p>

                {/* Estado dinâmico */}
                <div className="h-[16px] flex items-center">
                  {otherTyping ? (
                    <span className="flex items-center gap-1.5">
                      <span className="text-[12px] text-brand-600 font-semibold">
                        a escrever
                      </span>
                      <TypingDots />
                    </span>
                  ) : (
                    <p className="text-[11.5px] text-green-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Online
                    </p>
                  )}
                </div>
              </div>
            </button>
          </div>
        </header>

        {/* ============ MENSAGENS ============ */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-4 chat-scroll"
        >
          <style>{`
            .chat-scroll::-webkit-scrollbar { width: 6px; }
            .chat-scroll::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 3px; }

            @keyframes bounceDot {
              0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
              30% { transform: translateY(-4px); opacity: 1; }
            }
            .typing-dot {
              animation: bounceDot 1.2s infinite ease-in-out;
            }
            .typing-dot:nth-child(2) { animation-delay: 0.15s; }
            .typing-dot:nth-child(3) { animation-delay: 0.3s; }
          `}</style>

          <div className="max-w-[720px] mx-auto space-y-2">

            {/* Aviso inicial */}
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl
                bg-white border border-gray-100 shadow-sm text-[12px] text-gray-500">
                <i className="fi fi-rr-lock text-gray-400 text-sm leading-none" />
                As conversas são privadas entre ti e {other.name?.split(' ')[0]}.
              </div>
            </div>

            {messages.map((m, i) => {
              const mine = m.sender_id === user.id;
              return (
                <div key={m.id || i}>
                  {shouldShowDay(i) && (
                    <div className="text-center py-3">
                      <span className="inline-block px-3 py-1 rounded-full
                        bg-white border border-gray-100 text-[11px] font-semibold
                        text-gray-500 uppercase tracking-wider">
                        {formatDay(m.created_at)}
                      </span>
                    </div>
                  )}

                  <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`relative max-w-[85%] sm:max-w-[75%] px-3.5 py-2.5
                        rounded-2xl text-[14.5px] leading-relaxed
                        ${mine
                          ? 'bg-brand-600 text-white rounded-br-md'
                          : 'bg-white text-gray-900 rounded-bl-md border border-gray-100 shadow-sm'}`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>

                      <div className={`mt-1 flex items-center justify-end gap-1
                        ${mine ? 'text-white/70' : 'text-gray-400'}`}>
                        <span className="text-[10.5px]">{formatTime(m.created_at)}</span>

                        {/* Estado — só para mensagens minhas */}
                        {mine && <MessageStatus sending={m._sending} delivered={m.delivered} read={m.read} />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator quando NÃO está na header (opcional — em mobile é útil) */}
            {otherTyping && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-900 rounded-2xl rounded-bl-md
                  border border-gray-100 shadow-sm px-4 py-3">
                  <TypingDots dark />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============ INPUT ============ */}
        <div className="shrink-0 bg-white border-t border-gray-100 px-3 sm:px-4 py-3">
          <div className="max-w-[720px] mx-auto flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={stopTyping}
                placeholder="Escreve uma mensagem..."
                rows={1}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50
                  text-[14.5px] text-gray-900 placeholder:text-gray-400
                  focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500
                  resize-none max-h-[120px] transition"
                style={{ minHeight: '48px' }}
              />
            </div>

            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="shrink-0 w-12 h-12 rounded-full bg-brand-600 text-white
                flex items-center justify-center
                hover:bg-brand-700 active:scale-95 transition
                disabled:opacity-40 disabled:cursor-not-allowed
                shadow-lg shadow-brand-600/25"
              aria-label="Enviar"
            >
              {sending ? (
                <span className="h-4 w-4 border-2 border-white/40 border-t-white
                  rounded-full animate-spin" />
              ) : (
                <i className="fi fi-sr-paper-plane text-base leading-none ml-0.5" />
              )}
            </button>
          </div>

          <p className="max-w-[720px] mx-auto text-center text-[11px] text-gray-400 mt-2">
            Podes trocar números de WhatsApp a qualquer momento 💬
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[400]
            px-4 py-2.5 rounded-xl shadow-xl text-[13px] font-semibold
            text-white max-w-[90vw]
            ${toast.type === 'error' ? 'bg-red-600' : 'bg-gray-900'}`}
        >
          {toast.msg}
        </div>
      )}
    </>
  );
}

/* ============================================================
   MessageStatus — 🕐 / ✓ / ✓✓ / ✓✓ azul
============================================================ */
function MessageStatus({ sending, delivered, read }) {
  // A enviar (relógio)
  if (sending) {
    return <i className="fi fi-rr-time-past text-[11px] leading-none opacity-70" />;
  }

  // Lida (✓✓ azul — mas como o fundo é rosa, usamos branco brilhante)
  if (read) {
    return <i className="fi fi-sr-check-double text-[11px] leading-none text-white" />;
  }

  // Entregue (✓✓ cinza claro)
  if (delivered) {
    return <i className="fi fi-sr-check-double text-[11px] leading-none opacity-60" />;
  }

  // Enviada (✓)
  return <i className="fi fi-sr-check text-[11px] leading-none opacity-60" />;
}

/* ============================================================
   TypingDots — 3 pontinhos animados
============================================================ */
function TypingDots({ dark = false }) {
  const color = dark ? 'bg-gray-500' : 'bg-brand-500';
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className={`w-1.5 h-1.5 rounded-full ${color} typing-dot`} />
      <span className={`w-1.5 h-1.5 rounded-full ${color} typing-dot`} />
      <span className={`w-1.5 h-1.5 rounded-full ${color} typing-dot`} />
    </span>
  );
}