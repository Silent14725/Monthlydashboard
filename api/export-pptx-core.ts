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

const VIEWPORT_W = 1600;
const VIEWPORT_H = 900;
const PPTX_W = 13.333;
const PPTX_H = 7.5;

const SCREENSHOT_TIMEOUT = 30000;
const READY_TIMEOUT = 30000;

/**
 * Launch a browser. In local dev, Playwright's bundled Chromium is used.
 * In production, set BROWSER_WS_ENDPOINT to connect to a remote Chromium
 * (e.g. Browserless, Chrome for Testing on a VM, etc.).
 *
 * If the bundled Chromium is not installed (common in CI/sandbox), falls
 * back to a system Chromium at /usr/bin/chromium.
 */
export async function launchBrowser(): Promise<Browser> {
  const { chromium } = await import('playwright');
  const wsEndpoint = process.env.BROWSER_WS_ENDPOINT;
  if (wsEndpoint) {
    return chromium.connectOverCDP(wsEndpoint);
  }

  const launchOptions: Parameters<typeof chromium.launch>[0] = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
    ],
  };

  // Use system Chromium if the Playwright-bundled browser is not available
  if (!process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD) {
    try {
      const fs = await import('fs');
      const localBrowserPath = `${process.cwd()}/node_modules/playwright-core/.local-browsers`;
      if (fs.existsSync(localBrowserPath)) {
        const dirs = fs.readdirSync(localBrowserPath);
        const chromiumDir = dirs.find((d) => d.startsWith('chromium-'));
        if (chromiumDir) {
          const execPath = `${localBrowserPath}/${chromiumDir}/chrome-linux64/chrome`;
          if (fs.existsSync(execPath)) {
            launchOptions.executablePath = execPath;
          }
        }
      }
    } catch { /* ignore — fall through to system chromium */ }
  }

  // Fallback to system Chromium if no bundled browser found
  if (!launchOptions.executablePath) {
    const fs = await import('fs');
    for (const candidate of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) {
      if (fs.existsSync(candidate)) {
        launchOptions.executablePath = candidate;
        break;
      }
    }
  }

  return chromium.launch(launchOptions);
}

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
