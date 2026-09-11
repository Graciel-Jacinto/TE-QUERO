import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

/* ---------- Províncias ---------- */
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

const INTERESTS = [
  'Música', 'Viagens', 'Café', 'Livros', 'Praia', 'Arte',
  'Tecnologia', 'Futebol', 'Cozinha', 'Dança', 'Gastronomia',
  'Cinema', 'Desporto', 'Fotografia', 'Moda', 'Animais',
];

/* ---------- Limites por plano ---------- */
const PLAN_LIMITS = {
  free:    { photos: 2,  videos: 2,  label: 'Grátis',  color: 'gray' },
  pro:     { photos: 10, videos: 5,  label: 'Pro',     color: 'blue' },
  premium: { photos: 30, videos: 15, label: 'Premium', color: 'amber' },
};

const MAX_FILE_MB = 10;

export default function Profile() {
  const { profile: authProfile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [plan, setPlan] = useState('free');
  const [showUpgrade, setShowUpgrade] = useState(null); // 'photos' | 'videos' | null

  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const maxPhotos = limits.photos;
  const maxVideos = limits.videos;

  const [form, setForm] = useState({
    name: '',
    birth_date: '',
    province: '',
    district: '',
    neighborhood: '',
    bio: '',
    interests: [],
    avatar_url: null,
    photos: [],
    videos: [],
  });

  const [newAvatarFile, setNewAvatarFile] = useState(null);
  const [newAvatarPreview, setNewAvatarPreview] = useState(null);
  const [photoFiles, setPhotoFiles] = useState([]);

  /* ---------- Carregar ---------- */
  useEffect(() => {
    if (!authProfile) return;

    const city = authProfile.city || '';
    const parts = city.split(',').map((s) => s.trim());

    setForm({
      name: authProfile.name || '',
      birth_date: authProfile.birth_date || '',
      province: parts[2] || '',
      district: parts[1] || '',
      neighborhood: parts[0] || '',
      bio: authProfile.bio || '',
      interests: Array.isArray(authProfile.interests) ? authProfile.interests : [],
      avatar_url: authProfile.avatar_url || null,
      photos: Array.isArray(authProfile.photos) ? authProfile.photos : [],
      videos: Array.isArray(authProfile.videos) ? authProfile.videos : [],
    });

    setPlan(authProfile.plan || 'free');
  }, [authProfile]);

  const districts = useMemo(
    () => (form.province ? PROVINCES[form.province] || [] : []),
    [form.province]
  );

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const toggleInterest = (tag) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(tag)
        ? f.interests.filter((i) => i !== tag)
        : [...f.interests, tag],
    }));
  };

  /* ---------- Upload ---------- */
  const uploadFile = async (file, folder) => {
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: false, cacheControl: '3600' });

    if (error) throw error;

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  };

  /* ---------- Avatar ---------- */
  const pickAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      return showToast(`Ficheiro demasiado grande (máx ${MAX_FILE_MB}MB).`, 'error');
    }
    setNewAvatarFile(file);
    setNewAvatarPreview(URL.createObjectURL(file));
  };

  /* ---------- Fotos ---------- */
  const pickPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const totalCurrent = form.photos.length + photoFiles.length;
    const available = maxPhotos - totalCurrent;

    if (available <= 0) {
      setShowUpgrade('photos');
      e.target.value = '';
      return;
    }

    const valid = [];
    for (const file of files.slice(0, available)) {
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        showToast(`"${file.name}" excede ${MAX_FILE_MB}MB.`, 'error');
        continue;
      }
      if (!file.type.startsWith('image/')) {
        showToast(`"${file.name}" não é uma imagem.`, 'error');
        continue;
      }
      valid.push({ file, preview: URL.createObjectURL(file) });
    }

    setPhotoFiles((prev) => [...prev, ...valid]);

    // Se o utilizador tentou adicionar mais do que o permitido
    if (files.length > available) {
      setTimeout(() => setShowUpgrade('photos'), 400);
    }
  };

  const removePhoto = (idx) => {
    setForm((f) => ({
      ...f,
      photos: f.photos.filter((_, i) => i !== idx),
    }));
  };

  const removePendingPhoto = (idx) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  /* ---------- Vídeos ---------- */
  const pickVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (form.videos.length >= maxVideos) {
      setShowUpgrade('videos');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      return showToast(`Vídeo excede ${MAX_FILE_MB}MB.`, 'error');
    }
    if (!file.type.startsWith('video/')) {
      return showToast('Ficheiro não é um vídeo.', 'error');
    }

    showToast('A carregar vídeo...', 'info');

    try {
      const url = await uploadFile(file, 'videos');
      setForm((f) => ({ ...f, videos: [...f.videos, url] }));
      showToast('Vídeo carregado.', 'success');
    } catch (err) {
      showToast(err.message || 'Erro no upload.', 'error');
    }
  };

  const removeVideo = (idx) => {
    setForm((f) => ({
      ...f,
      videos: f.videos.filter((_, i) => i !== idx),
    }));
  };

  /* ---------- Guardar ---------- */
  const handleSave = async () => {
    if (!form.name.trim()) return showToast('O nome é obrigatório.', 'error');
    if (!form.birth_date) return showToast('Indica a data de nascimento.', 'error');

    setLoading(true);

    try {
      let avatar_url = form.avatar_url;
      if (newAvatarFile) {
        avatar_url = await uploadFile(newAvatarFile, 'avatar');
      }

      const uploadedPhotos = [];
      for (const { file } of photoFiles) {
        const url = await uploadFile(file, 'photos');
        uploadedPhotos.push(url);
      }

      const city = [form.neighborhood?.trim(), form.district, form.province]
        .filter(Boolean)
        .join(', ');

      const { error } = await supabase
        .from('profiles')
        .update({
          name: form.name.trim(),
          birth_date: form.birth_date,
          city,
          bio: form.bio.trim() || null,
          interests: form.interests,
          avatar_url,
          photos: [...form.photos, ...uploadedPhotos],
          videos: form.videos,
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();

      setNewAvatarFile(null);
      setNewAvatarPreview(null);
      setPhotoFiles([]);
      setEditing(false);
      showToast('Perfil actualizado.', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Erro ao guardar.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (!authProfile) return;
    const city = authProfile.city || '';
    const parts = city.split(',').map((s) => s.trim());

    setForm({
      name: authProfile.name || '',
      birth_date: authProfile.birth_date || '',
      province: parts[2] || '',
      district: parts[1] || '',
      neighborhood: parts[0] || '',
      bio: authProfile.bio || '',
      interests: Array.isArray(authProfile.interests) ? authProfile.interests : [],
      avatar_url: authProfile.avatar_url || null,
      photos: Array.isArray(authProfile.photos) ? authProfile.photos : [],
      videos: Array.isArray(authProfile.videos) ? authProfile.videos : [],
    });

    setNewAvatarFile(null);
    setNewAvatarPreview(null);
    setPhotoFiles([]);
    setEditing(false);
  };

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

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

  if (!authProfile) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  const age = calcAge(form.birth_date);
  const displayAvatar = newAvatarPreview || form.avatar_url;
  const allPhotos = form.photos;
  const totalPhotos = allPhotos.length + photoFiles.length;
  const photosFull = totalPhotos >= maxPhotos;
  const videosFull = form.videos.length >= maxVideos;

  return (
    <>
      <div className="max-w-[1100px] mx-auto">

        {/* ============ CABEÇALHO ============ */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-[26px] sm:text-[30px] font-extrabold tracking-tight text-gray-900">
                {editing ? 'Editar perfil' : 'O meu perfil'}
              </h1>
              <PlanBadge plan={plan} />
            </div>
            <p className="text-[14px] text-gray-500 mt-1">
              {editing
                ? 'Actualiza os teus dados, fotos e vídeos.'
                : 'Vê como o teu perfil aparece para outras pessoas.'}
            </p>
          </div>

          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                bg-gray-900 text-white text-[13.5px] font-semibold
                hover:bg-gray-800 active:scale-[0.98] transition shadow-sm"
            >
              <i className="fi fi-rr-pencil text-base leading-none" />
              <span className="hidden sm:inline">Editar perfil</span>
              <span className="sm:hidden">Editar</span>
            </button>
          ) : (
            <div className="shrink-0 flex items-center gap-2">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="px-3.5 py-2.5 rounded-xl bg-gray-100 text-gray-700
                  text-[13.5px] font-semibold hover:bg-gray-200
                  disabled:opacity-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                  bg-brand-600 text-white text-[13.5px] font-bold
                  hover:bg-brand-700 disabled:opacity-60
                  active:scale-[0.98] transition shadow-lg shadow-brand-600/25"
              >
                {loading ? (
                  <>
                    <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white
                      rounded-full animate-spin" />
                    A guardar...
                  </>
                ) : (
                  <>
                    <i className="fi fi-rr-check text-base leading-none" />
                    Guardar
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ============ CARD DO PERFIL ============ */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">

            <div className="shrink-0 mx-auto sm:mx-0">
              <div className="relative">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden
                  bg-brand-100 border-4 border-white shadow-lg">
                  {displayAvatar ? (
                    <img src={displayAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <i className="fi fi-sr-user text-brand-600 text-5xl leading-none" />
                    </div>
                  )}
                </div>

                {editing && (
                  <label className="absolute -bottom-1 -right-1 w-11 h-11 rounded-full
                    bg-brand-600 text-white flex items-center justify-center
                    shadow-lg cursor-pointer hover:bg-brand-700 transition
                    border-4 border-white">
                    <i className="fi fi-rr-camera text-base leading-none" />
                    <input type="file" accept="image/*" onChange={pickAvatar} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              {!editing ? (
                <>
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <h2 className="font-display text-[24px] sm:text-[26px] font-extrabold text-gray-900 leading-tight">
                      {form.name}{age ? `, ${age}` : ''}
                    </h2>
                    <span className="inline-flex items-center gap-1 text-[10px]
                      font-bold uppercase tracking-wider
                      bg-brand-600 text-white px-2 py-0.5 rounded-full">
                      <i className="fi fi-sr-user text-[10px] leading-none" />
                      És tu
                    </span>
                  </div>

                  {form.province && (
                    <p className="mt-1.5 text-[13.5px] text-gray-500 flex items-center justify-center sm:justify-start gap-1.5">
                      <i className="fi fi-sr-marker leading-none" />
                      {[form.neighborhood, form.district, form.province].filter(Boolean).join(', ')}
                    </p>
                  )}

                  {form.bio && (
                    <p className="mt-3 text-[14px] text-gray-700 leading-relaxed max-w-2xl mx-auto sm:mx-0">
                      {form.bio}
                    </p>
                  )}

                  {form.interests.length > 0 && (
                    <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-1.5">
                      {form.interests.map((t) => (
                        <span
                          key={t}
                          className="text-[12px] font-medium text-gray-700 bg-gray-100
                            px-3 py-1.5 rounded-full"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <Field label="Nome">
                    <input
                      type="text"
                      value={form.name}
                      onChange={update('name')}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200
                        text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500/40
                        focus:border-brand-500 transition"
                    />
                  </Field>

                  <Field label="Data de nascimento">
                    <input
                      type="date"
                      value={form.birth_date}
                      onChange={update('birth_date')}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200
                        text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500/40
                        focus:border-brand-500 transition"
                    />
                  </Field>
                </div>
              )}
            </div>
          </div>

          {/* Edição - resto do formulário */}
          {editing && (
            <div className="mt-8 pt-8 border-t border-gray-100 space-y-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Localização
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Província">
                    <select
                      value={form.province}
                      onChange={(e) => setForm({ ...form, province: e.target.value, district: '' })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200
                        text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500/40
                        focus:border-brand-500 transition bg-white"
                    >
                      <option value="">Escolhe a província</option>
                      {PROVINCE_LIST.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Distrito">
                    <select
                      value={form.district}
                      onChange={update('district')}
                      disabled={!form.province}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200
                        text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500/40
                        focus:border-brand-500 transition bg-white
                        disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {form.province ? 'Escolhe o distrito' : 'Escolhe província primeiro'}
                      </option>
                      {districts.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Bairro (opcional)" className="sm:col-span-2">
                    <input
                      type="text"
                      value={form.neighborhood}
                      onChange={update('neighborhood')}
                      placeholder="Ex.: Polana Caniço"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200
                        text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500/40
                        focus:border-brand-500 transition"
                    />
                  </Field>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Sobre ti
                </p>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[12.5px] font-semibold text-gray-700">
                    Breve descrição
                  </label>
                  <span className="text-[11px] text-gray-400 tabular-nums">
                    {form.bio.length}/200
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={200}
                  value={form.bio}
                  onChange={update('bio')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200
                    text-[14px] resize-none
                    focus:outline-none focus:ring-2 focus:ring-brand-500/40
                    focus:border-brand-500 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Interesses
                  </p>
                  <span className="text-[11px] text-gray-400">
                    {form.interests.length} escolhido{form.interests.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {INTERESTS.map((tag) => {
                    const active = form.interests.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
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
              </div>
            </div>
          )}
        </div>

        {/* ============ FOTOS ============ */}
        <div className="mt-6 bg-white rounded-3xl border border-gray-100 p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display text-[17px] font-extrabold text-gray-900 flex items-center gap-2">
                <i className="fi fi-sr-picture text-brand-600 text-base leading-none" />
                Fotos
              </h3>
              <p className={`text-[12.5px] mt-0.5 ${photosFull ? 'text-brand-600 font-semibold' : 'text-gray-500'}`}>
                {totalPhotos} de {maxPhotos} fotos
                {photosFull && ' · Limite atingido'}
              </p>
            </div>

            {editing && (
              photosFull ? (
                <button
                  onClick={() => setShowUpgrade('photos')}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl
                    bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[13px] font-bold
                    shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50
                    active:scale-[0.98] transition"
                >
                  <i className="fi fi-sr-crown text-base leading-none" />
                  Upgrade
                </button>
              ) : (
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl
                  bg-brand-50 text-brand-700 text-[13px] font-semibold
                  cursor-pointer hover:bg-brand-100 transition">
                  <i className="fi fi-rr-plus text-base leading-none" />
                  Adicionar
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={pickPhotos}
                    className="hidden"
                  />
                </label>
              )
            )}
          </div>

          {totalPhotos === 0 ? (
            <div className="py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <i className="fi fi-rr-picture text-gray-400 text-xl leading-none" />
              </div>
              <p className="text-[13px] text-gray-500">
                {editing ? 'Ainda sem fotos. Adiciona algumas!' : 'Sem fotos publicadas.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {allPhotos.map((src, i) => (
                <div key={`existing-${i}`} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 group">
                  <img src={src} alt="" className="w-full h-full object-cover" draggable="false" />
                  {editing && (
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full
                        bg-red-600 text-white flex items-center justify-center
                        shadow-lg opacity-0 group-hover:opacity-100
                        hover:bg-red-700 transition-all active:scale-90"
                    >
                      <i className="fi fi-rr-trash text-xs leading-none" />
                    </button>
                  )}
                </div>
              ))}

              {photoFiles.map((p, i) => (
                <div key={`pending-${i}`} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 group ring-2 ring-brand-500">
                  <img src={p.preview} alt="" className="w-full h-full object-cover" draggable="false" />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full
                    bg-brand-600 text-white text-[9.5px] font-bold uppercase tracking-wider">
                    Nova
                  </span>
                  {editing && (
                    <button
                      onClick={() => removePendingPhoto(i)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full
                        bg-red-600 text-white flex items-center justify-center
                        shadow-lg opacity-0 group-hover:opacity-100
                        hover:bg-red-700 transition-all active:scale-90"
                    >
                      <i className="fi fi-rr-trash text-xs leading-none" />
                    </button>
                  )}
                </div>
              ))}

              {editing && !photosFull && (
                <label className="aspect-[3/4] rounded-xl border-2 border-dashed border-gray-300
                  flex flex-col items-center justify-center gap-1.5 cursor-pointer
                  hover:border-brand-400 hover:bg-brand-50/50 transition">
                  <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center">
                    <i className="fi fi-rr-plus text-brand-600 text-base leading-none" />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-500">Adicionar</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={pickPhotos}
                    className="hidden"
                  />
                </label>
              )}

              {editing && photosFull && (
                <button
                  onClick={() => setShowUpgrade('photos')}
                  className="aspect-[3/4] rounded-xl border-2 border-dashed border-amber-300
                    bg-gradient-to-br from-amber-50 to-amber-100/50
                    flex flex-col items-center justify-center gap-1.5
                    hover:border-amber-400 transition"
                >
                  <div className="w-9 h-9 rounded-full bg-amber-200 flex items-center justify-center">
                    <i className="fi fi-sr-crown text-amber-700 text-base leading-none" />
                  </div>
                  <span className="text-[11px] font-bold text-amber-800">Upgrade</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ============ VÍDEOS ============ */}
        <div className="mt-6 bg-white rounded-3xl border border-gray-100 p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display text-[17px] font-extrabold text-gray-900 flex items-center gap-2">
                <i className="fi fi-sr-play text-brand-600 text-base leading-none" />
                Vídeos
              </h3>
              <p className={`text-[12.5px] mt-0.5 ${videosFull ? 'text-brand-600 font-semibold' : 'text-gray-500'}`}>
                {form.videos.length} de {maxVideos} vídeos
                {videosFull && ' · Limite atingido'}
              </p>
            </div>

            {editing && (
              videosFull ? (
                <button
                  onClick={() => setShowUpgrade('videos')}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl
                    bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[13px] font-bold
                    shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50
                    active:scale-[0.98] transition"
                >
                  <i className="fi fi-sr-crown text-base leading-none" />
                  Upgrade
                </button>
              ) : (
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl
                  bg-brand-50 text-brand-700 text-[13px] font-semibold
                  cursor-pointer hover:bg-brand-100 transition">
                  <i className="fi fi-rr-plus text-base leading-none" />
                  Adicionar
                  <input
                    type="file"
                    accept="video/*"
                    onChange={pickVideo}
                    className="hidden"
                  />
                </label>
              )
            )}
          </div>

          {form.videos.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <i className="fi fi-rr-play text-gray-400 text-xl leading-none" />
              </div>
              <p className="text-[13px] text-gray-500">
                {editing ? 'Ainda sem vídeos. Adiciona alguns!' : 'Sem vídeos publicados.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {form.videos.map((src, i) => (
                <div
                  key={i}
                  className="relative aspect-[3/4] rounded-xl overflow-hidden bg-black group"
                >
                  <video
                    src={`${src}#t=0.5`}
                    muted
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-cover pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-2 left-2 w-8 h-8 rounded-full
                    bg-white/25 backdrop-blur flex items-center justify-center pointer-events-none">
                    <i className="fi fi-sr-play text-white text-sm leading-none ml-0.5" />
                  </div>

                  {editing && (
                    <button
                      onClick={() => removeVideo(i)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full
                        bg-red-600 text-white flex items-center justify-center
                        shadow-lg opacity-0 group-hover:opacity-100
                        hover:bg-red-700 transition-all active:scale-90"
                    >
                      <i className="fi fi-rr-trash text-xs leading-none" />
                    </button>
                  )}
                </div>
              ))}

              {editing && !videosFull && (
                <label className="aspect-[3/4] rounded-xl border-2 border-dashed border-gray-300
                  flex flex-col items-center justify-center gap-1.5 cursor-pointer
                  hover:border-brand-400 hover:bg-brand-50/50 transition">
                  <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center">
                    <i className="fi fi-rr-video-camera text-brand-600 text-base leading-none" />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-500">Adicionar</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={pickVideo}
                    className="hidden"
                  />
                </label>
              )}

              {editing && videosFull && (
                <button
                  onClick={() => setShowUpgrade('videos')}
                  className="aspect-[3/4] rounded-xl border-2 border-dashed border-amber-300
                    bg-gradient-to-br from-amber-50 to-amber-100/50
                    flex flex-col items-center justify-center gap-1.5
                    hover:border-amber-400 transition"
                >
                  <div className="w-9 h-9 rounded-full bg-amber-200 flex items-center justify-center">
                    <i className="fi fi-sr-crown text-amber-700 text-base leading-none" />
                  </div>
                  <span className="text-[11px] font-bold text-amber-800">Upgrade</span>
                </button>
              )}
            </div>
          )}

          {editing && !videosFull && (
            <p className="mt-4 text-[11.5px] text-gray-400 flex items-center gap-1.5">
              <i className="fi fi-rr-info leading-none" />
              Os vídeos são carregados imediatamente. Máx {maxVideos} · {MAX_FILE_MB}MB cada.
            </p>
          )}
        </div>

        <div className="h-8" />
      </div>

      {/* ============ MODAL DE UPGRADE ============ */}
      {showUpgrade && (
        <UpgradeModal
          type={showUpgrade}
          plan={plan}
          onClose={() => setShowUpgrade(null)}
          onSeePlans={() => { setShowUpgrade(null); navigate('/app/planos'); }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[400]
            px-4 py-2.5 rounded-xl shadow-xl text-[13px] font-semibold
            text-white max-w-[90vw]
            ${toast.type === 'error'
              ? 'bg-red-600'
              : toast.type === 'success'
                ? 'bg-green-600'
                : 'bg-gray-900'}`}
        >
          {toast.msg}
        </div>
      )}
    </>
  );
}

/* ============================================================
   Badge do plano
============================================================ */
function PlanBadge({ plan }) {
  const config = {
    free:    { label: 'Grátis',   icon: 'fi-rr-user',    color: 'bg-gray-100 text-gray-700' },
    pro:     { label: 'Pro',      icon: 'fi-sr-star',    color: 'bg-blue-100 text-blue-700' },
    premium: { label: 'Premium',  icon: 'fi-sr-crown',   color: 'bg-gradient-to-r from-amber-400 to-amber-500 text-white' },
  }[plan] || { label: 'Grátis', icon: 'fi-rr-user', color: 'bg-gray-100 text-gray-700' };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full
      text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
      <i className={`fi ${config.icon} text-[10px] leading-none`} />
      {config.label}
    </span>
  );
}

/* ============================================================
   Modal de upgrade
============================================================ */
function UpgradeModal({ type, plan, onClose, onSeePlans }) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const isPhotos = type === 'photos';
  const current = isPhotos ? limits.photos : limits.videos;
  const proLimit = isPhotos ? PLAN_LIMITS.pro.photos : PLAN_LIMITS.pro.videos;
  const premiumLimit = isPhotos ? PLAN_LIMITS.premium.photos : PLAN_LIMITS.premium.videos;

  return (
    <div className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl
        p-6 pb-8 sm:p-8
        animate-[slideUpUpgrade_250ms_cubic-bezier(0.22,1,0.36,1)]">

        <style>{`
          @keyframes slideUpUpgrade {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
          }
          @media (min-width: 640px) {
            @keyframes slideUpUpgrade {
              from { transform: translateY(20px) scale(0.98); opacity: 0; }
              to   { transform: translateY(0) scale(1); opacity: 1; }
            }
          }
        `}</style>

        <div className="sm:hidden w-12 h-1.5 rounded-full bg-gray-300 mx-auto mb-5" />

        {/* Ícone coroa */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500
            flex items-center justify-center shadow-lg shadow-amber-500/30">
            <i className="fi fi-sr-crown text-white text-2xl leading-none" />
          </div>
        </div>

        <h3 className="font-display text-[20px] font-extrabold text-gray-900 text-center">
          Atingiste o limite do plano Grátis
        </h3>

        <p className="mt-2 text-[14px] text-gray-600 text-center leading-relaxed">
          O plano <strong className="text-gray-900">Grátis</strong> permite até{' '}
          <strong className="text-gray-900">{current} {isPhotos ? 'fotos' : 'vídeos'}</strong>.
          Faz upgrade para adicionar mais.
        </p>

        {/* Comparação */}
        <div className="mt-5 space-y-2">
          <PlanRow
            icon="fi-rr-user"
            label="Grátis"
            limit={`${current} ${isPhotos ? 'fotos' : 'vídeos'}`}
            color="text-gray-500"
            current
          />
          <PlanRow
            icon="fi-sr-star"
            label="Pro"
            limit={`${proLimit} ${isPhotos ? 'fotos' : 'vídeos'}`}
            color="text-blue-600"
          />
          <PlanRow
            icon="fi-sr-crown"
            label="Premium"
            limit={`${premiumLimit} ${isPhotos ? 'fotos' : 'vídeos'}`}
            color="text-amber-600"
          />
        </div>

        {/* CTA */}
        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-700
              font-semibold text-[14.5px]
              hover:bg-gray-200 active:bg-gray-300 transition"
          >
            Agora não
          </button>
          <button
            onClick={onSeePlans}
            className="flex-1 py-3.5 rounded-xl
              bg-gradient-to-r from-amber-500 to-amber-600 text-white
              font-bold text-[14.5px]
              hover:from-amber-600 hover:to-amber-700
              active:scale-[0.98] transition
              shadow-lg shadow-amber-500/30
              flex items-center justify-center gap-2"
          >
            <i className="fi fi-sr-crown text-base leading-none" />
            Ver planos
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanRow({ icon, label, limit, color, current }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl
      ${current ? 'bg-gray-50 border border-gray-200' : 'bg-white border border-gray-100'}`}>
      <div className="flex items-center gap-2.5">
        <i className={`fi ${icon} ${color} text-base leading-none`} />
        <span className={`text-[13.5px] font-semibold ${current ? 'text-gray-700' : 'text-gray-900'}`}>
          {label}
        </span>
        {current && (
          <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold uppercase">
            Actual
          </span>
        )}
      </div>
      <span className={`text-[13px] font-bold ${color} tabular-nums`}>
        {limit}
      </span>
    </div>
  );
}

/* ============================================================
   Field auxiliar
============================================================ */
function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-[12.5px] font-semibold text-gray-700 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}