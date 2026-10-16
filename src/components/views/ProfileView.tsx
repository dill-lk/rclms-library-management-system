import React, { useState } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { StatusBadge } from '../common/StatusBadge';
import {
  User,
  Key,
  UserRound,
  Lock,
  LogOut,
  Save
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { currentUser, addToast, logout, setActiveTab, updateOwnProfile, changeOwnPassword } = useLibrary();

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const [fullName, setFullName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      addToast({
        type: 'error',
        title: 'Password Mismatch',
        message: 'New password and confirmation do not match.',
      });
      return;
    }
    if (newPass.length < 8 || newPass.length > 128) {
      addToast({ type: 'error', title: 'Password is too short or long', message: 'Choose a password between 8 and 128 characters.' });
      return;
    }
    setSavingPassword(true);
    try {
      const result = await changeOwnPassword(currentPass, newPass);
      if (result.success) {
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const result = await updateOwnProfile({ name: fullName, phone });
      if (result.success && result.user) {
        setFullName(result.user.name);
        setPhone(result.user.phone || '');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Profile Header */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-maroon-900 via-maroon-800 to-maroon-700 text-gold-300 border-2 border-gold-400 font-bold text-2xl flex items-center justify-center shadow-md flex-shrink-0">
              {currentUser.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 dark:text-white">
                  {currentUser.name}
                </h1>
                <StatusBadge status="active" size="sm" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {currentUser.designation}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-maroon-100 text-maroon-900 dark:bg-maroon-900/60 dark:text-gold-300 uppercase">
                  {currentUser.role.replace('_', ' ')}
                </span>
                <span className="text-xs text-gray-400 font-mono">{currentUser.email}</span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 border border-red-200 dark:border-red-900/60 rounded-xl transition flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Terminal</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Edit Personal Details (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
            <User className="w-4 h-4 text-maroon-800 dark:text-gold-400" />
            <h3 className="text-sm font-bold font-heading text-gray-900 dark:text-white">
              Personal Information
            </h3>
          </div>

          <form onSubmit={handleUpdateInfo} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Full Display Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Institutional Email
              </label>
              <input
                type="email"
                value={currentUser.email}
                readOnly
                className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-600 dark:text-gray-400"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                maxLength={40}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Department / Qualification
              </label>
              <input
                type="text"
                disabled
                value={currentUser.designation}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-500 cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="px-4 py-2 font-bold text-white bg-maroon-800 hover:bg-maroon-900 rounded-xl shadow-card transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{savingProfile ? 'Saving…' : 'Save Profile'}</span>
            </button>
            <p className="text-[11px] leading-5 text-gray-500 dark:text-gray-400">Your sign-in email, role, and permissions are managed separately and cannot be changed here.</p>
          </form>
        </div>

        {/* Right: Security & Password Update (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
            <Lock className="w-4 h-4 text-maroon-800 dark:text-gold-400" />
            <h3 className="text-sm font-bold font-heading text-gray-900 dark:text-white">
              Change your sign-in password
            </h3>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                placeholder="Confirm new password"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="px-4 py-2 font-bold text-white bg-maroon-800 hover:bg-maroon-900 rounded-xl shadow-card transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Key className="w-4 h-4" />
              <span>{savingPassword ? 'Updating…' : 'Update Password'}</span>
            </button>
            <p className="text-[11px] leading-5 text-gray-500 dark:text-gray-400">Your current password is verified before the change. Other sign-ins are ended so they must use the new password.</p>
          </form>
        </div>
      </div>

      <section className="flex flex-col gap-3 border border-library-border bg-library-surface p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-library-main">
            <UserRound className="h-4 w-4" /> Account activity
          </h3>
          <p className="mt-1 text-xs text-library-muted">Review sign-in activity linked to your account in Settings.</p>
        </div>
        <button type="button" onClick={() => setActiveTab('settings')} className="min-h-9 border border-library-border px-3 text-xs font-semibold text-library-main hover:bg-library-bg">
          Account activity
        </button>
      </section>
    </div>
  );
};
