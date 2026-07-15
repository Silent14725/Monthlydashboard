import { useState, useCallback, useMemo } from 'react';
import html2canvas from 'html2canvas';
import pptxgen from 'pptxgenjs';
import { FileImage, Presentation, FileText } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { CoverPage } from '../../pages/CoverPage';
import { OverallSummaryPage } from '../../pages/OverallSummaryPage';
import { LocationPage } from '../../pages/LocationPage';
import { ThankYouPage } from '../../pages/ThankYouPage';

// Fixed export dimensions — completely independent of viewport, DPI,
// devicePixelRatio, browser zoom, and Windows display scaling.
// Slides are designed at 1280×720; we capture at scale 1.25 → 1600×900 PNG.
const DESIGN_W = 1280;
const DESIGN_H = 720;
const CAPTURE_SCALE = 1.25; // 1280×1.25=1600, 720×1.25=900

// PowerPoint widescreen slide dimensions (inches)
const PPTX_W = 13.333;
const PPTX_H = 7.5;

async function waitForRenderReady(): Promise<void> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/** Wait until React has committed the off-screen export slides to the DOM. */
async function waitForExportDom(firstId: string, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (document.getElementById(`__export_${firstId}`)) return;
    await new Promise((r) => requestAnimationFrame(r));
  }
}

/**
 * Captures a single slide element (already in the DOM at DESIGN_W × DESIGN_H)
 * as a fixed-dimension PNG. Clones into an off-screen wrapper so the capture is
 * isolated from any transforms/sizing on the live dashboard.
 */
async function captureSlideElement(el: HTMLElement): Promise<string | null> {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = [
    'position: fixed',
    'top: -10000px',
    'left: -10000px',
    `width: ${DESIGN_W}px`,
    `height: ${DESIGN_H}px`,
    'overflow: hidden',
    'z-index: -1',
    'pointer-events: none',
  ].join(';');

  const clone = el.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    await waitForRenderReady();
    const canvas = await html2canvas(wrapper, {
      scale: CAPTURE_SCALE,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: DESIGN_W,
      height: DESIGN_H,
      windowWidth: DESIGN_W,
      windowHeight: DESIGN_H,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
    });
    return canvas.toDataURL('image/png');
  } finally {
    document.body.removeChild(wrapper);
  }
}

interface Props {
  activeSlide: string;
}

export function ExportButtons({ activeSlide }: Props) {
  const { data } = useData();
  const [loading, setLoading] = useState<'pdf' | 'pptx' | 'image' | null>(null);
  const [exporting, setExporting] = useState(false);

  const slides = useMemo(() => {
    const list: { id: string; node: React.ReactNode }[] = [];
    list.push({ id: 'slide-cover', node: <CoverPage /> });
    list.push({ id: 'slide-overall', node: <OverallSummaryPage data={data.overall} /> });
    data.locations.forEach((loc, i) => {
      const slideId = `slide-${loc.location.toLowerCase().replace(/\s+/g, '-')}`;
      list.push({
        id: slideId,
        node: <LocationPage data={loc} pageNumber={i + 2} slideId={slideId} />,
      });
    });
    list.push({ id: 'slide-thankyou', node: <ThankYouPage /> });
    return list;
  }, [data]);

  const captureById = useCallback(async (ids: string[]): Promise<Map<string, string>> => {
    const results = new Map<string, string>();
    for (const id of ids) {
      const el = document.getElementById(`__export_${id}`);
      if (!el) continue;
      const dataUrl = await captureSlideElement(el);
      if (dataUrl) results.set(id, dataUrl);
    }
    return results;
  }, []);

  const exportImage = async () => {
    setLoading('image');
    setExporting(true);
    try {
      await waitForExportDom(activeSlide);
      await waitForRenderReady();
      const results = await captureById([activeSlide]);
      const dataUrl = results.get(activeSlide);
      if (dataUrl) {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${activeSlide}.png`;
        a.click();
      }
    } catch (e) {
      console.error('Image export failed', e);
    } finally {
      setExporting(false);
      setLoading(null);
    }
  };

  const exportPDF = async () => {
    setLoading('pdf');
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const ids = slides.map((s) => s.id);
      await waitForExportDom(ids[0]);
      await waitForRenderReady();
      const results = await captureById(ids);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1600, 900] });
      let first = true;
      for (const id of ids) {
        const dataUrl = results.get(id);
        if (!dataUrl) continue;
        if (!first) pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, 0, 1600, 900);
        first = false;
      }
      pdf.save('TSS-Maintenance-Monthly-Meeting.pdf');
    } catch (e) {
      console.error('PDF export failed', e);
    } finally {
      setExporting(false);
      setLoading(null);
    }
  };

  const exportPPTX = async () => {
    setLoading('pptx');
    setExporting(true);
    try {
      const ids = slides.map((s) => s.id);
      await waitForExportDom(ids[0]);
      await waitForRenderReady();
      const results = await captureById(ids);
      const pptx = new pptxgen();
      pptx.layout = 'LAYOUT_WIDE'; // 13.333 × 7.5 inches
      for (const id of ids) {
        const dataUrl = results.get(id);
        if (!dataUrl) continue;
        const slide = pptx.addSlide();
        slide.addImage({ data: dataUrl, x: 0, y: 0, w: PPTX_W, h: PPTX_H });
      }
      await pptx.writeFile({ fileName: 'TSS-Maintenance-Monthly-Meeting.pptx' });
    } catch (e) {
      console.error('PPTX export failed', e);
    } finally {
      setExporting(false);
      setLoading(null);
    }
  };

  const btnClass =
    'flex items-center gap-1.5 px-3 py-1.5 rounded text-white text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50';

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          className={btnClass}
          style={{ backgroundColor: '#66003C' }}
          onClick={exportImage}
          disabled={loading !== null}
        >
          <FileImage size={14} />
          {loading === 'image' ? 'Capturing…' : 'Export Image'}
        </button>
        <button
          className={btnClass}
          style={{ backgroundColor: '#2D4A6B' }}
          onClick={exportPDF}
          disabled={loading !== null}
        >
          <FileText size={14} />
          {loading === 'pdf' ? 'Generating…' : 'Export PDF'}
        </button>
        <button
          className={btnClass}
          style={{ backgroundColor: '#1a6b4a' }}
          onClick={exportPPTX}
          disabled={loading !== null}
        >
          <Presentation size={14} />
          {loading === 'pptx' ? 'Generating…' : 'Export PPTX'}
        </button>
      </div>

      {/* Off-screen export root: all slides at fixed 1280×720, no transforms.
          Only mounted during export so normal dashboard layout is unaffected. */}
      {exporting && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            top: -10000,
            left: -10000,
            width: 0,
            height: 0,
            overflow: 'hidden',
            zIndex: -1,
            pointerEvents: 'none',
            opacity: 0,
          }}
        >
          {slides.map((s) => (
            <div
              key={s.id}
              id={`__export_${s.id}`}
              style={{ width: `${DESIGN_W}px`, height: `${DESIGN_H}px`, overflow: 'hidden' }}
            >
              {s.node}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
