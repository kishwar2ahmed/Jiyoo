export interface AdminAuthJsonResult {
  success: boolean;
  requires2FA?: boolean;
  totpEnrolled?: boolean;
  preAuthToken?: string;
  email?: string;
  remainingRecoveryCodes?: number;
  enrollment?: any;
  token?: string;
  mfaVerified?: boolean;
  code?: string;
  remainingAttempts?: number;
  retryAfterSeconds?: number;
  error?: string;
  verifiedVia?: 'TOTP' | 'RECOVERY_CODE';
  recoveryCodes?: string[];
}

export function extractHttpErrorSnippet(rawText: string): string {
  const trimmed = String(rawText || '').trim();
  if (!trimmed) return '';
  const titleMatch = trimmed.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].replace(/\s+/g, ' ').trim().slice(0, 120);
  }
  const withoutTags = trimmed.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return withoutTags.slice(0, 120);
}

export function parseAuthServerPayload(
  status: number,
  ok: boolean,
  rawText: string,
  fallbackLabel = 'Authentication server returned an unexpected response'
): { parsed: AdminAuthJsonResult; isTransientNonJson5xx: boolean } {
  if (rawText) {
    try {
      const data = JSON.parse(rawText) as AdminAuthJsonResult;
      if (data && typeof data === 'object') {
        if (ok) {
          return { parsed: data, isTransientNonJson5xx: false };
        }
        if (typeof data.error === 'string' && data.error.trim()) {
          return { parsed: data, isTransientNonJson5xx: false };
        }
      }
    } catch {
      // Non-JSON response (for example an HTML proxy error page)
    }
  }

  const isTransientNonJson5xx = status >= 500 && status <= 504;
  const snippet = extractHttpErrorSnippet(rawText);
  const detail = snippet ? ` — ${snippet}` : '';
  return {
    parsed: {
      success: false,
      error: `${fallbackLabel} (HTTP ${status}${detail}). Please refresh the page and try again.`,
    },
    isTransientNonJson5xx,
  };
}

export async function postJsonWithAuthWarmupRetry(
  url: string,
  bodyPayload: Record<string, any>,
  options?: {
    fetchImpl?: typeof fetch;
    warmupUrl?: string;
    retryDelaysMs?: number[];
    fallbackLabel?: string;
  }
): Promise<AdminAuthJsonResult> {
  const fetchFn = options?.fetchImpl ?? fetch;
  const warmupUrl = options?.warmupUrl ?? '/api/health';
  const retryDelaysMs = options?.retryDelaysMs ?? [350, 800];
  const fallbackLabel = options?.fallbackLabel ?? 'Authentication server returned an unexpected response';

  const attemptOnce = async () => {
    const res = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(bodyPayload),
    });
    const rawText = await res.text();
    return parseAuthServerPayload(res.status, res.ok, rawText, fallbackLabel);
  };

  let outcome = await attemptOnce();
  for (let i = 0; i < retryDelaysMs.length && outcome.isTransientNonJson5xx; i++) {
    try {
      // Re-warm GET path so any reverse-proxy auth cache (e.g. Nginx auth_token_cache)
      // refreshes cleanly via GET before retrying the POST request.
      await fetchFn(warmupUrl, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin',
      }).catch(() => {});
    } catch {
      // ignore warmup errors
    }
    if (retryDelaysMs[i] > 0) {
      await new Promise((resolve) => setTimeout(resolve, retryDelaysMs[i]));
    }
    outcome = await attemptOnce();
  }

  return outcome.parsed;
}
