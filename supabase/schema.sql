-- ====================================================================
-- RAHULA COLLEGE LIBRARY MANAGEMENT SYSTEM (LMS)
-- Official PostgreSQL Database Schema for Supabase
-- Target: Supabase Postgres (with Auth & Row Level Security)
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Profiles & Roles (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'librarian', 'assistant_librarian', 'teacher', 'student', 'staff')),
    admission_no TEXT,
    grade TEXT,
    department TEXT,
    phone TEXT,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Categories / DDC Classification
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE,
    name TEXT NOT NULL UNIQUE,
    sinhala_name TEXT,
    description TEXT,
    shelf_location TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Authors Directory
CREATE TABLE IF NOT EXISTS public.authors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    sinhala_name TEXT,
    bio TEXT,
    birth_year INTEGER,
    death_year INTEGER,
    nationality TEXT DEFAULT 'Sri Lankan',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Publishers Directory
CREATE TABLE IF NOT EXISTS public.publishers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    address TEXT,
    city TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Books (Title / Edition Level Metadata)
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    subtitle TEXT,
    author TEXT NOT NULL,
    author_id UUID REFERENCES public.authors(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    category_name TEXT NOT NULL,
    publisher TEXT,
    publisher_id UUID REFERENCES public.publishers(id) ON DELETE SET NULL,
    isbn TEXT,
    ddc_code TEXT,
    publication_year INTEGER,
    edition TEXT DEFAULT '1st Edition',
    language TEXT NOT NULL DEFAULT 'Sinhala' CHECK (language IN ('Sinhala', 'English', 'Tamil', 'Pali')),
    description TEXT,
    shelf_location TEXT,
    section TEXT DEFAULT 'Main Hall',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    cover_url TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    total_copies INTEGER NOT NULL DEFAULT 1,
    available_copies INTEGER NOT NULL DEFAULT 1,
    total_borrows INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Physical Book Copies (Copy Level with Parigahana Ankaya & Barcode)
CREATE TABLE IF NOT EXISTS public.book_copies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    copy_number INTEGER NOT NULL,
    parigahana_ankaya TEXT NOT NULL UNIQUE,
    barcode TEXT NOT NULL UNIQUE,
    shelf_location TEXT,
    condition TEXT NOT NULL DEFAULT 'new' CHECK (condition IN ('new', 'good', 'fair', 'damaged', 'lost')),
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'borrowed', 'reserved', 'maintenance', 'lost', 'damaged')),
    acquisition_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(book_id, copy_number)
);

-- 8. Library Members
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    member_id TEXT NOT NULL UNIQUE,
    admission_no TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('student', 'teacher', 'staff')),
    grade TEXT,
    department TEXT,
    house TEXT,
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

-- 9. Circulation (Issue / Return Transactions)
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
    due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '14 days'),
    return_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'overdue', 'lost')),
    fine_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    fine_status TEXT NOT NULL DEFAULT 'none' CHECK (fine_status IN ('none', 'unpaid', 'paid', 'waived')),
    issued_by UUID REFERENCES auth.users(id),
    received_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Fines Ledger
CREATE TABLE IF NOT EXISTS public.fines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID REFERENCES public.circulation(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL,
    paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'partially_paid', 'waived')),
    reason TEXT NOT NULL DEFAULT 'Overdue book return',
    receipt_no TEXT UNIQUE,
    date_issued DATE NOT NULL DEFAULT CURRENT_DATE,
    date_paid DATE,
    collected_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. Reservations Queue
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Insert Default Primary Settings Row
INSERT INTO public.system_settings (id) VALUES ('primary_settings')
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- PERFORMANCE INDEXES (Optimized for 30,000+ Titles)
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_books_title ON public.books USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_books_author ON public.books(author);
CREATE INDEX IF NOT EXISTS idx_books_category ON public.books(category_name);
CREATE INDEX IF NOT EXISTS idx_books_isbn ON public.books(isbn);
CREATE INDEX IF NOT EXISTS idx_book_copies_parigahana ON public.book_copies(parigahana_ankaya);
CREATE INDEX IF NOT EXISTS idx_book_copies_barcode ON public.book_copies(barcode);
CREATE INDEX IF NOT EXISTS idx_book_copies_status ON public.book_copies(status);
CREATE INDEX IF NOT EXISTS idx_circulation_active ON public.circulation(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_circulation_member ON public.circulation(member_id);
CREATE INDEX IF NOT EXISTS idx_circulation_copy ON public.circulation(copy_id);
CREATE INDEX IF NOT EXISTS idx_members_admission ON public.members(admission_no);
CREATE INDEX IF NOT EXISTS idx_members_name ON public.members(name);
CREATE INDEX IF NOT EXISTS idx_fines_member ON public.fines(member_id);
CREATE INDEX IF NOT EXISTS idx_fines_status ON public.fines(status);

-- Role helpers used by Row Level Security. SECURITY DEFINER avoids recursive
-- profile-table RLS checks; names are schema-qualified and search_path is empty.
CREATE OR REPLACE FUNCTION public.is_library_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.status = 'active'
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
    WHERE p.id = auth.uid()
      AND p.status = 'active'
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
    WHERE p.id = auth.uid()
      AND p.status = 'active'
      AND p.role = 'super_admin'
  );
$$;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circulation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 1. Public / Authenticated read policies for catalog
DROP POLICY IF EXISTS "Public Read Categories" ON public.categories;
DROP POLICY IF EXISTS "Public Read Authors" ON public.authors;
DROP POLICY IF EXISTS "Public Read Publishers" ON public.publishers;
DROP POLICY IF EXISTS "Public Read Books" ON public.books;
DROP POLICY IF EXISTS "Public Read Book Copies" ON public.book_copies;
DROP POLICY IF EXISTS "Public Read System Settings" ON public.system_settings;
CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public Read Authors" ON public.authors FOR SELECT USING (true);
CREATE POLICY "Public Read Publishers" ON public.publishers FOR SELECT USING (true);
CREATE POLICY "Public Read Books" ON public.books FOR SELECT USING (true);
CREATE POLICY "Public Read Book Copies" ON public.book_copies FOR SELECT USING (true);
CREATE POLICY "Public Read System Settings" ON public.system_settings FOR SELECT USING (true);

-- 2. Staff / Admin write policies (Super Admin, Librarian, Assistant Librarian)
DROP POLICY IF EXISTS "Staff Manage Categories" ON public.categories;
DROP POLICY IF EXISTS "Staff Manage Authors" ON public.authors;
DROP POLICY IF EXISTS "Staff Manage Publishers" ON public.publishers;
DROP POLICY IF EXISTS "Staff Manage Books" ON public.books;
DROP POLICY IF EXISTS "Staff Manage Book Copies" ON public.book_copies;
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
CREATE POLICY "Staff Manage Book Copies" ON public.book_copies FOR ALL TO authenticated USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Members" ON public.members FOR ALL TO authenticated USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Circulation" ON public.circulation FOR ALL TO authenticated USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Fines" ON public.fines FOR ALL TO authenticated USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Reservations" ON public.reservations FOR ALL TO authenticated USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Audit Logs" ON public.audit_logs FOR ALL TO authenticated USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Settings" ON public.system_settings FOR ALL TO authenticated USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());

-- Profiles Policies
DROP POLICY IF EXISTS "Users Read Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users Update Own Profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin Manage Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users Create Own Basic Profile" ON public.profiles;
CREATE POLICY "Users Read Profiles" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_library_admin());
DROP POLICY IF EXISTS "Users Read Own Pending Staff Request" ON public.profiles;
CREATE POLICY "Users Read Own Pending Staff Request" ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) AND role = 'staff' AND status = 'pending');
CREATE POLICY "Users Update Own Profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users Create Own Basic Profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id AND role IN ('student', 'teacher') AND status = 'active');
CREATE POLICY "Admin Manage Profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Users Read Own Member Record" ON public.members;
DROP POLICY IF EXISTS "Users Create Own Member Record" ON public.members;
-- Reader logins are not official library memberships. Members remain staff-managed.

-- ====================================================================
-- AUTOMATIC DATABASE TRIGGERS
-- ====================================================================

-- Trigger: When book_copies are inserted/deleted/updated, sync book available_copies and total_copies
CREATE OR REPLACE FUNCTION sync_book_copy_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE public.books
        SET total_copies = (SELECT COUNT(*) FROM public.book_copies WHERE book_id = NEW.book_id),
            available_copies = (SELECT COUNT(*) FROM public.book_copies WHERE book_id = NEW.book_id AND status = 'available'),
            updated_at = timezone('utc'::text, now())
        WHERE id = NEW.book_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.books
        SET total_copies = (SELECT COUNT(*) FROM public.book_copies WHERE book_id = OLD.book_id),
            available_copies = (SELECT COUNT(*) FROM public.book_copies WHERE book_id = OLD.book_id AND status = 'available'),
            updated_at = timezone('utc'::text, now())
        WHERE id = OLD.book_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_book_copy_counts ON public.book_copies;
CREATE TRIGGER trg_sync_book_copy_counts
AFTER INSERT OR UPDATE OR DELETE ON public.book_copies
FOR EACH ROW EXECUTE FUNCTION sync_book_copy_counts();

-- Trigger: Auto-update updated_at timestamp on records
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_books_timestamp BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
CREATE TRIGGER trg_members_timestamp BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
CREATE TRIGGER trg_circulation_timestamp BEFORE UPDATE ON public.circulation FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();


-- Prevent one Auth account from acquiring multiple member rows during retries.
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

-- Prevent users from promoting their own profile or changing its active status.
CREATE OR REPLACE FUNCTION public.guard_profile_privilege_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF OLD.id IS DISTINCT FROM auth.uid() AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only a super administrator may update another profile.';
  END IF;
  IF OLD.id = auth.uid()
     AND (to_jsonb(NEW) - ARRAY['full_name','phone','updated_at','avatar_url'])
         IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['full_name','phone','updated_at','avatar_url']) THEN
    RAISE EXCEPTION 'You may update only your own name, phone number, and profile picture.';
  END IF;
  IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
    IF OLD.id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Profile pictures may only be changed by their owner.';
    END IF;
    IF OLD.status <> 'active'
       OR OLD.role NOT IN ('super_admin', 'librarian', 'assistant_librarian', 'staff') THEN
      RAISE EXCEPTION 'Only an active staff account may change its profile picture.';
    END IF;
    IF NEW.avatar_url IS NOT NULL
       AND NEW.avatar_url IS DISTINCT FROM (OLD.id::text || '/profile-picture') THEN
      RAISE EXCEPTION 'Profile pictures must use the account''s own private storage path.';
    END IF;
  END IF;
  IF OLD.status = 'pending'
     AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status) THEN
    IF OLD.id = auth.uid() THEN RAISE EXCEPTION 'A staff access request cannot approve itself.'; END IF;
    IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Only the super administrator may review a staff access request.'; END IF;
    IF NEW.status = 'active' AND NEW.role NOT IN ('librarian', 'assistant_librarian') THEN
      RAISE EXCEPTION 'A staff request must be approved with an allowed library staff role.';
    END IF;
  END IF;
  IF NEW.role = 'super_admin' AND OLD.role IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Super administrator accounts cannot be created or promoted through profile management.';
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

CREATE OR REPLACE FUNCTION public.approve_pending_staff_signup(p_profile_id UUID, p_assigned_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only the active super administrator may approve staff access requests.';
  END IF;
  IF p_profile_id IS NULL OR p_profile_id = auth.uid() THEN
    RAISE EXCEPTION 'A super administrator cannot approve their own access request.';
  END IF;
  IF p_assigned_role NOT IN ('librarian', 'assistant_librarian') THEN
    RAISE EXCEPTION 'Choose an allowed library staff role.';
  END IF;

  UPDATE public.profiles
  SET role = p_assigned_role, status = 'active', updated_at = timezone('utc'::text, now())
  WHERE id = p_profile_id AND role = 'staff' AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This pending staff request no longer exists or has already been reviewed.';
  END IF;
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.approve_pending_staff_signup(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_pending_staff_signup(UUID, TEXT) TO authenticated;
