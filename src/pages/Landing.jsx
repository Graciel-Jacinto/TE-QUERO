import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navLinks = [
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Segurança',     href: '#seguranca' },
  { label: 'Preços',        href: '#precos' },
  { label: 'Ajuda',         href: '#ajuda' },
];

const languages = [
  { code: 'PT', label: 'Português', flag: '🇲🇿', short: 'Português (MZ)' },
  { code: 'EN', label: 'English',   flag: '🇬🇧', short: 'English' },
  { code: 'FR', label: 'Français',  flag: '🇫🇷', short: 'Français' },
  { code: 'ES', label: 'Español',   flag: '🇪🇸', short: 'Español' },
];

export default function Landing() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const [langOpen, setLangOpen] = useState(false);
  const [lang, setLang] = useState(languages[0]);
  const langRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (!profile?.rules_accepted_at) return navigate('/onboarding/bem-vindo');
    if (!profile?.onboarding_completed) return navigate('/onboarding/perfil');
    navigate('/app/descobrir');
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="h-8 w-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ======================= HEADER ======================= */}
      <header
        className={`sticky top-0 z-[100] transition-all duration-300 ${
          scrolled
            ? 'bg-white/80 backdrop-blur-xl border-b border-gray-200/70 shadow-[0_2px_20px_-8px_rgba(225,29,87,0.15)]'
            : 'bg-white border-b border-gray-100'
        }`}
      >
        <div className="max-w-[1300px] mx-auto flex items-center justify-between gap-2
          px-3 sm:px-6 h-[60px] sm:h-[68px] lg:h-[72px]">

          {/* ---------- LOGO ---------- */}
          <Link to="/" className="flex items-center gap-2 shrink-0 group">
            <div className="relative">
              <div className="absolute inset-0 bg-brand-500 rounded-xl blur-md opacity-0 group-hover:opacity-60 transition-opacity" />
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm shadow-brand-600/30 group-hover:scale-105 transition-transform">
                <i className="fi fi-sr-heart text-white text-base sm:text-lg leading-none" />
              </div>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display font-extrabold text-[16px] sm:text-[18px] lg:text-[20px] tracking-tight text-gray-900">
                Te Quero<span className="text-brand-600">.</span>
              </span>
              <span className="hidden lg:block text-[10px] font-medium text-gray-400 tracking-[0.15em] uppercase mt-0.5">
                Encontros
              </span>
            </div>
          </Link>

          {/* ---------- NAV CENTRAL (desktop) ---------- */}
          <nav className="hidden lg:flex items-center gap-0.5 bg-gray-50/80 border border-gray-100 rounded-full px-1.5 py-1.5">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="relative px-4 py-1.5 rounded-full text-[13.5px] font-medium text-gray-600
                  hover:text-brand-700 hover:bg-white hover:shadow-sm transition-all duration-200"
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* ---------- AÇÕES ---------- */}
          <div className="flex items-center gap-1 sm:gap-1.5">

            {/* Language (desktop only) */}
            <div className="hidden md:block relative" ref={langRef}>
              <button
                onClick={() => setLangOpen((v) => !v)}
                className="flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-lg
                  text-[13px] font-medium text-gray-700
                  hover:bg-gray-100 transition"
                aria-label="Idioma"
              >
                <span className="text-base leading-none">{lang.flag}</span>
                <span className="hidden lg:inline">{lang.code}</span>
                <i className={`fi fi-rr-angle-small-down text-sm leading-none opacity-60
                  transition-transform ${langOpen ? 'rotate-180' : ''}`} />
              </button>

              {langOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl
                  shadow-xl border border-gray-100 p-1.5 z-[110]
                  animate-[fadeIn_150ms_ease-out]">
                  <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Idioma / Language
                  </p>
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => { setLang(l); setLangOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                        transition ${lang.code === l.code
                          ? 'bg-brand-50 text-brand-700'
                          : 'hover:bg-gray-50 text-gray-700'}`}
                    >
                      <span className="text-lg leading-none">{l.flag}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold leading-tight">{l.label}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{l.code}</p>
                      </div>
                      {lang.code === l.code && (
                        <i className="fi fi-sr-check text-brand-600 text-base leading-none" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="hidden md:block w-px h-6 bg-gray-200 mx-1" />

            {/* Entrar — SEMPRE visível (todas as larguras) */}
            <Link
              to="/login"
              className="inline-flex items-center px-2.5 sm:px-3 lg:px-4 py-2 rounded-lg
                text-[13px] sm:text-[13.5px] font-semibold text-gray-700
                hover:text-brand-700 hover:bg-brand-50 transition whitespace-nowrap"
            >
              Entrar
            </Link>

            {/* Criar conta — esconde o texto em ecrãs muito pequenos */}
            <Link
              to="/registar"
              className="group relative inline-flex items-center gap-1
                px-3 sm:px-4 py-2 rounded-lg
                bg-gray-900 text-white text-[13px] sm:text-[13.5px] font-semibold
                hover:bg-brand-600 transition-all duration-200
                shadow-sm hover:shadow-md hover:shadow-brand-600/25 whitespace-nowrap"
            >
              <span className="hidden xs:inline">Criar conta</span>
              <span className="xs:hidden">Criar</span>
              <i className="fi fi-rr-arrow-small-right text-base leading-none
                transition-transform group-hover:translate-x-0.5" />
            </Link>

            {/* Hamburger (mobile/tablet) */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center
                text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition shrink-0"
              aria-label="Abrir menu"
            >
              <i className={`fi ${menuOpen ? 'fi-rr-cross-small' : 'fi-rr-menu-burger'} text-xl leading-none`} />
            </button>
          </div>
        </div>

        {/* ============ MENU MOBILE ============ */}
        <div
          className={`lg:hidden fixed inset-x-0 top-[60px] sm:top-[68px] bottom-0 bg-white z-[99]
            transition-all duration-300 ease-out overflow-y-auto
            ${menuOpen ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none -translate-y-2'}`}
        >
          <nav className="px-4 py-4 flex flex-col gap-1">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between py-3.5 px-4 rounded-2xl
                  text-[15px] font-medium text-gray-800
                  hover:text-brand-700 hover:bg-brand-50 active:bg-brand-100 transition"
              >
                {l.label}
                <i className="fi fi-rr-angle-small-right text-base leading-none opacity-40" />
              </a>
            ))}

            <div className="h-px bg-gray-100 my-3" />

            <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
              Idioma
            </p>
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => { setLang(l); setMenuOpen(false); }}
                className={`flex items-center gap-3 py-3 px-4 rounded-2xl text-left
                  transition ${lang.code === l.code
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <span className="text-lg leading-none">{l.flag}</span>
                <span className="text-sm font-medium flex-1">{l.short}</span>
                {lang.code === l.code && (
                  <i className="fi fi-sr-check text-brand-600 text-base leading-none" />
                )}
              </button>
            ))}

            <div className="h-px bg-gray-100 my-3" />

            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl
                text-[15px] font-semibold text-brand-700 bg-brand-50
                active:bg-brand-100 transition"
            >
              <i className="fi fi-rr-sign-in-alt text-base leading-none" />
              Entrar na minha conta
            </Link>

            <Link
              to="/registar"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl
                text-[15px] font-semibold text-white bg-brand-600
                active:bg-brand-700 transition mt-1"
            >
              Criar conta grátis
              <i className="fi fi-rr-arrow-small-right text-base leading-none" />
            </Link>
          </nav>
        </div>
      </header>

      {/* ======================= HERO ======================= */}
      <main className="flex-1 max-w-[1300px] w-full mx-auto px-4 sm:px-6
        flex items-center py-12 md:py-16 lg:py-20">
        <section className="grid md:grid-cols-2 gap-12 md:gap-16 lg:gap-24 items-center w-full">

          <div className="order-2 md:order-1 text-center md:text-left
            md:-translate-y-4 lg:-translate-y-8">

            <div className="inline-flex items-center gap-2 bg-white text-brand-700
              text-[11px] sm:text-xs font-semibold px-3.5 py-2 rounded-full
              border border-brand-200 shadow-sm shadow-brand-600/5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-600" />
              </span>
              +2 400 pessoas activas hoje
            </div>

            <h1 className="mt-5 font-display text-[36px] sm:text-5xl md:text-5xl lg:text-[60px]
              font-extrabold tracking-[-0.035em] text-gray-900 leading-[1.05]">
              Alguém está{' '}
              <span className="relative inline-block">
                à espera
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3 text-brand-300"
                  viewBox="0 0 300 12"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2 9C60 3 120 3 180 6C220 8 260 9 298 4"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <br />
              de te conhecer.{' '}
              <span className="text-brand-600">Fala directo no WhatsApp.</span>
            </h1>

            <p className="mt-6 text-[15px] sm:text-base lg:text-[17px] text-gray-600
              max-w-lg mx-auto md:mx-0 leading-relaxed">
              Cria o teu perfil em menos de um minuto, descobre pessoas
              reais perto de ti e inicia uma conversa com um clique.
            </p>

            <div className="mt-6 flex items-center justify-center md:justify-start gap-3">
              <div className="flex -space-x-3">
                {[
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80&auto=format&fit=crop',
                  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&q=80&auto=format&fit=crop',
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&q=80&auto=format&fit=crop',
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80&auto=format&fit=crop',
                ].map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className="w-8 h-8 rounded-full border-2 border-white object-cover"
                  />
                ))}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1 text-brand-600">
                  {[...Array(5)].map((_, i) => (
                    <i key={i} className="fi fi-sr-star text-xs leading-none" />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  <strong className="text-gray-800">4.9</strong> · 870 avaliações
                </p>
              </div>
            </div>

            <div className="mt-7 flex flex-col sm:flex-row gap-3
              justify-center md:justify-start">
              <Link
                to="/registar"
                className="inline-flex items-center justify-center gap-2
                  px-6 py-3.5 rounded-xl bg-brand-600 text-white font-semibold
                  hover:bg-brand-700 active:scale-[0.98] transition
                  shadow-lg shadow-brand-600/25"
              >
                Começar agora
                <i className="fi fi-rr-arrow-small-right text-lg leading-none" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2
                  px-6 py-3.5 rounded-xl border-2 border-gray-200 bg-white
                  text-gray-800 font-semibold hover:border-brand-300 hover:text-brand-700
                  active:bg-gray-50 transition"
              >
                <i className="fi fi-rr-play-circle text-lg leading-none" />
                Ver como funciona
              </Link>
            </div>
          </div>

          <div className="order-1 md:order-2 relative flex justify-center
            md:translate-y-4 lg:translate-y-8">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[260px] sm:w-[300px] md:w-[360px]
                h-[340px] sm:h-[380px] md:h-[440px]
                bg-gradient-to-br from-brand-200/70 via-brand-300/40 to-brand-100/20
                blur-3xl rounded-full" />
            </div>

            <div className="relative w-full max-w-[300px] sm:max-w-[320px] md:max-w-[360px]
              bg-white rounded-3xl
              shadow-[0_25px_60px_-15px_rgba(225,29,87,0.4)]
              border border-gray-100 overflow-hidden">

              <div className="relative h-[280px] sm:h-[300px] md:h-[330px] overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80&auto=format&fit=crop"
                  alt="Perfil"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/95 backdrop-blur flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition">
                  <i className="fi fi-sr-heart text-brand-600 text-lg leading-none" />
                </button>

                <div className="absolute top-4 left-4">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase
                    tracking-wider bg-brand-600 text-white px-2.5 py-1 rounded-full">
                    <i className="fi fi-sr-bolt leading-none" />
                    Novo
                  </span>
                </div>

                <div className="absolute bottom-0 inset-x-0 p-5 text-white">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-green-500 text-white px-2 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      Online agora
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-white/25 backdrop-blur text-white px-2 py-1 rounded-full">
                      <i className="fi fi-sr-shield-check leading-none" />
                      Verificada
                    </span>
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl font-extrabold leading-tight">
                    Ana, 24
                  </h3>
                  <p className="text-xs text-white/90 flex items-center gap-1 mt-1">
                    <i className="fi fi-sr-marker leading-none" />
                    Maputo, Moçambique
                  </p>
                </div>
              </div>

              <div className="p-5">
                <p className="text-[13.5px] text-gray-700 leading-relaxed">
                  Gosto de música, viagens e conhecer pessoas novas.
                </p>

                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {['Música', 'Viagens', 'Café'].map((t) => (
                    <span
                      key={t}
                      className="text-[11px] font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <button className="mt-5 w-full py-3 rounded-xl bg-[#25D366] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#1eb356] active:scale-[0.98] transition shadow-lg shadow-green-500/25">
                  <i className="fi fi-brands-whatsapp text-lg leading-none" />
                  Contactar no WhatsApp
                </button>
              </div>
            </div>

            <div className="hidden lg:flex absolute -top-3 -right-2 items-center gap-2
              bg-white rounded-2xl shadow-xl border border-gray-100 pl-3 pr-4 py-2.5
              animate-[float_3s_ease-in-out_infinite]">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                <i className="fi fi-brands-whatsapp text-green-600 text-lg leading-none" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-900 leading-tight">
                  Conversa iniciada
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  há 2 minutos
                </p>
              </div>
            </div>

            <div className="hidden lg:flex absolute -bottom-4 -left-4 items-center gap-2
              bg-white rounded-2xl shadow-xl border border-gray-100 pl-3 pr-4 py-2.5
              animate-[float_3.5s_ease-in-out_infinite_0.5s]">
              <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center">
                <i className="fi fi-sr-heart text-brand-600 text-base leading-none" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-900 leading-tight">
                  3 contactos grátis
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  ao criar conta
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ======================= FOOTER ======================= */}
      <footer className="border-t border-gray-100 mt-auto bg-white">
        <div className="max-w-[1300px] mx-auto px-4 sm:px-6 py-6
          flex flex-col sm:flex-row items-center justify-between gap-3">

          <div className="flex items-center gap-2">
            <span className="font-display font-extrabold text-base tracking-tight text-gray-900">
              Te Quero<span className="text-brand-600">.</span>
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-500">2026</span>
          </div>

          <p className="text-xs text-gray-500 text-center sm:text-right">
            Desenvolvido pela{' '}
            <a
              href="https://codetudo.co.mz"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gray-800 hover:text-brand-600 transition"
            >
              codetudo.co.mz
            </a>
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}