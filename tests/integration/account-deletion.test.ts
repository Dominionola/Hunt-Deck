import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { it } from "node:test";

it("deletes only the authenticated owner's database rows and R2 objects while preserving other users", {
  skip: process.env.HUNTDECK_RUN_CLOUDFLARE_DATABASE_TEST !== "1", timeout: 60000,
}, async () => {
  const local = JSON.parse(readFileSync(".local-services/migration-rehearsal-private.json", "utf8")) as { password: string; port: number; container: string };
  const schema = `acct_del_test_${randomUUID().replaceAll("-", "")}`;
  process.env.DATABASE_URL = `postgresql://postgres:${encodeURIComponent(local.password)}@127.0.0.1:55439/postgres?schema=${schema}&connection_limit=8`;
  process.env.DIRECT_URL = process.env.DATABASE_URL;

  const { db } = await import("../../src/lib/db");
  const { deleteOwnedAccountData } = await import("../../src/services/db/accountDeletionService");

  let created = false;
  try {
    await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    created = true;
    await db.$executeRawUnsafe(`CREATE TABLE users (id text PRIMARY KEY, email text UNIQUE NOT NULL, role text NOT NULL DEFAULT 'USER', "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);
    await db.$executeRawUnsafe(`CREATE TABLE resumes (id text PRIMARY KEY, "userId" text NOT NULL REFERENCES users(id) ON DELETE CASCADE, title text NOT NULL DEFAULT 'Master Resume', "originalFileUrl" text NOT NULL, "extractedText" text NOT NULL, "parsedData" jsonb NOT NULL, "isPrimary" boolean NOT NULL DEFAULT false, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);

    const keyA = `resumes/owner_a/${"a".repeat(64)}.pdf`;
    const keyB = `resumes/owner_b/${"b".repeat(64)}.pdf`;
    await db.$executeRawUnsafe(`INSERT INTO users (id, email) VALUES ('owner_a', 'a@example.com'), ('owner_b', 'b@example.com')`);
    await db.$executeRawUnsafe(`INSERT INTO resumes (id, "userId", "originalFileUrl", "extractedText", "parsedData") VALUES ('res_a', 'owner_a', 'r2://huntdeck-resumes-dev/${keyA}', 'text', '{}'::jsonb), ('res_b', 'owner_b', 'r2://huntdeck-resumes-dev/${keyB}', 'text', '{}'::jsonb)`);

    const deletedKeys: string[] = [];
    const result = await deleteOwnedAccountData("owner_a", {
      deleteStagedObject: async (_userId, key) => {
        deletedKeys.push(key);
      },
    });

    assert.equal(result.deleted, true);
    assert.equal(result.r2ObjectsDeleted, 1);
    assert.deepEqual(deletedKeys, [keyA]);

    assert.equal(await db.user.count({ where: { id: "owner_a" } }), 0);
    assert.equal(await db.resume.count({ where: { userId: "owner_a" } }), 0);
    assert.equal(await db.user.count({ where: { id: "owner_b" } }), 1);
    assert.equal(await db.resume.count({ where: { userId: "owner_b" } }), 1);
  } finally {
    if (created) await db.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await db.$disconnect();
  }
});
