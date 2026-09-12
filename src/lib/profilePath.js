export function profilePath(profile, currentUserId) {
  if (!profile) return '/app/descobrir';

  if (typeof profile === 'string') {
    return profile === currentUserId ? '/app/perfil' : `/app/perfil/${profile}`;
  }

  const { id, slug } = profile;

  if (id && id === currentUserId) return '/app/perfil';
  if (slug && slug.trim()) return `/app/perfil/${slug}`;
  if (id) return `/app/perfil/${id}`;
  return '/app/descobrir';
}

export function profileUrl(profile, currentUserId) {
  return `${window.location.origin}${profilePath(profile, currentUserId)}`;
}