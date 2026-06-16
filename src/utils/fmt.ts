export function fmtNum(val: number | null | undefined): string {
  if (val == null) return '—';
  return Math.round(val).toLocaleString();
}
