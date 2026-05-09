import { cn } from "@/lib/utils"

const PALETTE = ["#b8893d", "#534AB7", "#1D9E75", "#D4537E", "#378ADD", "#D85A30"]

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = (Math.imul(31, h) + name.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

const SIZE_MAP = {
  xs: "w-6 h-6 text-[9px]",
  sm: "w-8 h-8 text-[11px]",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
  xl: "w-16 h-16 text-xl",
} as const

interface AvatarProps {
  firstName: string
  lastName?: string | null
  size?: keyof typeof SIZE_MAP
  className?: string
}

export function Avatar({ firstName, lastName, size = "md", className }: AvatarProps) {
  const name = `${firstName}${lastName ?? ""}`
  const bg = name.trim() ? PALETTE[hashName(name) % PALETTE.length] : "#b8893d"
  const initials = ((firstName[0] ?? "") + (lastName?.[0] ?? "")).toUpperCase()

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-medium shrink-0",
        SIZE_MAP[size],
        className
      )}
      style={{ backgroundColor: bg }}
    >
      {initials}
    </div>
  )
}
