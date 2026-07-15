import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { handleExportRequest, checkBrowser, BrowserLaunchError } from '../../api/export-pptx-core';

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

/**
 * Vite plugin that adds middleware handlers for /api/export-pptx
 * during local development:
 *
 *   GET  /api/export-pptx        → preflight browser check (returns { ok, error? })
 *   POST /api/export-pptx        → capture slides, return PPTX buffer
 */
export function exportPptxDevPlugin(): Plugin {
  return {
    name: 'export-pptx-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/export-pptx') {
          return next();
        }

        // Preflight check
        if (req.method === 'GET') {
          const result = await checkBrowser();
          return sendJson(res, result.ok ? 200 : 503, result);
        }

        if (req.method !== 'POST') {
          return sendJson(res, 405, { error: 'Method not allowed' });
        }

        try {
          const bodyStr = await readBody(req);
          const body = JSON.parse(bodyStr);
          const result = await handleExportRequest(body);

          res.writeHead(200, {
            'Content-Type': result.contentType,
            'Content-Disposition': `attachment; filename="${result.filename}"`,
            'Content-Length': result.buffer.length,
          });
          res.end(result.buffer);
        } catch (e: any) {
          console.error('[export-pptx-dev] Error:', e);
          const isBrowserError = e instanceof BrowserLaunchError;
          sendJson(res, 503, {
            error: e?.message ?? 'Internal server error',
            browserError: isBrowserError,
          });
        }
      });
    },
  };
}
