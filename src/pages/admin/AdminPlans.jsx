import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';

const TABS = [
  { value: 'packages', label: 'Pacotes',     icon: 'fi-sr-ticket' },
  { value: 'payments', label: 'Pagamentos',  icon: 'fi-sr-money-bill-wave' },
];

export default function AdminPlans() {
  const [tab, setTab] = useState('packages');
  const [packages, setPackages] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);

  /* ---------- Carregar pacotes + stats ---------- */
  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [pkgsRes, statsRes] = await Promise.all([
      supabase
        .from('contact_packages')
        .select('*')
        .order('quantity', { ascending: true }),
      supabase.rpc('admin_sales_stats'),
    ]);
    setPackages(pkgsRes.data || []);
    setStats(statsRes.data || null);
    setLoading(false);
  };

  /* ---------- Carregar pagamentos quando abre o separador ---------- */
  useEffect(() => {
    if (tab === 'payments') loadPurchases();
    // eslint-disable-next-line
  }, [tab]);

  const loadPurchases = async () => {
    setPurchasesLoading(true);
    const { data } = await supabase.rpc('admin_list_purchases', {
      p_search: search || null,
      p_limit: 100,
      p_offset: 0,
    });
    setPurchases(data || []);
    setPurchasesLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadPurchases();
  };

  /* ---------- Guardar pacote ---------- */
  const save = async (pkg) => {
    const { data } = await supabase.rpc('admin_upsert_package', {
      p_id: pkg.id || null,
      p_name: pkg.name,
      p_quantity: parseInt(pkg.quantity),
      p_price: parseFloat(pkg.price_mzn),
      p_active: pkg.active,
    });
    if (data?.success) {
      showToast('Pacote guardado.');
      setEditing(null);
      load();
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const money = (n) =>
    Number(n || 0).toLocaleString('pt-PT', { minimumFractionDigits: 0 });

  /* ---------- Totais mostrados no topo ---------- */
  const totalStock = useMemo(
    () => packages.reduce((s, p) => s + (p.active ? 1 : 0), 0),
    [packages]
  );

  return (
    <div>
      {/* ============ CABEÇALHO ============ */}
      <div className="mb-6">
        <h1 className="font-display text-[24px] sm:text-[28px] font-extrabold tracking-tight text-gray-900">
          Planos e Pagamentos
        </h1>
        <p className="text-[13.5px] text-gray-500 mt-1">
          Gere os pacotes de contactos e consulta os pagamentos.
        </p>
      </div>

      {/* ============ CARDS DE ESTATÍSTICA ============ */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard
            icon="fi-sr-money-bill-wave"
            label="Receita total"
            value={`${money(stats.total_revenue)} MZN`}
            sub={`${stats.total_sales} venda${stats.total_sales !== 1 ? 's' : ''}`}
            color="green"
          />
          <StatCard
            icon="fi-sr-calendar"
            label="Este mês"
            value={`${money(stats.revenue_month)} MZN`}
            sub={`${stats.sales_month} venda${stats.sales_month !== 1 ? 's' : ''}`}
            color="brand"
          />
          <StatCard
            icon="fi-sr-ticket"
            label="Contactos vendidos"
            value={stats.contacts_sold}
            sub={`${totalStock} pacote${totalStock !== 1 ? 's' : ''} activo${totalStock !== 1 ? 's' : ''}`}
            color="blue"
          />
          <StatCard
            icon="fi-sr-chart-histogram"
            label="Ticket médio"
            value={`${money(stats.avg_ticket)} MZN`}
            sub="Por venda"
            color="amber"
          />
        </div>
      )}

      {/* ============ TABS ============ */}
      <div className="flex items-center gap-1.5 mb-5 border-b border-gray-100">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`relative px-4 py-3 text-[13.5px] font-semibold transition
              ${tab === t.value ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <i className={`fi ${t.icon} text-base leading-none mr-1.5`} />
            {t.label}
            {tab === t.value && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gray-900 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ============ CONTEÚDO: PACOTES ============ */}
      {tab === 'packages' && (
        <>
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-[13px] text-gray-500">
              <strong className="text-gray-900">{packages.length}</strong> pacote{packages.length !== 1 ? 's' : ''} no total
            </p>
            <button
              onClick={() => setEditing({ name: '', quantity: 10, price_mzn: 100, active: true })}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl
                bg-brand-600 text-white text-[13px] font-semibold
                hover:bg-brand-700 transition shadow-lg shadow-brand-600/25
                active:scale-[0.98]"
            >
              <i className="fi fi-rr-plus text-sm leading-none" />
              <span className="hidden sm:inline">Novo pacote</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>

          {loading ? (
            <LoadingGrid />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {packages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  onEdit={() => setEditing(pkg)}
                  money={money}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ============ CONTEÚDO: PAGAMENTOS ============ */}
      {tab === 'payments' && (
        <>
          {/* Pesquisa */}
          <form onSubmit={handleSearch} className="relative mb-4">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <i className="fi fi-rr-search text-base leading-none" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por nome, email ou referência..."
              className="w-full pl-11 pr-24 py-3 rounded-2xl border border-gray-200 bg-white
                text-[14px] placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3.5 py-1.5 rounded-xl
                bg-gray-900 text-white text-[12px] font-semibold hover:bg-gray-800 transition"
            >
              Procurar
            </button>
          </form>

          {purchasesLoading ? (
            <LoadingGrid />
          ) : purchases.length === 0 ? (
            <EmptyState
              icon="fi-sr-money-bill-wave"
              title="Sem pagamentos"
              desc="Ainda não houve compras de pacotes."
            />
          ) : (
            <>
              {/* Desktop: tabela */}
              <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 px-5 py-3">
                        Utilizador
                      </th>
                      <th className="text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 px-5 py-3">
                        Pacote
                      </th>
                      <th className="text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 px-5 py-3">
                        Referência
                      </th>
                      <th className="text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400 px-5 py-3">
                        Valor
                      </th>
                      <th className="text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400 px-5 py-3">
                        Data
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-brand-100 overflow-hidden shrink-0">
                              {p.user_avatar ? (
                                <img src={p.user_avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <i className="fi fi-sr-user text-brand-600 text-sm leading-none" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13.5px] font-bold text-gray-900 truncate">
                                {p.user_name}
                              </p>
                              <p className="text-[11.5px] text-gray-500 truncate">
                                {p.user_email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-[13.5px] font-semibold text-gray-900">
                            {p.package_name}
                          </p>
                          <p className="text-[11.5px] text-gray-500">
                            {p.quantity} contactos
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          {p.payment_ref ? (
                            <code className="text-[11.5px] font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                              {p.payment_ref}
                            </code>
                          ) : (
                            <span className="text-[12px] text-gray-400 italic">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-display text-[15px] font-extrabold text-gray-900 tabular-nums">
                            {money(p.amount)} MZN
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <p className="text-[12.5px] text-gray-500">
                            {formatDate(p.created_at)}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: cards */}
              <div className="md:hidden space-y-2.5">
                {purchases.map((p) => (
                  <PaymentCard
                    key={p.id}
                    purchase={p}
                    money={money}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ============ MODAL DE EDIÇÃO ============ */}
      {editing && (
        <EditPackageModal
          editing={editing}
          setEditing={setEditing}
          onSave={save}
        />
      )}

      {/* ============ TOAST ============ */}
      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[400]
          px-4 py-2.5 rounded-xl shadow-xl text-[13px] font-semibold
          text-white max-w-[90vw]
          ${toast.type === 'error' ? 'bg-red-600' : 'bg-gray-900'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   StatCard
============================================================ */
function StatCard({ icon, label, value, sub, color }) {
  const colors = {
    green:  'bg-green-50 text-green-600',
    brand:  'bg-brand-50 text-brand-600',
    blue:   'bg-blue-50 text-blue-600',
    amber:  'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${colors[color]}
        flex items-center justify-center mb-2.5`}>
        <i className={`fi ${icon} text-base sm:text-lg leading-none`} />
      </div>
      <p className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-gray-400 truncate">
        {label}
      </p>
      <p className="font-display text-[18px] sm:text-[20px] font-extrabold text-gray-900 mt-1 tabular-nums leading-tight">
        {value}
      </p>
      <p className="text-[11px] text-gray-500 mt-0.5 truncate">{sub}</p>
    </div>
  );
}

/* ============================================================
   PackageCard
============================================================ */
function PackageCard({ pkg, onEdit, money }) {
  const perUnit = pkg.quantity > 0 ? (pkg.price_mzn / pkg.quantity).toFixed(0) : 0;

  return (
    <div className={`bg-white rounded-2xl border-2 p-5 transition-all
      ${pkg.active
        ? 'border-gray-100 hover:border-brand-200 hover:shadow-lg'
        : 'border-dashed border-gray-200 opacity-60'}`}>

      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center
          ${pkg.active ? 'bg-brand-50' : 'bg-gray-100'}`}>
          <i className={`fi fi-sr-ticket text-lg leading-none
            ${pkg.active ? 'text-brand-600' : 'text-gray-400'}`} />
        </div>

        {!pkg.active && (
          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500
            text-[9.5px] font-bold uppercase tracking-wider">
            Inactivo
          </span>
        )}
      </div>

      <p className="font-display text-[16px] font-extrabold text-gray-900 truncate">
        {pkg.name}
      </p>

      <div className="flex items-baseline gap-1.5 mt-2">
        <span className="font-display text-[26px] font-extrabold text-gray-900 tabular-nums leading-none">
          {money(pkg.price_mzn)}
        </span>
        <span className="text-[12px] font-bold text-gray-400">MZN</span>
      </div>

      <div className="flex items-center gap-1.5 mt-1.5 text-[11.5px] text-gray-500">
        <span>{pkg.quantity} contactos</span>
        <span className="text-gray-300">·</span>
        <span>{perUnit} MZN cada</span>
      </div>

      <button
        onClick={onEdit}
        className="mt-4 w-full py-2.5 rounded-xl bg-gray-900 text-white
          text-[12.5px] font-bold hover:bg-gray-800 active:scale-[0.98] transition
          flex items-center justify-center gap-2"
      >
        <i className="fi fi-rr-pencil text-sm leading-none" />
        Editar
      </button>
    </div>
  );
}

/* ============================================================
   PaymentCard (mobile)
============================================================ */
function PaymentCard({ purchase, money, formatDate }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-brand-100 overflow-hidden shrink-0">
          {purchase.user_avatar ? (
            <img src={purchase.user_avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <i className="fi fi-sr-user text-brand-600 text-base leading-none" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-gray-900 truncate">
                {purchase.user_name}
              </p>
              <p className="text-[11.5px] text-gray-500 truncate">
                {purchase.user_email}
              </p>
            </div>
            <span className="shrink-0 font-display text-[15px] font-extrabold text-green-600 tabular-nums">
              +{money(purchase.amount)} MZN
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <i className="fi fi-sr-ticket text-brand-600 text-sm leading-none shrink-0" />
          <span className="text-[12.5px] font-semibold text-gray-700 truncate">
            {purchase.package_name}
          </span>
          <span className="text-[11.5px] text-gray-400 shrink-0">
            · {purchase.quantity}
          </span>
        </div>
        <span className="text-[11px] text-gray-400 shrink-0">
          {formatDate(purchase.created_at).split(',')[0]}
        </span>
      </div>

      {purchase.payment_ref && (
        <div className="mt-2">
          <code className="text-[10.5px] font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded block truncate">
            {purchase.payment_ref}
          </code>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Modal de edição
============================================================ */
function EditPackageModal({ editing, setEditing, onSave }) {
  const perUnit = editing.quantity > 0
    ? (parseFloat(editing.price_mzn) / parseInt(editing.quantity)).toFixed(0)
    : 0;

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center">
      <div
        onClick={() => setEditing(null)}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl
        max-h-[92vh] overflow-y-auto
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

        <div className="sm:hidden w-12 h-1.5 rounded-full bg-gray-300 mx-auto mt-3" />

        {/* Header */}
        <div className="sticky top-0 bg-white px-6 pt-5 pb-4 border-b border-gray-100 z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center">
              <i className={`fi ${editing.id ? 'fi-rr-pencil' : 'fi-rr-plus'}
                text-brand-600 text-lg leading-none`} />
            </div>
            <div>
              <h3 className="font-display text-[18px] font-extrabold text-gray-900">
                {editing.id ? 'Editar pacote' : 'Novo pacote'}
              </h3>
              <p className="text-[12px] text-gray-500 mt-0.5">
                {editing.id ? 'Actualiza os detalhes' : 'Adiciona um novo pacote'}
              </p>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[12.5px] font-semibold text-gray-700 mb-1.5">
              Nome do pacote
            </label>
            <input
              type="text"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="Ex.: 10 contactos"
              className="w-full px-3.5 py-3 rounded-xl border border-gray-200 bg-white
                text-[14px] placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12.5px] font-semibold text-gray-700 mb-1.5">
                Quantidade
              </label>
              <input
                type="number"
                min="1"
                value={editing.quantity}
                onChange={(e) => setEditing({ ...editing, quantity: e.target.value })}
                className="w-full px-3.5 py-3 rounded-xl border border-gray-200 bg-white
                  text-[14px] tabular-nums
                  focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold text-gray-700 mb-1.5">
                Preço (MZN)
              </label>
              <input
                type="number"
                min="0"
                step="10"
                value={editing.price_mzn}
                onChange={(e) => setEditing({ ...editing, price_mzn: e.target.value })}
                className="w-full px-3.5 py-3 rounded-xl border border-gray-200 bg-white
                  text-[14px] tabular-nums
                  focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Preview do preço unitário */}
          {editing.quantity > 0 && editing.price_mzn > 0 && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl
              bg-brand-50 border border-brand-100">
              <i className="fi fi-sr-info text-brand-600 text-sm leading-none" />
              <p className="text-[12.5px] text-brand-800">
                <strong className="tabular-nums">{perUnit} MZN</strong> por contacto
              </p>
            </div>
          )}

          <label className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200
            cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition">
            <input
              type="checkbox"
              checked={editing.active}
              onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500/40"
            />
            <div>
              <p className="text-[13.5px] font-semibold text-gray-900">
                Pacote activo
              </p>
              <p className="text-[11.5px] text-gray-500">
                Visível para os utilizadores na página de planos
              </p>
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100
          flex gap-2">
          <button
            onClick={() => setEditing(null)}
            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700
              font-semibold text-[14px] hover:bg-gray-200 active:bg-gray-300 transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(editing)}
            disabled={!editing.name?.trim() || !editing.quantity || !editing.price_mzn}
            className="flex-1 py-3 rounded-xl bg-brand-600 text-white
              font-bold text-[14px]
              hover:bg-brand-700 active:scale-[0.98] transition
              shadow-lg shadow-brand-600/25
              disabled:opacity-40 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            <i className="fi fi-rr-check text-sm leading-none" />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   EmptyState
============================================================ */
function EmptyState({ icon, title, desc }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <i className={`fi ${icon} text-gray-400 text-2xl leading-none`} />
      </div>
      <p className="font-display text-[16px] font-extrabold text-gray-900">
        {title}
      </p>
      <p className="text-[13px] text-gray-500 mt-1 max-w-xs mx-auto">
        {desc}
      </p>
    </div>
  );
}

/* ============================================================
   LoadingGrid
============================================================ */
function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
          <div className="w-11 h-11 rounded-xl bg-gray-100 mb-3" />
          <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
          <div className="h-6 bg-gray-100 rounded w-1/2 mb-3" />
          <div className="h-9 bg-gray-100 rounded-xl" />
        </div>
      ))}
    </div>
  );
}