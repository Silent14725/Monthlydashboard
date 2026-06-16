import { useState } from 'react';
import html2canvas from 'html2canvas';
import pptxgen from 'pptxgenjs';
import { Download, FileImage, Presentation, FileText } from 'lucide-react';

const SLIDE_IDS = [
  'slide-cover',
  'slide-overall',
  'slide-riyadh',
  'slide-jeddah',
  'slide-makkah',
  'slide-taif',
  'slide-madinah',
  'slide-dammam',
  'slide-hofouf',
  'slide-assir',
  'slide-qassim',
  'slide-jazan',
  'slide-riyadh-refurbishment',
  'slide-thankyou',
];

async function captureSlide(id: string): Promise<string | null> {
  const el = document.getElementById(id);
  if (!el) return null;
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });
  return canvas.toDataURL('image/png');
}

interface Props {
  activeSlide: string;
}

export function ExportButtons({ activeSlide }: Props) {
  const [loading, setLoading] = useState<'pdf' | 'pptx' | 'image' | null>(null);

  const exportImage = async () => {
    setLoading('image');
    try {
      const dataUrl = await captureSlide(activeSlide);
      if (!dataUrl) return;
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${activeSlide}.png`;
      a.click();
    } finally {
      setLoading(null);
    }
  };

  const exportPDF = async () => {
    setLoading('pdf');
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1280, 720] });
      let first = true;
      for (const id of SLIDE_IDS) {
        const dataUrl = await captureSlide(id);
        if (!dataUrl) continue;
        if (!first) pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, 0, 1280, 720);
        first = false;
      }
      pdf.save('TSS-Maintenance-Monthly-Meeting-Q1-2026.pdf');
    } catch (e) {
      console.error('PDF export failed', e);
    } finally {
      setLoading(null);
    }
  };

  const exportPPTX = async () => {
    setLoading('pptx');
    try {
      const pptx = new pptxgen();
      pptx.layout = 'LAYOUT_WIDE';
      for (const id of SLIDE_IDS) {
        const dataUrl = await captureSlide(id);
        if (!dataUrl) continue;
        const slide = pptx.addSlide();
        slide.addImage({ data: dataUrl, x: 0, y: 0, w: '100%', h: '100%' });
      }
      await pptx.writeFile({ fileName: 'TSS-Maintenance-Monthly-Meeting-Q1-2026.pptx' });
    } catch (e) {
      console.error('PPTX export failed', e);
    } finally {
      setLoading(null);
    }
  };

  const btnClass =
    'flex items-center gap-1.5 px-3 py-1.5 rounded text-white text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50';

  return (
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
  );
}
