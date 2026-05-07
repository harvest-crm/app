"use client";

import { useRouter, usePathname } from "next/navigation";

const OPTIONS = [
  { value: "30",  label: "30 days" },
  { value: "90",  label: "90 days" },
  { value: "365", label: "1 year"  },
  { value: "all", label: "All time" },
] as const;

export function RangeSelector({ current }: { current: string }) {
  const router   = useRouter();
  const pathname = usePathname();

  function go(range: string) {
    router.push(`${pathname}?range=${range}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-[#E8DFC8] bg-white p-1">
      {OPTIONS.map((opt) => {
        const active = current === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => go(opt.value)}
            className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            style={
              active
                ? { background: "#1F8A8A", color: "#FFFFFF" }
                : { color: "#0F2540" }
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
