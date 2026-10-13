import React, { useState } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { UserRole } from '../../types';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
} from 'lucide-react';

interface LoginViewProps {
  onBackToPortals?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onBackToPortals }) => {
  const {
    loginWithCredentials,
    registerUser,
    resetPassword,
    completeSetupWizard,
  } = useLibrary();

  // Active Auth Tab: 'login' | 'signup' | 'setup_wizard' | 'forgot_password'
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'setup_wizard' | 'forgot_password'>('login');

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sign Up Form State
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPass, setSignupConfirmPass] = useState('');
  const [signupRole, setSignupRole] = useState<UserRole>('student');
  const [signupGrade, setSignupGrade] = useState('Grade 12');
  const [signupAdmissionNo, setSignupAdmissionNo] = useState('');
  const [signupError, setSignupError] = useState('');

  // Setup Wizard State
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [libName, setLibName] = useState('Rahula College Library');

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotResult, setForgotResult] = useState<{ success: boolean; message: string } | null>(null);

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Please enter your email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginWithCredentials(loginEmail, loginPassword, 'staff');
      if (!res.success) {
        setLoginError(res.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Sign Up Submit
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');

    if (!signupName.trim() || !signupEmail.trim() || !signupPassword.trim()) {
      setSignupError('All required fields must be filled.');
      return;
    }

    if (signupPassword.length < 6) {
      setSignupError('Password must be at least 6 characters long.');
      return;
    }

    if (signupPassword !== signupConfirmPass) {
      setSignupError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerUser({
        name: signupName,
        email: signupEmail,
        password: signupPassword,
        role: signupRole,
        admissionNo: signupAdmissionNo || undefined,
        grade: signupRole === 'student' ? signupGrade : undefined,
        designation: signupRole === 'teacher' ? 'Faculty Member' : signupRole === 'librarian' ? 'Librarian' : undefined,
      });

      if (!res.success) {
        setSignupError(res.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Forgot Password Submit
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotResult({ success: false, message: 'Please enter your registered email address.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetPassword(forgotEmail);
      setForgotResult(res);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Wizard Submit
  const handleWizardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim() || !adminEmail.trim() || !adminPass.trim()) {
      alert('Please fill in administrator name, email, and password.');
      return;
    }

    completeSetupWizard({
      adminName,
      adminEmail,
      adminPass,
      libraryName: libName,
      campusAddress: 'Rahula College, Matara',
      phone: '+94 41 222 2398',
      seedCatalog: false,
    });
  };

  return (
    <div className="login-page min-h-screen overflow-x-hidden bg-library-bg text-library-main flex flex-col p-4 sm:p-6 font-body">
      <div className="login-topbar w-full max-w-5xl mx-auto py-2 flex items-center justify-between">
        {onBackToPortals ? (
          <button type="button" onClick={onBackToPortals} className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-library-main hover:text-indigo-700">
            <ArrowLeft className="h-3.5 w-3.5" /> Select portal
          </button>
        ) : (
          <span className="text-xs font-semibold tracking-wide text-library-main">Rahula College</span>
        )}
        <span className="text-xs font-semibold tracking-wide text-neutral-500 hidden sm:block">Matara · Sri Lanka</span>
      </div>

      {/* Main sign-in workspace */}
      <div className="login-layout w-full max-w-5xl mx-auto flex-1 py-8 lg:py-12 grid min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] gap-8 items-start">
        <div className="login-hero relative isolate hidden min-h-[29rem] h-full flex-col justify-between overflow-hidden rounded-3xl border border-library-border bg-library-surface p-9 text-library-main shadow-card lg:flex xl:p-10">
          <div aria-hidden="true" className="absolute inset-0 opacity-[0.45] [background-image:radial-gradient(#E7E5E4_0.7px,transparent_0.7px)] [background-size:20px_20px]" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-700">Library Management System</p><p className="mt-1 text-xs text-slate-500">Rahula College · Matara</p></div>
            </div>
            <p className="mt-10 text-xs font-semibold uppercase tracking-[0.14em] text-library-muted">Your library, in one place</p>
            <h2 className="mt-4 max-w-lg text-4xl font-bold leading-tight tracking-tight xl:text-[2.7rem]">More time for readers. Less time searching.</h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">Keep the collection close at hand, follow loans, and make everyday library work feel easier.</p>
            <div className="relative mt-9 max-w-sm border-l border-library-border pl-4" aria-hidden="true">
              <p className="text-sm font-semibold text-library-main">Made for the people and stories at the heart of a school library.</p>
            </div>
          </div>
        </div>

      <div className="login-card w-full min-w-0 max-w-md lg:max-w-none mx-auto bg-library-surface border border-library-border rounded-3xl shadow-card p-6 sm:p-8 space-y-6 self-start">
        {/* Header Branding */}
        <div className="login-card-header text-center space-y-3">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-neutral-950">
              {authMode === 'login' ? 'Welcome back' : authMode === 'signup' ? 'Join the library' : authMode === 'forgot_password' ? 'Reset your password' : 'Welcome'}
            </h1>
            <p className="text-xs text-neutral-500">
              {authMode === 'login' ? 'Sign in and pick up where you left off.' : authMode === 'signup' ? 'Create an account to get started.' : authMode === 'forgot_password' ? 'We’ll help you get back in.' : 'Rahula College Library'}
            </p>
          </div>
        </div>

        {/* Auth Mode Tabs: Sign In / Create Account */}
        {authMode !== 'setup_wizard' && authMode !== 'forgot_password' && (
          <div className="grid grid-cols-1 p-1 bg-neutral-100 rounded-xl border border-neutral-200 text-xs font-semibold">
            <button
              onClick={() => {
                setAuthMode('login');
                setLoginError('');
              }}
              className={`py-2 rounded-xl transition ${
                authMode === 'login'
                  ? 'bg-library-action text-library-bg shadow-xs font-bold border border-library-border'
                  : 'text-library-muted hover:text-library-main'
              }`}
            >
              Sign In
            </button>
          </div>
        )}

        {/* 1. SIGN IN FORM */}
        {authMode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="login-email" className="block text-xs font-bold text-neutral-700">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@rahulacollege.lk"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-neutral-300 bg-white text-neutral-950 text-xs placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
                <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="block text-xs font-bold text-neutral-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('forgot_password');
                    setForgotResult(null);
                  }}
                  className="text-xs text-neutral-400 hover:text-neutral-950 transition font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-neutral-300 bg-white text-neutral-950 text-xs placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-neutral-500 hover:text-neutral-300 focus:outline-hidden"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-300 text-neutral-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs tracking-wide shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* 2. REGISTRATION FORM */}
        {authMode === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="reg-name" className="block text-xs font-bold text-neutral-700">
                Full Name *
              </label>
              <div className="relative">
                <input
                  id="reg-name"
                  type="text"
                  required
                  placeholder="e.g. Kasun Perera"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-xl border border-neutral-300 bg-white text-neutral-950 text-xs focus:ring-2 focus:ring-indigo-500"
                />
                <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-2.5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-neutral-700">Role</label>
                <select
                  value={signupRole}
                  onChange={(e) => setSignupRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white text-neutral-950 text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="student">Student (ශිෂ්‍ය)</option>
                  <option value="teacher">Teacher (ගුරුභවතා)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-neutral-700">
                  {signupRole === 'student' ? 'Admission No' : 'Staff ID'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. 23456"
                  value={signupAdmissionNo}
                  onChange={(e) => setSignupAdmissionNo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white text-neutral-950 text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="reg-email" className="block text-xs font-bold text-neutral-700">
                Email Address *
              </label>
              <div className="relative">
                <input
                  id="reg-email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-xl border border-neutral-300 bg-white text-neutral-950 text-xs focus:ring-2 focus:ring-indigo-500"
                />
                <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-2.5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-neutral-700">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white text-neutral-950 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-neutral-700">Confirm *</label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter"
                  value={signupConfirmPass}
                  onChange={(e) => setSignupConfirmPass(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white text-neutral-950 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {signupError && (
              <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-300 text-neutral-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{signupError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs tracking-wide shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Registering...' : 'Create Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* 3. FORGOT PASSWORD WORKFLOW */}
        {authMode === 'forgot_password' && (
          <div className="space-y-4">
            <div className="space-y-1 text-center">
              <h2 className="text-sm font-bold text-white">Reset Password</h2>
              <p className="text-xs text-neutral-500">
                Enter your registered email address to receive password recovery instructions.
              </p>
            </div>

            {forgotResult ? (
              <div
                className={`p-4 rounded-2xl border text-xs space-y-3 ${
                  forgotResult.success
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-neutral-100 border-neutral-300 text-neutral-700'
                }`}
              >
                <div className="flex items-start gap-2">
                  {forgotResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                  )}
                  <p className="leading-relaxed">{forgotResult.message}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-100 text-white font-bold text-xs transition"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-neutral-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@rahulacollege.lk"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 bg-white text-neutral-950 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Sending Request...' : 'Send Recovery Instructions'}
                </button>

                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="w-full py-2 text-xs font-semibold text-neutral-400 hover:text-neutral-950 transition"
                >
                  Back to Sign In
                </button>
              </form>
            )}
          </div>
        )}

        {/* 4. Protected setup is intentionally not exposed by the public client. */}
        {authMode === 'setup_wizard' && (
          <div className="space-y-4">
            <div className="space-y-1 text-center">
              <h2 className="text-sm font-bold text-white">Initial System Setup</h2>
              <p className="text-xs text-neutral-500">
                For authorized Chief Librarian / Administrator bootstrap only.
              </p>
            </div>

            <form onSubmit={handleWizardSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Chief Librarian Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. S. P. Jayawardena"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white text-neutral-950 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Administrator Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="administrator email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white text-neutral-950 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Administrator Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Secure master password"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white text-neutral-950 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Library Entity Name
                </label>
                <input
                  type="text"
                  required
                  value={libName}
                  onChange={(e) => setLibName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white text-neutral-950 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="w-1/2 py-2.5 rounded-xl border border-neutral-800 text-neutral-400 hover:text-neutral-950 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold shadow-md transition"
                >
                  Complete Setup
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
      </div>

      {/* Institutional Footer */}
      <div className="login-footer text-center py-4 text-xs text-neutral-500 space-y-1">
        <p>Rahula College Library Management System • Matara, Sri Lanka</p>
      </div>

    </div>
  );
};
