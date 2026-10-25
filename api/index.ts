import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../server';

// Vercel invokes this function per-request instead of running a persistent
// process, so the app can't just call app.listen() here (see server.ts).
// The created Express app is cached across warm invocations of the same
// function instance so routes/middleware aren't rebuilt on every request.
let appPromise: ReturnType<typeof createApp> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!appPromise) {
    appPromise = createApp();
  }
  const app = await appPromise;
  return (app as any)(req, res);
}
