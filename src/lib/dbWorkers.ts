import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

export interface HyperdriveBinding {
  readonly connectionString: string;
}

/**
 * Create a short-lived PrismaClient backed by @prisma/adapter-pg for Cloudflare Workers + Hyperdrive.
 * Standard @prisma/client uses a native Rust query engine binary that cannot run in workerd.
 */
export function createWorkersPrismaClient(connectionString: string): {
  db: PrismaClient;
  close: () => Promise<void>;
} {
  if (!connectionString || !connectionString.trim()) {
    throw new Error("Hyperdrive connection string is required.");
  }
  const pool = new Pool({ connectionString, max: 5 });
  const adapter = new PrismaPg(pool);
  const db = new PrismaClient({ adapter, log: [] });
  return {
    db,
    close: async () => {
      await db.$disconnect();
      await pool.end();
    },
  };
}
