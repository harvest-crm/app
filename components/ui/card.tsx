import { cn } from "@/lib/utils"

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: string
}

export function Card({ children, className, padding = "p-4" }: CardProps) {
  return (
    <div className={cn("bg-white border border-ink-200 rounded-card", padding, className)}>
      {children}
    </div>
  )
}
