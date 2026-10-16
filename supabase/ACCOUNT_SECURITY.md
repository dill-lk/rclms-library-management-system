# Account security rollout notes

## What this feature does

- Sign-in activity is presented per account; account-session UUIDs remain internal only for revoking access.
- Only sign-ins with an active account and a heartbeat in the last two minutes appear in the server-filtered online list. Stale/offline and signed-out sign-ins leave that list but remain in the most-recent-100 history view; the migration does not delete session rows.
- The migration drops previously stored device name, browser, platform, and user-agent columns. It does not collect IP addresses.
- Staff and readers change their own password from their account page after verifying the current password.
- The active super administrator can reset another account's password, suspend it, and reactivate it. Password resets and status changes end existing library sign-ins. A suspended account is also banned at Supabase Auth until reactivated.
- Account actions are authorized by the Edge Function using the signed-in account's active `super_admin` profile. The service-role key remains server-only.

## Rollout order

1. Review and apply `migrations/20261016_account_based_access_controls.sql`. It deletes stored device/browser metadata and adds the account activity/password-session RPCs.
2. Deploy `functions/manage-library-account/index.ts` as the `manage-library-account` Supabase Edge Function. The hosted function requires the standard `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` server secrets; never put the service-role key in the browser or Vite variables.
3. Deploy the frontend. Its account-session calls require the migration to be live first.

No password, profile status, or existing account was changed as part of preparing these files.

## Supabase API references

- [Auth Admin `updateUserById`](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid) — server-side only; the service-role key must never be exposed in the browser.
- [Auth `updateUser`](https://supabase.com/docs/reference/javascript/auth-updateuser) — signed-in users can update their own password; secure password changes may require a recent sign-in or reauthentication.
- [Auth JS `AdminUserAttributes`](https://supabase.github.io/auth-js/v2/interfaces/AdminUserAttributes.html) — `ban_duration` accepts duration strings with `ns`, `us`/`µs`, `ms`, `s`, `m`, or `h`; `'none'` lifts a ban. This implementation uses `876000h` (100 years) for suspension and `'none'` for reactivation.
