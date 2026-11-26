import { db } from "@/lib/db";
import { deleteStagedResume } from "@/services/storage/r2Service";

export interface AccountDeletionDeps {
  deleteStagedObject?: (userId: string, storageKey: string) => Promise<void>;
}

const VALID_R2_PREFIX = /^r2:\/\/[^/]+\/(resumes\/[a-zA-Z0-9_-]+\/[a-f0-9]{64}\.pdf)$/;

/**
 * Permanently delete an authenticated owner's database records (via User cascade)
 * and best-effort delete their referenced private R2 staged objects.
 */
export async function deleteOwnedAccountData(
  ownerId: string,
  deps?: AccountDeletionDeps,
): Promise<{ deleted: boolean; r2ObjectsDeleted: number }> {
  if (!ownerId || !/^[a-zA-Z0-9_-]+$/.test(ownerId)) {
    throw new Error("Invalid account identifier.");
  }

  const resumes = await db.resume.findMany({
    where: { userId: ownerId },
    select: { originalFileUrl: true },
  });

  const deleteObj = deps?.deleteStagedObject ?? deleteStagedResume;
  let r2ObjectsDeleted = 0;

  for (const resume of resumes) {
    const match = VALID_R2_PREFIX.exec(resume.originalFileUrl);
    if (!match) continue;
    const key = match[1];
    if (!key.startsWith(`resumes/${ownerId}/`)) continue;
    try {
      await deleteObj(ownerId, key);
      r2ObjectsDeleted++;
    } catch {
      // Missing or unconfigured storage object must not block database deletion.
    }
  }

  const deleted = await db.user.deleteMany({ where: { id: ownerId } });
  return { deleted: deleted.count === 1, r2ObjectsDeleted };
}
