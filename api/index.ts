import type { IncomingMessage, ServerResponse } from 'node:http';
import { createRequire } from 'node:module';

let appPromise: Promise<any> | null = null;

async function resolveCreateApp(): Promise<() => Promise<any>> {
  try {
    const req = createRequire(import.meta.url);
    const cjsMod = req('./_server.cjs');
    if (typeof cjsMod?.createApp === 'function') {
      return cjsMod.createApp;
    }
    if (typeof cjsMod?.default?.createApp === 'function') {
      return cjsMod.default.createApp;
    }
  } catch {
    // Fallback to direct TypeScript/ESM import in local dev
  }
  const devServerSpec = '../server';
  const esmMod = await import(devServerSpec);
  return esmMod.createApp;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (!appPromise) {
      appPromise = resolveCreateApp().then((fn) => fn());
    }
    const rawUrl = req.url || '/';
    try {
      const parsed = new URL(rawUrl, 'http://localhost');
      const pathParams = parsed.searchParams.getAll('path').filter(Boolean);
      if ((parsed.pathname === '/api' || parsed.pathname === '/') && pathParams.length > 0) {
        parsed.searchParams.delete('path');
        const cleanPath = pathParams.join('/').replace(/^\/+/, '');
        const search = parsed.searchParams.toString();
        req.url = `/api/${cleanPath}${search ? `?${search}` : ''}`;
      } else if (!parsed.pathname.startsWith('/api/') && parsed.pathname !== '/api') {
        req.url = `/api${parsed.pathname.startsWith('/') ? '' : '/'}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      // preserve req.url as-is
    }
    const app = await appPromise;
    return app(req as any, res as any);
  } catch (err: any) {
    appPromise = null;
    console.error('[Vercel API Handler Error]:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: false,
          error: 'Internal server error. Please try again.',
        })
      );
    }
  }
}
