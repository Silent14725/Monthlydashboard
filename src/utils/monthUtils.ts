import { Month, Quarter, QUARTER_MONTHS } from '../types/dashboard';

export const MONTH_ORDER: Month[] = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// All recognised aliases → canonical Month
const MONTH_ALIASES: Record<string, Month> = {
  jan: 'Jan', january: 'Jan', '01': 'Jan', '1': 'Jan',
  feb: 'Feb', february: 'Feb', '02': 'Feb', '2': 'Feb',
  mar: 'Mar', march: 'Mar', '03': 'Mar', '3': 'Mar',
  apr: 'Apr', april: 'Apr', '04': 'Apr', '4': 'Apr',
  may: 'May', '05': 'May', '5': 'May',
  jun: 'Jun', june: 'Jun', '06': 'Jun', '6': 'Jun',
  jul: 'Jul', july: 'Jul', '07': 'Jul', '7': 'Jul',
  aug: 'Aug', august: 'Aug', '08': 'Aug', '8': 'Aug',
  sep: 'Sep', sept: 'Sep', september: 'Sep', '09': 'Sep', '9': 'Sep',
  oct: 'Oct', october: 'Oct', '10': 'Oct',
  nov: 'Nov', november: 'Nov', '11': 'Nov',
  dec: 'Dec', december: 'Dec', '12': 'Dec',
};

/** Normalise any month representation to the canonical short form (Jan, Feb, …). */
export function normalizeMonth(raw: unknown): Month | null {
  if (raw === null || raw === undefined) return null;
  const key = String(raw).toLowerCase().trim();
  return MONTH_ALIASES[key] ?? null;
}

/** Sort months in calendar order (Jan → Dec), removing duplicates. */
export function sortMonths(months: Month[]): Month[] {
  return [...new Set(months)].sort(
    (a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b)
  );
}

/**
 * Derive the primary Quarter from a list of months.
 * Returns the quarter that owns the first month.
 */
export function deriveQuarter(months: Month[]): Quarter {
  if (!months.length) return 'Q1';
  for (const [q, ms] of Object.entries(QUARTER_MONTHS) as [Quarter, Month[]][]) {
    if (ms.includes(months[0])) return q;
  }
  return 'Q1';
}

/**
 * Build a human-readable period label from a month array + year.
 * e.g. ['Jan','Feb','Mar'] → "Q1-2026"
 *      ['Jan','Feb','Mar','Apr','May'] → "Jan–May 2026"
 */
export function buildDisplayPeriod(months: Month[], year: number): string {
  if (!months.length) return String(year);
  const q = deriveQuarter(months);
  const qMonths = QUARTER_MONTHS[q];
  const isExactQuarter = months.length === 3 && months.every((m, i) => m === qMonths[i]);
  if (isExactQuarter) return `${q}-${year}`;
  return `${months[0]}–${months[months.length - 1]} ${year}`;
}
