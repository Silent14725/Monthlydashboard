import { SaptcoLogo } from '../components/layout/SaptcoLogo';
import { SlideFooter } from '../components/layout/SlideFooter';
import { Wrench } from 'lucide-react';

export function CoverPage() {
  return (
    <div
      id="slide-cover"
      className="relative bg-white flex flex-col"
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
    >
      {/* Background geometric overlays - left side */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top-left diagonal panel */}
        <div
          className="absolute"
          style={{
            top: 0,
            left: 0,
            width: '42%',
            height: '48%',
            background: 'linear-gradient(135deg, #c8b8be 0%, #e8d8de 60%, transparent 100%)',
            clipPath: 'polygon(0 0, 100% 0, 80% 100%, 0 100%)',
            opacity: 0.5,
          }}
        />
        {/* Middle-left diagonal panel */}
        <div
          className="absolute"
          style={{
            top: '45%',
            left: '5%',
            width: '38%',
            height: '48%',
            background: 'linear-gradient(135deg, #c8b8be 0%, #e8d8de 60%, transparent 100%)',
            clipPath: 'polygon(10% 0, 100% 0, 90% 100%, 0 100%)',
            opacity: 0.45,
          }}
        />
        {/* Decorative lines */}
        <div
          className="absolute border-l-2"
          style={{
            borderColor: '#66003C',
            opacity: 0.3,
            top: '10%',
            left: '42%',
            height: '35%',
            transform: 'rotate(-15deg)',
          }}
        />
        <div
          className="absolute border-l-2"
          style={{
            borderColor: '#66003C',
            opacity: 0.2,
            top: '50%',
            left: '38%',
            height: '30%',
            transform: 'rotate(-10deg)',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative flex-1 flex">
        {/* Left side - imagery placeholder */}
        <div className="w-1/2 flex items-center justify-center">
          <div className="flex flex-col gap-6 opacity-40">
            <div
              className="rounded-lg flex items-center justify-center"
              style={{ width: '180px', height: '100px', backgroundColor: '#c8b8be' }}
            >
              <Wrench size={40} color="#66003C" />
            </div>
            <div
              className="rounded-lg flex items-center justify-center ml-8"
              style={{ width: '160px', height: '90px', backgroundColor: '#c8b8be' }}
            >
              <Wrench size={36} color="#66003C" />
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="w-1/2 flex flex-col justify-between p-8">
          {/* Logo top right */}
          <div className="flex justify-end">
            <SaptcoLogo />
          </div>

          {/* Title */}
          <div className="flex flex-col items-center justify-center flex-1">
            <h1
              className="font-black text-center leading-tight"
              style={{ color: '#66003C', fontSize: '36px' }}
            >
              TSS Maintenance
              <br />
              Monthly Meeting,
              <br />
              Q1-2026
            </h1>
          </div>
        </div>
      </div>

      <SlideFooter pageNumber={1} />
    </div>
  );
}
