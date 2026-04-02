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

# MCP Servers

## Supabase
A Supabase MCP is connected and available via `mcp__supabase__*` tools. Use it for all database operations (querying, migrations, schema inspection, etc.).

**CRITICAL: Never use any delete operations on Supabase.** This means:
- Do NOT call `mcp__supabase__delete_branch`
- Do NOT run `DELETE FROM ...` SQL via `mcp__supabase__execute_sql`
- Do NOT run `DROP TABLE`, `DROP SCHEMA`, `TRUNCATE`, or any destructive SQL
- If a task seems to require deletion, stop and ask the user first
