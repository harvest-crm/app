type Props = {
  size?: number;
  className?: string;
};

/**
 * Harvest CRM logomark — geometric H with an amber rising crossbar.
 * The crossbar's upward angle (left→right) is the growth element.
 * Navy #1E293B / amber #F59E0B only. No text — pair with "Harvest CRM" typography.
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
      {/* Left vertical stroke */}
      <rect x="2" y="2" width="8" height="28" rx="1" fill="#1E293B" />
      {/* Right vertical stroke */}
      <rect x="22" y="2" width="8" height="28" rx="1" fill="#1E293B" />
      {/* Crossbar — amber parallelogram rising left→right, hinting at growth */}
      <polygon points="10,18 10,14 22,10 22,14" fill="#F59E0B" />
    </svg>
  );
}
