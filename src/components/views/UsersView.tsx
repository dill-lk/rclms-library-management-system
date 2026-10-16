import React, { useState } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { UserAccount, UserRole } from '../../types';
import { libraryPermissions, permissionsForRole, roleLabels, rolePermissions } from '../../utils/roles';
import {
  ShieldAlert,
  Search,
  Plus,
  ShieldCheck,
  Check,
  X,
  User,
  Key,
  KeyRound,
  Ban,
  RotateCcw,
  Lock,
  Sparkles
} from 'lucide-react';

export const UsersView: React.FC = () => {
  const { users, addUser, updateUserRole, setAccountPassword, updateUserStatus, currentUser, addToast, isSupabaseConfigured } = useLibrary();

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('assistant_librarian');
  const [userDesignation, setUserDesignation] = useState('');
  const [approvalRoles, setApprovalRoles] = useState<Record<string, 'librarian' | 'assistant_librarian'>>({});
  const [passwordTarget, setPasswordTarget] = useState<UserAccount | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pendingAccountAction, setPendingAccountAction] = useState<string | null>(null);
  const isSuperAdmin = currentUser.role === 'super_admin';
  const pendingRequests = users.filter((user) => user.status === 'pending');

  const handleApproveRequest = async (user: UserAccount) => {
    const role = approvalRoles[user.id] || 'assistant_librarian';
    await updateUserRole(user.id, role);
  };

  const closePasswordModal = () => {
    setPasswordTarget(null);
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const handleSetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordTarget) return;
    if (newPassword.length < 8 || newPassword.length > 128) {
      addToast({ type: 'error', title: 'Password is too short or long', message: 'Choose a password between 8 and 128 characters.' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      addToast({ type: 'error', title: 'Passwords do not match', message: 'Enter the same new password twice.' });
      return;
    }
    setPendingAccountAction(passwordTarget.id);
    try {
      const result = await setAccountPassword(passwordTarget.id, newPassword);
      if (result.success) closePasswordModal();
    } finally {
      setPendingAccountAction(null);
    }
  };

  const handleToggleAccountStatus = async (user: UserAccount) => {
    const status = user.status === 'active' ? 'suspended' : 'active';
    const action = status === 'suspended' ? 'suspend' : 'reactivate';
    const description = status === 'suspended'
      ? 'They will be blocked from signing in, and their active library sign-ins will be ended. You can reactivate this account later.'
      : 'The account will be allowed to sign in again. The user must sign in again; previous sessions will remain ended.';
    if (!window.confirm(`Are you sure you want to ${action} ${user.email}?\n\n${description}`)) return;
    setPendingAccountAction(user.id);
    try {
      await updateUserStatus(user.id, status);
    } finally {
      setPendingAccountAction(null);
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim()) return;

    if (isSupabaseConfigured) {
      addToast({ type: 'warning', title: 'Auth invitation required', message: 'Create or invite this person in Supabase Auth first. Then refresh this page to manage their role safely.' });
      setIsAddUserModalOpen(false);
      return;
    }

    addUser({
      name: userName,
      email: userEmail,
      role: userRole,
      designation: userDesignation || 'Library Staff',
      lastLogin: 'Never',
      status: 'active',
      permissions: permissionsForRole(userRole),
    });

    setIsAddUserModalOpen(false);
    setUserName('');
    setUserEmail('');
    setUserDesignation('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-maroon-800 dark:text-gold-400" />
            <span>Accounts and access</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Manage staff and reader accounts by their sign-in identity. Access role determines permissions; designation or department is descriptive only.
          </p>
        </div>

        <button
          onClick={() => setIsAddUserModalOpen(true)}
          className="px-4 py-2 text-xs font-bold text-white bg-maroon-800 hover:bg-maroon-900 rounded-xl shadow-card transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add staff member</span>
        </button>
      </div>

      {isSuperAdmin && pendingRequests.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="font-bold">{pendingRequests.length} staff access request{pendingRequests.length === 1 ? '' : 's'} awaiting your review.</div>
          <p className="mt-1">Choose Librarian or Assistant Librarian and approve each request. Requests have no management access until you do.</p>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold font-heading text-gray-900 dark:text-white">
            User accounts ({users.length})
          </h3>
          <span className="text-xs text-gray-400 font-mono">Sign-in accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-slate-800/80 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">User Name</th>
                <th className="py-3 px-3">Email Address</th>
                <th className="py-3 px-3">Access role</th>
                <th className="py-3 px-3">Designation / department</th>
                <th className="py-3 px-3">Last Active</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Review / change role</th>
                <th className="py-3 px-4 text-right">Account safety</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-800 dark:text-gray-200">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-bold">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-maroon-800 text-gold-300 font-bold flex items-center justify-center text-xs flex-shrink-0">
                        {(u.name || u.email || 'U')[0].toUpperCase()}
                      </div>
                      <span className="truncate">{u.name || 'Library user'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-gray-500 dark:text-gray-400">{u.email}</td>
                  <td className="py-3 px-3">
                    <span className="capitalize font-semibold text-maroon-800 dark:text-gold-400 font-mono text-[11px]">
                      {roleLabels[u.role]}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-gray-600 dark:text-gray-300 truncate max-w-xs">
                    {u.designation}
                  </td>
                  <td className="py-3 px-3 text-gray-400 font-mono text-[11px]">{u.lastLogin}</td>
                  <td className="py-3 px-3">
                    <StatusBadge status={u.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    {u.status === 'pending' ? (
                      isSuperAdmin ? (
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={approvalRoles[u.id] || 'assistant_librarian'}
                            onChange={(event) => setApprovalRoles((current) => ({
                              ...current,
                              [u.id]: event.target.value as 'librarian' | 'assistant_librarian',
                            }))}
                            aria-label={`Role to assign to ${u.name}`}
                            className="text-xs py-1 px-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-800 dark:text-gray-200"
                          >
                            <option value="assistant_librarian">Assistant Librarian</option>
                            <option value="librarian">Librarian</option>
                          </select>
                          <button
                            onClick={() => handleApproveRequest(u)}
                            className="rounded-lg bg-emerald-700 px-3 py-1.5 font-bold text-white hover:bg-emerald-800"
                          >
                            Approve
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400">Waiting for main administrator</span>
                      )
                    ) : isSuperAdmin && u.role !== 'super_admin' ? (
                      <select
                        value={u.role}
                        onChange={(event) => updateUserRole(u.id, event.target.value as UserRole)}
                        aria-label={`Change role for ${u.name}`}
                        className="text-xs py-1 px-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-800 dark:text-gray-200"
                      >
                        <option value="librarian">Librarian</option>
                        <option value="assistant_librarian">Assistant Librarian</option>
                        <option value="teacher">Teacher</option>
                        <option value="student">Student</option>
                        <option value="staff">Staff</option>
                      </select>
                    ) : (
                      <span className="text-[11px] text-gray-400">{isSuperAdmin ? 'Protected account' : 'Super administrator only'}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isSuperAdmin && u.role !== 'super_admin' && u.status !== 'pending' ? (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={pendingAccountAction === u.id || !isSupabaseConfigured}
                          onClick={() => setPasswordTarget(u)}
                          aria-label={`Reset password for ${u.email}`}
                          className="inline-flex min-h-8 items-center gap-1.5 border border-gray-200 dark:border-slate-700 px-2.5 text-[11px] font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50"
                        >
                          <KeyRound className="h-3.5 w-3.5" /> Set password
                        </button>
                        <button
                          type="button"
                          disabled={pendingAccountAction === u.id || !isSupabaseConfigured}
                          onClick={() => void handleToggleAccountStatus(u)}
                          aria-label={`${u.status === 'active' ? 'Suspend' : 'Reactivate'} ${u.email}`}
                          className={`inline-flex min-h-8 items-center gap-1.5 border px-2.5 text-[11px] font-semibold disabled:opacity-50 ${u.status === 'active' ? 'border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/60 dark:text-emerald-300'}`}
                        >
                          {u.status === 'active' ? <Ban className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                          {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-400">{isSuperAdmin ? (u.status === 'pending' ? 'Approve request first' : 'Protected account') : 'Super administrator only'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold font-heading text-gray-900 dark:text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-gold-500" />
            <span>What each role can do</span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            A quick overview of access for each type of user. A check means the role can use that area.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-gray-200 dark:border-slate-700 rounded-xl">
            <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-4">Permission Module</th>
                <th className="py-2.5 px-3 text-center">Super Admin</th>
                <th className="py-2.5 px-3 text-center">Chief Librarian</th>
                <th className="py-2.5 px-3 text-center">Asst. Librarian</th>
                <th className="py-2.5 px-3 text-center">Teacher</th>
                <th className="py-2.5 px-3 text-center">Student</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-800 dark:text-gray-200">
              {libraryPermissions.map((perm) => (
                <tr key={perm.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 font-medium">{perm.label}</td>
                  <td className="py-2.5 px-3 text-center">
                    <Check className="w-4 h-4 text-white mx-auto" />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <Check className="w-4 h-4 text-white mx-auto" />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {rolePermissions.assistant_librarian.includes(perm.id) ? (
                      <Check className="w-4 h-4 text-white mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-neutral-600 mx-auto" />
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {rolePermissions.teacher.includes(perm.id) ? (
                      <Check className="w-4 h-4 text-white mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-neutral-600 mx-auto" />
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {rolePermissions.student.includes(perm.id) ? (
                      <Check className="w-4 h-4 text-white mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-neutral-600 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={Boolean(passwordTarget)}
        onClose={closePasswordModal}
        title="Set account password"
        subtitle={passwordTarget ? `Reset sign-in password for ${passwordTarget.email}.` : undefined}
        size="md"
      >
        <form onSubmit={handleSetPassword} className="space-y-4 text-xs">
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            This changes the sign-in password immediately and ends the account’s active library sessions. Share the new password with the account owner securely.
          </p>
          <label className="block">
            <span className="mb-1 block font-bold text-gray-700 dark:text-gray-300">New password</span>
            <input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </label>
          <label className="block">
            <span className="mb-1 block font-bold text-gray-700 dark:text-gray-300">Confirm new password</span>
            <input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closePasswordModal} className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800">Cancel</button>
            <button type="submit" disabled={Boolean(pendingAccountAction) || !isSupabaseConfigured} className="rounded-xl bg-maroon-800 px-4 py-2 font-bold text-white hover:bg-maroon-900 disabled:opacity-50">
              {pendingAccountAction === passwordTarget?.id ? 'Saving…' : 'Change password'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        title="Add staff member"
        subtitle="Set the staff member’s role and access."
        size="md"
      >
        {isSupabaseConfigured && (
          <div className="mb-4 rounded-xl border border-neutral-700 bg-neutral-900 p-3 text-xs leading-relaxed text-neutral-400">
            Staff sign-in accounts must first be created or invited in Supabase Auth. After that, refresh this page to assign the library role. This form will not create a fake browser-only account.
          </div>
        )}
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g. Mr. Kithsiri Perera"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="kithsiri.p@rahulacollege.lk"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Role
              </label>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
              >
                <option value="librarian">Chief Librarian</option>
                <option value="assistant_librarian">Assistant Librarian</option>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Designation
              </label>
              <input
                type="text"
                value={userDesignation}
                onChange={(e) => setUserDesignation(e.target.value)}
                placeholder="Assistant Librarian"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddUserModalOpen(false)}
              className="px-4 py-2 font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold text-white bg-maroon-800 hover:bg-maroon-900 rounded-xl shadow-card transition"
            >
              Add staff member
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
