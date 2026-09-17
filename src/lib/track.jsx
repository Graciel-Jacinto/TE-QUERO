import { supabase } from './supabase';

/**
 * Regista um passo do onboarding.
 * Nunca lança erro — falhas de tracking não devem quebrar o fluxo.
 *
 * @param {string} step    - ex: 'welcome_view', 'profile_save_ok'
 * @param {'started'|'success'|'error'} status
 * @param {object} payload - dados extra (message, url, etc.)
 */
export async function track(step, status = 'success', payload = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // guarda passo atual para o listener de "abandon"
    sessionStorage.setItem('onboarding_step', step);

    // 1) evento detalhado (histórico)
    await supabase.from('onboarding_events').insert({
      user_id: user.id,
      step,
      status,
      payload,
    });

    // 2) estado atual no profile (para a lista rápida no admin)
    const patch = {
      onboarding_step: step,
      onboarding_last_seen: new Date().toISOString(),
    };

    if (status === 'error') {
      patch.onboarding_error = (payload?.message || 'unknown').slice(0, 500);
    } else if (status === 'success') {
      patch.onboarding_error = null;
    }

    await supabase.from('profiles').update(patch).eq('id', user.id);
  } catch (e) {
    console.warn('[track]', step, e?.message);
  }
}

/**
 * Helper opcional — atalhos para chamadas frequentes.
 */
export const trackStart = (step, payload) => track(step, 'started', payload);
export const trackOk    = (step, payload) => track(step, 'success', payload);
export const trackError = (step, payload) => track(step, 'error',   payload);