export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const d = raw.replace(/\D/g, "");
  return d.length === 10
    ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
    : raw;
}

export function labelToKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/, "")
    .slice(0, 50);
}
