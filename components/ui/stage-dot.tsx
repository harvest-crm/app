const DOT_COLORS = {
  lead:       "#378ADD",
  working:    "#64748b",
  active:     "#b8893d",
  contract:   "#BA7517",
  closed:     "#1D9E75",
  past_client:"#534AB7",
  sphere:     "#D4537E",
} as const

export type StageDotVariant = keyof typeof DOT_COLORS

export function StageDot({ variant }: { variant: StageDotVariant }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ backgroundColor: DOT_COLORS[variant] }}
    />
  )
}
