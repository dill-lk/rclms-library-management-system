import React, { useState } from 'react';
import { ArrowRight, BookOpen, GraduationCap, ShieldCheck } from 'lucide-react';
import { LoginView } from './LoginView';
import { BorrowerLoginView } from './BorrowerLoginView';
import { SiteAttribution } from '../common/SiteAttribution';

type Portal = 'borrower' | 'staff';

export const AuthGateway: React.FC = () => {
  const [portal, setPortal] = useState<Portal | null>(null);

  if (portal === 'borrower') {
    return <BorrowerLoginView onBackToPortals={() => setPortal(null)} />;
  }

  if (portal === 'staff') {
    return <LoginView onBackToPortals={() => setPortal(null)} />;
  }

  return (
    <main className="min-h-screen bg-[#f5f2ed] px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col">
        <header className="flex items-center gap-3">
          <img src="/logo.png" alt="Rahula College crest" className="h-12 w-10 object-contain" />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6f1932]">Rahula College</p>
            <p className="mt-0.5 text-xs text-slate-500">Library · Matara</p>
          </div>
        </header>

        <section className="flex flex-1 flex-col justify-center py-12">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8e6a35]">Library access</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Choose your library portal</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
              Students and teachers have a simple reader space. Library staff use the separate management workspace.
            </p>
          </div>

          <div className="mx-auto grid w-full max-w-3xl gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setPortal('borrower')}
              className="group rounded-3xl border border-[#e7d9c9] bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#7d1d39] hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#7d1d39]/15 sm:p-8"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f6e9df] text-[#7d1d39]">
                <BookOpen className="h-6 w-6" />
              </span>
              <span className="mt-6 flex items-center justify-between gap-4">
                <span>
                  <span className="block text-lg font-bold">Student & teacher</span>
                  <span className="mt-1 block text-xs font-medium text-[#7d1d39]">Reader portal</span>
                </span>
                <ArrowRight className="h-5 w-5 text-[#7d1d39] transition group-hover:translate-x-1" />
              </span>
              <span className="mt-4 block text-sm leading-6 text-slate-600">
                Browse the catalogue and view your own library account in a focused, read-only space.
              </span>
              <span className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                <GraduationCap className="h-4 w-4" /> Student or teacher account
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPortal('staff')}
              className="group rounded-3xl border border-slate-200 bg-[#172638] p-6 text-left text-white shadow-sm transition hover:-translate-y-1 hover:border-[#c3a66b] hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#c3a66b]/20 sm:p-8"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#e8cf91]">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <span className="mt-6 flex items-center justify-between gap-4">
                <span>
                  <span className="block text-lg font-bold">Staff & admin</span>
                  <span className="mt-1 block text-xs font-medium text-[#e8cf91]">Management workspace</span>
                </span>
                <ArrowRight className="h-5 w-5 text-[#e8cf91] transition group-hover:translate-x-1" />
              </span>
              <span className="mt-4 block text-sm leading-6 text-slate-300">
                Sign in to the existing library operations workspace. Staff access remains administrator-managed.
              </span>
              <span className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-400">
                <ShieldCheck className="h-4 w-4" /> Authorized library staff
              </span>
            </button>
          </div>
        </section>

        <footer className="flex flex-col items-center gap-1 text-center text-xs text-slate-500">
          <span>Rahula College Library Management System · Matara, Sri Lanka</span>
          <SiteAttribution />
        </footer>
      </div>
    </main>
  );
};
