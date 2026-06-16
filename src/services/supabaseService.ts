import { createClient } from '@supabase/supabase-js';
import { DashboardData, Month } from '../types/dashboard';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabase = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DatasetRecord {
  id: string;
  dataset_name: string;
  uploaded_file_name: string | null;
  upload_date: string;
  uploaded_by: string;
  total_records: number;
  active_dataset: boolean;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Build flat processed_data rows from DashboardData for normalised storage.
function buildProcessedRows(data: DashboardData, datasetId: string): any[] {
  const rows: any[] = [];

  for (const loc of data.locations) {
    for (const m of loc.months) {
      const trend = loc.monthlyTrend.find((t) => t.month === m);
      const ins = loc.trendlineInsurance.find((t) => t.month === m);
      const ext = loc.trendlineExternalSales.find((t) => t.month === m);
      const war = loc.trendlineWarrantyClaims.find((t) => t.month === m);
      const wash = loc.trendlineWashCount.find((t) => t.month === m);
      const stdH = loc.trendlineStdHours.find((t) => t.month === m);
      const woT = loc.trendlineWoCount.find((t) => t.month === m);

      const base = { dataset_id: datasetId, location: loc.location, year: loc.year, month: m, customer: null };

      rows.push({ ...base, metric_name: 'Productivity', metric_value: trend?.productivity ?? null });
      rows.push({ ...base, metric_name: 'Efficiency', metric_value: trend?.efficiency ?? null });
      rows.push({ ...base, metric_name: 'Utilization', metric_value: trend?.utilization ?? null });
      rows.push({ ...base, metric_name: 'Insurance', metric_value: ins?.value ?? null });
      rows.push({ ...base, metric_name: 'External Sales', metric_value: ext?.value ?? null });
      rows.push({ ...base, metric_name: 'Warranty Claims', metric_value: war?.value ?? null });
      rows.push({ ...base, metric_name: 'Wash Count', metric_value: wash?.value ?? null });
      rows.push({ ...base, metric_name: 'Location Standard Hours', metric_value: stdH?.value ?? null });
      rows.push({ ...base, metric_name: 'WO Count Total', metric_value: woT?.value ?? null });

      for (const wo of loc.woCount) {
        rows.push({ dataset_id: datasetId, location: loc.location, year: loc.year, month: m, customer: wo.customer, metric_name: 'WO Count', metric_value: (wo as any)[m.toLowerCase()] ?? null });
      }
      for (const std of loc.stdHours) {
        rows.push({ dataset_id: datasetId, location: loc.location, year: loc.year, month: m, customer: std.customer, metric_name: 'Customer Standard Hours', metric_value: (std as any)[m.toLowerCase()] ?? null });
      }
      for (const fl of loc.customerFleet) {
        rows.push({ dataset_id: datasetId, location: loc.location, year: loc.year, month: m, customer: fl.customer, metric_name: 'Fleet Count', metric_value: (fl as any)[m.toLowerCase()] ?? null });
      }
    }
  }

  return rows;
}

async function batchInsert(table: string, rows: any[], batchSize = 100): Promise<void> {
  if (!supabase || !rows.length) return;
  for (let i = 0; i < rows.length; i += batchSize) {
    const { error } = await supabase.from(table).insert(rows.slice(i, i + batchSize));
    if (error) console.error(`batchInsert ${table}:`, error.message);
  }
}

// ── Public service functions ──────────────────────────────────────────────────

/** Load the currently active dataset. Returns null if none or Supabase unavailable. */
export async function getActiveDataset(): Promise<{ dataset: DatasetRecord; data: DashboardData } | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('datasets')
      .select('*')
      .eq('active_dataset', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data?.dashboard_json) return null;
    return { dataset: data as DatasetRecord, data: data.dashboard_json as DashboardData };
  } catch {
    return null;
  }
}

/**
 * Save a new dataset to Supabase and mark it as active.
 * Deactivates any previously active dataset.
 * Raw rows and processed data are saved asynchronously after returning the new id.
 */
export async function saveDataset(
  dashboardData: DashboardData,
  rawRows: any[],
  fileName: string,
  datasetName: string,
): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');

  // Deactivate all current active datasets
  await supabase.from('datasets').update({ active_dataset: false }).eq('active_dataset', true);

  // Create dataset record
  const { data: dataset, error } = await supabase
    .from('datasets')
    .insert({
      dataset_name: datasetName,
      uploaded_file_name: fileName,
      upload_date: new Date().toISOString(),
      uploaded_by: 'anonymous',
      total_records: rawRows.length,
      active_dataset: true,
      dashboard_json: dashboardData,
    })
    .select('id')
    .single();

  if (error || !dataset) throw new Error(error?.message ?? 'Failed to save dataset');

  const datasetId: string = dataset.id;

  // Save raw rows and processed data in the background (non-blocking)
  Promise.all([
    batchInsert('raw_data', rawRows.map((row) => ({ dataset_id: datasetId, row_data_json: row }))),
    batchInsert('processed_data', buildProcessedRows(dashboardData, datasetId)),
  ]).catch((e) => console.error('Background save failed:', e));

  return datasetId;
}

/** Load a specific dataset by id. */
export async function loadDataset(id: string): Promise<DashboardData | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('datasets')
      .select('dashboard_json')
      .eq('id', id)
      .single();
    if (error || !data?.dashboard_json) return null;
    return data.dashboard_json as DashboardData;
  } catch {
    return null;
  }
}

/** Make a dataset the active one. Returns its DashboardData. */
export async function activateDataset(id: string): Promise<DashboardData | null> {
  if (!supabase) return null;
  await supabase.from('datasets').update({ active_dataset: false }).eq('active_dataset', true);
  const { data, error } = await supabase
    .from('datasets')
    .update({ active_dataset: true })
    .eq('id', id)
    .select('dashboard_json')
    .single();
  if (error || !data?.dashboard_json) return null;
  return data.dashboard_json as DashboardData;
}

/** Set active_dataset = false (does not delete). */
export async function archiveDataset(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('datasets').update({ active_dataset: false }).eq('id', id);
}

/** Permanently delete a dataset and all associated rows. */
export async function deleteDataset(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('datasets').delete().eq('id', id);
}

/** List all datasets ordered newest first. */
export async function getDatasetHistory(): Promise<DatasetRecord[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('datasets')
      .select('id, dataset_name, uploaded_file_name, upload_date, total_records, active_dataset, created_at')
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data ?? []) as DatasetRecord[];
  } catch {
    return [];
  }
}
