export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const d = raw.replace(/\D/g, "");
  return d.length === 10
    ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
    : raw;
}

export function formatCurrency(amount: number | null | undefined): string {
  if (!amount) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function buildLookingForDisplay(profile: {
  bedroomsMin: number | null;
  priceMinCents: bigint | null;
  priceMaxCents: bigint | null;
  neighborhoods: string[];
} | null): string | null {
  if (!profile) return null;
  const parts: string[] = [];
  if (profile.bedroomsMin) parts.push(`${profile.bedroomsMin}+ BR`);
  if (profile.priceMinCents && profile.priceMaxCents) {
    const minK = Number(profile.priceMinCents) / 100_000;
    const maxK = Number(profile.priceMaxCents) / 100_000;
    parts.push(`$${minK.toFixed(0)}K–$${maxK.toFixed(0)}K`);
  }
  if (profile.neighborhoods.length > 0) {
    parts.push(profile.neighborhoods.slice(0, 3).join(" / "));
  }
  return parts.join(" · ") || null;
}

export function labelToKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/, "")
    .slice(0, 50);
}
