import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { acceptInvitation, getInvitationDetails } from '@/services/api';
import type { InvitationDetails } from '@/services/api';
import {
  savePendingInvitation,
  clearPendingInvitation,
} from '@/helper/pendingInvitation';
import { WalletCards, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

type Status =
  | 'idle'
  | 'loading'
  | 'accepting'
  | 'success'
  | 'error'
  | 'login-required';

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const ranRef = useRef(false);

  // -------------------------------------------------------------------------
  // 1. No token → error
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing invitation token in the link.');
    }
  }, [token]);

  // -------------------------------------------------------------------------
  // 2. Fetch invitation details (public) so we can show org name / email
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      try {
        setStatus('loading');
        

        const details = await getInvitationDetails(token);
        console.log("details:",details);
        if (cancelled) return;
        setInvitation(details);
      } catch {
        // Non-fatal — the accept call below will give the real error.
        if (!cancelled) setInvitation(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // -------------------------------------------------------------------------
  // 3. Main flow — wait for auth to finish restoring first
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!token) return;
    if (authLoading) return;         // wait until AuthContext finishes boot
    if (ranRef.current) return;      // run only once per mount

    // Not logged in → stash token and send to login
    if (!user) {
      const redirect = `/invitations/accept?token=${encodeURIComponent(token)}`;
      savePendingInvitation(token, redirect);
      setStatus('login-required');
      navigate(
        `/login?redirect=${encodeURIComponent(redirect)}`,
        { replace: true }
      );
      return;
    }

    // Logged in → accept
    ranRef.current = true;

    (async () => {
      try {
        setStatus('accepting');
        const result = await acceptInvitation(token);
        clearPendingInvitation();
        setStatus('success');
        setMessage(result.message || 'Invitation accepted!');

        // Redirect into the org after a short pause
        setTimeout(() => {
          navigate(`/organization/${result.organizationId}`, {
            replace: true,
          });
        }, 1200);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Could not accept invitation.';
        setStatus('error');
        setMessage(msg);
      }
    })();
  }, [token, user, authLoading, navigate]);

  // -------------------------------------------------------------------------
  // 4. Render
  // -------------------------------------------------------------------------
  return (
    <div className="auth-page">
      <div className="auth-brand">
        <span>
          <WalletCards size={20} />
        </span>
        Cashflow
      </div>

      <div className="auth-card">
        <div className="auth-heading">
          <h1>
            {status === 'success'
              ? 'Invitation accepted'
              : status === 'error'
                ? 'Invitation problem'
                : 'Organization invitation'}
          </h1>

          <p>
            {invitation
              ? `You were invited to join ${invitation.organizationName}.`
              : 'Processing your invitation…'}
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {(status === 'idle' ||
            status === 'loading' ||
            status === 'accepting' ||
            status === 'login-required') && (
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Loader2 className="animate-spin" size={18} />
              <span>
                {status === 'accepting'
                  ? 'Accepting your invitation…'
                  : status === 'login-required'
                    ? 'Redirecting to login…'
                    : 'Loading invitation…'}
              </span>
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-center gap-3 text-sm text-green-600">
              <CheckCircle2 size={18} />
              <span>{message}</span>
            </div>
          )}

          {status === 'error' && (
            <>
              <div className="flex items-center gap-3 text-sm text-red-600">
                <XCircle size={18} />
                <span>{message}</span>
              </div>

              <div className="flex gap-3">
                <Link to="/" className="auth-submit text-center">
                  Go to dashboard
                </Link>
                {token && (
                  <button
                    type="button"
                    className="auth-submit"
                    onClick={() => {
                      ranRef.current = false;
                      setStatus('idle');
                      setMessage('');
                    }}
                  >
                    Retry
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <p className="auth-footnote">Simple spend management for teams</p>
    </div>
  );
}
