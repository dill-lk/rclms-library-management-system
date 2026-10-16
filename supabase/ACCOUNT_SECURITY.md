# Account security rollout notes

## What this feature does

- Sign-in activity is presented per account; account-session UUIDs remain internal only for revoking access.
- Only sign-ins with an active account and a heartbeat in the last two minutes appear in the server-filtered online list. Stale/offline and signed-out sign-ins leave that list but remain in the most-recent-100 history view; the migration does not delete session rows.
- The migration drops previously stored device name, browser, platform, and user-agent columns. It does not collect IP addresses.
- Staff and readers change their own password from their account page after verifying the current password.
- The active super administrator can reset another non-pending account's password, pause/suspend it, and reactivate it. Password resets attempt to end existing library sign-ins; suspension refuses the status change if session cleanup fails, then bans the account at Supabase Auth until reactivated.
- Account-management actions are authorized by the Edge Function using the signed-in account's active `super_admin` profile. Profile RLS and its trigger also prevent librarians from changing other accounts directly. The service-role key remains server-only.
- Staff can upload a JPEG, PNG, or WebP profile picture up to 2 MB. Pictures are stored in a private bucket at a fixed per-user path; storage RLS restricts upload, replacement, and signed reads to that account's active library sign-in. The profile page refreshes 15-minute signed URLs every 10 minutes; a signed link remains usable by whoever holds it until it expires.

## Rollout order

1. Review and apply `migrations/20261016_account_based_access_controls.sql`. It deletes stored device/browser metadata and adds the account activity/password-session RPCs.
2. Apply `migrations/20261016_private_staff_profile_pictures_and_superadmin_controls.sql`. It removes the permissive profile-update policy, installs active-super-admin/self-only profile rules, and creates the private profile-picture bucket and object policies. It does not modify existing profile or session rows.
3. Deploy the updated `functions/manage-library-account/index.ts` as the `manage-library-account` Supabase Edge Function. The hosted function requires the standard `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` server secrets; never put the service-role key in the browser or Vite variables.
4. Deploy the frontend after both migrations and the Edge Function are live.

No password, profile status, or existing account was changed as part of preparing these files.

## Supabase API references

- [Auth Admin `updateUserById`](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid) — server-side only; the service-role key must never be exposed in the browser.
- [Auth `updateUser`](https://supabase.com/docs/reference/javascript/auth-updateuser) — signed-in users can update their own password; secure password changes may require a recent sign-in or reauthentication.
- [Auth JS `AdminUserAttributes`](https://supabase.github.io/auth-js/v2/interfaces/AdminUserAttributes.html) — `ban_duration` accepts duration strings with `ns`, `us`/`µs`, `ms`, `s`, `m`, or `h`; `'none'` lifts a ban. This implementation uses `876000h` (100 years) for suspension and `'none'` for reactivation.
- [Storage access control](https://supabase.com/docs/guides/storage/security/access-control) — private object access is controlled with policies on `storage.objects`.
- [Storage downloads and signed URLs](https://supabase.com/docs/guides/storage/serving/downloads) — private objects can be served through expiring signed URLs.
- Storage upserts require `SELECT` and `UPDATE` policies in addition to `INSERT`; the private-avatar policies scope all three operations to the exact account-owned path.
