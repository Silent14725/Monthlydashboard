import { SaptcoLogo } from '../components/layout/SaptcoLogo';
import { SlideFooter } from '../components/layout/SlideFooter';

export function ThankYouPage() {
  return (
    <div
      id="slide-thankyou"
      className="bg-white flex flex-col"
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-3 pb-0">
        <div />
        <SaptcoLogo />
      </div>

      {/* Divider */}
      <div className="mx-5 mb-0" style={{ height: '2px', backgroundColor: '#66003C' }} />

      {/* Content */}
      <div className="flex-1 flex items-center justify-center">
        <h1
          className="font-black"
          style={{ color: '#66003C', fontSize: '38px' }}
        >
          Thank You
        </h1>
      </div>

      <SlideFooter pageNumber={14} />
    </div>
  );
}
