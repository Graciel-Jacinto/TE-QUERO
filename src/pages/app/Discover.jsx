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

const SOFT_EMOJIS = ['💖', '✨', '💕', '🌸', '💗'];
const SOFT_COLORS = ['#fb7191', '#fda4b4', '#fecdd6', '#f43f6f'];

/* Planos disponíveis no pop-up de pagamento */
const PAYMENT_PLANS = [
  { id: 'p1', label: 'Plano 01', contacts: '3 contactos',  price: 99,  priceLabel: '99 MZN',  tag: null },
  { id: 'p2', label: 'Plano 02', contacts: '10 contactos', price: 299, priceLabel: '299 MZN', tag: 'Popular' },
  { id: 'p3', label: 'Plano 03', contacts: 'Ilimitado',    price: 299, priceLabel: '299 MZN', tag: null },
];

const PAYMENT_METHODS = [
  { id: 'mpesa', name: 'M-Pesa', subtitle: 'Vodacom', color: '#E60000', bg: '#FEE2E2' },
  { id: 'emola', name: 'e-Mola', subtitle: 'Movitel', color: '#EA580C', bg: '#FFEDD5' },
];

function WhatsAppIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function PartyBurst({ active }) {
  const particles = useMemo(() => {
    if (!active) return [];
    const arr = [];
    for (let i = 0; i < 8; i++) {
      const fromLeft = i % 2 === 0;
      arr.push({
        id: i,
        fromLeft,
        emoji: SOFT_EMOJIS[Math.floor(Math.random() * SOFT_EMOJIS.length)],
        color: SOFT_COLORS[Math.floor(Math.random() * SOFT_COLORS.length)],
        topPct: 25 + Math.random() * 50,
        delay: Math.random() * 350,
        duration: 1800 + Math.random() * 600,
        size: 12 + Math.random() * 10,
      });
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

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatPhone(raw) {
  return String(raw || '').replace(/[^\d+]/g, '').slice(0, 15);
}

/* Constrói link do WhatsApp a partir do número guardado em profiles.whatsapp */
function buildWaLink(whatsappNumber, targetName, myName) {
  const digits = String(whatsappNumber || '').replace(/\D/g, '');
  if (!digits) return null;

  const firstName = targetName?.split(' ')[0] || '';
  const myFirstName = myName?.split(' ')[0] || '';
  const message = `Olá ${firstName}! Vi o teu perfil no Te Quero${myFirstName ? `. Sou o ${myFirstName}` : ''}. Podemos falar?`;

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export default function Discover() {
  const navigate = useNavigate();
  const { user, profile: myProfile } = useAuth();

  const [baseProfiles, setBaseProfiles] = useState([]);
  const [displayProfiles, setDisplayProfiles] = useState([]);
  const [likedIds, setLikedIds] = useState(new Set());
  const [profileLikes, setProfileLikes] = useState({});
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [contacting, setContacting] = useState(false);
  const [liking, setLiking] = useState(false);
  const [toast, setToast] = useState(null);

  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [partyActive, setPartyActive] = useState(false);
  const [alreadyContacted, setAlreadyContacted] = useState(false);

  /* ---------- Pop-ups de plano / pagamento ---------- */
  const [showPlanGate, setShowPlanGate] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('p2');
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [paymentPhone, setPaymentPhone] = useState('');

  const [paymentStatus, setPaymentStatus] = useState('form');
  const [paymentError, setPaymentError] = useState('');
  const pollRef = useRef(null);

  const feedRef = useRef(null);
  const lastTapRef = useRef(0);
  const appendingRef = useRef(false);

  const iHaveSelo = myProfile?.is_verified === true;
  const currentPlanObj = PAYMENT_PLANS.find((p) => p.id === selectedPlan) || PAYMENT_PLANS[1];

  /* ---------- Carregar dados (com whatsapp) ---------- */
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [profRes, balRes, likesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, name, slug, birth_date, city, bio, avatar_url, gender, interests, is_verified, whatsapp')
          .eq('onboarding_completed', true)
          .eq('is_banned', false)
          .neq('id', user.id)
          .limit(50),
        supabase.from('contact_balances').select('balance').eq('user_id', user.id).maybeSingle(),
        supabase.rpc('my_liked_ids'),
      ]);

      const source = profRes.data || [];
      setBaseProfiles(source);
      setDisplayProfiles([...shuffle(source), ...shuffle(source), ...shuffle(source)]);
      setBalance(balRes.data?.balance ?? 0);
      if (Array.isArray(likesRes.data)) setLikedIds(new Set(likesRes.data));
      setLoading(false);
    })();
  }, [user]);

  /* ---------- Scroll infinito ---------- */
  useEffect(() => {
    if (baseProfiles.length === 0) return;
    if (displayProfiles.length === 0) return;
    const nearEnd = currentIdx >= displayProfiles.length - 5;
    if (!nearEnd) return;
    if (appendingRef.current) return;
    appendingRef.current = true;
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

  /* ---------- Já contactou? ---------- */
  useEffect(() => {
    const target = displayProfiles[currentIdx];
    if (!target || !user) return;
    (async () => {
      const { data } = await supabase
        .from('contact_history')
        .select('id')
        .eq('user_id', user.id)
        .eq('target_user_id', target.id)
        .maybeSingle();
      setAlreadyContacted(!!data);
    })();
  }, [currentIdx, displayProfiles, user]);

  /* ---------- Limpar polling ao fechar ---------- */
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

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

  /* ---------- Toggle like ---------- */
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
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current === now) {
          navigate(profilePath(profile, user.id));
        }
      }, 280);
    }
  };

  const openPlanGate = () => {
    setShowPlanGate(true);
    if (navigator.vibrate) navigator.vibrate(6);
  };

  const goToPayment = () => {
    const defaultPhone = myProfile?.whatsapp || myProfile?.phone || '';
    setPaymentPhone(defaultPhone);
    setSelectedPlan('p2');
    setPaymentMethod('mpesa');
    setPaymentStatus('form');
    setPaymentError('');
    setShowPlanGate(false);
    setShowPayment(true);
  };

  /* ============================================================
     CONTACTAR — usa profiles.whatsapp
  ============================================================ */
  const requestContact = () => {
    const target = displayProfiles[currentIdx];
    if (!target || contacting) return;
    if (target.id === user.id) return showToast('Este perfil é teu.', 'error');

    /* 1) Verificar se o utilizador tem WhatsApp */
    if (!target.whatsapp || !String(target.whatsapp).trim()) {
      return showToast('Este utilizador não adicionou WhatsApp.', 'error');
    }

    /* 2) Já contactou antes → abre WhatsApp direto (não gasta contacto) */
    if (alreadyContacted) {
      return openWhatsAppFromHistory(target);
    }

    /* 3) Não tem contactos → pop-up de compra */
    if (balance <= 0) {
      return openPlanGate();
    }

    /* 4) Tem contactos → confirma e envia */
    setShowConfirm(true);
  };

  const openWhatsAppFromHistory = (target) => {
    const link = buildWaLink(target.whatsapp, target.name, myProfile?.name);
    if (!link) return showToast('Este utilizador não adicionou WhatsApp.', 'error');
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const executeContact = async () => {
    const target = displayProfiles[currentIdx];
    if (!target) return;

    /* Verificação defensiva */
    if (!target.whatsapp || !String(target.whatsapp).trim()) {
      setShowConfirm(false);
      return showToast('Este utilizador não adicionou WhatsApp.', 'error');
    }

    setShowConfirm(false);
    setContacting(true);

    /* Regista o contacto na BD (consome 1 contacto) */
    const { data, error } = await supabase.rpc('consume_contact', {
      target_user_id: target.id,
    });
    setContacting(false);

    if (error) return showToast(error.message, 'error');

    if (!data?.success) {
      const msgs = {
        no_balance: 'Sem contactos. Ativa um plano.',
        blocked: 'Não é possível contactar.',
        target_banned: 'Perfil indisponível.',
        target_no_whatsapp: 'Este utilizador não adicionou WhatsApp.',
        sender_not_verified: 'Precisas de ativar um plano para contactar.',
      };
      return showToast(msgs[data?.error] || 'Erro ao contactar.', 'error');
    }

    if (!data.already_contacted) {
      setBalance((b) => Math.max(0, b - 1));
      setAlreadyContacted(true);
      if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
      showToast('Contacto utilizado.', 'success');
    }

    /* Abre WhatsApp com o número da tabela profiles */
    const link = buildWaLink(target.whatsapp, target.name, myProfile?.name);
    if (!link) return showToast('Este utilizador não adicionou WhatsApp.', 'error');

    setTimeout(() => window.open(link, '_blank', 'noopener,noreferrer'), 200);
  };

  /* ===================================================== */
  /* ============ PAGAMENTO M-PESA / E-MOLA =============== */
  /* ===================================================== */
  const startPayment = async () => {
    const clean = formatPhone(paymentPhone);
    if (!clean || clean.length < 9) {
      setPaymentError('Insere um número válido.');
      return;
    }

    setPaymentError('');
    setPaymentStatus('processing');

    try {
      await supabase
        .from('profiles')
        .update({ whatsapp: clean })
        .eq('id', user.id);

      const { data, error } = await supabase.functions.invoke('initiate-plan-payment', {
        body: {
          plan_id: selectedPlan,
          plan_price: currentPlanObj.price,
          method: paymentMethod,
          phone: clean,
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Não foi possível iniciar o pagamento.');
      }

      setPaymentStatus('waiting');

      const reference = data.reference;
      let attempts = 0;

      pollRef.current = setInterval(async () => {
        attempts++;
        const { data: statusData } = await supabase
          .from('plan_payments')
          .select('status')
          .eq('reference', reference)
          .maybeSingle();

        if (statusData?.status === 'paid') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPaymentStatus('success');
          if (navigator.vibrate) navigator.vibrate([12, 40, 12]);

          setBalance((b) => b + (selectedPlan === 'p1' ? 3 : selectedPlan === 'p2' ? 10 : 999));
          setTimeout(() => {
            setShowPayment(false);
            setPaymentStatus('form');
          }, 2600);
        } else if (statusData?.status === 'failed') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPaymentStatus('error');
          setPaymentError('O pagamento não foi concluído. Tenta novamente.');
        } else if (attempts > 30) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPaymentStatus('error');
          setPaymentError('Tempo excedido. Verifica o teu saldo e tenta novamente.');
        }
      }, 4000);
    } catch (err) {
      setPaymentStatus('error');
      setPaymentError(err.message || 'Erro ao processar pagamento.');
    }
  };

  const cancelPayment = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setShowPayment(false);
    setPaymentStatus('form');
    setPaymentError('');
  };

  /* ---------- Report / Block / Share ---------- */
  const handleReport = async (reason) => {
    const target = displayProfiles[currentIdx];
    if (!target) return;
    const { data } = await supabase.rpc('report_user', {
      target_user_id: target.id,
      reason_text: reason,
    });
    setShowReportSheet(false);
    setShowActionsSheet(false);
    showToast(data?.success ? 'Denúncia enviada. Obrigado.' : 'Erro ao enviar.',
      data?.success ? 'success' : 'error');
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
          <h2 className="font-display text-xl font-extrabold text-gray-900">Ainda não há perfis</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Volta mais tarde. Estamos a adicionar novas pessoas todos os dias.
          </p>
        </div>
      </div>
    );
  }

  const current = displayProfiles[currentIdx];
  const isMe = current?.id === user.id;
  const currentHasWa = !!(current?.whatsapp && String(current.whatsapp).trim());

  return (
    <>
      <PartyBurst active={partyActive} />

      <div className="absolute inset-0 flex flex-col bg-gray-100 overflow-hidden">
        {/* Saldo */}
        <button
          onClick={() => navigate('/app/contactos')}
          className="absolute top-3 right-3 z-30 flex items-center gap-1.5
            px-3 py-1.5 rounded-full bg-black/50 backdrop-blur
            border border-white/15 hover:bg-black/70 transition">
          <i className="fi fi-sr-ticket text-brand-300 text-sm leading-none" />
          <span className="text-[12.5px] font-bold text-white tabular-nums">{balance}</span>
        </button>

        {/* Setas desktop */}
        <div className="hidden md:flex flex-col items-center gap-3
          absolute right-6 top-1/2 -translate-y-1/2 z-30">
          <button onClick={() => scrollByCards(-1)}
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
          <button onClick={() => scrollByCards(1)}
            className="w-12 h-12 rounded-full bg-white shadow-xl border border-gray-100
              flex items-center justify-center text-gray-700
              hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all"
            aria-label="Próximo perfil">
            <i className="fi fi-rr-angle-small-down text-2xl leading-none" />
          </button>
          <p className="mt-1 text-[10px] font-bold text-gray-500 tracking-widest uppercase">Desliza</p>
        </div>

        {/* Feed */}
        <div ref={feedRef} onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-scroll snap-y snap-mandatory discover-feed">
          <style>{`
            .discover-feed { scroll-behavior: smooth; scrollbar-width: none; -ms-overflow-style: none; }
            .discover-feed::-webkit-scrollbar { display: none; }
            @keyframes partyFromLeft {
              0% { transform: translateX(0) translateY(0) scale(0.4); opacity: 0; }
              25% { opacity: 0.9; }
              100% { transform: translateX(38vw) translateY(-20px) scale(0.9); opacity: 0; }
            }
            @keyframes partyFromRight {
              0% { transform: translateX(0) translateY(0) scale(0.4); opacity: 0; }
              25% { opacity: 0.9; }
              100% { transform: translateX(-38vw) translateY(-20px) scale(0.9); opacity: 0; }
            }
            .party-particle { position: fixed; pointer-events: none; z-index: 100; will-change: transform, opacity; }
          `}</style>

          {displayProfiles.map((p, i) => {
            const a = calcAge(p.birth_date);
            const mine = p.id === user.id;
            const pLiked = likedIds.has(p.id);
            const totalLikes = profileLikes[p.id] || 0;
            const isActive = i === currentIdx;
            const targetVerified = p.is_verified === true;
            const targetHasWa = !!(p.whatsapp && String(p.whatsapp).trim());

            return (
              <div key={`${p.id}-${i}`}
                className="snap-start snap-always w-full h-full flex items-center justify-center py-2">
                <div onClick={() => handleCardTap(p, mine)}
                  className={`relative w-full h-full md:max-w-[400px] md:h-[calc(100%-8px)]
                    overflow-hidden bg-gray-900
                    md:rounded-3xl md:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.4)]
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

                  {mine && (
                    <div className="absolute top-14 left-4 z-10">
                      <span className="inline-flex items-center gap-1.5
                        text-[10px] font-bold uppercase tracking-wider
                        bg-brand-600 text-white px-2.5 py-1 rounded-full">
                        <i className="fi fi-sr-user text-[10px] leading-none" />
                        És tu
                      </span>
                    </div>
                  )}

                  {totalLikes > 0 && (
                    <div className="absolute top-14 right-4 z-10">
                      <span className="inline-flex items-center gap-1
                        text-[10px] font-bold uppercase tracking-wider
                        bg-white/20 backdrop-blur text-white
                        px-2.5 py-1 rounded-full border border-white/20">
                        <i className="fi fi-sr-heart text-[10px] leading-none text-rose-300" />
                        {totalLikes}
                      </span>
                    </div>
                  )}

                  <div className="absolute right-3 bottom-32 z-10 flex flex-col items-center gap-4">
                    {!mine && (
                      <>
                        <div className="flex flex-col items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleLike(p.id); }}
                            className={`w-12 h-12 rounded-full backdrop-blur border
                              flex items-center justify-center active:scale-90 transition-all duration-200
                              ${pLiked
                                ? 'bg-brand-600 border-brand-500 shadow-lg shadow-brand-600/40'
                                : 'bg-white/15 border-white/20 hover:bg-white/25'}`}
                            aria-label={pLiked ? 'Remover gosto' : 'Gostar'}>
                            <i className={`fi ${pLiked ? 'fi-sr-heart' : 'fi-rr-heart'}
                              text-white text-xl leading-none
                              ${pLiked ? 'scale-110' : ''} transition-transform`} />
                          </button>
                          <span className="text-[11px] font-bold text-white/90 drop-shadow-md">
                            {pLiked ? 'Gostaste' : 'Gostar'}
                          </span>
                        </div>

                        <div className="flex flex-col items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (i === currentIdx) {
                                requestContact();
                              } else {
                                const el = feedRef.current;
                                if (el) el.scrollTo({ top: i * el.clientHeight, behavior: 'smooth' });
                              }
                            }}
                            className={`relative w-12 h-12 rounded-full backdrop-blur border
                              flex items-center justify-center active:scale-90 transition-all duration-200
                              ${targetHasWa
                                ? 'bg-[#25D366] border-[#25D366]/50 shadow-lg shadow-green-500/40 hover:bg-[#1eb356]'
                                : 'bg-gray-500/60 border-gray-400/40 cursor-not-allowed'}`}
                            aria-label={targetHasWa ? 'Enviar mensagem' : 'Sem WhatsApp'}>
                            <WhatsAppIcon className={`w-6 h-6 ${targetHasWa ? 'text-white' : 'text-white/70'}`} />
                            {!targetHasWa && (
                              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full
                                bg-red-500 border-2 border-white flex items-center justify-center">
                                <i className="fi fi-sr-cross text-white text-[9px] leading-none" />
                              </span>
                            )}
                          </button>
                          <span className="text-[11px] font-bold text-white/90 drop-shadow-md">
                            {targetHasWa ? 'Mensagem' : 'Sem WhatsApp'}
                          </span>
                        </div>

                        <button
                          onClick={(e) => { e.stopPropagation(); setShowActionsSheet(true); }}
                          className="w-12 h-12 rounded-full bg-white/15 backdrop-blur border border-white/20
                            flex items-center justify-center hover:bg-white/25 active:scale-90 transition"
                          aria-label="Mais opções">
                          <i className="fi fi-sr-menu-dots-vertical text-white text-base leading-none" />
                        </button>
                      </>
                    )}
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
                      <p className="mt-3 text-[13.5px] text-white/85 leading-relaxed line-clamp-3">{p.bio}</p>
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
                    <p className="mt-3 text-[10.5px] text-white/50">
                      Toca para ver perfil • Duplo toque para gostar
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* POP-UP 1: SEM CONTACTOS */}
      {showPlanGate && (
        <div className="fixed inset-0 z-[180] flex items-end sm:items-center justify-center">
          <div onClick={() => setShowPlanGate(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl
            p-6 pb-8 sm:p-8 animate-[slideUpConfirm_280ms_cubic-bezier(0.22,1,0.36,1)]">
            <div className="sm:hidden w-12 h-1.5 rounded-full bg-gray-300 mx-auto mb-5" />

            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-3xl bg-green-50 flex items-center justify-center relative">
                <i className="fi fi-sr-ticket text-green-600 text-3xl leading-none" />
                <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white
                  border-2 border-green-100 flex items-center justify-center">
                  <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                </span>
              </div>
            </div>

            <h3 className="font-display text-[22px] font-extrabold text-gray-900 text-center leading-tight">
              Sem contactos
            </h3>

            <p className="mt-3 text-[14.5px] text-gray-600 text-center leading-relaxed">
              Os teus contactos acabaram. Adquire mais para continuares a enviar mensagens e falar
              com <strong className="text-gray-900">{current?.name?.split(' ')[0]}</strong>.
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <button onClick={goToPayment}
                className="w-full py-4 rounded-2xl bg-green-600 text-white font-bold text-[15px]
                  hover:bg-green-700 active:scale-[0.98] transition shadow-lg shadow-green-500/30
                  flex items-center justify-center gap-2">
                <i className="fi fi-sr-credit-card text-base leading-none" />
                Comprar contactos
              </button>
              <button onClick={() => setShowPlanGate(false)}
                className="w-full py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-[14px]
                  hover:bg-gray-200 transition">
                Agora não
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP 2: PAGAMENTO */}
      {showPayment && (
        <div className="fixed inset-0 z-[185] flex items-end sm:items-center justify-center">
          <div onClick={() => paymentStatus === 'form' && cancelPayment()}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl
            max-h-[92vh] overflow-y-auto animate-[slideUpConfirm_280ms_cubic-bezier(0.22,1,0.36,1)]">

            {paymentStatus === 'form' && (
              <>
                <div className="sticky top-0 z-10 bg-white px-6 pt-6 pb-4 border-b border-gray-100
                  flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="sm:hidden w-12 h-1.5 rounded-full bg-gray-300 mb-4" />
                    <h3 className="font-display text-[20px] font-extrabold text-gray-900 leading-tight">
                      Escolhe o teu plano
                    </h3>
                    <p className="mt-1 text-[12.5px] text-gray-500">
                      Pagamento via M-Pesa ou e-Mola. Ativação imediata.
                    </p>
                  </div>
                  <button onClick={cancelPayment}
                    className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200
                      flex items-center justify-center text-gray-600 active:scale-95 transition shrink-0">
                    <i className="fi fi-rr-cross text-sm leading-none" />
                  </button>
                </div>

                <div className="px-6 pb-8 pt-5">
                  <div className="space-y-2.5">
                    {PAYMENT_PLANS.map((plan) => {
                      const active = selectedPlan === plan.id;
                      return (
                        <button key={plan.id} type="button" onClick={() => setSelectedPlan(plan.id)}
                          className={`relative w-full text-left rounded-2xl border-2 p-4
                            transition-all active:scale-[0.99]
                            ${active
                              ? 'border-green-500 bg-green-50/60 shadow-md shadow-green-500/10'
                              : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                          {plan.tag && (
                            <span className="absolute -top-2 right-4 text-[10px] font-bold uppercase tracking-wider
                              bg-green-600 text-white px-2 py-0.5 rounded-full shadow">
                              {plan.tag}
                            </span>
                          )}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                                ${active ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                                {active && <i className="fi fi-sr-check text-white text-[10px] leading-none" />}
                              </span>
                              <div className="min-w-0">
                                <p className="font-display text-[15.5px] font-extrabold text-gray-900 leading-tight">
                                  {plan.label}
                                </p>
                                <p className="text-[12.5px] text-gray-500 mt-0.5">{plan.contacts}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-display text-[19px] font-extrabold text-gray-900 leading-none">
                                {plan.priceLabel}
                              </p>
                              <p className="text-[10.5px] text-gray-500 mt-1">/mês</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6">
                    <p className="text-[13px] font-semibold text-gray-700 mb-2">Método de pagamento</p>
                    <div className="grid grid-cols-2 gap-2">
                      {PAYMENT_METHODS.map((m) => {
                        const active = paymentMethod === m.id;
                        return (
                          <button key={m.id} type="button" onClick={() => setPaymentMethod(m.id)}
                            className={`relative rounded-2xl border-2 p-3 flex items-center gap-2.5
                              transition-all active:scale-[0.98]
                              ${active
                                ? 'border-green-500 bg-green-50/60 shadow-md shadow-green-500/10'
                                : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                              style={{ backgroundColor: m.bg }}>
                              <span className="font-display font-extrabold text-[11px]"
                                style={{ color: m.color }}>
                                {m.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()}
                              </span>
                            </div>
                            <div className="text-left min-w-0">
                              <p className="text-[13.5px] font-bold text-gray-900 leading-tight truncate">
                                {m.name}
                              </p>
                              <p className="text-[10.5px] text-gray-500 truncate">{m.subtitle}</p>
                            </div>
                            {active && (
                              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full
                                bg-green-500 border-2 border-white flex items-center justify-center">
                                <i className="fi fi-sr-check text-white text-[9px] leading-none" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="block mt-6">
                    <span className="text-[13px] font-semibold text-gray-700">
                      Número {PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.name}
                    </span>
                    <div className="mt-2 flex items-center gap-2 px-3 py-3 rounded-2xl
                      bg-gray-50 border border-gray-200
                      focus-within:border-green-500 focus-within:bg-white transition">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.bg }}>
                        <i className="fi fi-sr-mobile text-sm leading-none"
                          style={{ color: PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.color }} />
                      </div>
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="+258 84 000 0000"
                        value={paymentPhone}
                        onChange={(e) => setPaymentPhone(formatPhone(e.target.value))}
                        className="flex-1 bg-transparent outline-none text-[15px] font-semibold text-gray-900
                          placeholder:text-gray-400 placeholder:font-normal"
                      />
                    </div>
                    <p className="mt-1.5 text-[11.5px] text-gray-500">
                      Vais receber um pedido de confirmação no teu telemóvel.
                    </p>
                  </label>

                  {paymentError && (
                    <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl
                      bg-red-50 border border-red-200">
                      <i className="fi fi-sr-info text-red-600 text-sm leading-none mt-0.5" />
                      <span className="text-[12.5px] font-medium text-red-700">{paymentError}</span>
                    </div>
                  )}

                  <div className="mt-6 flex flex-col gap-2">
                    <button onClick={startPayment}
                      className="w-full py-4 rounded-2xl bg-green-600 text-white font-bold text-[15px]
                        hover:bg-green-700 active:scale-[0.98] transition shadow-lg shadow-green-500/30
                        flex items-center justify-center gap-2">
                      <i className="fi fi-sr-lock text-base leading-none" />
                      Pagar {currentPlanObj.priceLabel}
                    </button>
                    <button onClick={cancelPayment}
                      className="w-full py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-[14px]
                        hover:bg-gray-200 transition">
                      Cancelar
                    </button>
                    <p className="mt-1 text-center text-[11px] text-gray-400 leading-relaxed">
                      Pagamento seguro • Ativação imediata após confirmação
                    </p>
                  </div>
                </div>
              </>
            )}

            {paymentStatus === 'processing' && (
              <div className="px-6 py-12 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-5">
                  <span className="w-9 h-9 border-[3px] border-green-200 border-t-green-600 rounded-full animate-spin" />
                </div>
                <h3 className="font-display text-[19px] font-extrabold text-gray-900">
                  A iniciar pagamento…
                </h3>
                <p className="mt-2 text-[13.5px] text-gray-500 leading-relaxed max-w-[280px]">
                  Estamos a ligar ao {PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.name}. Aguarda um instante.
                </p>
              </div>
            )}

            {paymentStatus === 'waiting' && (
              <div className="px-6 py-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mb-5 relative">
                  <i className="fi fi-sr-mobile text-amber-600 text-3xl leading-none" />
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500
                    border-2 border-white flex items-center justify-center animate-pulse">
                    <i className="fi fi-sr-bell text-white text-[10px] leading-none" />
                  </span>
                </div>
                <h3 className="font-display text-[19px] font-extrabold text-gray-900">
                  Confirma no teu telemóvel
                </h3>
                <p className="mt-2 text-[13.5px] text-gray-600 leading-relaxed max-w-[300px]">
                  Enviámos um pedido de pagamento de{' '}
                  <strong className="text-gray-900">{currentPlanObj.priceLabel}</strong> para{' '}
                  <strong className="text-gray-900">{formatPhone(paymentPhone)}</strong> via{' '}
                  <strong className="text-gray-900">
                    {PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.name}
                  </strong>.
                </p>

                <div className="mt-5 w-full max-w-[320px] rounded-2xl bg-gray-50 border border-gray-100 p-4 text-left">
                  <p className="text-[12px] font-bold uppercase tracking-wider text-gray-500 mb-2">Passos</p>
                  <ol className="space-y-2 text-[13px] text-gray-700">
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-green-600 text-white text-[10px] font-bold
                        flex items-center justify-center shrink-0 mt-0.5">1</span>
                      Abre a notificação / SMS no teu telemóvel
                    </li>
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-green-600 text-white text-[10px] font-bold
                        flex items-center justify-center shrink-0 mt-0.5">2</span>
                      Introduz o teu PIN
                    </li>
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-green-600 text-white text-[10px] font-bold
                        flex items-center justify-center shrink-0 mt-0.5">3</span>
                      Aguarda a confirmação (até 2 min)
                    </li>
                  </ol>
                </div>

                <div className="mt-5 flex items-center gap-2 text-[12px] text-gray-500">
                  <span className="w-3 h-3 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin" />
                  A aguardar confirmação…
                </div>

                <button onClick={cancelPayment}
                  className="mt-6 text-[13px] font-semibold text-gray-500 hover:text-gray-700 underline">
                  Cancelar pagamento
                </button>
              </div>
            )}

            {paymentStatus === 'success' && (
              <div className="px-6 py-12 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5
                  animate-[popSuccess_400ms_cubic-bezier(0.22,1,0.36,1)]">
                  <i className="fi fi-sr-check-circle text-green-600 text-4xl leading-none" />
                </div>
                <h3 className="font-display text-[21px] font-extrabold text-gray-900">
                  Pagamento confirmado!
                </h3>
                <p className="mt-2 text-[13.5px] text-gray-600 leading-relaxed max-w-[280px]">
                  O teu plano <strong className="text-gray-900">{currentPlanObj.label}</strong> está ativo.
                  Já podes enviar mensagens via WhatsApp.
                </p>
                <style>{`
                  @keyframes popSuccess {
                    0% { transform: scale(0.5); opacity: 0; }
                    60% { transform: scale(1.08); opacity: 1; }
                    100% { transform: scale(1); }
                  }
                `}</style>
              </div>
            )}

            {paymentStatus === 'error' && (
              <div className="px-6 py-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-5">
                  <i className="fi fi-sr-cross-circle text-red-600 text-4xl leading-none" />
                </div>
                <h3 className="font-display text-[19px] font-extrabold text-gray-900">
                  Pagamento não concluído
                </h3>
                <p className="mt-2 text-[13.5px] text-gray-600 leading-relaxed max-w-[300px]">
                  {paymentError || 'Algo correu mal. Tenta novamente.'}
                </p>

                <div className="mt-6 w-full flex flex-col gap-2">
                  <button onClick={() => { setPaymentStatus('form'); setPaymentError(''); }}
                    className="w-full py-3.5 rounded-2xl bg-green-600 text-white font-bold text-[14.5px]
                      hover:bg-green-700 active:scale-[0.98] transition shadow-lg shadow-green-500/25">
                    Tentar novamente
                  </button>
                  <button onClick={cancelPayment}
                    className="w-full py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-[14px]
                      hover:bg-gray-200 transition">
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO */}
      {showConfirm && current && !isMe && (
        <div className="fixed inset-0 z-[170] flex items-end sm:items-center justify-center">
          <div onClick={() => setShowConfirm(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 pb-8 sm:p-8
            animate-[slideUpConfirm_250ms_cubic-bezier(0.22,1,0.36,1)]">
            <style>{`
              @keyframes slideUpConfirm { from { transform: translateY(100%); } to { transform: translateY(0); } }
              @media (min-width: 640px) {
                @keyframes slideUpConfirm { from { transform: translateY(20px) scale(0.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
              }
            `}</style>
            <div className="sm:hidden w-12 h-1.5 rounded-full bg-gray-300 mx-auto mb-5" />
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-[#25D366]/10 flex items-center justify-center">
                <WhatsAppIcon className="w-8 h-8 text-[#25D366]" />
              </div>
            </div>
            <h3 className="font-display text-[20px] font-extrabold text-gray-900 text-center">Enviar mensagem?</h3>
            <p className="mt-2 text-[14px] text-gray-600 text-center leading-relaxed">
              Vais usar <strong className="text-gray-900">1 contacto</strong> para falar com{' '}
              <strong className="text-gray-900">{current.name?.split(' ')[0]}</strong> no WhatsApp.
            </p>
            <div className="mt-5 flex items-center justify-between px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100">
              <span className="text-[13.5px] font-semibold text-gray-700">Saldo actual</span>
              <div className="flex items-center gap-2">
                <span className="font-display text-[18px] font-extrabold text-gray-900 tabular-nums">{balance}</span>
                <i className="fi fi-rr-arrow-small-right text-gray-400 text-base leading-none" />
                <span className="font-display text-[18px] font-extrabold text-[#25D366] tabular-nums">{balance - 1}</span>
              </div>
            </div>
            {balance === 1 && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
                <i className="fi fi-rr-exclamation text-amber-600 text-sm leading-none" />
                <span className="text-[12px] font-medium text-amber-800">Este é o teu último contacto</span>
              </div>
            )}
            <div className="mt-6 flex gap-2">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-[14.5px]
                  hover:bg-gray-200 transition">
                Cancelar
              </button>
              <button onClick={executeContact}
                className="flex-1 py-3.5 rounded-xl bg-[#25D366] text-white font-bold text-[14.5px]
                  hover:bg-[#1eb356] active:scale-[0.98] transition shadow-lg shadow-green-500/25
                  flex items-center justify-center gap-2">
                <WhatsAppIcon className="w-4 h-4 text-white" />
                Enviar
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
              className="w-full py-3 mt-4 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-[14px]
                hover:bg-gray-200 transition">
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
            <h3 className="font-display text-xl font-extrabold text-gray-900">Por que motivo?</h3>
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
              className="w-full py-3 mt-4 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-[14px]
                hover:bg-gray-200 transition">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[200]
          px-4 py-2.5 rounded-xl shadow-xl text-[13px] font-semibold text-white max-w-[90vw]
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