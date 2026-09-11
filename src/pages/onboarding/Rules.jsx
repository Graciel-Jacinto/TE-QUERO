import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const rules = [
  {
    icon: 'fi-rr-handshake',
    title: 'Respeita os outros',
    desc: 'Trata todas as pessoas com educação e respeito.',
  },
  {
    icon: 'fi-rr-user-check',
    title: 'Sê verdadeiro',
    desc: 'Usa informações reais no teu perfil. Não te faças passar por outra pessoa.',
  },
  {
    icon: 'fi-rr-ban',
    title: 'Nada de conteúdo ofensivo',
    desc: 'Não publiques conteúdo abusivo, discriminatório ou ilegal.',
  },
  {
    icon: 'fi-rr-shield-check',
    title: 'Protege a tua privacidade',
    desc: 'Evita partilhar informações pessoais ou financeiras com desconhecidos.',
  },
  {
    icon: 'fi-rr-megaphone',
    title: 'Denuncia comportamentos inadequados',
    desc: 'Se alguém violar as regras, podes denunciar o perfil.',
  },
];

export default function Rules() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (!accepted) return;
    setError('');
    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({ rules_accepted_at: new Date().toISOString() })
      .eq('id', user.id);

    setLoading(false);
    if (error) return setError(error.message);

    await refreshProfile();
    navigate('/onboarding/perfil');
  };

  return (
    <div className="h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)]
      flex flex-col bg-white overflow-hidden">

      {/* Logo topo */}
      <div className="shrink-0 flex justify-center pt-4 sm:pt-6">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700
            flex items-center justify-center shadow-sm shadow-brand-600/30">
            <i className="fi fi-sr-heart text-white text-lg leading-none" />
          </div>
          <span className="font-display font-extrabold text-[20px] tracking-tight text-gray-900">
            Te Quero<span className="text-brand-600">.</span>
          </span>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-h-0 w-full max-w-2xl mx-auto px-6 sm:px-8
        flex flex-col py-4 sm:py-6">

        {/* Cabeçalho */}
        <div className="shrink-0 text-center mb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-600 mb-2">
            Passo 2 de 3
          </p>
          <h1 className="font-display text-[24px] sm:text-[30px] font-extrabold
            tracking-[-0.03em] text-gray-900 leading-tight">
            Regras da Casa
          </h1>
          <p className="mt-2 text-[13.5px] text-gray-500 max-w-sm mx-auto leading-snug">
            Cinco regras simples para mantermos o Te Quero num lugar seguro
            e acolhedor para todos.
          </p>
        </div>

        {/* Lista de regras — ocupa o espaço disponível */}
        <ul className="flex-1 min-h-0 flex flex-col justify-center gap-1">
          {rules.map((r, i) => (
            <li
              key={i}
              className="group flex items-start gap-3.5 py-2.5 px-2 rounded-xl
                hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 shrink-0 rounded-lg bg-brand-50
                flex items-center justify-center
                group-hover:bg-brand-100 transition-colors">
                <i className={`fi ${r.icon} text-brand-600 text-[15px] leading-none`} />
              </div>
              <div className="pt-0.5 min-w-0">
                <p className="font-display font-bold text-[14px] text-gray-900 leading-snug">
                  {r.title}
                </p>
                <p className="text-[12.5px] text-gray-500 mt-0.5 leading-snug">
                  {r.desc}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {/* Aceitação + CTA — sempre no fundo */}
        <div className="shrink-0 pt-4">

          <label className="flex items-start gap-3 cursor-pointer select-none
            p-3.5 rounded-2xl border border-gray-200 hover:border-brand-300
            transition-colors">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded border-gray-300 text-brand-600
                focus:ring-brand-500/40 shrink-0"
            />
            <span className="text-[13.5px] text-gray-700 leading-snug">
              Li e aceito as <strong className="text-gray-900">Regras da Casa</strong> do
              Te Quero.
            </span>
          </label>

          {error && (
            <div className="mt-3 flex items-start gap-2 text-sm text-red-700 bg-red-50
              border border-red-200 rounded-xl px-3.5 py-2">
              <i className="fi fi-rr-exclamation text-base leading-none mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleContinue}
            disabled={!accepted || loading}
            className="mt-3 w-full py-3.5 rounded-xl bg-brand-600 text-white font-semibold text-[15px]
              hover:bg-brand-700 active:scale-[0.99] transition
              shadow-lg shadow-brand-600/25
              disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
              flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                A guardar...
              </>
            ) : (
              <>
                Continuar
                <i className="fi fi-rr-arrow-small-right text-lg leading-none" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}