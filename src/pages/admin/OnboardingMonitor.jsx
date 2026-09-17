import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';

/* ---------- Ordem do funil ---------- */
const FUNNEL = [
  { key: 'welcome_view',       label: '1. Viu boas-vindas' },
  { key: 'welcome_accept',     label: '2. Aceitou boas-vindas' },
  { key: 'rules_view',         label: '3. Viu as regras' },
  { key: 'rules_accept',       label: '4. Aceitou as regras' },
  { key: 'profile_view',       label: '5. Abriu o formulário' },
  { key: 'profile_save_start', label: '6. Submeteu o formulário' },
  { key: 'profile_save_ok',    label: '7. Concluiu ✓' },
];

const TIME_RANGES = [
  { value: 1,    label: '24h' },
  { value: 7,    label: '7 dias' },
  { value: 30,   label: '30 dias' },
  { value: 9999, label: 'Sempre' },
];

/* ---------- Traduzir nomes técnicos ---------- */
const STEP_LABELS = {
  welcome: 'Bem-vindo',
  rules:   'Regras',
  profile: 'Perfil',
  done:    'Completo',
};

const EVENT_LABELS = {
  welcome_view:          'Viu boas-vindas',
  welcome_accept:        'Aceitou boas-vindas',
  rules_view:            'Viu as regras',
  rules_accept_start:    'A aceitar as regras',
  rules_accept:          'Aceitou as regras',
  rules_accept_error:    'Erro ao aceitar regras',
  profile_view:          'Abriu o formulário',
  profile_step_1:        'Passo 1 — Foto e nome',
  profile_step_2:        'Passo 2 — Localização',
  profile_step_3:        'Passo 3 — WhatsApp',
  profile_step_4:        'Passo 4 — Sobre ti',
  profile_save_start:    'Submeteu o formulário',
  profile_save_ok:       'Concluiu ✓',
  profile_save_error:    'Erro ao guardar',
  profile_save_invalid:  'Faltam campos obrigatórios',
  network_error:         'Erro de rede',
  onboarding_abandon:    'Abandonou',
  onboarding_step_view:  'Mudou de página',
  login_start:           'Começou o login',
  login_ok:              'Login com sucesso',
  login_error:           'Falha no login',
};

function labelOfStep(step) {
  return STEP_LABELS[step] || step || '—';
}

function labelOfEvent(step) {
  return EVENT_LABELS[step] || step;
}

/* ---------- Cores/ícones por tipo ---------- */
function eventStyle(step, status) {
  if (step === 'onboarding_abandon') {
    return { icon: 'fi-sr-walking',      color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500' };
  }
  if (step === 'network_error') {
    return { icon: 'fi-sr-wifi-slash',   color: 'text-orange-700 bg-orange-50 border-orange-200', dot: 'bg-orange-500' };
  }
  if (status === 'error') {
    return { icon: 'fi-sr-exclamation',  color: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-500' };
  }
  if (status === 'success') {
    return { icon: 'fi-sr-check',        color: 'text-green-700 bg-green-50 border-green-200', dot: 'bg-green-500' };
  }
  return { icon: 'fi-sr-circle',         color: 'text-gray-700 bg-gray-50 border-gray-200', dot: 'bg-gray-400' };
}

export default function OnboardingMonitor() {
  const [funnel, setFunnel] = useState([]);
  const [users, setUsers] = useState([]);
  const [errors, setErrors] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(7);
  const [activeTab, setActiveTab] = useState('funnel');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [range]);

  async function load() {
    setLoading(true);
    const since = new Date(Date.now() - range * 24 * 60 * 60 * 1000).toISOString();

    // 1. Eventos do período
    const { data: events } = await supabase
      .from('onboarding_events')
      .select('step, user_id, created_at, status, payload')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10000);

    setAllEvents(events || []);

    // 2. Funil
    const uniqueByStep = {};
    (events || []).forEach((e) => {
      uniqueByStep[e.step] = uniqueByStep[e.step] || new Set();
      uniqueByStep[e.step].add(e.user_id);
    });

    const funnelData = FUNNEL.map((s, i) => {
      const count = uniqueByStep[s.key]?.size || 0;
      const prev = i === 0 ? count : (uniqueByStep[FUNNEL[i - 1].key]?.size || 0);
      const drop = prev > 0 ? Math.round(((prev - count) / prev) * 100) : 0;
      return { ...s, count, drop };
    });
    setFunnel(funnelData);

    // 3. Utilizadores
    const { data: profiles, error: pErr } = await supabase.rpc('admin_list_onboarding');
    if (pErr) console.warn('[monitor] rpc:', pErr.message);
    setUsers(profiles || []);

    // 4. Erros + abandonos
    const errs = (events || []).filter(
      (e) => e.status === 'error' || e.step === 'onboarding_abandon'
    );
    setErrors(errs.slice(0, 100));

    setLoading(false);
  }

  /* ---------- Map user_id → perfil ---------- */
  const usersById = useMemo(() => {
    const map = {};
    users.forEach((u) => { map[u.id] = u; });
    return map;
  }, [users]);

  /* ---------- Métricas ---------- */
  const summary = useMemo(() => {
    const total = users.length;
    const completed = users.filter((u) => u.onboarding_completed).length;
    const stuck = total - completed;
    const withError = users.filter((u) => u.onboarding_error).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, stuck, withError, rate };
  }, [users]);

  /* ---------- Filtro ---------- */
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.onboarding_step || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-[26px] font-extrabold tracking-tight text-gray-900">
            Monitorização do Onboarding
          </h1>
          <p className="text-[14px] text-gray-500 mt-1">
            Vê onde cada utilizador está e o caminho completo de cada um.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {TIME_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition
                  ${range === r.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-brand-600 text-white text-[13px] font-semibold
              hover:bg-brand-700 disabled:opacity-60 transition"
          >
            {loading ? 'A carregar…' : 'Refrescar'}
          </button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total"          value={summary.total}      icon="fi-rr-users"           color="gray" />
        <StatCard label="Concluíram"     value={summary.completed}  icon="fi-sr-check-circle"    color="green" />
        <StatCard label="Em curso"       value={summary.stuck}      icon="fi-rr-time-quarter-to" color="amber" />
        <StatCard label="Com erro"       value={summary.withError}  icon="fi-rr-exclamation"     color="red" />
        <StatCard label="Taxa conclusão" value={`${summary.rate}%`} icon="fi-rr-chart-pie"       color="brand" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
        {[
          { key: 'funnel', label: 'Funil' },
          { key: 'users',  label: `Utilizadores (${users.length})` },
          { key: 'errors', label: `Erros (${errors.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-[13.5px] font-semibold transition relative whitespace-nowrap
              ${activeTab === t.key
                ? 'text-brand-600'
                : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
            {activeTab === t.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* ============ TAB: FUNIL ============ */}
      {activeTab === 'funnel' && (
        <section className="bg-white rounded-3xl border border-gray-100 p-6">
          <div className="space-y-3">
            {funnel.map((s, i) => {
              const max = funnel[0]?.count || 1;
              const pct = Math.round((s.count / max) * 100);
              return (
                <div key={s.key} className="flex items-center gap-3">
                  <div className="w-48 sm:w-52 text-[13px] text-gray-700 font-medium shrink-0">
                    {s.label}
                  </div>
                  <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative min-w-0">
                    <div
                      className="h-full bg-gradient-to-r from-brand-500 to-brand-700 text-white
                        text-[11.5px] font-semibold flex items-center px-3 transition-all duration-500"
                      style={{ width: `${Math.max(pct, 3)}%` }}
                    >
                      {s.count} ({pct}%)
                    </div>
                  </div>
                  {i > 0 && s.drop > 0 && (
                    <span className="text-[12px] text-red-600 font-bold w-14 text-right shrink-0">
                      −{s.drop}%
                    </span>
                  )}
                  {i > 0 && s.drop === 0 && (
                    <span className="text-[12px] text-green-600 font-bold w-14 text-right shrink-0">✓</span>
                  )}
                  {i === 0 && <span className="w-14 shrink-0" />}
                </div>
              );
            })}
          </div>

          {funnel[0]?.count === 0 && (
            <p className="text-center text-[13px] text-gray-500 py-8">
              Sem dados no período selecionado.
            </p>
          )}
        </section>
      )}

      {/* ============ TAB: UTILIZADORES ============ */}
      {activeTab === 'users' && (
        <section className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <i className="fi fi-rr-search text-sm leading-none" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por nome, email ou passo..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white
                  text-[13.5px] placeholder:text-gray-400
                  focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
              />
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {filteredUsers.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                onOpen={() => setSelectedUser(u)}
              />
            ))}
            {filteredUsers.length === 0 && (
              <p className="px-4 py-12 text-center text-gray-500 text-[13px]">
                {search ? 'Nenhum resultado para a pesquisa.' : 'Sem utilizadores.'}
              </p>
            )}
          </div>
        </section>
      )}

      {/* ============ TAB: ERROS ============ */}
      {activeTab === 'errors' && (
        <section className="bg-white rounded-3xl border border-gray-100 p-6">
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {errors.map((e, i) => (
              <ErrorCard key={i} event={e} userMap={usersById} />
            ))}
            {errors.length === 0 && (
              <p className="text-[13px] text-gray-500 py-8 text-center">
                Sem erros registados no período 🎉
              </p>
            )}
          </div>
        </section>
      )}

      {/* ============ MODAL: TIMELINE DO USER ============ */}
      {selectedUser && (
        <UserTimeline
          user={selectedUser}
          events={allEvents.filter((e) => e.user_id === selectedUser.id)}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}

/* ============================================================
   TIMELINE DO UTILIZADOR — painel lateral / modal
============================================================ */
function UserTimeline({ user, events, onClose }) {
  // Ordenar cronologicamente (mais antigo → mais recente)
  const timeline = useMemo(
    () => [...events].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [events]
  );

  const initials = (user.name || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const totalTime = useMemo(() => {
    if (timeline.length < 2) return null;
    const first = new Date(timeline[0].created_at).getTime();
    const last = new Date(timeline[timeline.length - 1].created_at).getTime();
    const diff = last - first;
    const min = Math.floor(diff / 60000);
    if (min < 60) return `${min}min`;
    const h = Math.floor(min / 60);
    return `${h}h ${min % 60}min`;
  }, [timeline]);

  return (
    <div className="fixed inset-0 z-[200] flex items-stretch justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
      />

      {/* Painel */}
      <div className="relative w-full max-w-[520px] bg-white shadow-2xl flex flex-col
        animate-[slideInRight_300ms_cubic-bezier(0.22,1,0.36,1)]">

        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideInRight {
            from { transform: translateX(40px); opacity: 0; }
            to   { transform: translateX(0); opacity: 1; }
          }
        `}</style>

        {/* Header */}
        <div className="shrink-0 p-5 border-b border-gray-100 bg-gradient-to-br from-brand-50 to-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0
                font-bold text-[15px]
                ${user.onboarding_completed ? 'bg-green-100 text-green-700' : 'bg-brand-100 text-brand-700'}`}>
                {initials || '?'}
              </div>
              <div className="min-w-0">
                <p className="font-display font-extrabold text-[16px] text-gray-900 truncate">
                  {user.name || 'Sem nome'}
                </p>
                <p className="text-[12px] text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg flex items-center justify-center
                text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition shrink-0"
            >
              <i className="fi fi-rr-cross-small text-xl leading-none" />
            </button>
          </div>

          {/* Estado + resumo */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-white border border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Estado</p>
              <p className={`text-[13px] font-bold mt-0.5
                ${user.onboarding_completed ? 'text-green-700' : 'text-amber-700'}`}>
                {user.onboarding_completed ? 'Concluído' : labelOfStep(user.onboarding_step)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Eventos</p>
              <p className="text-[13px] font-bold text-gray-900 mt-0.5">{timeline.length}</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Duração</p>
              <p className="text-[13px] font-bold text-gray-900 mt-0.5">
                {totalTime || '—'}
              </p>
            </div>
          </div>

          {/* Erro atual */}
          {user.onboarding_error && (
            <div className="mt-3 flex items-start gap-2 text-[12.5px] text-red-700 bg-red-50
              border border-red-200 rounded-xl px-3 py-2">
              <i className="fi fi-sr-exclamation text-sm leading-none mt-0.5 shrink-0" />
              <span><strong>Erro atual:</strong> {user.onboarding_error}</span>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-4">
            Caminho do utilizador (do início ao fim)
          </p>

          {timeline.length === 0 ? (
            <p className="text-center text-[13px] text-gray-500 py-12">
              Sem eventos registados no período selecionado.
            </p>
          ) : (
            <ol className="relative border-l-2 border-gray-100 ml-3 space-y-4">
              {timeline.map((e, i) => {
                const style = eventStyle(e.step, e.status);
                const isFirst = i === 0;
                const isLast = i === timeline.length - 1;
                const time = new Date(e.created_at).toLocaleTimeString('pt-PT', {
                  hour: '2-digit', minute: '2-digit', second: '2-digit',
                });
                const date = new Date(e.created_at).toLocaleDateString('pt-PT');

                return (
                  <li key={i} className="relative pl-5">
                    {/* Dot */}
                    <span className={`absolute -left-[7px] top-1.5 w-3 h-3 rounded-full ${style.dot}
                      ring-4 ring-white`} />

                    {/* Conteúdo */}
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                        text-[12px] font-semibold border ${style.color}`}>
                        <i className={`fi ${style.icon} text-xs leading-none`} />
                        {labelOfEvent(e.step)}
                      </span>

                      {isFirst && (
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider
                          px-1.5 py-0.5 rounded bg-gray-100">
                          Início
                        </span>
                      )}
                      {isLast && !isFirst && (
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider
                          px-1.5 py-0.5 rounded bg-gray-100">
                          Último
                        </span>
                      )}
                    </div>

                    {/* Mensagem de erro */}
                    {e.payload?.message && (
                      <p className="mt-1 text-[12.5px] text-gray-700 leading-snug">
                        {e.payload.message}
                      </p>
                    )}

                    {/* Passo onde abandonou */}
                    {e.step === 'onboarding_abandon' && e.payload?.last_step && (
                      <p className="mt-1 text-[12px] text-amber-700">
                        na página: <strong>{labelOfEvent(e.payload.last_step) || labelOfStep(e.payload.last_step)}</strong>
                      </p>
                    )}

                    {/* Info extra */}
                    <div className="mt-1 flex items-center gap-3 flex-wrap text-[11px] text-gray-400">
                      <span>{date} · {time}</span>
                      {e.payload?.url && (
                        <span className="font-mono">{e.payload.url}</span>
                      )}
                      {e.payload?.online === false && (
                        <span className="text-red-500 font-medium">⚠ offline</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gray-900 text-white text-[13.5px] font-semibold
              hover:bg-gray-800 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   AUXILIARES
============================================================ */

function StatCard({ label, value, icon, color }) {
  const colors = {
    gray:  'bg-gray-50 text-gray-700 border-gray-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    red:   'bg-red-50 text-red-700 border-red-100',
    brand: 'bg-brand-50 text-brand-700 border-brand-100',
  };
  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10.5px] font-bold uppercase tracking-wider opacity-70">{label}</p>
        <i className={`fi ${icon} text-sm leading-none opacity-60`} />
      </div>
      <p className="text-[24px] font-extrabold mt-2 tabular-nums">{value}</p>
    </div>
  );
}

function UserRow({ user, onOpen }) {
  const initials = (user.name || '?')
    .split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  const isDone = user.onboarding_completed;
  const stepLabel = labelOfStep(user.onboarding_step);

  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
        font-bold text-[13px]
        ${isDone ? 'bg-green-100 text-green-700' : 'bg-brand-100 text-brand-700'}`}>
        {initials || '?'}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[14px] text-gray-900 truncate">
          {user.name || 'Sem nome'}
        </p>
        <p className="text-[12px] text-gray-500 truncate">{user.email || '—'}</p>
      </div>

      <div className="hidden sm:flex flex-col items-end shrink-0 min-w-[130px]">
        <span className="text-[10.5px] uppercase font-bold tracking-wider text-gray-400">
          {isDone ? 'Estado' : 'Parou em'}
        </span>
        <span className={`text-[12.5px] font-semibold
          ${isDone ? 'text-green-700' : 'text-amber-700'}`}>
          {isDone ? '✓ Completo' : stepLabel}
        </span>
      </div>

      <div className="hidden md:flex flex-col items-end shrink-0 min-w-[100px]">
        <span className="text-[10.5px] uppercase font-bold tracking-wider text-gray-400">
          Última vez
        </span>
        <span className="text-[12.5px] text-gray-600">
          {user.onboarding_last_seen ? timeAgo(user.onboarding_last_seen) : '—'}
        </span>
      </div>

      {user.onboarding_error && (
        <div className="shrink-0 max-w-[180px]" title={user.onboarding_error}>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg
            bg-red-50 border border-red-200 text-[11px] font-medium text-red-700">
            <i className="fi fi-sr-info text-[10px] leading-none shrink-0" />
            <span className="truncate">{user.onboarding_error}</span>
          </span>
        </div>
      )}

      <i className="fi fi-rr-angle-small-right text-gray-300 text-base leading-none shrink-0" />
    </button>
  );
}

function ErrorCard({ event, userMap }) {
  const isAbandon = event.step === 'onboarding_abandon';
  const isNetwork = event.step === 'network_error';

  const color = isAbandon
    ? 'border-amber-200 bg-amber-50'
    : isNetwork
      ? 'border-orange-200 bg-orange-50'
      : 'border-red-200 bg-red-50';

  const textColor = isAbandon
    ? 'text-amber-900'
    : isNetwork
      ? 'text-orange-900'
      : 'text-red-900';

  const badgeColor = isAbandon
    ? 'bg-amber-100 text-amber-800'
    : isNetwork
      ? 'bg-orange-100 text-orange-800'
      : 'bg-red-100 text-red-800';

  const icon = isAbandon
    ? 'fi-sr-walking'
    : isNetwork
      ? 'fi-sr-wifi-slash'
      : 'fi-sr-exclamation';

  const user = userMap[event.user_id] || {};
  const initials = (user.name || '?')
    .split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  const lastStep = event.payload?.last_step;
  const abandonLabel = lastStep
    ? labelOfEvent(lastStep) || labelOfStep(lastStep)
    : 'passo desconhecido';

  return (
    <div className={`p-4 rounded-2xl border ${color}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center
            text-[11px] font-bold text-gray-700 shrink-0">
            {initials || '?'}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[13.5px] text-gray-900 truncate">
              {user.name || 'Utilizador desconhecido'}
            </p>
            <p className="text-[11px] text-gray-500 truncate">
              {user.email || event.user_id}
            </p>
          </div>
        </div>
        <span className="text-[11px] text-gray-500 shrink-0">
          {new Date(event.created_at).toLocaleString('pt-PT')}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
          text-[11.5px] font-semibold ${badgeColor}`}>
          <i className={`fi ${icon} text-xs leading-none`} />
          {labelOfEvent(event.step)}
        </span>
        {isAbandon && (
          <span className="text-[12px] text-gray-600">
            na página: <strong className={textColor}>{abandonLabel}</strong>
          </span>
        )}
      </div>

      {event.payload?.message && (
        <div className={`text-[13px] font-medium ${textColor} mb-1.5`}>
          {event.payload.message}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-500">
        {event.payload?.url && (
          <span className="inline-flex items-center gap-1">
            <i className="fi fi-rr-marker text-[10px] leading-none" />
            {event.payload.url}
          </span>
        )}
        {event.payload?.online === false && (
          <span className="text-red-600 font-medium inline-flex items-center gap-1">
            <i className="fi fi-sr-wifi-slash text-[10px] leading-none" />
            Estava offline
          </span>
        )}
      </div>
    </div>
  );
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s atrás`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}