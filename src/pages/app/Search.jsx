import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

/* ---------- Opções ---------- */
const GENDERS = [
  { value: '',          label: 'Todos',    icon: 'fi-rr-users' },
  { value: 'feminino',  label: 'Mulheres', icon: 'fi-sr-female' },
  { value: 'masculino', label: 'Homens',   icon: 'fi-sr-male' },
  { value: 'outro',     label: 'Outros',   icon: 'fi-rr-user' },
];

const PROVINCES = [
  'Cabo Delgado', 'Gaza', 'Inhambane', 'Manica',
  'Maputo (cidade)', 'Maputo (província)', 'Nampula',
  'Niassa', 'Sofala', 'Tete', 'Zambézia',
];

const INTERESTS = [
  'Música', 'Viagens', 'Café', 'Livros', 'Praia', 'Arte',
  'Tecnologia', 'Futebol', 'Cozinha', 'Dança', 'Gastronomia',
  'Cinema', 'Desporto', 'Fotografia', 'Moda', 'Animais',
];

const HISTORY_KEY = 'tq-search-history';

const EMPTY_FILTERS = {
  minAge: null,
  maxAge: null,
  gender: '',
  province: '',
  interests: [],
};

export default function Search() {
  const { user } = useAuth();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const [history, setHistory] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const inputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
  }, [history]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (filters.minAge !== null) n++;
    if (filters.maxAge !== null) n++;
    if (filters.gender) n++;
    if (filters.province) n++;
    if (filters.interests.length > 0) n++;
    return n;
  }, [filters]);

  const hasQuery = query.trim().length >= 2;
  const hasFilters = activeFiltersCount > 0;
  const hasAnyCriteria = hasQuery || hasFilters;

  /* ---------- Pesquisa ---------- */
  useEffect(() => {
    if (!user) return;

    if (!hasAnyCriteria) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    const timer = setTimeout(async () => {
      console.log('[Search] A pesquisar:', {
        q: hasQuery ? query.trim() : null,
        minAge: filters.minAge,
        maxAge: filters.maxAge,
        gender: filters.gender,
        province: filters.province,
        interests: filters.interests,
      });

      const { data, error: rpcError } = await supabase.rpc('search_profiles', {
        q: hasQuery ? query.trim() : null,
        p_min_age: filters.minAge,
        p_max_age: filters.maxAge,
        p_gender: filters.gender || null,
        p_province: filters.province || null,
        p_interests: filters.interests.length > 0 ? filters.interests : null,
        p_limit: 50,
        p_offset: 0,
      });

      console.log('[Search] Resultado:', { data, rpcError });

      if (rpcError) {
        console.error('[Search] ERRO:', rpcError);
        setError(rpcError.message);
        setResults([]);
        setLoading(false);
        setSearched(true);
        return;
      }

      setResults(data || []);
      setLoading(false);
      setSearched(true);

      if (hasQuery) {
        const q = query.trim();
        setHistory((prev) => {
          const clean = prev.filter((h) => h.toLowerCase() !== q.toLowerCase());
          return [q, ...clean].slice(0, 10);
        });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, filters, user, hasQuery, hasAnyCriteria]);

  const clearFilters = () => setFilters(EMPTY_FILTERS);

  const toggleInterest = (tag) => {
    setFilters((f) => ({
      ...f,
      interests: f.interests.includes(tag)
        ? f.interests.filter((i) => i !== tag)
        : [...f.interests, tag],
    }));
  };

  const removeHistory = (item) =>
    setHistory((h) => h.filter((x) => x !== item));

  const clearHistory = () => setHistory([]);

  const calcAge = (dob) => {
    if (!dob) return null;
    const b = new Date(dob);
    const d = new Date();
    let a = d.getFullYear() - b.getFullYear();
    const m = d.getMonth() - b.getMonth();
    if (m === 0 && d.getDate() < b.getDate()) a--;
    else if (m < 0) a--;
    return a;
  };

  return (
    <div className="max-w-[1100px] mx-auto">

      {/* ============ CABEÇALHO ============ */}
      <div className="mb-6">
        <h1 className="font-display text-[26px] sm:text-[30px] font-extrabold tracking-tight text-gray-900">
          Pesquisar
        </h1>
        <p className="text-[14px] text-gray-500 mt-1">
          Encontra pessoas por nome, cidade, idade ou interesses.
        </p>
      </div>

      {/* ============ BARRA DE PESQUISA ============ */}
      <div className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur-sm py-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <i className="fi fi-rr-search text-lg leading-none" />
            </span>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nome, cidade ou palavra-chave..."
              className="w-full pl-12 pr-12 py-3.5 rounded-2xl border border-gray-200 bg-white
                text-[15px] placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500
                transition shadow-sm"
            />

            {query && (
              <button
                onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2
                  w-8 h-8 rounded-full flex items-center justify-center
                  text-gray-400 hover:bg-gray-100 transition"
              >
                <i className="fi fi-rr-cross-small text-lg leading-none" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(true)}
            className={`relative shrink-0 h-[50px] px-4 rounded-2xl font-semibold text-[14px]
              flex items-center gap-2 transition-all
              ${hasFilters
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-sm'}`}
          >
            <i className="fi fi-rr-settings-sliders text-[17px] leading-none" />
            <span className="hidden sm:inline">Filtros</span>
            {hasFilters && (
              <span className="min-w-[20px] h-5 px-1.5 bg-white text-brand-700
                text-[11px] font-bold rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {hasFilters && (
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto chip-scroll pb-1">
            <style>{`
              .chip-scroll::-webkit-scrollbar { display: none; }
              .chip-scroll { scrollbar-width: none; }
            `}</style>

            {filters.minAge !== null && filters.maxAge !== null && (
              <Chip onRemove={() => setFilters({ ...filters, minAge: null, maxAge: null })}>
                {filters.minAge}–{filters.maxAge} anos
              </Chip>
            )}
            {filters.minAge !== null && filters.maxAge === null && (
              <Chip onRemove={() => setFilters({ ...filters, minAge: null })}>
                {filters.minAge}+ anos
              </Chip>
            )}
            {filters.minAge === null && filters.maxAge !== null && (
              <Chip onRemove={() => setFilters({ ...filters, maxAge: null })}>
                Até {filters.maxAge} anos
              </Chip>
            )}
            {filters.gender && (
              <Chip onRemove={() => setFilters({ ...filters, gender: '' })}>
                {GENDERS.find((g) => g.value === filters.gender)?.label}
              </Chip>
            )}
            {filters.province && (
              <Chip onRemove={() => setFilters({ ...filters, province: '' })}>
                {filters.province}
              </Chip>
            )}
            {filters.interests.map((tag) => (
              <Chip
                key={tag}
                onRemove={() =>
                  setFilters((f) => ({
                    ...f,
                    interests: f.interests.filter((i) => i !== tag),
                  }))
                }
              >
                {tag}
              </Chip>
            ))}

            <button
              onClick={clearFilters}
              className="shrink-0 ml-1 text-[12px] font-semibold text-brand-600
                hover:text-brand-700 transition whitespace-nowrap"
            >
              Limpar tudo
            </button>
          </div>
        )}
      </div>

      {/* ============ CONTEÚDO ============ */}
      <div className="mt-6">

        {loading && (
          <div className="py-16 text-center">
            <div className="h-8 w-8 border-4 border-brand-200 border-t-brand-600
              rounded-full animate-spin mx-auto" />
            <p className="text-[13px] text-gray-500 mt-3">A procurar...</p>
          </div>
        )}

        {!loading && error && (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <i className="fi fi-rr-exclamation text-red-500 text-2xl leading-none" />
            </div>
            <p className="text-[15px] font-semibold text-gray-900">
              Erro na pesquisa
            </p>
            <p className="text-[13px] text-gray-500 mt-1 max-w-md mx-auto">
              {error}
            </p>
            <p className="text-[12px] text-gray-400 mt-3 max-w-md mx-auto">
              Corre o SQL da função <code className="bg-gray-100 px-1.5 py-0.5 rounded">search_profiles</code> no Supabase.
            </p>
          </div>
        )}

        {!loading && !error && !hasAnyCriteria && (
          <div>
            {history.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Pesquisas recentes
                  </h2>
                  <button
                    onClick={clearHistory}
                    className="text-[12px] font-semibold text-gray-500 hover:text-red-600 transition"
                  >
                    Limpar
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {history.map((h) => (
                    <div key={h} className="group flex items-center gap-1 pl-3 pr-1 py-1.5
                      bg-white border border-gray-200 rounded-full
                      hover:border-brand-300 transition">
                      <button
                        onClick={() => setQuery(h)}
                        className="flex items-center gap-2 text-[13.5px]
                          font-medium text-gray-700 hover:text-brand-700 transition"
                      >
                        <i className="fi fi-rr-time-past text-gray-400 text-[13px] leading-none" />
                        {h}
                      </button>
                      <button
                        onClick={() => removeHistory(h)}
                        className="w-6 h-6 rounded-full flex items-center justify-center
                          text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
                      >
                        <i className="fi fi-rr-cross-small text-base leading-none" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                Explora por interesses
              </h2>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.slice(0, 12).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setFilters((f) => ({ ...f, interests: [tag] }))}
                    className="px-3.5 py-2 rounded-full bg-white border border-gray-200
                      text-[13px] font-medium text-gray-700
                      hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50
                      active:scale-95 transition"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && !error && hasAnyCriteria && searched && results.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <i className="fi fi-rr-search text-gray-400 text-2xl leading-none" />
            </div>
            <p className="text-[15px] font-semibold text-gray-900">Nenhum resultado</p>
            <p className="text-[13px] text-gray-500 mt-1 max-w-xs mx-auto">
              {hasQuery && `Não encontrámos ninguém para "${query}".`}
              {hasFilters && ' Tenta ajustar os filtros.'}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 rounded-xl bg-gray-900 text-white
                  text-[13.5px] font-semibold hover:bg-gray-800 transition"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] text-gray-500">
                <strong className="text-gray-900">{results.length}</strong>
                {results.length === 1 ? ' pessoa encontrada' : ' pessoas encontradas'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((p) => {
                const age = p.age ?? calcAge(p.birth_date);
                return (
                  <Link
                    key={p.id}
                    to={`/app/perfil/${p.id}`}
                    className="group bg-white rounded-2xl border border-gray-100
                      overflow-hidden hover:border-brand-300 hover:shadow-xl
                      hover:-translate-y-0.5 active:scale-[0.99] transition-all"
                  >
                    <div className="relative aspect-[4/5] bg-gray-100 overflow-hidden">
                      {p.avatar_url ? (
                        <img
                          src={p.avatar_url}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center
                          bg-gradient-to-br from-brand-100 to-brand-200">
                          <i className="fi fi-sr-user text-brand-600 text-6xl leading-none opacity-50" />
                        </div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 h-1/2
                        bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <p className="font-display font-extrabold text-[17px] leading-tight truncate">
                          {p.name?.split(' ')[0]}{age ? `, ${age}` : ''}
                        </p>
                        {p.city && (
                          <p className="text-[11.5px] text-white/85 flex items-center gap-1 mt-0.5 truncate">
                            <i className="fi fi-sr-marker leading-none" />
                            {p.city?.split(',')[0]}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5">
                      {p.bio && (
                        <p className="text-[12.5px] text-gray-600 leading-snug line-clamp-2">
                          {p.bio}
                        </p>
                      )}

                      {Array.isArray(p.interests) && p.interests.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {p.interests.slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="text-[10.5px] font-medium text-gray-500
                                bg-gray-100 px-2 py-0.5 rounded-full"
                            >
                              {t}
                            </span>
                          ))}
                          {p.interests.length > 2 && (
                            <span className="text-[10.5px] font-medium text-gray-400 px-1 py-0.5">
                              +{p.interests.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ============ BOTTOM SHEET DE FILTROS ============ */}
      {showFilters && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center">
          <div
            onClick={() => setShowFilters(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          <div className="relative w-full max-w-lg bg-white
            rounded-t-3xl sm:rounded-3xl
            max-h-[90vh] flex flex-col overflow-hidden
            animate-[slideUp_250ms_cubic-bezier(0.22,1,0.36,1)]">

            <style>{`
              @keyframes slideUp {
                from { transform: translateY(100%); }
                to   { transform: translateY(0); }
              }
              @media (min-width: 640px) {
                @keyframes slideUp {
                  from { transform: translateY(20px) scale(0.98); opacity: 0; }
                  to   { transform: translateY(0) scale(1); opacity: 1; }
                }
              }
              .filter-scroll::-webkit-scrollbar { width: 6px; }
              .filter-scroll::-webkit-scrollbar-thumb {
                background: #e5e7eb; border-radius: 3px;
              }
            `}</style>

            <div className="sm:hidden shrink-0 pt-3">
              <div className="w-12 h-1.5 rounded-full bg-gray-300 mx-auto" />
            </div>

            <div className="shrink-0 flex items-center justify-between px-5 py-4
              border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-extrabold text-[17px] text-gray-900">
                  Filtros
                </h3>
                {hasFilters && (
                  <span className="px-2 py-0.5 bg-brand-100 text-brand-700
                    text-[11px] font-bold rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowFilters(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center
                  text-gray-500 hover:bg-gray-100 transition"
              >
                <i className="fi fi-rr-cross-small text-xl leading-none" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto filter-scroll px-5 py-5 space-y-6">

              <section>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Idade
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12.5px] font-semibold text-gray-700 mb-1.5">
                      Mínima
                    </label>
                    <input
                      type="number"
                      min="18"
                      max="99"
                      value={filters.minAge ?? ''}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          minAge: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      placeholder="18"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200
                        text-[14px] text-gray-900 placeholder:text-gray-400
                        focus:outline-none focus:ring-2 focus:ring-brand-500/40
                        focus:border-brand-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[12.5px] font-semibold text-gray-700 mb-1.5">
                      Máxima
                    </label>
                    <input
                      type="number"
                      min="18"
                      max="99"
                      value={filters.maxAge ?? ''}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          maxAge: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      placeholder="99"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200
                        text-[14px] text-gray-900 placeholder:text-gray-400
                        focus:outline-none focus:ring-2 focus:ring-brand-500/40
                        focus:border-brand-500 transition"
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[
                    { label: '18–25', min: 18, max: 25 },
                    { label: '25–35', min: 25, max: 35 },
                    { label: '35–45', min: 35, max: 45 },
                    { label: '45+',   min: 45, max: null },
                  ].map((r) => {
                    const active = filters.minAge === r.min && filters.maxAge === r.max;
                    return (
                      <button
                        key={r.label}
                        onClick={() => setFilters({ ...filters, minAge: r.min, maxAge: r.max })}
                        className={`px-3 py-1.5 rounded-full border text-[12px] font-medium transition
                          ${active
                            ? 'bg-brand-600 border-brand-600 text-white'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-700'}`}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Género
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {GENDERS.map((g) => (
                    <button
                      key={g.value || 'all'}
                      onClick={() => setFilters({ ...filters, gender: g.value })}
                      className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl
                        border text-[13.5px] font-semibold transition
                        ${filters.gender === g.value
                          ? 'bg-brand-50 border-brand-500 text-brand-700'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}`}
                    >
                      <i className={`fi ${g.icon} text-base leading-none`} />
                      {g.label}
                      {filters.gender === g.value && (
                        <i className="fi fi-sr-check text-brand-600 text-sm leading-none ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Província
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFilters({ ...filters, province: '' })}
                    className={`px-3 py-2.5 rounded-xl border text-[13px] font-medium
                      transition text-left
                      ${!filters.province
                        ? 'bg-brand-50 border-brand-500 text-brand-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}`}
                  >
                    Todas
                  </button>
                  {PROVINCES.map((p) => (
                    <button
                      key={p}
                      onClick={() => setFilters({ ...filters, province: p })}
                      className={`px-3 py-2.5 rounded-xl border text-[12.5px] font-medium
                        transition text-left truncate
                        ${filters.province === p
                          ? 'bg-brand-50 border-brand-500 text-brand-700'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Interesses
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {INTERESTS.map((tag) => {
                    const active = filters.interests.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleInterest(tag)}
                        className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium
                          transition border
                          ${active
                            ? 'bg-brand-600 border-brand-600 text-white'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-brand-300'}`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="shrink-0 p-4 border-t border-gray-100 bg-white
              flex items-center gap-3">
              <button
                onClick={clearFilters}
                disabled={!hasFilters}
                className="px-5 py-3 rounded-xl bg-gray-100 text-gray-700
                  font-semibold text-[14px] hover:bg-gray-200
                  disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Limpar
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="flex-1 py-3 rounded-xl bg-brand-600 text-white
                  font-bold text-[14px] hover:bg-brand-700 active:scale-[0.98]
                  shadow-lg shadow-brand-600/25 transition
                  flex items-center justify-center gap-2"
              >
                <i className="fi fi-sr-check text-base leading-none" />
                Aplicar filtros
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Chip de filtro ---------- */
function Chip({ children, onRemove }) {
  return (
    <span className="shrink-0 inline-flex items-center gap-1 pl-3 pr-1 py-1
      bg-brand-50 border border-brand-100 rounded-full
      text-[12.5px] font-semibold text-brand-700">
      {children}
      <button
        onClick={onRemove}
        className="w-5 h-5 rounded-full flex items-center justify-center
          hover:bg-brand-100 transition"
        aria-label="Remover filtro"
      >
        <i className="fi fi-rr-cross-small text-sm leading-none" />
      </button>
    </span>
  );
}