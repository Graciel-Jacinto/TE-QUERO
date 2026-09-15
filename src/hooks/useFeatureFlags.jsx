import { useEffect, useState, useMemo, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';

const FeatureFlagsContext = createContext({
  flags: {},
  loading: true,
  refresh: () => {},
});

export function FeatureFlagsProvider({ children }) {
  const [flags, setFlags] = useState({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('key, enabled, rollout_pct, description, updated_at');

      if (error) {
        console.warn('[flags] falha ao carregar:', error.message);
        setFlags({});
        setLoading(false);
        return;
      }

      const map = {};
      (data || []).forEach((f) => { map[f.key] = f; });
      setFlags(map);
    } catch (err) {
      console.warn('[flags] erro inesperado:', err);
      setFlags({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <FeatureFlagsContext.Provider value={{ flags, loading, refresh: load }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeature(key) {
  const { flags, loading } = useContext(FeatureFlagsContext);

  return useMemo(() => {
    if (loading) return false;
    const f = flags?.[key];
    if (!f || !f.enabled) return false;
    const pct = typeof f.rollout_pct === 'number' ? f.rollout_pct : 100;
    if (pct >= 100) return true;
    if (pct <= 0) return false;
    const bucket = hashString(key) % 100;
    return bucket < pct;
  }, [flags, loading, key]);
}

export function useAllFlags() {
  return useContext(FeatureFlagsContext);
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}