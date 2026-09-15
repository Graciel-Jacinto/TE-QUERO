import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAllFlags } from '../../hooks/useFeatureFlags';

/* ============================================================
   Metadados por flag
============================================================ */
const FLAG_META = {
  free_contact:          { emoji: '🎁', color: 'bg-green-50 text-green-600',   category: 'Contactos', danger: false, warn: false },
  whatsapp_verification: { emoji: '✅', color: 'bg-blue-50 text-blue-600',     category: 'Segurança', danger: false, warn: false },
  video_upload:          { emoji: '🎬', color: 'bg-purple-50 text-purple-600', category: 'Perfil',    danger: false, warn: false },
  unlimited_plan:        { emoji: '♾️', color: 'bg-brand-50 text-brand-600',   category: 'Planos',    danger: false, warn: true  },
  birthday_badge:        { emoji: '🎂', color: 'bg-amber-50 text-amber-600',   category: 'Perfil',    danger: false, warn: false },
  dark_mode:             { emoji: '🌙', color: 'bg-gray-100 text-gray-700',    category: 'Aparência', danger: false, warn: false },
  stories:               { emoji: '📸', color: 'bg-pink-50 text-pink-600',     category: 'Conteúdo',  danger: false, warn: false },
  maintenance_mode:      { emoji: '🚧', color: 'bg-red-50 text-red-600',       category: 'Sistema',   danger: true,  warn: false },
};

const FLAG_ORDER = [
  'free_contact', 'maintenance_mode', 'whatsapp_verification',
  'video_upload', 'unlimited_plan', 'birthday_badge', 'dark_mode', 'stories',
];

/* ============================================================
   Helpers
============================================================ */
function timeAgo(iso) {
  if (!iso) return null;
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 5) return 'agora mesmo';
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
}

/* ============================================================
   Página
============================================================ */
export default function AdminFeatureFlags() {
  const { flags, loading, refresh } = useAllFlags();

  /* Overrides locais (optimistic updates) */
  const [overrides, setOverrides] = useState({});

  const [busy, setBusy] = useState({});
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [justSaved, setJustSaved] = useState({});

  /* Refs por flag (para debounce isolado) */
  const debounceRefs = useRef({});

  /* ============================================================
     Lista: junta flags do servidor com overrides locais
  ============================================================ */
  const list = useMemo(() => {
    const arr = Object.values(flags || {}).map((f) => {
      const o = overrides[f.key];
      const merged = o ? { ...f, ...o } : f;
      return merged;
    });
    return arr.sort((a, b) => {
      const ai = FLAG_ORDER.indexOf(a.key);
      const bi = FLAG_ORDER.indexOf(b.key);
      if (ai === -1 && bi === -1) return a.key.localeCompare(b.key);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [flags, overrides]);

  /* Filtragem */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((f) => {
      if (filter === 'on' && !f.enabled) return false;
      if (filter === 'off' && f.enabled) return false;
      if (!q) return true;
      const meta = FLAG_META[f.key];
      return (
        f.key.toLowerCase().includes(q) ||
        (f.description || '').toLowerCase().includes(q) ||
        (meta?.category || '').toLowerCase().includes(q)
      );
    });
  }, [list, query, filter]);

  /* Stats */
  const totalCount = list.length;
  const enabledCount = list.filter((f) => f.enabled).length;
  const disabledCount = totalCount - enabledCount;
  const activeRollouts = list.filter((f) => f.enabled && (f.rollout_pct ?? 100) < 100).length;

  /* Toast */
  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  };

  /* Marca visual temporária "guardado" */
  const flashSaved = (key) => {
    setJustSaved((s) => ({ ...s, [key]: true }));
    setTimeout(() => {
      setJustSaved((s) => {
        const next = { ...s };
        delete next[key];
        return next;
      });
    }, 1200);
  };

  /* Limpa overrides quando as flags do servidor chegam com o mesmo valor */
  useEffect(() => {
    if (!flags) return;
    setOverrides((prev) => {
      let changed = false;
      const next = { ...prev };
      Object.entries(prev).forEach(([key, o]) => {
        const server = flags[key];
        if (!server) return;
        const enabledMatch = o.enabled === undefined || o.enabled === server.enabled;
        const rolloutMatch =
          o.rollout_pct === undefined || o.rollout_pct === server.rollout_pct;
        if (enabledMatch && rolloutMatch) {
          delete next[key];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [flags]);

  /* ============================================================
     TOGGLE — com update otimista
  ============================================================ */
  const doToggle = async (key, current) => {
    const newVal = !current;

    /* 1) Atualização otimista: UI muda AGORA */
    setOverrides((o) => ({ ...o, [key]: { ...o[key], enabled: newVal } }));
    setBusy((b) => ({ ...b, [key]: true }));

    /* 2) Gravar no servidor */
    const { error } = await supabase
      .from('feature_flags')
      .update({ enabled: newVal, updated_at: new Date().toISOString() })
      .eq('key', key);

    setBusy((b) => ({ ...b, [key]: false }));

    if (error) {
      /* 3a) Falhou → reverter */
      setOverrides((o) => {
        const next = { ...o };
        if (next[key]) {
          const { enabled, ...rest } = next[key];
          if (Object.keys(rest).length === 0) delete next[key];
          else next[key] = rest;
        }
        return next;
      });
      showToast(error.message, 'error');
    } else {
      /* 3b) Sucesso → sincronizar e mostrar feedback */
      showToast(
        `${key} ${newVal ? 'ativada' : 'desativada'}`,
        newVal ? 'success' : 'info'
      );
      flashSaved(key);
      await refresh();
    }
    setConfirm(null);
  };

  const handleToggleClick = (f, meta) => {
    if (meta.danger) {
      setConfirm({
        key: f.key,
        current: f.enabled,
        meta,
        action: !f.enabled ? 'ativar' : 'desativar',
      });
      return;
    }
    doToggle(f.key, f.enabled);
  };

  /* ============================================================
     ROLLOUT — debounce por flag + update otimista
  ============================================================ */
  const commitRollout = useCallback(async (key, pct) => {
    const { error } = await supabase
      .from('feature_flags')
      .update({ rollout_pct: pct, updated_at: new Date().toISOString() })
      .eq('key', key);

    if (error) {
      showToast(error.message, 'error');
      /* Reverter override */
      setOverrides((o) => {
        const next = { ...o };
        if (next[key]) {
          const { rollout_pct, ...rest } = next[key];
          if (Object.keys(rest).length === 0) delete next[key];
          else next[key] = rest;
        }
        return next;
      });
    } else {
      flashSaved(key);
      await refresh();
    }
  }, [refresh]);

  const handleRolloutChange = (key, pct) => {
    /* Optimistic: UI muda agora */
    setOverrides((o) => ({ ...o, [key]: { ...o[key], rollout_pct: pct } }));

    /* Debounce POR flag (evita conflito entre flags diferentes) */
    if (debounceRefs.current[key]) clearTimeout(debounceRefs.current[key]);
    debounceRefs.current[key] = setTimeout(() => {
      commitRollout(key, pct);
      delete debounceRefs.current[key];
    }, 600);
  };

  const setRolloutPreset = async (key, pct) => {
    /* Cancela debounce pendente */
    if (debounceRefs.current[key]) {
      clearTimeout(debounceRefs.current[key]);
      delete debounceRefs.current[key];
    }
    /* Optimistic */
    setOverrides((o) => ({ ...o, [key]: { ...o[key], rollout_pct: pct } }));
    setBusy((b) => ({ ...b, [key]: true }));

    const { error } = await supabase
      .from('feature_flags')
      .update({ rollout_pct: pct, updated_at: new Date().toISOString() })
      .eq('key', key);

    setBusy((b) => ({ ...b, [key]: false }));

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast(`Rollout → ${pct}%`, 'success');
      flashSaved(key);
      await refresh();
    }
  };

  const copyKey = async (key) => {
    try {
      await navigator.clipboard.writeText(key);
      showToast('Copiado!', 'success');
    } catch {
      showToast('Erro ao copiar', 'error');
    }
  };

  /* Cleanup */
  useEffect(() => {
    return () => {
      Object.values(debounceRefs.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  /* ============================================================ */
  return (
    <div className="max-w-[900px] mx-auto space-y-5">

      {/* ============ CABEÇALHO ============ */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
              <i className="fi fi-sr-toggle-on text-brand-600 text-lg leading-none" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-[22px] sm:text-[26px] font-extrabold tracking-tight text-gray-900 truncate">
                Feature Flags
              </h1>
              <p className="text-[12.5px] text-gray-500">
                Liga e desliga funcionalidades em tempo real
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={refresh}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-2
            px-3.5 py-2 rounded-xl bg-white border border-gray-200
            text-gray-700 text-[12.5px] font-semibold
            hover:border-brand-300 hover:text-brand-700 active:scale-[0.98]
            disabled:opacity-50 transition shrink-0"
        >
          <i className={`fi fi-rr-refresh text-sm leading-none ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* ============ KPIs ============ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <SummaryCard label="Total" value={totalCount} icon="fi-sr-apps" color="text-gray-600 bg-gray-50" />
        <SummaryCard label="Ativas" value={enabledCount} icon="fi-sr-check-circle" color="text-green-600 bg-green-50" />
        <SummaryCard label="Desligadas" value={disabledCount} icon="fi-sr-cross-circle" color="text-gray-400 bg-gray-50" />
        <SummaryCard label="Em teste" value={activeRollouts} icon="fi-sr-flask" color="text-amber-600 bg-amber-50" highlight={activeRollouts > 0} />
      </div>

      {/* ============ FILTROS ============ */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
        <div className="flex-1 relative">
          <i className="fi fi-rr-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm leading-none pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar flag..."
            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-gray-200
              text-[13px] text-gray-900 placeholder:text-gray-400
              focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full
                flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            >
              <i className="fi fi-rr-cross-small text-xs leading-none" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-gray-200">
          {[
            { id: 'all', label: 'Todas', count: totalCount },
            { id: 'on',  label: 'Ativas', count: enabledCount },
            { id: 'off', label: 'Off',   count: disabledCount },
          ].map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition
                  ${active
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
              >
                {tab.label}
                <span className={`text-[10px] font-bold tabular-nums ${active ? 'text-white/80' : 'text-gray-400'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============ LISTA ============ */}
      {loading && list.length === 0 ? (
        <SkeletonList />
      ) : list.length === 0 ? (
        <EmptyState icon="fi-rr-toggle-off" title="Sem flags configuradas" desc="Cria a primeira flag no SQL Editor do Supabase." />
      ) : filtered.length === 0 ? (
        <EmptyState icon="fi-rr-search" title="Nenhum resultado" desc="Tenta mudar a busca ou o filtro." />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((f) => {
            const meta = FLAG_META[f.key] || {
              emoji: '⚙️', color: 'bg-gray-100 text-gray-600',
              category: 'Outro', danger: false, warn: false,
            };
            const isBusy = busy[f.key];
            const wasSaved = justSaved[f.key];
            const rollout = f.rollout_pct ?? 100;
            const isPartial = f.enabled && rollout < 100 && rollout > 0;
            const isFull = f.enabled && rollout >= 100;

            return (
              <div
                key={f.key}
                className={`bg-white rounded-2xl border transition-all duration-300
                  ${wasSaved
                    ? 'border-brand-400 shadow-[0_0_0_3px_rgba(236,72,153,0.12)]'
                    : isFull
                      ? meta.danger
                        ? 'border-red-200 shadow-[0_0_0_3px_rgba(239,68,68,0.06)]'
                        : 'border-green-200 shadow-[0_0_0_3px_rgba(34,197,94,0.06)]'
                      : isPartial
                        ? 'border-amber-200 shadow-[0_0_0_3px_rgba(245,158,11,0.06)]'
                        : 'border-gray-100 hover:border-gray-200'}`}
              >
                <div className="p-4 sm:p-5">
                  {/* Linha 1 */}
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0
                      text-[20px] sm:text-[22px] ${meta.color}`}>
                      <span className="leading-none">{meta.emoji}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => copyKey(f.key)}
                          title="Clique para copiar"
                          className="font-mono text-[13px] sm:text-[13.5px] font-bold
                            text-gray-900 hover:text-brand-600 transition flex items-center gap-1.5 group/key"
                        >
                          {f.key}
                          <i className="fi fi-rr-copy text-[10px] leading-none opacity-0 group-hover/key:opacity-60 transition" />
                        </button>

                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1.5 py-0.5 rounded bg-gray-50">
                          {meta.category}
                        </span>

                        {meta.danger && (
                          <span className="text-[9.5px] font-bold uppercase tracking-wider
                            bg-red-100 text-red-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <i className="fi fi-sr-exclamation text-[9px] leading-none" />
                            Sensível
                          </span>
                        )}

                        {wasSaved && (
                          <span className="text-[9.5px] font-bold uppercase tracking-wider
                            bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded flex items-center gap-1
                            animate-pulse">
                            <i className="fi fi-sr-check text-[9px] leading-none" />
                            Guardado
                          </span>
                        )}
                      </div>

                      {f.description && (
                        <p className="text-[12px] sm:text-[12.5px] text-gray-500 mt-1 leading-snug">
                          {f.description}
                        </p>
                      )}

                      {f.updated_at && (
                        <p className="text-[10.5px] text-gray-400 mt-1.5 flex items-center gap-1">
                          <i className="fi fi-rr-time-past text-[10px] leading-none" />
                          alterado há {timeAgo(f.updated_at)}
                        </p>
                      )}
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => handleToggleClick(f, meta)}
                      disabled={isBusy}
                      className={`relative shrink-0 w-14 h-8 rounded-full transition-all duration-300
                        ${f.enabled ? 'bg-green-500 shadow-inner' : 'bg-gray-300'}
                        ${isBusy ? 'opacity-60' : 'cursor-pointer hover:opacity-90'}
                        focus:outline-none focus:ring-2 focus:ring-offset-2
                        ${f.enabled ? 'focus:ring-green-400' : 'focus:ring-gray-400'}`}
                      aria-label={f.enabled ? 'Desativar' : 'Ativar'}
                    >
                      <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md
                        transition-all duration-300 flex items-center justify-center
                        ${f.enabled ? 'left-7' : 'left-1'}`}>
                        {isBusy ? (
                          <span className="h-3 w-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                        ) : f.enabled ? (
                          <i className="fi fi-sr-check text-green-500 text-[11px] leading-none" />
                        ) : (
                          <i className="fi fi-rr-cross-small text-gray-400 text-[11px] leading-none" />
                        )}
                      </span>
                    </button>
                  </div>

                  {/* Rollout */}
                  {f.enabled && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-2 shrink-0">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center
                          ${isPartial ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                          <i className="fi fi-sr-flask text-[11px] leading-none" />
                        </div>
                        <span className="text-[11.5px] font-bold uppercase tracking-wider text-gray-500">
                          Rollout
                        </span>
                      </div>

                      <div className="flex-1 flex items-center gap-3 min-w-0">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={rollout}
                          onChange={(e) => handleRolloutChange(f.key, Number(e.target.value))}
                          className="flex-1 min-w-[100px] accent-brand-600"
                        />
                        <span className={`text-[13px] font-extrabold tabular-nums shrink-0 min-w-[42px] text-right
                          ${rollout === 100 ? 'text-green-600'
                            : rollout === 0 ? 'text-red-500'
                            : 'text-amber-600'}`}>
                          {rollout}%
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {[25, 50, 75, 100].map((pct) => {
                          const active = rollout === pct;
                          return (
                            <button
                              key={pct}
                              onClick={() => setRolloutPreset(f.key, pct)}
                              disabled={isBusy}
                              className={`px-2 py-1 rounded-md text-[10.5px] font-bold transition-all
                                ${active
                                  ? 'bg-brand-600 text-white shadow-sm'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'}
                                disabled:opacity-50`}
                            >
                              {pct}%
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {isPartial && (
                    <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                      <i className="fi fi-sr-info text-amber-600 text-[11px] leading-none mt-0.5 shrink-0" />
                      <p className="text-[11px] text-amber-800 leading-snug">
                        Apenas <strong>{rollout}%</strong> dos utilizadores veem esta funcionalidade.
                      </p>
                    </div>
                  )}

                  {!f.enabled && meta.warn && (
                    <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                      <i className="fi fi-sr-info text-gray-500 text-[11px] leading-none mt-0.5 shrink-0" />
                      <p className="text-[11px] text-gray-600 leading-snug">
                        Esta flag está desligada. Ativa para começar a usar.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Aviso rodapé */}
      {list.length > 0 && (
        <div className="flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl bg-blue-50 border border-blue-100">
          <i className="fi fi-sr-info text-blue-600 text-base leading-none mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[12.5px] font-bold text-blue-900">Alterações em tempo real</p>
            <p className="text-[11.5px] text-blue-800 mt-0.5 leading-snug">
              As flags são lidas no arranque da app. Os utilizadores ativos podem precisar
              de recarregar a página para ver a mudança.
            </p>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmModal
          confirm={confirm}
          onCancel={() => setConfirm(null)}
          onConfirm={() => doToggle(confirm.key, confirm.current)}
        />
      )}

      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[400]
          px-4 py-2.5 rounded-xl shadow-xl text-[13px] font-semibold text-white max-w-[90vw]
          flex items-center gap-2
          ${toast.type === 'error' ? 'bg-red-600'
            : toast.type === 'success' ? 'bg-green-600'
            : 'bg-gray-900'}`}>
          <i className={`fi ${
            toast.type === 'error' ? 'fi-sr-cross-circle'
              : toast.type === 'success' ? 'fi-sr-check-circle'
              : 'fi-sr-info'
          } text-sm leading-none`} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Sub-componentes
============================================================ */
function SummaryCard({ label, value, icon, color, highlight = false }) {
  return (
    <div className={`rounded-2xl border p-4 transition
      ${highlight ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-gray-100'}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${color}`}>
        <i className={`fi ${icon} text-sm leading-none`} />
      </div>
      <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="font-display text-[22px] font-extrabold text-gray-900 mt-1 tabular-nums leading-none">
        {value}
      </p>
    </div>
  );
}

function EmptyState({ icon, title, desc }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
        <i className={`fi ${icon} text-gray-400 text-xl leading-none`} />
      </div>
      <p className="text-[14px] font-bold text-gray-800">{title}</p>
      <p className="text-[12px] text-gray-500 mt-1">{desc}</p>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2.5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-100 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-100 rounded w-1/3 animate-pulse" />
              <div className="h-3 bg-gray-100 rounded w-2/3 animate-pulse" />
            </div>
            <div className="w-14 h-8 rounded-full bg-gray-100 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ConfirmModal({ confirm, onCancel, onConfirm }) {
  const isDanger = confirm.action === 'ativar' && confirm.meta.danger;

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center">
      <div onClick={onCancel} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl
        p-6 pb-8 sm:p-7 animate-[slideUpConfirm_280ms_cubic-bezier(0.22,1,0.36,1)]">
        <style>{`
          @keyframes slideUpConfirm {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
          }
          @media (min-width: 640px) {
            @keyframes slideUpConfirm {
              from { transform: translateY(20px) scale(0.98); opacity: 0; }
              to   { transform: translateY(0) scale(1); opacity: 1; }
            }
          }
        `}</style>

        <div className="sm:hidden w-12 h-1.5 rounded-full bg-gray-300 mx-auto mb-5" />

        <div className="flex justify-center mb-4">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center
            ${isDanger ? 'bg-red-50' : 'bg-amber-50'}`}>
            <i className={`fi fi-sr-exclamation text-2xl leading-none
              ${isDanger ? 'text-red-600' : 'text-amber-600'}`} />
          </div>
        </div>

        <h3 className="font-display text-[19px] font-extrabold text-gray-900 text-center leading-tight">
          {confirm.action === 'ativar' ? 'Ativar' : 'Desativar'}{' '}
          <span className="font-mono text-brand-600">{confirm.key}</span>?
        </h3>
        <p className="mt-2 text-[13.5px] text-gray-600 text-center leading-relaxed">
          {isDanger
            ? 'Esta é uma flag sensível. Ativar pode afetar todos os utilizadores imediatamente.'
            : 'Confirma que queres mudar o estado desta flag.'}
        </p>

        <div className="mt-6 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-[14.5px]
              hover:bg-gray-200 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3.5 rounded-xl text-white font-bold text-[14.5px]
              active:scale-[0.98] transition shadow-lg flex items-center justify-center gap-2
              ${isDanger
                ? 'bg-red-600 hover:bg-red-700 shadow-red-600/25'
                : 'bg-brand-600 hover:bg-brand-700 shadow-brand-600/25'}`}
          >
            <i className={`fi ${confirm.action === 'ativar' ? 'fi-sr-check' : 'fi-sr-cross'} text-sm leading-none`} />
            {confirm.action === 'ativar' ? 'Ativar' : 'Desativar'}
          </button>
        </div>
      </div>
    </div>
  );
}