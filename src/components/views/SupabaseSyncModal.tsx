import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink,
  Shield,
  Key,
  Server,
  Cloud,
  X,
  UploadCloud,
  DownloadCloud,
} from 'lucide-react';
import {
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  ConnectionTestResult,
  getSupabase,
} from '../../utils/supabaseClient';
import { useLibrary } from '../../context/LibraryContext';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({ isOpen, onClose }) => {
  const {
    books,
    members,
    circulation,
    categories,
    authors,
    publishers,
    fines,
    settings,
    addToast,
    refreshAllData,
  } = useLibrary();

  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'connect' | 'schema' | 'sync'>('connect');
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const config = getStoredSupabaseConfig();
      setUrl(config.url);
      setAnonKey(config.anonKey);
      if (config.isConfigured) {
        handleTestConnection(config.url, config.anonKey);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async (testUrl?: string, testKey?: string) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testSupabaseConnection(testUrl || url, testKey || anonKey);
      setTestResult(result);
      if (result.success) {
        addToast({
          type: 'success',
          title: 'Supabase Connected',
          message: result.message,
        });
      } else {
        addToast({
          type: 'error',
          title: 'Connection Failed',
          message: result.message,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Unknown network error.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      addToast({
        type: 'warning',
        title: 'Missing Credentials',
        message: 'Please provide both Supabase URL and Anon Key.',
      });
      return;
    }

    saveSupabaseConfig(url, anonKey);
    await handleTestConnection(url, anonKey);
    addToast({
      type: 'success',
      title: 'Configuration Saved',
      message: 'Supabase settings saved to client environment.',
    });
  };

  const handleDisconnect = () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setTestResult(null);
    addToast({
      type: 'info',
      title: 'Supabase Disconnected',
      message: 'System reverted to local high-performance storage mode.',
    });
  };

  // Push local data up to Supabase
  const handlePushToCloud = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      addToast({
        type: 'error',
        title: 'Supabase Not Connected',
        message: 'Please save valid Supabase credentials first.',
      });
      return;
    }

    setIsSyncing(true);
    try {
      // 1. Sync Categories
      if (categories.length > 0) {
        for (const cat of categories) {
          await supabase.from('categories').upsert(
            {
              name: cat.name,
              code: cat.ddcCode,
              sinhala_name: cat.sinhalaName,
              description: cat.description,
              shelf_location: cat.shelfLocation,
            },
            { onConflict: 'name' }
          );
        }
      }

      // 2. Sync Authors
      if (authors.length > 0) {
        for (const aut of authors) {
          await supabase.from('authors').upsert(
            {
              name: aut.name,
              bio: aut.biography,
              nationality: aut.nationality,
            },
            { onConflict: 'name' }
          );
        }
      }

      // 3. Sync Publishers
      if (publishers.length > 0) {
        for (const pub of publishers) {
          await supabase.from('publishers').upsert(
            {
              name: pub.name,
              address: pub.address,
              city: pub.city,
              phone: pub.phone,
              email: pub.email,
              is_verified: pub.isVerified,
            },
            { onConflict: 'name' }
          );
        }
      }

      // 4. Sync Books & Copies
      if (books.length > 0) {
        for (const bk of books) {
          const { data: bookRecord, error: bkErr } = await supabase
            .from('books')
            .upsert(
              {
                title: bk.title,
                subtitle: bk.subtitle,
                author: bk.author,
                category_name: bk.category,
                publisher: bk.publisher,
                isbn: bk.isbn,
                publication_year: bk.publicationYear,
                edition: bk.edition,
                language: bk.language,
                description: bk.description,
                shelf_location: bk.shelfLocation,
                section: bk.section,
                tags: bk.tags,
                total_copies: bk.totalCopies,
                available_copies: bk.availableCopies,
              },
              { onConflict: 'title' }
            )
            .select()
            .single();

          if (bookRecord && bk.copies) {
            for (const cp of bk.copies) {
              await supabase.from('book_copies').upsert(
                {
                  book_id: bookRecord.id,
                  copy_number: cp.copyNumber,
                  parigahana_ankaya: cp.barcode,
                  barcode: cp.barcode,
                  shelf_location: cp.shelfLocation || bk.shelfLocation,
                  condition: cp.condition || 'good',
                  status: cp.status || 'available',
                },
                { onConflict: 'parigahana_ankaya' }
              );
            }
          }
        }
      }

      // 5. Sync Members
      if (members.length > 0) {
        for (const mem of members) {
          await supabase.from('members').upsert(
            {
              member_id: mem.memberId,
              admission_no: mem.admissionNo,
              name: mem.name,
              type: mem.type,
              grade: mem.grade,
              department: mem.department,
              house: mem.house,
              email: mem.email,
              phone: mem.phone,
              address: mem.address,
              status: mem.status,
              max_borrow_limit: mem.maxBorrowLimit,
            },
            { onConflict: 'admission_no' }
          );
        }
      }

      addToast({
        type: 'success',
        title: 'Sync to Cloud Successful',
        message: `Successfully synchronized catalogue, members, and authors to Supabase Postgres!`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Sync Error',
        message: err.message || 'Failed to sync data to Supabase.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const schemaSqlSample = `-- ====================================================================
-- RAHULA COLLEGE LIBRARY MANAGEMENT SYSTEM (LMS)
-- Official PostgreSQL Database Schema for Supabase
-- Target: Supabase Postgres (with Auth & Row Level Security)
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User Profiles & Roles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'librarian', 'assistant_librarian', 'teacher', 'student', 'staff')),
    admission_no TEXT,
    grade TEXT,
    department TEXT,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Categories / DDC Classification
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE,
    name TEXT NOT NULL UNIQUE,
    sinhala_name TEXT,
    description TEXT,
    shelf_location TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Authors
CREATE TABLE IF NOT EXISTS public.authors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    sinhala_name TEXT,
    bio TEXT,
    nationality TEXT DEFAULT 'Sri Lankan',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Publishers
CREATE TABLE IF NOT EXISTS public.publishers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    address TEXT,
    city TEXT,
    phone TEXT,
    email TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Books (Title Level)
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    subtitle TEXT,
    author TEXT NOT NULL,
    category_name TEXT NOT NULL,
    publisher TEXT,
    isbn TEXT,
    publication_year INTEGER,
    edition TEXT DEFAULT '1st Edition',
    language TEXT NOT NULL DEFAULT 'Sinhala',
    description TEXT,
    shelf_location TEXT,
    section TEXT DEFAULT '',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    total_copies INTEGER NOT NULL DEFAULT 1,
    available_copies INTEGER NOT NULL DEFAULT 1,
    total_borrows INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Physical Book Copies (Copy Level with Accession number & Barcode)
CREATE TABLE IF NOT EXISTS public.book_copies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    copy_number INTEGER NOT NULL,
    parigahana_ankaya TEXT NOT NULL UNIQUE,
    barcode TEXT NOT NULL UNIQUE,
    shelf_location TEXT,
    condition TEXT NOT NULL DEFAULT 'new',
    status TEXT NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(book_id, copy_number)
);

-- 7. Members
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id TEXT NOT NULL UNIQUE,
    admission_no TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('student', 'teacher', 'staff')),
    grade TEXT,
    department TEXT,
    house TEXT DEFAULT 'Rahula',
    email TEXT,
    phone TEXT,
    address TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    max_borrow_limit INTEGER NOT NULL DEFAULT 3,
    joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Circulation Transactions
CREATE TABLE IF NOT EXISTS public.circulation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE RESTRICT,
    copy_id UUID NOT NULL REFERENCES public.book_copies(id) ON DELETE RESTRICT,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
    parigahana_ankaya TEXT NOT NULL,
    book_title TEXT NOT NULL,
    member_name TEXT NOT NULL,
    member_admission_no TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    return_date DATE,
    status TEXT NOT NULL DEFAULT 'active',
    fine_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Fines Ledger
CREATE TABLE IF NOT EXISTS public.fines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID REFERENCES public.circulation(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL,
    paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'unpaid',
    reason TEXT NOT NULL DEFAULT 'Overdue book return',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS and add basic policies
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circulation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public Read Books" ON public.books FOR SELECT USING (true);
CREATE POLICY "Public Read Book Copies" ON public.book_copies FOR SELECT USING (true);
CREATE POLICY "Public Read Members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Staff Manage Books" ON public.books FOR ALL USING (true);
CREATE POLICY "Staff Manage Book Copies" ON public.book_copies FOR ALL USING (true);
CREATE POLICY "Staff Manage Members" ON public.members FOR ALL USING (true);
CREATE POLICY "Staff Manage Circulation" ON public.circulation FOR ALL USING (true);
`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(schemaSqlSample);
    setCopiedSql(true);
    addToast({
      type: 'info',
      title: 'SQL Schema Copied',
      message: 'Paste into Supabase SQL Editor and click Run.',
    });
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#14171F] rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-950/60 border border-red-800/40 flex items-center justify-center text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <span>Supabase PostgreSQL Cloud Backend</span>
                {testResult?.success ? (
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Live Connected
                  </span>
                ) : (
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Local IndexedDB Mode
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Connect your official Rahula College Supabase project for multi-staff synchronization.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-neutral-200 dark:border-neutral-800 flex gap-4 text-xs font-semibold bg-white dark:bg-[#14171F]">
          <button
            onClick={() => setActiveTab('connect')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'connect'
                ? 'border-red-800 text-red-700 dark:text-red-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Connection Credentials</span>
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'schema'
                ? 'border-red-800 text-red-700 dark:text-red-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>PostgreSQL Schema SQL</span>
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'sync'
                ? 'border-red-800 text-red-700 dark:text-red-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Cloud Synchronization</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'connect' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
                  <Shield className="w-4 h-4 text-amber-500" />
                  <span>How to get your Supabase Credentials:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-neutral-500 dark:text-neutral-400">
                  <li>Create a free or institutional project at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-red-700 dark:text-red-400 underline font-medium">supabase.com</a>.</li>
                  <li>Go to <strong>Project Settings → API</strong>.</li>
                  <li>Copy your <strong>Project URL</strong> and <strong>anon / public Key</strong>.</li>
                  <li>Run the schema in the <strong>PostgreSQL Schema SQL</strong> tab inside your Supabase SQL Editor.</li>
                </ol>
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Supabase Project URL *
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      required
                      placeholder="https://your-project-id.supabase.co"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-mono text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-800"
                    />
                    <Server className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Supabase Anon / Public API Key *
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={anonKey}
                      onChange={(e) => setAnonKey(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-mono text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-800"
                    />
                    <Key className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  </div>
                </div>

                {testResult && (
                  <div
                    className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
                      testResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-semibold">{testResult.message}</p>
                      {testResult.latencyMs && (
                        <p className="text-[10px] font-mono opacity-80">
                          Ping latency: {testResult.latencyMs}ms
                        </p>
                      )}
                      {testResult.missingTables && testResult.missingTables.length > 0 && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                          Missing tables: {testResult.missingTables.join(', ')}. Go to the "PostgreSQL Schema SQL" tab and run the script in Supabase.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTestConnection()}
                      disabled={isTesting || !url || !anonKey}
                      className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200 transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                      <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                    </button>

                    {testResult?.success && (
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        className="px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white text-xs font-bold shadow-md transition"
                  >
                    Save & Apply Credentials
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'schema' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-white">
                    PostgreSQL 15+ Schema Script (DDL)
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Copy and run this in your Supabase SQL Editor to provision tables, triggers, and RLS policies.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="https://supabase.com/dashboard/project/_/sql"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Supabase SQL Editor</span>
                  </a>

                  <button
                    onClick={handleCopySql}
                    className="px-4 py-1.5 rounded-xl bg-red-800 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL'}</span>
                  </button>
                </div>
              </div>

              <div className="relative rounded-2xl bg-neutral-900 text-neutral-100 p-4 font-mono text-[11px] max-h-96 overflow-y-auto border border-neutral-800 leading-relaxed">
                <pre>{schemaSqlSample}</pre>
              </div>
            </div>
          )}

          {activeTab === 'sync' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Push to Cloud */}
                <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-white">Push Local Data to Supabase</h4>
                      <p className="text-[10px] text-neutral-500">Upload books, members, and authors</p>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    Uploads {books.length} book titles, {members.length} members, {authors.length} authors, and {categories.length} categories to your Supabase PostgreSQL tables.
                  </p>

                  <button
                    onClick={handlePushToCloud}
                    disabled={isSyncing || !getSupabase()}
                    className="w-full py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <UploadCloud className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                    <span>{isSyncing ? 'Synchronizing...' : 'Push Local Data to Supabase'}</span>
                  </button>
                </div>

                {/* Pull from Cloud */}
                <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      <DownloadCloud className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-white">Fetch Cloud Data</h4>
                      <p className="text-[10px] text-neutral-500">Pull latest records from cloud database</p>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    Pulls all registered books, member records, and loan transactions from Supabase into your active session.
                  </p>

                  <button
                    onClick={async () => {
                      setIsSyncing(true);
                      await refreshAllData();
                      setIsSyncing(false);
                      addToast({
                        type: 'success',
                        title: 'Refreshed from Supabase',
                        message: 'Local session synced with live Supabase database.',
                      });
                    }}
                    disabled={isSyncing || !getSupabase()}
                    className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <DownloadCloud className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                    <span>{isSyncing ? 'Refreshing...' : 'Fetch All from Supabase'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex items-center justify-between text-xs text-neutral-500">
          <span>Rahula College LMS Database Manager</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold hover:bg-neutral-300 dark:hover:bg-neutral-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
