import React, { useState } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { StatusBadge } from '../common/StatusBadge';
import {
  User,
  Key,
  ShieldCheck,
  Clock,
  Laptop,
  CheckCircle2,
  Lock,
  Mail,
  Building,
  LogOut,
  Save
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { currentUser, addToast, logout } = useLibrary();

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const [fullName, setFullName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      addToast({
        type: 'error',
        title: 'Password Mismatch',
        message: 'New password and confirmation do not match.',
      });
      return;
    }
    addToast({
      type: 'success',
      title: 'Password Updated',
      message: 'Your institutional credentials have been refreshed.',
    });
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
  };

  const handleUpdateInfo = (e: React.FormEvent) => {
    e.preventDefault();
    addToast({
      type: 'success',
      title: 'Profile Updated',
      message: 'Personal details updated in directory.',
    });
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              className="px-4 py-2 font-bold text-white bg-maroon-800 hover:bg-maroon-900 rounded-xl shadow-card transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Profile</span>
            </button>
          </form>
        </div>

        {/* Right: Security & Password Update (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
            <Lock className="w-4 h-4 text-maroon-800 dark:text-gold-400" />
            <h3 className="text-sm font-bold font-heading text-gray-900 dark:text-white">
              Change Security Password
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
                placeholder="Min 8 characters"
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
                placeholder="Confirm password"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 font-bold text-white bg-maroon-800 hover:bg-maroon-900 rounded-xl shadow-card transition flex items-center gap-1.5"
            >
              <Key className="w-4 h-4" />
              <span>Update Password</span>
            </button>
          </form>
        </div>
      </div>

      {/* Audit Log / Session Trail */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-3">
        <h3 className="text-sm font-bold font-heading text-gray-900 dark:text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-gold-500" />
          <span>Recent Activity & Security Audit Trail</span>
        </h3>

        <div className="space-y-2 text-xs divide-y divide-gray-100 dark:divide-slate-800">
          <div className="pt-2 flex items-center justify-between">
            <span className="text-gray-800 dark:text-gray-200 font-medium">
              Signed in via Chief Librarian Desktop Terminal (Chrome / Windows 11)
            </span>
            <span className="text-gray-400 font-mono text-[11px]">Today at 07:45 AM</span>
          </div>
          <div className="pt-2 flex items-center justify-between">
            <span className="text-gray-800 dark:text-gray-200 font-medium">
              Issued copy #3 of "Madol Doova" to Kavindu Perera
            </span>
            <span className="text-gray-400 font-mono text-[11px]">Oct 04 at 02:15 PM</span>
          </div>
          <div className="pt-2 flex items-center justify-between">
            <span className="text-gray-800 dark:text-gray-200 font-medium">
              Stock reconciliation completed for Sri Lankan Heritage Archive Stack A
            </span>
            <span className="text-gray-400 font-mono text-[11px]">Sep 30 at 04:10 PM</span>
          </div>
        </div>
      </div>
    </div>
  );
};
