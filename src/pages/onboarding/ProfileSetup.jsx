import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const PROVINCES = {
  'Cabo Delgado': ['Ancuabe', 'Balama', 'Chiúre', 'Ibo', 'Macomia', 'Mecúfi', 'Meluco', 'Metuge', 'Mocímboa da Praia', 'Montepuez', 'Mueda', 'Muidumbe', 'Namuno', 'Nangade', 'Palma', 'Pemba', 'Quissanga'],
  Gaza: ['Bilene', 'Chibuto', 'Chicualacuala', 'Chigubo', 'Chókwè', 'Guijá', 'Mabalane', 'Manjacaze', 'Massangena', 'Massingir', 'Xai-Xai'],
  Inhambane: ['Funhalouro', 'Govuro', 'Homoíne', 'Inharrime', 'Inhassoro', 'Jangamo', 'Mabote', 'Massinga', 'Maxixe', 'Morrumbene', 'Panda', 'Vilankulo', 'Zavala', 'Inhambane'],
  Manica: ['Báruè', 'Gondola', 'Guro', 'Machaze', 'Macossa', 'Manica', 'Mossurize', 'Sussundenga', 'Tambara', 'Chimoio'],
  'Maputo (cidade)': ['KaMpfumo', 'KaMaxaquene', 'KaMubukwana', 'KaTembe', 'KaNyaka', 'KaMavota', 'KaNlhamankulu'],
  'Maputo (província)': ['Boane', 'Magude', 'Manhiça', 'Marracuene', 'Matola', 'Matutuíne', 'Moamba', 'Namaacha'],
  Nampula: ['Angoche', 'Eráti', 'Ilha de Moçambique', 'Lalaua', 'Larde', 'Liúpo', 'Malema', 'Meconta', 'Mecubúri', 'Memba', 'Mogincual', 'Mogovolas', 'Moma', 'Monapo', 'Mossuril', 'Muecate', 'Murrupula', 'Nacala-a-Velha', 'Nacala Porto', 'Nacarôa', 'Nampula', 'Rapale'],
  Niassa: ['Chimbonila', 'Cuamba', 'Lago', 'Lichinga', 'Majune', 'Mandimba', 'Marrupa', 'Maúa', 'Mavago', 'Mecanhelas', 'Mecula', 'Metarica', 'Muembe', "N'gauma", 'Nipepe', 'Sanga'],
  Sofala: ['Beira', 'Buzi', 'Caia', 'Chemba', 'Cheringoma', 'Chibabava', 'Dondo', 'Gorongosa', 'Machanga', 'Maringué', 'Marromeu', 'Muanza', 'Nhamatanda'],
  Tete: ['Angónia', 'Cahora-Bassa', 'Changara', 'Chifunde', 'Chiuta', 'Dôa', 'Macanga', 'Magoé', 'Marávia', 'Moatize', 'Mutarara', 'Tsangano', 'Zumbo', 'Tete'],
  Zambézia: ['Alto Molócue', 'Chinde', 'Derre', 'Gilé', 'Gurué', 'Ile', 'Inhassunge', 'Lugela', 'Maganja da Costa', 'Milange', 'Mocuba', 'Mopeia', 'Morrumbala', 'Mulevala', 'Namacurra', 'Namarroi', 'Nicoadala', 'Pebane', 'Quelimane'],
};

const PROVINCE_LIST = Object.keys(PROVINCES).sort();

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const [form, setForm] = useState({
    name: profile?.name || '',
    birth_date: profile?.birth_date || '',
    province: '',
    district: '',
    neighborhood: profile?.city || '',
    bio: profile?.bio || '',
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState(profile?.avatar_url || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const districts = useMemo(
    () => (form.province ? PROVINCES[form.province] || [] : []),
    [form.province]
  );

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const handleProvinceChange = (e) =>
    setForm({ ...form, province: e.target.value, district: '' });

  const pickAvatar = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return profile?.avatar_url ?? null;
    const ext = avatarFile.name.split('.').pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, avatarFile, { upsert: true });
    if (upErr) throw upErr;

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleFinish = async () => {
    setError('');
    if (!form.name.trim()) return setError('Diz-nos o teu nome.');
    if (!form.birth_date) return setError('Indica a tua data de nascimento.');
    if (!form.province) return setError('Escolhe a tua província.');
    if (!form.district) return setError('Escolhe o teu distrito.');

    setLoading(true);
    try {
      const avatar_url = await uploadAvatar();
      const city = [form.neighborhood?.trim(), form.district, form.province]
        .filter(Boolean)
        .join(', ');

      const { error: upErr } = await supabase
        .from('profiles')
        .update({
          name: form.name.trim(),
          birth_date: form.birth_date,
          city,
          bio: form.bio.trim() || null,
          avatar_url,
          onboarding_completed: true,
        })
        .eq('id', user.id);

      if (upErr) throw upErr;

      await refreshProfile();
      navigate('/app/descobrir', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    'w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white ' +
    'placeholder:text-gray-400 text-[14px] text-gray-900 ' +
    'focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 ' +
    'transition';

  const selectBase =
    'w-full pl-10 pr-9 py-2.5 rounded-lg border border-gray-300 bg-white ' +
    'text-[14px] text-gray-900 appearance-none cursor-pointer ' +
    'focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 ' +
    'transition disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50';

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-5 sm:px-6 py-6 sm:py-8">

        {/* Logo topo */}
        <div className="flex justify-center mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700
              flex items-center justify-center shadow-sm shadow-brand-600/30">
              <i className="fi fi-sr-heart text-white text-base leading-none" />
            </div>
            <span className="font-display font-extrabold text-[17px] tracking-tight text-gray-900">
              Te Quero<span className="text-brand-600">.</span>
            </span>
          </div>
        </div>

        {/* Cabeçalho */}
        <div className="text-center mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-600 mb-1.5">
            Passo 3 de 3
          </p>
          <h1 className="font-display text-[22px] sm:text-[26px] font-extrabold
            tracking-[-0.03em] text-gray-900 leading-tight">
            Completa o teu perfil
          </h1>
          <p className="mt-1.5 text-[13px] text-gray-500 max-w-sm mx-auto">
            Estas informações vão aparecer para outras pessoas.
          </p>
        </div>

        {/* Avatar */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden
              bg-brand-100 border-3 border-white shadow-md
              flex items-center justify-center">
              {preview ? (
                <img src={preview} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <i className="fi fi-rr-camera text-brand-500 text-2xl leading-none" />
              )}
            </div>

            <label className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full
              bg-brand-600 text-white flex items-center justify-center
              shadow-md cursor-pointer hover:bg-brand-700 transition
              border-2 border-white">
              <i className="fi fi-rr-camera text-[11px] leading-none" />
              <input type="file" accept="image/*" onChange={pickAvatar} className="hidden" />
            </label>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-gray-800 leading-tight">
              Foto de perfil
            </p>
            <p className="text-[11.5px] text-gray-500 mt-0.5">
              Ajuda os outros a reconhecer-te
            </p>
          </div>
        </div>

        {/* Formulário */}
        <div className="space-y-5">

          {/* Secção 1: Informação básica */}
          <section>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2.5">
              Informação básica
            </h2>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12.5px] font-semibold text-gray-700 mb-1">
                  Nome
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <i className="fi fi-rr-user text-sm leading-none" />
                  </span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={update('name')}
                    placeholder="Ex.: Graciel"
                    className={`${inputBase} pl-9`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-gray-700 mb-1">
                  Data de nascimento
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <i className="fi fi-rr-cake-birthday text-sm leading-none" />
                  </span>
                  <input
                    type="date"
                    value={form.birth_date}
                    onChange={update('birth_date')}
                    className={`${inputBase} pl-9`}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Secção 2: Localização */}
          <section>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2.5">
              Localização
            </h2>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12.5px] font-semibold text-gray-700 mb-1">
                  Província
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <i className="fi fi-rr-marker text-sm leading-none" />
                  </span>
                  <select
                    value={form.province}
                    onChange={handleProvinceChange}
                    className={selectBase}
                  >
                    <option value="">Escolhe a província</option>
                    {PROVINCE_LIST.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <i className="fi fi-rr-angle-small-down text-sm leading-none" />
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-gray-700 mb-1">
                  Distrito
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <i className="fi fi-rr-marker text-sm leading-none" />
                  </span>
                  <select
                    value={form.district}
                    onChange={update('district')}
                    disabled={!form.province}
                    className={selectBase}
                  >
                    <option value="">
                      {form.province ? 'Escolhe o distrito' : 'Escolhe província primeiro'}
                    </option>
                    {districts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <i className="fi fi-rr-angle-small-down text-sm leading-none" />
                  </span>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[12.5px] font-semibold text-gray-700 mb-1">
                  Bairro <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <i className="fi fi-rr-home text-sm leading-none" />
                  </span>
                  <input
                    type="text"
                    value={form.neighborhood}
                    onChange={update('neighborhood')}
                    placeholder="Ex.: Polana Caniço"
                    className={`${inputBase} pl-9`}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Secção 3: Sobre ti */}
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Sobre ti
              </h2>
              <span className="text-[11px] text-gray-400 tabular-nums">
                {form.bio.length}/200
              </span>
            </div>

            <textarea
              rows={3}
              maxLength={200}
              value={form.bio}
              onChange={update('bio')}
              placeholder="Sou uma pessoa tranquila, gosto de música, tecnologia e conhecer pessoas novas..."
              className={`${inputBase} resize-none`}
            />
          </section>

          {/* Erro */}
          {error && (
            <div className="flex items-start gap-2 text-[13px] text-red-700 bg-red-50
              border border-red-200 rounded-lg px-3 py-2">
              <i className="fi fi-rr-exclamation text-sm leading-none mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* CTA */}
          <div className="pt-1">
            <button
              onClick={handleFinish}
              disabled={loading}
              className="w-full py-3 rounded-lg bg-brand-600 text-white font-semibold text-[14.5px]
                hover:bg-brand-700 active:scale-[0.99] transition
                shadow-lg shadow-brand-600/25
                disabled:opacity-60 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  A guardar...
                </>
              ) : (
                <>
                  Terminar e entrar
                  <i className="fi fi-rr-arrow-small-right text-base leading-none" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}