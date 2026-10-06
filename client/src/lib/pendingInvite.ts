// src/lib/pendingInvite.ts

const KEY = 'pendingInvitationToken';

export function savePendingInvite(token: string): void {
  try {
    sessionStorage.setItem(KEY, token);
  } catch {
    /* ignore */
  }
}

export function readPendingInvite(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearPendingInvite(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Builds the "come back here after login" path for the invitation page.
 */
export function buildInviteRedirectPath(token: string): string {
  return `/invitations/accept?token=${encodeURIComponent(token)}`;
}

/**
 * Builds the "come back here after login" path for the login page itself.
 */
export function buildLoginPath(inviteToken: string): string {
  const redirect = buildInviteRedirectPath(inviteToken);
  return `/login?redirect=${encodeURIComponent(redirect)}`;
}