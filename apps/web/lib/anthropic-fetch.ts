/** Shared Anthropic HTTP call with 429/503 backoff to reduce rate-limit failures when users open many workspaces. */

function parseRetryAfterMs(res: Response): number {
  const ra = res.headers.get("retry-after");
  if (ra) {
    const sec = Number.parseInt(ra, 10);
    if (!Number.isNaN(sec) && sec > 0) return Math.min(sec * 1000, 120_000);
  }
  const reset = res.headers.get("anthropic-ratelimit-input-tokens-reset");
  if (reset) {
    const t = Date.parse(reset);
    if (!Number.isNaN(t)) {
      const ms = t - Date.now();
      if (ms > 0) return Math.min(ms + 500, 120_000);
    }
  }
  return 6000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export type AnthropicMessagesBody = Record<string, unknown>;

/**
 * POST /v1/messages. Retries on 429 and 503 with Retry-After / header hints and exponential backoff.
 */
export async function fetchAnthropicMessages(
  apiKey: string,
  body: AnthropicMessagesBody,
  options?: { timeoutMs?: number; maxRetries?: number },
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? 90_000;
  const maxRetries = options?.maxRetries ?? 5;
  let last: Response | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    last = res;

    if (res.status !== 429 && res.status !== 503) {
      return res;
    }

    if (attempt === maxRetries) {
      return res;
    }

    const base = parseRetryAfterMs(res);
    const backoff = base + attempt * 2500 + Math.floor(Math.random() * 800);
    await sleep(Math.min(backoff, 120_000));
  }

  return last!;
}
