import { useEffect, useState, useRef, useMemo } from 'react';
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

/* ---------- Países com código WhatsApp ---------- */
const COUNTRIES = [
  { code: 'MZ', flag: '🇲🇿', name: 'Moçambique',          dial: '+258' },
  { code: 'PT', flag: '🇵🇹', name: 'Portugal',            dial: '+351' },
  { code: 'ZA', flag: '🇿🇦', name: 'África do Sul',       dial: '+27'  },
  { code: 'AO', flag: '🇦🇴', name: 'Angola',              dial: '+244' },
  { code: 'BR', flag: '🇧🇷', name: 'Brasil',              dial: '+55'  },
  { code: 'CV', flag: '🇨🇻', name: 'Cabo Verde',          dial: '+238' },
  { code: 'GW', flag: '🇬🇼', name: 'Guiné-Bissau',        dial: '+245' },
  { code: 'ST', flag: '🇸🇹', name: 'São Tomé e Príncipe', dial: '+239' },
  { code: 'TL', flag: '🇹🇱', name: 'Timor-Leste',         dial: '+670' },
  { code: 'ZW', flag: '🇿🇼', name: 'Zimbabué',            dial: '+263' },
  { code: 'TZ', flag: '🇹🇿', name: 'Tanzânia',            dial: '+255' },
  { code: 'ZM', flag: '🇿🇲', name: 'Zâmbia',              dial: '+260' },
  { code: 'MW', flag: '🇲🇼', name: 'Malawi',              dial: '+265' },
  { code: 'SZ', flag: '🇸🇿', name: 'Essuatíni',           dial: '+268' },
  { code: 'NG', flag: '🇳🇬', name: 'Nigéria',             dial: '+234' },
  { code: 'KE', flag: '🇰🇪', name: 'Quénia',              dial: '+254' },
  { code: 'US', flag: '🇺🇸', name: 'Estados Unidos',      dial: '+1'   },
  { code: 'GB', flag: '🇬🇧', name: 'Reino Unido',         dial: '+44'  },
  { code: 'FR', flag: '🇫🇷', name: 'França',              dial: '+33'  },
  { code: 'ES', flag: '🇪🇸', name: 'Espanha',             dial: '+34'  },
];

const DEFAULT_COUNTRY = COUNTRIES[0];

const INTERESTS = [
  'Música', 'Viagens', 'Café', 'Livros', 'Praia', 'Arte',
  'Tecnologia', 'Futebol', 'Cozinha', 'Dança', 'Gastronomia',
  'Cinema', 'Desporto', 'Fotografia', 'Moda', 'Animais',
];

/* ---------- Limites ---------- */
const FREE_MAX_PHOTOS = 2;
const FREE_MAX_VIDEOS = 2;
const PAID_MAX_PHOTOS = 6;
const PAID_MAX_VIDEOS = 3;
const MAX_PHOTO_MB = 10;
const MAX_VIDEO_MB = 50;

/* ---------- Planos ---------- */
const PAYMENT_PLANS = [
  { id: 'p1', label: 'Plano 01', contacts: '3 contactos',  price: 99,  priceLabel: '99 MZN',  tag: null },
  { id: 'p2', label: 'Plano 02', contacts: '10 contactos', price: 299, priceLabel: '299 MZN', tag: 'Popular' },
  { id: 'p3', label: 'Plano 03', contacts: 'Ilimitado',    price: 299, priceLabel: '299 MZN', tag: null },
];

const PAYMENT_METHODS = [
  { id: 'mpesa', name: 'M-Pesa', subtitle: 'Vodacom', color: '#E60000', bg: '#FEE2E2' },
  { id: 'emola', name: 'e-Mola', subtitle: 'Movitel', color: '#EA580C', bg: '#FFEDD5' },
];

/* ============================================================
   Ícone WhatsApp
============================================================ */
function WhatsAppIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/* ---------- Helpers ---------- */
function digitsOnly(raw) { return String(raw || '').replace(/\D/g, ''); }

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

function formatLocal(raw) {
  const d = digitsOnly(raw).slice(0, 12);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

function waLink(fullPhone) {
  const digits = digitsOnly(fullPhone);
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

/* ============================================================
   Componente: barra de progresso de limites
============================================================ */
function LimitBar({ current, freeMax, paidMax, isVerified, color = 'brand' }) {
  const total = paidMax;
  const dots = Array.from({ length: total });

  const bgFill = color === 'brand' ? 'bg-brand-500' : 'bg-brand-500';
  const bgFree = color === 'brand' ? 'bg-brand-500' : 'bg-brand-500';

  return (
    <div className="mt-2.5 flex items-center gap-3">
      {/* Dots */}
      <div className="flex items-center gap-1">
        {dots.map((_, i) => {
          const filled = i < current;
          const isPaidZone = i >= freeMax;

          return (
            <span
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-colors
                ${filled
                  ? (isPaidZone && !isVerified ? 'bg-amber-400' : bgFill)
                  : 'bg-gray-200'}`}
            />
          );
        })}
      </div>

      {/* Contador */}
      <span className="text-[11.5px] font-semibold text-gray-500 tabular-nums">
        {current} de {total}
      </span>

      {/* Marca da fronteira "grátis" */}
      {!isVerified && (
        <span className="text-[10.5px] text-amber-600 font-bold">
          · grátis até {freeMax}
        </span>
      )}
    </div>
  );
}

/* ============================================================
   Profile
============================================================ */
export default function Profile() {
  const { profile: authProfile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

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

  /* ---------- WhatsApp separado ---------- */
  const [waCountry, setWaCountry] = useState(DEFAULT_COUNTRY);
  const [waLocal, setWaLocal] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const countryRef = useRef(null);

  const [newAvatarFile, setNewAvatarFile] = useState(null);
  const [newAvatarPreview, setNewAvatarPreview] = useState(null);
  const [photoFiles, setPhotoFiles] = useState([]);

  const [showUpgradeGate, setShowUpgradeGate] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('photos');
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('p2');
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('form');
  const [paymentError, setPaymentError] = useState('');
  const pollRef = useRef(null);

  /* ---------- Eliminar conta ---------- */
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteStatus, setDeleteStatus] = useState('idle'); // idle | deleting | done | error
  const [deleteError, setDeleteError] = useState('');

  const isVerified = authProfile?.is_verified === true;
  const maxPhotos = isVerified ? PAID_MAX_PHOTOS : FREE_MAX_PHOTOS;
  const maxVideos = isVerified ? PAID_MAX_VIDEOS : FREE_MAX_VIDEOS;

  const currentPlanObj = PAYMENT_PLANS.find((p) => p.id === selectedPlan) || PAYMENT_PLANS[1];

  useEffect(() => {
    const onClick = (e) => {
      if (countryRef.current && !countryRef.current.contains(e.target)) {
        setCountryOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

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

    const stored = authProfile.whatsapp || authProfile.phone || '';
    const { country, local } = splitPhone(stored);
    setWaCountry(country);
    setWaLocal(local);
  }, [authProfile]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

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

  const uploadFile = async (file, folder) => {
    const rawExt = file.name.split('.').pop();
    const ext = (rawExt && rawExt.length <= 5 ? rawExt : (file.type?.split('/')[1] || 'bin')).toLowerCase();
    const path = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: false, cacheControl: '3600', contentType: file.type || undefined });

    if (error) {
      console.error('[upload] erro Supabase:', error);
      throw new Error(error.message || 'Falha no upload.');
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  };

  const pickAvatar = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      return showToast(`Ficheiro demasiado grande (máx ${MAX_PHOTO_MB}MB).`, 'error');
    }

    setNewAvatarFile(file);
    setNewAvatarPreview(URL.createObjectURL(file));
  };

  /* ============================================================
     FOTOS — limite rigoroso
  ============================================================ */
  const pickPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const currentTotal = form.photos.length + photoFiles.length;

    // Já atingiu o limite do seu plano
    if (currentTotal >= maxPhotos) {
      if (!isVerified) {
        setUpgradeReason('photos');
        setShowUpgradeGate(true);
        return;
      }
      return showToast(`Máximo de ${maxPhotos} fotos.`, 'error');
    }

    const available = maxPhotos - currentTotal;
    const valid = [];
    for (const file of files.slice(0, available)) {
      if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
        showToast(`"${file.name}" excede ${MAX_PHOTO_MB}MB.`, 'error');
        continue;
      }
      if (!file.type.startsWith('image/')) {
        showToast(`"${file.name}" não é uma imagem.`, 'error');
        continue;
      }
      valid.push({ file, preview: URL.createObjectURL(file) });
    }

    // Se tentou carregar mais do que o permitido → avisa + abre modal
    if (files.length > available && !isVerified) {
      const restante = files.length - available;
      showToast(
        `${restante} foto${restante !== 1 ? 's' : ''} ignorada${restante !== 1 ? 's' : ''} — limite grátis de ${FREE_MAX_PHOTOS}.`,
        'error'
      );
      setPhotoFiles((prev) => [...prev, ...valid]);
      setTimeout(() => {
        setUpgradeReason('photos');
        setShowUpgradeGate(true);
      }, 400);
      return;
    }

    setPhotoFiles((prev) => [...prev, ...valid]);
  };

  const removePhoto = (idx) => {
    setForm((f) => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }));
  };

  const removePendingPhoto = (idx) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  /* ============================================================
     VÍDEOS — limite rigoroso
  ============================================================ */
  const pickVideo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (form.videos.length >= maxVideos) {
      if (!isVerified) {
        setUpgradeReason('videos');
        setShowUpgradeGate(true);
        return;
      }
      return showToast(`Máximo de ${maxVideos} vídeos.`, 'error');
    }

    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      return showToast(
        `Vídeo demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máx ${MAX_VIDEO_MB}MB.`,
        'error'
      );
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const videoExts = ['mp4', 'mov', 'webm', 'm4v', '3gp', 'avi', 'mkv'];
    const looksLikeVideo = file.type.startsWith('video/') || videoExts.includes(ext);

    if (!looksLikeVideo) return showToast('Ficheiro não é um vídeo.', 'error');

    showToast('A carregar vídeo…', 'info');

    try {
      const url = await uploadFile(file, 'videos');
      setForm((f) => ({ ...f, videos: [...f.videos, url] }));
      showToast('Vídeo carregado.', 'success');
    } catch (err) {
      showToast(err.message || 'Erro no upload.', 'error');
    }
  };

  const removeVideo = (idx) => {
    setForm((f) => ({ ...f, videos: f.videos.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return showToast('O nome é obrigatório.', 'error');
    if (!form.birth_date) return showToast('Indica a data de nascimento.', 'error');

    const localDigits = digitsOnly(waLocal);
    const fullWhatsapp = localDigits ? `${waCountry.dial}${localDigits}` : '';

    if (localDigits && localDigits.length < 8) {
      return showToast('Número de WhatsApp inválido.', 'error');
    }

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
          whatsapp: fullWhatsapp || null,
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

    const stored = authProfile.whatsapp || authProfile.phone || '';
    const { country, local } = splitPhone(stored);
    setWaCountry(country);
    setWaLocal(local);

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

  const goToPayment = () => {
    setPaymentPhone(authProfile?.whatsapp || authProfile?.phone || '');
    setSelectedPlan('p2');
    setPaymentMethod('mpesa');
    setPaymentStatus('form');
    setPaymentError('');
    setShowUpgradeGate(false);
    setShowPayment(true);
  };

  const startPayment = async () => {
    const clean = digitsOnly(paymentPhone);
    if (!clean || clean.length < 9) {
      setPaymentError('Insere um número válido.');
      return;
    }

    setPaymentError('');
    setPaymentStatus('processing');

    try {
      await supabase.from('profiles').update({ whatsapp: paymentPhone }).eq('id', user.id);

      const { data, error } = await supabase.functions.invoke('initiate-plan-payment', {
        body: { plan_id: selectedPlan, plan_price: currentPlanObj.price, method: paymentMethod, phone: clean },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Não foi possível iniciar o pagamento.');
      }

      setPaymentStatus('waiting');

      const reference = data.reference;
      let attempts = 0;

      pollRef.current = setInterval(async () => {
        attempts++;
        const { data: statusData } = await supabase
          .from('plan_payments')
          .select('status')
          .eq('reference', reference)
          .maybeSingle();

        if (statusData?.status === 'paid') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPaymentStatus('success');
          if (navigator.vibrate) navigator.vibrate([12, 40, 12]);
          await refreshProfile();
          setTimeout(() => {
            setShowPayment(false);
            setPaymentStatus('form');
          }, 2600);
        } else if (statusData?.status === 'failed') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPaymentStatus('error');
          setPaymentError('O pagamento não foi concluído. Tenta novamente.');
        } else if (attempts > 30) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPaymentStatus('error');
          setPaymentError('Tempo excedido. Verifica o teu saldo e tenta novamente.');
        }
      }, 4000);
    } catch (err) {
      setPaymentStatus('error');
      setPaymentError(err.message || 'Erro ao processar pagamento.');
    }
  };

  const cancelPayment = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setShowPayment(false);
    setPaymentStatus('form');
    setPaymentError('');
  };

  /* ============================================================
     ELIMINAR CONTA (desativar auth + apagar profile)
  ============================================================ */
  const openDeleteAccount = () => {
    setDeleteConfirmText('');
    setDeleteError('');
    setDeleteStatus('idle');
    setShowDeleteAccount(true);
  };

  const closeDeleteAccount = () => {
    if (deleteStatus === 'deleting') return; // não fecha durante o processo
    setShowDeleteAccount(false);
    setDeleteConfirmText('');
    setDeleteError('');
    setDeleteStatus('idle');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'ELIMINAR') {
      setDeleteError('Escreve ELIMINAR (em maiúsculas) para confirmar.');
      return;
    }

    setDeleteError('');
    setDeleteStatus('deleting');

    try {
      // Edge Function: desativa auth.users + apaga row em profiles
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { confirm: 'ELIMINAR' },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Não foi possível eliminar a conta.');
      }

      setDeleteStatus('done');

      // Limpa sessão e sai
      setTimeout(async () => {
        try {
          await supabase.auth.signOut();
        } catch (_) {}
        navigate('/login', { replace: true });
      }, 2200);
    } catch (err) {
      setDeleteStatus('error');
      setDeleteError(err.message || 'Erro ao eliminar a conta.');
    }
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
  const totalVideos = form.videos.length;

  const photosLocked = !isVerified && totalPhotos >= FREE_MAX_PHOTOS;
  const videosLocked = !isVerified && totalVideos >= FREE_MAX_VIDEOS;

  const waFull = waLocal ? `${waCountry.dial}${digitsOnly(waLocal)}` : '';

  return (
    <>
      <div className="max-w-[1100px] mx-auto">

        {/* ============ CABEÇALHO ============ */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="font-display text-[26px] sm:text-[30px] font-extrabold tracking-tight text-gray-900">
              {editing ? 'Editar perfil' : 'O meu perfil'}
            </h1>
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
                hover:bg-gray-800 active:scale-[0.98] transition shadow-sm">
              <i className="fi fi-rr-pencil text-base leading-none" />
              <span className="hidden sm:inline">Editar perfil</span>
              <span className="sm:hidden">Editar</span>
            </button>
          ) : (
            <div className="shrink-0 flex items-center gap-2">
              <button onClick={handleCancel} disabled={loading}
                className="px-3.5 py-2.5 rounded-xl bg-gray-100 text-gray-700
                  text-[13.5px] font-semibold hover:bg-gray-200
                  disabled:opacity-50 transition">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                  bg-brand-600 text-white text-[13.5px] font-bold
                  hover:bg-brand-700 disabled:opacity-60
                  active:scale-[0.98] transition shadow-lg shadow-brand-600/25">
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

        {/* ============ CABEÇALHO DO PERFIL ============ */}
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

              {editing && newAvatarFile && (
                <p className="mt-2 text-[11px] text-center text-brand-600 font-semibold">
                  Nova foto escolhida
                </p>
              )}
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
                    {isVerified && (
                      <i className="fi fi-sr-badge-check text-blue-500 text-[18px] leading-none"
                        title="Perfil verificado" />
                    )}
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

                  {waFull && (
                    <div className="mt-4 flex justify-center sm:justify-start">
                      <a href={waLink(waFull)} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                          bg-[#25D366] text-white font-bold text-[13.5px]
                          hover:bg-[#1eb356] active:scale-[0.98] transition
                          shadow-lg shadow-green-500/25">
                        <WhatsAppIcon className="w-4 h-4" />
                        Falar no WhatsApp
                      </a>
                    </div>
                  )}

                  {form.interests.length > 0 && (
                    <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-1.5">
                      {form.interests.map((t) => (
                        <span key={t}
                          className="text-[12px] font-medium text-gray-700 bg-gray-100
                            px-3 py-1.5 rounded-full">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <Field label="Nome">
                    <input type="text" value={form.name} onChange={update('name')}
                      placeholder="O teu nome"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200
                        text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500/40
                        focus:border-brand-500 transition" />
                  </Field>

                  <Field label="Data de nascimento">
                    <input type="date" value={form.birth_date} onChange={update('birth_date')}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200
                        text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500/40
                        focus:border-brand-500 transition" />
                  </Field>
                </div>
              )}
            </div>
          </div>

          {editing && (
            <div className="mt-8 pt-8 border-t border-gray-100 space-y-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Localização
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Província">
                    <select value={form.province}
                      onChange={(e) => setForm({ ...form, province: e.target.value, district: '' })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200
                        text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500/40
                        focus:border-brand-500 transition bg-white">
                      <option value="">Escolhe a província</option>
                      {PROVINCE_LIST.map((p) => (<option key={p} value={p}>{p}</option>))}
                    </select>
                  </Field>

                  <Field label="Distrito">
                    <select value={form.district} onChange={update('district')}
                      disabled={!form.province}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200
                        text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500/40
                        focus:border-brand-500 transition bg-white
                        disabled:opacity-50 disabled:cursor-not-allowed">
                      <option value="">
                        {form.province ? 'Escolhe o distrito' : 'Escolhe província primeiro'}
                      </option>
                      {districts.map((d) => (<option key={d} value={d}>{d}</option>))}
                    </select>
                  </Field>

                  <Field label="Bairro (opcional)" className="sm:col-span-2">
                    <input type="text" value={form.neighborhood} onChange={update('neighborhood')}
                      placeholder="Ex.: Polana Caniço"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200
                        text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500/40
                        focus:border-brand-500 transition" />
                  </Field>
                </div>
              </div>

              {/* WhatsApp */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Contacto WhatsApp
                </p>

                <div className="flex items-stretch gap-2">
                  <div className="relative shrink-0" ref={countryRef}>
                    <button
                      type="button"
                      onClick={() => setCountryOpen((v) => !v)}
                      className={`h-full flex items-center gap-2 pl-3 pr-2.5 rounded-xl
                        border transition min-w-[110px]
                        ${countryOpen
                          ? 'border-green-500 bg-white ring-2 ring-green-500/20'
                          : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300'}`}>
                      <span className="text-xl leading-none">{waCountry.flag}</span>
                      <span className="text-[14px] font-bold text-gray-900 tabular-nums">
                        {waCountry.dial}
                      </span>
                      <i className={`fi fi-rr-angle-small-down text-gray-400 text-sm leading-none
                        transition-transform ${countryOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {countryOpen && (
                      <div className="absolute left-0 top-full mt-2 w-[280px] max-h-[320px]
                        overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-100
                        p-1.5 z-[120]">
                        <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          País
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
                              <span className="flex-1 text-[13px] font-medium truncate">{c.name}</span>
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

                  <div className="flex-1 flex items-center gap-2 px-3.5 rounded-xl
                    bg-gray-50 border border-gray-200
                    focus-within:border-green-500 focus-within:bg-white transition">
                    <div className="w-9 h-9 rounded-full bg-[#25D366]/10
                      flex items-center justify-center shrink-0">
                      <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                    </div>
                    <input type="tel" inputMode="tel" autoComplete="tel"
                      placeholder="84 000 0000"
                      value={formatLocal(waLocal)}
                      onChange={(e) => setWaLocal(digitsOnly(e.target.value).slice(0, 12))}
                      className="flex-1 bg-transparent outline-none py-3
                        text-[15px] font-semibold text-gray-900
                        placeholder:text-gray-400 placeholder:font-normal" />
                  </div>
                </div>

                <p className="mt-1.5 text-[11.5px] text-gray-500 leading-snug">
                  Este número é usado para te contactarem no WhatsApp.
                  {waLocal && (
                    <> Guardado como <strong className="text-gray-700">{waCountry.dial} {formatLocal(waLocal)}</strong>.</>
                  )}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Sobre ti
                </p>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[12.5px] font-semibold text-gray-700">Breve descrição</label>
                  <span className="text-[11px] text-gray-400 tabular-nums">{form.bio.length}/200</span>
                </div>
                <textarea rows={3} maxLength={200} value={form.bio} onChange={update('bio')}
                  placeholder="Sou uma pessoa tranquila, gosto de música, tecnologia..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200
                    text-[14px] resize-none
                    focus:outline-none focus:ring-2 focus:ring-brand-500/40
                    focus:border-brand-500 transition" />
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
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* ============ FOTOS ========================================= */}
        {/* ============================================================ */}
        <div className="mt-6 bg-white rounded-3xl border border-gray-100 p-6 sm:p-8">
          <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-[17px] font-extrabold text-gray-900 flex items-center gap-2">
                  <i className="fi fi-sr-picture text-brand-600 text-base leading-none" />
                  Fotos
                </h3>
                {!isVerified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                    bg-amber-50 border border-amber-200 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    <i className="fi fi-sr-lock text-[9px] leading-none" />
                    Plano grátis
                  </span>
                )}
                {photosLocked && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                    bg-red-50 border border-red-200 text-[10px] font-bold uppercase tracking-wider text-red-600">
                    Limite atingido
                  </span>
                )}
              </div>

              {/* Barra + contador */}
              <LimitBar
                current={totalPhotos}
                freeMax={FREE_MAX_PHOTOS}
                paidMax={PAID_MAX_PHOTOS}
                isVerified={isVerified}
                color="brand"
              />

              {/* Explicação do limite */}
              <p className="mt-2 text-[11.5px] text-gray-400 leading-snug">
                {isVerified
                  ? `Podes ter até ${PAID_MAX_PHOTOS} fotos no teu perfil.`
                  : `No plano grátis podes ter ${FREE_MAX_PHOTOS} fotos. Ativa um plano para chegar a ${PAID_MAX_PHOTOS}.`}
              </p>
            </div>

            {editing && totalPhotos < PAID_MAX_PHOTOS && (
              photosLocked ? (
                <button type="button" onClick={() => { setUpgradeReason('photos'); setShowUpgradeGate(true); }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl
                    bg-amber-50 text-amber-700 text-[13px] font-semibold
                    hover:bg-amber-100 transition border border-amber-200 shrink-0">
                  <i className="fi fi-sr-lock text-base leading-none" />
                  Desbloquear mais
                </button>
              ) : (
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl
                  bg-brand-50 text-brand-700 text-[13px] font-semibold
                  cursor-pointer hover:bg-brand-100 transition shrink-0">
                  <i className="fi fi-rr-plus text-base leading-none" />
                  Adicionar
                  <input type="file" accept="image/*" multiple onChange={pickPhotos} className="hidden" />
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
              {editing && !isVerified && (
                <p className="mt-1 text-[11.5px] text-amber-600 font-medium">
                  Plano grátis: até {FREE_MAX_PHOTOS} fotos
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {allPhotos.map((src, i) => (
                <div key={`existing-${i}`} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 group">
                  <img src={src} alt="" className="w-full h-full object-cover" draggable="false" />
                  {editing && (
                    <button onClick={() => removePhoto(i)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full
                        bg-red-600 text-white flex items-center justify-center
                        shadow-lg opacity-0 group-hover:opacity-100
                        hover:bg-red-700 transition-all active:scale-90">
                      <i className="fi fi-rr-trash text-xs leading-none" />
                    </button>
                  )}
                </div>
              ))}

              {photoFiles.map((p, i) => (
                <div key={`pending-${i}`}
                  className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 group ring-2 ring-brand-500">
                  <img src={p.preview} alt="" className="w-full h-full object-cover" draggable="false" />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full
                    bg-brand-600 text-white text-[9.5px] font-bold uppercase tracking-wider">
                    Nova
                  </span>
                  {editing && (
                    <button onClick={() => removePendingPhoto(i)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full
                        bg-red-600 text-white flex items-center justify-center
                        shadow-lg opacity-0 group-hover:opacity-100
                        hover:bg-red-700 transition-all active:scale-90">
                      <i className="fi fi-rr-trash text-xs leading-none" />
                    </button>
                  )}
                </div>
              ))}

              {editing && totalPhotos < PAID_MAX_PHOTOS && !photosLocked && (
                <label className="aspect-[3/4] rounded-xl border-2 border-dashed border-gray-300
                  flex flex-col items-center justify-center gap-1.5 cursor-pointer
                  hover:border-brand-400 hover:bg-brand-50/50 transition">
                  <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center">
                    <i className="fi fi-rr-plus text-brand-600 text-base leading-none" />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-500">Adicionar</span>
                  {!isVerified && (
                    <span className="text-[9.5px] text-amber-600 font-bold">
                      {FREE_MAX_PHOTOS - totalPhotos} restante{FREE_MAX_PHOTOS - totalPhotos !== 1 ? 's' : ''}
                    </span>
                  )}
                  <input type="file" accept="image/*" multiple onChange={pickPhotos} className="hidden" />
                </label>
              )}

              {editing && photosLocked && (
                <button type="button"
                  onClick={() => { setUpgradeReason('photos'); setShowUpgradeGate(true); }}
                  className="aspect-[3/4] rounded-xl border-2 border-dashed border-amber-300
                    bg-amber-50/60 flex flex-col items-center justify-center gap-1.5
                    hover:border-amber-400 hover:bg-amber-50 transition">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                    <i className="fi fi-sr-lock text-amber-600 text-base leading-none" />
                  </div>
                  <span className="text-[11px] font-semibold text-amber-700 px-2 text-center leading-tight">
                    Desbloquear<br />mais fotos
                  </span>
                  <span className="text-[9.5px] text-amber-600 font-bold mt-0.5">
                    +{PAID_MAX_PHOTOS - FREE_MAX_PHOTOS} com plano
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* ============ VÍDEOS ======================================== */}
        {/* ============================================================ */}
        <div className="mt-6 bg-white rounded-3xl border border-gray-100 p-6 sm:p-8">
          <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-[17px] font-extrabold text-gray-900 flex items-center gap-2">
                  <i className="fi fi-sr-play text-brand-600 text-base leading-none" />
                  Vídeos
                </h3>
                {!isVerified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                    bg-amber-50 border border-amber-200 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    <i className="fi fi-sr-lock text-[9px] leading-none" />
                    Plano grátis
                  </span>
                )}
                {videosLocked && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                    bg-red-50 border border-red-200 text-[10px] font-bold uppercase tracking-wider text-red-600">
                    Limite atingido
                  </span>
                )}
              </div>

              <LimitBar
                current={totalVideos}
                freeMax={FREE_MAX_VIDEOS}
                paidMax={PAID_MAX_VIDEOS}
                isVerified={isVerified}
                color="brand"
              />

              <p className="mt-2 text-[11.5px] text-gray-400 leading-snug">
                {isVerified
                  ? `Podes ter até ${PAID_MAX_VIDEOS} vídeos no teu perfil.`
                  : `No plano grátis podes ter ${FREE_MAX_VIDEOS} vídeos. Ativa um plano para chegar a ${PAID_MAX_VIDEOS}.`}
              </p>
            </div>

            {editing && totalVideos < PAID_MAX_VIDEOS && (
              videosLocked ? (
                <button type="button" onClick={() => { setUpgradeReason('videos'); setShowUpgradeGate(true); }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl
                    bg-amber-50 text-amber-700 text-[13px] font-semibold
                    hover:bg-amber-100 transition border border-amber-200 shrink-0">
                  <i className="fi fi-sr-lock text-base leading-none" />
                  Desbloquear mais
                </button>
              ) : (
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl
                  bg-brand-50 text-brand-700 text-[13px] font-semibold
                  cursor-pointer hover:bg-brand-100 transition shrink-0">
                  <i className="fi fi-rr-plus text-base leading-none" />
                  Adicionar
                  <input type="file" accept="video/*" onChange={pickVideo} className="hidden" />
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
              {editing && !isVerified && (
                <p className="mt-1 text-[11.5px] text-amber-600 font-medium">
                  Plano grátis: até {FREE_MAX_VIDEOS} vídeos
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {form.videos.map((src, i) => (
                <div key={i} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-black group">
                  <video
                    src={src}
                    muted playsInline preload="metadata" crossOrigin="anonymous"
                    onLoadedMetadata={(ev) => {
                      try { ev.currentTarget.currentTime = 0.1; } catch (_) {}
                    }}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-2 left-2 w-8 h-8 rounded-full
                    bg-white/25 backdrop-blur flex items-center justify-center pointer-events-none">
                    <i className="fi fi-sr-play text-white text-sm leading-none ml-0.5" />
                  </div>

                  {editing && (
                    <button onClick={() => removeVideo(i)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full
                        bg-red-600 text-white flex items-center justify-center
                        shadow-lg opacity-0 group-hover:opacity-100
                        hover:bg-red-700 transition-all active:scale-90">
                      <i className="fi fi-rr-trash text-xs leading-none" />
                    </button>
                  )}
                </div>
              ))}

              {editing && totalVideos < PAID_MAX_VIDEOS && !videosLocked && (
                <label className="aspect-[3/4] rounded-xl border-2 border-dashed border-gray-300
                  flex flex-col items-center justify-center gap-1.5 cursor-pointer
                  hover:border-brand-400 hover:bg-brand-50/50 transition">
                  <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center">
                    <i className="fi fi-rr-video-camera text-brand-600 text-base leading-none" />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-500">Adicionar</span>
                  {!isVerified && (
                    <span className="text-[9.5px] text-amber-600 font-bold">
                      {FREE_MAX_VIDEOS - totalVideos} restante{FREE_MAX_VIDEOS - totalVideos !== 1 ? 's' : ''}
                    </span>
                  )}
                  <input type="file" accept="video/*" onChange={pickVideo} className="hidden" />
                </label>
              )}

              {editing && videosLocked && (
                <button type="button"
                  onClick={() => { setUpgradeReason('videos'); setShowUpgradeGate(true); }}
                  className="aspect-[3/4] rounded-xl border-2 border-dashed border-amber-300
                    bg-amber-50/60 flex flex-col items-center justify-center gap-1.5
                    hover:border-amber-400 hover:bg-amber-50 transition">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                    <i className="fi fi-sr-lock text-amber-600 text-base leading-none" />
                  </div>
                  <span className="text-[11px] font-semibold text-amber-700 px-2 text-center leading-tight">
                    Desbloquear<br />mais vídeos
                  </span>
                  <span className="text-[9.5px] text-amber-600 font-bold mt-0.5">
                    +{PAID_MAX_VIDEOS - FREE_MAX_VIDEOS} com plano
                  </span>
                </button>
              )}
            </div>
          )}

          {editing && (
            <p className="mt-4 text-[11.5px] text-gray-400 flex items-center gap-1.5">
              <i className="fi fi-rr-info leading-none" />
              Os vídeos são carregados imediatamente. As fotos são guardadas ao clicares em "Guardar".
            </p>
          )}
        </div>

        {/* ============================================================ */}
        {/* ============ ZONA DE PERIGO ================================ */}
        {/* ============================================================ */}
        <div className="mt-6 bg-white rounded-3xl border border-red-100 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
              <i className="fi fi-sr-triangle-warning text-red-600 text-lg leading-none" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-[16px] font-extrabold text-gray-900">
                Zona de perigo
              </h3>
              <p className="mt-1 text-[13px] text-gray-600 leading-relaxed">
                Eliminar a tua conta remove permanentemente o teu perfil, fotos, vídeos e
                contactos. A conta de autenticação fica <strong>desativada</strong> e não poderás
                voltar a entrar sem apoio do suporte.
              </p>

              <button
                type="button"
                onClick={openDeleteAccount}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                  bg-white border border-red-200 text-red-600
                  text-[13.5px] font-bold hover:bg-red-50
                  active:scale-[0.98] transition">
                <i className="fi fi-rr-trash text-base leading-none" />
                Eliminar conta
              </button>
            </div>
          </div>
        </div>

        <div className="h-8" />
      </div>

      {/* ============================================ */}
      {/* ===== POP-UP 1: UPGRADE / DESBLOQUEAR ====== */}
      {/* ============================================ */}
      {showUpgradeGate && (
        <div className="fixed inset-0 z-[180] flex items-end sm:items-center justify-center">
          <div onClick={() => setShowUpgradeGate(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl
            p-6 pb-8 sm:p-8 animate-[slideUpConfirm_280ms_cubic-bezier(0.22,1,0.36,1)]">
            <div className="sm:hidden w-12 h-1.5 rounded-full bg-gray-300 mx-auto mb-5" />

            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-3xl bg-amber-50 flex items-center justify-center relative">
                <i className="fi fi-sr-lock text-amber-600 text-3xl leading-none" />
                <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white
                  border-2 border-amber-100 flex items-center justify-center">
                  <i className="fi fi-sr-star text-amber-500 text-sm leading-none" />
                </span>
              </div>
            </div>

            <h3 className="font-display text-[22px] font-extrabold text-gray-900 text-center leading-tight">
              Desbloqueia mais {upgradeReason === 'photos' ? 'fotos' : 'vídeos'}
            </h3>

            <p className="mt-3 text-[14.5px] text-gray-600 text-center leading-relaxed">
              {upgradeReason === 'photos' ? (
                <>
                  No plano grátis só podes ter{' '}
                  <strong className="text-gray-900">{FREE_MAX_PHOTOS} fotos</strong>.
                  Com um plano podes subir até{' '}
                  <strong className="text-gray-900">{PAID_MAX_PHOTOS} fotos</strong>.
                </>
              ) : (
                <>
                  No plano grátis só podes ter{' '}
                  <strong className="text-gray-900">{FREE_MAX_VIDEOS} vídeos</strong>.
                  Com um plano podes subir até{' '}
                  <strong className="text-gray-900">{PAID_MAX_VIDEOS} vídeos</strong>.
                </>
              )}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl p-3.5 border-2 border-gray-200 bg-gray-50 text-center">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500">
                  Grátis
                </p>
                <p className="mt-1.5 font-display text-[28px] font-extrabold text-gray-400 leading-none">
                  {upgradeReason === 'photos' ? FREE_MAX_PHOTOS : FREE_MAX_VIDEOS}
                </p>
                <p className="text-[10.5px] text-gray-400 mt-1">
                  {upgradeReason === 'photos' ? 'fotos' : 'vídeos'}
                </p>
              </div>

              <div className="rounded-2xl p-3.5 border-2 border-amber-400 bg-amber-50 text-center">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-amber-700">
                  Com plano
                </p>
                <p className="mt-1.5 font-display text-[28px] font-extrabold text-amber-700 leading-none">
                  {upgradeReason === 'photos' ? PAID_MAX_PHOTOS : PAID_MAX_VIDEOS}
                </p>
                <p className="text-[10.5px] text-amber-700 mt-1">
                  {upgradeReason === 'photos' ? 'fotos' : 'vídeos'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button onClick={goToPayment}
                className="w-full py-4 rounded-2xl bg-brand-600 text-white font-bold text-[15px]
                  hover:bg-brand-700 active:scale-[0.98] transition shadow-lg shadow-brand-600/30
                  flex items-center justify-center gap-2">
                <i className="fi fi-sr-credit-card text-base leading-none" />
                Ativar plano
              </button>

              <button onClick={() => setShowUpgradeGate(false)}
                className="w-full py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-[14px]
                  hover:bg-gray-200 transition">
                Agora não
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* ===== POP-UP 2: PAGAMENTO =========================== */}
      {/* ===================================================== */}
      {showPayment && (
        <div className="fixed inset-0 z-[185] flex items-end sm:items-center justify-center">
          <div onClick={() => paymentStatus === 'form' && cancelPayment()}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl
            max-h-[92vh] overflow-y-auto animate-[slideUpConfirm_280ms_cubic-bezier(0.22,1,0.36,1)]">

            {paymentStatus === 'form' && (
              <>
                <div className="sticky top-0 z-10 bg-white px-6 pt-6 pb-4 border-b border-gray-100
                  flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="sm:hidden w-12 h-1.5 rounded-full bg-gray-300 mb-4" />
                    <h3 className="font-display text-[20px] font-extrabold text-gray-900 leading-tight">
                      Escolhe o teu plano
                    </h3>
                    <p className="mt-1 text-[12.5px] text-gray-500">
                      Pagamento via M-Pesa ou e-Mola. Ativação imediata.
                    </p>
                  </div>
                  <button onClick={cancelPayment}
                    className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200
                      flex items-center justify-center text-gray-600 active:scale-95 transition shrink-0">
                    <i className="fi fi-rr-cross text-sm leading-none" />
                  </button>
                </div>

                <div className="px-6 pb-8 pt-5">
                  <div className="space-y-2.5">
                    {PAYMENT_PLANS.map((plan) => {
                      const active = selectedPlan === plan.id;
                      return (
                        <button key={plan.id} type="button" onClick={() => setSelectedPlan(plan.id)}
                          className={`relative w-full text-left rounded-2xl border-2 p-4
                            transition-all active:scale-[0.99]
                            ${active
                              ? 'border-green-500 bg-green-50/60 shadow-md shadow-green-500/10'
                              : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                          {plan.tag && (
                            <span className="absolute -top-2 right-4 text-[10px] font-bold uppercase tracking-wider
                              bg-green-600 text-white px-2 py-0.5 rounded-full shadow">
                              {plan.tag}
                            </span>
                          )}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                                ${active ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                                {active && <i className="fi fi-sr-check text-white text-[10px] leading-none" />}
                              </span>
                              <div className="min-w-0">
                                <p className="font-display text-[15.5px] font-extrabold text-gray-900 leading-tight">
                                  {plan.label}
                                </p>
                                <p className="text-[12.5px] text-gray-500 mt-0.5">{plan.contacts}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-display text-[19px] font-extrabold text-gray-900 leading-none">
                                {plan.priceLabel}
                              </p>
                              <p className="text-[10.5px] text-gray-500 mt-1">/mês</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6">
                    <p className="text-[13px] font-semibold text-gray-700 mb-2">Método de pagamento</p>
                    <div className="grid grid-cols-2 gap-2">
                      {PAYMENT_METHODS.map((m) => {
                        const active = paymentMethod === m.id;
                        return (
                          <button key={m.id} type="button" onClick={() => setPaymentMethod(m.id)}
                            className={`relative rounded-2xl border-2 p-3 flex items-center gap-2.5
                              transition-all active:scale-[0.98]
                              ${active
                                ? 'border-green-500 bg-green-50/60 shadow-md shadow-green-500/10'
                                : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                              style={{ backgroundColor: m.bg }}>
                              <span className="font-display font-extrabold text-[11px]" style={{ color: m.color }}>
                                {m.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()}
                              </span>
                            </div>
                            <div className="text-left min-w-0">
                              <p className="text-[13.5px] font-bold text-gray-900 leading-tight truncate">
                                {m.name}
                              </p>
                              <p className="text-[10.5px] text-gray-500 truncate">{m.subtitle}</p>
                            </div>
                            {active && (
                              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full
                                bg-green-500 border-2 border-white flex items-center justify-center">
                                <i className="fi fi-sr-check text-white text-[9px] leading-none" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="block mt-6">
                    <span className="text-[13px] font-semibold text-gray-700">
                      Número {PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.name}
                    </span>
                    <div className="mt-2 flex items-center gap-2 px-3 py-3 rounded-2xl
                      bg-gray-50 border border-gray-200
                      focus-within:border-green-500 focus-within:bg-white transition">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.bg }}>
                        <i className="fi fi-sr-mobile text-sm leading-none"
                          style={{ color: PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.color }} />
                      </div>
                      <input type="tel" inputMode="tel" autoComplete="tel"
                        placeholder="+258 84 000 0000" value={paymentPhone}
                        onChange={(e) => setPaymentPhone(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-[15px] font-semibold text-gray-900
                          placeholder:text-gray-400 placeholder:font-normal" />
                    </div>
                    <p className="mt-1.5 text-[11.5px] text-gray-500">
                      Vais receber um pedido de confirmação no teu telemóvel.
                    </p>
                  </label>

                  {paymentError && (
                    <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl
                      bg-red-50 border border-red-200">
                      <i className="fi fi-sr-info text-red-600 text-sm leading-none mt-0.5" />
                      <span className="text-[12.5px] font-medium text-red-700">{paymentError}</span>
                    </div>
                  )}

                  <div className="mt-6 flex flex-col gap-2">
                    <button onClick={startPayment}
                      className="w-full py-4 rounded-2xl bg-green-600 text-white font-bold text-[15px]
                        hover:bg-green-700 active:scale-[0.98] transition shadow-lg shadow-green-500/30
                        flex items-center justify-center gap-2">
                      <i className="fi fi-sr-lock text-base leading-none" />
                      Pagar {currentPlanObj.priceLabel}
                    </button>
                    <button onClick={cancelPayment}
                      className="w-full py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-[14px]
                        hover:bg-gray-200 transition">
                      Cancelar
                    </button>
                    <p className="mt-1 text-center text-[11px] text-gray-400 leading-relaxed">
                      Pagamento seguro • Ativação imediata após confirmação
                    </p>
                  </div>
                </div>
              </>
            )}

            {paymentStatus === 'processing' && (
              <div className="px-6 py-12 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-5">
                  <span className="w-9 h-9 border-[3px] border-green-200 border-t-green-600 rounded-full animate-spin" />
                </div>
                <h3 className="font-display text-[19px] font-extrabold text-gray-900">
                  A iniciar pagamento…
                </h3>
                <p className="mt-2 text-[13.5px] text-gray-500 leading-relaxed max-w-[280px]">
                  Estamos a ligar ao {PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.name}. Aguarda um instante.
                </p>
              </div>
            )}

            {paymentStatus === 'waiting' && (
              <div className="px-6 py-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mb-5 relative">
                  <i className="fi fi-sr-mobile text-amber-600 text-3xl leading-none" />
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500
                    border-2 border-white flex items-center justify-center animate-pulse">
                    <i className="fi fi-sr-bell text-white text-[10px] leading-none" />
                  </span>
                </div>
                <h3 className="font-display text-[19px] font-extrabold text-gray-900">
                  Confirma no teu telemóvel
                </h3>
                <p className="mt-2 text-[13.5px] text-gray-600 leading-relaxed max-w-[300px]">
                  Enviámos um pedido de pagamento de{' '}
                  <strong className="text-gray-900">{currentPlanObj.priceLabel}</strong> para{' '}
                  <strong className="text-gray-900">{paymentPhone}</strong> via{' '}
                  <strong className="text-gray-900">
                    {PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.name}
                  </strong>.
                </p>

                <div className="mt-5 w-full max-w-[320px] rounded-2xl bg-gray-50 border border-gray-100 p-4 text-left">
                  <p className="text-[12px] font-bold uppercase tracking-wider text-gray-500 mb-2">Passos</p>
                  <ol className="space-y-2 text-[13px] text-gray-700">
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-green-600 text-white text-[10px] font-bold
                        flex items-center justify-center shrink-0 mt-0.5">1</span>
                      Abre a notificação / SMS no teu telemóvel
                    </li>
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-green-600 text-white text-[10px] font-bold
                        flex items-center justify-center shrink-0 mt-0.5">2</span>
                      Introduz o teu PIN
                    </li>
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-green-600 text-white text-[10px] font-bold
                        flex items-center justify-center shrink-0 mt-0.5">3</span>
                      Aguarda a confirmação (até 2 min)
                    </li>
                  </ol>
                </div>

                <div className="mt-5 flex items-center gap-2 text-[12px] text-gray-500">
                  <span className="w-3 h-3 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin" />
                  A aguardar confirmação…
                </div>

                <button onClick={cancelPayment}
                  className="mt-6 text-[13px] font-semibold text-gray-500 hover:text-gray-700 underline">
                  Cancelar pagamento
                </button>
              </div>
            )}

            {paymentStatus === 'success' && (
              <div className="px-6 py-12 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5
                  animate-[popSuccess_400ms_cubic-bezier(0.22,1,0.36,1)]">
                  <i className="fi fi-sr-check-circle text-green-600 text-4xl leading-none" />
                </div>
                <h3 className="font-display text-[21px] font-extrabold text-gray-900">
                  Pagamento confirmado!
                </h3>
                <p className="mt-2 text-[13.5px] text-gray-600 leading-relaxed max-w-[280px]">
                  O teu plano <strong className="text-gray-900">{currentPlanObj.label}</strong> está ativo.
                  Já podes subir mais fotos e vídeos.
                </p>
                <style>{`
                  @keyframes popSuccess {
                    0% { transform: scale(0.5); opacity: 0; }
                    60% { transform: scale(1.08); opacity: 1; }
                    100% { transform: scale(1); }
                  }
                `}</style>
              </div>
            )}

            {paymentStatus === 'error' && (
              <div className="px-6 py-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-5">
                  <i className="fi fi-sr-cross-circle text-red-600 text-4xl leading-none" />
                </div>
                <h3 className="font-display text-[19px] font-extrabold text-gray-900">
                  Pagamento não concluído
                </h3>
                <p className="mt-2 text-[13.5px] text-gray-600 leading-relaxed max-w-[300px]">
                  {paymentError || 'Algo correu mal. Tenta novamente.'}
                </p>

                <div className="mt-6 w-full flex flex-col gap-2">
                  <button onClick={() => { setPaymentStatus('form'); setPaymentError(''); }}
                    className="w-full py-3.5 rounded-2xl bg-green-600 text-white font-bold text-[14.5px]
                      hover:bg-green-700 active:scale-[0.98] transition shadow-lg shadow-green-500/25">
                    Tentar novamente
                  </button>
                  <button onClick={cancelPayment}
                    className="w-full py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-[14px]
                      hover:bg-gray-200 transition">
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* ===== POP-UP 3: ELIMINAR CONTA ====================== */}
      {/* ===================================================== */}
      {showDeleteAccount && (
        <div className="fixed inset-0 z-[190] flex items-end sm:items-center justify-center">
          <div
            onClick={closeDeleteAccount}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl
            p-6 pb-8 sm:p-7 animate-[slideUpConfirm_280ms_cubic-bezier(0.22,1,0.36,1)]">
            <div className="sm:hidden w-12 h-1.5 rounded-full bg-gray-300 mx-auto mb-5" />

            {deleteStatus === 'done' ? (
              <div className="py-6 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5">
                  <i className="fi fi-sr-check-circle text-green-600 text-4xl leading-none" />
                </div>
                <h3 className="font-display text-[20px] font-extrabold text-gray-900">
                  Conta eliminada
                </h3>
                <p className="mt-2 text-[13.5px] text-gray-600 leading-relaxed max-w-[280px]">
                  O teu perfil foi removido e a conta foi desativada. Vais ser
                  redirecionado para o início de sessão…
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center">
                    <i className="fi fi-sr-triangle-warning text-red-600 text-3xl leading-none" />
                  </div>
                </div>

                <h3 className="font-display text-[21px] font-extrabold text-gray-900 text-center leading-tight">
                  Eliminar a tua conta?
                </h3>
                <p className="mt-3 text-[13.5px] text-gray-600 text-center leading-relaxed">
                  Esta ação é <strong>permanente</strong>. O teu perfil, fotos, vídeos e
                  contactos serão removidos. Não é possível desfazer.
                </p>

                <div className="mt-5 rounded-2xl bg-red-50 border border-red-100 p-4">
                  <p className="text-[12px] font-bold uppercase tracking-wider text-red-700 mb-2">
                    Vais perder
                  </p>
                  <ul className="space-y-1.5 text-[13px] text-red-800/90">
                    <li className="flex items-center gap-2">
                      <i className="fi fi-sr-cross-small text-red-600 leading-none" />
                      Perfil, bio e interesses
                    </li>
                    <li className="flex items-center gap-2">
                      <i className="fi fi-sr-cross-small text-red-600 leading-none" />
                      Todas as fotos e vídeos
                    </li>
                    <li className="flex items-center gap-2">
                      <i className="fi fi-sr-cross-small text-red-600 leading-none" />
                      Contactos e conversas
                    </li>
                    <li className="flex items-center gap-2">
                      <i className="fi fi-sr-cross-small text-red-600 leading-none" />
                      Plano ativo (sem reembolso)
                    </li>
                  </ul>
                </div>

                <label className="block mt-5">
                  <span className="text-[12.5px] font-semibold text-gray-700">
                    Escreve <strong className="text-red-600">ELIMINAR</strong> para confirmar
                  </span>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    disabled={deleteStatus === 'deleting'}
                    autoComplete="off"
                    autoCapitalize="characters"
                    placeholder="ELIMINAR"
                    className="mt-2 w-full px-3.5 py-3 rounded-xl border border-gray-200
                      text-[15px] font-bold tracking-wider text-center uppercase
                      focus:outline-none focus:ring-2 focus:ring-red-500/30
                      focus:border-red-500 transition
                      disabled:opacity-60"
                  />
                </label>

                {deleteError && (
                  <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl
                    bg-red-50 border border-red-200">
                    <i className="fi fi-sr-info text-red-600 text-sm leading-none mt-0.5" />
                    <span className="text-[12.5px] font-medium text-red-700">{deleteError}</span>
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={
                      deleteStatus === 'deleting' ||
                      deleteConfirmText.trim().toUpperCase() !== 'ELIMINAR'
                    }
                    className="w-full py-4 rounded-2xl bg-red-600 text-white font-bold text-[15px]
                      hover:bg-red-700 active:scale-[0.98] transition
                      shadow-lg shadow-red-600/25
                      disabled:opacity-50 disabled:cursor-not-allowed
                      disabled:shadow-none disabled:active:scale-100
                      flex items-center justify-center gap-2">
                    {deleteStatus === 'deleting' ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white/40 border-t-white
                          rounded-full animate-spin" />
                        A eliminar…
                      </>
                    ) : (
                      <>
                        <i className="fi fi-rr-trash text-base leading-none" />
                        Eliminar definitivamente
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={closeDeleteAccount}
                    disabled={deleteStatus === 'deleting'}
                    className="w-full py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-[14px]
                      hover:bg-gray-200 transition disabled:opacity-50">
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
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

      <style>{`
        @keyframes slideUpConfirm {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @media (min-width: 640px) {
          @keyframes slideUpConfirm {
            from { transform: translateY(20px) scale(0.98); opacity: 0; }
            to   { transform: translateY(0) scale(1); opacity: 1; }
          }
        }
      `}</style>
    </>
  );
}

/* ============================================================
   Field
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