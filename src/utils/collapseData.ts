import { FleetEntry, LocationData, MatrixEntry, Month, MonthlyTrendData, OverallSummaryData, QUARTER_MONTHS, Quarter, TrendlineData } from '../types/dashboard';

const QUARTER_ORDER: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

function monthToQuarter(month: Month): Quarter {
  for (const [q, ms] of Object.entries(QUARTER_MONTHS) as [Quarter, Month[]][]) {
    if (ms.includes(month)) return q;
  }
  return 'Q1';
}

// Today's calendar quarter — completed quarters are those before this.
function todaysQuarter(): { year: number; quarter: Quarter } {
  const now = new Date();
  const m = now.getMonth();
  const q: Quarter = m < 3 ? 'Q1' : m < 6 ? 'Q2' : m < 9 ? 'Q3' : 'Q4';
  return { year: now.getFullYear(), quarter: q };
}

// A quarter is active (stays expanded) if it is the last quarter present in the
// dataset OR if it is >= today's calendar quarter.
// This prevents collapsing the most recent data quarter even when it's "past".
function isActiveQuarter(dataYear: number, q: Quarter, presentQuarters?: Quarter[]): boolean {
  // Always keep the latest quarter in the dataset expanded
  if (presentQuarters && presentQuarters.length > 0) {
    const latestIdx = Math.max(...presentQuarters.map((pq) => QUARTER_ORDER.indexOf(pq)));
    if (QUARTER_ORDER.indexOf(q) === latestIdx) return true;
  }
  const today = todaysQuarter();
  if (dataYear > today.year) return true;
  if (dataYear < today.year) return false;
  return QUARTER_ORDER.indexOf(q) >= QUARTER_ORDER.indexOf(today.quarter);
}

// ── helpers ──────────────────────────────────────────────────────────────────

function sumNullable(vals: (number | null)[]): number | null {
  const nums = vals.filter((v) => v !== null) as number[];
  return nums.length ? nums.reduce((a, b) => a + b, 0) : null;
}

function avgNullable(vals: (number | null)[]): number | null {
  const nums = vals.filter((v) => v !== null) as number[];
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null;
}

function lastNullable(vals: (number | null)[]): number | null {
  for (let i = vals.length - 1; i >= 0; i--) {
    if (vals[i] !== null) return vals[i];
  }
  return null;
}

// Build quarter groups from a month list, preserving order
function buildGroups(months: Month[]): Map<Quarter, Month[]> {
  const groups = new Map<Quarter, Month[]>();
  for (const m of months) {
    const q = monthToQuarter(m);
    if (!groups.has(q)) groups.set(q, []);
    groups.get(q)!.push(m);
  }
  return groups;
}

// ── per-structure collapse functions ─────────────────────────────────────────

function collapseMonthLabels(months: Month[], dataYear: number): (Month | Quarter)[] {
  const groups = buildGroups(months);
  const presentQuarters = [...groups.keys()];
  const out: (Month | Quarter)[] = [];
  for (const q of QUARTER_ORDER) {
    const ms = groups.get(q);
    if (!ms) continue;
    if (isActiveQuarter(dataYear, q, presentQuarters)) out.push(...ms);
    else out.push(q);
  }
  return out;
}

function collapseMatrix(data: MatrixEntry[], months: Month[], dataYear: number): MatrixEntry[] {
  const groups = buildGroups(months);
  const presentQuarters = [...groups.keys()];
  return data.map((row) => {
    const outRow: any = { customer: row.customer };
    for (const q of QUARTER_ORDER) {
      const ms = groups.get(q);
      if (!ms) continue;
      if (isActiveQuarter(dataYear, q, presentQuarters)) {
        for (const m of ms) outRow[m.toLowerCase()] = (row as any)[m.toLowerCase()];
      } else {
        const vals = ms.map((m) => (row as any)[m.toLowerCase()] as number | null);
        outRow[q.toLowerCase()] = sumNullable(vals);
      }
    }
    return outRow as MatrixEntry;
  });
}

function collapseFleet(data: FleetEntry[], months: Month[], dataYear: number): FleetEntry[] {
  const groups = buildGroups(months);
  const presentQuarters = [...groups.keys()];
  return data.map((row) => {
    const outRow: any = { customer: row.customer };
    for (const q of QUARTER_ORDER) {
      const ms = groups.get(q);
      if (!ms) continue;
      if (isActiveQuarter(dataYear, q, presentQuarters)) {
        for (const m of ms) outRow[m.toLowerCase()] = (row as any)[m.toLowerCase()];
      } else {
        const vals = ms.map((m) => (row as any)[m.toLowerCase()] as number | null);
        outRow[q.toLowerCase()] = lastNullable(vals);
      }
    }
    return outRow as FleetEntry;
  });
}

function collapseMonthlyTrend(data: MonthlyTrendData[], months: Month[], dataYear: number): MonthlyTrendData[] {
  const groups = buildGroups(months);
  const presentQuarters = [...groups.keys()];
  const out: MonthlyTrendData[] = [];
  for (const q of QUARTER_ORDER) {
    const ms = groups.get(q);
    if (!ms) continue;
    if (isActiveQuarter(dataYear, q, presentQuarters)) {
      out.push(...data.filter((d) => ms.includes(d.month as Month)));
    } else {
      const rows = data.filter((d) => ms.includes(d.month as Month));
      out.push({
        month: q,
        productivity: avgNullable(rows.map((r) => r.productivity)),
        efficiency: avgNullable(rows.map((r) => r.efficiency)),
        utilization: avgNullable(rows.map((r) => r.utilization)),
      });
    }
  }
  return out;
}

function collapseTrendline(data: TrendlineData[], months: Month[], dataYear: number, mode: 'sum' | 'avg' | 'last' = 'sum'): TrendlineData[] {
  const groups = buildGroups(months);
  const presentQuarters = [...groups.keys()];
  const out: TrendlineData[] = [];
  for (const q of QUARTER_ORDER) {
    const ms = groups.get(q);
    if (!ms) continue;
    if (isActiveQuarter(dataYear, q, presentQuarters)) {
      out.push(...data.filter((d) => ms.includes(d.month as Month)));
    } else {
      const vals = data.filter((d) => ms.includes(d.month as Month)).map((r) => r.value);
      const value = mode === 'sum' ? sumNullable(vals) : mode === 'avg' ? avgNullable(vals) : lastNullable(vals);
      out.push({ month: q, value });
    }
  }
  return out;
}

// ── public interfaces & exports ───────────────────────────────────────────────

export interface CollapsedLocationData extends Omit<LocationData, 'months' | 'customerFleet' | 'woCount' | 'stdHours'> {
  months: (Month | Quarter)[];
  customerFleet: FleetEntry[];
  woCount: MatrixEntry[];
  stdHours: MatrixEntry[];
}

export interface CollapsedOverallData extends Omit<OverallSummaryData, 'months' | 'customerFleet' | 'woCount' | 'stdHours'> {
  months: (Month | Quarter)[];
  customerFleet: FleetEntry[];
  woCount: MatrixEntry[];
  stdHours: MatrixEntry[];
}

export function collapseLocationData(loc: LocationData): CollapsedLocationData {
  const { months, year } = loc;
  return {
    ...loc,
    months: collapseMonthLabels(months, year),
    monthlyTrend: collapseMonthlyTrend(loc.monthlyTrend, months, year),
    customerFleet: collapseFleet(loc.customerFleet, months, year),
    woCount: collapseMatrix(loc.woCount, months, year),
    stdHours: collapseMatrix(loc.stdHours, months, year),
    trendlineWoCount: collapseTrendline(loc.trendlineWoCount, months, year, 'sum'),
    trendlineStdHours: collapseTrendline(loc.trendlineStdHours, months, year, 'sum'),
    trendlineInsurance: collapseTrendline(loc.trendlineInsurance, months, year, 'sum'),
    trendlineExternalSales: collapseTrendline(loc.trendlineExternalSales, months, year, 'sum'),
    trendlineWarrantyClaims: collapseTrendline(loc.trendlineWarrantyClaims, months, year, 'sum'),
    trendlineWashCount: collapseTrendline(loc.trendlineWashCount, months, year, 'sum'),
  };
}

export function collapseOverallData(overall: OverallSummaryData): CollapsedOverallData {
  const { months, year } = overall;
  return {
    ...overall,
    months: collapseMonthLabels(months, year),
    monthlyTrend: collapseMonthlyTrend(overall.monthlyTrend, months, year),
    customerFleet: collapseFleet(overall.customerFleet, months, year),
    woCount: collapseMatrix(overall.woCount, months, year),
    stdHours: collapseMatrix(overall.stdHours, months, year),
    trendlineWoCount: collapseTrendline(overall.trendlineWoCount, months, year, 'sum'),
    trendlineStdHours: collapseTrendline(overall.trendlineStdHours, months, year, 'sum'),
    trendlineInsurance: collapseTrendline(overall.trendlineInsurance, months, year, 'sum'),
    trendlineExternalSales: collapseTrendline(overall.trendlineExternalSales, months, year, 'sum'),
    trendlineWarrantyClaims: collapseTrendline(overall.trendlineWarrantyClaims, months, year, 'sum'),
    trendlineWashCount: collapseTrendline(overall.trendlineWashCount, months, year, 'sum'),
  };
}
