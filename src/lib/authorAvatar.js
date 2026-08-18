import defaultAuthorAvatar from '../assets/default-author-avatar.png';

export const DEFAULT_AUTHOR_AVATAR = defaultAuthorAvatar;

export function authorAvatarUrl(author) {
  return String(author?.avatarUrl || '').trim() || DEFAULT_AUTHOR_AVATAR;
}
