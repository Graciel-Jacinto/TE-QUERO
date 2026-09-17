import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { track } from '../../lib/track';

export default function Welcome() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const name = profile?.name?.split(' ')[0] || 'amigo';

  /* ---------- Tracking: entrada na página ---------- */
  useEffect(() => {
    track('welcome_view', 'started');
  }, []);

  /* ---------- Tracking: clique em "Começar" ---------- */
  const handleContinue = async () => {
    await track('welcome_accept', 'success');
    navigate('/onboarding/regras');
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col bg-white">

      {/* Logo topo */}
      <div className="flex justify-center pt-6 sm:pt-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm shadow-brand-600/30">
            <i className="fi fi-sr-heart text-white text-lg leading-none" />
          </div>
          <span className="font-display font-extrabold text-[20px] tracking-tight text-gray-900">
            Te Quero<span className="text-brand-600">.</span>
          </span>
        </div>
      </div>

      {/* Centro */}
      <div className="flex-1 flex flex-col justify-center items-center text-center
        px-6 sm:px-8 pb-16">

        <h1 className="font-display text-[30px] sm:text-[40px] md:text-[48px]
          font-extrabold tracking-[-0.03em] text-gray-900 leading-[1.15] max-w-xl">
          Bem-vindo, <span className="text-brand-600">{name}</span>.
        </h1>

        <p className="mt-5 text-[15px] sm:text-[16px] text-gray-500 max-w-sm leading-relaxed">
          Vamos preparar o teu perfil em menos de um minuto.
        </p>

        <button
          onClick={handleContinue}
          className="mt-12 inline-flex items-center gap-2 px-7 py-3.5 rounded-xl
            bg-brand-600 text-white font-semibold text-[15px]
            hover:bg-brand-700 active:scale-[0.98] transition
            shadow-lg shadow-brand-600/25"
        >
          Começar
          <i className="fi fi-rr-arrow-small-right text-lg leading-none" />
        </button>

        <p className="mt-10 text-[11px] text-gray-400 max-w-xs leading-relaxed">
          Ao continuar, aceitas as Regras da Casa do Te Quero.
        </p>
      </div>
    </div>
  );
}