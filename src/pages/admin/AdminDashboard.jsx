import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminDashboard() {
  const { isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_dashboard_full');
    if (error) console.error('dashboard error:', error);
    setStats(data || {});
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  const s = stats || {};
  const greeting = getGreeting();
  const firstName = profile?.name?.split(' ')[0] || 'Admin';

  const contactsDelta = diff(s.contacts_today, s.contacts_yesterday);
  const messagesDelta = diff(s.messages_today, s.messages_yesterday);
  const usersDelta = diff(s.new_users_week, s.new_users_prev_week);
  const revenueDelta = diff(s.revenue_month, s.revenue_last_month);

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">

      {/* ============ SAUDAÇÃO ============ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[20px] xs:text-[22px] sm:text-[26px] lg:text-[28px]
            font-extrabold tracking-tight text-gray-900 truncate">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-[12px] sm:text-[13px] lg:text-[13.5px] text-gray-500 mt-1 capitalize">
            {new Date().toLocaleDateString('pt-PT', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>

        <button
          onClick={load}
          className="self-start sm:self-auto inline-flex items-center gap-2
            px-3.5 py-2 rounded-xl
            bg-white border border-gray-200 text-gray-700 text-[12.5px] sm:text-[13px] font-semibold
            hover:border-brand-300 hover:text-brand-700 active:scale-[0.98] transition shrink-0"
        >
          <i className="fi fi-rr-refresh text-sm leading-none" />
          Actualizar
        </button>
      </div>

      {/* ============ ALERTA DENÚNCIAS ============ */}
      {s.pending_reports > 0 && (
        <button
          onClick={() => navigate('/admin/denuncias')}
          className="w-full flex items-center gap-3 p-3 sm:p-4 rounded-2xl
            bg-amber-50 border border-amber-200
            hover:border-amber-300 hover:shadow-lg hover:shadow-amber-500/10
            active:scale-[0.99] transition-all text-left"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-100
            flex items-center justify-center shrink-0">
            <i className="fi fi-sr-flag text-amber-600 text-base sm:text-lg leading-none" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] sm:text-[14px] font-bold text-amber-900 truncate">
              {s.pending_reports} denúncia{s.pending_reports !== 1 ? 's' : ''} por resolver
            </p>
            <p className="text-[11.5px] sm:text-[12px] text-amber-800 mt-0.5 truncate">
              Clica para analisar e tomar acção
            </p>
          </div>
          <i className="fi fi-rr-angle-small-right text-amber-600 text-lg sm:text-xl leading-none shrink-0" />
        </button>
      )}

      {/* ============ 4 KPIs ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 lg:gap-4">
        <KpiCard
          icon="fi-sr-users"
          label="Utilizadores"
          value={s.total_users ?? 0}
          trend={usersDelta}
          trendLabel="vs sem. ant."
          color="brand"
          onClick={() => navigate('/admin/contas')}
        />
        <KpiCard
          icon="fi-sr-money-bill-wave"
          label="Receita do mês"
          value={`${money(s.revenue_month)} MZN`}
          trend={revenueDelta}
          trendLabel="vs mês ant."
          color="green"
          onClick={() => navigate('/admin/planos')}
        />
        <KpiCard
          icon="fi-sr-comment"
          label="Mensagens hoje"
          value={s.messages_today ?? 0}
          trend={messagesDelta}
          trendLabel="vs ontem"
          color="blue"
        />
        <KpiCard
          icon="fi-sr-heart"
          label="Contactos hoje"
          value={s.contacts_today ?? 0}
          trend={contactsDelta}
          trendLabel="vs ontem"
          color="rose"
        />
      </div>

      {/* ============ GRÁFICO + ESTADO ============ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 lg:gap-4">

        {/* Gráfico */}
        <div className="xl:col-span-2 bg-white rounded-2xl lg:rounded-3xl
          border border-gray-100 p-4 sm:p-5 lg:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 sm:mb-5">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-50
                flex items-center justify-center shrink-0">
                <i className="fi fi-sr-chart-histogram text-brand-600 text-base sm:text-lg leading-none" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-[14px] sm:text-[15px] lg:text-[16px]
                  font-extrabold text-gray-900 truncate">
                  Actividade da semana
                </h2>
                <p className="text-[11px] sm:text-[11.5px] text-gray-500 mt-0.5 truncate">
                  Contactos e mensagens por dia
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[10.5px] sm:text-[11px] font-semibold shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-brand-500" />
                <span className="text-gray-600">Contactos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-400" />
                <span className="text-gray-600">Mensagens</span>
              </div>
            </div>
          </div>

          <WeekChart data={s.series || []} />
        </div>

        {/* Estado */}
        <div className="bg-white rounded-2xl lg:rounded-3xl border border-gray-100 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-green-50
              flex items-center justify-center shrink-0">
              <i className="fi fi-sr-shield-check text-green-600 text-base sm:text-lg leading-none" />
            </div>
            <h2 className="font-display text-[14px] sm:text-[15px] lg:text-[16px]
              font-extrabold text-gray-900 truncate">
              Estado da plataforma
            </h2>
          </div>

          <div className="space-y-3">
            <StatusRow
              icon="fi-sr-user-check"
              label="Verificados"
              value={s.total_verified ?? 0}
              total={s.total_users ?? 0}
              color="green"
            />
            <StatusRow
              icon="fi-sr-shield-check"
              label="Admins + Mods"
              value={(s.total_admins ?? 0) + (s.total_moderators ?? 0)}
              total={s.total_users ?? 0}
              color="brand"
            />
            <StatusRow
              icon="fi-sr-time-quarter-to"
              label="Suspensos"
              value={s.total_suspended ?? 0}
              total={s.total_users ?? 0}
              color="amber"
            />
            <StatusRow
              icon="fi-sr-ban"
              label="Banidos"
              value={s.total_banned ?? 0}
              total={s.total_users ?? 0}
              color="red"
            />
          </div>

          <div className="mt-4 sm:mt-5 pt-4 border-t border-gray-100 space-y-2">
            <div className="flex items-center justify-between text-[12px] sm:text-[12.5px]">
              <span className="text-gray-500">Activos hoje</span>
              <span className="font-display font-extrabold text-gray-900 tabular-nums">
                {s.active_today ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between text-[12px] sm:text-[12.5px]">
              <span className="text-gray-500">Conversas totais</span>
              <span className="font-display font-extrabold text-gray-900 tabular-nums">
                {s.total_conversations ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============ ACTIVIDADE RECENTE ============ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 lg:gap-4">

        {/* Novos utilizadores */}
        <div className="bg-white rounded-2xl lg:rounded-3xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between gap-2
            px-4 sm:px-5 lg:px-6 py-3.5 sm:py-4 border-b border-gray-50">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-brand-50
                flex items-center justify-center shrink-0">
                <i className="fi fi-sr-user-add text-brand-600 text-sm sm:text-base leading-none" />
              </div>
              <h2 className="font-display text-[14px] sm:text-[15px] font-extrabold
                text-gray-900 truncate">
                Novos utilizadores
              </h2>
            </div>
            <button
              onClick={() => navigate('/admin/contas')}
              className="text-[11.5px] sm:text-[12px] font-semibold
                text-brand-600 hover:text-brand-700 transition shrink-0"
            >
              Ver todos
            </button>
          </div>

          <div className="divide-y divide-gray-50">
            {(s.recent_signups || []).length === 0 ? (
              <EmptyRow text="Sem novos registos" />
            ) : (
              s.recent_signups.map((u) => (
                <button
                  key={u.id}
                  onClick={() => navigate(`/app/perfil/${u.id}`)}
                  className="w-full flex items-center gap-3
                    px-4 sm:px-5 lg:px-6 py-3
                    hover:bg-gray-50 active:bg-gray-100 transition text-left"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-brand-100
                    overflow-hidden flex items-center justify-center shrink-0">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <i className="fi fi-sr-user text-brand-600 text-sm leading-none" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13px] sm:text-[13.5px] font-bold text-gray-900 truncate">
                        {u.name || 'Sem nome'}
                      </p>
                      {u.is_verified && (
                        <i className="fi fi-sr-badge-check text-blue-500 text-sm leading-none shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] sm:text-[11.5px] text-gray-500 truncate mt-0.5">
                      {u.city || 'Localização não indicada'} · {timeAgo(u.created_at)}
                    </p>
                  </div>
                  <i className="fi fi-rr-angle-small-right text-gray-300 text-base leading-none shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Denúncias recentes */}
        <div className="bg-white rounded-2xl lg:rounded-3xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between gap-2
            px-4 sm:px-5 lg:px-6 py-3.5 sm:py-4 border-b border-gray-50">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-red-50
                flex items-center justify-center shrink-0">
                <i className="fi fi-sr-flag text-red-600 text-sm sm:text-base leading-none" />
              </div>
              <h2 className="font-display text-[14px] sm:text-[15px] font-extrabold
                text-gray-900 truncate">
                Denúncias recentes
              </h2>
            </div>
            <button
              onClick={() => navigate('/admin/denuncias')}
              className="text-[11.5px] sm:text-[12px] font-semibold
                text-brand-600 hover:text-brand-700 transition shrink-0"
            >
              Ver todas
            </button>
          </div>

          <div className="divide-y divide-gray-50">
            {(s.recent_reports || []).length === 0 ? (
              <EmptyRow text="Sem denúncias 🎉" />
            ) : (
              s.recent_reports.map((r) => {
                const statusColors = {
                  pending:   'bg-amber-100 text-amber-700',
                  reviewing: 'bg-blue-100 text-blue-700',
                  resolved:  'bg-green-100 text-green-700',
                  dismissed: 'bg-gray-100 text-gray-600',
                };
                const statusLabel = {
                  pending:   'Pendente',
                  reviewing: 'Análise',
                  resolved:  'Resolvida',
                  dismissed: 'Arquivada',
                };
                return (
                  <button
                    key={r.id}
                    onClick={() => navigate('/admin/denuncias')}
                    className="w-full flex items-start gap-3
                      px-4 sm:px-5 lg:px-6 py-3
                      hover:bg-gray-50 active:bg-gray-100 transition text-left"
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-100
                      overflow-hidden flex items-center justify-center shrink-0">
                      {r.reported_avatar ? (
                        <img src={r.reported_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <i className="fi fi-sr-user text-red-600 text-sm leading-none" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] sm:text-[13.5px] font-bold text-gray-900 truncate">
                        {r.reported_name}
                      </p>
                      <p className="text-[11px] sm:text-[11.5px] text-gray-500 truncate mt-0.5">
                        por {r.reporter_name} · {timeAgo(r.created_at)}
                      </p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full
                      text-[9px] sm:text-[9.5px] font-bold uppercase tracking-wider
                      ${statusColors[r.status] || 'bg-gray-100 text-gray-600'}`}>
                      {statusLabel[r.status] || r.status}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ============ TOP PERFIS + RECEITA ============ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 lg:gap-4">

        {/* Top gostados */}
        <div className="xl:col-span-2 bg-white rounded-2xl lg:rounded-3xl
          border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-2.5 sm:gap-3
            px-4 sm:px-5 lg:px-6 py-3.5 sm:py-4 border-b border-gray-50">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-brand-50
              flex items-center justify-center shrink-0">
              <i className="fi fi-sr-heart text-brand-600 text-sm sm:text-base leading-none" />
            </div>
            <h2 className="font-display text-[14px] sm:text-[15px] font-extrabold
              text-gray-900 truncate">
              Perfis mais gostados
            </h2>
          </div>

          <div className="divide-y divide-gray-50">
            {(s.top_liked || []).length === 0 ? (
              <EmptyRow text="Sem likes registados" />
            ) : (
              s.top_liked.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/app/perfil/${p.id}`)}
                  className="w-full flex items-center gap-2.5 sm:gap-3
                    px-4 sm:px-5 lg:px-6 py-3
                    hover:bg-gray-50 active:bg-gray-100 transition text-left"
                >
                  <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center
                    text-[11px] sm:text-[12px] font-extrabold shrink-0
                    ${i === 0 ? 'bg-amber-100 text-amber-700'
                      : i === 1 ? 'bg-gray-200 text-gray-700'
                      : i === 2 ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-100 text-gray-500'}`}>
                    {i + 1}
                  </span>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-brand-100
                    overflow-hidden flex items-center justify-center shrink-0">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <i className="fi fi-sr-user text-brand-600 text-sm leading-none" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] sm:text-[13.5px] font-bold text-gray-900 truncate">
                      {p.name}
                    </p>
                    <p className="text-[11px] sm:text-[11.5px] text-gray-500 truncate mt-0.5">
                      {p.city || '—'}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 px-2 sm:px-2.5 py-1
                    bg-brand-50 rounded-full">
                    <i className="fi fi-sr-heart text-brand-600 text-[10px] sm:text-[11px] leading-none" />
                    <span className="text-[11px] sm:text-[12px] font-bold text-brand-700 tabular-nums">
                      {p.total_likes}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Receita detalhada */}
        <div className="bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800
          rounded-2xl lg:rounded-3xl p-5 sm:p-6 text-white relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full
            bg-brand-400/40 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full
            bg-brand-300/30 blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <i className="fi fi-sr-money-bill-wave text-white/80 text-base sm:text-lg leading-none" />
              <p className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.15em] text-white/70">
                Receita
              </p>
            </div>

            <p className="text-[10.5px] sm:text-[11px] text-white/70 font-semibold">Hoje</p>
            <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
              <span className="font-display text-[22px] sm:text-[26px] lg:text-[28px]
                font-extrabold tabular-nums leading-none">
                {money(s.revenue_today)}
              </span>
              <span className="text-[11px] sm:text-[12px] font-bold text-white/70">MZN</span>
            </div>

            <div className="h-px bg-white/15 my-4 sm:my-5" />

            <p className="text-[10.5px] sm:text-[11px] text-white/70 font-semibold">Este mês</p>
            <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
              <span className="font-display text-[22px] sm:text-[26px] lg:text-[28px]
                font-extrabold tabular-nums leading-none">
                {money(s.revenue_month)}
              </span>
              <span className="text-[11px] sm:text-[12px] font-bold text-white/70">MZN</span>
            </div>

            {revenueDelta !== null && (
              <div className="mt-3 sm:mt-4 inline-flex items-center gap-1.5
                px-2.5 py-1.5 bg-white/15 backdrop-blur rounded-full">
                <i className={`fi ${
                  revenueDelta >= 0 ? 'fi-rr-arrow-trend-up' : 'fi-rr-arrow-trend-down'
                } text-sm leading-none`} />
                <span className="text-[10.5px] sm:text-[11px] font-bold">
                  {revenueDelta >= 0 ? '+' : ''}{revenueDelta}% vs mês anterior
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============ ATALHOS RÁPIDOS ============ */}
      <div className="bg-white rounded-2xl lg:rounded-3xl border border-gray-100 p-4 sm:p-5 lg:p-6">
        <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gray-50
            flex items-center justify-center shrink-0">
            <i className="fi fi-sr-rocket-lunch text-gray-700 text-sm sm:text-base leading-none" />
          </div>
          <h2 className="font-display text-[14px] sm:text-[15px] font-extrabold text-gray-900 truncate">
            Atalhos rápidos
          </h2>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
          <QuickAction icon="fi-rr-users"          label="Contas"       onClick={() => navigate('/admin/contas')} />
          <QuickAction icon="fi-rr-flag"           label="Denúncias"    onClick={() => navigate('/admin/denuncias')} />
          <QuickAction icon="fi-rr-badge-check"    label="Verificar"    onClick={() => navigate('/admin/verificacoes')} />
          <QuickAction icon="fi-rr-shield-check"   label="Admins"       onClick={() => navigate('/admin/admins')} />
          <QuickAction icon="fi-rr-credit-card"    label="Planos"       onClick={() => navigate('/admin/planos')} />
          <QuickAction icon="fi-rr-arrow-small-left" label="App"        onClick={() => navigate('/app/descobrir')} />
        </div>
      </div>

      {/* ============ AVISO MODERADOR ============ */}
      {!isAdmin && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <div className="flex items-start gap-3">
            <i className="fi fi-rr-info text-amber-600 text-base sm:text-lg leading-none mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[13px] sm:text-[13.5px] font-bold text-amber-900">
                Estás como Moderador
              </p>
              <p className="text-[12px] sm:text-[12.5px] text-amber-800 mt-0.5 leading-snug">
                Só administradores podem banir utilizadores ou gerir outros administradores.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Helpers
============================================================ */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 19) return 'Boa tarde';
  return 'Boa noite';
}

function diff(curr, prev) {
  const c = Number(curr || 0);
  const p = Number(prev || 0);
  if (p === 0) return c > 0 ? 100 : null;
  return Math.round(((c - p) / p) * 100);
}

function money(n) {
  return Number(n || 0).toLocaleString('pt-PT', { minimumFractionDigits: 0 });
}

function timeAgo(iso) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'agora';
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  if (d < 604800) return `${Math.floor(d / 86400)}d`;
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
}

/* ============================================================
   KpiCard
============================================================ */
function KpiCard({ icon, label, value, trend, trendLabel, color, onClick }) {
  const colors = {
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-green-50 text-green-600',
    blue:  'bg-blue-50 text-blue-600',
    rose:  'bg-rose-50 text-rose-600',
  };

  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      onClick={onClick}
      className={`group bg-white rounded-2xl border border-gray-100
        p-3 sm:p-4 lg:p-5 text-left min-w-0
        ${onClick
          ? 'hover:border-brand-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] transition-all'
          : ''}`}
    >
      <div className={`w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-xl ${colors[color]}
        flex items-center justify-center mb-2 sm:mb-3`}>
        <i className={`fi ${icon} text-base sm:text-lg lg:text-xl leading-none`} />
      </div>

      <p className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider
        text-gray-400 truncate">
        {label}
      </p>

      <p className="font-display text-[18px] sm:text-[22px] lg:text-[26px] font-extrabold
        text-gray-900 mt-1 tabular-nums leading-none truncate">
        {value}
      </p>

      {trend !== null && trend !== undefined && (
        <div className="flex items-center gap-1.5 mt-1.5 sm:mt-2 min-w-0">
          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md
            text-[9.5px] sm:text-[10px] font-bold shrink-0
            ${trend > 0 ? 'bg-green-100 text-green-700'
              : trend < 0 ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-600'}`}>
            <i className={`fi ${
              trend > 0 ? 'fi-rr-arrow-trend-up'
                : trend < 0 ? 'fi-rr-arrow-trend-down'
                : 'fi-rr-minus-small'
            } text-[9px] leading-none`} />
            {trend > 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-[10px] sm:text-[10.5px] text-gray-400 truncate">
            {trendLabel}
          </span>
        </div>
      )}
    </Comp>
  );
}

/* ============================================================
   Gráfico de barras
============================================================ */
function WeekChart({ data }) {
  if (!data.length) {
    return (
      <div className="h-40 sm:h-48 flex items-center justify-center">
        <p className="text-[12.5px] text-gray-400">Sem dados disponíveis</p>
      </div>
    );
  }

  const max = Math.max(
    ...data.map((d) => Math.max(d.contacts || 0, d.messages || 0)),
    1
  );

  return (
    <div className="flex items-end justify-between gap-1.5 sm:gap-2 lg:gap-3
      h-32 xs:h-36 sm:h-40 lg:h-48 pt-2">
      {data.map((d, i) => {
        const hContacts = max > 0 ? ((d.contacts || 0) / max) * 100 : 0;
        const hMessages = max > 0 ? ((d.messages || 0) / max) * 100 : 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="w-full flex items-end justify-center gap-0.5 flex-1">
              <div
                className="w-2 xs:w-2.5 sm:w-3 lg:w-3.5 bg-brand-500 rounded-t
                  transition-all duration-500"
                style={{ height: `${Math.max(hContacts, 3)}%` }}
                title={`${d.contacts || 0} contactos`}
              />
              <div
                className="w-2 xs:w-2.5 sm:w-3 lg:w-3.5 bg-blue-400 rounded-t
                  transition-all duration-500"
                style={{ height: `${Math.max(hMessages, 3)}%` }}
                title={`${d.messages || 0} mensagens`}
              />
            </div>
            <span className="text-[9px] sm:text-[10px] lg:text-[10.5px] font-semibold
              text-gray-400 truncate w-full text-center">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   StatusRow
============================================================ */
function StatusRow({ icon, label, value, total, color }) {
  const colors = {
    green: 'bg-green-50 text-green-600',
    brand: 'bg-brand-50 text-brand-600',
    amber: 'bg-amber-50 text-amber-600',
    red:   'bg-red-50 text-red-600',
  };
  const bars = {
    green: 'bg-green-500',
    brand: 'bg-brand-500',
    amber: 'bg-amber-500',
    red:   'bg-red-500',
  };

  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="flex items-center gap-2.5 sm:gap-3">
      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${colors[color]}
        flex items-center justify-center shrink-0`}>
        <i className={`fi ${icon} text-xs sm:text-sm leading-none`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[12px] sm:text-[12.5px] font-semibold text-gray-700 truncate">
            {label}
          </span>
          <span className="text-[11.5px] sm:text-[12px] font-bold text-gray-900
            tabular-nums shrink-0">
            {value}
          </span>
        </div>
        <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${bars[color]}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   QuickAction
============================================================ */
function QuickAction({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 sm:gap-2
        p-2.5 sm:p-3 rounded-xl
        bg-gray-50 border border-gray-100
        hover:bg-brand-50 hover:border-brand-200 active:scale-[0.97]
        transition-all group min-w-0"
    >
      <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-lg bg-white
        flex items-center justify-center shadow-sm
        group-hover:bg-brand-600 transition-colors shrink-0">
        <i className={`fi ${icon} text-gray-600 group-hover:text-white
          text-sm sm:text-base leading-none transition-colors`} />
      </div>
      <span className="text-[10px] sm:text-[11px] font-bold text-gray-600
        group-hover:text-brand-700 transition-colors text-center leading-tight truncate w-full">
        {label}
      </span>
    </button>
  );
}

/* ============================================================
   EmptyRow
============================================================ */
function EmptyRow({ text }) {
  return (
    <div className="py-6 sm:py-8 text-center">
      <p className="text-[12px] sm:text-[12.5px] text-gray-400">{text}</p>
    </div>
  );
}