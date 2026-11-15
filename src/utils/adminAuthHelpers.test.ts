import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractHttpErrorSnippet,
  parseAuthServerPayload,
  postJsonWithAuthWarmupRetry,
} from './adminAuthHelpers';

test('extractHttpErrorSnippet extracts HTML title cleanly', () => {
  const html = '<html><head><title>500 Internal Server Error</title></head><body><h1>nginx</h1></body></html>';
  assert.equal(extractHttpErrorSnippet(html), '500 Internal Server Error');
});

test('parseAuthServerPayload returns structured JSON error when present', () => {
  const result = parseAuthServerPayload(
    401,
    false,
    JSON.stringify({ success: false, error: 'Invalid credentials' })
  );
  assert.equal(result.isTransientNonJson5xx, false);
  assert.equal(result.parsed.success, false);
  assert.equal(result.parsed.error, 'Invalid credentials');
});

test('parseAuthServerPayload flags non-JSON 500 response as transient and surfaces HTTP status', () => {
  const html = '<html><head><title>500 Internal Server Error</title></head></html>';
  const result = parseAuthServerPayload(500, false, html);
  assert.equal(result.isTransientNonJson5xx, true);
  assert.equal(result.parsed.success, false);
  assert.match(result.parsed.error || '', /HTTP 500/);
  assert.match(result.parsed.error || '', /500 Internal Server Error/);
});

test('postJsonWithAuthWarmupRetry warms /api/health via GET and recovers after transient non-JSON 500', async () => {
  const calls: Array<{ url: string; method: string }> = [];
  let postCount = 0;

  const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = String(init?.method || 'GET').toUpperCase();
    calls.push({ url, method });

    if (url === '/api/health') {
      return new Response(JSON.stringify({ success: true, status: 'ok' }), { status: 200 });
    }

    postCount++;
    if (postCount === 1) {
      return new Response('<html><head><title>500 Internal Server Error</title></head></html>', { status: 500 });
    }
    return new Response(
      JSON.stringify({ success: true, requires2FA: false, mfaVerified: true, token: 'jiyoo_admin_sig.abc.def' }),
      { status: 200 }
    );
  }) as typeof fetch;

  const res = await postJsonWithAuthWarmupRetry(
    '/api/admin/auth/session',
    { ownerPin: 'jiyooshams@2026' },
    { fetchImpl: mockFetch, retryDelaysMs: [0, 0] }
  );

  assert.equal(res.success, true);
  assert.equal(res.token, 'jiyoo_admin_sig.abc.def');
  assert.deepEqual(calls, [
    { url: '/api/admin/auth/session', method: 'POST' },
    { url: '/api/health', method: 'GET' },
    { url: '/api/admin/auth/session', method: 'POST' },
  ]);
});

test('postJsonWithAuthWarmupRetry does NOT retry on 401 JSON auth failures', async () => {
  let postCount = 0;
  const mockFetch = (async () => {
    postCount++;
    return new Response(JSON.stringify({ success: false, error: 'Invalid credentials', remainingAttempts: 4 }), {
      status: 401,
    });
  }) as typeof fetch;

  const res = await postJsonWithAuthWarmupRetry(
    '/api/admin/auth/session',
    { ownerPin: 'wrong-passcode' },
    { fetchImpl: mockFetch, retryDelaysMs: [0, 0] }
  );

  assert.equal(postCount, 1);
  assert.equal(res.success, false);
  assert.equal(res.error, 'Invalid credentials');
  assert.equal(res.remainingAttempts, 4);
});
