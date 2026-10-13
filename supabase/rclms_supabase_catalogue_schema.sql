-- ====================================================================
-- RAHULA COLLEGE LIBRARY MANAGEMENT SYSTEM (RCLMS)
-- Official PostgreSQL Database Schema for Supabase Project: aimxxmgugpaazdrhmqxh
-- Supports: 30,000+ Titles, Multi-Staff Sync, Physical Copies & Full-Text Search
-- LEGACY COMPATIBILITY SCHEMA: current app uses schema.sql and book_copies, not physical_copies.
-- Keep this file only for existing deployments that already use the physical_copies table.
-- ====================================================================

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. User Profiles (Auth-Linked)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('super_admin', 'librarian', 'assistant_librarian', 'teacher', 'student', 'staff')),
    admission_no TEXT,
    grade TEXT,
    department TEXT,
    phone TEXT,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Categories / DDC Divisions
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ddc_code TEXT UNIQUE NOT NULL,
    category_name TEXT UNIQUE NOT NULL,
    sinhala_name TEXT,
    description TEXT,
    shelf_identifier TEXT DEFAULT 'Shelf A-01',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Authors Directory
CREATE TABLE IF NOT EXISTS public.authors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_name TEXT UNIQUE NOT NULL,
    sinhala_name TEXT,
    biography TEXT,
    nationality TEXT DEFAULT 'Sri Lankan',
    birth_year INTEGER,
    death_year INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Publishers & Suppliers
CREATE TABLE IF NOT EXISTS public.publishers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    publisher_name TEXT UNIQUE NOT NULL,
    address TEXT,
    city TEXT DEFAULT 'Matara',
    phone TEXT,
    email TEXT,
    website TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Books (Title-Level Metadata)
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_accession_number TEXT UNIQUE NOT NULL,
    book_title TEXT NOT NULL,
    subtitle TEXT,
    author_name TEXT NOT NULL,
    author_id UUID REFERENCES public.authors(id) ON DELETE SET NULL,
    category_name TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    ddc_code TEXT NOT NULL,
    language_medium TEXT NOT NULL DEFAULT 'Sinhala (සිංහල)',
    publisher TEXT,
    publisher_id UUID REFERENCES public.publishers(id) ON DELETE SET NULL,
    publication_year INTEGER CHECK (publication_year BETWEEN 1000 AND 2100),
    edition TEXT DEFAULT '1st Edition',
    shelf_identifier TEXT DEFAULT 'Shelf A-01',
    synopsis_academic_notes TEXT,
    keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
    total_physical_copies INTEGER NOT NULL DEFAULT 1 CHECK (total_physical_copies >= 0),
    available_physical_copies INTEGER NOT NULL DEFAULT 1 CHECK (available_physical_copies >= 0),
    total_borrows INTEGER NOT NULL DEFAULT 0,
    cover_image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Physical Copies (Item-Level Inventory)
CREATE TABLE IF NOT EXISTS public.physical_copies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    book_accession_number TEXT NOT NULL REFERENCES public.books(book_accession_number) ON UPDATE CASCADE ON DELETE CASCADE,
    copy_number INTEGER NOT NULL,
    copy_barcode TEXT UNIQUE NOT NULL,
    shelf_identifier TEXT,
    condition TEXT NOT NULL DEFAULT 'new' CHECK (condition IN ('new', 'good', 'fair', 'damaged', 'lost')),
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'borrowed', 'reserved', 'maintenance', 'lost', 'damaged')),
    acquisition_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(book_id, copy_number)
);

-- 8. Library Members
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    member_id TEXT UNIQUE NOT NULL,
    admission_no TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('student', 'teacher', 'staff')),
    grade TEXT,
    department TEXT,
    house TEXT DEFAULT 'Rahula',
    email TEXT,
    phone TEXT,
    address TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired')),
    max_borrow_limit INTEGER NOT NULL DEFAULT 3,
    joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '3 years'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Circulation Transactions (Issue / Return)
CREATE TABLE IF NOT EXISTS public.circulation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE RESTRICT,
    copy_id UUID NOT NULL REFERENCES public.physical_copies(id) ON DELETE RESTRICT,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
    book_accession_number TEXT NOT NULL,
    copy_barcode TEXT NOT NULL,
    book_title TEXT NOT NULL,
    member_name TEXT NOT NULL,
    member_admission_no TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '14 days'),
    return_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'overdue', 'lost')),
    fine_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    fine_status TEXT NOT NULL DEFAULT 'none' CHECK (fine_status IN ('none', 'unpaid', 'paid', 'waived')),
    issued_by_name TEXT,
    received_by_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Fines Ledger
CREATE TABLE IF NOT EXISTS public.fines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circulation_id UUID REFERENCES public.circulation(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL,
    paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'partially_paid', 'waived')),
    reason TEXT NOT NULL DEFAULT 'Overdue book return',
    receipt_no TEXT UNIQUE,
    date_issued DATE NOT NULL DEFAULT CURRENT_DATE,
    date_paid DATE,
    collected_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. Reservations Queue
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'fulfilled', 'cancelled', 'expired')),
    request_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expiry_date TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. Audit Trail
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. System Settings
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY DEFAULT 'primary_settings',
    library_name TEXT NOT NULL DEFAULT 'Rahula College Library',
    college_name TEXT NOT NULL DEFAULT 'Rahula College, Matara',
    address TEXT NOT NULL DEFAULT 'Rahula College, Matara, Southern Province, Sri Lanka',
    phone TEXT DEFAULT '+94 41 222 2238',
    email TEXT DEFAULT 'library@rahulacollege.lk',
    default_loan_days_student INTEGER NOT NULL DEFAULT 14,
    default_loan_days_teacher INTEGER NOT NULL DEFAULT 30,
    daily_overdue_fine NUMERIC(6, 2) NOT NULL DEFAULT 5.00,
    max_books_student INTEGER NOT NULL DEFAULT 3,
    max_books_teacher INTEGER NOT NULL DEFAULT 7,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.system_settings (id) VALUES ('primary_settings')
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- PERFORMANCE INDEXES (Optimized for 30,000+ Titles)
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_books_title_search ON public.books USING gin(to_tsvector('english', book_title));
CREATE INDEX IF NOT EXISTS idx_books_author_search ON public.books USING gin(to_tsvector('english', author_name));
CREATE INDEX IF NOT EXISTS idx_books_accession ON public.books(book_accession_number);
CREATE INDEX IF NOT EXISTS idx_books_category ON public.books(category_name);
CREATE INDEX IF NOT EXISTS idx_books_ddc ON public.books(ddc_code);
CREATE INDEX IF NOT EXISTS idx_copies_barcode ON public.physical_copies(copy_barcode);
CREATE INDEX IF NOT EXISTS idx_copies_accession ON public.physical_copies(book_accession_number);
CREATE INDEX IF NOT EXISTS idx_copies_status ON public.physical_copies(status);
CREATE INDEX IF NOT EXISTS idx_circulation_active ON public.circulation(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_circulation_member ON public.circulation(member_id);
CREATE INDEX IF NOT EXISTS idx_circulation_copy ON public.circulation(copy_id);
CREATE INDEX IF NOT EXISTS idx_members_admission ON public.members(admission_no);
CREATE INDEX IF NOT EXISTS idx_members_id ON public.members(member_id);

-- ====================================================================
-- AUTOMATIC TRIGGERS
-- ====================================================================
CREATE OR REPLACE FUNCTION sync_physical_copy_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE public.books
        SET total_physical_copies = (SELECT COUNT(*) FROM public.physical_copies WHERE book_id = NEW.book_id),
            available_physical_copies = (SELECT COUNT(*) FROM public.physical_copies WHERE book_id = NEW.book_id AND status = 'available'),
            updated_at = timezone('utc'::text, now())
        WHERE id = NEW.book_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.books
        SET total_physical_copies = (SELECT COUNT(*) FROM public.physical_copies WHERE book_id = OLD.book_id),
            available_physical_copies = (SELECT COUNT(*) FROM public.physical_copies WHERE book_id = OLD.book_id AND status = 'available'),
            updated_at = timezone('utc'::text, now())
        WHERE id = OLD.book_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_physical_copy_counts ON public.physical_copies;
CREATE TRIGGER trg_sync_physical_copy_counts
AFTER INSERT OR UPDATE OR DELETE ON public.physical_copies
FOR EACH ROW EXECUTE FUNCTION sync_physical_copy_counts();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
CREATE OR REPLACE FUNCTION public.is_library_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = auth.uid() AND p.status = 'active'
      AND p.role IN ('super_admin', 'librarian', 'assistant_librarian')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_library_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = auth.uid() AND p.status = 'active'
      AND p.role IN ('super_admin', 'librarian')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = auth.uid() AND p.status = 'active' AND p.role = 'super_admin'
  );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circulation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Read policies for public catalogue
DROP POLICY IF EXISTS "Public Read Categories" ON public.categories;
DROP POLICY IF EXISTS "Public Read Authors" ON public.authors;
DROP POLICY IF EXISTS "Public Read Publishers" ON public.publishers;
DROP POLICY IF EXISTS "Public Read Books" ON public.books;
DROP POLICY IF EXISTS "Public Read Physical Copies" ON public.physical_copies;
DROP POLICY IF EXISTS "Public Read System Settings" ON public.system_settings;
CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public Read Authors" ON public.authors FOR SELECT USING (true);
CREATE POLICY "Public Read Publishers" ON public.publishers FOR SELECT USING (true);
CREATE POLICY "Public Read Books" ON public.books FOR SELECT USING (true);
CREATE POLICY "Public Read Physical Copies" ON public.physical_copies FOR SELECT USING (true);
CREATE POLICY "Public Read System Settings" ON public.system_settings FOR SELECT USING (true);

-- Manage policies for authenticated users
DROP POLICY IF EXISTS "Staff Manage Categories" ON public.categories;
DROP POLICY IF EXISTS "Staff Manage Authors" ON public.authors;
DROP POLICY IF EXISTS "Staff Manage Publishers" ON public.publishers;
DROP POLICY IF EXISTS "Staff Manage Books" ON public.books;
DROP POLICY IF EXISTS "Staff Manage Physical Copies" ON public.physical_copies;
DROP POLICY IF EXISTS "Staff Manage Members" ON public.members;
DROP POLICY IF EXISTS "Staff Manage Circulation" ON public.circulation;
DROP POLICY IF EXISTS "Staff Manage Fines" ON public.fines;
DROP POLICY IF EXISTS "Staff Manage Reservations" ON public.reservations;
DROP POLICY IF EXISTS "Staff Manage Audit Logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Staff Manage Settings" ON public.system_settings;
CREATE POLICY "Staff Manage Categories" ON public.categories FOR ALL TO authenticated USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Authors" ON public.authors FOR ALL TO authenticated USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Publishers" ON public.publishers FOR ALL TO authenticated USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Books" ON public.books FOR ALL TO authenticated USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Physical Copies" ON public.physical_copies FOR ALL TO authenticated USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Members" ON public.members FOR ALL TO authenticated USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Circulation" ON public.circulation FOR ALL TO authenticated USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Fines" ON public.fines FOR ALL TO authenticated USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Reservations" ON public.reservations FOR ALL TO authenticated USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Audit Logs" ON public.audit_logs FOR ALL TO authenticated USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Settings" ON public.system_settings FOR ALL TO authenticated USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());

DROP POLICY IF EXISTS "Users Read Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users Update Own Profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin Manage Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users Create Own Basic Profile" ON public.profiles;
CREATE POLICY "Users Read Profiles" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_library_admin());
CREATE POLICY "Users Update Own Profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users Create Own Basic Profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id AND role IN ('student', 'teacher') AND status = 'active');
CREATE POLICY "Admin Manage Profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_library_admin()) WITH CHECK (public.is_library_admin());

DROP POLICY IF EXISTS "Users Read Own Member Record" ON public.members;
DROP POLICY IF EXISTS "Users Create Own Member Record" ON public.members;
CREATE POLICY "Users Read Own Member Record" ON public.members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_library_staff());
CREATE POLICY "Users Create Own Member Record" ON public.members FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
  AND type IN ('student', 'teacher')
  AND EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = auth.uid() AND p.status = 'active' AND p.role = public.members.type
  )
);

CREATE OR REPLACE FUNCTION public.guard_profile_privilege_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF OLD.id IS DISTINCT FROM auth.uid() AND NOT public.is_library_admin() THEN
    RAISE EXCEPTION 'Only a library administrator may update another profile.';
  END IF;
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status)
     AND NOT public.is_library_admin() THEN
    RAISE EXCEPTION 'You cannot change your own role or account status.';
  END IF;
  IF (OLD.role = 'super_admin' OR NEW.role = 'super_admin')
     AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only a super administrator may change a super-administrator account.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_profile_privilege_changes ON public.profiles;
CREATE TRIGGER trg_guard_profile_privilege_changes
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privilege_changes();


CREATE OR REPLACE FUNCTION public.guard_single_auth_member()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 1));
  IF EXISTS (
    SELECT 1 FROM public.members AS m
    WHERE m.user_id = NEW.user_id AND m.id IS DISTINCT FROM NEW.id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'This Auth account already has a library member record.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_single_auth_member ON public.members;
CREATE TRIGGER trg_guard_single_auth_member
BEFORE INSERT OR UPDATE OF user_id ON public.members
FOR EACH ROW EXECUTE FUNCTION public.guard_single_auth_member();
