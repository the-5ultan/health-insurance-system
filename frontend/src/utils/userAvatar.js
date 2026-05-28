export function getUserAvatarSrc(user) {
  const raw = user?.profilePic || '';
  if (!raw) return null;

  // Avoid breaking external (Google) avatars while still cache-busting local uploads.
  const version = user?.updatedAt ? String(new Date(user.updatedAt).getTime()) : null;
  if (!version) return raw;

  try {
    const url = new URL(raw, window.location.origin);
    url.searchParams.set('v', version);
    return url.toString();
  } catch {
    // If the URL is not parseable (rare), return as-is.
    return raw;
  }
}

export function getUserInitials(user) {
  const first = (user?.firstName || user?.username || '').trim();
  const last = (user?.lastName || '').trim();
  const a = first ? first[0] : '';
  const b = last ? last[0] : '';
  const initials = `${a}${b}`.toUpperCase();
  return initials || 'U';
}

