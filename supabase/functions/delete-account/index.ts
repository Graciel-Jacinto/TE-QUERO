import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  try {
    // 1. Autentica o utilizador pelo JWT enviado no header
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return json({ success: false, error: 'Não autenticado.' }, 401);
    }

    // 2. Valida o body (confirmação)
    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== 'ELIMINAR') {
      return json({ success: false, error: 'Confirmação inválida.' }, 400);
    }

    // 3. Cliente admin (service_role)
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 3a. Apaga o profile (cascade remove fotos/vídeos se estiver configurado)
    const { error: delProfileErr } = await admin
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (delProfileErr) {
      return json({ success: false, error: delProfileErr.message }, 500);
    }

    // 3b. Desativa a conta de autenticação (ban de ~100 anos)
    const { error: banErr } = await admin.auth.admin.updateUserById(user.id, {
      ban_duration: '876000h', // ~100 anos
      user_metadata: { deleted_at: new Date().toISOString() },
    });

    if (banErr) {
      return json({ success: false, error: banErr.message }, 500);
    }

    return json({ success: true });
  } catch (e) {
    return json({ success: false, error: String(e?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}