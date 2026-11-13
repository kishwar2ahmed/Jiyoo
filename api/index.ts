import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../server';

let appPromise: ReturnType<typeof createApp> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!appPromise) {
    appPromise = createApp();
  }
  const rawUrl = req.url || '/';
  try {
    const parsed = new URL(rawUrl, 'http://localhost');
    const pathParam = parsed.searchParams.get('path');
    if ((parsed.pathname === '/api' || parsed.pathname === '/') && pathParam) {
      parsed.searchParams.delete('path');
      const cleanPath = pathParam.replace(/^\/+/, '');
      const search = parsed.searchParams.toString();
      req.url = `/api/${cleanPath}${search ? `?${search}` : ''}`;
    }
  } catch {
    // preserve req.url as-is
  }
  const app = await appPromise;
  return app(req as any, res as any);
}
