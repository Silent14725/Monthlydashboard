import { handleExportRequest, checkBrowser } from '../../api/export-pptx-core';

// Node.js runtime — NOT Edge. Playwright requires a full Node process.
// Handler typed loosely to avoid @netlify/functions union inference issues.
export const handler = async (event: any): Promise<any> => {
  // Preflight check
  if (event.httpMethod === 'GET') {
    const result = await checkBrowser();
    return {
      statusCode: result.ok ? 200 : 503,
      headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST, GET' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const result = await handleExportRequest(body);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': String(result.buffer.length),
      },
      body: result.buffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (e: any) {
    console.error('[export-pptx] Error:', e);
    return {
      statusCode: 503,
      headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        error: e?.message ?? 'Internal server error',
      }),
    };
  }
};

export default handler;
