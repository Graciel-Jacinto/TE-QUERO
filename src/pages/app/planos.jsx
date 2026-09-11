import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function Plans() {
  const { user } = useAuth();
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

  /* ---------- Comprar ---------- */
  const handleBuy = (pkg) => {
    setSelectedPkg(pkg);
  };

  const confirmBuy = async () => {
    if (!selectedPkg) return;

    // TODO: integrar gateway de pagamento (M-Pesa, e-Mola, Stripe)
    setToast({
      msg: `Pagamento em breve! Pacote "${selectedPkg.name}" por ${selectedPkg.price_mzn} MZN.`,
      type: 'info',
    });
    setSelectedPkg(null);
    setTimeout(() => setToast(null), 4000);
  };

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatDate = (iso) => {
    return new Date(iso).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  /* Índice do "mais popular" */
  const popularIdx = packages.length >= 2 ? Math.floor(packages.length / 2) : 0;

  return (
    <>
      <div className="max-w-[1100px] mx-auto">

        {/* ============ CABEÇALHO ============ */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display text-[26px] sm:text-[30px] font-extrabold tracking-tight text-gray-900">
              Planos e Contactos
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700
              text-[10.5px] font-bold uppercase tracking-wider">
              Novo
            </span>
          </div>
          <p className="text-[14px] text-gray-500">
            Compra mais contactos para falar com mais pessoas no WhatsApp.
          </p>
        </div>

        {/* ============ CARD DE SALDO ============ */}
        <div className="relative overflow-hidden rounded-3xl
          bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800
          p-6 sm:p-8 text-white shadow-xl shadow-brand-600/20">

          {/* Glow decorativo */}
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
            </div>

            {/* Ilustração */}
            <div className="shrink-0 flex items-center justify-center sm:justify-end">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl
                bg-white/15 backdrop-blur border border-white/20
                flex items-center justify-center">
                <i className="fi fi-sr-ticket text-white text-5xl sm:text-6xl leading-none" />
              </div>
            </div>
          </div>

          {/* Barra de progresso sugestiva */}
          {balance > 0 && (
            <div className="relative mt-6 pt-6 border-t border-white/15">
              <div className="flex items-center justify-between text-[12px] text-white/70 mb-2">
                <span>Ainda tens contactos</span>
                <span className="tabular-nums">{balance} restantes</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (balance / 50) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ============ PACOTES ============ */}
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-5">
            <h2 className="font-display text-[18px] font-extrabold text-gray-900">
              Escolhe um pacote
            </h2>
          </div>

          {packages.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <p className="text-sm text-gray-500">Sem pacotes disponíveis.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg, i) => {
                const isPopular = i === popularIdx && packages.length >= 2;
                const perUnit = (pkg.price_mzn / pkg.quantity).toFixed(0);

                return (
                  <div
                    key={pkg.id}
                    className={`relative bg-white rounded-3xl
                      transition-all duration-300 hover:-translate-y-0.5
                      ${isPopular
                        ? 'border-2 border-brand-500 shadow-xl shadow-brand-500/10'
                        : 'border border-gray-100 hover:border-gray-200 hover:shadow-lg'}`}
                  >
                    {/* Badge mais popular */}
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
                      {/* Cabeçalho do pacote */}
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center
                          ${isPopular
                            ? 'bg-brand-600'
                            : 'bg-brand-50'}`}>
                          <i className={`fi fi-sr-ticket text-xl leading-none
                            ${isPopular ? 'text-white' : 'text-brand-600'}`} />
                        </div>
                        <div>
                          <p className="font-display text-[19px] font-extrabold text-gray-900 leading-tight">
                            {pkg.quantity} contactos
                          </p>
                          <p className="text-[12px] text-gray-500 mt-0.5">
                            {perUnit} MZN cada
                          </p>
                        </div>
                      </div>

                      {/* Preço */}
                      <div className="mt-5 flex items-baseline gap-2">
                        <span className="font-display text-[32px] font-extrabold text-gray-900 leading-none">
                          {pkg.price_mzn}
                        </span>
                        <span className="text-[13px] font-bold text-gray-400">MZN</span>
                      </div>

                      {/* Benefícios incluídos */}
                      <ul className="mt-5 space-y-2">
                        {[
                          'Contactos nunca expiram',
                          'Sem cobranças duplicadas',
                          'Fala directo no WhatsApp',
                        ].map((b, k) => (
                          <li key={k} className="flex items-center gap-2 text-[13px] text-gray-600">
                            <span className="w-4 h-4 rounded-full bg-green-50
                              flex items-center justify-center shrink-0">
                              <i className="fi fi-sr-check text-green-600 text-[8px] leading-none" />
                            </span>
                            {b}
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
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
                        Comprar agora
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ============ BENEFÍCIOS ============ */}
        <div className="mt-10 bg-white rounded-3xl border border-gray-100 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
              <i className="fi fi-sr-shield-check text-brand-600 text-base leading-none" />
            </div>
            <h2 className="font-display text-[17px] font-extrabold text-gray-900">
              Porquê comprar contactos?
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: 'fi-sr-infinity',
                title: 'Sem expiração',
                desc: 'Os contactos ficam na tua conta para sempre.',
                color: 'text-blue-600 bg-blue-50',
              },
              {
                icon: 'fi-sr-shield-check',
                title: 'Sem duplicados',
                desc: 'Nunca pagas duas vezes pela mesma pessoa.',
                color: 'text-green-600 bg-green-50',
              },
              {
                icon: 'fi-sr-bolt',
                title: 'Acesso imediato',
                desc: 'Pagas e usas logo. Sem esperas.',
                color: 'text-amber-600 bg-amber-50',
              },
              {
                icon: 'fi-sr-lock',
                title: 'Pagamento seguro',
                desc: 'M-Pesa, e-Mola ou cartão. Escolhes.',
                color: 'text-purple-600 bg-purple-50',
              },
            ].map((b, i) => (
              <div key={i}>
                <div className={`w-11 h-11 rounded-xl ${b.color.split(' ')[1]}
                  flex items-center justify-center mb-3`}>
                  <i className={`fi ${b.icon} ${b.color.split(' ')[0]} text-lg leading-none`} />
                </div>
                <p className="font-display font-bold text-[14.5px] text-gray-900">
                  {b.title}
                </p>
                <p className="text-[12.5px] text-gray-500 mt-1 leading-snug">
                  {b.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ============ HISTÓRICO ============ */}
        {history.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-[17px] font-extrabold text-gray-900">
                Compras recentes
              </h2>
              <span className="text-[12px] text-gray-500">
                Últimas {history.length} compras
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
                      +{h.quantity} contactos
                    </p>
                    <p className="text-[12px] text-gray-500 mt-0.5">
                      {formatDate(h.created_at)}
                      {h.payment_ref && !h.payment_ref.startsWith('admin_adjust')
                        ? ` · ${h.payment_ref}`
                        : ''}
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

        {/* ============ FAQ ============ */}
        <div className="mt-10">
          <h2 className="font-display text-[17px] font-extrabold text-gray-900 mb-4">
            Perguntas frequentes
          </h2>

          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
            {[
              {
                q: 'Os contactos expiram?',
                a: 'Não. Os contactos que compras ficam na tua conta para sempre, até os usares.',
              },
              {
                q: 'Vou pagar duas vezes pela mesma pessoa?',
                a: 'Não. Se já contactaste alguém, abrir o WhatsApp novamente é gratuito.',
              },
              {
                q: 'Que métodos de pagamento aceitam?',
                a: 'Estamos a preparar M-Pesa, e-Mola e cartão de crédito. Será anunciado em breve.',
              },
              {
                q: 'Posso pedir reembolso?',
                a: 'Sim, dentro de 7 dias se ainda não usaste nenhum contacto do pacote.',
              },
            ].map((item, i) => (
              <FaqItem key={i} question={item.q} answer={item.a} defaultOpen={i === 0} />
            ))}
          </div>
        </div>

        {/* Espaço em baixo */}
        <div className="h-8" />
      </div>

      {/* ============ MODAL DE CONFIRMAÇÃO ============ */}
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

            {/* Ícone */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center">
                <i className="fi fi-rr-shopping-cart text-brand-600 text-2xl leading-none" />
              </div>
            </div>

            {/* Título */}
            <h3 className="font-display text-[20px] font-extrabold text-gray-900 text-center">
              Confirmar compra
            </h3>
            <p className="mt-2 text-[13.5px] text-gray-500 text-center leading-relaxed">
              Estás prestes a comprar o pacote de <strong className="text-gray-900">{selectedPkg.name}</strong>.
            </p>

            {/* Detalhes */}
            <div className="mt-5 rounded-2xl bg-gray-50 border border-gray-100 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-gray-600">Pacote</span>
                <span className="text-[13.5px] font-semibold text-gray-900">
                  {selectedPkg.quantity} contactos
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-gray-600">Preço unitário</span>
                <span className="text-[13.5px] font-semibold text-gray-900 tabular-nums">
                  {(selectedPkg.price_mzn / selectedPkg.quantity).toFixed(0)} MZN
                </span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <span className="text-[13px] font-bold text-gray-900">Total</span>
                <span className="font-display text-[20px] font-extrabold text-brand-600 tabular-nums">
                  {selectedPkg.price_mzn} MZN
                </span>
              </div>
            </div>

            {/* Novo saldo */}
            <div className="mt-4 flex items-center justify-between px-4 py-3 rounded-xl
              bg-green-50 border border-green-100">
              <span className="text-[12.5px] font-medium text-green-800">
                Novo saldo depois da compra
              </span>
              <span className="font-display text-[16px] font-extrabold text-green-700 tabular-nums">
                {balance + selectedPkg.quantity}
              </span>
            </div>

            {/* Aviso pagamento */}
            <div className="mt-4 flex items-start gap-2 px-3 py-2.5 rounded-xl
              bg-amber-50 border border-amber-100">
              <i className="fi fi-rr-info text-amber-600 text-sm leading-none mt-0.5 shrink-0" />
              <p className="text-[12px] text-amber-800 leading-snug">
                O pagamento será processado em breve. Vais receber instruções por email.
              </p>
            </div>

            {/* Botões */}
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
   Componente FAQ colapsável
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
        <div className="px-5 pb-4 -mt-1 animate-[fadeIn_150ms_ease-out]">
          <p className="text-[13px] text-gray-600 leading-relaxed">
            {answer}
          </p>
        </div>
      )}
    </div>
  );
}