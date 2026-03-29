export async function withRetry<T>(fn: () => Promise<T>, maxRetries: number): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
    }
  }
  throw lastError;
}
