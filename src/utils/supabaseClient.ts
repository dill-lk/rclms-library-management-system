import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variable defaults or local storage overrides
const ENV_SUPABASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  'https://aimxxmgugpaazdrhmqxh.supabase.co';
const ENV_SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpbXh4bWd1Z3BhYXpkcmhtcXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MjQ0MjcsImV4cCI6MjEwNzAwMDQyN30.sNoPD3z0RkTYngU8iiXdrkZ0BDExvW9vy_6J7aEFzvo';

const STORAGE_KEY_URL = 'rahula_lms_supabase_url';
const STORAGE_KEY_KEY = 'rahula_lms_supabase_anon_key';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

export const getStoredSupabaseConfig = (): SupabaseConfig => {
  const localUrl = localStorage.getItem(STORAGE_KEY_URL) || ENV_SUPABASE_URL;
  const localKey = localStorage.getItem(STORAGE_KEY_KEY) || ENV_SUPABASE_ANON_KEY;
  const isConfigured = Boolean(localUrl && localKey && localUrl.startsWith('https://'));
  return {
    url: localUrl,
    anonKey: localKey,
    isConfigured,
  };
};

export const saveSupabaseConfig = (url: string, anonKey: string): void => {
  if (url) localStorage.setItem(STORAGE_KEY_URL, url.trim());
  else localStorage.removeItem(STORAGE_KEY_URL);

  if (anonKey) localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  else localStorage.removeItem(STORAGE_KEY_KEY);

  // Reset singleton client
  cachedClient = null;
};

export const clearSupabaseConfig = (): void => {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_KEY);
  cachedClient = null;
};

let cachedClient: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (cachedClient) return cachedClient;

  const config = getStoredSupabaseConfig();
  if (!config.isConfigured) return null;

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
};

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  tablesFound?: string[];
  missingTables?: string[];
}

export const testSupabaseConnection = async (
  testUrl?: string,
  testKey?: string
): Promise<ConnectionTestResult> => {
  const url = testUrl || getStoredSupabaseConfig().url;
  const key = testKey || getStoredSupabaseConfig().anonKey;

  if (!url || !key) {
    return {
      success: false,
      message: 'Supabase URL and Anon Key are required.',
    };
  }

  if (!url.startsWith('https://')) {
    return {
      success: false,
      message: 'Supabase URL must start with https:// (e.g. https://your-project.supabase.co)',
    };
  }

  const startTime = performance.now();
  try {
    const client = createClient(url, key, {
      auth: { persistSession: false },
    });

    // Probe standard tables
    const expectedTables = ['books', 'book_copies', 'members', 'circulation', 'categories', 'authors', 'publishers'];
    const foundTables: string[] = [];
    const missingTables: string[] = [];

    // Probe books table
    const { data: booksData, error: booksErr } = await client
      .from('books')
      .select('id')
      .limit(1);

    if (!booksErr) {
      foundTables.push('books');
    } else if (booksErr.code === '42P01') {
      // Relation does not exist
      missingTables.push('books');
    }

    // Probe members table
    const { error: membersErr } = await client
      .from('members')
      .select('id')
      .limit(1);

    if (!membersErr) foundTables.push('members');
    else if (membersErr.code === '42P01') missingTables.push('members');

    // Probe circulation table
    const { error: circErr } = await client
      .from('circulation')
      .select('id')
      .limit(1);

    if (!circErr) foundTables.push('circulation');
    else if (circErr.code === '42P01') missingTables.push('circulation');

    const latencyMs = Math.round(performance.now() - startTime);

    if (foundTables.length > 0) {
      return {
        success: true,
        message: `Successfully connected to Supabase in ${latencyMs}ms! Schema tables verified.`,
        latencyMs,
        tablesFound: foundTables,
        missingTables,
      };
    } else if (missingTables.length > 0) {
      return {
        success: true,
        message: `Connected to Supabase project in ${latencyMs}ms, but database tables are not yet created. Please run the SQL schema script in Supabase SQL Editor.`,
        latencyMs,
        tablesFound: [],
        missingTables: expectedTables,
      };
    } else {
      // General auth or endpoint reachable
      return {
        success: true,
        message: `Connected to Supabase endpoint in ${latencyMs}ms.`,
        latencyMs,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to reach Supabase project. Check URL and API key.',
    };
  }
};
