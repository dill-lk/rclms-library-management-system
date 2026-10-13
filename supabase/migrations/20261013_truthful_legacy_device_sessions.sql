-- Replace the generic labels used for Auth sessions backfilled before this
-- browser had supplied device metadata. Preserve the real session IDs,
-- user agents, access status, and first/last-seen timestamps.
BEGIN;

UPDATE public.library_device_sessions
SET device_name = 'Device details unavailable',
    browser = 'Unknown browser',
    platform = 'Unknown platform',
    updated_at = now()
WHERE device_name = 'Previously signed-in device'
   OR browser = 'Existing browser session'
   OR platform = 'Device details will update at next sign-in';

COMMIT;
