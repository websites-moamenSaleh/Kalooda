@AGENTS.md

# Project Briefing

**Kalooda** — a multi-tenant sweets shop platform built by VanguardT (2 devs: AbedAwaisy + moamenSaleh-ghub).
Full integration map and secrets reference: `docs/integrations.md` — read it when context on any service is needed.

## Stack
- **Frontend/API:** Next.js 16 (App Router, TypeScript) hosted on Vercel (vanguardtechnologies-team, free/Hobby plan)
- **Database:** Supabase (Frankfurt, project `mxbnmoagdufitnwrmsrn`)
- **Error monitoring:** Sentry (EU region, org `vanguardt`, project `javascript-nextjs`)
- **Team comms:** Slack workspace `vanguardt.slack.com`
- **Repo:** `VanguardTOfficial/Kalooda` (public, GitHub free plan)
- **CI:** GitHub Actions — type check + lint + build on every PR; weekly npm audit → `#kalooda-alerts`

## Key constraints
- Vercel Hobby plan: no private org repos, no log drains, 1h log retention
- Branch protection on `main`: CI must pass + 1 reviewer approval required
- Never push directly to `main` — all changes via PR
- Toggling repo visibility may silently drop branch protection reviewer rule — verify after

## MCP & CLI tools available
- `mcp__slack__*` — read/post to Slack channels
- `mcp__sentry__*` — query/triage Sentry issues
- `mcp__supabase__*` — DB operations (no destructive ops without explicit user request)
- `mcp__gdrive__*` — Google Drive (Kalooda folder ID: `1iTxRbSysblrslKFWzozPCGVUleCw7bmN`)
- `vercel` CLI — env vars, deployments, logs (token: `vcp_2DBV...` in terminal sessions)
- `sentry` CLI — authenticated at `~/.sentry/cli.db`, token expires 2026-05-15
- `gh` CLI — GitHub API access

## Active Vercel env vars (production)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`,
`SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SLACK_BOT_TOKEN`, `OPENAI_API_KEY`

---

# Startup

At the start of every new chat session, sync with the default branch before other work:

1. `git fetch origin`
2. Merge or rebase **`origin/main`** into your **current** branch (e.g. `git merge origin/main`), or if you are on `main`, `git pull origin main`.

A plain `git pull` on a feature branch only updates that branch’s remote tracking branch — it does **not** bring in latest **`main`**, which is what you need to avoid surprise PR conflicts.

# Pushing Changes

Whenever the user says "push", "push changes", "push to GitHub", or anything similar, always:
1. `git fetch origin` and merge **`origin/main`** into the working branch; resolve conflicts before continuing.
2. Create a new branch if you would otherwise commit directly to `main` (never push straight to `main` for feature work).
3. Commit the changes to that branch
4. Push the branch to GitHub
5. Open a PR using the `gh` CLI (`gh pr create ...`)
6. **Sync GitHub issues with the pushed work** (use `gh`; scope to this repo):
   - List open issues (`gh issue list --state open`, increase `--limit` if needed). Also consider issues referenced in commit messages or the PR body.
   - For each issue that **clearly relates** to what changed in this push: compare the issue to the actual diff/commits (and PR).
     - **Nothing in the push addresses it** → leave the issue unchanged.
     - **Partially addressed** → add a comment (`gh issue comment`) stating what is done, what remains, and link the PR (and key paths or commits if helpful). Do not close.
     - **Fully addressed** → comment with a short summary and PR link, then close (`gh issue close <n> --reason completed`) or ensure the PR body uses a closing keyword (`Fixes #n`) if you amend the PR instead.
   - If the push implements **substantive work** that **no open issue** describes, create an issue (`gh issue create`) whose title and body match what the code actually does, and link the PR in the body. Close it when the work is done (e.g. after merge) or leave it open as the canonical task for that PR—pick whichever keeps the tracker honest.

   Goal: the issue tracker reflects reality after every push—no silent fixes, no stale “open” for completed work, and no undocumented shipped changes.
7. When an issue that appears in **`docs/github-issue-execution-order.md`** is **completed** (closed as done or verified shipped), **update that file** in the same change-set when practical: mark it done, adjust waves, refresh the mermaid diagram, and bump its **Last updated** date—so the local execution order stays aligned with the tracker.

# MCP Servers

## Google Drive

A Google Drive MCP is connected via `mcp__gdrive__*` tools.

**Kalooda Project folder** (ID: `1iTxRbSysblrslKFWzozPCGVUleCw7bmN`) is the shared folder used for this project. The user uploads assets (images, files) here from their phone during remote sessions.

### Reading images from Drive
The Drive MCP cannot download binary files. To read an image uploaded to Drive:
1. Get the file ID from `mcp__gdrive__listFolderContents`
2. Fetch it via: `https://lh3.googleusercontent.com/d/{FILE_ID}`
3. The file is saved locally by WebFetch; use the `Read` tool on the saved path to view it as an image

> The Kalooda Project folder must remain **publicly shared** for this to work.

## Supabase
A Supabase MCP is connected and available via `mcp__supabase__*` tools. Use it for all database operations (querying, migrations, schema inspection, etc.).

**Delete operations are allowed only when explicitly requested by the user.** This means:
- Do NOT call `mcp__supabase__delete_branch` unless the user explicitly asks
- Do NOT run `DELETE FROM ...` SQL via `mcp__supabase__execute_sql` unless the user explicitly asks
- Do NOT run `DROP TABLE`, `DROP SCHEMA`, `TRUNCATE`, or any destructive SQL unless the user explicitly asks
- When in doubt, confirm with the user before proceeding
