import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/* ---------------------------------------------------------------
   Registo com:
   - Split layout (branding esquerda / form direita)
   - Verificação de passwords + força
   - Aceitação de termos obrigatória
   - Google OAuth
   - Redireccionamento inteligente (admin/user/onboarding)
---------------------------------------------------------------- */

export default function Register() {
  const navigate = useNavigate();
  const { user, profile, isAdmin, loading: authLoading } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    birth_date: '',
    password: '',
    confirm: '',
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  /* ---------- Redireccionamento automático se já autenticado ---------- */
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    if (isAdmin) return navigate('/admin', { replace: true });
    if (!profile?.rules_accepted_at) return navigate('/onboarding/bem-vindo', { replace: true });
    if (!profile?.onboarding_completed) return navigate('/onboarding/perfil', { replace: true });
    navigate('/app/descobrir', { replace: true });
  }, [authLoading, user, isAdmin, profile, navigate]);

  /* ---------- Força da palavra-passe ---------- */
  const pwdStrength = (() => {
    const p = form.password;
    if (!p) return { level: 0, label: '', color: '' };
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;

    if (score <= 2) return { level: 1, label: 'Fraca',  color: 'bg-red-500' };
    if (score === 3) return { level: 2, label: 'Média', color: 'bg-amber-500' };
    if (score === 4) return { level: 3, label: 'Boa',   color: 'bg-lime-500' };
    return { level: 4, label: 'Forte', color: 'bg-green-500' };
  })();

  /* ---------- Submissão ---------- */
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) return setError('Diz-nos o teu nome.');
    if (!form.birth_date) return setError('Indica a tua data de nascimento.');
    if (form.password.length < 6) {
      return setError('A palavra-passe deve ter pelo menos 6 caracteres.');
    }
    if (form.password !== form.confirm) {
      return setError('As palavras-passe não coincidem.');
    }
    if (!acceptTerms) {
      return setError('Precisas aceitar os Termos e a Política de Privacidade.');
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: form.name.trim(),
          birth_date: form.birth_date,
        },
        emailRedirectTo: `${window.location.origin}/onboarding/bem-vindo`,
      },
    });
    setLoading(false);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already') || msg.includes('user already registered')) {
        return setError('Já existe uma conta com este email.');
      }
      if (msg.includes('password')) {
        return setError('Palavra-passe demasiado fraca. Usa pelo menos 6 caracteres.');
      }
      if (msg.includes('email')) {
        return setError('Email inválido.');
      }
      return setError(error.message);
    }

    navigate('/onboarding/bem-vindo', { replace: true });
  };

  /* ---------- Google OAuth ---------- */
  const handleGoogle = async () => {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/onboarding/bem-vindo` },
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
              Começa agora.
              <br />
              É grátis e
              <br />
              leva 1 minuto.
            </h1>
            <p className="mt-6 text-white/80 text-[15px] leading-relaxed">
              Cria o teu perfil, recebe 3 contactos grátis e fala directo no
              WhatsApp com quem quiseres.
            </p>

            {/* Lista de vantagens */}
            <ul className="mt-8 space-y-3">
              {[
                '3 contactos grátis ao criar conta',
                'Perfis reais, sem bots',
                'Contacto directo no WhatsApp',
              ].map((t, i) => (
                <li key={i} className="flex items-center gap-3 text-[14.5px] text-white/90">
                  <span className="w-6 h-6 rounded-full bg-white/15 backdrop-blur flex items-center justify-center border border-white/20 shrink-0">
                    <i className="fi fi-sr-check text-white text-xs leading-none" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
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
        <div className="w-full max-w-[440px]">

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
              Cria a tua conta ❤️
            </h1>
            <p className="mt-2 text-[14.5px] text-gray-500">
              Leva menos de 1 minuto. Começa já a conhecer pessoas.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-4">

            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nome
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <i className="fi fi-rr-user text-base leading-none" />
                </span>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={update('name')}
                  placeholder="Ex.: Graciel"
                  autoComplete="name"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 bg-white
                    placeholder:text-gray-400 text-[15px]
                    focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500
                    transition"
                />
              </div>
            </div>

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
                  value={form.email}
                  onChange={update('email')}
                  placeholder="tu@exemplo.com"
                  autoComplete="email"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 bg-white
                    placeholder:text-gray-400 text-[15px]
                    focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500
                    transition"
                />
              </div>
            </div>

            {/* Data de nascimento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Data de nascimento
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <i className="fi fi-rr-cake-birthday text-base leading-none" />
                </span>
                <input
                  type="date"
                  required
                  value={form.birth_date}
                  onChange={update('birth_date')}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 bg-white
                    text-[15px] text-gray-900
                    focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500
                    transition"
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                Deves ter pelo menos 18 anos.
              </p>
            </div>

            {/* Palavra-passe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Palavra-passe
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <i className="fi fi-rr-lock text-base leading-none" />
                </span>
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={update('password')}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
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
                  aria-label={showPwd ? 'Esconder' : 'Mostrar'}
                >
                  <i className={`fi ${showPwd ? 'fi-rr-eye-crossed' : 'fi-rr-eye'} text-base leading-none`} />
                </button>
              </div>

              {/* Barra de força */}
              {form.password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full transition-all ${pwdStrength.color}`}
                      style={{ width: `${(pwdStrength.level / 4) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-gray-500 w-12 text-right">
                    {pwdStrength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Confirmar palavra-passe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirma a palavra-passe
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <i className="fi fi-rr-lock text-base leading-none" />
                </span>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={form.confirm}
                  onChange={update('confirm')}
                  placeholder="Repete a palavra-passe"
                  autoComplete="new-password"
                  className="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-300 bg-white
                    placeholder:text-gray-400 text-[15px]
                    focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500
                    transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg
                    flex items-center justify-center text-gray-400
                    hover:text-gray-700 hover:bg-gray-100 transition"
                  aria-label={showConfirm ? 'Esconder' : 'Mostrar'}
                >
                  <i className={`fi ${showConfirm ? 'fi-rr-eye-crossed' : 'fi-rr-eye'} text-base leading-none`} />
                </button>
              </div>
              {form.confirm && form.password !== form.confirm && (
                <p className="mt-1.5 text-xs text-red-600">
                  As palavras-passe não coincidem.
                </p>
              )}
            </div>

            {/* Termos */}
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500/40 shrink-0"
              />
              <span className="text-sm text-gray-600 leading-relaxed">
                Aceito os{' '}
                <a href="#" className="font-semibold text-brand-600 hover:text-brand-700 transition">
                  Termos de Utilização
                </a>{' '}
                e a{' '}
                <a href="#" className="font-semibold text-brand-600 hover:text-brand-700 transition">
                  Política de Privacidade
                </a>
                .
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

            {/* Botão */}
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
                  A criar conta...
                </>
              ) : (
                <>
                  Criar conta grátis
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

          {/* Login */}
          <p className="mt-8 text-center text-sm text-gray-600">
            Já tens conta?{' '}
            <Link
              to="/login"
              className="font-semibold text-brand-600 hover:text-brand-700 transition"
            >
              Entrar
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