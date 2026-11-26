/** Evidence from a finished pass over a single source. IDs are opaque provider references. */
export interface SourceSnapshot {
  sourceKey: string;
  generation: number;
  complete: boolean;
  invalidCount: number;
  ids: readonly string[];
}

/** Two equal, complete observations are necessary, but cannot prove an atomic provider snapshot. */
export function verifySourceSnapshots(first: SourceSnapshot, second: SourceSnapshot): boolean {
  if (!first.sourceKey || first.sourceKey !== second.sourceKey ||
      !Number.isSafeInteger(first.generation) || first.generation < 1 || first.generation !== second.generation ||
      !first.complete || !second.complete || first.invalidCount !== 0 || second.invalidCount !== 0 ||
      first.ids.length === 0 || first.ids.length !== second.ids.length) return false;
  const firstIds = new Set(first.ids); const secondIds = new Set(second.ids);
  if (firstIds.size !== first.ids.length || secondIds.size !== second.ids.length ||
      first.ids.some((id) => !id || id.length > 150) || second.ids.some((id) => !id || id.length > 150)) return false;
  return [...firstIds].every((id) => secondIds.has(id));
}
