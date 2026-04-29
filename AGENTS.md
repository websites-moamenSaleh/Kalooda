<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Dev server

When starting or deploying the local Next.js dev server, always use **`npm run dev`** (or equivalent) so **`--disable-source-maps`** is applied. Do not start plain `next dev` without that flag unless the user explicitly opts out.
