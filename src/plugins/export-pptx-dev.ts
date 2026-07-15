import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { handleExportRequest } from '../../api/export-pptx-core';

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
 * Vite plugin that adds a middleware handler for POST /api/export-pptx
 * during local development. The handler uses Playwright + PptxGenJS to
 * capture each dashboard slide and return a downloadable PPTX.
 */
export function exportPptxDevPlugin(): Plugin {
  return {
    name: 'export-pptx-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/export-pptx' || req.method !== 'POST') {
          return next();
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
          sendJson(res, 500, { error: e?.message ?? 'Internal server error' });
        }
      });
    },
  };
}
