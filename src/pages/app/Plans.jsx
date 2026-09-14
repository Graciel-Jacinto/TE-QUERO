import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

/* ---------- Helper: detetar plano ilimitado ---------- */
function isUnlimitedPlan(pkg) {
  if (!pkg) return false;
  if (pkg.unlimited === true) return true;
  if (typeof pkg.name === 'string' && /ilimitad/i.test(pkg.name)) return true;
  // Fallback: quantidade muito alta (>100) é tratada como ilimitada
  if (typeof pkg.quantity === 'number' && pkg.quantity >= 100) return true;
  return false;
}

export default function Plans() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [packages, setPackages] = useState([]);
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [toast, setToast] = useState(null);

  /* ---------- Carregar dados ---------- */
  useEffect(() => {
    if (!user) return;

    (async () => {
      const [pkgRes, balRes, histRes] = await Promise.all([
        supabase
          .from('contact_packages')
          .select('*')
          .eq('active', true)
          .order('quantity', { ascending: true }),
        supabase
          .from('contact_balances')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('contact_purchases')
          .select('id, quantity, amount, status, created_at, payment_ref')
          .eq('user_id', user.id)
          .eq('status', 'paid')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      setPackages(pkgRes.data || []);
      setBalance(balRes.data?.balance ?? 0);
      setHistory(histRes.data || []);
      setLoading(false);
    })();
  }, [user]);

  const handleBuy = (pkg) => setSelectedPkg(pkg);

  const confirmBuy = () => {
    if (!selectedPkg) return;
    setToast({
      msg: `Pagamento em breve! Plano "${selectedPkg.name}" por ${selectedPkg.price_mzn} MZN/mês.`,
      type: 'info',
    });
    setSelectedPkg(null);
    setTimeout(() => setToast(null), 4000);
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  const popularIdx = packages.length >= 2 ? Math.floor(packages.length / 2) : 0;
  const isVerified = profile?.is_verified === true;

  return (
    <>
      <div className="max-w-[1100px] mx-auto">

        {/* Cabeçalho */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display text-[26px] sm:text-[30px] font-extrabold tracking-tight text-gray-900">
              Planos e Contactos
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700
              text-[10.5px] font-bold uppercase tracking-wider">
              Mensal
            </span>
          </div>
          <p className="text-[14px] text-gray-500">
            Todos os planos incluem <strong className="text-gray-700">selo verificado</strong> e
            contactos para falar no WhatsApp.
          </p>
        </div>

        {/* Card de saldo */}
        <div className="relative overflow-hidden rounded-3xl
          bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800
          p-6 sm:p-8 text-white shadow-xl shadow-brand-600/20">

          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full
            bg-brand-400/40 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full
            bg-brand-300/30 blur-3xl" />

          <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/70">
                Contactos disponíveis
              </p>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="font-display text-[56px] sm:text-[64px] font-extrabold
                  leading-none tabular-nums">
                  {balance}
                </span>
                <span className="text-[15px] text-white/70">
                  {balance === 1 ? 'contacto' : 'contactos'}
                </span>
              </div>
              <p className="mt-3 text-[13px] text-white/80 leading-relaxed max-w-sm">
                Cada contacto permite-te falar com <strong className="text-white">1 pessoa nova</strong> no
                WhatsApp. Nunca é descontado duas vezes pelo mesmo perfil.
              </p>

              {isVerified && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                  bg-white/15 backdrop-blur border border-white/25">
                  <i className="fi fi-sr-badge-check text-blue-300 text-sm leading-none" />
                  <span className="text-[12px] font-bold text-white">
                    Plano ativo · Selo verificado
                  </span>
                </div>
              )}
            </div>

            <div className="shrink-0 flex items-center justify-center sm:justify-end">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl
                bg-white/15 backdrop-blur border border-white/20
                flex items-center justify-center">
                <i className="fi fi-sr-ticket text-white text-5xl sm:text-6xl leading-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Aviso: como funciona o selo */}
        <div className="mt-6 flex items-start gap-3 px-4 py-3.5 rounded-2xl
          bg-blue-50 border border-blue-100">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
            <i className="fi fi-sr-info text-blue-600 text-sm leading-none" />
          </div>
          <div className="text-[13px] text-blue-900 leading-relaxed">
            <strong className="font-bold">Como funciona o selo verificado:</strong>{' '}
            todos os planos incluem o selo azul. O selo mantém-se ativo enquanto o teu
            plano estiver pago. Se não renovares, perdes o selo e os contactos extra.
          </div>
        </div>

        {/* Pacotes */}
        <div className="mt-10">
          <h2 className="font-display text-[18px] font-extrabold text-gray-900 mb-5">
            Escolhe um plano
          </h2>

          {packages.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <p className="text-sm text-gray-500">Sem planos disponíveis.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg, i) => {
                const isPopular = i === popularIdx && packages.length >= 2;
                const perUnit = (pkg.price_mzn / pkg.quantity).toFixed(0);
                const unlimited = isUnlimitedPlan(pkg);

                /* Benefícios dinâmicos por tipo de plano */
                const benefits = [
                  'Selo verificado ativo',
                  'Sem cobranças duplicadas',
                  'Fala directo no WhatsApp',
                ];
                if (unlimited) {
                  benefits.unshift('Contactos nunca expiram');
                }

                return (
                  <div
                    key={pkg.id}
                    className={`relative bg-white rounded-3xl
                      transition-all duration-300 hover:-translate-y-0.5
                      ${isPopular
                        ? 'border-2 border-brand-500 shadow-xl shadow-brand-500/10'
                        : 'border border-gray-100 hover:border-gray-200 hover:shadow-lg'}`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2
                        px-3 py-1 rounded-full bg-brand-600 text-white
                        text-[10px] font-bold uppercase tracking-wider
                        shadow-lg shadow-brand-600/30 flex items-center gap-1">
                        <i className="fi fi-sr-star text-[10px] leading-none" />
                        Mais popular
                      </div>
                    )}

                    <div className="p-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center
                          ${isPopular ? 'bg-brand-600' : 'bg-brand-50'}`}>
                          <i className={`fi ${unlimited ? 'fi-sr-infinity' : 'fi-sr-ticket'}
                            text-xl leading-none
                            ${isPopular ? 'text-white' : 'text-brand-600'}`} />
                        </div>
                        <div>
                          <p className="font-display text-[19px] font-extrabold text-gray-900 leading-tight">
                            {unlimited ? 'Ilimitado' : `${pkg.quantity} contactos`}
                          </p>
                          <p className="text-[12px] text-gray-500 mt-0.5">
                            {unlimited ? 'Sem limite de contactos' : `${perUnit} MZN cada`}
                          </p>
                        </div>
                      </div>

                      {/* Selo incluído */}
                      <div className="mt-4 inline-flex items-center gap-1.5
                        px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100">
                        <i className="fi fi-sr-badge-check text-blue-600 text-[11px] leading-none" />
                        <span className="text-[10.5px] font-bold text-blue-700 uppercase tracking-wider">
                          Selo verificado incluído
                        </span>
                      </div>

                      <div className="mt-4 flex items-baseline gap-2">
                        <span className="font-display text-[32px] font-extrabold text-gray-900 leading-none">
                          {pkg.price_mzn}
                        </span>
                        <span className="text-[13px] font-bold text-gray-400">MZN</span>
                        <span className="text-[12px] text-gray-400 ml-1">/mês</span>
                      </div>

                      <ul className="mt-5 space-y-2">
                        {benefits.map((b, k) => (
                          <li key={k} className="flex items-center gap-2 text-[13px] text-gray-600">
                            <span className="w-4 h-4 rounded-full bg-green-50
                              flex items-center justify-center shrink-0">
                              <i className="fi fi-sr-check text-green-600 text-[8px] leading-none" />
                            </span>
                            {b}
                          </li>
                        ))}
                      </ul>

                      <button
                        onClick={() => handleBuy(pkg)}
                        className={`mt-6 w-full py-3.5 rounded-2xl font-bold text-[14.5px]
                          transition-all flex items-center justify-center gap-2
                          active:scale-[0.98]
                          ${isPopular
                            ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-600/25'
                            : 'bg-gray-900 text-white hover:bg-gray-800'}`}
                      >
                        <i className="fi fi-rr-shopping-cart text-base leading-none" />
                        Subscrever agora
                      </button>

                      <p className="mt-2 text-[10.5px] text-gray-400 text-center">
                        Renova automaticamente · Cancelas quando quiseres
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Benefícios */}
        <div className="mt-10 bg-white rounded-3xl border border-gray-100 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
              <i className="fi fi-sr-shield-check text-brand-600 text-base leading-none" />
            </div>
            <h2 className="font-display text-[17px] font-extrabold text-gray-900">
              Porquê subscrever um plano?
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: 'fi-sr-badge-check', title: 'Selo verificado',   desc: 'Ganha o selo azul e destaca-te no feed.',     color: 'text-blue-600 bg-blue-50' },
              { icon: 'fi-sr-infinity',    title: 'Contactos extra',   desc: 'Fala com mais pessoas no WhatsApp.',          color: 'text-green-600 bg-green-50' },
              { icon: 'fi-sr-bolt',        title: 'Acesso imediato',   desc: 'Pagas e usas logo. Sem esperas.',             color: 'text-amber-600 bg-amber-50' },
              { icon: 'fi-sr-lock',        title: 'Pagamento seguro',  desc: 'M-Pesa, e-Mola ou cartão. Escolhes.',         color: 'text-purple-600 bg-purple-50' },
            ].map((b, i) => {
              const [text, bg] = b.color.split(' ');
              return (
                <div key={i}>
                  <div className={`w-11 h-11 rounded-xl ${bg}
                    flex items-center justify-center mb-3`}>
                    <i className={`fi ${b.icon} ${text} text-lg leading-none`} />
                  </div>
                  <p className="font-display font-bold text-[14.5px] text-gray-900">
                    {b.title}
                  </p>
                  <p className="text-[12.5px] text-gray-500 mt-1 leading-snug">
                    {b.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Histórico */}
        {history.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-[17px] font-extrabold text-gray-900">
                Subscrições recentes
              </h2>
              <span className="text-[12px] text-gray-500">
                Últimas {history.length}
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {history.map((h, i) => (
                <div
                  key={h.id}
                  className={`flex items-center gap-4 p-4
                    ${i !== history.length - 1 ? 'border-b border-gray-50' : ''}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-green-50
                    flex items-center justify-center shrink-0">
                    <i className="fi fi-sr-ticket text-green-600 text-base leading-none" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[14px] text-gray-900">
                      +{h.quantity} contactos + Selo
                    </p>
                    <p className="text-[12px] text-gray-500 mt-0.5">
                      {formatDate(h.created_at)}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-display font-bold text-[15px] text-gray-900 tabular-nums">
                      {h.amount} MZN
                    </p>
                    <p className="text-[11px] text-green-600 font-semibold mt-0.5 flex items-center justify-end gap-1">
                      <i className="fi fi-sr-check-circle text-[10px] leading-none" />
                      Pago
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        <div className="mt-10">
          <h2 className="font-display text-[17px] font-extrabold text-gray-900 mb-4">
            Perguntas frequentes
          </h2>

          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
            {[
              {
                q: 'O selo verificado está incluído em todos os planos?',
                a: 'Sim. Todos os planos incluem o selo verificado. O selo fica ativo enquanto a subscrição estiver paga.',
              },
              {
                q: 'Os contactos expiram?',
                a: 'Nos planos com limite de contactos, tens um número definido de contactos por mês. Só no plano ilimitado podes contactar sem qualquer limite.',
              },
              {
                q: 'O que acontece se eu não renovar?',
                a: 'Perdes o selo verificado e os contactos extra. Os contactos que já usaste mantêm-se registados, mas não podes contactar novas pessoas.',
              },
              {
                q: 'Vou pagar duas vezes pela mesma pessoa?',
                a: 'Não. Se já contactaste alguém, abrir o WhatsApp novamente é gratuito — nunca é descontado duas vezes.',
              },
              {
                q: 'Que métodos de pagamento aceitam?',
                a: 'Aceitamos M-Pesa (Vodacom) e e-Mola (Movitel). Cartão de crédito será adicionado em breve.',
              },
              {
                q: 'Posso cancelar quando quiser?',
                a: 'Sim. Podes cancelar a renovação automática a qualquer momento. O plano mantém-se ativo até ao fim do período já pago.',
              },
            ].map((item, i) => (
              <FaqItem key={i} question={item.q} answer={item.a} defaultOpen={i === 0} />
            ))}
          </div>
        </div>

        <div className="h-8" />
      </div>

      {/* Modal de confirmação */}
      {selectedPkg && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
          <div
            onClick={() => setSelectedPkg(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl
            p-6 pb-8 sm:p-8
            animate-[slideUpModal_250ms_cubic-bezier(0.22,1,0.36,1)]">

            <style>{`
              @keyframes slideUpModal {
                from { transform: translateY(100%); }
                to   { transform: translateY(0); }
              }
              @media (min-width: 640px) {
                @keyframes slideUpModal {
                  from { transform: translateY(20px) scale(0.98); opacity: 0; }
                  to   { transform: translateY(0) scale(1); opacity: 1; }
                }
              }
            `}</style>

            <div className="sm:hidden w-12 h-1.5 rounded-full bg-gray-300 mx-auto mb-5" />

            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center">
                <i className="fi fi-rr-shopping-cart text-brand-600 text-2xl leading-none" />
              </div>
            </div>

            <h3 className="font-display text-[20px] font-extrabold text-gray-900 text-center">
              Confirmar subscrição
            </h3>
            <p className="mt-2 text-[13.5px] text-gray-500 text-center leading-relaxed">
              Estás prestes a subscrever o <strong className="text-gray-900">{selectedPkg.name}</strong>{' '}
              por <strong className="text-gray-900">{selectedPkg.price_mzn} MZN/mês</strong>.
            </p>

            <div className="mt-5 rounded-2xl bg-gray-50 border border-gray-100 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-gray-600">Plano</span>
                <span className="text-[13.5px] font-semibold text-gray-900">
                  {isUnlimitedPlan(selectedPkg)
                    ? 'Ilimitado'
                    : `${selectedPkg.quantity} contactos`}
                </span>
              </div>

              {!isUnlimitedPlan(selectedPkg) && (
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-gray-600">Preço unitário</span>
                  <span className="text-[13.5px] font-semibold text-gray-900 tabular-nums">
                    {(selectedPkg.price_mzn / selectedPkg.quantity).toFixed(0)} MZN
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-[13px] text-gray-600">Selo verificado</span>
                <span className="text-[13px] font-bold text-blue-600 flex items-center gap-1.5">
                  <i className="fi fi-sr-badge-check text-[12px] leading-none" />
                  Incluído
                </span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <span className="text-[13px] font-bold text-gray-900">Total mensal</span>
                <span className="font-display text-[20px] font-extrabold text-brand-600 tabular-nums">
                  {selectedPkg.price_mzn} MZN
                </span>
              </div>
            </div>

            {!isUnlimitedPlan(selectedPkg) && (
              <div className="mt-4 flex items-center justify-between px-4 py-3 rounded-xl
                bg-green-50 border border-green-100">
                <span className="text-[12.5px] font-medium text-green-800">
                  Novo saldo depois da compra
                </span>
                <span className="font-display text-[16px] font-extrabold text-green-700 tabular-nums">
                  {balance + selectedPkg.quantity}
                </span>
              </div>
            )}

            <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl
              bg-blue-50 border border-blue-100">
              <i className="fi fi-sr-info text-blue-600 text-sm leading-none mt-0.5 shrink-0" />
              <span className="text-[11.5px] text-blue-800 leading-relaxed">
                O selo mantém-se ativo enquanto renovares. Se cancelares, o plano
                continua até ao fim do mês já pago.
              </span>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setSelectedPkg(null)}
                className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-700
                  font-semibold text-[14.5px]
                  hover:bg-gray-200 active:bg-gray-300 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmBuy}
                className="flex-1 py-3.5 rounded-xl bg-brand-600 text-white
                  font-bold text-[14.5px]
                  hover:bg-brand-700 active:scale-[0.98] transition
                  shadow-lg shadow-brand-600/25
                  flex items-center justify-center gap-2"
              >
                <i className="fi fi-rr-check text-base leading-none" />
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[400]
            px-4 py-3 rounded-xl shadow-xl text-[13px] font-semibold
            text-white max-w-[90vw] text-center
            ${toast.type === 'error' ? 'bg-red-600' : 'bg-gray-900'}`}
        >
          {toast.msg}
        </div>
      )}
    </>
  );
}

/* ============================================================
   FAQ colapsável
============================================================ */
function FaqItem({ question, answer, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4
          text-left hover:bg-gray-50 active:bg-gray-100 transition"
      >
        <span className="font-semibold text-[14px] text-gray-900">
          {question}
        </span>
        <i className={`fi fi-rr-angle-small-down text-gray-400 text-base leading-none
          transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-4 -mt-1">
          <p className="text-[13px] text-gray-600 leading-relaxed">
            {answer}
          </p>
        </div>
      )}
    </div>
  );
}