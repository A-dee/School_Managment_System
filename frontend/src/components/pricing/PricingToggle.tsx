'use client';

interface PricingToggleProps {
  mode: 'personal' | 'business';
  setMode: (mode: 'personal' | 'business') => void;
}

export default function PricingToggle({ mode, setMode }: PricingToggleProps) {
  return (
    <div className="mb-10 flex justify-center">
      <div className="flex rounded-lg border border-white/80 bg-white/72 p-1 shadow-sm backdrop-blur">
        <button
          type="button"
          aria-pressed={mode === 'personal'}
          onClick={() => setMode('personal')}
          className={`rounded-md px-6 py-2 text-sm font-bold transition-colors ${
            mode === 'personal'
              ? 'bg-[#2563eb] text-white shadow'
              : 'text-[#475569] hover:bg-[#f8fafc] hover:text-[#0f172a]'
          }`}
        >
          Standard
        </button>
        <button
          type="button"
          aria-pressed={mode === 'business'}
          onClick={() => setMode('business')}
          className={`rounded-md px-6 py-2 text-sm font-bold transition-colors ${
            mode === 'business'
              ? 'bg-[#2563eb] text-white shadow'
              : 'text-[#475569] hover:bg-[#f8fafc] hover:text-[#0f172a]'
          }`}
        >
          Multi-campus
        </button>
      </div>
    </div>
  );
}
