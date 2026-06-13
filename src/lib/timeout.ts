/**
 * Race a promise against a hard wall-clock timeout.
 *
 * Refresh runs every source through Promise.all, and not every fetch path can
 * be trusted to settle — an RSS endpoint can accept the connection and then
 * hang forever, which stalls the entire refresh. This guarantees the call
 * settles: the underlying promise keeps running but is ignored once it loses
 * the race, and we reject on timeout so the caller's existing try/catch
 * records it as a per-source error.
 */
export function withHardTimeout<T>(promise: Promise<T>, ms: number, label = 'operation'): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} exceeded ${ms}ms hard timeout`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer)
  }) as Promise<T>
}
