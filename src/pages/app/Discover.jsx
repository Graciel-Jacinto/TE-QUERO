import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { profilePath, profileUrl } from '../../lib/profilePath';

const REPORT_REASONS = [
  { value: 'fake',      label: 'Perfil falso ou enganoso' },
  { value: 'offensive', label: 'Conteúdo ofensivo' },
  { value: 'spam',      label: 'Spam ou publicidade' },
  { value: 'minor',     label: 'Pessoa menor de idade' },
  { value: 'other',     label: 'Outro motivo' },
];

/* ============================================================
   Festa suave — partículas lentas e discretas
============================================================ */
const SOFT_EMOJIS = ['💖', '✨', '💕', '🌸', '💗'];
const SOFT_COLORS = ['#fb7191', '#fda4b4', '#fecdd6', '#f43f6f'];

function PartyBurst({ active }) {
  const particles = useMemo(() => {
    if (!active) return [];
    const arr = [];
    const count = 8;
    for (let i = 0; i < count; i++) {
      const fromLeft = i % 2 === 0;
      const emoji = SOFT_EMOJIS[Math.floor(Math.random() * SOFT_EMOJIS.length)];
      const color = SOFT_COLORS[Math.floor(Math.random() * SOFT_COLORS.length)];
      const topPct = 25 + Math.random() * 50;
      const delay = Math.random() * 350;
      const duration = 1800 + Math.random() * 600;
      const size = 12 + Math.random() * 10;
      arr.push({ id: i, fromLeft, emoji, color, topPct, delay, duration, size });
    }
    return arr;
  }, [active]);

  if (!active) return null;

  return (
    <>
      {particles.map((p) => (
        <span
          key={p.id}
          className="party-particle"
          style={{
            top: `${p.topPct}%`,
            [p.fromLeft ? 'left' : 'right']: '-30px',
            fontSize: `${p.size}px`,
            animation: `${p.fromLeft ? 'partyFromLeft' : 'partyFromRight'} ${p.duration}ms cubic-bezier(0.4, 0, 0.2, 1) ${p.delay}ms forwards`,
            filter: `drop-shadow(0 0 4px ${p.color})`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </>
  );
}

/* ============================================================
   Shuffle — Fisher-Yates
============================================================ */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Discover() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [baseProfiles, setBaseProfiles] = useState([]);      // fonte original
  const [displayProfiles, setDisplayProfiles] = useState([]); // cresce infinitamente
  const [likedIds, setLikedIds] = useState(new Set());
  const [profileLikes, setProfileLikes] = useState({});
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [starting, setStarting] = useState(false);
  const [liking, setLiking] = useState(false);
  const [toast, setToast] = useState(null);

  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [partyActive, setPartyActive] = useState(false);

  const [showCTA, setShowCTA] = useState(false);

  const feedRef = useRef(null);
  const lastTapRef = useRef(0);
  const ctaTimerRef = useRef(null);
  const appendingRef = useRef(false);

  /* ---------- Carregar dados ---------- */
  useEffect(() => {
    if (!user) return;

    (async () => {
      const [profRes, balRes, likesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, name, slug, birth_date, city, bio, avatar_url, gender, interests')
          .eq('onboarding_completed', true)
          .limit(50),
        supabase
          .from('contact_balances')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase.rpc('my_liked_ids'),
      ]);

      const source = profRes.data || [];
      setBaseProfiles(source);

      // Batelada inicial: 3x embaralhado para ter margem
      const initial = [...shuffle(source), ...shuffle(source), ...shuffle(source)];
      setDisplayProfiles(initial);

      setBalance(balRes.data?.balance ?? 0);
      if (Array.isArray(likesRes.data)) setLikedIds(new Set(likesRes.data));
      setLoading(false);
    })();
  }, [user]);

  /* ---------- ♾️ Scroll infinito: acrescenta quando perto do fim ---------- */
  useEffect(() => {
    if (baseProfiles.length === 0) return;
    if (displayProfiles.length === 0) return;

    // Está a menos de 5 perfis do fim?
    const nearEnd = currentIdx >= displayProfiles.length - 5;
    if (!nearEnd) return;

    // Evitar duplicação de chamadas
    if (appendingRef.current) return;
    appendingRef.current = true;

    // Acrescenta 2x embaralhado (fonte sempre nova)
    setTimeout(() => {
      setDisplayProfiles((prev) => [...prev, ...shuffle(baseProfiles), ...shuffle(baseProfiles)]);
      appendingRef.current = false;
    }, 100);
  }, [currentIdx, displayProfiles.length, baseProfiles]);

  /* ---------- Carregar likes ---------- */
  useEffect(() => {
    if (!user || baseProfiles.length === 0) return;

    (async () => {
      const ids = baseProfiles.map((p) => p.id);
      const { data } = await supabase
        .from('photo_likes')
        .select('target_user_id')
        .in('target_user_id', ids);

      if (Array.isArray(data)) {
        const counts = {};
        data.forEach((row) => {
          counts[row.target_user_id] = (counts[row.target_user_id] || 0) + 1;
        });
        setProfileLikes(counts);
      }
    })();
  }, [user, baseProfiles]);

  /* ---------- Esconder CTA ao mudar de perfil ---------- */
  useEffect(() => {
    setShowCTA(false);
    if (ctaTimerRef.current) clearTimeout(ctaTimerRef.current);
  }, [currentIdx]);

  const revealCTA = () => {
    setShowCTA(true);
    if (ctaTimerRef.current) clearTimeout(ctaTimerRef.current);
    ctaTimerRef.current = setTimeout(() => setShowCTA(false), 4000);
  };

  /* ---------- Scroll — calcula índice actual ---------- */
  const handleScroll = (e) => {
    const el = e.currentTarget;
    const h = el.clientHeight;
    if (h === 0) return;
    const idx = Math.round(el.scrollTop / h);
    if (idx !== currentIdx) setCurrentIdx(idx);
  };

  /* ---------- Scroll por atalho (setas) ---------- */
  const scrollByCards = (dir) => {
    const el = feedRef.current;
    if (!el) return;
    const h = el.clientHeight;
    const next = currentIdx + dir;
    el.scrollTo({ top: next * h, behavior: 'smooth' });
  };

  /* ---------- Toggle like no perfil ---------- */
  const toggleLike = async (targetId) => {
    if (liking) return;
    if (targetId === user.id) return;

    const wasLiked = likedIds.has(targetId);

    setLiking(true);
    const { data } = await supabase.rpc('toggle_like', { p_target: targetId });
    setLiking(false);

    if (!data?.success) return;

    setLikedIds((prev) => {
      const next = new Set(prev);
      if (data.liked) next.add(targetId);
      else next.delete(targetId);
      return next;
    });

    if (data.liked && !wasLiked) {
      setPartyActive(true);
      if (navigator.vibrate) navigator.vibrate(8);
      setTimeout(() => setPartyActive(false), 2200);
    }
  };

  /* ---------- Toque no card ---------- */
  const handleCardTap = (profile, mine) => {
    const now = Date.now();

    if (now - lastTapRef.current < 300) {
      if (!mine) toggleLike(profile.id);
      lastTapRef.current = 0;
      setShowCTA(false);
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current === now) {
          navigate(profilePath(profile, user.id));
        }
      }, 280);
    }
  };

  /* ---------- Iniciar conversa ---------- */
  const requestStartChat = () => {
    const target = displayProfiles[currentIdx];
    if (!target || starting) return;
    if (target.id === user.id) return showToast('Este perfil é teu.', 'error');

    if (balance <= 0) {
      showToast('Sem contactos. Compra mais para continuar.', 'error');
      setTimeout(() => navigate('/app/planos'), 1200);
      return;
    }

    setShowConfirm(true);
  };

  const executeStartChat = async () => {
    const target = displayProfiles[currentIdx];
    if (!target) return;

    setShowConfirm(false);
    setStarting(true);

    const { data, error } = await supabase.rpc('start_conversation', {
      target_user_id: target.id,
    });
    setStarting(false);

    if (error) return showToast(error.message, 'error');

    if (!data?.success) {
      const msgs = {
        no_balance: 'Sem contactos. Compra mais para continuar.',
        blocked: 'Não é possível contactar.',
        target_banned: 'Perfil indisponível.',
        cannot_contact_self: 'Não podes contactar-te.',
      };
      return showToast(msgs[data?.error] || 'Erro ao contactar.', 'error');
    }

    if (!data.already_existed) {
      setBalance((b) => Math.max(0, b - 1));
      if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
      showToast('Conversa iniciada.', 'success');
    } else {
      showToast('A abrir conversa...', 'success');
    }

    setShowCTA(false);
    setTimeout(() => {
      navigate(`/app/chat/${data.conversation_id}`);
    }, 400);
  };

  const handleReport = async (reason) => {
    const target = displayProfiles[currentIdx];
    if (!target) return;
    const { data } = await supabase.rpc('report_user', {
      target_user_id: target.id,
      reason_text: reason,
    });
    setShowReportSheet(false);
    setShowActionsSheet(false);
    showToast(
      data?.success ? 'Denúncia enviada. Obrigado.' : 'Erro ao enviar.',
      data?.success ? 'success' : 'error'
    );
  };

  const handleBlock = async () => {
    const target = displayProfiles[currentIdx];
    if (!target) return;
    const { data } = await supabase.rpc('block_user', { target_user_id: target.id });
    setShowActionsSheet(false);
    if (data?.success) {
      showToast('Utilizador bloqueado.', 'success');
      setBaseProfiles((prev) => prev.filter((p) => p.id !== target.id));
      setDisplayProfiles((prev) => prev.filter((p) => p.id !== target.id));
    }
  };

  const handleShare = async () => {
    const target = displayProfiles[currentIdx];
    if (!target) return;

    const shareData = {
      title: 'Te Quero',
      text: `Vê o perfil de ${target.name?.split(' ')[0]} no Te Quero`,
      url: profileUrl(target, user.id),
    };

    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(shareData.url);
        showToast('Link copiado.', 'success');
      }
    } catch (err) {}
    setShowActionsSheet(false);
  };

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const calcAge = (dob) => {
    if (!dob) return null;
    const b = new Date(dob);
    const d = new Date();
    let a = d.getFullYear() - b.getFullYear();
    const m = d.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && d.getDate() < b.getDate())) a--;
    return a;
  };

  if (loading) {
    return (
      <div className="absolute inset-0 flex flex-col bg-gray-100 overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-2">
          <div className="w-full h-full max-w-[400px] rounded-3xl bg-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (baseProfiles.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center px-6 text-center bg-gray-100">
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

  const current = displayProfiles[currentIdx];
  const isMe = current?.id === user.id;
  const noBalance = balance <= 0;

  return (
    <>
      <PartyBurst active={partyActive} />

      <div className="absolute inset-0 flex flex-col bg-gray-100 overflow-hidden">

        {/* Saldo (topo direito) */}
        <button
          onClick={() => navigate('/app/contactos')}
          className="absolute top-3 right-3 z-30 flex items-center gap-1.5
            px-3 py-1.5 rounded-full bg-black/50 backdrop-blur
            border border-white/15 hover:bg-black/70 transition"
        >
          <i className="fi fi-sr-ticket text-brand-300 text-sm leading-none" />
          <span className="text-[12.5px] font-bold text-white tabular-nums">
            {balance}
          </span>
        </button>

        {/* ============ SETAS DESKTOP ============ */}
        <div className="hidden md:flex flex-col items-center gap-3
          absolute right-6 top-1/2 -translate-y-1/2 z-30">
          <button
            onClick={() => scrollByCards(-1)}
            className="w-12 h-12 rounded-full bg-white shadow-xl border border-gray-100
              flex items-center justify-center
              text-gray-700 hover:bg-gray-50 hover:scale-105
              active:scale-95 transition-all"
            aria-label="Perfil anterior"
          >
            <i className="fi fi-rr-angle-small-up text-2xl leading-none" />
          </button>

          {/* Indicador decorativo (sem número) */}
          <div className="flex flex-col items-center gap-1.5 py-2">
            <span className="w-1.5 h-5 bg-brand-600 rounded-full" />
            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
          </div>

          <button
            onClick={() => scrollByCards(1)}
            className="w-12 h-12 rounded-full bg-white shadow-xl border border-gray-100
              flex items-center justify-center
              text-gray-700 hover:bg-gray-50 hover:scale-105
              active:scale-95 transition-all"
            aria-label="Próximo perfil"
          >
            <i className="fi fi-rr-angle-small-down text-2xl leading-none" />
          </button>

          {/* Legenda PT-PT */}
          <p className="mt-1 text-[10px] font-bold text-gray-500
            tracking-widest uppercase">
            Desliza
          </p>
        </div>

        {/* Feed */}
        <div
          ref={feedRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-scroll snap-y snap-mandatory discover-feed"
        >
          <style>{`
            .discover-feed {
              scroll-behavior: smooth;
              scrollbar-width: none;
              -ms-overflow-style: none;
            }
            .discover-feed::-webkit-scrollbar { display: none; }

            @keyframes partyFromLeft {
              0%   { transform: translateX(0) translateY(0) scale(0.4); opacity: 0; }
              25%  { opacity: 0.9; }
              100% { transform: translateX(38vw) translateY(-20px) scale(0.9); opacity: 0; }
            }
            @keyframes partyFromRight {
              0%   { transform: translateX(0) translateY(0) scale(0.4); opacity: 0; }
              25%  { opacity: 0.9; }
              100% { transform: translateX(-38vw) translateY(-20px) scale(0.9); opacity: 0; }
            }
            .party-particle {
              position: fixed;
              pointer-events: none;
              z-index: 100;
              will-change: transform, opacity;
            }

            @keyframes newBadgePulse {
              0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.25); }
              50%      { box-shadow: 0 0 0 6px rgba(255,255,255,0); }
            }
            .new-badge {
              animation: newBadgePulse 2s ease-in-out infinite;
            }
          `}</style>

          {displayProfiles.map((p, i) => {
            const a = calcAge(p.birth_date);
            const mine = p.id === user.id;
            const pLiked = likedIds.has(p.id);
            const totalLikes = profileLikes[p.id] || 0;
            const isActive = i === currentIdx;

            return (
              <div
                key={`${p.id}-${i}`}
                className="snap-start snap-always w-full h-full
                  flex items-center justify-center py-2"
              >
                <div
                  onClick={() => handleCardTap(p, mine)}
                  className={`relative w-full h-full
                    md:max-w-[400px] md:h-[calc(100%-8px)]
                    overflow-hidden bg-gray-900
                    md:rounded-3xl md:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.4)]
                    cursor-pointer select-none active:scale-[0.995]
                    transition-all duration-500
                    ${isActive ? 'opacity-100 scale-100' : 'opacity-90 scale-[0.98]'}`}
                >
                  {p.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt={p.name}
                      className="w-full h-full object-cover pointer-events-none"
                      loading="lazy"
                      draggable="false"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br
                      from-brand-400 via-brand-600 to-brand-800
                      flex items-center justify-center">
                      <i className="fi fi-sr-user text-white text-[120px] leading-none opacity-40" />
                    </div>
                  )}

                  <div className="absolute inset-x-0 top-0 h-24
                    bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 h-2/3
                    bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />

                  {/* Badges */}
                  <div className="absolute top-14 left-4 z-10 flex items-center gap-2">
                    {mine ? (
                      <span className="inline-flex items-center gap-1.5
                        text-[10px] font-bold uppercase tracking-wider
                        bg-brand-600 text-white px-2.5 py-1 rounded-full">
                        <i className="fi fi-sr-user text-[10px] leading-none" />
                        És tu
                      </span>
                    ) : (
                      <span className="new-badge inline-flex items-center gap-1.5
                        text-[10px] font-bold uppercase tracking-wider
                        bg-white/20 backdrop-blur text-white
                        px-2.5 py-1 rounded-full border border-white/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        Novo
                      </span>
                    )}

                    {totalLikes > 0 && (
                      <span className="inline-flex items-center gap-1
                        text-[10px] font-bold uppercase tracking-wider
                        bg-white/20 backdrop-blur text-white
                        px-2.5 py-1 rounded-full border border-white/20">
                        <i className="fi fi-sr-heart text-[10px] leading-none text-rose-300" />
                        {totalLikes}
                      </span>
                    )}
                  </div>

                  {/* Acções laterais */}
                  <div className="absolute right-3 bottom-32 z-10
                    flex flex-col items-center gap-4">

                    {!mine && (
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleLike(p.id); }}
                          className={`w-12 h-12 rounded-full backdrop-blur
                            border flex items-center justify-center
                            active:scale-90 transition-all duration-200
                            ${pLiked
                              ? 'bg-brand-600 border-brand-500 shadow-lg shadow-brand-600/40'
                              : 'bg-white/15 border-white/20 hover:bg-white/25'}`}
                          aria-label={pLiked ? 'Remover gosto' : 'Gostar'}
                        >
                          <i className={`fi ${pLiked ? 'fi-sr-heart' : 'fi-rr-heart'}
                            text-white text-xl leading-none
                            ${pLiked ? 'scale-110' : ''} transition-transform`} />
                        </button>
                        <span className="text-[11px] font-bold text-white/90 tabular-nums
                          drop-shadow-md">
                          {pLiked ? 'Gostaste' : 'Gostar'}
                        </span>
                      </div>
                    )}

                    {!mine && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowActionsSheet(true); }}
                        className="w-12 h-12 rounded-full bg-white/15 backdrop-blur
                          border border-white/20 flex items-center justify-center
                          hover:bg-white/25 active:scale-90 transition"
                        aria-label="Mais opções"
                      >
                        <i className="fi fi-sr-menu-dots-vertical text-white text-base leading-none" />
                      </button>
                    )}
                  </div>

                  {/* Info */}
                  <div className="absolute bottom-0 inset-x-0 p-5 text-white
                    pr-20 pointer-events-none">
                    <h2 className="font-display text-[26px] font-extrabold leading-tight">
                      {p.name}{a ? `, ${a}` : ''}
                    </h2>

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
                          <span
                            key={t}
                            className="text-[11px] font-medium
                              bg-white/15 backdrop-blur text-white
                              px-2.5 py-1 rounded-full border border-white/15"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className={`mt-3 text-[10.5px] text-white/50 transition-opacity duration-300
                      ${showCTA ? 'opacity-0' : 'opacity-100'}`}>
                      Toca para ver perfil • Duplo toque para gostar
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Desktop */}
        <div className="hidden md:block shrink-0 px-4 py-3 bg-gray-100">
          {isMe ? (
            <button
              onClick={() => navigate('/app/perfil')}
              className="w-full max-w-[400px] mx-auto py-3.5 rounded-2xl
                bg-gray-900 text-white font-bold text-[15px]
                hover:bg-gray-800 active:scale-[0.99] transition
                shadow-lg shadow-gray-900/25
                flex items-center justify-center gap-2.5"
            >
              <i className="fi fi-rr-pencil text-base leading-none" />
              Editar o meu perfil
            </button>
          ) : (
            <button
              onClick={requestStartChat}
              disabled={starting}
              className={`w-full max-w-[400px] mx-auto py-3.5 rounded-2xl
                text-white font-bold text-[15px]
                hover:scale-[1.01] active:scale-[0.99] transition
                disabled:opacity-60 disabled:cursor-not-allowed
                flex items-center justify-center gap-2.5 shadow-lg
                ${noBalance
                  ? 'bg-gray-900 hover:bg-gray-800 shadow-gray-900/25'
                  : 'bg-brand-600 hover:bg-brand-700 shadow-brand-600/25'}`}
            >
              {starting ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/40 border-t-white
                    rounded-full animate-spin" />
                  A abrir...
                </>
              ) : noBalance ? (
                <>
                  <i className="fi fi-rr-credit-card text-xl leading-none" />
                  Sem contactos
                </>
              ) : (
                <>
                  <i className="fi fi-sr-comment text-xl leading-none" />
                  Iniciar conversa
                  <span className="ml-1 px-2 py-0.5 bg-white/25 rounded-full
                    text-[11px] font-bold">−1</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* CTA Mobile */}
        <div
          className={`md:hidden absolute inset-x-0 bottom-0 z-40 px-4 pb-5
            transition-all duration-500 ease-out
            ${showCTA ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}
        >
          {!isMe ? (
            <>
              <button
                onClick={requestStartChat}
                disabled={starting}
                className={`w-full py-4 rounded-2xl
                  text-white font-bold text-[15px]
                  active:scale-[0.98] transition
                  disabled:opacity-60
                  flex items-center justify-center gap-2.5
                  ${noBalance
                    ? 'bg-gray-900 shadow-[0_10px_40px_-8px_rgba(17,24,39,0.5)]'
                    : 'bg-brand-600 shadow-[0_10px_40px_-8px_rgba(225,29,87,0.5)]'}`}
              >
                {starting ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/40 border-t-white
                      rounded-full animate-spin" />
                    A abrir...
                  </>
                ) : noBalance ? (
                  <>
                    <i className="fi fi-rr-credit-card text-xl leading-none" />
                    Sem contactos
                  </>
                ) : (
                  <>
                    <i className="fi fi-sr-comment text-xl leading-none" />
                    Iniciar conversa
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-gray-500 mt-2">
                {noBalance
                  ? 'Compra um pacote para continuares'
                  : <>Vais usar <strong className="text-gray-700">1 contacto</strong> do teu saldo</>}
              </p>
            </>
          ) : (
            <button
              onClick={() => navigate('/app/perfil')}
              className="w-full py-4 rounded-2xl
                bg-gray-900 text-white font-bold text-[15px]
                active:scale-[0.98] transition
                shadow-[0_10px_40px_-8px_rgba(17,24,39,0.5)]
                flex items-center justify-center gap-2.5"
            >
              <i className="fi fi-rr-pencil text-base leading-none" />
              Editar o meu perfil
            </button>
          )}
        </div>
      </div>

      {/* MODAL CONFIRMAÇÃO */}
      {showConfirm && current && !isMe && (
        <div className="fixed inset-0 z-[170] flex items-end sm:items-center justify-center">
          <div onClick={() => setShowConfirm(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl
            p-6 pb-8 sm:p-8
            animate-[slideUpConfirm_250ms_cubic-bezier(0.22,1,0.36,1)]">
            <style>{`
              @keyframes slideUpConfirm { from { transform: translateY(100%); } to { transform: translateY(0); } }
              @media (min-width: 640px) {
                @keyframes slideUpConfirm { from { transform: translateY(20px) scale(0.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
              }
            `}</style>

            <div className="sm:hidden w-12 h-1.5 rounded-full bg-gray-300 mx-auto mb-5" />

            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center">
                <i className="fi fi-sr-comment text-brand-600 text-2xl leading-none" />
              </div>
            </div>

            <h3 className="font-display text-[20px] font-extrabold text-gray-900 text-center">
              Iniciar conversa?
            </h3>
            <p className="mt-2 text-[14px] text-gray-600 text-center leading-relaxed">
              Vais usar <strong className="text-gray-900">1 contacto</strong> para falar com{' '}
              <strong className="text-gray-900">{current.name?.split(' ')[0]}</strong>.
            </p>

            <div className="mt-5 flex items-center justify-between px-4 py-3 rounded-2xl
              bg-gray-50 border border-gray-100">
              <span className="text-[13.5px] font-semibold text-gray-700">Saldo actual</span>
              <div className="flex items-center gap-2">
                <span className="font-display text-[18px] font-extrabold text-gray-900 tabular-nums">
                  {balance}
                </span>
                <i className="fi fi-rr-arrow-small-right text-gray-400 text-base leading-none" />
                <span className="font-display text-[18px] font-extrabold text-brand-600 tabular-nums">
                  {balance - 1}
                </span>
              </div>
            </div>

            {balance === 1 && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl
                bg-amber-50 border border-amber-200">
                <i className="fi fi-rr-exclamation text-amber-600 text-sm leading-none" />
                <span className="text-[12px] font-medium text-amber-800">
                  Este é o teu último contacto
                </span>
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-700
                  font-semibold text-[14.5px] hover:bg-gray-200 active:bg-gray-300 transition">
                Cancelar
              </button>
              <button onClick={executeStartChat}
                className="flex-1 py-3.5 rounded-xl bg-brand-600 text-white
                  font-bold text-[14.5px]
                  hover:bg-brand-700 active:scale-[0.98] transition
                  shadow-lg shadow-brand-600/25
                  flex items-center justify-center gap-2">
                <i className="fi fi-rr-check text-base leading-none" />
                Começar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM SHEET: ACÇÕES */}
      {showActionsSheet && current && (
        <div onClick={() => setShowActionsSheet(false)}
          className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-end justify-center animate-[fadeIn_150ms_ease-out]">
          <div onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-t-3xl p-4 pb-8 animate-[slideUp_250ms_cubic-bezier(0.22,1,0.36,1)]">
            <div className="w-12 h-1.5 rounded-full bg-gray-300 mx-auto mb-5" />

            <button onClick={handleShare}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-gray-50 transition text-left">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <i className="fi fi-rr-share text-blue-600 text-lg leading-none" />
              </div>
              <div>
                <p className="font-semibold text-[14.5px] text-gray-900">Partilhar perfil</p>
                <p className="text-[12px] text-gray-500">Enviar para alguém</p>
              </div>
            </button>

            <button onClick={() => { setShowActionsSheet(false); setShowReportSheet(true); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-gray-50 transition text-left mt-1">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <i className="fi fi-rr-flag text-amber-600 text-lg leading-none" />
              </div>
              <div>
                <p className="font-semibold text-[14.5px] text-gray-900">Denunciar</p>
                <p className="text-[12px] text-gray-500">Comportamento inadequado</p>
              </div>
            </button>

            <button onClick={handleBlock}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-red-50 transition text-left mt-1">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <i className="fi fi-rr-ban text-red-600 text-lg leading-none" />
              </div>
              <div>
                <p className="font-semibold text-[14.5px] text-red-700">Bloquear</p>
                <p className="text-[12px] text-gray-500">Não volta a aparecer</p>
              </div>
            </button>

            <button onClick={() => setShowActionsSheet(false)}
              className="w-full py-3 mt-4 rounded-2xl bg-gray-100 text-gray-700
                font-semibold text-[14px] hover:bg-gray-200 transition">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM SHEET: REPORTAR */}
      {showReportSheet && current && (
        <div onClick={() => setShowReportSheet(false)}
          className="fixed inset-0 z-[160] bg-black/60 backdrop-blur-sm flex items-end justify-center animate-[fadeIn_150ms_ease-out]">
          <div onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-t-3xl p-6 pb-8 animate-[slideUp_250ms_cubic-bezier(0.22,1,0.36,1)]">
            <div className="w-12 h-1.5 rounded-full bg-gray-300 mx-auto mb-5" />

            <h3 className="font-display text-xl font-extrabold text-gray-900">
              Por que motivo?
            </h3>
            <p className="text-[13px] text-gray-500 mt-1">A tua denúncia é anónima.</p>

            <div className="mt-5 space-y-1">
              {REPORT_REASONS.map((r) => (
                <button key={r.value} onClick={() => handleReport(r.value)}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl
                    hover:bg-gray-50 active:bg-gray-100 transition text-left">
                  <span className="text-[14.5px] text-gray-800">{r.label}</span>
                  <i className="fi fi-rr-angle-small-right text-base leading-none text-gray-400" />
                </button>
              ))}
            </div>

            <button onClick={() => setShowReportSheet(false)}
              className="w-full py-3 mt-4 rounded-2xl bg-gray-100 text-gray-700
                font-semibold text-[14px] hover:bg-gray-200 transition">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[200]
          px-4 py-2.5 rounded-xl shadow-xl text-[13px] font-semibold
          text-white max-w-[90vw]
          ${toast.type === 'error' ? 'bg-red-600' : 'bg-gray-900'}`}>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </>
  );
}