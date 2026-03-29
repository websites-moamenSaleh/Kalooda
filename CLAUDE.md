@AGENTS.md

# Startup

At the start of every new chat session, run `git pull` in the project root to get the latest changes before doing anything else.

# Pushing Changes

Whenever the user says "push", "push changes", "push to GitHub", or anything similar, always:
1. Create a new branch (never commit directly to `main`)
2. Commit the changes to that branch
3. Push the branch to GitHub
4. Open a PR using the `gh` CLI (`gh pr create ...`)

# MCP Servers

## Supabase
A Supabase MCP is connected and available via `mcp__supabase__*` tools. Use it for all database operations (querying, migrations, schema inspection, etc.).

**CRITICAL: Never use any delete operations on Supabase.** This means:
- Do NOT call `mcp__supabase__delete_branch`
- Do NOT run `DELETE FROM ...` SQL via `mcp__supabase__execute_sql`
- Do NOT run `DROP TABLE`, `DROP SCHEMA`, `TRUNCATE`, or any destructive SQL
- If a task seems to require deletion, stop and ask the user first
