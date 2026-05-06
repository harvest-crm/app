type Props = {
  size?: number;
  className?: string;
};

/**
 * Covenant CRM logomark — white thin Latin cross on a stone-600 rounded tile.
 * Vertical bar: 9% width, runs 12.5%–87.5% of height (2:1 below:above crossbar).
 * Horizontal bar: 37.5% width, 9% height, positioned at ~34% from top.
 * Tile: #475569 fill, rx proportional to size.
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
      {/* Slate tile */}
      <rect width="32" height="32" rx="6" fill="#475569" />
      {/* Vertical bar — centered horizontally, 3 wide, y 4–28 */}
      <rect x="14.5" y="4" width="3" height="24" fill="#FFFFFF" />
      {/* Horizontal bar — 12 wide, 3 tall, centered at x=16, y 11–14 */}
      <rect x="10" y="11" width="12" height="3" fill="#FFFFFF" />
    </svg>
  );
}
