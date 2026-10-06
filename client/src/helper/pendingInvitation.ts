const PENDING_INVITE_KEY = 'cashflow.pendingInvitationToken';
const PENDING_INVITE_REDIRECT_KEY = 'cashflow.pendingInvitationRedirect';

export function savePendingInvitation(token: string, redirect: string): void {
  try {
    sessionStorage.setItem(PENDING_INVITE_KEY, token);
    sessionStorage.setItem(PENDING_INVITE_REDIRECT_KEY, redirect);
  } catch {
    // sessionStorage might be disabled (private mode); ignore.
  }
}

export function readPendingInvitation(): {
  token: string | null;
  redirect: string | null;
} {
  try {
    return {
      token: sessionStorage.getItem(PENDING_INVITE_KEY),
      redirect: sessionStorage.getItem(PENDING_INVITE_REDIRECT_KEY),
    };
  } catch {
    return { token: null, redirect: null };
  }
}

export function clearPendingInvitation(): void {
  try {
    sessionStorage.removeItem(PENDING_INVITE_KEY);
    sessionStorage.removeItem(PENDING_INVITE_REDIRECT_KEY);
  } catch {
    // ignore
  }
}