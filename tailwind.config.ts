import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // shadcn/base-ui HSL tokens (kept for existing components)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Covenant CRM design system tokens
        "brand-navy":           "#0f172a",
        "brand-gold":           "#b8893d",
        "brand-gold-soft":      "#d4a574",
        "brand-gold-tint":      "rgba(212, 165, 116, 0.14)",
        "brand-gold-tint-light":"rgba(212, 165, 116, 0.08)",
        "brand-gold-border":    "rgba(212, 165, 116, 0.35)",
        "ink-900":  "#0f172a",
        "ink-700":  "#334155",
        "ink-500":  "#64748b",
        "ink-400":  "#94a3b8",
        "ink-300":  "#cbd5e1",
        "ink-200":  "#e2e8f0",
        "ink-100":  "#f1f5f9",
        "ink-50":   "#f8fafc",
        "success":      "#1D9E75",
        "success-bg":   "#E1F5EE",
        "warning":      "#BA7517",
        "warning-bg":   "#FAEEDA",
        "danger":       "#E24B4A",
        "danger-bg":    "#FCEBEB",
        "info":         "#378ADD",
        "info-bg":      "#E6F1FB",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "card":    "12px",
        "card-sm": "10px",
        "btn":     "6px",
        "btn-lg":  "8px",
        "pill":    "9999px",
      },
    },
  },
  plugins: [],
};

export default config;
