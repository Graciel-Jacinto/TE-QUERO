import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function UserProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState('photos');
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [videoLightboxIdx, setVideoLightboxIdx] = useState(null);

  const [balance, setBalance] = useState(0);
  const [alreadyHasConv, setAlreadyHasConv] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const isMe = profile?.id === user?.id;

  /* ---------- Carregar perfil ---------- */
  useEffect(() => {
    if (!slug || !user) return;

    (async () => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

      const baseQuery = supabase
        .from('profiles')
        .select('id, name, slug, birth_date, city, bio, avatar_url, gender, interests, photos, videos, plan, onboarding_completed, is_banned');

      const { data: profData, error: profError } = isUuid
        ? await baseQuery.eq('id', slug).maybeSingle()
        : await baseQuery.eq('slug', slug).maybeSingle();

      if (profError || !profData) {
        console.error('[UserProfile] erro:', profError);
        setLoading(false);
        return;
      }

      setProfile(profData);

      if (profData.id !== user.id) {
        const [likeRes, balRes, convRes] = await Promise.all([
          supabase.from('likes').select('id').eq('user_id', user.id).eq('target_user_id', profData.id).maybeSingle(),
          supabase.from('contact_balances').select('balance').eq('user_id', user.id).maybeSingle(),
          supabase.from('conversations').select('id').or(
            `and(user_a.eq.${user.id},user_b.eq.${profData.id}),and(user_a.eq.${profData.id},user_b.eq.${user.id})`
          ).maybeSingle(),
        ]);
        setLiked(!!likeRes.data);
        setBalance(balRes.data?.balance ?? 0);
        setConversationId(convRes.data?.id || null);
        setAlreadyHasConv(!!convRes.data);
      }

      setLoading(false);
    })();
  }, [slug, user]);

  useEffect(() => {
    const open = lightboxIdx !== null || videoLightboxIdx !== null || showConfirm;
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [lightboxIdx, videoLightboxIdx, showConfirm]);

  /* ---------- Teclado ---------- */
  const photos = Array.isArray(profile?.photos) ? profile.photos : [];
  const videos = Array.isArray(profile?.videos) ? profile.videos : [];

  useEffect(() => {
    const open = lightboxIdx !== null || videoLightboxIdx !== null;
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { setLightboxIdx(null); setVideoLightboxIdx(null); }
      if (lightboxIdx !== null) {
        if (e.key === 'ArrowRight') setLightboxIdx((i) => Math.min(i + 1, photos.length - 1));
        if (e.key === 'ArrowLeft') setLightboxIdx((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIdx, videoLightboxIdx, photos.length]);

  /* ---------- Like no perfil ---------- */
  const handleLike = async () => {
    if (isMe) return;
    const { data, error } = await supabase.rpc('toggle_like', { p_target: profile.id });
    if (error) return showToast(error.message, 'error');
    if (data?.success) {
      setLiked(data.liked);
      if (navigator.vibrate) navigator.vibrate(8);
    }
  };

  /* ---------- Iniciar conversa ---------- */
  const requestStartChat = () => {
    if (isMe || starting) return;
    if (alreadyHasConv && conversationId) return navigate(`/app/chat/${conversationId}`);
    if (balance <= 0) {
      showToast('Sem contactos. Compra mais para continuar.', 'error');
      setTimeout(() => navigate('/app/planos'), 1200);
      return;
    }
    setShowConfirm(true);
  };

  const executeStartChat = async () => {
    setShowConfirm(false);
    setStarting(true);
    const { data, error } = await supabase.rpc('start_conversation', { target_user_id: profile.id });
    setStarting(false);
    if (error) return showToast(error.message, 'error');
    if (!data?.success) {
      const msgs = {
        no_balance: 'Sem contactos. Compra mais para continuar.',
        blocked: 'Não é possível contactar.',
        target_banned: 'Perfil indisponível.',
      };
      return showToast(msgs[data?.error] || 'Erro ao contactar.', 'error');
    }
    if (!data.already_existed) {
      setBalance((b) => Math.max(0, b - 1));
      setAlreadyHasConv(true);
      if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
      showToast('Conversa iniciada.', 'success');
    }
    setTimeout(() => navigate(`/app/chat/${data.conversation_id}`), 400);
  };

  /* ---------- Partilhar ---------- */
  const handleShare = async () => {
    const shareData = {
      title: 'Te Quero',
      text: `Vê o perfil de ${profile?.name?.split(' ')[0]} no Te Quero`,
      url: window.location.href,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(window.location.href);
        showToast('Link copiado.', 'success');
      }
    } catch (err) {}
  };

  /* ---------- Like numa foto ---------- */
  const handlePhotoLike = async (photoUrl) => {
    const { data, error } = await supabase.rpc('toggle_photo_like', {
      p_target: profile.id,
      p_photo_url: photoUrl,
    });
    if (error) return null;
    return data?.success ? data.liked : null;
  };

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const calcAge = (dob) => {
    if (!dob) return null;
    const b = new Date(dob);
    const d = new Date();
    let a = d.getFullYear() - b.getFullYear();
    const m = d.getMonth() - b.getMonth();
    if (m === 0 && d.getDate() < b.getDate()) a--;
    else if (m < 0) a--;
    return a;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="h-8 w-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-200 flex items-center justify-center mx-auto mb-4">
          <i className="fi fi-rr-user text-gray-500 text-2xl leading-none" />
        </div>
        <h2 className="font-display text-xl font-extrabold text-gray-900">Perfil não encontrado</h2>
        <button onClick={() => navigate(-1)}
          className="mt-4 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold">
          Voltar
        </button>
      </div>
    );
  }

  const age = calcAge(profile.birth_date);
  const hasPhotos = photos.length > 0;
  const hasVideos = videos.length > 0;
  const activeTab = (tab === 'photos' && hasPhotos) || !hasVideos ? 'photos' : 'videos';
  const noBalance = balance <= 0 && !alreadyHasConv;

  return (
    <>
      <div className="h-full flex flex-col bg-gray-50 overflow-hidden">

        <div className="shrink-0 bg-white/90 backdrop-blur-md border-b border-gray-100 z-10">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 h-[56px] flex items-center justify-between">
            <button onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 transition">
              <i className="fi fi-rr-angle-small-left text-xl leading-none" />
            </button>
            <span className="font-display font-extrabold text-[15px] text-gray-900">
              {profile.name?.split(' ')[0]}
            </span>
            {!isMe ? (
              <button onClick={() => navigate('/app/planos')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-100 hover:bg-brand-100 transition">
                <i className="fi fi-sr-ticket text-brand-600 text-[13px] leading-none" />
                <span className="text-[13px] font-bold text-brand-700 tabular-nums">{balance}</span>
              </button>
            ) : <div className="w-10" />}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto profile-scroll">
          <style>{`.profile-scroll::-webkit-scrollbar { width: 0; } .profile-scroll { scrollbar-width: none; }`}</style>

          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

            {/* CABEÇALHO */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-6">
              <div className="shrink-0 mx-auto sm:mx-0">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden
                  bg-brand-100 border-4 border-white shadow-lg">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <i className="fi fi-sr-user text-brand-600 text-5xl leading-none" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <h2 className="font-display text-[24px] sm:text-[26px] font-extrabold text-gray-900 leading-tight">
                    {profile.name}{age ? `, ${age}` : ''}
                  </h2>
                  {isMe && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider
                      bg-brand-600 text-white px-2 py-0.5 rounded-full">
                      <i className="fi fi-sr-user text-[10px] leading-none" />
                      És tu
                    </span>
                  )}
                  {alreadyHasConv && !isMe && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider
                      bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      <i className="fi fi-sr-check text-[10px] leading-none" />
                      Já tens conversa
                    </span>
                  )}
                </div>

                {profile.city && (
                  <p className="mt-1.5 text-[13.5px] text-gray-500 flex items-center justify-center sm:justify-start gap-1.5">
                    <i className="fi fi-sr-marker leading-none" />
                    {profile.city}
                  </p>
                )}

                {profile.bio && (
                  <p className="mt-3 text-[14px] text-gray-700 leading-relaxed max-w-2xl mx-auto sm:mx-0">
                    {profile.bio}
                  </p>
                )}

                {Array.isArray(profile.interests) && profile.interests.length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-1.5">
                    {profile.interests.map((t) => (
                      <span key={t} className="text-[12px] font-medium text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* BOTÕES */}
            <div className="mt-6 flex flex-wrap items-center gap-2 sm:gap-3 justify-center sm:justify-start">
              {!isMe ? (
                <>
                  <button
                    onClick={requestStartChat}
                    disabled={starting}
                    className={`flex-1 sm:flex-none min-w-[220px] px-5 py-3 rounded-xl
                      font-bold text-[14.5px]
                      hover:scale-[1.02] active:scale-[0.98] transition-all
                      disabled:opacity-60 disabled:cursor-not-allowed
                      flex items-center justify-center gap-2.5 shadow-lg
                      ${alreadyHasConv
                        ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-600/25'
                        : noBalance
                          ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-gray-900/30'
                          : 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-600/30'}`}
                  >
                    {starting ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        A abrir...
                      </>
                    ) : alreadyHasConv ? (
                      <>
                        <i className="fi fi-sr-comment text-lg leading-none" />
                        Abrir conversa
                      </>
                    ) : noBalance ? (
                      <>
                        <i className="fi fi-rr-credit-card text-lg leading-none" />
                        Sem contactos
                      </>
                    ) : (
                      <>
                        <i className="fi fi-sr-comment text-lg leading-none" />
                        Iniciar conversa
                        <span className="ml-1 px-2 py-0.5 bg-white/25 rounded-full text-[11px] font-bold">−1</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleLike}
                    className={`px-5 py-3 rounded-xl border-2 font-semibold text-[14.5px]
                      flex items-center justify-center gap-2 transition
                      ${liked
                        ? 'bg-brand-600 border-brand-600 text-white'
                        : 'border-gray-200 text-gray-700 hover:border-brand-300 hover:text-brand-600'}`}
                  >
                    <i className={`fi ${liked ? 'fi-sr-heart' : 'fi-rr-heart'} text-lg leading-none`} />
                    <span className="hidden sm:inline">{liked ? 'Gostaste' : 'Gostar'}</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate('/app/perfil')}
                  className="px-5 py-3 rounded-xl bg-gray-900 text-white font-bold text-[14.5px]
                    hover:bg-gray-800 active:scale-[0.98] transition shadow-lg shadow-gray-900/25
                    flex items-center justify-center gap-2"
                >
                  <i className="fi fi-rr-pencil text-base leading-none" />
                  Editar o meu perfil
                </button>
              )}
            </div>

            {/* AVISOS */}
            {!isMe && !alreadyHasConv && (
              <>
                {noBalance && (
                  <div className="mt-4 flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                      <i className="fi fi-sr-ticket text-amber-600 text-base leading-none" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-bold text-amber-900">Ficaste sem contactos</p>
                      <p className="text-[12.5px] text-amber-800 mt-0.5 leading-snug">
                        Compra um pacote para continuares a conhecer pessoas.
                      </p>
                    </div>
                    <button onClick={() => navigate('/app/planos')}
                      className="shrink-0 px-3 py-2 rounded-lg bg-amber-600 text-white text-[12.5px] font-bold hover:bg-amber-700 transition">
                      Ver planos
                    </button>
                  </div>
                )}
                {!noBalance && balance === 1 && (
                  <div className="mt-4 flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200">
                    <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                      <i className="fi fi-rr-exclamation text-rose-600 text-base leading-none" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-bold text-rose-900">Último contacto disponível</p>
                      <p className="text-[12.5px] text-rose-800 mt-0.5 leading-snug">
                        Depois deste, precisas de comprar um pacote.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {alreadyHasConv && !isMe && (
              <div className="mt-4 flex items-center gap-2 px-1">
                <i className="fi fi-sr-check-circle text-green-600 text-[13px] leading-none" />
                <p className="text-[12.5px] text-green-700 font-medium">
                  Já tens uma conversa. Podes continuar sem gastar contacto.
                </p>
              </div>
            )}

            {/* TABS */}
            {(hasPhotos || hasVideos) && (
              <div className="mt-8 border-b border-gray-100">
                <div className="flex items-center gap-1">
                  {hasPhotos && (
                    <button onClick={() => setTab('photos')}
                      className={`relative px-4 py-3 text-[13.5px] font-semibold transition
                        ${activeTab === 'photos' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
                      <i className="fi fi-rr-picture text-base leading-none mr-1.5" />
                      Fotos
                      <span className="ml-1 text-[11px] text-gray-400">({photos.length})</span>
                      {activeTab === 'photos' && (
                        <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gray-900 rounded-full" />
                      )}
                    </button>
                  )}
                  {hasVideos && (
                    <button onClick={() => setTab('videos')}
                      className={`relative px-4 py-3 text-[13.5px] font-semibold transition
                        ${activeTab === 'videos' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
                      <i className="fi fi-rr-play text-base leading-none mr-1.5" />
                      Vídeos
                      <span className="ml-1 text-[11px] text-gray-400">({videos.length})</span>
                      {activeTab === 'videos' && (
                        <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gray-900 rounded-full" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* CONTEÚDO */}
            <div className="mt-4">
              {activeTab === 'photos' && hasPhotos && (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                  {photos.map((src, i) => (
                    <PhotoCard
                      key={i}
                      src={src}
                      ownerId={profile.id}
                      isOwner={isMe}
                      onOpen={() => setLightboxIdx(i)}
                      onLike={() => handlePhotoLike(src)}
                    />
                  ))}
                </div>
              )}

              {activeTab === 'videos' && hasVideos && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {videos.map((src, i) => (
                    <VideoCard key={i} src={src} onClick={() => setVideoLightboxIdx(i)} />
                  ))}
                </div>
              )}

              {!hasPhotos && !hasVideos && (
                <div className="py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <i className="fi fi-rr-picture text-gray-400 text-xl leading-none" />
                  </div>
                  <p className="text-sm text-gray-500">Sem fotos nem vídeos publicados</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL CONFIRMAÇÃO */}
      {showConfirm && !isMe && (
        <div className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center">
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
              <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center">
                <i className="fi fi-sr-comment text-brand-600 text-2xl leading-none" />
              </div>
            </div>
            <h3 className="font-display text-[20px] font-extrabold text-gray-900 text-center">Iniciar conversa?</h3>
            <p className="mt-2 text-[14px] text-gray-600 text-center leading-relaxed">
              Vais usar <strong className="text-gray-900">1 contacto</strong> para falar com{' '}
              <strong className="text-gray-900">{profile.name?.split(' ')[0]}</strong>.
            </p>
            <div className="mt-5 flex items-center justify-between px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100">
              <span className="text-[13.5px] font-semibold text-gray-700">Saldo actual</span>
              <div className="flex items-center gap-2">
                <span className="font-display text-[18px] font-extrabold text-gray-900 tabular-nums">{balance}</span>
                <i className="fi fi-rr-arrow-small-right text-gray-400 text-base leading-none" />
                <span className="font-display text-[18px] font-extrabold text-brand-600 tabular-nums">{balance - 1}</span>
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
                className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-[14.5px] hover:bg-gray-200 transition">
                Cancelar
              </button>
              <button onClick={executeStartChat}
                className="flex-1 py-3.5 rounded-xl bg-brand-600 text-white font-bold text-[14.5px]
                  hover:bg-brand-700 active:scale-[0.98] transition shadow-lg shadow-brand-600/25
                  flex items-center justify-center gap-2">
                <i className="fi fi-rr-check text-base leading-none" />
                Começar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX FOTOS */}
      {lightboxIdx !== null && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md flex flex-col animate-[fadeIn_200ms_ease-out]"
          onClick={() => setLightboxIdx(null)}>
          <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
            <div className="text-white text-[14px] font-semibold">{lightboxIdx + 1} / {photos.length}</div>
            <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(null); }}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center hover:bg-white/20 transition">
              <i className="fi fi-rr-cross-small text-white text-xl leading-none" />
            </button>
          </div>
          <div className="flex-1 min-h-0 relative flex items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
            {lightboxIdx > 0 && (
              <button onClick={() => setLightboxIdx(lightboxIdx - 1)}
                className="absolute left-2 sm:left-4 z-10 w-11 h-11 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center hover:bg-white/20 transition">
                <i className="fi fi-rr-angle-small-left text-white text-2xl leading-none" />
              </button>
            )}
            <img src={photos[lightboxIdx]} alt="" className="max-w-full max-h-full object-contain rounded-lg animate-[zoomIn_200ms_ease-out]" draggable="false" />
            {lightboxIdx < photos.length - 1 && (
              <button onClick={() => setLightboxIdx(lightboxIdx + 1)}
                className="absolute right-2 sm:right-4 z-10 w-11 h-11 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center hover:bg-white/20 transition">
                <i className="fi fi-rr-angle-small-right text-white text-2xl leading-none" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* LIGHTBOX VÍDEOS */}
      {videoLightboxIdx !== null && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md flex flex-col animate-[fadeIn_200ms_ease-out]"
          onClick={() => setVideoLightboxIdx(null)}>
          <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
            <div className="text-white text-[14px] font-semibold">{videoLightboxIdx + 1} / {videos.length}</div>
            <button onClick={(e) => { e.stopPropagation(); setVideoLightboxIdx(null); }}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center hover:bg-white/20 transition">
              <i className="fi fi-rr-cross-small text-white text-xl leading-none" />
            </button>
          </div>
          <div className="flex-1 min-h-0 relative flex items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
            <video key={videos[videoLightboxIdx]} src={videos[videoLightboxIdx]} controls autoPlay playsInline
              className="max-w-full max-h-full rounded-lg animate-[zoomIn_200ms_ease-out] bg-black" />
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[400] px-4 py-2.5 rounded-xl shadow-xl
          text-[13px] font-semibold text-white max-w-[90vw]
          ${toast.type === 'error' ? 'bg-red-600' : 'bg-gray-900'}`}>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes heartBurst {
          0%   { transform: scale(0); opacity: 0; }
          40%  { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
    </>
  );
}

/* ============================================================
   PhotoCard — foto com likes + duplo toque
============================================================ */
function PhotoCard({ src, ownerId, isOwner, onOpen, onLike }) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [burst, setBurst] = useState(false);
  const lastTapRef = useRef(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('photo_likes')
        .select('user_id')
        .eq('target_user_id', ownerId)
        .eq('photo_url', src);

      if (Array.isArray(data)) {
        setLikes(data.length);
        setLiked(data.some((r) => r.user_id === user?.id));
      }
    })();
  }, [ownerId, src, user?.id]);

  const triggerLike = async () => {
    if (isOwner) return;
    if (navigator.vibrate) navigator.vibrate(8);

    const result = await onLike();
    if (result === null) return;

    setLiked(result);
    setLikes((c) => (result ? c + 1 : Math.max(0, c - 1)));

    if (result) {
      setBurst(true);
      setTimeout(() => setBurst(false), 700);
    }
  };

  const handleTap = () => {
    if (isOwner) return onOpen();
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      triggerLike();
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current === now) onOpen();
      }, 280);
    }
  };

  return (
    <div onClick={handleTap}
      className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100
        cursor-pointer select-none active:scale-[0.98] transition-transform">
      <img src={src} alt="" className="w-full h-full object-cover pointer-events-none" loading="lazy" draggable="false" />

      {!isOwner ? (
        <button
          onClick={(e) => { e.stopPropagation(); triggerLike(); }}
          className={`absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full
            backdrop-blur-sm transition-all active:scale-90
            ${liked
              ? 'bg-brand-600/95 text-white shadow-lg shadow-brand-600/40'
              : 'bg-black/40 text-white hover:bg-black/60'}`}
          aria-label="Gostei">
          <i className={`fi ${liked ? 'fi-sr-heart' : 'fi-rr-heart'} text-[12px] leading-none`} />
          {likes > 0 && <span className="text-[10.5px] font-bold tabular-nums">{likes}</span>}
        </button>
      ) : (
        likes > 0 && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full
            bg-black/40 backdrop-blur-sm text-white">
            <i className="fi fi-sr-heart text-[12px] leading-none" />
            <span className="text-[10.5px] font-bold tabular-nums">{likes}</span>
          </div>
        )
      )}

      {burst && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <i className="fi fi-sr-heart text-white text-[80px] leading-none
            animate-[heartBurst_700ms_cubic-bezier(0.22,1,0.36,1)_forwards]
            drop-shadow-[0_0_20px_rgba(225,29,87,0.9)]" />
        </div>
      )}

      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors
        flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
        <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur border border-white/30
          flex items-center justify-center">
          <i className="fi fi-rr-expand text-white text-sm leading-none" />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   VideoCard
============================================================ */
function VideoCard({ src, onClick }) {
  return (
    <button onClick={onClick}
      className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-black hover:opacity-95 active:scale-[0.98] transition-all">
      <video src={`${src}#t=0.5`} muted playsInline preload="metadata"
        className="w-full h-full object-cover pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/40
          flex items-center justify-center group-hover:scale-110 transition-all shadow-lg">
          <i className="fi fi-sr-play text-white text-xl leading-none ml-1" />
        </div>
      </div>
    </button>
  );
}