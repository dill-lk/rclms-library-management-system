BEGIN;

-- Stop assigning a House silently to future official member records.
-- Existing House values remain unchanged for historical records.
ALTER TABLE public.members ALTER COLUMN house DROP DEFAULT;
COMMENT ON COLUMN public.members.house IS 'Legacy House values retained for historical records; not collected by the application.';

COMMIT;
