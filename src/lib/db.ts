import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client Singleton for Next.js App Router
 * Prevents multiple instances of Prisma Client in development due to hot reloading.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Prisma error messages may include query arguments or document fields.
    // Callers report sanitized failures at the boundary instead.
    log: [],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
