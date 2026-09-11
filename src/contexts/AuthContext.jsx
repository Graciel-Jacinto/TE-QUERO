import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (authUser) => {
    if (!authUser) {
      setProfile(null);
      setRoles([]);
      return;
    }

    const [{ data: prof, error: pErr }, { data: userRoles }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', authUser.id),
    ]);

    if (pErr) console.error('profiles fetch error:', pErr);

    // Se não houver perfil (ex.: conta criada fora do fluxo normal), criamos um mínimo
    if (!prof) {
      const fallbackName =
        authUser.user_metadata?.name ||
        authUser.email?.split('@')[0] ||
        'Novo utilizador';

      const { data: created, error: cErr } = await supabase
        .from('profiles')
        .upsert({ id: authUser.id, name: fallbackName }, { onConflict: 'id' })
        .select('*')
        .maybeSingle();

      if (cErr) console.error('profiles upsert error:', cErr);
      setProfile(created ?? null);
    } else {
      setProfile(prof);
    }

    setRoles(userRoles?.map((r) => r.role) ?? []);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      await loadUserData(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        await loadUserData(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    await loadUserData(user);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRoles([]);
  };

  const isAdmin = roles.includes('admin');
  const isStaff = isAdmin || roles.includes('moderator');

  const value = {
    session, user, profile, roles, loading,
    isAdmin, isStaff,
    refreshProfile, signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}