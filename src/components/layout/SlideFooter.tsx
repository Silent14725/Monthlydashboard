import { Bus } from 'lucide-react';

export function SlideFooter({ pageNumber }: { pageNumber: number }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2"
      style={{ backgroundColor: '#66003C', minHeight: '36px' }}
    >
      <div className="flex items-center gap-2">
        <Bus size={18} color="white" />
        <div className="w-6 h-5 border-2 border-white rounded-sm" />
        <div className="w-5 h-4 border-2 border-white rounded-sm" />
        <div className="w-5 h-3 border-2 border-white rounded-sm" />
      </div>
      <span className="text-white text-sm font-semibold">{pageNumber}</span>
    </div>
  );
}
