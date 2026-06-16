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

type AppView = 'dashboard' | 'data';

function Dashboard() {
  const { data, isLoading, isSampleData } = useData();
  const { collapsed, setCollapsed } = useCollapse();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [appView, setAppView] = useState<AppView>('dashboard');
  const [scale, setScale] = useState(1);
  const viewerRef = useRef<HTMLDivElement>(null);

  // Dynamic slides built from actual locations in data
  const SLIDES = useMemo(() => [
    { id: 'slide-cover', label: 'Cover' },
    { id: 'slide-overall', label: 'Overall Summary' },
    ...data.locations.map((loc) => ({
      id: `slide-${loc.location.toLowerCase().replace(/\s+/g, '-')}`,
      label: loc.location,
    })),
    { id: 'slide-thankyou', label: 'Thank You' },
  ], [data.locations]);

  const updateScale = useCallback(() => {
    if (!viewerRef.current) return;
    const { width, height } = viewerRef.current.getBoundingClientRect();
    const scaleX = (width * 0.97) / SLIDE_W;
    const scaleY = (height * 0.97) / SLIDE_H;
    setScale(Math.min(scaleX, scaleY));
  }, []);

  useEffect(() => {
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (viewerRef.current) ro.observe(viewerRef.current);
    return () => ro.disconnect();
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

  const goNext = () => setCurrentSlide((s) => Math.min(s + 1, SLIDES.length - 1));
  const goPrev = () => setCurrentSlide((s) => Math.max(s - 1, 0));

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

  // Loading screen while Supabase initialises
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
          className="flex items-center justify-between px-6 py-3 shadow-md"
          style={{ backgroundColor: '#66003C' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAppView('dashboard')}
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-semibold transition-colors"
            >
              <LayoutDashboard size={16} />
              Dashboard
            </button>
            <span className="text-white/40">|</span>
            <span className="text-white font-semibold text-sm flex items-center gap-1.5">
              <Database size={16} />
              Data Management
            </span>
          </div>
        </nav>
        <DataManagementPage />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-100">
      {/* Top navigation bar */}
      <nav
        className="flex items-center justify-between px-4 py-2 shadow-md"
        style={{ backgroundColor: '#66003C' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-white font-black text-sm tracking-wide">
            TSS Maintenance Monthly Meeting
          </span>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
          >
            {data.displayPeriod ?? `${data.quarter}-${data.year}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Quarter collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded border transition-colors ${
              collapsed
                ? 'bg-white text-rose-900 border-white'
                : 'text-white/80 hover:text-white border-white/30 hover:border-white/60'
            }`}
            title={collapsed ? 'Expand all months' : 'Collapse completed quarters'}
          >
            <ChevronsLeftRight size={13} />
            {collapsed ? 'Expand Months' : 'Collapse Quarters'}
          </button>
          <ExportButtons activeSlide={SLIDES[currentSlide].id} />
          <button
            onClick={() => setAppView('data')}
            className="flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-semibold transition-colors px-2 py-1 rounded border border-white/30 hover:border-white/60"
          >
            <Database size={13} />
            Data
          </button>
        </div>
      </nav>

      {/* Slide tabs */}
      <div
        className="flex items-center gap-0.5 px-4 py-1.5 overflow-x-auto"
        style={{ backgroundColor: '#5a0f24' }}
      >
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setCurrentSlide(i)}
            className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
              i === currentSlide
                ? 'bg-white text-rose-900'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Slide viewer — fills remaining height, scales slide to fit */}
      <div ref={viewerRef} className="flex-1 flex items-center justify-center overflow-hidden" style={{ minHeight: 0 }}>
        <div
          style={{
            width: `${SLIDE_W}px`,
            height: `${SLIDE_H}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            flexShrink: 0,
          }}
        >
          <div className="relative bg-white shadow-2xl rounded overflow-hidden w-full h-full">
            {renderSlide(currentSlide)}
          </div>
        </div>
      </div>

      {/* Navigation controls */}
      <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: '#f3f4f6', flexShrink: 0 }}>
        <button
          onClick={goPrev}
          disabled={currentSlide === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-semibold transition-all disabled:opacity-30"
          style={{ backgroundColor: '#66003C', color: 'white' }}
        >
          <ChevronLeft size={16} />
          Previous
        </button>
        <span className="text-sm text-gray-500">
          {currentSlide + 1} / {SLIDES.length} — <span className="font-semibold text-gray-700">{SLIDES[currentSlide].label}</span>
        </span>
        <button
          onClick={goNext}
          disabled={currentSlide === SLIDES.length - 1}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-semibold transition-all disabled:opacity-30"
          style={{ backgroundColor: '#66003C', color: 'white' }}
        >
          Next
          <ChevronRight size={16} />
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
