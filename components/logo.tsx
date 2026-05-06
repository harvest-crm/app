type Props = {
  size?: number;
  className?: string;
};

/**
 * Covenant CRM logomark — two concentric arcs forming a C.
 * Outer arc: dark navy #1E293B (blends with dark sidebar bg, visible on light).
 * Inner arc: warm gold #D4A574 (the covenant accent, visible on all backgrounds).
 * The layered C suggests two parties bound together.
 * No text — pair with "Covenant CRM" typography.
 */
export function Logo({ size = 24, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer arc — navy, C opening to the right, ±55° gap */}
      <path
        d="M 22.9 25.8 A 12 12 0 1 1 22.9 6.2"
        stroke="#1E293B"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Inner arc — warm gold, same opening angle, smaller radius */}
      <path
        d="M 20.3 22.1 A 7.5 7.5 0 1 1 20.3 9.9"
        stroke="#D4A574"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
