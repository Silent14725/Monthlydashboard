import fs from 'node:fs';
import { chromium, type Browser } from 'playwright';
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

const SYSTEM_PATHS = [
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
];

// ── Browser launch ──────────────────────────────────────────────────────────

export async function launchBrowser(): Promise<{
  browser: Browser;
  executablePath: string;
  source: 'playwright' | 'system';
}> {
  const envPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const bundledPath = chromium.executablePath();
  const candidates = [
    envPath ? { path: envPath, source: 'system' as const } : null,
    bundledPath && fs.existsSync(bundledPath)
      ? { path: bundledPath, source: 'playwright' as const }
      : null,
    ...SYSTEM_PATHS.map((path) => ({ path, source: 'system' as const })),
  ].filter(
    (item): item is { path: string; source: 'playwright' | 'system' } =>
      Boolean(item),
  );

  const errors: string[] = [];
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate.path)) continue;
    try {
      console.log('[PPTX] Trying Chromium path:', candidate.path);
      const browser = await chromium.launch({
        headless: true,
        executablePath: candidate.path,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });
      console.log('[PPTX] Chromium path:', candidate.path);
      return {
        browser,
        executablePath: candidate.path,
        source: candidate.source,
      };
    } catch (error) {
      errors.push(
        `${candidate.path}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  throw new Error(
    `No usable Chromium browser was found. ${errors.join(' | ')}`,
  );
}

// ── Preflight check ─────────────────────────────────────────────────────────

/**
 * Preflight check: launch a browser, open about:blank, close it.
 * Returns the executable path and source so the client can verify
 * that the export will use the same binary.
 */
export async function checkBrowser(): Promise<BrowserCheckResult> {
  let browser: Browser;
  let executablePath: string;
  let source: 'playwright' | 'system';

  try {
    const result = await launchBrowser();
    browser = result.browser;
    executablePath = result.executablePath;
    source = result.source;
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Failed to launch browser' };
  }

  try {
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.close();
    await browser.close();
  } catch (e: any) {
    try { await browser.close(); } catch { /* ignore */ }
    return { ok: false, error: e?.message ?? 'Browser closed unexpectedly' };
  }

  return {
    ok: true,
    executablePath,
    source,
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

  const { browser } = await launchBrowser();
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
