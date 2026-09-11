const ICON_CLASS = 'h-10 w-10';

function ConeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.2 4h5.6L21 20H3L9.2 4z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11h8M6.2 16h11.6M3 20h18" />
    </svg>
  );
}

function PendantLightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v4M7 7h10l-2 7H9L7 7z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 18a2 2 0 004 0" />
    </svg>
  );
}

function HardHatIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 14a8 8 0 0116 0M12 4v3M3 14h18v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" />
    </svg>
  );
}

const ICONS = [
  { name: 'cone', Icon: ConeIcon },
  { name: 'light', Icon: PendantLightIcon },
  { name: 'hat', Icon: HardHatIcon },
];

export default function UnderConstruction() {
  return (
    <section className="min-h-[50vh] flex items-center justify-center py-24">
      <div className="text-center">
        <div className="flex items-center justify-center gap-4 mb-8" aria-hidden="true">
          {ICONS.map(({ name, Icon }) => (
            <span
              key={name}
              className="inline-flex h-16 w-16 items-center justify-center border border-black"
            >
              <Icon />
            </span>
          ))}
        </div>
        <h1 className="text-3xl md:text-5xl font-bold tracking-wide">UNDER CONSTRUCTION</h1>
      </div>
    </section>
  );
}
