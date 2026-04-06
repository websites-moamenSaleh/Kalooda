# Supabase Tokyo → Frankfurt (Issue #70)

This repo targets **Frankfurt** as the primary linked project for `supabase db push` after migration. Tokyo remains available for rollback until decommissioned.

| Project        | Region     | Reference ID           | API host                                      |
|----------------|------------|------------------------|-----------------------------------------------|
| Kalooda (old)  | Tokyo      | `nnciyjfqoggfavfettbm` | `https://nnciyjfqoggfavfettbm.supabase.co`   |
| Kalooda-Frankfurt | `eu-central-1` | `mxbnmoagdufitnwrmsrn` | `https://mxbnmoagdufitnwrmsrn.supabase.co` |

Switch CLI link: `npx supabase link --project-ref <REF> --yes`

## Free-tier quota check

1. **CLI** (linked to a project): `npx supabase inspect db db-stats --linked` — note **Database Size** (stay under ~500 MB per project on Free).
2. **SQL** (SQL Editor): run [supabase/scripts/issue-70-quota-check.sql](../supabase/scripts/issue-70-quota-check.sql).
3. **Dashboard**: confirm org **Storage** and **Egress** vs [billing limits](https://supabase.com/docs/guides/platform/billing-on-supabase).

Decision: if you need **more than two active** Free projects during overlap, pause a non-prod project or upgrade for the migration window.

## Schema: `npm run db push`

Migrations live under [supabase/migrations/](../supabase/migrations/). After linking Frankfurt:

```bash
npx supabase db push
```

### Drift note (`20260405120000`)

[20260405120000_remote_only.sql](../supabase/migrations/20260405120000_remote_only.sql) is a **no-op placeholder** so local history matches Tokyo. If that version applied real DDL in Tokyo, replace the file with the exact SQL from the Supabase Dashboard (Migrations / history) and re-push to Frankfurt.

## Auth dashboard (Frankfurt)

Under **Authentication → URL configuration**:

- **Site URL**: production origin (and staging origin for preview deploys).
- **Redirect URLs** (add each origin you use):
  - `{origin}/auth/callback/customer`
  - `{origin}/auth/callback/admin`
  - `{origin}/auth/callback` (legacy; forwards to customer callback)
  - `{origin}/auth/reset-password`

Copy **OAuth provider** client IDs/secrets and **SMTP** / email templates from Tokyo if you use them.

## Data + Storage copy

With service role keys for **both** projects (never commit them):

```bash
export MIGRATE_SOURCE_URL='https://nnciyjfqoggfavfettbm.supabase.co'
export MIGRATE_SOURCE_SERVICE_ROLE='<tokyo-service-role>'
export MIGRATE_TARGET_URL='https://mxbnmoagdufitnwrmsrn.supabase.co'
export MIGRATE_TARGET_SERVICE_ROLE='<frankfurt-service-role>'
npm run migrate:supabase-region
```

Options: `MIGRATE_SKIP_STORAGE=1` or `MIGRATE_SKIP_AUTH=1` if you only need a subset.

**Auth passwords:** if the Admin API does not return `encrypted_password` for users, the script sets a temporary password — those users should use **Forgot password** once, or re-import via `pg_dump` of `auth` (requires Docker for `supabase db dump` on some CLI versions, or `pg_dump` + connection string).

**Docker:** `supabase db dump` / `pg_restore` may require Docker Desktop locally; use the Node script above when Docker is unavailable.

## Verify row counts

Run [supabase/scripts/issue-70-verify-counts.sql](../supabase/scripts/issue-70-verify-counts.sql) on Tokyo and Frankfurt; all `tbl` rows should match.

## Staging (preview) verification

1. In the hosting provider (e.g. Vercel), set preview environment variables to Frankfurt:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Deploy a preview and run through: sign-up, sign-in, forgot password, catalog images, checkout, admin orders, **Realtime** updates on `orders`, storage-backed images.

`next.config.ts` includes image hostnames for **both** Tokyo and Frankfurt so either project works until Tokyo is retired.

## Production cutover

1. Optional short **write freeze** on Tokyo (maintenance page or disable writes).
2. Re-run `npm run migrate:supabase-region` for a final incremental sync if the app was live on Tokyo during staging.
3. Set **production** env vars to Frankfurt (same three keys as staging).
4. Redeploy production; monitor logs and Realtime for ~30 minutes.

## Rollback

1. Revert hosting env vars to Tokyo URL + anon + service role.
2. Redeploy. Users who received **Frankfurt-only** JWTs after cutover must sign in again against Tokyo.
3. Keep the Frankfurt project **paused** or read-only during the retention window; do not delete Tokyo until rollback is no longer required.

Document the exact env snapshot (without secret values) in your deployment notes when you cut over.

## Decommission Tokyo

After a safe retention period and confirmed zero traffic to Tokyo:

- Export any final audit logs if needed.
- Pause or delete the Tokyo project per org policy.
- Remove the Tokyo hostname from `next.config.ts` **images.remotePatterns** when you no longer need rollback.

## Key rotation

If service role keys were copied into shell history or logs, rotate them in **Supabase → Project Settings → API** for both projects.
