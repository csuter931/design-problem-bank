/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./dashboard/index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // Dawson School brand palette — Brand Manual Quick Reference 2023.
      // Primary: blue, carolina, royal, charcoal, silver. Secondary: seagreen,
      // alabaster, purple, orange. navy-* are shades of Royal Blue used as the
      // app's dark surfaces (900 page, 800 modals, 700 gallery section).
      fontFamily: {
        sans: ['Nunito', 'Avenir', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Crimson Pro"', '"Minion Pro"', 'Georgia', 'serif'],
      },
      colors: {
        dawson: {
          blue: '#0033A0',
          carolina: '#7BB0D4',
          royal: '#00205B',
          charcoal: '#413C38',
          silver: '#BFBFBF',
          seagreen: '#22ACA3',
          alabaster: '#EDEAE0',
          purple: '#4D1551',
          orange: '#FF9966',
          navy: { 900: '#001238', 800: '#001845', 700: '#00205B' },
        },
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
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
