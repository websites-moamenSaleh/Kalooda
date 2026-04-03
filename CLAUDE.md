@AGENTS.md

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
