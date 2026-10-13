import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Mail,
  UserRound,
} from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import type { UserRole } from '../../types';

interface BorrowerLoginViewProps {
  onBackToPortals: () => void;
}

type BorrowerMode = 'login' | 'register' | 'forgot';

export const BorrowerLoginView: React.FC<BorrowerLoginViewProps> = ({ onBackToPortals }) => {
  const { loginWithCredentials, registerUser, resetPassword } = useLibrary();
  const [mode, setMode] = useState<BorrowerMode>('login');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [admissionNo, setAdmissionNo] = useState('');
  const [grade, setGrade] = useState('Grade 12');
  const [department, setDepartment] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    if (!email.trim() || !password) {
      setMessage({ success: false, text: 'Enter your email address and password.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await loginWithCredentials(email, password, 'borrower');
      if (!result.success) setMessage({ success: false, text: result.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    if (!fullName.trim() || !email.trim() || !password) {
      setMessage({ success: false, text: 'Complete all required fields.' });
      return;
    }
    if (password.length < 6) {
      setMessage({ success: false, text: 'Use a password with at least 6 characters.' });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ success: false, text: 'The passwords do not match.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registerUser({
        name: fullName.trim(),
        email: email.trim(),
        password,
        role: role as UserRole,
        admissionNo: admissionNo.trim() || undefined,
        grade: role === 'student' ? grade : undefined,
        designation: role === 'teacher' ? department.trim() || 'Teacher' : undefined,
      });
      if (!result.success) setMessage({ success: false, text: result.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await resetPassword(email);
      setMessage({ success: result.success, text: result.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Join the library' : 'Reset your password';
  const description = mode === 'login'
    ? 'Sign in to browse books and your library account.'
    : mode === 'register'
      ? 'Create a student or teacher reader account.'
      : 'We’ll send recovery instructions if an account matches.';

  return (
    <main className="min-h-screen bg-[#f5f2ed] px-4 py-6 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackToPortals}
            className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-[#6e1731]"
          >
            <ArrowLeft className="h-4 w-4" /> Choose a portal
          </button>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Rahula College crest" className="h-10 w-8 object-contain" />
            <div className="hidden text-right sm:block">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6e1731]">Rahula College</p>
              <p className="text-[10px] text-slate-500">Reader portal</p>
            </div>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)] lg:gap-14">
          <section className="hidden rounded-[2rem] bg-[#172638] p-10 text-white shadow-xl lg:flex lg:min-h-[34rem] lg:flex-col lg:justify-between">
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-[#e8cf91]">
                <BookOpen className="h-7 w-7" />
              </div>
              <p className="mt-10 text-xs font-bold uppercase tracking-[0.2em] text-[#e8cf91]">A space for readers</p>
              <h1 className="mt-4 max-w-md text-4xl font-bold leading-tight">Find your next good read.</h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
                Search the Rahula College Library catalogue and keep your account details close at hand.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <GraduationCap className="h-5 w-5 text-[#e8cf91]" />
                <p className="mt-3 text-sm font-semibold">For students</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">Explore books for every subject and interest.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <BookOpen className="h-5 w-5 text-[#e8cf91]" />
                <p className="mt-3 text-sm font-semibold">For teachers</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">Browse resources from a focused reader space.</p>
              </div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-md rounded-3xl border border-[#e7d9c9] bg-white p-6 shadow-lg sm:p-8">
            <div className="mb-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8e6a35]">Student & teacher access</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </div>

            {mode !== 'forgot' && (
              <div className="mb-6 grid grid-cols-2 rounded-2xl bg-[#f5f2ed] p-1">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setMessage(null); }}
                  className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition ${mode === 'login' ? 'bg-white text-[#6e1731] shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >Sign in</button>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setMessage(null); }}
                  className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition ${mode === 'register' ? 'bg-white text-[#6e1731] shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >Create account</button>
              </div>
            )}

            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <label className="block text-xs font-semibold text-slate-700">
                  Email address
                  <span className="relative mt-1.5 block">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email" required autoComplete="email" value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@rahulacollege.lk"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none transition focus:border-[#7d1d39] focus:ring-4 focus:ring-[#7d1d39]/10"
                    />
                  </span>
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                  <span className="relative mt-1.5 block">
                    <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={password}
                      onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-11 text-sm outline-none transition focus:border-[#7d1d39] focus:ring-4 focus:ring-[#7d1d39]/10"
                    />
                    <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </span>
                </label>
                {message && <MessageBox success={message.success} text={message.text} />}
                <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6e1731] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#521127] disabled:opacity-60">
                  {isSubmitting ? 'Signing in…' : 'Sign in to my library'} <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => { setMode('forgot'); setMessage(null); }} className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-[#6e1731]">Forgot password?</button>
              </form>
            )}

            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Account type
                  <select value={role} onChange={(event) => setRole(event.target.value as 'student' | 'teacher')} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#7d1d39] focus:ring-4 focus:ring-[#7d1d39]/10">
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Full name
                  <span className="relative mt-1.5 block">
                    <UserRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input type="text" required autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your name" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-[#7d1d39] focus:ring-4 focus:ring-[#7d1d39]/10" />
                  </span>
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Email address
                  <span className="relative mt-1.5 block">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@rahulacollege.lk" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-[#7d1d39] focus:ring-4 focus:ring-[#7d1d39]/10" />
                  </span>
                </label>
                {role === 'student' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-xs font-semibold text-slate-700">Admission number<input type="text" value={admissionNo} onChange={(event) => setAdmissionNo(event.target.value)} placeholder="Optional" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#7d1d39] focus:ring-4 focus:ring-[#7d1d39]/10" /></label>
                    <label className="block text-xs font-semibold text-slate-700">Grade<select value={grade} onChange={(event) => setGrade(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#7d1d39] focus:ring-4 focus:ring-[#7d1d39]/10">{Array.from({ length: 8 }, (_, index) => `Grade ${index + 6}`).map((item) => <option key={item}>{item}</option>)}</select></label>
                  </div>
                ) : (
                  <label className="block text-xs font-semibold text-slate-700">Department or staff ID<input type="text" value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Optional" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#7d1d39] focus:ring-4 focus:ring-[#7d1d39]/10" /></label>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs font-semibold text-slate-700">Password<input type="password" required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#7d1d39] focus:ring-4 focus:ring-[#7d1d39]/10" /></label>
                  <label className="block text-xs font-semibold text-slate-700">Confirm password<input type="password" required autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat password" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#7d1d39] focus:ring-4 focus:ring-[#7d1d39]/10" /></label>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs leading-5 text-emerald-900">
                  Your student or teacher account is ready to use after registration; email confirmation is not required.
                </div>
                {message && <MessageBox success={message.success} text={message.text} />}
                <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6e1731] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#521127] disabled:opacity-60">
                  {isSubmitting ? 'Creating account…' : 'Create reader account'} <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={handleReset} className="space-y-4">
                <label className="block text-xs font-semibold text-slate-700">Email address<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#7d1d39] focus:ring-4 focus:ring-[#7d1d39]/10" /></label>
                {message && <MessageBox success={message.success} text={message.text} />}
                <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-[#6e1731] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#521127] disabled:opacity-60">{isSubmitting ? 'Sending…' : 'Send recovery instructions'}</button>
                <button type="button" onClick={() => { setMode('login'); setMessage(null); }} className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-[#6e1731]">Back to sign in</button>
              </form>
            )}
          </section>
        </div>

        <footer className="text-center text-xs text-slate-500">Rahula College Library Management System · Matara, Sri Lanka</footer>
      </div>
    </main>
  );
};

const MessageBox: React.FC<{ success: boolean; text: string }> = ({ success, text }) => (
  <div role="status" aria-live="polite" className={`flex items-start gap-2 rounded-xl border px-3.5 py-3 text-xs leading-5 ${success ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
    {success ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
    <span>{text}</span>
  </div>
);
