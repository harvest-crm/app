type Props = {
  size?: number;
  className?: string;
  thick?: boolean; // wider cross bars for better legibility at small sizes
};

/**
 * Covenant CRM logomark — white thin Latin cross on a teal (#1F8A8A) rounded tile.
 * Vertical bar: centered at x=16, horizontal bar at y=11-14.
 * thick=true widens bars from 3→4 units for sidebar at 20px.
 */
export function Logo({ size = 24, className, thick = false }: Props) {
  const bar = thick ? 4 : 3;
  const vx  = 16 - bar / 2;  // center at x=16
  const hh  = bar;            // horizontal bar height same as vertical bar width

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
      <rect width="32" height="32" rx="6" fill="#1F8A8A" />
      {/* Vertical bar */}
      <rect x={vx} y="4" width={bar} height="24" fill="#FFFFFF" />
      {/* Horizontal bar */}
      <rect x="10" y="11" width="12" height={hh} fill="#FFFFFF" />
    </svg>
  );
}
