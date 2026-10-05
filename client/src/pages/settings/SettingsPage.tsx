import React, { useState } from 'react';
import {
  UserRound,
  LockKeyhole,
  Camera,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type SettingsSection = 'profile' | 'password';

const SettingsPage = () => {
  const { user } = useAuth();

  const [activeSection, setActiveSection] =
    useState<SettingsSection>('profile');

  // Frontend-only state for now
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [bio, setBio] = useState('Passionate Software Engineer');
  const [website, setWebsite] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const getInitials = () => {
    if (!name) return 'U';

    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--bg-app))] text-[rgb(var(--text-primary))]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            Settings
          </h1>

          <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">
            Manage your account settings and preferences.
          </p>
        </div>

        {/* Settings Layout */}
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* =========================
              LEFT SIDEBAR
          ========================== */}
          <aside className="w-full shrink-0 lg:w-56">
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveSection('profile')}
                className={[
                  'relative flex w-full items-center gap-3 rounded-md px-3 py-2.5',
                  'text-left text-sm transition-colors',
                  activeSection === 'profile'
                    ? 'bg-[rgb(var(--bg-muted))] font-medium text-[rgb(var(--text-primary))]'
                    : 'text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-subtle))] hover:text-[rgb(var(--text-primary))]',
                ].join(' ')}
              >
                {activeSection === 'profile' && (
                  <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-[rgb(var(--accent))]" />
                )}

                <UserRound size={17} />
                <span>Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('password')}
                className={[
                  'relative flex w-full items-center gap-3 rounded-md px-3 py-2.5',
                  'text-left text-sm transition-colors',
                  activeSection === 'password'
                    ? 'bg-[rgb(var(--bg-muted))] font-medium text-[rgb(var(--text-primary))]'
                    : 'text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-subtle))] hover:text-[rgb(var(--text-primary))]',
                ].join(' ')}
              >
                {activeSection === 'password' && (
                  <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-[rgb(var(--accent))]" />
                )}

                <LockKeyhole size={17} />
                <span>Password</span>
              </button>
            </nav>
          </aside>

          {/* =========================
              RIGHT CONTENT
          ========================== */}
          <main className="min-w-0 flex-1">
            {activeSection === 'profile' ? (
              <ProfileSettings
                name={name}
                setName={setName}
                email={email}
                setEmail={setEmail}
                bio={bio}
                setBio={setBio}
                website={website}
                setWebsite={setWebsite}
                initials={getInitials()}
              />
            ) : (
              <PasswordSettings
                currentPassword={currentPassword}
                setCurrentPassword={setCurrentPassword}
                newPassword={newPassword}
                setNewPassword={setNewPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

type ProfileSettingsProps = {
  name: string;
  setName: React.Dispatch<React.SetStateAction<string>>;
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  bio: string;
  setBio: React.Dispatch<React.SetStateAction<string>>;
  website: string;
  setWebsite: React.Dispatch<React.SetStateAction<string>>;
  initials: string;
};

const ProfileSettings = ({
  name,
  setName,
  email,
  setEmail,
  bio,
  setBio,
  website,
  setWebsite,
  initials,
}: ProfileSettingsProps) => {
  return (
    <section>
      {/* Section Header */}
      <div className="border-b border-[rgb(var(--border-default))] pb-5">
        <h2 className="text-xl font-semibold">Public profile</h2>

        <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">
          Update your personal information and how your profile appears
          across Casherly.
        </p>
      </div>

      {/* Profile Form */}
      <div className="divide-y divide-[rgb(var(--border-default))]">
        {/* Profile Picture */}
        <div className="py-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-medium">Profile picture</h3>

              <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">
                Your profile picture will be visible to other members.
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-[rgb(var(--border-strong))] bg-[rgb(var(--bg-muted))] text-lg font-semibold text-[rgb(var(--text-secondary))]">
                {initials}
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-[rgb(var(--border-strong))] bg-[rgb(var(--bg-surface))] px-3 py-2 text-sm font-medium text-[rgb(var(--text-primary))] transition-colors hover:bg-[rgb(var(--bg-subtle))]"
              >
                <Camera size={15} />
                Change
              </button>
            </div>
          </div>
        </div>

        {/* Name */}
        <div className="grid gap-4 py-7 sm:grid-cols-[180px_1fr] sm:gap-8">
          <div>
            <label
              htmlFor="name"
              className="text-sm font-medium text-[rgb(var(--text-primary))]"
            >
              Name
            </label>

            <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">
              Your display name.
            </p>
          </div>

          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="h-10 w-full rounded-md border border-[rgb(var(--border-strong))] bg-[rgb(var(--bg-surface))] px-3 text-sm outline-none transition-colors placeholder:text-[rgb(var(--text-faint))] focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent))]/15"
          />
        </div>

        {/* Email */}
        <div className="grid gap-4 py-7 sm:grid-cols-[180px_1fr] sm:gap-8">
          <div>
            <label
              htmlFor="email"
              className="text-sm font-medium text-[rgb(var(--text-primary))]"
            >
              Email
            </label>

            <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">
              Your primary account email.
            </p>
          </div>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-10 w-full rounded-md border border-[rgb(var(--border-strong))] bg-[rgb(var(--bg-surface))] px-3 text-sm outline-none transition-colors placeholder:text-[rgb(var(--text-faint))] focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent))]/15"
          />
        </div>

        {/* Bio */}
        <div className="grid gap-4 py-7 sm:grid-cols-[180px_1fr] sm:gap-8">
          <div>
            <label
              htmlFor="bio"
              className="text-sm font-medium text-[rgb(var(--text-primary))]"
            >
              Bio
            </label>

            <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">
              A short description about yourself.
            </p>
          </div>

          <textarea
            id="bio"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us a little about yourself..."
            className="w-full resize-none rounded-md border border-[rgb(var(--border-strong))] bg-[rgb(var(--bg-surface))] px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-[rgb(var(--text-faint))] focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent))]/15"
          />

          <div className="sm:col-start-2 -mt-2 text-right text-xs text-[rgb(var(--text-faint))]">
            {bio.length}/160
          </div>
        </div>

        {/* Website */}
        <div className="grid gap-4 py-7 sm:grid-cols-[180px_1fr] sm:gap-8">
          <div>
            <label
              htmlFor="website"
              className="text-sm font-medium text-[rgb(var(--text-primary))]"
            >
              Website
            </label>

            <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">
              Your personal website or portfolio.
            </p>
          </div>

          <input
            id="website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
            className="h-10 w-full rounded-md border border-[rgb(var(--border-strong))] bg-[rgb(var(--bg-surface))] px-3 text-sm outline-none transition-colors placeholder:text-[rgb(var(--text-faint))] focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent))]/15"
          />
        </div>

        {/* Save */}
        <div className="flex items-center justify-end py-6">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-[rgb(var(--accent))] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[rgb(var(--accent-hover))]"
          >
            <Save size={15} />
            Save changes
          </button>
        </div>
      </div>
    </section>
  );
};

type PasswordSettingsProps = {
  currentPassword: string;
  setCurrentPassword: React.Dispatch<React.SetStateAction<string>>;
  newPassword: string;
  setNewPassword: React.Dispatch<React.SetStateAction<string>>;
  confirmPassword: string;
  setConfirmPassword: React.Dispatch<React.SetStateAction<string>>;
};

const PasswordSettings = ({
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
}: PasswordSettingsProps) => {
  return (
    <section>
      {/* Header */}
      <div className="border-b border-[rgb(var(--border-default))] pb-5">
        <h2 className="text-xl font-semibold">Change password</h2>

        <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">
          Update your password to keep your account secure.
        </p>
      </div>

      <div className="divide-y divide-[rgb(var(--border-default))]">
        {/* Security Notice */}
        <div className="flex gap-3 py-6">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[rgb(var(--bg-muted))] text-[rgb(var(--text-secondary))]">
            <ShieldCheck size={17} />
          </div>

          <div>
            <p className="text-sm font-medium">
              Keep your password secure
            </p>

            <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">
              Use a strong password that you don't use on other websites.
            </p>
          </div>
        </div>

        {/* Current Password */}
        <div className="grid gap-4 py-7 sm:grid-cols-[180px_1fr] sm:gap-8">
          <div>
            <label
              htmlFor="current-password"
              className="text-sm font-medium"
            >
              Current password
            </label>
          </div>

          <input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            className="h-10 w-full rounded-md border border-[rgb(var(--border-strong))] bg-[rgb(var(--bg-surface))] px-3 text-sm outline-none transition-colors placeholder:text-[rgb(var(--text-faint))] focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent))]/15"
          />
        </div>

        {/* New Password */}
        <div className="grid gap-4 py-7 sm:grid-cols-[180px_1fr] sm:gap-8">
          <div>
            <label
              htmlFor="new-password"
              className="text-sm font-medium"
            >
              New password
            </label>

            <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">
              At least 8 characters.
            </p>
          </div>

          <input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            className="h-10 w-full rounded-md border border-[rgb(var(--border-strong))] bg-[rgb(var(--bg-surface))] px-3 text-sm outline-none transition-colors placeholder:text-[rgb(var(--text-faint))] focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent))]/15"
          />
        </div>

        {/* Confirm Password */}
        <div className="grid gap-4 py-7 sm:grid-cols-[180px_1fr] sm:gap-8">
          <div>
            <label
              htmlFor="confirm-password"
              className="text-sm font-medium"
            >
              Confirm password
            </label>
          </div>

          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="h-10 w-full rounded-md border border-[rgb(var(--border-strong))] bg-[rgb(var(--bg-surface))] px-3 text-sm outline-none transition-colors placeholder:text-[rgb(var(--text-faint))] focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent))]/15"
          />
        </div>

        {/* Save */}
        <div className="flex items-center justify-end py-6">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-[rgb(var(--accent))] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[rgb(var(--accent-hover))]"
          >
            <LockKeyhole size={15} />
            Update password
          </button>
        </div>
      </div>
    </section>
  );
};

export default SettingsPage;