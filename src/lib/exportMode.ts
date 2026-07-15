import { useEffect, useState } from 'react';

export const EXPORT_SLIDE_W = 1600;
export const EXPORT_SLIDE_H = 900;

export interface ExportParams {
  isExportMode: boolean;
  slideKey: string | null;
}

export function readExportParams(): ExportParams {
  if (typeof window === 'undefined') {
    return { isExportMode: false, slideKey: null };
  }
  const params = new URLSearchParams(window.location.search);
  const exportFlag = params.get('export');
  const slideKey = params.get('slide');
  return {
    isExportMode: exportFlag === '1',
    slideKey,
  };
}

export function useExportParams(): ExportParams {
  const [params, setParams] = useState<ExportParams>(() => readExportParams());

  useEffect(() => {
    const onPop = () => setParams(readExportParams());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return params;
}
