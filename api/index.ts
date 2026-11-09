import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../server';

// Vercel invokes this function per-request instead of running a persistent
// process, so the app can't just call app.listen() here (see server.ts).
// The created Express app is cached across warm invocations of the same
// function instance so routes/middleware aren't rebuilt on every request.
let appPromise: ReturnType<typeof createApp> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // In Vercel serverless environments, recover the true incoming /api path:
  const rawUrl = req.url || '';
  const candidateHeader =
    (req.headers['x-invoke-path'] as string) ||
    (req.headers['x-matched-path'] as string) ||
    (req.headers['x-vercel-forwarded-path'] as string) ||
    (req.headers['x-forwarded-uri'] as string) ||
    (req.headers['x-original-url'] as string);

  if (typeof candidateHeader === 'string' && candidateHeader.startsWith('/api')) {
    req.url = candidateHeader;
  } else if (rawUrl.startsWith('/api?') || rawUrl.startsWith('/api/?') || rawUrl === '/api' || rawUrl === '/api/') {
    try {
      const parsed = new URL(rawUrl, 'http://localhost');
      const pathParam = parsed.searchParams.get('path');
      if (pathParam) {
        parsed.searchParams.delete('path');
        const search = parsed.searchParams.toString();
        req.url = `/api/${pathParam.replace(/^\/+/, '')}${search ? `?${search}` : ''}`;
      }
    } catch {
      // maintain rawUrl on parse failure
    }
  }

  if (!appPromise) {
    appPromise = createApp();
  }
  const app = await appPromise;
  return (app as any)(req, res);
}
