/** Bounded, content-free probes for the public health endpoint. */
export async function checkServiceHealth(
  probes: { database: () => Promise<unknown>; redis: () => Promise<unknown> },
  deadlineMs = 5000,
) {
  async function available(probe: () => Promise<unknown>) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        probe(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Health check timed out.")), deadlineMs); }),
      ]);
      return true;
    } catch {
      // Provider/driver errors may contain credentials or query arguments.
      return false;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  const [database, redis] = await Promise.all([available(probes.database), available(probes.redis)]);
  return { healthy: database && redis, database: database ? "connected" : "disconnected", redis: redis ? "connected" : "offline" };
}
