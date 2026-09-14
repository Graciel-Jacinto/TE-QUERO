import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const STATUSES = [
  { value: 'all',       label: 'Todas',     color: 'gray' },
  { value: 'pending',   label: 'Pendentes', color: 'amber' },
  { value: 'reviewing', label: 'Análise',   color: 'blue' },
  { value: 'resolved',  label: 'Resolvidas',color: 'green' },
  { value: 'dismissed', label: 'Arquivadas',color: 'gray' },
];

const REASON_LABELS = {
  fake:      'Perfil falso',
  offensive: 'Conteúdo ofensivo',
  spam:      'Spam',
  minor:     'Menor de idade',
  other:     'Outro',
};

const REASON_COLORS = {
  fake:      'bg-purple-50 text-purple-700 border-purple-100',
  offensive: 'bg-red-50 text-red-700 border-red-100',
  spam:      'bg-amber-50 text-amber-700 border-amber-100',
  minor:     'bg-rose-50 text-rose-700 border-rose-100',
  other:     'bg-gray-50 text-gray-700 border-gray-100',
};

export default function AdminReports() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type: 'ban'|'suspend', report }

  /* ---------- Carregar ---------- */
  const load = async () => {
    setLoading(true);
    const [reportsRes, countsRes] = await Promise.all([
      supabase.rpc('admin_list_all_reports'),
      supabase.rpc('admin_reports_counts'),
    ]);
    setReports(reportsRes.data || []);
    setCounts(countsRes.data || {});
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  /* ---------- Acções ---------- */
  const updateStatus = async (reportId, newStatus) => {
    await supabase.rpc('admin_update_report', {
      report_id: reportId,
      new_status: newStatus,
    });
    showToast('Estado actualizado.');
    load();
  };

  const handleBan = async (userId, reason) => {
    setActionLoading(true);
    const { data } = await supabase.rpc('admin_ban_user', {
      target_user: userId,
      reason: reason || 'Violação grave das regras',
    });
    setActionLoading(false);
    setConfirm(null);
    if (data?.success) {
      showToast('Utilizador banido.', 'error');
      load();
    }
  };

  const handleSuspend = async (userId, reason) => {
    setActionLoading(true);
    const { data } = await supabase.rpc('admin_suspend_user', {
      target_user: userId,
      days: 7,
      reason: reason || 'Violação das regras',
    });
    setActionLoading(false);
    setConfirm(null);
    if (data?.success) {
      showToast('Utilizador suspenso por 7 dias.');
      load();
    }
  };

  /* ---------- Filtragem ---------- */
  const filtered = useMemo(() => {
    let list = reports;

    if (filter !== 'all') {
      list = list.filter((r) => r.status === filter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.reporter_name?.toLowerCase().includes(q) ||
        r.reported_name?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [reports, filter, search]);

  /* ---------- UI ---------- */
  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">

      {/* ============ CABEÇALHO ============ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-[22px] sm:text-[26px] lg:text-[30px]
              font-extrabold tracking-tight text-gray-900">
              Denúncias
            </h1>
            {counts.pending > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                bg-amber-100 text-amber-700 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {counts.pending} nova{counts.pending !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-[13px] sm:text-[14px] text-gray-500 mt-1">
            Analisa e resolve as denúncias da comunidade.
          </p>
        </div>

        <button
          onClick={load}
          className="self-start sm:self-auto inline-flex items-center gap-2
            px-3.5 py-2 rounded-xl bg-white border border-gray-200
            text-gray-700 text-[12.5px] sm:text-[13px] font-semibold
            hover:border-brand-300 hover:text-brand-700
            active:scale-[0.98] transition shrink-0"
        >
          <i className="fi fi-rr-refresh text-sm leading-none" />
          Actualizar
        </button>
      </div>

      {/* ============ CARDS DE RESUMO ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 lg:gap-4">
        <SummaryCard
          label="Pendentes"
          value={counts.pending || 0}
          icon="fi-sr-time-quarter-to"
          color="amber"
          active={filter === 'pending'}
          onClick={() => setFilter('pending')}
        />
        <SummaryCard
          label="Em análise"
          value={counts.reviewing || 0}
          icon="fi-sr-search"
          color="blue"
          active={filter === 'reviewing'}
          onClick={() => setFilter('reviewing')}
        />
        <SummaryCard
          label="Resolvidas"
          value={counts.resolved || 0}
          icon="fi-sr-check-circle"
          color="green"
          active={filter === 'resolved'}
          onClick={() => setFilter('resolved')}
        />
        <SummaryCard
          label="Total"
          value={counts.total || 0}
          icon="fi-sr-flag"
          color="brand"
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />
      </div>

      {/* ============ PESQUISA + FILTROS ============ */}
      <div className="space-y-3">
        {/* Pesquisa */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <i className="fi fi-rr-search text-base leading-none" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome do denunciante ou denunciado..."
            className="w-full pl-11 pr-24 py-3 rounded-2xl border border-gray-200 bg-white
              text-[14px] placeholder:text-gray-400
              focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500
              transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full
                flex items-center justify-center text-gray-400 hover:bg-gray-100 transition"
            >
              <i className="fi fi-rr-cross-small text-base leading-none" />
            </button>
          )}
        </div>

        {/* Filtros em pills com contador */}
        <div className="flex items-center gap-1.5 overflow-x-auto chip-scroll pb-1">
          <style>{`
            .chip-scroll::-webkit-scrollbar { display: none; }
            .chip-scroll { scrollbar-width: none; }
          `}</style>

          {STATUSES.map((s) => {
            const c = counts[s.value === 'all' ? 'total' : s.value] || 0;
            const active = filter === s.value;
            return (
              <button
                key={s.value}
                onClick={() => setFilter(s.value)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full
                  text-[12.5px] font-semibold transition
                  ${active
                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/25'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                {s.label}
                <span className={`min-w-[18px] h-4 px-1 rounded-full text-[10px] font-bold
                  flex items-center justify-center
                  ${active ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {c}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============ LISTA ============ */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-100" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-100 rounded w-24 mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-32" />
                </div>
              </div>
              <div className="h-12 bg-gray-100 rounded-xl mb-4" />
              <div className="h-10 bg-gray-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          filter={filter}
          hasSearch={!!search.trim()}
          onClear={() => { setSearch(''); setFilter('all'); }}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              isAdmin={isAdmin}
              expanded={expanded === r.id}
              onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
              onViewProfile={() => navigate(`/app/perfil/${r.reported_user_id}`)}
              onUpdateStatus={(status) => updateStatus(r.id, status)}
              onBan={() => setConfirm({ type: 'ban', report: r })}
              onSuspend={() => setConfirm({ type: 'suspend', report: r })}
            />
          ))}
        </div>
      )}

      {/* ============ MODAL DE CONFIRMAÇÃO ============ */}
      {confirm && (
        <ConfirmModal
          confirm={confirm}
          loading={actionLoading}
          onClose={() => setConfirm(null)}
          onConfirm={(reason) => {
            if (confirm.type === 'ban') {
              handleBan(confirm.report.reported_user_id, reason);
            } else {
              handleSuspend(confirm.report.reported_user_id, reason);
            }
          }}
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
   SummaryCard
============================================================ */
function SummaryCard({ label, value, icon, color, active, onClick }) {
  const colors = {
    amber: 'bg-amber-50 text-amber-600',
    blue:  'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    brand: 'bg-brand-50 text-brand-600',
  };

  return (
    <button
      onClick={onClick}
      className={`group bg-white rounded-2xl border-2 p-3 sm:p-4 lg:p-5 text-left
        transition-all min-w-0
        ${active
          ? 'border-brand-500 shadow-lg shadow-brand-500/10'
          : 'border-gray-100 hover:border-gray-200 hover:shadow-md hover:-translate-y-0.5'}`}
    >
      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${colors[color]}
        flex items-center justify-center mb-2.5 sm:mb-3`}>
        <i className={`fi ${icon} text-base sm:text-lg leading-none`} />
      </div>

      <p className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-gray-400 truncate">
        {label}
      </p>

      <p className="font-display text-[22px] sm:text-[26px] font-extrabold text-gray-900
        mt-1 tabular-nums leading-none">
        {value}
      </p>
    </button>
  );
}

/* ============================================================
   ReportCard
============================================================ */
function ReportCard({
  report: r,
  isAdmin,
  expanded,
  onToggle,
  onViewProfile,
  onUpdateStatus,
  onBan,
  onSuspend,
}) {
  const statusStyle = {
    pending:   { bg: 'bg-amber-100 text-amber-700', label: 'Pendente' },
    reviewing: { bg: 'bg-blue-100 text-blue-700',  label: 'Em análise' },
    resolved:  { bg: 'bg-green-100 text-green-700',label: 'Resolvida' },
    dismissed: { bg: 'bg-gray-100 text-gray-600',  label: 'Arquivada' },
  }[r.status] || { bg: 'bg-gray-100 text-gray-600', label: r.status };

  const reasonStyle = REASON_COLORS[r.reason] || REASON_COLORS.other;

  const canAct = r.status !== 'resolved' && r.status !== 'dismissed';

  return (
    <div className={`bg-white rounded-2xl border transition-all
      ${expanded ? 'border-brand-200 shadow-lg shadow-brand-500/5' : 'border-gray-100 hover:border-gray-200'}`}>

      {/* Cabeçalho — clicável para expandir */}
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-4 sm:p-5 text-left"
      >
        {/* Avatar do denunciado */}
        <div className="relative shrink-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-red-100 overflow-hidden
            flex items-center justify-center border-2 border-white shadow-sm">
            {r.reported_avatar ? (
              <img src={r.reported_avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <i className="fi fi-sr-user text-red-600 text-base leading-none" />
            )}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full
            bg-red-500 flex items-center justify-center border-2 border-white">
            <i className="fi fi-sr-flag text-white text-[8px] leading-none" />
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-[14px] sm:text-[15px] text-gray-900 truncate">
                {r.reported_name}
              </p>
              <p className="text-[11.5px] sm:text-[12.5px] text-gray-500 truncate mt-0.5">
                Denunciado por <strong className="text-gray-700">{r.reporter_name}</strong>
                {' · '}
                {timeAgo(r.created_at)}
              </p>
            </div>

            <span className={`shrink-0 px-2 py-1 rounded-full text-[9.5px] sm:text-[10px]
              font-bold uppercase tracking-wider ${statusStyle.bg}`}>
              {statusStyle.label}
            </span>
          </div>

          {/* Motivo compacto */}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
              text-[10.5px] font-bold border ${reasonStyle}`}>
              <i className="fi fi-sr-exclamation text-[10px] leading-none" />
              {REASON_LABELS[r.reason] || r.reason}
            </span>
          </div>
        </div>

        {/* Chevron */}
        <i className={`fi fi-rr-angle-small-${expanded ? 'up' : 'down'} text-gray-400
          text-lg leading-none shrink-0 mt-2 transition-transform`} />
      </button>

      {/* Conteúdo expandido */}
      {expanded && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4 border-t border-gray-50 pt-4">

          {/* Detalhes do denunciante */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
            <div className="w-10 h-10 rounded-full bg-brand-100 overflow-hidden shrink-0">
              {r.reporter_avatar ? (
                <img src={r.reporter_avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <i className="fi fi-sr-user text-brand-600 text-sm leading-none" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                Quem denunciou
              </p>
              <p className="font-bold text-[13.5px] text-gray-900 truncate">
                {r.reporter_name}
              </p>
            </div>
          </div>

          {/* Detalhes adicionais */}
          {r.details && (
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Detalhes
              </p>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {r.details}
                </p>
              </div>
            </div>
          )}

          {/* Acções principais */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onViewProfile}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                bg-white border border-gray-200 text-gray-700
                text-[12.5px] font-semibold hover:border-brand-300
                hover:text-brand-700 active:scale-[0.98] transition"
            >
              <i className="fi fi-rr-user text-sm leading-none" />
              Ver perfil
            </button>

            {isAdmin && canAct && (
              <>
                <button
                  onClick={onSuspend}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                    bg-amber-50 text-amber-700 border border-amber-100
                    text-[12.5px] font-semibold hover:bg-amber-100
                    active:scale-[0.98] transition"
                >
                  <i className="fi fi-rr-time-quarter-to text-sm leading-none" />
                  Suspender
                </button>

                <button
                  onClick={onBan}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                    bg-red-600 text-white text-[12.5px] font-bold
                    hover:bg-red-700 active:scale-[0.98] transition
                    shadow-sm shadow-red-500/25"
                >
                  <i className="fi fi-rr-ban text-sm leading-none" />
                  Banir
                </button>
              </>
            )}
          </div>

          {/* Estados */}
          {canAct && (
            <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
              <button
                onClick={() => onUpdateStatus('reviewing')}
                disabled={r.status === 'reviewing'}
                className="flex-1 py-2.5 rounded-xl bg-blue-50 text-blue-700
                  text-[12px] sm:text-[12.5px] font-bold hover:bg-blue-100
                  active:scale-[0.98] transition
                  disabled:opacity-40 disabled:cursor-not-allowed
                  flex items-center justify-center gap-1.5"
              >
                <i className="fi fi-rr-search text-sm leading-none" />
                <span className="hidden sm:inline">Em análise</span>
                <span className="sm:hidden">Análise</span>
              </button>
              <button
                onClick={() => onUpdateStatus('dismissed')}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700
                  text-[12px] sm:text-[12.5px] font-bold hover:bg-gray-200
                  active:scale-[0.98] transition
                  flex items-center justify-center gap-1.5"
              >
                <i className="fi fi-rr-archive text-sm leading-none" />
                <span className="hidden sm:inline">Arquivar</span>
                <span className="sm:hidden">Arquivar</span>
              </button>
              <button
                onClick={() => onUpdateStatus('resolved')}
                className="flex-1 py-2.5 rounded-xl bg-green-600 text-white
                  text-[12px] sm:text-[12.5px] font-bold hover:bg-green-700
                  active:scale-[0.98] transition shadow-sm shadow-green-500/25
                  flex items-center justify-center gap-1.5"
              >
                <i className="fi fi-rr-check text-sm leading-none" />
                <span className="hidden sm:inline">Resolver</span>
                <span className="sm:hidden">Resolver</span>
              </button>
            </div>
          )}

          {!canAct && (
            <div className={`flex items-center gap-2 p-3 rounded-xl
              ${r.status === 'resolved' ? 'bg-green-50' : 'bg-gray-50'}`}>
              <i className={`fi ${r.status === 'resolved' ? 'fi-sr-check-circle text-green-600' : 'fi-sr-archive text-gray-500'} text-base leading-none`} />
              <p className={`text-[12.5px] font-medium ${r.status === 'resolved' ? 'text-green-800' : 'text-gray-600'}`}>
                {r.status === 'resolved'
                  ? 'Esta denúncia já foi resolvida.'
                  : 'Esta denúncia foi arquivada.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   ConfirmModal
============================================================ */
function ConfirmModal({ confirm, loading, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const isBan = confirm.type === 'ban';
  const user = confirm.report.reported_name;

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl
        p-5 sm:p-6 pb-6 sm:pb-8 max-h-[90vh] overflow-y-auto
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

        <div className="sm:hidden w-12 h-1.5 rounded-full bg-gray-300 mx-auto mb-4" />

        {/* Ícone */}
        <div className="flex justify-center mb-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center
            ${isBan ? 'bg-red-50' : 'bg-amber-50'}`}>
            <i className={`fi ${isBan ? 'fi-sr-ban text-red-600' : 'fi-sr-time-quarter-to text-amber-600'}
              text-2xl leading-none`} />
          </div>
        </div>

        <h3 className="font-display text-[18px] sm:text-[20px] font-extrabold text-gray-900 text-center">
          {isBan ? 'Banir utilizador?' : 'Suspender 7 dias?'}
        </h3>

        <p className="mt-2 text-[13.5px] text-gray-600 text-center leading-relaxed">
          Vais {isBan ? 'banir permanentemente' : 'suspender por 7 dias'}{' '}
          <strong className="text-gray-900">{user}</strong>.
          {isBan && (
            <> Esta acção <strong className="text-red-700">não pode ser revertida</strong> sem contacto manual.</>
          )}
        </p>

        {/* Motivo */}
        <div className="mt-5">
          <label className="block text-[12.5px] font-semibold text-gray-700 mb-1.5">
            Motivo <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={isBan
              ? 'Ex.: Violação grave das regras da casa...'
              : 'Ex.: Conteúdo ofensivo reportado...'}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200
              text-[13.5px] resize-none
              focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
          />
        </div>

        {/* Botões */}
        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700
              font-semibold text-[14px] hover:bg-gray-200
              disabled:opacity-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading}
            className={`flex-1 py-3 rounded-xl font-bold text-[14px]
              active:scale-[0.98] transition
              disabled:opacity-60
              flex items-center justify-center gap-2
              ${isBan
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/25'
                : 'bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-500/25'}`}
          >
            {loading ? (
              <>
                <span className="h-4 w-4 border-2 border-white/40 border-t-white
                  rounded-full animate-spin" />
                A processar...
              </>
            ) : (
              <>
                <i className={`fi ${isBan ? 'fi-rr-ban' : 'fi-rr-check'} text-sm leading-none`} />
                {isBan ? 'Banir' : 'Suspender'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   EmptyState
============================================================ */
function EmptyState({ filter, hasSearch, onClear }) {
  const config = {
    all:       { icon: 'fi-sr-flag',          title: 'Sem denúncias',       desc: 'A comunidade está em paz 🎉' },
    pending:   { icon: 'fi-sr-check-circle',  title: 'Sem pendentes',       desc: 'Todas as denúncias foram tratadas.' },
    reviewing: { icon: 'fi-sr-search',        title: 'Sem análises',        desc: 'Nada em análise neste momento.' },
    resolved:  { icon: 'fi-sr-archive',       title: 'Sem resolvidas',      desc: 'Ainda não resolveste nenhuma.' },
    dismissed: { icon: 'fi-sr-archive',       title: 'Sem arquivadas',      desc: 'Nada foi arquivado.' },
  }[filter] || { icon: 'fi-sr-flag', title: 'Sem resultados', desc: '' };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 py-14 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <i className={`fi ${hasSearch ? 'fi-rr-search' : config.icon} text-gray-400 text-2xl leading-none`} />
      </div>
      <p className="font-display text-[15px] font-extrabold text-gray-900">
        {hasSearch ? 'Sem resultados' : config.title}
      </p>
      <p className="text-[13px] text-gray-500 mt-1 max-w-xs mx-auto">
        {hasSearch
          ? `Nada corresponde à tua pesquisa.`
          : config.desc}
      </p>
      {(hasSearch || filter !== 'all') && (
        <button
          onClick={onClear}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl
            bg-gray-900 text-white text-[12.5px] font-semibold
            hover:bg-gray-800 active:scale-[0.98] transition"
        >
          <i className="fi fi-rr-refresh text-sm leading-none" />
          Limpar filtros
        </button>
      )}
    </div>
  );
}

/* ============================================================
   Helpers
============================================================ */
function timeAgo(iso) {
  if (!iso) return '';
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'agora';
  if (d < 3600) return `${Math.floor(d / 60)}m atrás`;
  if (d < 86400) return `${Math.floor(d / 3600)}h atrás`;
  if (d < 604800) return `${Math.floor(d / 86400)}d atrás`;
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
}