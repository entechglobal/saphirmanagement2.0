/**
 * Fire-and-forget async work inside the API process (no Redis / queue).
 * Retries with exponential backoff; never blocks the HTTP response.
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {() => Promise<unknown>} fn
 * @param {{
 *   attempts?: number,
 *   delayMs?: number,
 *   label?: string,
 *   onFinalFailure?: (err: Error) => Promise<void> | void,
 * }} [options]
 */
export const runInBackground = (
  fn,
  { attempts = 5, delayMs = 10_000, label = "background", onFinalFailure } = {},
) => {
  setImmediate(async () => {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        await fn();
        return;
      } catch (err) {
        lastError = err;
        console.error(
          `[${label}] attempt ${attempt}/${attempts} failed: ${err.message}`,
        );
        if (attempt < attempts) {
          await sleep(delayMs * 2 ** (attempt - 1));
        }
      }
    }

    console.error(`[${label}] all ${attempts} attempts exhausted`);
    if (onFinalFailure) {
      try {
        await onFinalFailure(lastError);
      } catch (hookErr) {
        console.error(`[${label}] onFinalFailure failed: ${hookErr.message}`);
      }
    }
  });
};
