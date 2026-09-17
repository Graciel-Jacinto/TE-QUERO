import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { track } from '../../lib/track';

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

const INTERESTS = [
  'Mulheres', 'Homens',
  'Música', 'Viagens', 'Café', 'Livros', 'Praia', 'Arte',
  'Tecnologia', 'Futebol', 'Cozinha', 'Dança', 'Gastronomia',
  'Cinema', 'Desporto', 'Fotografia', 'Moda', 'Animais',
];

/* ============================================================
   Ícones de Género — SVG realistas e detalhados
============================================================ */
function MaleAvatarIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path
        d="M14.5 24.5C14.5 15 21 8.5 32 8.5s17.5 6.5 17.5 16c0 .8-.05 1.7-.15 2.5-.4-.9-.9-1.7-1.6-2.4-1.1-1.2-2.7-2.1-4.6-2.5-1.9-.4-4-.3-6.1.2-1.9.4-3.7 1.1-5.2 2-1.2.7-2.2 1.5-3 2.4-.5.6-1 1.2-1.3 1.9-.15.3-.25.6-.35.9-.15-.7-.25-1.4-.3-2.1-.1-.6-.15-1.3-.15-1.9z"
        fill="currentColor"
      />
      <ellipse cx="20" cy="28.5" rx="1.8" ry="2.5" fill="currentColor" />
      <ellipse cx="44" cy="28.5" rx="1.8" ry="2.5" fill="currentColor" />
      <ellipse cx="32" cy="27.5" rx="11.5" ry="12.5" fill="currentColor" />
      <rect x="28.5" y="36" width="7" height="6" rx="2" fill="currentColor" />
      <path
        d="M14 58c0-7.5 4.5-13.5 11.5-15.5l6.5-1.5 6.5 1.5C45.5 44.5 50 50.5 50 58H14z"
        fill="currentColor"
      />
      <path d="M28 42l4 3 4-3-2-1.5-2 1-2-1z" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

function FemaleAvatarIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path
        d="M12 27c0-12 9-20 20-20s20 8 20 20v15c0 3-.3 6-1 9-.3.7-.6 1.4-1 2h-6c.6-1.5 1-3.2 1.2-5 .2-1.3.3-2.7.3-4V28c0-8.5-6-14.5-13.5-14.5S18.5 19.5 18.5 28v16c0 1.3.1 2.7.3 4 .2 1.8.6 3.5 1.2 5h-6c-.4-.6-.7-1.3-1-2-.7-3-1-6-1-9V27z"
        fill="currentColor"
      />
      <ellipse cx="32" cy="27.5" rx="10.5" ry="11.5" fill="currentColor" />
      <rect x="29" y="35" width="6" height="5" rx="2" fill="currentColor" />
      <path
        d="M15 58c0-7 4-12.5 10.5-14.5l6.5-2 6.5 2C45 45.5 49 51 49 58H15z"
        fill="currentColor"
      />
      <path
        d="M29 41c1.5 1.5 3.5 2 3 2s1.5-.5 3-2c-1-1-2-1.5-3-1.5s-2 .5-3 1.5z"
        fill="currentColor"
        opacity="0.5"
      />
    </svg>
  );
}

const GENDERS = [
  {
    value: 'male',
    label: 'Homem',
    description: 'Sou um homem',
    Icon: MaleAvatarIcon,
    activeGradient: 'from-blue-400 via-blue-500 to-blue-600',
    activeBg: 'bg-blue-50',
    activeBorder: 'border-blue-500',
    activeText: 'text-blue-700',
    shadow: 'shadow-blue-500/30',
    checkBg: 'bg-blue-500',
  },
  {
    value: 'female',
    label: 'Mulher',
    description: 'Sou uma mulher',
    Icon: FemaleAvatarIcon,
    activeGradient: 'from-brand-400 via-brand-500 to-brand-600',
    activeBg: 'bg-brand-50',
    activeBorder: 'border-brand-500',
    activeText: 'text-brand-700',
    shadow: 'shadow-brand-500/30',
    checkBg: 'bg-brand-500',
  },
];

const MAX_AVATAR_MB = 10;
const MAX_AVATAR_BYTES = MAX_AVATAR_MB * 1024 * 1024;

/* ---------- Países ---------- */
const COUNTRIES = [
  { code: 'MZ', flag: '🇲🇿', name: 'Moçambique', dial: '+258', min: 9, max: 9, prefix: /^[82]/, prefixError: 'Número deve começar por 8 ou 2.', hint: '84 123 4567' },
  { code: 'PT', flag: '🇵🇹', name: 'Portugal', dial: '+351', min: 9, max: 9, prefix: /^[239]/, prefixError: 'Número deve começar por 2, 3 ou 9.', hint: '912 345 678' },
  { code: 'ZA', flag: '🇿🇦', name: 'África do Sul', dial: '+27', min: 9, max: 9, prefix: /^[678]/, prefixError: 'Número deve começar por 6, 7 ou 8.', hint: '71 234 5678' },
  { code: 'AO', flag: '🇦🇴', name: 'Angola', dial: '+244', min: 9, max: 9, prefix: /^[29]/, prefixError: 'Número deve começar por 2 ou 9.', hint: '923 456 789' },
  { code: 'BR', flag: '🇧🇷', name: 'Brasil', dial: '+55', min: 10, max: 11, prefix: /^[1-9]/, hint: '11 91234 5678' },
  { code: 'CV', flag: '🇨🇻', name: 'Cabo Verde', dial: '+238', min: 7, max: 7, prefix: /^[259]/, prefixError: 'Número deve começar por 2, 5 ou 9.', hint: '991 2345' },
  { code: 'GW', flag: '🇬🇼', name: 'Guiné-Bissau', dial: '+245', min: 7, max: 9, hint: '955 123 456' },
  { code: 'ST', flag: '🇸🇹', name: 'São Tomé e Príncipe', dial: '+239', min: 7, max: 7, hint: '991 2345' },
  { code: 'TL', flag: '🇹🇱', name: 'Timor-Leste', dial: '+670', min: 7, max: 8, prefix: /^7/, prefixError: 'Número deve começar por 7.', hint: '7712 3456' },
  { code: 'ZW', flag: '🇿🇼', name: 'Zimbabué', dial: '+263', min: 9, max: 10, prefix: /^7/, prefixError: 'Número deve começar por 7.', hint: '71 234 5678' },
  { code: 'TZ', flag: '🇹🇿', name: 'Tanzânia', dial: '+255', min: 9, max: 9, prefix: /^[67]/, prefixError: 'Número deve começar por 6 ou 7.', hint: '712 345 678' },
  { code: 'ZM', flag: '🇿🇲', name: 'Zâmbia', dial: '+260', min: 9, max: 9, prefix: /^[79]/, prefixError: 'Número deve começar por 7 ou 9.', hint: '971 234 567' },
  { code: 'MW', flag: '🇲🇼', name: 'Malawi', dial: '+265', min: 9, max: 9, prefix: /^[89]/, prefixError: 'Número deve começar por 8 ou 9.', hint: '991 234 567' },
  { code: 'SZ', flag: '🇸🇿', name: 'Essuatíni', dial: '+268', min: 8, max: 8, prefix: /^7/, prefixError: 'Número deve começar por 7.', hint: '7612 3456' },
  { code: 'NG', flag: '🇳🇬', name: 'Nigéria', dial: '+234', min: 10, max: 10, prefix: /^[789]/, prefixError: 'Número deve começar por 7, 8 ou 9.', hint: '803 123 4567' },
  { code: 'KE', flag: '🇰🇪', name: 'Quénia', dial: '+254', min: 9, max: 9, prefix: /^[17]/, prefixError: 'Número deve começar por 1 ou 7.', hint: '712 345 678' },
  { code: 'US', flag: '🇺🇸', name: 'Estados Unidos', dial: '+1', min: 10, max: 10, prefix: /^[2-9]/, prefixError: 'Número deve começar por 2 a 9.', hint: '212 555 0123' },
  { code: 'GB', flag: '🇬🇧', name: 'Reino Unido', dial: '+44', min: 10, max: 10, prefix: /^7/, prefixError: 'Número deve começar por 7.', hint: '7123 456 789' },
  { code: 'FR', flag: '🇫🇷', name: 'França', dial: '+33', min: 9, max: 9, prefix: /^[1-9]/, hint: '6 12 34 56 78' },
  { code: 'ES', flag: '🇪🇸', name: 'Espanha', dial: '+34', min: 9, max: 9, prefix: /^[6789]/, prefixError: 'Número deve começar por 6, 7, 8 ou 9.', hint: '612 345 678' },
];

const DEFAULT_COUNTRY = COUNTRIES[0];

const STEPS = [
  { id: 1, title: 'Foto e nome',   subtitle: 'Como apareces no feed' },
  { id: 2, title: 'Localização',   subtitle: 'Onde estás' },
  { id: 3, title: 'WhatsApp',      subtitle: 'Como te contactam' },
  { id: 4, title: 'Sobre ti',      subtitle: 'Bio e interesses' },
];

/* ---------- Helpers ---------- */
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

function validateWaNumber(country, localDigits) {
  const digits = digitsOnly(localDigits);
  if (!digits) return { ok: false, msg: null };
  if (digits.length < country.min) return { ok: false, msg: `Faltam ${country.min - digits.length} dígito${country.min - digits.length !== 1 ? 's' : ''}.` };
  if (digits.length > country.max) return { ok: false, msg: `Máximo ${country.max} dígitos.` };
  if (country.prefix && !country.prefix.test(digits)) return { ok: false, msg: country.prefixError || 'Prefixo inválido.' };
  return { ok: true, msg: null };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const ERROR_MESSAGES = {
  avatar:       { empty: 'Adiciona uma foto de perfil para continuares.' },
  name:         { empty: 'Diz-nos como te chamas.', short: 'O nome está muito curto — mínimo 2 letras.' },
  birth_date:   { empty: 'Precisamos da tua data de nascimento.' },
  gender:       { empty: 'Escolhe o teu género.' },
  province:     { empty: 'Escolhe a tua província.' },
  district:     { empty: 'Escolhe o teu distrito.' },
  neighborhood: { empty: 'Indica o teu bairro.', short: 'O nome do bairro está muito curto — mínimo 2 letras.' },
  whatsapp:     { empty: 'Adiciona o teu número de WhatsApp.' },
  bio:          { empty: 'Conta-nos um pouco sobre ti.', short: 'A descrição é muito curta — mínimo 20 caracteres.' },
  interests:    { empty: 'Escolhe pelo menos 3 interesses.', short: 'Escolhe pelo menos 3 interesses para continuar.' },
};

function getErrorText(key, form, waCheck, waEmpty) {
  const cfg = ERROR_MESSAGES[key];
  if (!cfg) return null;
  switch (key) {
    case 'avatar':       return cfg.empty;
    case 'name':         return !form.name ? cfg.empty : form.name.trim().length < 2 ? cfg.short : null;
    case 'birth_date':   return !form.birth_date ? cfg.empty : null;
    case 'gender':       return !form.gender ? cfg.empty : null;
    case 'province':     return !form.province ? cfg.empty : null;
    case 'district':     return !form.district ? cfg.empty : null;
    case 'neighborhood': return !form.neighborhood ? cfg.empty : form.neighborhood.trim().length < 2 ? cfg.short : null;
    case 'whatsapp':     return waEmpty ? cfg.empty : !waCheck.ok ? waCheck.msg : null;
    case 'bio':          return !form.bio ? cfg.empty : form.bio.trim().length < 20 ? cfg.short : null;
    case 'interests':    return form.interests.length === 0 ? cfg.empty : form.interests.length < 3 ? cfg.short : null;
    default:             return null;
  }
}

function WhatsAppIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function StatusIcon({ state }) {
  if (state === 'ok') {
    return (
      <span className="shrink-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center
        animate-[popIn_220ms_cubic-bezier(0.34,1.56,0.64,1)]">
        <i className="fi fi-sr-check text-white text-[10px] leading-none" />
      </span>
    );
  }
  if (state === 'err') {
    return (
      <span className="shrink-0 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center
        animate-[popIn_220ms_cubic-bezier(0.34,1.56,0.64,1)]">
        <i className="fi fi-sr-cross-small text-white text-[11px] leading-none" />
      </span>
    );
  }
  return null;
}

function FieldError({ text, show }) {
  if (!show || !text) return null;
  return (
    <p className="mt-1 text-[11.5px] text-red-600 flex items-start gap-1 leading-snug
      animate-[slideDown_200ms_ease-out]">
      <i className="fi fi-sr-info text-[10px] leading-none mt-0.5 shrink-0" />
      <span className="min-w-0">{text}</span>
    </p>
  );
}

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  const [form, setForm] = useState({
    name: profile?.name || '',
    birth_date: profile?.birth_date || '',
    gender: profile?.gender || '',
    province: '',
    district: '',
    neighborhood: '',
    bio: profile?.bio || '',
    interests: [],
  });

  const [waCountry, setWaCountry] = useState(DEFAULT_COUNTRY);
  const [waLocal, setWaLocal] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const countryRef = useRef(null);

  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState(profile?.avatar_url || null);
  const [avatarSize, setAvatarSize] = useState(null);
  const [avatarError, setAvatarError] = useState('');

  const [loading, setLoading] = useState(false);
  const [touchedSteps, setTouchedSteps] = useState({});
  const [error, setError] = useState('');

  /* ============ TRACKING ============ */

  // Entrada na página
  useEffect(() => {
    track('profile_view', 'started');
  }, []);

  // Cada mudança de passo
  useEffect(() => {
    track(`profile_step_${step}`, 'started', { step });
    // eslint-disable-next-line
  }, [step]);

  const districts = useMemo(
    () => (form.province ? PROVINCES[form.province] || [] : []),
    [form.province]
  );

  const waCheck = useMemo(
    () => validateWaNumber(waCountry, waLocal),
    [waCountry, waLocal]
  );

  const waEmpty = !waLocal;
  const waValid = !waEmpty && waCheck.ok;

  const fieldStates = useMemo(() => {
    const nameOk = form.name.trim().length >= 2;
    const neighborhoodOk = form.neighborhood.trim().length >= 2;
    const bioOk = form.bio.trim().length >= 20;
    const interestsOk = form.interests.length >= 3;
    const avatarOk = !!(preview || avatarFile) && !avatarError;

    return {
      avatar:       avatarError ? 'err' : avatarOk ? 'ok' : 'empty',
      name:         !form.name ? 'empty' : nameOk ? 'ok' : 'err',
      birth_date:   !form.birth_date ? 'empty' : 'ok',
      gender:       !form.gender ? 'empty' : 'ok',
      province:     !form.province ? 'empty' : 'ok',
      district:     !form.district ? 'empty' : 'ok',
      neighborhood: !form.neighborhood ? 'empty' : neighborhoodOk ? 'ok' : 'err',
      whatsapp:     waEmpty ? 'empty' : waValid ? 'ok' : 'err',
      bio:          !form.bio ? 'empty' : bioOk ? 'ok' : 'err',
      interests:    form.interests.length === 0 ? 'empty' : interestsOk ? 'ok' : 'err',
    };
  }, [form, waEmpty, waValid, preview, avatarFile, avatarError]);

  const stepFields = useMemo(() => ({
    1: ['avatar', 'name', 'birth_date', 'gender'],
    2: ['province', 'district', 'neighborhood'],
    3: ['whatsapp'],
    4: ['bio', 'interests'],
  }), []);

  const checklist = useMemo(() => {
    const items = [
      { key: 'avatar',       done: fieldStates.avatar === 'ok' },
      { key: 'name',         done: fieldStates.name === 'ok' },
      { key: 'birth_date',   done: fieldStates.birth_date === 'ok' },
      { key: 'gender',       done: fieldStates.gender === 'ok' },
      { key: 'province',     done: fieldStates.province === 'ok' },
      { key: 'district',     done: fieldStates.district === 'ok' },
      { key: 'neighborhood', done: fieldStates.neighborhood === 'ok' },
      { key: 'whatsapp',     done: fieldStates.whatsapp === 'ok' },
      { key: 'bio',          done: fieldStates.bio === 'ok' },
      { key: 'interests',    done: fieldStates.interests === 'ok' },
    ];
    const done = items.filter((i) => i.done).length;
    return { items, done, total: items.length, complete: done === items.length };
  }, [fieldStates]);

  const isStepValid = (s) => {
    const keys = stepFields[s] || [];
    return keys.every((k) => fieldStates[k] === 'ok');
  };

  const stepValid = useMemo(() => ({
    1: isStepValid(1),
    2: isStepValid(2),
    3: isStepValid(3),
    4: isStepValid(4),
  }), [fieldStates]);

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
      const validDistrict = validProvince && (PROVINCES[validProvince] || []).includes(district) ? district : '';
      setForm((f) => ({ ...f, province: validProvince, district: validDistrict, neighborhood: neighborhood || '' }));
    }
  }, [profile]);

  useEffect(() => {
    const onClick = (e) => {
      if (countryRef.current && !countryRef.current.contains(e.target)) {
        setCountryOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const handleProvinceChange = (e) => setForm({ ...form, province: e.target.value, district: '' });
  const setGender = (g) => setForm({ ...form, gender: g });

  const toggleInterest = (tag) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(tag)
        ? f.interests.filter((i) => i !== tag)
        : f.interests.length < 6 ? [...f.interests, tag] : f.interests,
    }));
  };

  const pickAvatar = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setAvatarError('');
    if (!f.type.startsWith('image/')) return setAvatarError('O ficheiro escolhido não é uma imagem.');
    if (f.size > MAX_AVATAR_BYTES) {
      const sizeMB = (f.size / 1024 / 1024).toFixed(1);
      return setAvatarError(`A imagem tem ${sizeMB} MB — máximo ${MAX_AVATAR_MB} MB.`);
    }
    setAvatarFile(f);
    setPreview(URL.createObjectURL(f));
    setAvatarSize(f.size);
  };

  const clearAvatar = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAvatarFile(null);
    setPreview(profile?.avatar_url || null);
    setAvatarSize(null);
    setAvatarError('');
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

  const goNext = () => {
    setTouchedSteps((t) => ({ ...t, [step]: true }));
    if (!stepValid[step]) {
      track(`profile_step_${step}_invalid`, 'error', {
        step,
        message: 'Campos em falta ou inválidos',
      });
      return;
    }
    if (step < 4) {
      setDirection(1);
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleFinish();
    }
  };

  const goPrev = () => {
    if (step > 1) {
      setDirection(-1);
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const jumpToStep = (s) => {
    if (s < step) {
      setDirection(-1);
      setStep(s);
    }
  };

  /* ---------- Finalizar (com tracking completo) ---------- */
  const handleFinish = async () => {
    setTouchedSteps({ 1: true, 2: true, 3: true, 4: true });
    if (!checklist.complete) {
      const firstMissing = checklist.items.find((i) => !i.done);
      if (firstMissing) {
        const stepOfField = Object.entries(stepFields).find(([_, keys]) => keys.includes(firstMissing.key));
        if (stepOfField) {
          setDirection(-1);
          setStep(Number(stepOfField[0]));
        }
      }
      await track('profile_save_invalid', 'error', {
        message: 'Checklist incompleta',
        missing: checklist.items.filter((i) => !i.done).map((i) => i.key),
      });
      return;
    }

    setError('');
    setLoading(true);
    await track('profile_save_start', 'started');

    try {
      const avatar_url = await uploadAvatar();
      const city = [form.neighborhood?.trim(), form.district, form.province].filter(Boolean).join(', ');
      const localDigits = digitsOnly(waLocal);
      const fullWhatsapp = localDigits ? `${waCountry.dial}${localDigits}` : null;

      const { error: upErr } = await supabase
        .from('profiles')
        .update({
          name: form.name.trim(),
          birth_date: form.birth_date,
          gender: form.gender,
          city,
          bio: form.bio.trim() || null,
          interests: form.interests,
          whatsapp: fullWhatsapp,
          avatar_url,
          onboarding_completed: true,
          onboarding_step: 'done',
        })
        .eq('id', user.id);

      if (upErr) throw upErr;

      await track('profile_save_ok', 'success');

      await refreshProfile();
      navigate('/app/descobrir', { replace: true });
    } catch (err) {
      await track('profile_save_error', 'error', {
        message: err?.message || 'Erro desconhecido',
        code: err?.code || null,
        details: err?.details || null,
        hint: err?.hint || null,
        url: window.location.pathname,
        online: navigator.onLine,
      });

      setLoading(false);
      const friendly =
        err?.message?.toLowerCase().includes('fetch') || !navigator.onLine
          ? 'Sem ligação à internet. Verifica a tua rede e tenta novamente.'
          : err?.message || 'Erro ao guardar. Tenta novamente.';
      setError(friendly);
    }
  };

  const baseInput =
    'w-full min-w-0 px-3.5 rounded-lg border bg-white outline-none ' +
    'text-[14px] text-gray-900 placeholder:text-gray-400 ' +
    'transition-all duration-200 focus:ring-2 focus:ring-brand-500/30';

  const inputClass = (key, extra = '') => {
    const s = fieldStates[key];
    const showError = touchedSteps[step] && s !== 'ok';
    const paddingRight = s !== 'empty' ? 'pr-10' : 'pr-3.5';
    if (s === 'ok') return `${baseInput} ${paddingRight} py-2.5 border-green-400 bg-green-50/40 focus:border-green-500 ${extra}`;
    if (showError) return `${baseInput} ${paddingRight} py-2.5 border-red-400 bg-red-50/40 focus:border-red-500 ${extra} shake`;
    return `${baseInput} ${paddingRight} py-2.5 border-gray-300 focus:border-brand-500 ${extra}`;
  };

  const selectClass = (key) => {
    const s = fieldStates[key];
    const showError = touchedSteps[step] && s !== 'ok';
    const base =
      'w-full min-w-0 pl-10 pr-9 py-2.5 rounded-lg border bg-white appearance-none cursor-pointer ' +
      'text-[14px] text-gray-900 outline-none transition-all duration-200 ' +
      'focus:ring-2 focus:ring-brand-500/30 ' +
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 ';
    if (s === 'ok') return `${base} border-green-400 bg-green-50/40 focus:border-green-500`;
    if (showError) return `${base} border-red-400 bg-red-50/40 focus:border-red-500 shake`;
    return `${base} border-gray-300 focus:border-brand-500`;
  };

  const errText = (key) => getErrorText(key, form, waCheck, waEmpty);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.4); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }
        @keyframes slideDown {
          from { opacity: 0; max-height: 0; margin-top: 0; }
          to { opacity: 1; max-height: 400px; }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes genderPop {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.06); }
          100% { transform: scale(1); }
        }
        .shake { animation: shake 380ms ease-in-out; }
        .step-forward { animation: slideInRight 320ms cubic-bezier(0.22,1,0.36,1); }
        .step-back    { animation: slideInLeft  320ms cubic-bezier(0.22,1,0.36,1); }
        .gender-pop   { animation: genderPop 320ms cubic-bezier(0.34,1.56,0.64,1); }

        /* Impede overflow horizontal no mobile */
        html, body { overflow-x: hidden; max-width: 100vw; }
      `}</style>

      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 overflow-hidden">

        {/* Logo */}
        <div className="flex justify-center mb-4">
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
        <div className="text-center mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-600 mb-1">
            Passo {step} de 4
          </p>
          <h1 className="font-display text-[22px] sm:text-[26px] font-extrabold
            tracking-[-0.03em] text-gray-900 leading-tight">
            {STEPS[step - 1].title}
          </h1>
          <p className="mt-1 text-[12.5px] text-gray-500">
            {STEPS[step - 1].subtitle}
          </p>
        </div>

        {/* Indicador de passos */}
        <div className="mb-6 flex items-center justify-center gap-1.5 sm:gap-2 px-1 max-w-full">
          {STEPS.map((s) => {
            const isActive = s.id === step;
            const isDone = stepValid[s.id];
            const isPast = s.id < step;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => jumpToStep(s.id)}
                disabled={s.id > step}
                className="group flex items-center gap-1.5 disabled:cursor-not-allowed shrink-0"
                aria-label={`Passo ${s.id}: ${s.title}`}
              >
                <span className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full
                  text-[11px] sm:text-[12px] font-extrabold transition-all duration-300 shrink-0
                  ${isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30 scale-110'
                    : isDone || isPast
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-400'}
                  ${s.id < step ? 'cursor-pointer hover:scale-105' : ''}`}>
                  {isDone || isPast ? (
                    <i className="fi fi-sr-check text-[12px] leading-none" />
                  ) : (
                    s.id
                  )}
                </span>
                {s.id < 4 && (
                  <span className={`w-4 sm:w-6 h-0.5 rounded-full transition-colors duration-300
                    ${isPast || isDone ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* ============ CONTEÚDO DO STEP ============ */}
        <div key={step} className={direction === 1 ? 'step-forward' : 'step-back'}>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className={`w-24 h-24 rounded-full overflow-hidden bg-brand-100 border-4 shadow-md
                    flex items-center justify-center transition-all
                    ${fieldStates.avatar === 'ok'
                      ? 'border-green-400 ring-4 ring-green-400/20'
                      : touchedSteps[1] && fieldStates.avatar === 'empty'
                        ? 'border-red-400 ring-4 ring-red-400/20'
                        : 'border-white'}`}>
                    {preview ? (
                      <img src={preview} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <i className="fi fi-rr-camera text-brand-500 text-3xl leading-none" />
                    )}
                  </div>

                  {fieldStates.avatar === 'ok' && (
                    <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-green-500
                      flex items-center justify-center border-3 border-white shadow-sm
                      animate-[popIn_220ms_cubic-bezier(0.34,1.56,0.64,1)]">
                      <i className="fi fi-sr-check text-white text-[13px] leading-none" />
                    </span>
                  )}
                  {avatarError && (
                    <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-red-500
                      flex items-center justify-center border-3 border-white shadow-sm
                      animate-[popIn_220ms_cubic-bezier(0.34,1.56,0.64,1)]">
                      <i className="fi fi-sr-cross-small text-white text-[14px] leading-none" />
                    </span>
                  )}

                  {preview && avatarFile && (
                    <button type="button" onClick={clearAvatar}
                      className="absolute -top-1 -left-1 w-7 h-7 rounded-full
                        bg-red-600 text-white flex items-center justify-center
                        shadow-md hover:bg-red-700 active:scale-90 transition border-2 border-white">
                      <i className="fi fi-rr-cross-small text-[12px] leading-none" />
                    </button>
                  )}

                  <label className="absolute -bottom-0.5 -right-0.5 w-9 h-9 rounded-full
                    bg-brand-600 text-white flex items-center justify-center
                    shadow-md cursor-pointer hover:bg-brand-700 transition border-3 border-white">
                    <i className="fi fi-rr-camera text-[14px] leading-none" />
                    <input type="file" accept="image/*" onChange={pickAvatar} className="hidden" />
                  </label>
                </div>

                <div className="text-center px-2">
                  <p className="text-[13px] font-semibold text-gray-800">
                    Foto de perfil <span className="text-red-500">*</span>
                  </p>
                  <p className="text-[11.5px] text-gray-500 mt-0.5">
                    Máx. <strong className="text-gray-700">{MAX_AVATAR_MB} MB</strong> · JPG, PNG, WEBP
                  </p>
                  {avatarSize && !avatarError && (
                    <p className="text-[11px] text-green-700 font-medium mt-1 flex items-center gap-1 justify-center">
                      <i className="fi fi-sr-check-circle text-[11px] leading-none" />
                      {formatBytes(avatarSize)}
                    </p>
                  )}
                  <FieldError
                    text={avatarError || ERROR_MESSAGES.avatar.empty}
                    show={!!avatarError || (touchedSteps[1] && fieldStates.avatar === 'empty')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <i className="fi fi-rr-user text-sm leading-none" />
                  </span>
                  <input type="text" value={form.name} onChange={update('name')}
                    placeholder="Ex.: Graciel" className={inputClass('name', 'pl-9')} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <StatusIcon state={fieldStates.name} />
                  </span>
                </div>
                <FieldError text={errText('name')} show={touchedSteps[1] && fieldStates.name !== 'ok'} />
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-gray-700 mb-1">
                  Data de nascimento <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <i className="fi fi-rr-cake-birthday text-sm leading-none" />
                  </span>
                  <input type="date" value={form.birth_date} onChange={update('birth_date')}
                    className={inputClass('birth_date', 'pl-9')} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <StatusIcon state={fieldStates.birth_date} />
                  </span>
                </div>
                <FieldError text={errText('birth_date')} show={touchedSteps[1] && fieldStates.birth_date !== 'ok'} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-[12.5px] font-semibold text-gray-700">
                    Sou <span className="text-red-500">*</span>
                  </label>
                  <StatusIcon state={fieldStates.gender} />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {GENDERS.map((g) => {
                    const active = form.gender === g.value;
                    const isErr = touchedSteps[1] && !form.gender;
                    const Icon = g.Icon;
                    return (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => setGender(g.value)}
                        className={`relative flex flex-col items-center justify-center
                          gap-2 px-2 py-4 sm:py-5 rounded-2xl border-2 overflow-hidden
                          transition-all duration-300 active:scale-[0.97] min-w-0
                          ${active
                            ? `${g.activeBg} ${g.activeBorder} shadow-lg ${g.shadow}`
                            : isErr
                              ? 'bg-red-50/40 border-red-300 shake'
                              : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                      >
                        {active && (
                          <div
                            className={`absolute inset-0 bg-gradient-to-br ${g.activeGradient}
                              opacity-[0.08] pointer-events-none`}
                          />
                        )}

                        <div
                          className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center
                            transition-all duration-300
                            ${active
                              ? `bg-gradient-to-br ${g.activeGradient} shadow-lg ${g.shadow} scale-105 gender-pop`
                              : 'bg-gray-100'}`}
                        >
                          <Icon
                            className={`w-11 h-11 sm:w-14 sm:h-14 transition-all duration-300
                              ${active ? 'text-white drop-shadow-sm' : 'text-gray-400'}`}
                          />
                        </div>

                        <div className="relative text-center min-w-0 px-1">
                          <p className={`text-[14px] sm:text-[15px] font-extrabold leading-tight transition-colors
                            ${active ? g.activeText : 'text-gray-800'}`}>
                            {g.label}
                          </p>
                          <p className={`text-[10.5px] sm:text-[11px] mt-0.5 leading-tight transition-colors
                            ${active ? g.activeText : 'text-gray-400'}`}>
                            {g.description}
                          </p>
                        </div>

                        {active && (
                          <span
                            className={`absolute top-2 right-2 w-6 h-6 rounded-full ${g.checkBg}
                              flex items-center justify-center shadow-md
                              animate-[popIn_220ms_cubic-bezier(0.34,1.56,0.64,1)]`}
                          >
                            <i className="fi fi-sr-check text-white text-[11px] leading-none" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <FieldError text={errText('gender')} show={touchedSteps[1] && fieldStates.gender !== 'ok'} />
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-[12.5px] font-semibold text-gray-700 mb-1">
                  Província <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <i className="fi fi-rr-marker text-sm leading-none" />
                  </span>
                  <select value={form.province} onChange={handleProvinceChange}
                    className={selectClass('province')}>
                    <option value="">Escolhe a província</option>
                    {PROVINCE_LIST.map((p) => (<option key={p} value={p}>{p}</option>))}
                  </select>
                  <span className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                    <StatusIcon state={fieldStates.province} />
                  </span>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <i className="fi fi-rr-angle-small-down text-sm leading-none" />
                  </span>
                </div>
                <FieldError text={errText('province')} show={touchedSteps[2] && fieldStates.province !== 'ok'} />
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-gray-700 mb-1">
                  Distrito <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <i className="fi fi-rr-marker text-sm leading-none" />
                  </span>
                  <select value={form.district} onChange={update('district')}
                    disabled={!form.province} className={selectClass('district')}>
                    <option value="">
                      {form.province ? 'Escolhe o distrito' : 'Escolhe província primeiro'}
                    </option>
                    {districts.map((d) => (<option key={d} value={d}>{d}</option>))}
                  </select>
                  <span className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                    <StatusIcon state={fieldStates.district} />
                  </span>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <i className="fi fi-rr-angle-small-down text-sm leading-none" />
                  </span>
                </div>
                <FieldError text={errText('district')} show={touchedSteps[2] && fieldStates.district !== 'ok'} />
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-gray-700 mb-1">
                  Bairro <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <i className="fi fi-rr-home text-sm leading-none" />
                  </span>
                  <input type="text" value={form.neighborhood} onChange={update('neighborhood')}
                    placeholder="Ex.: Polana Caniço" className={inputClass('neighborhood', 'pl-9')} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <StatusIcon state={fieldStates.neighborhood} />
                  </span>
                </div>
                <FieldError text={errText('neighborhood')} show={touchedSteps[2] && fieldStates.neighborhood !== 'ok'} />
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-stretch gap-2 min-w-0 w-full">
                <div className="relative shrink-0 min-w-0" ref={countryRef}>
                  <button
                    type="button"
                    onClick={() => setCountryOpen((v) => !v)}
                    className={`h-full flex items-center gap-1.5 pl-2.5 pr-2 py-2.5 rounded-lg border
                      transition text-[13px] sm:text-[14px]
                      ${countryOpen
                        ? 'border-green-500 bg-white ring-2 ring-green-500/20'
                        : waValid
                          ? 'border-green-400 bg-green-50/40'
                          : touchedSteps[3] && waEmpty
                            ? 'border-red-400 bg-red-50/40 shake'
                            : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                  >
                    <span className="text-lg sm:text-xl leading-none">{waCountry.flag}</span>
                    <span className="font-bold text-gray-900 tabular-nums whitespace-nowrap">
                      {waCountry.dial}
                    </span>
                    <i className={`fi fi-rr-angle-small-down text-gray-400 text-xs leading-none
                      transition-transform ${countryOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {countryOpen && (
                    <div className="absolute left-0 top-full mt-2 w-[280px] max-w-[calc(100vw-2rem)]
                      max-h-[280px] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-100 p-1.5 z-[120]">
                      <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        País · dígitos
                      </p>
                      {COUNTRIES.map((c) => {
                        const active = c.code === waCountry.code;
                        return (
                          <button key={c.code} type="button"
                            onClick={() => { setWaCountry(c); setCountryOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                              transition ${active ? 'bg-green-50 text-green-700' : 'hover:bg-gray-50 text-gray-700'}`}>
                            <span className="text-lg leading-none shrink-0">{c.flag}</span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-[13px] font-medium truncate">{c.name}</span>
                              <span className="block text-[10.5px] text-gray-400">
                                {c.min === c.max ? `${c.min} dígitos` : `${c.min}–${c.max} dígitos`}
                              </span>
                            </span>
                            <span className="text-[12.5px] font-bold text-gray-500 tabular-nums shrink-0">{c.dial}</span>
                            {active && <i className="fi fi-sr-check text-green-600 text-sm leading-none shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className={`flex-1 min-w-0 flex items-center gap-2 px-2.5 sm:px-3.5 rounded-lg bg-white border transition-all duration-200
                  ${waValid
                    ? 'border-green-400 bg-green-50/40'
                    : touchedSteps[3] && !waValid
                      ? 'border-red-400 bg-red-50/40 shake'
                      : 'border-gray-300 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500/20'}`}>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0">
                    <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                  </div>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder={waCountry.hint || 'Número'}
                    value={formatLocal(waLocal, waCountry)}
                    onChange={(e) => setWaLocal(digitsOnly(e.target.value).slice(0, waCountry.max))}
                    className="flex-1 min-w-0 w-full bg-transparent outline-none py-2.5
                      text-[14px] font-semibold text-gray-900
                      placeholder:text-gray-400 placeholder:font-normal truncate"
                  />
                  <StatusIcon state={fieldStates.whatsapp} />
                </div>
              </div>

              <p className="text-[11.5px] text-gray-500 leading-snug">
                <i className="fi fi-sr-info text-[10px] leading-none mr-1" />
                Só assim te podem contactar. Inclui o indicativo do país.
              </p>

              <FieldError text={errText('whatsapp')} show={touchedSteps[3] && fieldStates.whatsapp !== 'ok'} />
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-[12.5px] font-semibold text-gray-700">
                    Sobre ti <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-[11px] tabular-nums
                    ${form.bio.trim().length < 20 ? 'text-red-500' : 'text-green-600 font-semibold'}`}>
                    {form.bio.length}/200
                  </span>
                </div>
                <div className="relative">
                  <textarea rows={3} maxLength={200} value={form.bio} onChange={update('bio')}
                    placeholder="Sou uma pessoa tranquila, gosto de música, tecnologia e conhecer pessoas novas..."
                    className={inputClass('bio', 'resize-none py-2.5 pr-10')} />
                  <span className="absolute right-3 top-3">
                    <StatusIcon state={fieldStates.bio} />
                  </span>
                </div>
                <FieldError text={errText('bio')} show={touchedSteps[4] && fieldStates.bio !== 'ok'} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-[12.5px] font-semibold text-gray-700">
                    Interesses <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-[11px] tabular-nums flex items-center gap-1.5
                    ${form.interests.length < 3 ? 'text-red-500' : 'text-green-600 font-semibold'}`}>
                    {form.interests.length}/6 · mín. 3
                    <StatusIcon state={fieldStates.interests} />
                  </span>
                </div>

                <div className={`flex flex-wrap gap-1.5 p-2 rounded-xl transition
                  ${touchedSteps[4] && fieldStates.interests !== 'ok' ? 'bg-red-50/40 border border-red-200' : ''}`}>
                  {INTERESTS.map((tag) => {
                    const active = form.interests.includes(tag);
                    const isGender = tag === 'Mulheres' || tag === 'Homens';
                    return (
                      <button key={tag} type="button" onClick={() => toggleInterest(tag)}
                        className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium
                          transition border active:scale-95
                          ${active
                            ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                            : isGender
                              ? 'bg-brand-50 border-brand-200 text-brand-700 hover:border-brand-300'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-brand-300'}`}>
                        {tag}
                      </button>
                    );
                  })}
                </div>
                <FieldError text={errText('interests')} show={touchedSteps[4] && fieldStates.interests !== 'ok'} />
              </div>
            </div>
          )}
        </div>

        {/* Erro geral (ex: falha de rede) */}
        {error && (
          <div className="mt-4 flex items-start gap-2 text-[13px] text-red-700 bg-red-50
            border border-red-200 rounded-xl px-3.5 py-2.5 animate-[slideDown_200ms_ease-out]">
            <i className="fi fi-rr-exclamation text-base leading-none mt-0.5 shrink-0" />
            <span className="min-w-0">{error}</span>
          </div>
        )}

        {/* Botões */}
        <div className="mt-8 flex items-center gap-2 sm:gap-3">
          {step > 1 ? (
            <button type="button" onClick={goPrev}
              className="shrink-0 flex items-center justify-center gap-1.5
                px-3 sm:px-4 py-3.5 rounded-xl bg-gray-100 text-gray-700
                font-bold text-[14.5px] hover:bg-gray-200 active:scale-[0.98] transition">
              <i className="fi fi-rr-angle-small-left text-base leading-none" />
              <span className="hidden sm:inline">Anterior</span>
            </button>
          ) : null}

          <button type="button" onClick={goNext} disabled={loading}
            className={`flex-1 min-w-0 py-3.5 rounded-xl font-bold text-[14.5px]
              transition-all disabled:opacity-70 disabled:cursor-wait
              flex items-center justify-center gap-2
              ${stepValid[step]
                ? 'bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.99] shadow-lg shadow-brand-600/25'
                : 'bg-brand-400 text-white hover:bg-brand-500 active:scale-[0.99] shadow-lg shadow-brand-400/25'}`}>
            {loading ? (
              <>
                <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span className="truncate">A guardar...</span>
              </>
            ) : step === 4 ? (
              <>
                <i className="fi fi-sr-check text-base leading-none shrink-0" />
                <span className="truncate">Terminar e entrar</span>
              </>
            ) : (
              <>
                <span className="truncate">Continuar</span>
                <i className="fi fi-rr-arrow-small-right text-base leading-none shrink-0" />
              </>
            )}
          </button>
        </div>

        {touchedSteps[step] && !stepValid[step] && (
          <p className="mt-2 text-center text-[11.5px] text-red-600 font-medium leading-snug
            animate-[slideDown_200ms_ease-out] px-2">
            <i className="fi fi-sr-info text-[10px] leading-none mr-1" />
            Preenche os campos marcados a vermelho para continuares
          </p>
        )}

        <p className="mt-2.5 text-center text-[11px] text-gray-400 leading-relaxed">
          Ao continuar, confirmas que tens 18+ anos.
        </p>
      </div>
    </div>
  );
}