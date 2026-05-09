import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const pillVariants = cva(
  "inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] font-medium leading-none",
  {
    variants: {
      variant: {
        default: "bg-white border border-ink-200 text-ink-500",
        gold:    "bg-brand-gold-tint text-brand-gold",
        info:    "bg-info-bg text-info",
        success: "bg-success-bg text-success",
        warning: "bg-warning-bg text-warning",
        danger:  "bg-danger-bg text-danger",
        purple:  "bg-purple-100 text-purple-700",
        pink:    "bg-pink-100 text-pink-700",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface PillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof pillVariants> {}

export function Pill({ className, variant, ...props }: PillProps) {
  return <span className={cn(pillVariants({ variant }), className)} {...props} />
}
