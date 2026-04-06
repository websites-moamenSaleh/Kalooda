#!/usr/bin/env node
import crypto from "node:crypto";

/**
 * Copy Postgres public data + Storage (catalog, products) + Auth users from a source
 * Supabase project to a target (e.g. Tokyo → Frankfurt).
 *
 * Auth: uses Admin API createUser with preserved id, email, metadata, and password_hash
 * when the listUsers API returns encrypted_password (may be absent — then users get a
 * random password and must use "Forgot password").
 *
 * Required env:
 *   MIGRATE_SOURCE_URL, MIGRATE_SOURCE_SERVICE_ROLE
 *   MIGRATE_TARGET_URL, MIGRATE_TARGET_SERVICE_ROLE
 *
 * Optional:
 *   MIGRATE_SKIP_STORAGE=1  — only copy DB + auth
 *   MIGRATE_SKIP_AUTH=1     — only copy public tables + storage (no auth.users)
 */

import { createClient } from "@supabase/supabase-js";

const skipStorage = process.env.MIGRATE_SKIP_STORAGE === "1";
const skipAuth = process.env.MIGRATE_SKIP_AUTH === "1";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\n/g, "")
    .replace(/\r/g, "");
}

const sourceUrl = requireEnv("MIGRATE_SOURCE_URL");
const sourceKey = requireEnv("MIGRATE_SOURCE_SERVICE_ROLE");
const targetUrl = requireEnv("MIGRATE_TARGET_URL");
const targetKey = requireEnv("MIGRATE_TARGET_SERVICE_ROLE");

const src = createClient(sourceUrl, sourceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const dst = createClient(targetUrl, targetKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function deleteAll(client, table, filterColumn, filterValue = "1970-01-01T00:00:00Z") {
  const { error } = await client
    .from(table)
    .delete()
    .gte(filterColumn, filterValue);
  if (error) throw new Error(`${table} delete: ${error.message}`);
}

async function clearTargetPublicAndAuth() {
  await deleteAll(dst, "cart_items", "updated_at");
  await deleteAll(dst, "deliveries", "timestamp");
  await deleteAll(dst, "orders", "created_at");
  await deleteAll(dst, "products", "price", "-999999");
  const { error: catErr } = await dst.from("categories").delete().neq("slug", "");
  if (catErr) throw new Error(`categories delete: ${catErr.message}`);
  await deleteAll(dst, "drivers", "created_at");

  if (!skipAuth) {
    let page = 1;
    const perPage = 200;
    for (;;) {
      const { data, error } = await dst.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const users = data.users;
      if (!users.length) break;
      for (const u of users) {
        const { error: delErr } = await dst.auth.admin.deleteUser(u.id);
        if (delErr) throw delErr;
      }
      if (users.length < perPage) break;
      page += 1;
    }
  }
}

async function copyTable(table, orderBy = "id") {
  const { data: rows, error } = await src.from(table).select("*").order(orderBy);
  if (error) throw new Error(`${table} select: ${error.message}`);
  if (!rows?.length) {
    console.log(`  ${table}: 0 rows`);
    return 0;
  }
  const { error: ins } = await dst.from(table).insert(rows);
  if (ins) throw new Error(`${table} insert: ${ins.message}`);
  console.log(`  ${table}: ${rows.length} rows`);
  return rows.length;
}

async function migrateAuthUsers() {
  if (skipAuth) {
    console.log("auth.users: skipped (MIGRATE_SKIP_AUTH=1)");
    return;
  }
  let page = 1;
  const perPage = 200;
  let total = 0;
  for (;;) {
    const { data, error } = await src.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data.users;
    if (!users.length) break;
    for (const u of users) {
      const email = u.email ?? undefined;
      const phone = u.phone ?? undefined;
      /** @type {import("@supabase/supabase-js").AdminUserAttributes} */
      const attrs = {
        id: u.id,
        email,
        phone,
        email_confirm: !!u.email_confirmed_at,
        phone_confirm: !!u.phone_confirmed_at,
        user_metadata: u.user_metadata ?? {},
        app_metadata: u.app_metadata ?? {},
        ban_duration: u.banned_until ? u.banned_until : "none",
      };
      const hash = u.encrypted_password;
      if (hash) attrs.password_hash = hash;
      else attrs.password = `tmp-${crypto.randomUUID().replaceAll("-", "")}`;

      const { error: cErr } = await dst.auth.admin.createUser(attrs);
      if (cErr) throw new Error(`createUser ${u.id}: ${cErr.message}`);
      total += 1;
    }
    if (users.length < perPage) break;
    page += 1;
  }
  console.log(`  auth.users: ${total} users`);
}

async function syncProfiles() {
  if (skipAuth) return;
  const { data: profiles, error } = await src.from("profiles").select("*");
  if (error) throw error;
  if (!profiles?.length) {
    console.log("  profiles: trigger-created only");
    return;
  }
  for (const p of profiles) {
    const { error: up } = await dst.from("profiles").upsert(p, { onConflict: "id" });
    if (up) throw new Error(`profiles upsert ${p.id}: ${up.message}`);
  }
  console.log(`  profiles: ${profiles.length} rows upserted`);
}

async function copyStorageBucket(bucket) {
  const { data: objects, error } = await src.storage.from(bucket).list("", {
    limit: 1000,
    offset: 0,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw error;
  let count = 0;
  async function walk(prefix) {
    const { data: items, error: e2 } = await src.storage.from(bucket).list(prefix, {
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    });
    if (e2) throw e2;
    for (const item of items ?? []) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null && !item.metadata) {
        await walk(path);
        continue;
      }
      const { data: file, error: dl } = await src.storage.from(bucket).download(path);
      if (dl) throw dl;
      const buf = Buffer.from(await file.arrayBuffer());
      const { error: up } = await dst.storage.from(bucket).upload(path, buf, {
        contentType: item.metadata?.mimetype ?? "application/octet-stream",
        upsert: true,
      });
      if (up) throw new Error(`upload ${bucket}/${path}: ${up.message}`);
      count += 1;
    }
  }
  await walk("");
  console.log(`  storage.${bucket}: ${count} objects`);
}

async function main() {
  console.log("Clearing target…");
  await clearTargetPublicAndAuth();
  console.log("Migrating auth…");
  await migrateAuthUsers();
  console.log("Copying public tables…");
  await copyTable("categories");
  await copyTable("products");
  await copyTable("drivers");
  await syncProfiles();
  await copyTable("orders", "created_at");
  await copyTable("deliveries", "timestamp");
  await copyTable("cart_items", "updated_at");
  if (!skipStorage) {
    console.log("Copying storage…");
    await copyStorageBucket("catalog");
    await copyStorageBucket("products");
  } else {
    console.log("Storage: skipped (MIGRATE_SKIP_STORAGE=1)");
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
