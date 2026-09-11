import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/* ---------------------------------------------------------------
   Login com redireccionamento inteligente por role
   - Admin → /admin
   - Utilizador com onboarding completo → /app/descobrir
   - Utilizador sem onboarding → /onboarding/bem-vindo
---------------------------------------------------------------- */

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || null;

  const { user, profile, roles, isAdmin, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(true);

  /* ---------- Redireccionamento automático se já autenticado ---------- */
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    // Admin? manda para painel
    if (isAdmin) return navigate('/admin', { replace: true });

    // Utilizador normal? vê o estado do onboarding
    if (!profile?.rules_accepted_at) {
      return navigate('/onboarding/bem-vindo', { replace: true });
    }
    if (!profile?.onboarding_completed) {
      return navigate('/onboarding/perfil', { replace: true });
    }

    navigate(from || '/app/descobrir', { replace: true });
  }, [authLoading, user, isAdmin, profile, navigate, from]);

  /* ---------- Login por email + password ---------- */
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      return setError('Preenche o email e a palavra-passe.');
    }
    if (password.length < 6) {
      return setError('A palavra-passe deve ter pelo menos 6 caracteres.');
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('invalid')) {
        return setError('Email ou palavra-passe incorrectos.');
      }
      if (msg.includes('email not confirmed')) {
        return setError('Confirma o teu email antes de entrar.');
      }
      if (msg.includes('too many')) {
        return setError('Demasiadas tentativas. Tenta novamente em alguns minutos.');
      }
      return setError(error.message);
    }

    if (data?.user && !remember) {
      window.addEventListener('beforeunload', () => {
        supabase.auth.signOut();
      }, { once: true });
    }
  };

  /* ---------- Login com Google ---------- */
  const handleGoogle = async () => {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/app/descobrir`,
      },
    });
    if (error) setError(error.message);
  };

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      {/* ============================================================
          COLUNA ESQUERDA — Branding (escondida em mobile)
      ============================================================ */}
      <aside className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 text-white">
        {/* Padrão decorativo */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-32 -right-20 w-[500px] h-[500px] rounded-full bg-brand-300 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-2.5 group w-max">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
              <i className="fi fi-sr-heart text-white text-lg leading-none" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display font-extrabold text-[20px] tracking-tight">
                Te Quero<span className="text-brand-200">.</span>
              </span>
              <span className="text-[10px] font-medium text-white/60 tracking-[0.15em] uppercase mt-0.5">
                Encontros
              </span>
            </div>
          </Link>

          {/* Texto central */}
          <div className="max-w-md">
            <h1 className="font-display text-[44px] xl:text-[52px] font-extrabold tracking-[-0.03em] leading-[1.05]">
              Alguém está
              <br />
              à espera de te
              <br />
              conhecer.
            </h1>
            <p className="mt-6 text-white/80 text-[15px] leading-relaxed">
              Fala directo no WhatsApp. Sem chat interno, sem complicações.
            </p>

            {/* Avatares + avaliações */}
            <div className="mt-8 flex items-center gap-3">
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
                    className="w-9 h-9 rounded-full border-2 border-brand-600 object-cover"
                  />
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 text-brand-200">
                  {[...Array(5)].map((_, i) => (
                    <i key={i} className="fi fi-sr-star text-xs leading-none" />
                  ))}
                </div>
                <p className="text-xs text-white/70 mt-1">
                  <strong className="text-white">4.9</strong> · 870 avaliações
                </p>
              </div>
            </div>
          </div>

          {/* Rodapé — apenas em desktop */}
          <div className="hidden lg:flex items-center justify-between text-xs text-white/60">
            <span>© 2026 Te Quero.</span>
            <a
              href="https://codetudo.co.mz"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition"
            >
              codetudo.co.mz
            </a>
          </div>
        </div>
      </aside>

      {/* ============================================================
          COLUNA DIREITA — Formulário
      ============================================================ */}
      <main className="flex items-center justify-center px-6 sm:px-8 lg:px-12 py-10 sm:py-12 bg-white">
        <div className="w-full max-w-[420px]">

          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm shadow-brand-600/30">
                <i className="fi fi-sr-heart text-white text-lg leading-none" />
              </div>
              <div className="flex flex-col leading-none text-left">
                <span className="font-display font-extrabold text-[20px] tracking-tight text-gray-900">
                  Te Quero<span className="text-brand-600">.</span>
                </span>
                <span className="text-[10px] font-medium text-gray-400 tracking-[0.15em] uppercase mt-0.5">
                  Encontros
                </span>
              </div>
            </Link>
          </div>

          {/* Título */}
          <div className="mb-8">
            <h1 className="font-display text-[28px] sm:text-[32px] font-extrabold tracking-tight text-gray-900 leading-tight">
              Bem-vindo de volta 👋
            </h1>
            <p className="mt-2 text-[14.5px] text-gray-500">
              Entra na tua conta para continuar.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <i className="fi fi-rr-envelope text-base leading-none" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@exemplo.com"
                  autoComplete="email"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 bg-white
                    placeholder:text-gray-400 text-[15px]
                    focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500
                    transition"
                />
              </div>
            </div>

            {/* Palavra-passe */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Palavra-passe
                </label>
                <Link
                  to="/recuperar"
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition"
                >
                  Esqueceste-te?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <i className="fi fi-rr-lock text-base leading-none" />
                </span>
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-300 bg-white
                    placeholder:text-gray-400 text-[15px]
                    focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500
                    transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg
                    flex items-center justify-center text-gray-400
                    hover:text-gray-700 hover:bg-gray-100 transition"
                  aria-label={showPwd ? 'Esconder palavra-passe' : 'Mostrar palavra-passe'}
                >
                  <i className={`fi ${showPwd ? 'fi-rr-eye-crossed' : 'fi-rr-eye'} text-base leading-none`} />
                </button>
              </div>
            </div>

            {/* Lembrar-me */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500/40"
              />
              <span className="text-sm text-gray-600">
                Manter sessão iniciada neste dispositivo
              </span>
            </label>

            {/* Erro */}
            {error && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50
                border border-red-200 rounded-xl px-3.5 py-2.5">
                <i className="fi fi-rr-exclamation text-base leading-none mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Botão principal */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold text-[15px]
                hover:bg-brand-700 active:scale-[0.99] transition
                shadow-lg shadow-brand-600/25
                disabled:opacity-60 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  A entrar...
                </>
              ) : (
                <>
                  Entrar
                  <i className="fi fi-rr-arrow-small-right text-lg leading-none" />
                </>
              )}
            </button>
          </form>

          {/* Separador */}
          <div className="my-6 flex items-center gap-3 text-xs text-gray-400">
            <div className="flex-1 h-px bg-gray-200" />
            ou continua com
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full py-3 rounded-xl border border-gray-300 bg-white
              hover:bg-gray-50 hover:border-gray-400 active:scale-[0.99] transition
              text-[15px] font-semibold text-gray-700
              flex items-center justify-center gap-2.5"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.2 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.2 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5C29.6 34.7 26.9 36 24 36c-5.2 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.5 5.5c-.5.4 6.9-5 6.9-15 0-1.2-.1-2.4-.4-3.5z"/>
            </svg>
            Google
          </button>

          {/* Registo */}
          <p className="mt-8 text-center text-sm text-gray-600">
            Ainda não tens conta?{' '}
            <Link
              to="/registar"
              className="font-semibold text-brand-600 hover:text-brand-700 transition"
            >
              Criar conta grátis
            </Link>
          </p>

          {/* Links legais mobile */}
          <div className="lg:hidden mt-10 flex items-center justify-center gap-4 text-xs text-gray-400">
            <a href="#" className="hover:text-gray-600 transition">Privacidade</a>
            <span>·</span>
            <a href="#" className="hover:text-gray-600 transition">Termos</a>
          </div>
        </div>
      </main>
    </div>
  );
}