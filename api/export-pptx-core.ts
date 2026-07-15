import type { Browser } from 'playwright';
import PptxGenJS from 'pptxgenjs';
// PptxGenJS may be a default function (CJS) or a namespace (ESM interop)
const PptxGen = (PptxGenJS as any).default ?? PptxGenJS;

export interface ExportRequest {
  baseUrl: string;
  slides: string[];
}

export interface ExportResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

export interface BrowserCheckResult {
  ok: boolean;
  executablePath?: string;
  source?: 'playwright' | 'system';
  error?: string;
}

const VIEWPORT_W = 1600;
const VIEWPORT_H = 900;
const PPTX_W = 13.333;
const PPTX_H = 7.5;

const SCREENSHOT_TIMEOUT = 30000;
const READY_TIMEOUT = 30000;

const SYSTEM_CHROMIUM_PATHS = [
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
];

// ── Error classification ───────────────────────────────────────────────────

export class BrowserLaunchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BrowserLaunchError';
  }
}

function classifyLaunchError(e: any): string {
  const msg = (e?.message ?? '').toLowerCase();

  if (msg.includes('looks like playwright was just installed') || msg.includes('playwright install')) {
    return 'Chromium browser is not installed. Run "npx playwright install chromium" on the server, then restart.';
  }
  if (msg.includes("executable doesn't exist") || msg.includes('executable does not exist') || msg.includes('enoent')) {
    return 'Chromium executable is missing. Run "npx playwright install chromium" or install a system Chromium.';
  }
  if (msg.includes('eacces') || msg.includes('permission denied')) {
    return 'Permission denied when launching Chromium. Check that the executable is readable and executable.';
  }
  if (msg.includes('missing') && (msg.includes('library') || msg.includes('shared object') || msg.includes('.so'))) {
    return `Missing Linux library required by Chromium: ${e?.message ?? 'unknown'}. Install system dependencies with "npx playwright install-deps chromium".`;
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return 'Browser launch timed out. The server may be under heavy load.';
  }
  if (msg.includes('target closed') || msg.includes('browser closed') || msg.includes('disconnected')) {
    return 'Browser closed unexpectedly during launch. Check available memory and system resources.';
  }
  return `Failed to launch browser: ${e?.message ?? 'Unknown error'}`;
}

// ── Path resolution ─────────────────────────────────────────────────────────

async function fileExists(path: string): Promise<boolean> {
  try {
    const fs = await import('fs');
    return fs.existsSync(path);
  } catch {
    return false;
  }
}

/**
 * Resolve the Chromium executable path using the ordered fallback chain:
 *   a. PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH env var
 *   b. Playwright's bundled chromium executable
 *   c. /usr/bin/chromium
 *   d. /usr/bin/chromium-browser
 *   e. /usr/bin/google-chrome
 *   f. /usr/bin/google-chrome-stable
 *
 * Returns { path, source } or null if no executable was found.
 */
async function resolveChromiumPath(): Promise<{ path: string; source: 'playwright' | 'system' } | null> {
  // a. Environment variable
  const envPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  if (envPath && await fileExists(envPath)) {
    return { path: envPath, source: 'playwright' };
  }

  // b. Playwright's bundled chromium
  try {
    const fs = await import('fs');
    const localBrowserPath = `${process.cwd()}/node_modules/playwright-core/.local-browsers`;
    if (fs.existsSync(localBrowserPath)) {
      const dirs = fs.readdirSync(localBrowserPath);
      const chromiumDir = dirs.find((d) => d.startsWith('chromium-'));
      if (chromiumDir) {
        const execPath = `${localBrowserPath}/${chromiumDir}/chrome-linux64/chrome`;
        if (fs.existsSync(execPath)) {
          return { path: execPath, source: 'playwright' };
        }
      }
    }
  } catch { /* ignore */ }

  // c–f. System Chromium paths
  for (const candidate of SYSTEM_CHROMIUM_PATHS) {
    if (await fileExists(candidate)) {
      return { path: candidate, source: 'system' };
    }
  }

  return null;
}

// ── Browser launch ──────────────────────────────────────────────────────────

/**
 * Shared browser launch function used by checkBrowser(), handleExportRequest(),
 * local dev, and Netlify. Tries executables in order and logs the selected path.
 */
export async function launchBrowser(): Promise<Browser> {
  const { chromium } = await import('playwright');

  // Remote Chromium via CDP (production)
  const wsEndpoint = process.env.BROWSER_WS_ENDPOINT;
  if (wsEndpoint) {
    try {
      console.log('[PPTX] Connecting to remote browser:', wsEndpoint);
      return await chromium.connectOverCDP(wsEndpoint);
    } catch (e: any) {
      throw new BrowserLaunchError(`Cannot connect to remote browser at ${wsEndpoint}: ${e.message}`);
    }
  }

  const resolved = await resolveChromiumPath();
  if (!resolved) {
    throw new BrowserLaunchError(
      'No Chromium executable found. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, run "npx playwright install chromium", or install a system Chromium.',
    );
  }

  console.log('[PPTX] Chromium path:', resolved.path);

  try {
    return await chromium.launch({
      executablePath: resolved.path,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
  } catch (e: any) {
    throw new BrowserLaunchError(classifyLaunchError(e));
  }
}

// ── Preflight check ─────────────────────────────────────────────────────────

/**
 * Preflight check: launch a browser, open about:blank, close it.
 * Returns the executable path and source so the client can verify
 * that the export will use the same binary.
 */
export async function checkBrowser(): Promise<BrowserCheckResult> {
  let browser: Browser;
  try {
    browser = await launchBrowser();
  } catch (e: any) {
    return { ok: false, error: e instanceof BrowserLaunchError ? e.message : classifyLaunchError(e) };
  }

  try {
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.close();
    await browser.close();
  } catch (e: any) {
    try { await browser.close(); } catch { /* ignore */ }
    return { ok: false, error: classifyLaunchError(e) };
  }

  // Report the path that was used
  const resolved = await resolveChromiumPath();
  return {
    ok: true,
    executablePath: resolved?.path,
    source: resolved?.source,
  };
}

// ── Slide capture ───────────────────────────────────────────────────────────

/**
 * Capture a single slide as a PNG buffer.
 * Opens the page with ?slide=<key>&export=1, waits for data-export-ready="true",
 * then screenshots only the [data-export-slide="true"] element.
 */
export async function captureSlide(
  browser: Browser,
  baseUrl: string,
  slideKey: string,
): Promise<Buffer> {
  const context = await browser.newContext({
    viewport: { width: VIEWPORT_W, height: VIEWPORT_H },
    deviceScaleFactor: 1,
    animations: 'disabled',
  } as any);
  const page = await context.newPage();

  const url = `${baseUrl}?slide=${encodeURIComponent(slideKey)}&export=1`;

  try {
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: SCREENSHOT_TIMEOUT,
    });

    // Wait for fonts
    await page.evaluate(() => (document as any).fonts.ready);

    // Wait for data-export-ready="true"
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-export-slide="true"]');
        return el?.getAttribute('data-export-ready') === 'true';
      },
      { timeout: READY_TIMEOUT },
    );

    // Two requestAnimationFrame cycles
    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));

    // Capture only the slide element
    const locator = page.locator('[data-export-slide="true"]');
    const pngBuffer = await locator.screenshot({
      type: 'png',
      timeout: SCREENSHOT_TIMEOUT,
    });

    return pngBuffer as unknown as Buffer;
  } finally {
    await page.close();
    await context.close();
  }
}

// ── PPTX assembly ───────────────────────────────────────────────────────────

/**
 * Capture all slides in order and build a PptxGenJS presentation.
 * Each slide PNG is inserted edge-to-edge at 0,0 → 13.333×7.5 inches.
 */
export async function buildPptx(
  browser: Browser,
  baseUrl: string,
  slideKeys: string[],
): Promise<Buffer> {
  const pptx = new PptxGen();
  pptx.layout = 'LAYOUT_WIDE';

  for (const key of slideKeys) {
    const pngBuffer = await captureSlide(browser, baseUrl, key);
    const dataUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`;
    const slide = pptx.addSlide();
    slide.addImage({
      data: dataUrl,
      x: 0,
      y: 0,
      w: PPTX_W,
      h: PPTX_H,
    });
  }

  const result = await pptx.write({ outputType: 'nodebuffer' });
  return result as Buffer;
}

export async function handleExportRequest(body: ExportRequest): Promise<ExportResult> {
  if (!body.baseUrl) throw new Error('baseUrl is required');
  if (!body.slides || !Array.isArray(body.slides) || body.slides.length === 0) {
    throw new Error('slides array is required');
  }

  const browser = await launchBrowser();
  try {
    const buffer = await buildPptx(browser, body.baseUrl, body.slides);
    return {
      buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      filename: 'TSS-Maintenance-Monthly-Meeting.pptx',
    };
  } finally {
    await browser.close();
  }
}
