import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { DashboardData, LocationData, UploadedRow, Quarter, Month } from '../types/dashboard';
import { sampleData } from '../data/sampleData';
import { normalizeMonth, sortMonths, deriveQuarter, buildDisplayPeriod } from '../utils/monthUtils';
import { getActiveDataset, saveDataset } from '../services/supabaseService';

interface DataContextValue {
  data: DashboardData;
  activeYear: number;
  activeQuarter: Quarter;
  setActiveYear: (y: number) => void;
  setActiveQuarter: (q: Quarter) => void;
  uploadExcel: (file: File) => Promise<void>;
  uploadError: string | null;
  rawRows: UploadedRow[];
  uploadedFileName: string | null;
  lastUpdated: Date | null;
  isLoading: boolean;
  isSampleData: boolean;
  datasetId: string | null;
  totalRecords: number;
  refreshFromSupabase: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

// ── Month utilities ───────────────────────────────────────────────────────────

function uniqueMonthsFromRows(rows: any[], key = 'Month'): Month[] {
  const raw = rows.map((r) => normalizeMonth(r[key])).filter(Boolean) as Month[];
  return sortMonths([...new Set(raw)]);
}

// ── New 4-sheet format parser ─────────────────────────────────────────────────
function parseNewFormat(wb: XLSX.WorkBook, prevData: DashboardData): DashboardData {
  const readSheet = (name: string): any[] => {
    const ws = wb.Sheets[name];
    return ws ? XLSX.utils.sheet_to_json(ws, { defval: null }) : [];
  };

  const s1: any[] = readSheet('Location Monthly Metrics');
  const s2: any[] = readSheet('Customer WO & Hours');
  const s3: any[] = readSheet('Manpower');
  const s4: any[] = readSheet('Recovery Fleet');

  if (!s1.length) throw new Error('Sheet "Location Monthly Metrics" is empty or missing.');

  const firstRow = s1[0];
  const year: number = Number(firstRow.Year) || prevData.year;

  // Derive months from ALL data rows (supports any quarter, multi-quarter)
  const globalMonths = uniqueMonthsFromRows(s1);
  if (!globalMonths.length) throw new Error('No valid months found in "Location Monthly Metrics".');
  const quarter = deriveQuarter(globalMonths);

  const locationNames = [...new Set(s1.map((r) => r.Location).filter(Boolean))] as string[];

  const locations: LocationData[] = locationNames.map((location) => {
    const r1 = s1.filter((r) => r.Location === location);
    const r2 = s2.filter((r) => r.Location === location);
    const r3 = s3.filter((r) => r.Location === location);
    const r4 = s4.find((r) => r.Location === location);

    // Use months present for this specific location
    const locMonths = uniqueMonthsFromRows(r1);

    const monthlyTrend = locMonths.map((m) => {
      const r = r1.find((x) => normalizeMonth(x.Month) === m);
      return {
        month: m,
        productivity: r?.Productivity ?? null,
        efficiency: r?.Efficiency ?? null,
        utilization: r?.Utilization ?? null,
      };
    });

    const makeTrendline = (col: string) =>
      locMonths.map((m) => {
        const r = r1.find((x) => normalizeMonth(x.Month) === m);
        return { month: m, value: r?.[col] ?? null };
      });

    const customers = [...new Set(r2.map((r) => r.Customer).filter(Boolean))] as string[];

    const buildMatrix = (key: string) =>
      customers.map((c) => {
        const entry: any = { customer: c };
        for (const m of locMonths) {
          const r = r2.find((x) => x.Customer === c && normalizeMonth(x.Month) === m);
          entry[m.toLowerCase()] = r ? (r[key] ?? null) : null;
        }
        return entry;
      });

    const trendlineWoCount = locMonths.map((m) => ({
      month: m,
      value:
        r2
          .filter((r) => normalizeMonth(r.Month) === m)
          .reduce((sum, r) => sum + (r['WO Count'] ?? 0), 0) || null,
    }));

    const manpower = r3.map((r) => ({ category: r.Category as string, count: r.Count ?? 0 }));
    const workshopFleet = { mobileWorkshop: r4?.['Mobile Workshop'] ?? 0, winch: r4?.Winch ?? 0 };

    return {
      location,
      year,
      quarter,
      months: locMonths,
      monthlyTrend,
      manpower,
      workshopFleet,
      customerFleet: buildMatrix('Fleet Count'),
      woCount: buildMatrix('WO Count'),
      stdHours: buildMatrix('Customer Standard Hours'),
      trendlineWoCount,
      trendlineStdHours: makeTrendline('Location Standard Hours'),
      trendlineInsurance: makeTrendline('Insurance'),
      trendlineExternalSales: makeTrendline('External Sales'),
      trendlineWarrantyClaims: makeTrendline('Warranty Claims'),
      trendlineWashCount: makeTrendline('Wash Count'),
    };
  });

  return buildDashboardData(locations, year, quarter, globalMonths, prevData);
}

// ── Legacy single-sheet format parser ────────────────────────────────────────
function parseLegacyFormat(
  wb: XLSX.WorkBook,
  prevData: DashboardData,
): { newData: DashboardData; rawRows: UploadedRow[] } {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: UploadedRow[] = XLSX.utils.sheet_to_json(ws, { defval: null });

  if (!rows.length) throw new Error('No data found in the uploaded file.');

  const requiredColumns: (keyof UploadedRow)[] = [
    'Year', 'Quarter', 'Month', 'Location', 'Customer',
    'Productivity', 'Efficiency', 'Utilization', 'WO Count', 'Standard Hours',
    'Manpower Category', 'Manpower Count', 'Mobile Workshop Count', 'Winch Count',
    'Customer Fleet Count', 'Insurance', 'External Sales', 'Warranty Claims', 'Wash Count',
  ];
  const firstRowKeys = Object.keys(rows[0]);
  const missing = requiredColumns.filter((c) => !firstRowKeys.includes(c));
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(', ')}`);

  const year: number = Number(rows[0].Year) || prevData.year;

  // Derive months from ALL rows (supports any quarter combination)
  const globalMonths = sortMonths(
    [...new Set(rows.map((r) => normalizeMonth(r.Month)).filter(Boolean) as Month[])]
  );
  if (!globalMonths.length) throw new Error('No valid months found in uploaded data.');
  const quarter = deriveQuarter(globalMonths);

  const locationMap = new Map<string, UploadedRow[]>();
  for (const row of rows) {
    const loc = row.Location || 'Unknown';
    if (!locationMap.has(loc)) locationMap.set(loc, []);
    locationMap.get(loc)!.push(row);
  }

  const locations: LocationData[] = [];
  locationMap.forEach((locRows, location) => {
    const locMonths = sortMonths(
      [...new Set(locRows.map((r) => normalizeMonth(r.Month)).filter(Boolean) as Month[])]
    );

    const monthlyTrend = locMonths.map((m) => {
      const r = locRows.find((x) => normalizeMonth(x.Month) === m);
      return {
        month: m,
        productivity: r?.Productivity ?? null,
        efficiency: r?.Efficiency ?? null,
        utilization: r?.Utilization ?? null,
      };
    });

    const manpowerCategories = [...new Set(locRows.map((r) => r['Manpower Category']).filter(Boolean))];
    const manpower = manpowerCategories.map((cat) => {
      const r = locRows.find((x) => x['Manpower Category'] === cat);
      return { category: cat as string, count: r?.['Manpower Count'] ?? 0 };
    });

    const mwRow = locRows[0];
    const workshopFleet = { mobileWorkshop: mwRow?.['Mobile Workshop Count'] ?? 0, winch: mwRow?.['Winch Count'] ?? 0 };

    const customers = [...new Set(locRows.map((r) => r.Customer).filter(Boolean))] as string[];

    const customerFleet = customers.map((c) => {
      const entry: any = { customer: c };
      for (const m of locMonths) {
        const r = locRows.find((x) => x.Customer === c && normalizeMonth(x.Month) === m);
        entry[m.toLowerCase()] = r?.['Customer Fleet Count'] ?? null;
      }
      return entry;
    });

    const buildMatrix = (locRows: UploadedRow[], key: keyof UploadedRow) =>
      customers.map((c) => {
        const entry: any = { customer: c };
        for (const m of locMonths) {
          const r = locRows.find((x) => x.Customer === c && normalizeMonth(x.Month) === m);
          entry[m.toLowerCase()] = r ? (r[key] as number | null) ?? null : null;
        }
        return entry;
      });

    const makeTrendline = (key: keyof UploadedRow) =>
      locMonths.map((m) => {
        const r = locRows.find((x) => normalizeMonth(x.Month) === m);
        return { month: m, value: r ? (r[key] as number | null) ?? null : null };
      });

    locations.push({
      location, year, quarter, months: locMonths,
      monthlyTrend, manpower, workshopFleet, customerFleet,
      woCount: buildMatrix(locRows, 'WO Count'),
      stdHours: buildMatrix(locRows, 'Standard Hours'),
      trendlineWoCount: locMonths.map((m) => ({
        month: m,
        value: locRows.filter((r) => normalizeMonth(r.Month) === m).reduce((s, r) => s + (r['WO Count'] ?? 0), 0) || null,
      })),
      trendlineStdHours: makeTrendline('Standard Hours'),
      trendlineInsurance: makeTrendline('Insurance'),
      trendlineExternalSales: makeTrendline('External Sales'),
      trendlineWarrantyClaims: makeTrendline('Warranty Claims'),
      trendlineWashCount: makeTrendline('Wash Count'),
    });
  });

  return { newData: buildDashboardData(locations, year, quarter, globalMonths, prevData), rawRows: rows };
}

// ── Overall aggregation ───────────────────────────────────────────────────────
function buildDashboardData(
  locations: LocationData[],
  year: number,
  quarter: Quarter,
  months: Month[],
  prevData: DashboardData,
): DashboardData {
  const overallMonthlyTrend = months.map((m) => {
    const vals = locations.map((l) => l.monthlyTrend.find((t) => t.month === m));
    const avg = (key: 'productivity' | 'efficiency' | 'utilization') => {
      const vs = vals.map((t) => t?.[key]).filter((v): v is number => v != null);
      return vs.length ? Math.round(vs.reduce((a, b) => a + b, 0) / vs.length) : null;
    };
    return { month: m, productivity: avg('productivity'), efficiency: avg('efficiency'), utilization: avg('utilization') };
  });

  const sumTrendlines = (key: keyof LocationData) =>
    months.map((m) => ({
      month: m,
      value: locations.reduce((sum, l) => {
        const t = (l[key] as { month: string; value: number | null }[]).find((x) => x.month === m);
        return sum + (t?.value ?? 0);
      }, 0) || null,
    }));

  const allCustomers = [
    ...new Set(locations.flatMap((l) => l.woCount.map((r) => r.customer as string))),
  ].filter(Boolean);

  const buildOverallMatrix = (locKey: 'woCount' | 'stdHours' | 'customerFleet') =>
    allCustomers.map((c) => {
      const entry: any = { customer: c };
      for (const m of months) {
        const total = locations.reduce((sum, l) => {
          const row = (l[locKey] as any[]).find((r) => r.customer === c);
          return sum + (row ? (row[m.toLowerCase()] ?? 0) : 0);
        }, 0);
        entry[m.toLowerCase()] = total || null;
      }
      return entry;
    });

  const overallManpower = (() => {
    const cats = [...new Set(locations.flatMap((l) => l.manpower.map((mp) => mp.category)))];
    return cats.map((cat) => ({
      category: cat,
      count: locations.reduce((sum, l) => {
        const mp = l.manpower.find((x) => x.category === cat);
        return sum + (mp?.count ?? 0);
      }, 0),
    }));
  })();

  const overallFleet = {
    mobileWorkshop: locations.reduce((s, l) => s + l.workshopFleet.mobileWorkshop, 0),
    winch: locations.reduce((s, l) => s + l.workshopFleet.winch, 0),
  };

  return {
    year,
    quarter,
    displayPeriod: buildDisplayPeriod(months, year),
    overall: {
      year, quarter, months,
      monthlyTrend: overallMonthlyTrend,
      manpower: overallManpower,
      workshopFleet: overallFleet,
      customerFleet: buildOverallMatrix('customerFleet'),
      woCount: buildOverallMatrix('woCount'),
      stdHours: buildOverallMatrix('stdHours'),
      trendlineWoCount: sumTrendlines('trendlineWoCount'),
      trendlineStdHours: sumTrendlines('trendlineStdHours'),
      trendlineInsurance: sumTrendlines('trendlineInsurance'),
      trendlineExternalSales: sumTrendlines('trendlineExternalSales'),
      trendlineWarrantyClaims: sumTrendlines('trendlineWarrantyClaims'),
      trendlineWashCount: sumTrendlines('trendlineWashCount'),
    },
    locations,
  };
}

// ── Provider ──────────────────────────────────────────────────────────────────

// Recompute overall.monthlyTrend from location data so that stale Supabase
// snapshots are automatically corrected on load without requiring re-upload.
function recomputeOverallTrend(data: DashboardData): DashboardData {
  const { locations, overall } = data;
  const months = overall.months as Month[];
  const monthlyTrend = months.map((m) => {
    const vals = locations.map((l) => l.monthlyTrend.find((t) => t.month === m));
    const avg = (key: 'productivity' | 'efficiency' | 'utilization') => {
      const vs = vals.map((t) => t?.[key]).filter((v): v is number => v != null);
      return vs.length ? Math.round(vs.reduce((a, b) => a + b, 0) / vs.length) : null;
    };
    return { month: m, productivity: avg('productivity'), efficiency: avg('efficiency'), utilization: avg('utilization') };
  });
  return { ...data, overall: { ...overall, monthlyTrend } };
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DashboardData>(sampleData);
  const [activeYear, setActiveYear] = useState(2026);
  const [activeQuarter, setActiveQuarter] = useState<Quarter>('Q1');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [rawRows, setRawRows] = useState<UploadedRow[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSampleData, setIsSampleData] = useState(true);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);

  const applyDashboardData = (dashData: DashboardData, fileName: string | null, recordCount: number, date: Date | null, dsId: string | null) => {
    setData(dashData);
    setUploadedFileName(fileName);
    setLastUpdated(date);
    setDatasetId(dsId);
    setTotalRecords(recordCount);
    setIsSampleData(false);
    setActiveYear(dashData.year);
    setActiveQuarter(dashData.quarter);
  };

  const refreshFromSupabase = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getActiveDataset();
      if (result) {
        applyDashboardData(
          recomputeOverallTrend(result.data),
          result.dataset.uploaded_file_name,
          result.dataset.total_records,
          new Date(result.dataset.upload_date),
          result.dataset.id,
        );
      } else {
        setIsSampleData(true);
      }
    } catch {
      setIsSampleData(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load active dataset from Supabase on mount
  useEffect(() => {
    refreshFromSupabase();
  }, [refreshFromSupabase]);

  const uploadExcel = useCallback(async (file: File) => {
    setUploadError(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });

      let parsedData: DashboardData;
      let parsedRawRows: UploadedRow[] = [];

      if (wb.SheetNames.includes('Location Monthly Metrics')) {
        parsedData = parseNewFormat(wb, data);
      } else {
        const result = parseLegacyFormat(wb, data);
        parsedData = result.newData;
        parsedRawRows = result.rawRows;
      }

      // Save to Supabase (non-blocking on failure — dashboard still updates locally)
      let newDatasetId: string | null = null;
      try {
        newDatasetId = await saveDataset(
          parsedData,
          parsedRawRows,
          file.name,
          file.name.replace(/\.[^/.]+$/, ''),
        );
      } catch (saveErr) {
        console.error('Supabase save failed (data loaded locally):', saveErr);
      }

      applyDashboardData(parsedData, file.name, parsedRawRows.length, new Date(), newDatasetId);
      setRawRows(parsedRawRows);
    } catch (e: any) {
      setUploadError(e?.message ?? 'Failed to parse file. Please check the format and try again.');
    }
  }, [data]);

  return (
    <DataContext.Provider
      value={{
        data, activeYear, activeQuarter, setActiveYear, setActiveQuarter,
        uploadExcel, uploadError, rawRows, uploadedFileName, lastUpdated,
        isLoading, isSampleData, datasetId, totalRecords, refreshFromSupabase,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
