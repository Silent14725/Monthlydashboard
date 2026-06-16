export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type Month = 'Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sep' | 'Oct' | 'Nov' | 'Dec';
export type Customer = 'SMS' | 'SAT' | 'SEITCO' | 'External' | 'PT-Urban';

export const QUARTER_MONTHS: Record<Quarter, Month[]> = {
  Q1: ['Jan', 'Feb', 'Mar'],
  Q2: ['Apr', 'May', 'Jun'],
  Q3: ['Jul', 'Aug', 'Sep'],
  Q4: ['Oct', 'Nov', 'Dec'],
};

export interface ManpowerEntry {
  category: string;
  count: number;
}

export interface FleetEntry {
  customer: Customer;
  [key: string]: number | null | string;
}

export interface MatrixEntry {
  customer: Customer;
  [key: string]: number | null | string;
}

export interface TrendlineData {
  month: string;
  value: number | null;
}

export interface MonthlyTrendData {
  month: string;
  productivity: number | null;
  efficiency: number | null;
  utilization: number | null;
}

export interface WorkshopFleet {
  mobileWorkshop: number;
  winch: number;
}

export interface LocationData {
  location: string;
  year: number;
  quarter: Quarter;
  months: Month[];
  monthlyTrend: MonthlyTrendData[];
  manpower: ManpowerEntry[];
  workshopFleet: WorkshopFleet;
  customerFleet: FleetEntry[];
  woCount: MatrixEntry[];
  stdHours: MatrixEntry[];
  trendlineWoCount: TrendlineData[];
  trendlineStdHours: TrendlineData[];
  trendlineInsurance: TrendlineData[];
  trendlineExternalSales: TrendlineData[];
  trendlineWarrantyClaims: TrendlineData[];
  trendlineWashCount: TrendlineData[];
}

export interface OverallSummaryData {
  year: number;
  quarter: Quarter;
  months: Month[];
  monthlyTrend: MonthlyTrendData[];
  manpower: ManpowerEntry[];
  workshopFleet: WorkshopFleet;
  customerFleet: FleetEntry[];
  woCount: MatrixEntry[];
  stdHours: MatrixEntry[];
  trendlineWoCount: TrendlineData[];
  trendlineStdHours: TrendlineData[];
  trendlineInsurance: TrendlineData[];
  trendlineExternalSales: TrendlineData[];
  trendlineWarrantyClaims: TrendlineData[];
  trendlineWashCount: TrendlineData[];
}

export interface DashboardData {
  year: number;
  quarter: Quarter;
  /** Human-readable period label, e.g. "Q1-2026" or "Jan–Jun 2026" */
  displayPeriod?: string;
  overall: OverallSummaryData;
  locations: LocationData[];
}

export interface UploadedRow {
  Year?: number;
  Quarter?: string;
  Month?: string;
  Location?: string;
  Customer?: string;
  Productivity?: number;
  Efficiency?: number;
  Utilization?: number;
  'WO Count'?: number;
  'Standard Hours'?: number;
  'Manpower Category'?: string;
  'Manpower Count'?: number;
  'Mobile Workshop Count'?: number;
  'Winch Count'?: number;
  'Customer Fleet Count'?: number;
  Insurance?: number;
  'External Sales'?: number;
  'Warranty Claims'?: number;
  'Wash Count'?: number;
}
