import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

/* ---------- Províncias de Moçambique ---------- */
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

/* ---------- Interesses ---------- */
const INTERESTS = [
  'Música', 'Viagens', 'Café', 'Livros', 'Praia', 'Arte',
  'Tecnologia', 'Futebol', 'Cozinha', 'Dança', 'Gastronomia',
  'Cinema', 'Desporto', 'Fotografia', 'Moda', 'Animais',
];

/* ============================================================
   Países — com regras de dígitos e prefixos válidos
   ------------------------------------------------------------
   min/max: número de dígitos do número local (sem código país)
   prefix: regex que valida o primeiro dígito (opcional)
   hint:   texto mostrado ao utilizador como exemplo
============================================================ */
const COUNTRIES = [
  {
    code: 'MZ', flag: '🇲🇿', name: 'Moçambique', dial: '+258',
    min: 9, max: 9,
    prefix: /^[82]/,
    prefixError: 'Número moçambicano deve começar por 8 ou 2.',
    hint: '84 123 4567',
  },
  {
    code: 'PT', flag: '🇵🇹', name: 'Portugal', dial: '+351',
    min: 9, max: 9,
    prefix: /^[239]/,
    prefixError: 'Número português deve começar por 2, 3 ou 9.',
    hint: '912 345 678',
  },
  {
    code: 'ZA', flag: '🇿🇦', name: 'África do Sul', dial: '+27',
    min: 9, max: 9,
    prefix: /^[678]/,
    prefixError: 'Número sul-africano deve começar por 6, 7 ou 8.',
    hint: '71 234 5678',
  },
  {
    code: 'AO', flag: '🇦🇴', name: 'Angola', dial: '+244',
    min: 9, max: 9,
    prefix: /^[29]/,
    prefixError: 'Número angolano deve começar por 2 ou 9.',
    hint: '923 456 789',
  },
  {
    code: 'BR', flag: '🇧🇷', name: 'Brasil', dial: '+55',
    min: 10, max: 11,
    prefix: /^[1-9]/,
    hint: '11 91234 5678',
  },
  {
    code: 'CV', flag: '🇨🇻', name: 'Cabo Verde', dial: '+238',
    min: 7, max: 7,
    prefix: /^[259]/,
    prefixError: 'Número cabo-verdiano deve começar por 2, 5 ou 9.',
    hint: '991 2345',
  },
  {
    code: 'GW', flag: '🇬🇼', name: 'Guiné-Bissau', dial: '+245',
    min: 7, max: 9,
    hint: '955 123 456',
  },
  {
    code: 'ST', flag: '🇸🇹', name: 'São Tomé e Príncipe', dial: '+239',
    min: 7, max: 7,
    hint: '991 2345',
  },
  {
    code: 'TL', flag: '🇹🇱', name: 'Timor-Leste', dial: '+670',
    min: 7, max: 8,
    prefix: /^7/,
    prefixError: 'Número timorense deve começar por 7.',
    hint: '7712 3456',
  },
  {
    code: 'ZW', flag: '🇿🇼', name: 'Zimbabué', dial: '+263',
    min: 9, max: 10,
    prefix: /^7/,
    prefixError: 'Número zimbabueano deve começar por 7.',
    hint: '71 234 5678',
  },
  {
    code: 'TZ', flag: '🇹🇿', name: 'Tanzânia', dial: '+255',
    min: 9, max: 9,
    prefix: /^[67]/,
    prefixError: 'Número tanzaniano deve começar por 6 ou 7.',
    hint: '712 345 678',
  },
  {
    code: 'ZM', flag: '🇿🇲', name: 'Zâmbia', dial: '+260',
    min: 9, max: 9,
    prefix: /^[79]/,
    prefixError: 'Número zambiano deve começar por 7 ou 9.',
    hint: '971 234 567',
  },
  {
    code: 'MW', flag: '🇲🇼', name: 'Malawi', dial: '+265',
    min: 9, max: 9,
    prefix: /^[89]/,
    prefixError: 'Número malawiano deve começar por 8 ou 9.',
    hint: '991 234 567',
  },
  {
    code: 'SZ', flag: '🇸🇿', name: 'Essuatíni', dial: '+268',
    min: 8, max: 8,
    prefix: /^7/,
    prefixError: 'Número suazi deve começar por 7.',
    hint: '7612 3456',
  },
  {
    code: 'NG', flag: '🇳🇬', name: 'Nigéria', dial: '+234',
    min: 10, max: 10,
    prefix: /^[789]/,
    prefixError: 'Número nigeriano deve começar por 7, 8 ou 9.',
    hint: '803 123 4567',
  },
  {
    code: 'KE', flag: '🇰🇪', name: 'Quénia', dial: '+254',
    min: 9, max: 9,
    prefix: /^[17]/,
    prefixError: 'Número queniano deve começar por 1 ou 7.',
    hint: '712 345 678',
  },
  {
    code: 'US', flag: '🇺🇸', name: 'Estados Unidos', dial: '+1',
    min: 10, max: 10,
    prefix: /^[2-9]/,
    prefixError: 'Número americano deve começar por 2 a 9.',
    hint: '212 555 0123',
  },
  {
    code: 'GB', flag: '🇬🇧', name: 'Reino Unido', dial: '+44',
    min: 10, max: 10,
    prefix: /^7/,
    prefixError: 'Número britânico deve começar por 7.',
    hint: '7123 456 789',
  },
  {
    code: 'FR', flag: '🇫🇷', name: 'França', dial: '+33',
    min: 9, max: 9,
    prefix: /^[1-9]/,
    hint: '6 12 34 56 78',
  },
  {
    code: 'ES', flag: '🇪🇸', name: 'Espanha', dial: '+34',
    min: 9, max: 9,
    prefix: /^[6789]/,
    prefixError: 'Número espanhol deve começar por 6, 7, 8 ou 9.',
    hint: '612 345 678',
  },
];

const DEFAULT_COUNTRY = COUNTRIES[0];

/* ---------- Helpers WhatsApp ---------- */
function digitsOnly(raw) { return String(raw || '').replace(/\D/g, ''); }

function formatLocal(raw, country) {
  const d = digitsOnly(raw).slice(0, country?.max || 15);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

function splitPhone(fullPhone) {
  const digits = digitsOnly(fullPhone);
  if (!digits) return { country: DEFAULT_COUNTRY, local: '' };
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    const dialDigits = digitsOnly(c.dial);
    if (digits.startsWith(dialDigits) && digits.length > dialDigits.length) {
      return { country: c, local: digits.slice(dialDigits.length) };
    }
  }
  return { country: DEFAULT_COUNTRY, local: digits };
}

/* Valida um número local contra o país escolhido */
function validateWaNumber(country, localDigits) {
  const digits = digitsOnly(localDigits);
  if (!digits) return { ok: false, msg: null }; // vazio → sem mensagem

  if (digits.length < country.min) {
    const falta = country.min - digits.length;
    return {
      ok: false,
      msg: `Faltam ${falta} dígito${falta !== 1 ? 's' : ''} — ${country.name} tem ${country.min} dígitos.`,
    };
  }
  if (digits.length > country.max) {
    const extra = digits.length - country.max;
    return {
      ok: false,
      msg: `Demasiado longo — ${country.name} tem no máximo ${country.max} dígitos.`,
    };
  }
  if (country.prefix && !country.prefix.test(digits)) {
    return {
      ok: false,
      msg: country.prefixError || 'Prefixo inválido para este país.',
    };
  }
  return { ok: true, msg: null };
}

/* ---------- Ícone WhatsApp ---------- */
function WhatsAppIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const [form, setForm] = useState({
    name: profile?.name || '',
    birth_date: profile?.birth_date || '',
    province: '',
    district: '',
    neighborhood: '',
    bio: profile?.bio || '',
    interests: [],
  });

  /* ---------- WhatsApp ---------- */
  const [waCountry, setWaCountry] = useState(DEFAULT_COUNTRY);
  const [waLocal, setWaLocal] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const countryRef = useRef(null);

  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState(profile?.avatar_url || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const districts = useMemo(
    () => (form.province ? PROVINCES[form.province] || [] : []),
    [form.province]
  );

  /* Resultado da validação do WhatsApp em tempo real */
  const waCheck = useMemo(
    () => validateWaNumber(waCountry, waLocal),
    [waCountry, waLocal]
  );

  /* Preenche o WhatsApp caso já exista no perfil */
  useEffect(() => {
    if (!profile) return;
    const stored = profile.whatsapp || profile.phone || '';
    if (stored) {
      const { country, local } = splitPhone(stored);
      setWaCountry(country);
      setWaLocal(local);
    }
    if (profile.city) {
      const parts = profile.city.split(',').map((s) => s.trim());
      const neighborhood = parts.length === 3 ? parts[0] : '';
      const district = parts.length >= 2 ? parts[parts.length - 2] : parts[0] || '';
      const province = parts.length >= 1 ? parts[parts.length - 1] : '';
      const validProvince = PROVINCE_LIST.includes(province) ? province : '';
      const validDistrict = validProvince && (PROVINCES[validProvince] || []).includes(district)
        ? district
        : '';
      setForm((f) => ({
        ...f,
        province: validProvince,
        district: validDistrict,
        neighborhood: neighborhood || '',
      }));
    }
  }, [profile]);

  /* Fecha o dropdown de país ao clicar fora */
  useEffect(() => {
    const onClick = (e) => {
      if (countryRef.current && !countryRef.current.contains(e.target)) {
        setCountryOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const update = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    if (fieldErrors[k]) setFieldErrors((f) => ({ ...f, [k]: null }));
  };

  const handleProvinceChange = (e) => {
    setForm({ ...form, province: e.target.value, district: '' });
    if (fieldErrors.province) setFieldErrors((f) => ({ ...f, province: null, district: null }));
  };

  const toggleInterest = (tag) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(tag)
        ? f.interests.filter((i) => i !== tag)
        : f.interests.length < 6
          ? [...f.interests, tag]
          : f.interests,
    }));
    if (fieldErrors.interests) setFieldErrors((f) => ({ ...f, interests: null }));
  };

  const pickAvatar = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      return setError('A foto de perfil não pode exceder 10MB.');
    }
    setAvatarFile(f);
    setPreview(URL.createObjectURL(f));
    if (fieldErrors.avatar) setFieldErrors((fe) => ({ ...fe, avatar: null }));
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return profile?.avatar_url ?? null;
    const rawExt = avatarFile.name.split('.').pop();
    const ext = (rawExt && rawExt.length <= 5 ? rawExt : 'jpg').toLowerCase();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type || undefined });
    if (upErr) throw upErr;

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  };

  /* ---------- Validação geral ---------- */
  const validate = () => {
    const errs = {};
    if (!preview && !avatarFile) errs.avatar = 'Adiciona uma foto de perfil.';
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = 'Diz-nos o teu nome.';
    if (!form.birth_date) errs.birth_date = 'Indica a tua data de nascimento.';
    if (!form.province) errs.province = 'Escolhe a tua província.';
    if (!form.district) errs.district = 'Escolhe o teu distrito.';

    // WhatsApp com regras do país
    const localDigits = digitsOnly(waLocal);
    if (!localDigits) {
      errs.whatsapp = 'Adiciona o teu número de WhatsApp.';
    } else {
      const check = validateWaNumber(waCountry, localDigits);
      if (!check.ok) errs.whatsapp = check.msg;
    }

    if (form.bio.trim().length < 10) {
      errs.bio = 'Escreve pelo menos 20 caracteres sobre ti.';
    }
    if (form.interests.length < 3) {
      errs.interests = 'Escolhe pelo menos 3 interesses.';
    }

    return errs;
  };

  const handleFinish = async () => {
    setError('');
    const errs = validate();

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      const firstError = Object.values(errs)[0];
      setError(firstError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const avatar_url = await uploadAvatar();
      const city = [form.neighborhood?.trim(), form.district, form.province]
        .filter(Boolean)
        .join(', ');

      const localDigits = digitsOnly(waLocal);
      const fullWhatsapp = localDigits ? `${waCountry.dial}${localDigits}` : null;

      const { error: upErr } = await supabase
        .from('profiles')
        .update({
          name: form.name.trim(),
          birth_date: form.birth_date,
          city,
          bio: form.bio.trim() || null,
          interests: form.interests,
          whatsapp: fullWhatsapp,
          avatar_url,
          onboarding_completed: true,
        })
        .eq('id', user.id);

      if (upErr) throw upErr;

      await refreshProfile();
      navigate('/app/descobrir', { replace: true });
    } catch (err) {
      setError(err.message || 'Erro ao guardar.');
    } finally {
      setLoading(false);
    }
  };

  /* Estados do WhatsApp para feedback visual */
  const waEmpty = !waLocal;
  const waInvalid = !waEmpty && !waCheck.ok;
  const waValid = !waEmpty && waCheck.ok;

  const inputBase =
    'w-full px-3.5 py-2.5 rounded-lg border bg-white ' +
    'placeholder:text-gray-400 text-[14px] text-gray-900 ' +
    'focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 ' +
    'transition';

  const inputOk = 'border-gray-300';
  const inputErr = 'border-red-400 bg-red-50/40';

  const inputClass = (key, extra = '') =>
    `${inputBase} ${fieldErrors[key] ? inputErr : inputOk} ${extra}`;

  const selectBase = (key) =>
    `w-full pl-10 pr-9 py-2.5 rounded-lg border bg-white ` +
    `text-[14px] text-gray-900 appearance-none cursor-pointer ` +
    `focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 ` +
    `transition disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 ` +
    `${fieldErrors[key] ? inputErr : inputOk}`;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-5 sm:px-6 py-6 sm:py-8">

        {/* Logo */}
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
            Um perfil completo ajuda-te a conhecer mais pessoas.
          </p>
        </div>

        {/* Avatar */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="relative">
            <div className={`w-20 h-20 rounded-full overflow-hidden bg-brand-100 border-3 border-white shadow-md
              flex items-center justify-center
              ${fieldErrors.avatar ? 'ring-2 ring-red-400' : ''}`}>
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
              Foto de perfil <span className="text-red-500">*</span>
            </p>
            <p className="text-[11.5px] text-gray-500 mt-0.5">
              Ajuda os outros a reconhecer-te
            </p>
            {fieldErrors.avatar && (
              <p className="text-[11.5px] text-red-600 font-medium mt-1">
                {fieldErrors.avatar}
              </p>
            )}
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
                  Nome <span className="text-red-500">*</span>
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
                    className={inputClass('name', 'pl-9')}
                  />
                </div>
                {fieldErrors.name && (
                  <p className="mt-1 text-[11px] text-red-600">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-gray-700 mb-1">
                  Data de nascimento <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <i className="fi fi-rr-cake-birthday text-sm leading-none" />
                  </span>
                  <input
                    type="date"
                    value={form.birth_date}
                    onChange={update('birth_date')}
                    className={inputClass('birth_date', 'pl-9')}
                  />
                </div>
                {fieldErrors.birth_date && (
                  <p className="mt-1 text-[11px] text-red-600">{fieldErrors.birth_date}</p>
                )}
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
                  Província <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <i className="fi fi-rr-marker text-sm leading-none" />
                  </span>
                  <select
                    value={form.province}
                    onChange={handleProvinceChange}
                    className={selectBase('province')}
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
                {fieldErrors.province && (
                  <p className="mt-1 text-[11px] text-red-600">{fieldErrors.province}</p>
                )}
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-gray-700 mb-1">
                  Distrito <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <i className="fi fi-rr-marker text-sm leading-none" />
                  </span>
                  <select
                    value={form.district}
                    onChange={update('district')}
                    disabled={!form.province}
                    className={selectBase('district')}
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
                {fieldErrors.district && (
                  <p className="mt-1 text-[11px] text-red-600">{fieldErrors.district}</p>
                )}
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
                    className={inputClass('neighborhood', 'pl-9')}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Secção 3: WhatsApp com validação por país */}
          <section>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2.5">
              Contacto WhatsApp
            </h2>

            <div className="flex items-stretch gap-2">
              {/* Seletor de país */}
              <div className="relative shrink-0" ref={countryRef}>
                <button
                  type="button"
                  onClick={() => setCountryOpen((v) => !v)}
                  className={`h-full flex items-center gap-2 pl-3 pr-2.5 rounded-lg
                    border transition min-w-[110px]
                    ${countryOpen
                      ? 'border-green-500 bg-white ring-2 ring-green-500/20'
                      : (fieldErrors.whatsapp || waInvalid)
                        ? inputErr
                        : waValid
                          ? 'border-green-400 bg-green-50/30'
                          : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                >
                  <span className="text-xl leading-none">{waCountry.flag}</span>
                  <span className="text-[14px] font-bold text-gray-900 tabular-nums">
                    {waCountry.dial}
                  </span>
                  <i className={`fi fi-rr-angle-small-down text-gray-400 text-sm leading-none
                    transition-transform ${countryOpen ? 'rotate-180' : ''}`} />
                </button>

                {countryOpen && (
                  <div className="absolute left-0 top-full mt-2 w-[320px] max-h-[320px]
                    overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-100
                    p-1.5 z-[120]">
                    <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      País · dígitos
                    </p>
                    {COUNTRIES.map((c) => {
                      const active = c.code === waCountry.code;
                      return (
                        <button key={c.code} type="button"
                          onClick={() => { setWaCountry(c); setCountryOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                            transition ${active
                              ? 'bg-green-50 text-green-700'
                              : 'hover:bg-gray-50 text-gray-700'}`}>
                          <span className="text-lg leading-none shrink-0">{c.flag}</span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[13px] font-medium truncate">{c.name}</span>
                            <span className="block text-[10.5px] text-gray-400">
                              {c.min === c.max ? `${c.min} dígitos` : `${c.min}–${c.max} dígitos`}
                            </span>
                          </span>
                          <span className="text-[12.5px] font-bold text-gray-500 tabular-nums">
                            {c.dial}
                          </span>
                          {active && (
                            <i className="fi fi-sr-check text-green-600 text-sm leading-none" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Número */}
              <div className={`flex-1 flex items-center gap-2 px-3.5 rounded-lg
                bg-white border transition
                ${fieldErrors.whatsapp || waInvalid
                  ? inputErr
                  : 'border-gray-300 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500/20'}`}>
                <div className="w-9 h-9 rounded-full bg-[#25D366]/10
                  flex items-center justify-center shrink-0">
                  <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                </div>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder={waCountry.hint || 'Número local'}
                  value={formatLocal(waLocal, waCountry)}
                  onChange={(e) => {
                    const d = digitsOnly(e.target.value).slice(0, waCountry.max);
                    setWaLocal(d);
                    if (fieldErrors.whatsapp) setFieldErrors((f) => ({ ...f, whatsapp: null }));
                  }}
                  className="flex-1 bg-transparent outline-none py-2.5
                    text-[14px] font-semibold text-gray-900
                    placeholder:text-gray-400 placeholder:font-normal"
                />
                {waValid && (
                  <i className="fi fi-sr-check-circle text-green-500 text-base leading-none shrink-0" />
                )}
                {waInvalid && (
                  <i className="fi fi-sr-cross-circle text-red-500 text-base leading-none shrink-0" />
                )}
              </div>
            </div>

            {/* Feedback do WhatsApp */}
            {fieldErrors.whatsapp ? (
              <p className="mt-1 text-[11px] text-red-600 flex items-start gap-1">
                <i className="fi fi-sr-info text-[10px] leading-none mt-0.5 shrink-0" />
                {fieldErrors.whatsapp}
              </p>
            ) : waInvalid ? (
              <p className="mt-1 text-[11px] text-red-600 flex items-start gap-1">
                <i className="fi fi-sr-info text-[10px] leading-none mt-0.5 shrink-0" />
                {waCheck.msg}
              </p>
            ) : waValid ? (
              <p className="mt-1 text-[11px] text-green-700 font-medium flex items-center gap-1">
                <i className="fi fi-sr-check-circle text-[11px] leading-none" />
                Válido · {waCountry.dial} {formatLocal(waLocal, waCountry)}
              </p>
            ) : (
              <p className="mt-1.5 text-[11.5px] text-gray-500 leading-snug">
                {waCountry.min === waCountry.max
                  ? `${waCountry.name}: ${waCountry.min} dígitos`
                  : `${waCountry.name}: ${waCountry.min}–${waCountry.max} dígitos`}
                {' '}· exemplo: <span className="text-gray-700 font-medium">{waCountry.dial} {waCountry.hint}</span>
              </p>
            )}

            {/* Contador de dígitos em tempo real */}
            {waEmpty ? (
              <p className="mt-1 text-[10.5px] text-gray-400">
                <span className="text-red-500 font-bold">*</span> Campo obrigatório
              </p>
            ) : (
              <p className={`mt-1 text-[10.5px] font-medium tabular-nums
                ${waCheck.ok ? 'text-green-600' : 'text-amber-600'}`}>
                {waLocal.length} de {waCountry.min === waCountry.max ? waCountry.min : `${waCountry.min}–${waCountry.max}`} dígitos
              </p>
            )}
          </section>

          {/* Secção 4: Sobre ti */}
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Sobre ti <span className="text-red-500">*</span>
              </h2>
              <span className={`text-[11px] tabular-nums
                ${form.bio.length < 20 ? 'text-red-500' : 'text-gray-400'}`}>
                {form.bio.length}/200
              </span>
            </div>

            <textarea
              rows={3}
              maxLength={200}
              value={form.bio}
              onChange={update('bio')}
              placeholder="Sou uma pessoa tranquila, gosto de música, tecnologia e conhecer pessoas novas..."
              className={inputClass('bio', 'resize-none')}
            />
            {fieldErrors.bio ? (
              <p className="mt-1 text-[11px] text-red-600">{fieldErrors.bio}</p>
            ) : (
              <p className="mt-1 text-[11px] text-gray-400">
                Mínimo 20 caracteres · uma breve descrição ajuda bastante
              </p>
            )}
          </section>

          {/* Secção 5: Interesses */}
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Interesses <span className="text-red-500">*</span>
              </h2>
              <span className={`text-[11px] tabular-nums
                ${form.interests.length < 3 ? 'text-red-500' : 'text-gray-400'}`}>
                {form.interests.length}/6 · mín. 3
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {INTERESTS.map((tag) => {
                const active = form.interests.includes(tag);
                return (
                  <button key={tag} type="button" onClick={() => toggleInterest(tag)}
                    className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium
                      transition border
                      ${active
                        ? 'bg-brand-600 border-brand-600 text-white'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-brand-300'}`}>
                    {tag}
                  </button>
                );
              })}
            </div>

            {fieldErrors.interests && (
              <p className="mt-1.5 text-[11px] text-red-600">{fieldErrors.interests}</p>
            )}
          </section>

          {/* Erro geral */}
          {error && (
            <div className="flex items-start gap-2 text-[13px] text-red-700 bg-red-50
              border border-red-200 rounded-lg px-3 py-2.5">
              <i className="fi fi-rr-exclamation text-sm leading-none mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* CTA */}
          <div className="pt-1">
            <button
              onClick={handleFinish}
              disabled={loading}
              className="w-full py-3.5 rounded-lg bg-brand-600 text-white font-bold text-[14.5px]
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

            <p className="mt-2.5 text-center text-[11px] text-gray-400 leading-relaxed">
              Ao continuar, confirmas que tens 18+ anos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}