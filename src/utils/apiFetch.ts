export interface ProxyRetryJsonResult<T = any> {
  res: Response;
  data: T | null;
  rawText: string;
}

export function isProxyErrorResponse(
  status: number,
  rawText: string,
  parsed: unknown
): boolean {
  if (parsed !== null && typeof parsed === 'object') {
    return false;
  }
  const trimmed = (rawText || '').trim().toLowerCase();
  if (
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<html') ||
    trimmed.includes('<title>500') ||
    trimmed.includes('internal server error')
  ) {
    return true;
  }
  return status >= 500 && status <= 504 && trimmed.length === 0;
}

export async function fetchJsonWithProxyRetry<T = any>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options?: {
    maxAttempts?: number;
    warmupUrl?: string;
  }
): Promise<ProxyRetryJsonResult<T>> {
  const maxAttempts = Math.max(1, options?.maxAttempts ?? 3);
  const warmupUrl = options?.warmupUrl ?? '/api/health';

  let lastRes: Response | null = null;
  let lastText = '';

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await fetch(warmupUrl, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin',
      }).catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 160 * attempt));
    }

    const res = await fetch(input, {
      credentials: 'same-origin',
      ...init,
    });
    const rawText = await res.text().catch(() => '');
    let parsed: T | null = null;
    if (rawText) {
      try {
        parsed = JSON.parse(rawText) as T;
      } catch {
        parsed = null;
      }
    }

    lastRes = res;
    lastText = rawText;

    if (!isProxyErrorResponse(res.status, rawText, parsed) || attempt === maxAttempts - 1) {
      return { res, data: parsed, rawText };
    }
  }

  return {
    res: lastRes!,
    data: null,
    rawText: lastText,
  };
}
