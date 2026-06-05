import { createHash } from 'node:crypto';

import type { AuthUser } from '@/auth/auth.types';

export const buildDisplayName = (claims: AuthUser): string => {
  const fullName = [claims.firstName, claims.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  if (fullName.length > 0) return fullName;
  if (claims.preferredUsername) return claims.preferredUsername;
  if (claims.email) return claims.email;
  return 'User';
};

export const pickAvatar = (claims: AuthUser): string | null => {
  if (claims.picture && claims.picture.length > 0) return claims.picture;
  if (claims.email) {
    const hash = createHash('sha256')
      .update(claims.email.trim().toLowerCase())
      .digest('hex');
    return `https://www.gravatar.com/avatar/${hash}?d=404`;
  }
  return null;
};
