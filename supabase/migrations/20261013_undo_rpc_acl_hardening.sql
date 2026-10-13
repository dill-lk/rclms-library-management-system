BEGIN;
REVOKE ALL ON FUNCTION public.undo_recent_circulation_action(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.undo_recent_circulation_action(UUID, TEXT) TO authenticated;
COMMIT;
