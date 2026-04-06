#!/usr/bin/env node
/**
 * Applies supabase/scripts/rewrite-tokyo-image-urls-to-frankfurt.sql logic via the API.
 * Uses NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

function getEnv(name) {
  const text = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const line = text.split("\n").find((l) => l.startsWith(`${name}=`));
  if (!line) throw new Error(`Missing ${name} in .env.local`);
  return line
    .slice(name.length + 1)
    .replace(/^["']|["']$/g, "")
    .replace(/\n/g, "")
    .trim();
}

const OLD_HOST = "https://nnciyjfqoggfavfettbm.supabase.co";
const NEW_HOST = "https://mxbnmoagdufitnwrmsrn.supabase.co";

async function rewriteTable(supabase, table) {
  const { data: rows, error } = await supabase
    .from(table)
    .select("id, image_url")
    .like("image_url", "%nnciyjfqoggfavfettbm.supabase.co%");
  if (error) throw new Error(`${table} select: ${error.message}`);
  let updated = 0;
  for (const row of rows ?? []) {
    const image_url = row.image_url.replaceAll(OLD_HOST, NEW_HOST);
    if (image_url === row.image_url) continue;
    const { error: uerr } = await supabase
      .from(table)
      .update({ image_url })
      .eq("id", row.id);
    if (uerr) throw new Error(`${table} update ${row.id}: ${uerr.message}`);
    updated += 1;
  }
  console.log(`${table}: ${updated} row(s) updated (${rows?.length ?? 0} matched Tokyo host)`);
}

const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = getEnv("SUPABASE_SERVICE_ROLE_KEY");
if (!url.includes("mxbnmoagdufitnwrmsrn")) {
  console.warn("Warning: NEXT_PUBLIC_SUPABASE_URL does not look like Frankfurt (mxbnmoagdufitnwrmsrn).");
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

await rewriteTable(supabase, "categories");
await rewriteTable(supabase, "products");
console.log("Done.");
