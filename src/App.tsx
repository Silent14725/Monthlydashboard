import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DataProvider, useData } from './context/DataContext';
import { CollapseProvider, useCollapse } from './context/CollapseContext';
import { CoverPage } from './pages/CoverPage';
import { OverallSummaryPage } from './pages/OverallSummaryPage';
import { LocationPage } from './pages/LocationPage';
import { ThankYouPage } from './pages/ThankYouPage';
import { DataManagementPage } from './pages/DataManagementPage';
import { ExportButtons } from './components/export/ExportButtons';
import { ChevronLeft, ChevronRight, Database, LayoutDashboard, ChevronsLeftRight, Loader2 } from 'lucide-react';

// Base slide dimensions (16:9)
const SLIDE_W = 1280;
const SLIDE_H = 720;

// Fixed chrome heights — must match the actual rendered heights below
const NAV_H   = 38;
const TABS_H  = 28;
const FOOT_H  = 36;
const CHROME_H = NAV_H + TABS_H + FOOT_H;

type AppView = 'dashboard' | 'data';

function Dashboard() {
  const { data, isLoading, isSampleData } = useData();
  const { collapsed, setCollapsed } = useCollapse();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [appView, setAppView] = useState<AppView>('dashboard');
  const [scale, setScale] = useState(1);
  // viewerRef kept only for export compatibility — scale now derived from window dimensions
  const viewerRef = useRef<HTMLDivElement>(null);

  const SLIDES = useMemo(() => [
    { id: 'slide-cover', label: 'Cover' },
    { id: 'slide-overall', label: 'Overall Summary' },
    ...data.locations.map((loc) => ({
      id: `slide-${loc.location.toLowerCase().replace(/\s+/g, '-')}`,
      label: loc.location,
    })),
    { id: 'slide-thankyou', label: 'Thank You' },
  ], [data.locations]);

  // Compute scale from window dimensions — avoids getBoundingClientRect() misreads on flex containers
  const updateScale = useCallback(() => {
    const availW = window.innerWidth;
    const availH = window.innerHeight - CHROME_H;
    const scaleX = (availW - 4) / SLIDE_W;
    const scaleY = (availH - 4) / SLIDE_H;
    setScale(Math.min(scaleX, scaleY));
  }, []);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  // Clamp slide index when locations change
  useEffect(() => {
    setCurrentSlide((s) => Math.min(s, SLIDES.length - 1));
  }, [SLIDES.length]);

  // Auto-redirect to data management when no active dataset
  useEffect(() => {
    if (!isLoading && isSampleData) {
      setAppView('data');
    }
  }, [isLoading, isSampleData]);

  const goNext = useCallback(() => setCurrentSlide((s) => Math.min(s + 1, SLIDES.length - 1)), [SLIDES.length]);
  const goPrev = useCallback(() => setCurrentSlide((s) => Math.max(s - 1, 0)), []);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (appView !== 'dashboard') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowLeft'  || e.key === 'PageUp')   { e.preventDefault(); goPrev(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [appView, goNext, goPrev]);

  const renderSlide = (idx: number) => {
    const slide = SLIDES[idx];
    if (!slide) return null;
    if (slide.id === 'slide-cover') return <CoverPage />;
    if (slide.id === 'slide-overall') return <OverallSummaryPage data={data.overall} />;
    if (slide.id === 'slide-thankyou') return <ThankYouPage />;
    const loc = data.locations.find(
      (l) => `slide-${l.location.toLowerCase().replace(/\s+/g, '-')}` === slide.id
    );
    if (loc) return <LocationPage data={loc} pageNumber={idx + 1} slideId={slide.id} />;
    return <div className="flex items-center justify-center h-full text-gray-400">Page not available</div>;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: '#66003C' }}>
        <div className="text-center text-white">
          <Loader2 size={40} className="mx-auto mb-4 animate-spin opacity-80" />
          <p className="text-lg font-semibold opacity-90">Loading dashboard...</p>
          <p className="text-sm opacity-60 mt-1">Connecting to cloud database</p>
        </div>
      </div>
    );
  }

  if (appView === 'data') {
    return (
      <div className="h-full bg-gray-100">
        <nav
          className="flex items-center justify-between px-5 py-2 shadow-md"
          style={{ backgroundColor: '#66003C' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAppView('dashboard')}
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-semibold transition-colors"
            >
              <LayoutDashboard size={15} />
              Dashboard
            </button>
            <span className="text-white/40">|</span>
            <span className="text-white font-semibold text-sm flex items-center gap-1.5">
              <Database size={15} />
              Data Management
            </span>
          </div>
        </nav>
        <DataManagementPage />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: '#0f0f14' }}>

      {/* ── Top navigation bar ─────────────────────────────── */}
      <nav
        className="flex items-center justify-between px-4 shrink-0"
        style={{ backgroundColor: '#66003C', height: '38px' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-white font-black text-sm tracking-wide leading-none">
            TSS Maintenance Monthly Meeting
          </span>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.18)', color: 'white' }}
          >
            {data.displayPeriod ?? `${data.quarter}-${data.year}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border transition-colors ${
              collapsed
                ? 'bg-white text-rose-900 border-white'
                : 'text-white/80 hover:text-white border-white/30 hover:border-white/60'
            }`}
            title={collapsed ? 'Expand all months' : 'Collapse completed quarters'}
          >
            <ChevronsLeftRight size={12} />
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
          <ExportButtons activeSlide={SLIDES[currentSlide].id} />
          <button
            onClick={() => setAppView('data')}
            className="flex items-center gap-1 text-white/80 hover:text-white text-xs font-semibold transition-colors px-2 py-0.5 rounded border border-white/30 hover:border-white/60"
          >
            <Database size={12} />
            Data
          </button>
        </div>
      </nav>

      {/* ── Slide tabs ─────────────────────────────────────── */}
      <div
        className="flex items-center gap-0.5 px-3 shrink-0 overflow-x-auto"
        style={{ backgroundColor: '#4a0a1e', height: '28px' }}
      >
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setCurrentSlide(i)}
            className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors whitespace-nowrap leading-none ${
              i === currentSlide
                ? 'bg-white text-rose-900'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Slide viewer — fills all remaining space ────────── */}
      <div
        ref={viewerRef}
        className="flex-1 relative overflow-hidden"
        style={{ minHeight: 0 }}
      >
        {/* Subtle vignette corners for presentation feel */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 70%, rgba(0,0,0,0.35) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: `${SLIDE_W}px`,
            height: `${SLIDE_H}px`,
            transform: `translate(-50%, -50%) scale(${scale})`,
            transformOrigin: 'center center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div className="bg-white w-full h-full">
            {renderSlide(currentSlide)}
          </div>
        </div>
      </div>

      {/* ── Navigation controls ────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 shrink-0"
        style={{ backgroundColor: '#1a1a24', height: '36px' }}
      >
        <button
          onClick={goPrev}
          disabled={currentSlide === 0}
          className="flex items-center gap-1 px-3 rounded text-xs font-semibold transition-all disabled:opacity-25 hover:opacity-80"
          style={{ backgroundColor: '#66003C', color: 'white', height: '24px' }}
        >
          <ChevronLeft size={14} />
          Previous
        </button>
        <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>
          <span style={{ color: 'rgba(255,255,255,0.9)' }}>{currentSlide + 1}</span>
          <span style={{ color: 'rgba(255,255,255,0.35)' }}> / {SLIDES.length}</span>
          <span className="mx-2" style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>
          <span style={{ color: 'rgba(255,255,255,0.75)' }}>{SLIDES[currentSlide].label}</span>
          <span className="ml-3 hidden sm:inline" style={{ color: 'rgba(255,255,255,0.3)' }}>
            ← → keys
          </span>
        </span>
        <button
          onClick={goNext}
          disabled={currentSlide === SLIDES.length - 1}
          className="flex items-center gap-1 px-3 rounded text-xs font-semibold transition-all disabled:opacity-25 hover:opacity-80"
          style={{ backgroundColor: '#66003C', color: 'white', height: '24px' }}
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <CollapseProvider>
        <Dashboard />
      </CollapseProvider>
    </DataProvider>
  );
}
