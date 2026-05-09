import { cn } from "@/lib/utils"

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string
}

export function IconButton({ className, children, ...props }: IconButtonProps) {
  return (
    <button
      className={cn(
        "w-[30px] h-[30px] inline-flex items-center justify-center",
        "bg-white border border-ink-200 rounded-btn",
        "hover:bg-ink-50 transition-colors cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
