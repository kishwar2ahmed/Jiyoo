import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchJsonWithProxyRetry, isProxyErrorResponse } from './apiFetch';

test('isProxyErrorResponse identifies proxy HTML error pages and empty 502/503/504 bodies', () => {
  assert.equal(isProxyErrorResponse(500, '<!DOCTYPE html><html><title>500 Internal Server Error</title></html>', null), true);
  assert.equal(isProxyErrorResponse(502, '<html><body>Bad Gateway</body></html>', null), true);
  assert.equal(isProxyErrorResponse(503, '   ', null), true);
  assert.equal(isProxyErrorResponse(504, '', null), true);
});

test('isProxyErrorResponse treats structured JSON responses as non-proxy responses even on HTTP errors', () => {
  assert.equal(isProxyErrorResponse(500, '{"success":false,"error":"DB failure"}', { success: false }), false);
  assert.equal(isProxyErrorResponse(400, '{"error":"Invalid input"}', { error: 'Invalid input' }), false);
  assert.equal(isProxyErrorResponse(200, '{"success":true}', { success: true }), false);
});

test('fetchJsonWithProxyRetry warms /api/health and retries after transient proxy HTML 500 response', async () => {
  const originalFetch = globalThis.fetch;
  const calledUrls: string[] = [];
  let postAttempts = 0;

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calledUrls.push(url);
    if (url === '/api/health') {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    postAttempts++;
    if (postAttempts === 1) {
      return new Response('<!doctype html><html><title>500</title></html>', { status: 500 });
    }
    return new Response(JSON.stringify({ success: true, token: 'tok_123' }), { status: 200 });
  }) as typeof fetch;

  try {
    const result = await fetchJsonWithProxyRetry<{ success: boolean; token: string }>('/api/admin/auth', {
      method: 'POST',
    });
    assert.equal(postAttempts, 2);
    assert.deepEqual(calledUrls, ['/api/admin/auth', '/api/health', '/api/admin/auth']);
    assert.equal(result.res.status, 200);
    assert.deepEqual(result.data, { success: true, token: 'tok_123' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchJsonWithProxyRetry does not retry on valid JSON 401 response', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;

  globalThis.fetch = (async () => {
    calls++;
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
  }) as typeof fetch;

  try {
    const result = await fetchJsonWithProxyRetry<{ success: boolean; error: string }>('/api/admin/stats');
    assert.equal(calls, 1);
    assert.equal(result.res.status, 401);
    assert.equal(result.data?.error, 'Unauthorized');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
