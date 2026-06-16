import { useRef, useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../context/DataContext';
import {
  Upload, CheckCircle, AlertCircle, FileSpreadsheet, Download, FileDown,
  Database, Calendar, Hash, File, ChevronDown, ChevronUp, Trash2, Play, Archive,
  RefreshCw, Clock,
} from 'lucide-react';
import { DashboardData } from '../types/dashboard';
import { getDatasetHistory, activateDataset, deleteDataset, archiveDataset, loadDataset, DatasetRecord } from '../services/supabaseService';

// ── Sheet column definitions ──────────────────────────────────────────────────
const SHEET1_COLS = [
  'Year', 'Quarter', 'Month', 'Location',
  'Productivity', 'Efficiency', 'Utilization',
  'Insurance', 'External Sales', 'Warranty Claims', 'Wash Count',
  'Location Standard Hours',
];

const SHEET2_COLS = [
  'Year', 'Quarter', 'Month', 'Location', 'Customer',
  'WO Count', 'Customer Standard Hours', 'Fleet Count',
];

const SHEET3_COLS = ['Location', 'Category', 'Count'];

const SHEET4_COLS = ['Location', 'Mobile Workshop', 'Winch'];

// ── Build sheets from DashboardData ──────────────────────────────────────────
function buildSheet1(data: DashboardData): any[] {
  const rows: any[] = [];
  for (const loc of data.locations) {
    for (const m of loc.months) {
      const trend = loc.monthlyTrend.find((t) => t.month === m);
      const ins = loc.trendlineInsurance.find((t) => t.month === m);
      const ext = loc.trendlineExternalSales.find((t) => t.month === m);
      const war = loc.trendlineWarrantyClaims.find((t) => t.month === m);
      const wash = loc.trendlineWashCount.find((t) => t.month === m);
      const std = loc.trendlineStdHours.find((t) => t.month === m);
      rows.push({
        Year: loc.year,
        Quarter: loc.quarter,
        Month: m,
        Location: loc.location,
        Productivity: trend?.productivity ?? null,
        Efficiency: trend?.efficiency ?? null,
        Utilization: trend?.utilization ?? null,
        Insurance: ins?.value ?? null,
        'External Sales': ext?.value ?? null,
        'Warranty Claims': war?.value ?? null,
        'Wash Count': wash?.value ?? null,
        'Location Standard Hours': std?.value ?? null,
      });
    }
  }
  return rows;
}

function buildSheet2(data: DashboardData): any[] {
  const rows: any[] = [];
  for (const loc of data.locations) {
    const customers = [
      ...new Set([
        ...loc.woCount.map((r) => r.customer as string),
        ...loc.stdHours.map((r) => r.customer as string),
        ...loc.customerFleet.map((r) => r.customer as string),
      ]),
    ].filter(Boolean);
    for (const m of loc.months) {
      for (const customer of customers) {
        const wo = (loc.woCount.find((r) => r.customer === customer) as any)?.[m.toLowerCase()] ?? null;
        const std = (loc.stdHours.find((r) => r.customer === customer) as any)?.[m.toLowerCase()] ?? null;
        const fleet = (loc.customerFleet.find((r) => r.customer === customer) as any)?.[m.toLowerCase()] ?? null;
        rows.push({
          Year: loc.year,
          Quarter: loc.quarter,
          Month: m,
          Location: loc.location,
          Customer: customer,
          'WO Count': wo,
          'Customer Standard Hours': std,
          'Fleet Count': fleet,
        });
      }
    }
  }
  return rows;
}

function buildSheet3(data: DashboardData): any[] {
  return data.locations.flatMap((loc) =>
    loc.manpower.map((mp) => ({
      Location: loc.location,
      Category: mp.category,
      Count: mp.count,
    }))
  );
}

function buildSheet4(data: DashboardData): any[] {
  return data.locations.map((loc) => ({
    Location: loc.location,
    'Mobile Workshop': loc.workshopFleet.mobileWorkshop,
    Winch: loc.workshopFleet.winch,
  }));
}

// ── Visual Matched Data sheet ─────────────────────────────────────────────────
function buildVisualMatchedRows(data: DashboardData): any[] {
  const rows: any[] = [];
  const pushMonthly = (location: string, year: number, month: string, metric: string, value: number | null, source: string) =>
    rows.push({ Location: location, Year: year, Month: month, 'Metric Type': 'Location Monthly', Customer: '', 'Metric Name': metric, 'Metric Value': value, 'Source Visual / Section': source });
  const pushCustomer = (location: string, year: number, month: string, customer: string, metric: string, value: number | null, source: string) =>
    rows.push({ Location: location, Year: year, Month: month, 'Metric Type': 'Customer', Customer: customer, 'Metric Name': metric, 'Metric Value': value, 'Source Visual / Section': source });
  const pushLocation = (location: string, year: number, metric: string, value: number | null, source: string) =>
    rows.push({ Location: location, Year: year, Month: '', 'Metric Type': 'Location', Customer: '', 'Metric Name': metric, 'Metric Value': value, 'Source Visual / Section': source });

  const exportSection = (label: string, year: number, months: string[], section: typeof data.overall | typeof data.locations[0]) => {
    for (const t of section.monthlyTrend) {
      pushMonthly(label, year, t.month, 'Productivity', t.productivity, `${label} Monthly Trend Chart`);
      pushMonthly(label, year, t.month, 'Efficiency', t.efficiency, `${label} Monthly Trend Chart`);
      pushMonthly(label, year, t.month, 'Utilization', t.utilization, `${label} Monthly Trend Chart`);
    }
    for (const t of section.trendlineStdHours) pushMonthly(label, year, t.month, 'Standard Hours', t.value, `${label} Monthly Standard Hours Trendline Chart`);
    for (const t of section.trendlineWoCount) pushMonthly(label, year, t.month, 'WO Count', t.value, `${label} Monthly WO Count Trendline Chart`);
    for (const t of section.trendlineInsurance) pushMonthly(label, year, t.month, 'Insurance', t.value, `${label} Insurance Trendline Chart`);
    for (const t of section.trendlineExternalSales) pushMonthly(label, year, t.month, 'External Sales', t.value, `${label} External Sales Trendline Chart`);
    for (const t of section.trendlineWarrantyClaims) pushMonthly(label, year, t.month, 'Warranty Claims', t.value, `${label} Warranty Claims Trendline Chart`);
    for (const t of section.trendlineWashCount) pushMonthly(label, year, t.month, 'Wash Count', t.value, `${label} Wash Count Trendline Chart`);
    for (const r of section.woCount)
      for (const m of months)
        pushCustomer(label, year, m, r.customer as string, 'WO Count', (r as any)[m.toLowerCase()], `${label} WO Count Matrix Table`);
    for (const r of section.stdHours)
      for (const m of months)
        pushCustomer(label, year, m, r.customer as string, 'Standard Hours', (r as any)[m.toLowerCase()], `${label} Standard Hours Matrix Table`);
    for (const r of section.customerFleet)
      for (const m of months)
        pushCustomer(label, year, m, r.customer as string, 'Customer Fleet Count', (r as any)[m.toLowerCase()], `${label} Customer Fleet Table`);
    for (const mp of section.manpower)
      pushLocation(label, year, `Manpower: ${mp.category}`, mp.count, `${label} Manpower Table`);
    pushLocation(label, year, 'Mobile Workshop Count', section.workshopFleet.mobileWorkshop, `${label} Workshop Fleet`);
    pushLocation(label, year, 'Winch Count', section.workshopFleet.winch, `${label} Workshop Fleet`);
  };

  exportSection('Overall', data.overall.year, data.overall.months, data.overall);
  for (const loc of data.locations) exportSection(loc.location, loc.year, loc.months, loc);
  return rows;
}

// ── Download current data ─────────────────────────────────────────────────────
function downloadCurrentData(data: DashboardData) {
  const today = new Date().toISOString().split('T')[0];
  const wb = XLSX.utils.book_new();

  const addSheet = (rows: any[], cols: string[], name: string, colWidths: number[]) => {
    const ws = XLSX.utils.json_to_sheet(rows, { header: cols });
    ws['!cols'] = colWidths.map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  };

  addSheet(buildSheet1(data), SHEET1_COLS, 'Location Monthly Metrics', [6, 8, 6, 22, 14, 12, 14, 14, 16, 18, 12, 24]);
  addSheet(buildSheet2(data), SHEET2_COLS, 'Customer WO & Hours', [6, 8, 6, 22, 14, 12, 24, 12]);
  addSheet(buildSheet3(data), SHEET3_COLS, 'Manpower', [22, 30, 8]);
  addSheet(buildSheet4(data), SHEET4_COLS, 'Recovery Fleet', [22, 18, 8]);

  const visualRows = buildVisualMatchedRows(data);
  const visualWs = XLSX.utils.json_to_sheet(visualRows, {
    header: ['Location', 'Year', 'Month', 'Metric Type', 'Customer', 'Metric Name', 'Metric Value', 'Source Visual / Section'],
  });
  visualWs['!cols'] = [24, 6, 6, 18, 12, 34, 14, 48].map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, visualWs, 'Visual Matched Data');

  XLSX.writeFile(wb, `TSS_Data_${today}.xlsx`);
}

// ── Download blank template ───────────────────────────────────────────────────
function downloadTemplate() {
  const wb = XLSX.utils.book_new();

  const addSheet = (rows: any[], cols: string[], name: string, colWidths: number[]) => {
    const ws = XLSX.utils.json_to_sheet(rows, { header: cols });
    ws['!cols'] = colWidths.map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  };

  // Example rows per sheet
  addSheet(
    [
      { Year: 2026, Quarter: 'Q1', Month: 'Jan', Location: 'Dammam', Productivity: 59, Efficiency: 62, Utilization: 95, Insurance: 103026, 'External Sales': 333678, 'Warranty Claims': 0, 'Wash Count': 0, 'Location Standard Hours': 4202 },
      { Year: 2026, Quarter: 'Q1', Month: 'Feb', Location: 'Dammam', Productivity: 77, Efficiency: 82, Utilization: 94, Insurance: 94243, 'External Sales': 137858, 'Warranty Claims': 9815, 'Wash Count': 0, 'Location Standard Hours': 4322 },
      { Year: 2026, Quarter: 'Q1', Month: 'Mar', Location: 'Dammam', Productivity: 81, Efficiency: 92, Utilization: 88, Insurance: 38303, 'External Sales': 169946, 'Warranty Claims': 9724, 'Wash Count': 0, 'Location Standard Hours': 4808 },
    ],
    SHEET1_COLS, 'Location Monthly Metrics', [6, 8, 6, 22, 14, 12, 14, 14, 16, 18, 12, 24]
  );

  addSheet(
    [
      { Year: 2026, Quarter: 'Q1', Month: 'Jan', Location: 'Dammam', Customer: 'SMS', 'WO Count': 302, 'Customer Standard Hours': 869, 'Fleet Count': 669 },
      { Year: 2026, Quarter: 'Q1', Month: 'Jan', Location: 'Dammam', Customer: 'PT-Urban', 'WO Count': 746, 'Customer Standard Hours': 1969, 'Fleet Count': 90 },
      { Year: 2026, Quarter: 'Q1', Month: 'Jan', Location: 'Dammam', Customer: 'SAT', 'WO Count': 411, 'Customer Standard Hours': 934, 'Fleet Count': 25 },
      { Year: 2026, Quarter: 'Q1', Month: 'Jan', Location: 'Dammam', Customer: 'External', 'WO Count': 136, 'Customer Standard Hours': 407, 'Fleet Count': 117 },
    ],
    SHEET2_COLS, 'Customer WO & Hours', [6, 8, 6, 22, 14, 12, 24, 12]
  );

  addSheet(
    [
      { Location: 'Dammam', Category: 'Section Head', Count: 1 },
      { Location: 'Dammam', Category: 'Superintendent', Count: 1 },
      { Location: 'Dammam', Category: 'Maintenance Supervisor', Count: 5 },
      { Location: 'Dammam', Category: 'Murabta Technician', Count: 2 },
      { Location: 'Dammam', Category: 'Inspection Technician', Count: 4 },
      { Location: 'Dammam', Category: 'Technician', Count: 37 },
    ],
    SHEET3_COLS, 'Manpower', [22, 30, 8]
  );

  addSheet(
    [{ Location: 'Dammam', 'Mobile Workshop': 4, Winch: 1 }],
    SHEET4_COLS, 'Recovery Fleet', [22, 18, 8]
  );

  // Instructions sheet
  const instrRows = [
    ['TSS Dashboard — Multi-Sheet Data Template'],
    [''],
    ['SHEET 1: Location Monthly Metrics'],
    ['One row per Location + Month. Contains location-level aggregated metrics.'],
    ['Column', 'Description'],
    ['Year', 'Four-digit year (e.g. 2026)'],
    ['Quarter', 'Q1, Q2, Q3, or Q4'],
    ['Month', 'Three-letter abbreviation: Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec'],
    ['Location', 'Workshop location name'],
    ['Productivity', 'Location productivity % for that month (feeds Monthly Trend Chart)'],
    ['Efficiency', 'Location efficiency % for that month'],
    ['Utilization', 'Location utilization % for that month'],
    ['Insurance', 'Total insurance SAR for that location+month (feeds Insurance Trendline Chart)'],
    ['External Sales', 'Total external sales SAR (feeds External Sales Trendline Chart)'],
    ['Warranty Claims', 'Total warranty claims SAR (feeds Warranty Claims Trendline Chart)'],
    ['Wash Count', 'Total wash count (feeds Wash Count Trendline Chart)'],
    ['Location Standard Hours', 'Location-level total Standard Hours for that month (feeds Standard Hours Trendline Chart)'],
    [''],
    ['SHEET 2: Customer WO & Hours'],
    ['One row per Location + Month + Customer. Contains customer-level metrics.'],
    ['Column', 'Description'],
    ['Year / Quarter / Month / Location', 'Same as Sheet 1'],
    ['Customer', 'Customer name (SMS, SAT, SEITCO, External, PT-Urban)'],
    ['WO Count', 'Work orders for that customer/month/location (feeds WO Count Matrix Table)'],
    ['Customer Standard Hours', 'Standard hours for that customer/month/location (feeds Standard Hours Matrix Table)'],
    ['Fleet Count', 'Fleet count for that customer/month/location (feeds Customer Fleet Table)'],
    [''],
    ['SHEET 3: Manpower'],
    ['One row per Location + Manpower Category.'],
    ['Column', 'Description'],
    ['Location', 'Workshop location name'],
    ['Category', 'Manpower category (Technician, Section Head, Superintendent, etc.)'],
    ['Count', 'Number of people in that category'],
    [''],
    ['SHEET 4: Recovery Fleet'],
    ['One row per Location.'],
    ['Column', 'Description'],
    ['Location', 'Workshop location name'],
    ['Mobile Workshop', 'Number of mobile workshop units'],
    ['Winch', 'Number of winch units'],
    [''],
    ['GENERAL RULES'],
    ['• Quarter must match the months included (Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec)'],
    ['• Leave numeric cells blank (not zero) when data is unavailable'],
    ['• Column headers must match exactly (case-sensitive)'],
    ['• The file is detected as new format when it contains a sheet named "Location Monthly Metrics"'],
  ];
  const instrWs = XLSX.utils.aoa_to_sheet(instrRows);
  instrWs['!cols'] = [{ wch: 32 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, instrWs, 'Instructions');

  XLSX.writeFile(wb, 'TSS_Dashboard_Template.xlsx');
}

// ── Sheet format preview component ───────────────────────────────────────────
interface SheetPreviewProps {
  label: string;
  badge: string;
  badgeColor: string;
  columns: string[];
  exampleRows: (string | number | null)[][];
  description: string;
  defaultOpen?: boolean;
}

function SheetPreview({ label, badge, badgeColor, columns, exampleRows, description, defaultOpen = false }: SheetPreviewProps) {
  const [open, setOpen] = useState(defaultOpen);
  const thClass = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-200 whitespace-nowrap';
  const tdClass = 'px-3 py-1.5 text-gray-600 whitespace-nowrap';

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full text-white flex-shrink-0"
          style={{ backgroundColor: badgeColor }}
        >
          {badge}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-800">{label}</p>
          <p className="text-xs text-gray-500 truncate">{description}</p>
        </div>
        {open ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-gray-100 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col} className={thClass}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exampleRows.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className={tdClass}>
                      {cell === null || cell === '' ? <span className="text-gray-300 italic">blank</span> : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Dataset History section ───────────────────────────────────────────────────
function DatasetHistory({ onActivated }: { onActivated: () => void }) {
  const { datasetId: activeId } = useData();
  const [records, setRecords] = useState<DatasetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await getDatasetHistory();
    setRecords(list);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleActivate = async (id: string) => {
    setActionId(id);
    await activateDataset(id);
    await load();
    onActivated();
    setActionId(null);
  };

  const handleArchive = async (id: string) => {
    setActionId(id);
    await archiveDataset(id);
    await load();
    setActionId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this dataset? This cannot be undone.')) return;
    setActionId(id);
    await deleteDataset(id);
    await load();
    setActionId(null);
  };

  const handleDownload = async (id: string, name: string) => {
    setActionId(id);
    const dashData = await loadDataset(id);
    if (dashData) downloadCurrentData(dashData);
    setActionId(null);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={16} style={{ color: '#66003C' }} />
          <h2 className="font-bold text-sm text-gray-800">Dataset History</h2>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading && records.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">No datasets uploaded yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide">Dataset</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide">File</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide">Uploaded</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide">Records</th>
                <th className="text-center py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => {
                const isCurrent = rec.id === activeId;
                const busy = actionId === rec.id;
                const uploadedDate = new Date(rec.upload_date);
                return (
                  <tr key={rec.id} className={`border-b border-gray-50 last:border-0 ${isCurrent ? 'bg-rose-50/60' : 'hover:bg-gray-50'}`}>
                    <td className="py-2.5 px-3 font-semibold text-gray-800 max-w-[180px] truncate" title={rec.dataset_name}>
                      {rec.dataset_name}
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 max-w-[160px] truncate" title={rec.uploaded_file_name ?? ''}>
                      {rec.uploaded_file_name ?? '—'}
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                      {uploadedDate.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-gray-700">
                      {rec.total_records.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {rec.active_dataset ? (
                        <span className="px-2 py-0.5 rounded-full text-white text-xs font-semibold" style={{ backgroundColor: '#66003C' }}>
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">
                          Archived
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleDownload(rec.id, rec.dataset_name)}
                          disabled={busy}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 transition-colors"
                          title="Download as Excel"
                        >
                          <Download size={10} />
                          Export
                        </button>
                        {!rec.active_dataset && (
                          <button
                            onClick={() => handleActivate(rec.id)}
                            disabled={busy}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-40 transition-colors"
                            title="Activate dataset"
                          >
                            <Play size={10} />
                            Activate
                          </button>
                        )}
                        {rec.active_dataset && (
                          <button
                            onClick={() => handleArchive(rec.id)}
                            disabled={busy}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-40 transition-colors"
                            title="Archive dataset"
                          >
                            <Archive size={10} />
                            Archive
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(rec.id)}
                          disabled={busy}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40 transition-colors"
                          title="Delete dataset permanently"
                        >
                          <Trash2 size={10} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function DataManagementPage() {
  const { uploadExcel, uploadError, data, rawRows, uploadedFileName, lastUpdated, refreshFromSupabase } = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [success, setSuccess] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File) => {
    setSuccess(false);
    await uploadExcel(file);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 4000);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const recordCount = rawRows.length > 0
    ? rawRows.length
    : data.locations.reduce((sum, loc) => sum + loc.months.length * loc.manpower.length, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-black mb-1" style={{ color: '#66003C' }}>
          Data Management
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          Upload or download data using the 4-sheet Excel template. Each sheet has a single, clear purpose.
        </p>

        {/* Dataset Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Database size={16} style={{ color: '#66003C' }} />
            <h2 className="font-bold text-sm text-gray-800">Active Dataset</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="rounded-lg p-3" style={{ backgroundColor: '#fdf0f3' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <File size={12} style={{ color: '#66003C' }} />
                <p className="text-xs text-gray-500 font-medium">File Name</p>
              </div>
              <p className="text-xs font-bold text-gray-800 truncate" title={uploadedFileName ?? 'Sample Data'}>
                {uploadedFileName ?? 'Sample Data'}
              </p>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: '#fdf0f3' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Hash size={12} style={{ color: '#66003C' }} />
                <p className="text-xs text-gray-500 font-medium">Records</p>
              </div>
              <p className="text-sm font-black" style={{ color: '#66003C' }}>{recordCount.toLocaleString()}</p>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: '#fdf0f3' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar size={12} style={{ color: '#66003C' }} />
                <p className="text-xs text-gray-500 font-medium">Period</p>
              </div>
              <p className="text-sm font-black" style={{ color: '#66003C' }}>
                {data.displayPeriod ?? `${data.year} ${data.quarter}`}
              </p>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: '#fdf0f3' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar size={12} style={{ color: '#66003C' }} />
                <p className="text-xs text-gray-500 font-medium">Last Updated</p>
              </div>
              <p className="text-xs font-bold text-gray-800">
                {lastUpdated
                  ? lastUpdated.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'Sample data'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.locations.map((loc) => (
              <span
                key={loc.location}
                className="px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: '#66003C' }}
              >
                {loc.location}
              </span>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => downloadCurrentData(data)}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-green-400 hover:bg-green-50 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-green-100 group-hover:bg-green-200 transition-colors">
              <Download size={18} className="text-green-700" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-800">Download Current Data</p>
              <p className="text-xs text-gray-500 mt-0.5">Exports 4 data sheets + Visual Matched Data</p>
            </div>
          </button>

          <button
            onClick={downloadTemplate}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-100 group-hover:bg-blue-200 transition-colors">
              <FileDown size={18} className="text-blue-700" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-800">Download Template</p>
              <p className="text-xs text-gray-500 mt-0.5">4-sheet template with example data + instructions</p>
            </div>
          </button>
        </div>

        {/* Upload zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors mb-6 ${
            dragging ? 'border-rose-400 bg-rose-50' : 'border-gray-300 bg-white hover:border-rose-300 hover:bg-rose-50/30'
          }`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileChange} />
          <Upload size={36} className="mx-auto mb-3 text-gray-400" />
          <p className="font-semibold text-gray-700">Drag &amp; drop or click to upload</p>
          <p className="text-sm text-gray-400 mt-1">Supports .xlsx — new 4-sheet format and legacy single-sheet format both accepted</p>
        </div>

        {/* Status messages */}
        {uploadError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 mb-4">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <span className="text-red-700 text-sm">{uploadError}</span>
          </div>
        )}
        {success && !uploadError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 mb-4">
            <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
            <span className="text-green-700 text-sm">Data uploaded successfully!</span>
          </div>
        )}

        {/* Dataset History */}
        <div className="mb-6">
          <DatasetHistory onActivated={refreshFromSupabase} />
        </div>

        {/* Sheet format reference */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileSpreadsheet size={18} style={{ color: '#66003C' }} />
            <h2 className="font-bold text-sm text-gray-800">Template Sheet Structure</h2>
          </div>
          <div className="space-y-2">
            <SheetPreview
              label="Sheet 1 — Location Monthly Metrics"
              badge="Sheet 1"
              badgeColor="#166534"
              description="One row per Location + Month. Location-level aggregated values for trendline charts."
              columns={SHEET1_COLS}
              exampleRows={[
                [2026, 'Q1', 'Jan', 'Dammam', 59, 62, 95, 103026, 333678, 0, 0, 4202],
                [2026, 'Q1', 'Feb', 'Dammam', 77, 82, 94, 94243, 137858, 9815, 0, 4322],
                [2026, 'Q1', 'Mar', 'Dammam', 81, 92, 88, 38303, 169946, 9724, 0, 4808],
              ]}
              defaultOpen={true}
            />
            <SheetPreview
              label="Sheet 2 — Customer WO & Hours"
              badge="Sheet 2"
              badgeColor="#1d4ed8"
              description="One row per Location + Month + Customer. Per-customer values for matrix tables."
              columns={SHEET2_COLS}
              exampleRows={[
                [2026, 'Q1', 'Jan', 'Dammam', 'SMS', 302, 869, 669],
                [2026, 'Q1', 'Jan', 'Dammam', 'PT-Urban', 746, 1969, 90],
                [2026, 'Q1', 'Jan', 'Dammam', 'SAT', 411, 934, 25],
                [2026, 'Q1', 'Jan', 'Dammam', 'External', 136, 407, 117],
              ]}
            />
            <SheetPreview
              label="Sheet 3 — Manpower"
              badge="Sheet 3"
              badgeColor="#92400e"
              description="One row per Location + Category. Manpower headcount per category."
              columns={SHEET3_COLS}
              exampleRows={[
                ['Dammam', 'Section Head', 1],
                ['Dammam', 'Superintendent', 1],
                ['Dammam', 'Maintenance Supervisor', 5],
                ['Dammam', 'Technician', 37],
              ]}
            />
            <SheetPreview
              label="Sheet 4 — Recovery Fleet"
              badge="Sheet 4"
              badgeColor="#6b21a8"
              description="One row per Location. Mobile workshop and winch counts."
              columns={SHEET4_COLS}
              exampleRows={[
                ['Dammam', 4, 1],
                ['Riyadh', 20, 5],
              ]}
            />
          </div>

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-semibold text-amber-800 mb-1">Note on Standard Hours</p>
            <p className="text-xs text-amber-700">
              <strong>Location Standard Hours</strong> (Sheet 1) feeds the <em>Standard Hours Trendline Chart</em> — a single monthly total per location.
              {' '}<strong>Customer Standard Hours</strong> (Sheet 2) feeds the <em>Standard Hours Matrix Table</em> — individual values per customer.
              These are separate data sources and their values are independent.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
