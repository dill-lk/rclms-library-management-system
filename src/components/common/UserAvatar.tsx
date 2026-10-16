import React, { ReactNode, useEffect, useState } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { getSupabase } from '../../utils/supabaseClient';

const PROFILE_PICTURE_BUCKET = 'staff-profile-pictures';
const PROFILE_PICTURE_SIGNED_URL_SECONDS = 15 * 60;
const PROFILE_PICTURE_REFRESH_MS = 10 * 60 * 1000;
const PROFILE_PICTURE_CACHE_MARGIN_MS = 60 * 1000;

type CachedSignedUrl = { url: string; expiresAt: number };
const ownAvatarCache = new Map<string, CachedSignedUrl>();
const pendingOwnAvatarRequests = new Map<string, Promise<string | undefined>>();
const avatarCacheEpochs = new Map<string, number>();

const getOwnSignedUrl = async (userId: string, path: string): Promise<string | undefined> => {
  if (!userId || path !== `${userId}/profile-picture`) return undefined;
  const cached = ownAvatarCache.get(path);
  if (cached && cached.expiresAt > Date.now() + PROFILE_PICTURE_CACHE_MARGIN_MS) return cached.url;
  const pending = pendingOwnAvatarRequests.get(path);
  if (pending) return pending;

  const epoch = avatarCacheEpochs.get(path) || 0;
  const request = (async () => {
    const supabase = getSupabase();
    if (!supabase) return undefined;
    const { data, error } = await supabase.storage.from(PROFILE_PICTURE_BUCKET)
      .createSignedUrl(path, PROFILE_PICTURE_SIGNED_URL_SECONDS);
    if (error || !data?.signedUrl) return undefined;
    if ((avatarCacheEpochs.get(path) || 0) === epoch) {
      ownAvatarCache.set(path, {
        url: data.signedUrl,
        expiresAt: Date.now() + PROFILE_PICTURE_SIGNED_URL_SECONDS * 1000 - PROFILE_PICTURE_CACHE_MARGIN_MS,
      });
    }
    return data.signedUrl;
  })();
  pendingOwnAvatarRequests.set(path, request);
  try {
    return await request;
  } finally {
    if (pendingOwnAvatarRequests.get(path) === request) pendingOwnAvatarRequests.delete(path);
  }
};

export const invalidateOwnProfileAvatarUrl = (path: string) => {
  ownAvatarCache.delete(path);
  pendingOwnAvatarRequests.delete(path);
  avatarCacheEpochs.set(path, (avatarCacheEpochs.get(path) || 0) + 1);
};

const isSignedPrivateAvatarUrl = (value?: string) => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.pathname.includes(`/storage/v1/object/sign/${PROFILE_PICTURE_BUCKET}/`);
  } catch {
    return false;
  }
};

interface UserAvatarProps {
  accountId: string;
  accountName: string;
  avatarPath?: string;
  signedUrl?: string;
  srcOverride?: string;
  refreshToken?: number;
  className: string;
  imageClassName?: string;
  fallback?: ReactNode;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  accountId,
  accountName,
  avatarPath,
  signedUrl,
  srcOverride,
  refreshToken = 0,
  className,
  imageClassName = 'h-full w-full object-cover',
  fallback,
}) => {
  const { currentUser } = useLibrary();
  const canReadOwnAvatar = Boolean(
    accountId && currentUser.id === accountId && avatarPath === `${accountId}/profile-picture`,
  );
  const [ownSignedUrl, setOwnSignedUrl] = useState<string | undefined>();
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!canReadOwnAvatar) {
      setOwnSignedUrl(undefined);
      return;
    }

    const refresh = async () => {
      const url = await getOwnSignedUrl(accountId, avatarPath!);
      if (!cancelled) setOwnSignedUrl(url);
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), PROFILE_PICTURE_REFRESH_MS);
    window.addEventListener('focus', refresh);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [accountId, avatarPath, canReadOwnAvatar, refreshToken]);

  const safeSignedUrl = isSignedPrivateAvatarUrl(signedUrl) ? signedUrl : undefined;
  const safeOverride = srcOverride?.startsWith('blob:') || isSignedPrivateAvatarUrl(srcOverride)
    ? srcOverride
    : undefined;
  const source = safeOverride || safeSignedUrl || (canReadOwnAvatar ? ownSignedUrl : undefined);

  useEffect(() => setImageFailed(false), [source]);

  const initials = accountName.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'U';
  return (
    <div className={className} aria-label={`${accountName || 'User'} profile picture`}>
      {source && !imageFailed ? (
        <img
          src={source}
          alt={`${accountName || 'User'} profile picture`}
          className={imageClassName}
          onError={() => setImageFailed(true)}
        />
      ) : fallback ?? <span>{initials}</span>}
    </div>
  );
};
